// Old: designer.browser.dev.js module 609 (GSelectByAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { equals } from "../../../engine/core/util.ts";
import { AnnotationMixin } from "../../../engine/scene/annotations/annotation.ts";
import { Element } from "../../../engine/scene/element.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Editor } from "../../../editor/editor.ts";
import type { ActionTitle } from "../action.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner } from "../host.ts";

/**
 * Edit > Select Same: selects every element whose value (fill, border
 * width, opacity, ...) equals the one value all selected elements share.
 * Subclasses read the value in _getValue.
 */
export class SelectByAction extends ElementAction {
  /** _getValue's answer for an element that has no such value. */
  static EmptyValue: unknown = {};
  /** _createPattern's answer when the selection shares no value. */
  static EmptyPattern: unknown = {};

  protected _id: string;
  protected _title: ActionTitle;

  constructor(id: string, title: ActionTitle) {
    super();
    this._id = id;
    this._title = title;
  }

  override getId(): string {
    return this._id;
  }

  override getTitle(): ActionTitle {
    return this._title;
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT_SELECT_SAME;
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument && designerDocument.getEditor();
    const selection = editor && editor.getSelection();
    if (!selection || !selection.length) return false;
    return this._createPattern(selection) !== SelectByAction.EmptyPattern;
  }

  /** The value every node shares, or EmptyPattern. */
  protected _createPattern(nodes: readonly Node[] | null): unknown {
    const count = nodes && nodes.length;
    if (!count) return SelectByAction.EmptyPattern;
    const first = this._getValue((nodes as readonly Node[])[0] as Node);
    if (first === SelectByAction.EmptyValue) return SelectByAction.EmptyPattern;
    for (let i = 1; i < count; i++) {
      const value = this._getValue((nodes as readonly Node[])[i] as Node);
      if (value === SelectByAction.EmptyValue) return SelectByAction.EmptyPattern;
      if (!this._matches(first, value)) return SelectByAction.EmptyPattern;
    }
    return first;
  }

  protected _matches(pattern: unknown, value: unknown): boolean {
    return (
      pattern !== SelectByAction.EmptyPattern &&
      value !== SelectByAction.EmptyPattern &&
      equals(pattern, value, true)
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the argument
  protected _getValue(_node: Node): unknown {
    throw "Not implemented";
  }

  override execute(): void {
    const designerDocument = gDesigner().getActiveDocument();
    const scene = designerDocument && designerDocument.getScene();
    const editor = designerDocument && designerDocument.getEditor();
    const selection = editor && editor.getSelection();
    if (!scene || !selection || !selection.length) return;
    const pattern = this._createPattern(selection);
    if (pattern === SelectByAction.EmptyPattern) return;
    const matching: Node[] = [];
    scene.accept((node: Node) => {
      if (node instanceof Element && !node.hasMixin(AnnotationMixin)) {
        const value = this._createPattern([node]);
        if (this._matches(pattern, value)) matching.push(node);
      }
    });
    if (matching.length > 0) {
      Editor.tryRunTransaction(
        scene,
        () => {
          (editor as Editor).updateSelection(false, matching);
        },
        Locale.get(this.getTitle()) as string,
      );
    }
  }

  override toString(): string {
    return "[Object GSelectByAction]";
  }
}
