// Old: designer.browser.dev.js module 1320 (GConvertToRawPathAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { PathUtil } from "../../../engine/geometry/path-util.ts";
import type { VertexReader } from "../../../engine/geometry/vertex-source.ts";
import { VertexSource } from "../../../engine/geometry/vertex-source.ts";
import { CompoundPath } from "../../../engine/scene/compound-path.ts";
import { Element } from "../../../engine/scene/element.ts";
import { Image } from "../../../engine/scene/image.ts";
import type { Node } from "../../../engine/scene/node.ts";
import type { ContainerNode } from "../../../engine/scene/node-container.ts";
import { Path } from "../../../engine/scene/path.ts";
import { PathBase } from "../../../engine/scene/path-base.ts";
import { PathsGraph } from "../../../engine/scene/paths-graph/paths-graph.ts";
import { blockChanges, releaseChanges } from "../../util/designer-util.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner } from "../host.ts";

type Updatable = { beginUpdate(): void; endUpdate(): void };

/**
 * Modify > Path > Convert to Raw Path (Cmd+Shift+R): replaces each shape,
 * and each path with corner types (rounded, inset, ... corners), by a plain
 * path of its outline.
 */
export class ConvertToRawPathAction extends ElementAction {
  static ID = "modify.converttorawpath";
  static TITLE = new LocaleKey("GConvertToRawPathAction", "title");

  override getId(): string {
    return ConvertToRawPathAction.ID;
  }

  override getTitle(): LocaleKey {
    return ConvertToRawPathAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_PATH;
  }

  override getGroup(): string {
    return "structure/modify";
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-convert-to-raw-path" : null;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, Key.Constant.SHIFT, "R"];
  }

  /** A path only counts when one of its anchor points has a corner type. */
  _isValidElement(node: Node): boolean {
    if (node instanceof Path || node instanceof CompoundPath) {
      let paths: Path[] = [];
      if (node instanceof CompoundPath) {
        for (
          let path = node.getPaths().getFirstChild() as Path | null;
          null !== path;
          path = path.getNext() as Path | null
        ) {
          paths.push(path);
        }
      } else paths = [node];
      for (let i = 0; i < paths.length; i++) {
        for (let point = (paths[i] as Path).getAnchorPoints().getFirstChild(); point;) {
          if (PathBase.isCornerType(point.getProperty("tp"))) return true;
          point = point.getNext() as typeof point;
        }
      }
      return false;
    }
    return !(!node.hasMixin(VertexSource) || node instanceof Image || node instanceof PathsGraph);
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    if (designerDocument) {
      const selection = designerDocument.getEditor().getSelection();
      if (selection) {
        for (let i = 0; i < selection.length; ++i) {
          if (this._isValidElement(selection[i] as Node)) return true;
        }
      }
    }
    return false;
  }

  override execute(): void {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument ? designerDocument.getEditor() : null;
    const selection = editor ? (editor.getIndividualSelection() as unknown as Node[] | null) : null;
    const elements: Node[] = [];
    const parents = new Set<ContainerNode>();
    if (selection) {
      for (let i = 0; i < selection.length; ++i) {
        const node = selection[i] as Node;
        if (this._isValidElement(node)) {
          elements.push(node);
          parents.add(node.getParent() as ContainerNode);
        }
      }
    }
    // As in the old code, a missing document throws here.
    const ed = editor as NonNullable<typeof editor>;
    ed.beginTransaction();
    try {
      let created: Node[] | undefined;
      const blocked = [...parents] as unknown as Updatable[];
      try {
        blockChanges(ed, blocked, null, null);
        created = [];
        for (let i = 0; i < elements.length; ++i) {
          const element = elements[i] as Node;
          const parent = element.getParent() as ContainerNode;
          const next = element.getNext();
          const path = PathUtil.createPathFromVertexSource(
            element as unknown as VertexReader,
          ) as Node | null;
          if (path) {
            Element.prototype.assignFrom.call(path, element);
            parent.insertChild(path, next);
            created.push(path);
          }
          parent.removeChild(element);
        }
      } finally {
        releaseChanges(ed, blocked, null);
        if (created && created.length) ed.updateSelection(false, created);
      }
    } finally {
      ed.commitTransaction(Locale.get(this.getTitle()) as string);
    }
  }

  override toString(): string {
    return "[Object GConvertToRawPathAction]";
  }
}
