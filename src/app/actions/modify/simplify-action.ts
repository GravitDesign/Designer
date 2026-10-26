// Old: designer.browser.dev.js module 1318 (GSimplifyAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { PathUtil } from "../../../engine/geometry/path-util.ts";
import { VertexSimplifier } from "../../../engine/geometry/vertex-simplifier.ts";
import type { VertexContainer } from "../../../engine/geometry/vertex-container.ts";
import { VertexSource, type VertexReader } from "../../../engine/geometry/vertex-source.ts";
import { GMath } from "../../../engine/math/math.ts";
import { Element } from "../../../engine/scene/element.ts";
import { Image } from "../../../engine/scene/image.ts";
import type { Node } from "../../../engine/scene/node.ts";
import type { ContainerNode } from "../../../engine/scene/node-container.ts";
import type { Scene } from "../../../engine/scene/scene.ts";
import { InputSlider } from "../../color/opacity-slider.ts";
import { blockChanges, releaseChanges } from "../../util/designer-util.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { alertDialog } from "../deps.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner } from "../host.ts";
import { promptDialog, type PromptCallback } from "./modify-deps.ts";

type Updatable = { beginUpdate(): void; endUpdate(): void };

/** The prompt's content: a tolerance slider (0-100, 10) and a text field next to it. */
interface ToleranceContent {
  element: HTMLElement;
  /** The slider's value, which is what OK uses. */
  getTolerance(): string;
}

/**
 * The slider (gInputSlider, 0-100 in steps of 1, starting at 10) and the
 * text field. Moving the slider writes its value, through the scene's
 * unit conversion and rounded, into the field, and a changed field writes
 * its value the same way into the slider, which is what OK reads. The old
 * field handler looked for the slider inside the field's own span and
 * never found it, so typed values were lost (BUG-134).
 */
function createToleranceContent(scene: Scene | null): ToleranceContent {
  const root = document.createElement("div");
  const element = document.createElement("div");
  const slider = new InputSlider(element, { min: 0, max: 100, step: 1 });
  element.setAttribute("name", "tolerance");
  element.style.width = "50%";
  slider.value(10);
  const span = document.createElement("span");
  span.style.width = "50%";
  const input = document.createElement("input");
  element.addEventListener("change", () => {
    if (scene)
      input.value = String(
        Number((scene.stringToPoint(String(slider.value())) as number).toFixed(0)),
      );
  });
  input.setAttribute("type", "text");
  input.style.width = "3em";
  input.value = "10";
  input.addEventListener("change", () => {
    // Text that isn't a length leaves the slider as it is (the old
    // handler would have thrown on it).
    const points = scene ? scene.stringToPoint(input.value) : null;
    if (points !== null) slider.value(Number(points.toFixed(0)));
  });
  const label = document.createElement("label");
  // Old: $("<label>").html(...) with the string table text.
  label.innerHTML = Locale.get(new LocaleKey("GSimplifyAction", "text.tolerance")) as string;
  span.append(input, label);
  root.append(element, span);
  return { element: root, getTolerance: () => String(slider.value()) };
}

/**
 * Modify > Path > Simplify Path (Cmd+Alt+S): asks for a tolerance and
 * replaces each vertex source by a simplified path.
 */
export class SimplifyAction extends ElementAction {
  static ID = "modify.simplify";
  static TITLE = new LocaleKey("GSimplifyAction", "title");

  override getId(): string {
    return SimplifyAction.ID;
  }

  override getTitle(): LocaleKey {
    return SimplifyAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_PATH;
  }

  override getGroup(): string {
    return "structure/modify";
  }

  // "simplity" is the old icon name.
  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-simplity" : null;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, Key.Constant.OPTION, "S"];
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    const selection = designerDocument
      ? (designerDocument.getEditor().getIndividualSelection() as unknown as Node[] | null)
      : null;
    let enabled = false;
    if (selection) {
      for (let i = 0; !enabled && i < selection.length; ++i) {
        const node = selection[i] as Node;
        if (!(node instanceof Image) && node.hasMixin(VertexSource)) enabled = true;
      }
    }
    return enabled;
  }

  override execute(): void {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument ? designerDocument.getEditor() : null;
    const selection = editor ? (editor.getIndividualSelection() as unknown as Node[] | null) : null;
    const sources: Node[] = [];
    if (selection) {
      for (let i = 0; i < selection.length; ++i) {
        const node = selection[i] as Node;
        if (node.hasMixin(VertexSource)) sources.push(node);
      }
    }
    if (!sources.length) return;
    const content = createToleranceContent(designerDocument ? designerDocument.getScene() : null);
    // The prompt takes an element instead of a default text; OK then calls
    // back with true instead of the field's value.
    const done: PromptCallback = (confirmed) => {
      if (!confirmed) return;
      const tolerance = parseFloat(content.getTolerance());
      if (isNaN(tolerance) || !isFinite(tolerance) || GMath.isEqualEps(tolerance, 0)) {
        alertDialog(Locale.get(new LocaleKey("GSimplifyAction", "text.invalid-value")) as string);
        return;
      }
      const ed = editor as NonNullable<typeof editor>;
      ed.beginTransaction();
      try {
        const created: Node[] = [];
        const parents = new Set<ContainerNode>();
        for (let i = 0; i < sources.length; ++i) {
          const parent = (sources[i] as Node).getParent();
          if (parent) parents.add(parent);
        }
        const blocked = [...parents] as unknown as Updatable[];
        try {
          blockChanges(ed, blocked, null, null);
          for (let i = 0; i < sources.length; ++i) {
            const source = sources[i] as Node;
            const parent = source.getParent() as ContainerNode;
            const next = source.getNext();
            const simplified = this._makeSimplified(tolerance, source);
            const path = PathUtil.createPathFromVertexSource(
              simplified as unknown as VertexReader,
            ) as Node | null;
            if (path) {
              Element.prototype.assignFrom.call(path, source);
              parent.insertChild(path, next);
              created.push(path);
            }
            parent.removeChild(source);
          }
        } finally {
          releaseChanges(ed, blocked, null);
          if (created.length) ed.updateSelection(false, created);
        }
      } finally {
        ed.commitTransaction(Locale.get(this.getTitle()) as string);
      }
    };
    promptDialog(
      Locale.get(new LocaleKey("GSimplifyAction", "text.simplification")) as string,
      done,
      content.element as unknown as string,
    );
  }

  _makeSimplified(tolerance: number, source: Node): VertexContainer {
    const value = tolerance > 0 ? tolerance : -tolerance;
    return new VertexSimplifier(source as unknown as VertexReader).simplify(value / 2, false, true);
  }

  override toString(): string {
    return "[Object GSimplifyAction]";
  }
}
