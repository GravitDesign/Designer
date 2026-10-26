// Old: designer.browser.dev.js module 1185 (GOutlineAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { PathUtil } from "../../../engine/geometry/path-util.ts";
import { VertexOffsetter } from "../../../engine/geometry/vertex-offsetter.ts";
import { VertexSource, type VertexReader } from "../../../engine/geometry/vertex-source.ts";
import { GMath } from "../../../engine/math/math.ts";
import { Element } from "../../../engine/scene/element.ts";
import { Image } from "../../../engine/scene/image.ts";
import type { Node } from "../../../engine/scene/node.ts";
import type { ContainerNode } from "../../../engine/scene/node-container.ts";
import { PathBase } from "../../../engine/scene/path-base.ts";
import type { PaintLayers } from "../../../engine/style/paint-layers.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { blockChanges, releaseChanges } from "../../util/designer-util.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { alertDialog } from "../deps.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner } from "../host.ts";
import { promptDialog } from "./modify-deps.ts";

type Updatable = { beginUpdate(): void; endUpdate(): void };

/** The line cap of the topmost border, which the offsetter uses for open ends. */
export function topBorderCap(node: Node): string | undefined {
  let cap: string | undefined;
  if (node.hasMixin(Stylable)) {
    const layers = (node as Node & { getPaintLayers(): PaintLayers | null }).getPaintLayers();
    if (layers) {
      const border = layers.getBorderLayers(true).pop();
      if (border) cap = border.getProperty("_blc") as string | undefined;
    }
  }
  return cap;
}

/**
 * Modify > Path > Convert to Outline (F5): asks for a width and replaces
 * each vertex source by its outline: the shape offset by that distance to
 * both sides. Expand/Shrink (offset-action.ts) reuses it with one side.
 */
export class OutlineAction extends ElementAction {
  static ID = "modify.ouline";
  static TITLE = new LocaleKey("GOutlineAction", "title");

  override getId(): string {
    return OutlineAction.ID;
  }

  override getTitle(): LocaleKey {
    return OutlineAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_PATH;
  }

  override getGroup(): string {
    return "structure/modify";
  }

  override getShortcut(): Shortcut | null {
    return [Key.Constant.F5];
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    const selection = designerDocument
      ? (designerDocument.getEditor().getSelection() as Node[] | null)
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

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-convert-to-outline" : null;
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
    promptDialog(
      this._dialogPromptMessage(),
      (value) => {
        if (!value) return;
        const ed = editor as NonNullable<typeof editor>;
        const offset = parseFloat(value);
        // Old: always Convert to Outline's text, also for Expand/Shrink
        // (BUG-135).
        if (isNaN(offset) || !isFinite(offset) || GMath.isEqualEps(offset, 0)) {
          alertDialog(this._dialogAlertMessage());
          return;
        }
        ed.beginTransaction();
        try {
          let created: Node[] | undefined;
          let parents: Set<ContainerNode> | undefined;
          try {
            parents = new Set();
            for (let i = 0; i < sources.length; ++i) {
              const parent = (sources[i] as Node).getParent();
              if (parent) parents.add(parent);
            }
            blockChanges(ed, [...parents] as unknown as Updatable[], null, null);
            created = [];
            for (let i = 0; i < sources.length; ++i) {
              const source = sources[i] as Node;
              const parent = source.getParent();
              if (parent) {
                const next = source.getNext();
                const offsetter = this._makeOffsetter(offset, source);
                const path = PathUtil.createPathFromVertexSource(offsetter) as Node | null;
                if (path) {
                  Element.prototype.assignFrom.call(path, source);
                  parent.insertChild(path, next);
                  created.push(path);
                }
                parent.removeChild(source);
              }
            }
          } finally {
            releaseChanges(ed, parents ? ([...parents] as unknown as Updatable[]) : parents, null);
            if (created && created.length) ed.updateSelection(false, created);
          }
        } finally {
          ed.commitTransaction(Locale.get(this.getTitle()) as string);
        }
      },
      "1",
    );
  }

  protected _dialogPromptMessage(): string {
    return Locale.get(new LocaleKey("GOutlineAction", "text.dialog-prompt-message")) as string;
  }

  protected _dialogAlertMessage(): string {
    return Locale.get(new LocaleKey("GOutlineAction", "text.invalid-value")) as string;
  }

  /** Both sides of the source at |offset|; a counter-clockwise path is reversed in place first. */
  protected _makeOffsetter(offset: number, source: Node): VertexOffsetter {
    const cap = topBorderCap(source);
    const distance = offset > 0 ? offset : -offset;
    if (source instanceof PathBase && !source.isClockWise()) source.reverseOrder();
    return new VertexOffsetter(source as unknown as VertexReader, distance, true, true, 0, cap);
  }

  override toString(): string {
    return "[Object GOutlineAction]";
  }
}
