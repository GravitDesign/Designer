// Old: chunk.vendor.js module 745 (GSelectionPositionEditor).
/**
 * The box editor of a multiple selection: one box around all selected
 * elements, with the resize and rotation handles. Its previews go to the
 * element editors of the selection (which outline themselves meanwhile)
 * and are applied through them. Text editors add their own boxes. In the
 * multi-page view the box paints at the active page's position.
 */
import { registerClass } from "../../engine/core/object.ts";
import { uniqueObj } from "../../engine/core/util.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Block } from "../../engine/scene/block.ts";
import { Element } from "../../engine/scene/element.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Text } from "../../engine/text/text.ts";
import type { Color } from "../../engine/color/color.ts";
import { Editor } from "../editor.ts";
import {
  BaseEditor,
  type PartInfo,
  type EditorHost,
  type EditorPaintContext,
} from "./base-editor.ts";
import { BoxEditor, type EdTransformOptions } from "./box-editor.ts";
import { ElementEditor, type EditedElement } from "./element-editor.ts";

/** What the selection position editor calls on GEditor. */
export interface SelectionHost extends EditorHost {
  getIndividualSelection(): Node[] | null;
}

interface PageLike {
  getPosition(multiPage?: unknown): Point;
}

interface SceneLike {
  getActivePage(): PageLike | null;
  addEventListener(
    type: unknown,
    listener: (...args: never[]) => void,
    target: unknown,
    args: unknown,
  ): void;
  removeEventListener(type: unknown, listener: unknown, target?: object | null): void;
}

/** GEditor statics the editor uses. */
const EditorStatics = Editor as unknown as {
  getGroupGeometryBBox(nodes: readonly Node[], preview?: unknown, arg?: unknown): Rect | null;
  getElementPage(node: Node): PageLike | null;
};

export class SelectionPositionEditor extends BoxEditor {
  static {
    registerClass(this, "GSelectionPositionEditor");
  }

  declare _selection: EditedElement[] | null;
  declare _scene: SceneLike | null;
  declare _graphicEditor: SelectionHost | null;
  declare _activated: boolean;

  /** Starts editing the selection of `editor` in `scene`. */
  activate(scene: unknown, editor: SelectionHost): void {
    if (this._activated) this.deactivate();
    this._scene = scene as SceneLike;
    this._scene.addEventListener(Element.GeometryChangeEvent, this._geometryChange, this, null);
    this._graphicEditor = editor;
    this.updateFromSelection();
    this._activated = true;
  }

  deactivate(): void {
    this._graphicEditor = null;
    (this._scene as SceneLike).removeEventListener(
      Element.GeometryChangeEvent,
      this._geometryChange,
      this,
    );
    this._scene = null;
    this._selection = null;
    this._activated = false;
  }

  /** The geometry box of the selection, relative to the active page. */
  override getBox(arg?: unknown): Rect | null {
    if (this._selection) {
      let box = EditorStatics.getGroupGeometryBBox(this._selection, true, arg);
      if (box) {
        const page = (this._scene as SceneLike).getActivePage();
        const position = page ? page.getPosition(true) : null;
        if (position) box = box.translated(-position.getX(), -position.getY());
      }
      return box;
    }
    return null;
  }

  _getSelectionPages(): PageLike[] | null {
    let pages: PageLike[] | null = null;
    if (this._selection) {
      const selection = this._selection;
      for (let i = 0; i < selection.length; i++) {
        pages = (pages || ([] as PageLike[])).concat([
          EditorStatics.getElementPage(selection[i] as Node) as PageLike,
        ]);
      }
      pages = uniqueObj(pages as PageLike[]);
    }
    return pages;
  }

  /** The outline colour under the top-left-most selected element. */
  override _computeOutlineColor(
    context: EditorPaintContext,
    transform?: Transform | null,
  ): unknown {
    if (this._selection && this._selection.length) {
      let matrix = new Transform();
      let left = Number.POSITIVE_INFINITY;
      let top = Number.POSITIVE_INFINITY;
      let index = 0;
      for (let i = 0; i < this._selection.length; i++) {
        const box = (this._selection[i] as EditedElement).getPaintBBox();
        if (box) {
          const corner = box.getSide(Rect.Side.TOP_LEFT);
          if (corner.getX() <= left && corner.getY() < top) {
            left = corner.getX();
            top = corner.getY();
            index = i;
          }
        }
      }
      const element = this._selection[index] as EditedElement;
      const paintBox = element.getPaintBBox() || new Rect();
      const point = new Point(paintBox.getX() - 1, paintBox.getY() - 1);
      if (transform) matrix = matrix.multiplied(transform);
      const mapped = matrix.mapPoint(point);
      this._computedOutlineColor = BaseEditor.getOutlineColor(
        context,
        mapped.getX(),
        mapped.getY(),
        context.selectionShapeOutlineColor,
        element,
      );
    } else super._computeOutlineColor(context, transform);
    return undefined;
  }

  override getObjectNameModified(): string {
    return "Selection";
  }

  override paint(transform: Transform, context: EditorPaintContext): void {
    let paged: Transform | undefined;
    const selection = this._selection;
    if (
      (context.configuration as unknown as { multiPageView: unknown }).multiPageView &&
      selection
    ) {
      const page = (this._scene as SceneLike).getActivePage();
      const position = page ? page.getPosition(true) : null;
      if (position)
        paged = transform.preMultiplied(
          new Transform(1, 0, 0, 1, position.getX(), position.getY()),
        );
    }
    super.paint(paged || transform, context);
  }

  /**
   * Takes the editor's selection: the handles go away when any element
   * has NoSizeChanges, and every element's editor opens with an outline.
   */
  updateFromSelection(): void {
    this.setFlag(BoxEditor.Flag.ResizeAll, true);
    this.setFlag(BoxEditor.Flag.RotateCorners, true);
    this.setFlag(BoxEditor.Flag.RotateHandle, true);
    this.requestInvalidation();
    this._selection = (this._graphicEditor as SelectionHost).getIndividualSelection() as
      EditedElement[] | null;
    if (this._selection) {
      for (let i = 0; i < this._selection.length; ++i) {
        const element = this._selection[i] as EditedElement;
        if ((element.getProperty("plkt") as number) & Block.ProgramLck.NoSizeChanges) {
          this.removeFlag(BoxEditor.Flag.ResizeAll, true);
          this.removeFlag(BoxEditor.Flag.RotateCorners, true);
          this.removeFlag(BoxEditor.Flag.RotateHandle, true);
        }
        const editor = ElementEditor.openEditor(element) as ElementEditor;
        if (!editor.hasFlag(BaseEditor.Flag.Outline)) editor.setFlag(BaseEditor.Flag.Outline);
      }
      this.requestInvalidation();
    }
  }

  /**
   * Hands the preview to each element's editor; in a multi-page transform
   * mapped into the element's page.
   */
  override edTransform(
    transform: Transform,
    partId?: unknown,
    partData?: unknown,
    options?: unknown,
  ): void {
    const opts = options as EdTransformOptions | null | undefined;
    if (this._selection) {
      const active = (this._scene as SceneLike).getActivePage();
      const activePosition = active ? active.getPosition(true) : null;
      for (let i = 0; i < this._selection.length; ++i) {
        const element = this._selection[i] as EditedElement;
        const editor = ElementEditor.openEditor(element) as ElementEditor;
        let page: PageLike | null;
        if (opts && opts.isMultiPage && (page = EditorStatics.getElementPage(element))) {
          let position = page.getPosition(true);
          if (activePosition) position = position.subtract(activePosition);
          const toPage = new Transform(1, 0, 0, 1, position.getX(), position.getY());
          editor.edTransform(
            toPage.multiplied(transform).multiplied(toPage.inverted() as Transform),
            null,
            null,
            opts,
          );
        } else editor.edTransform(transform, null, null, opts);
      }
    }
    super.edTransform(transform, partId, partData, options);
  }

  override _getBBox(transform: Transform, includeTransform?: unknown): Rect | null {
    let box = super._getBBox(transform, includeTransform);
    if (this._selection) {
      for (let i = 0; i < this._selection.length; ++i) {
        const element = this._selection[i];
        if (element instanceof Text) {
          const editor = ElementEditor.getEditor(element);
          if (editor) {
            const textBox = editor._getBBox(transform, includeTransform);
            if (textBox) box = box ? box.united(textBox) : textBox;
          }
        }
      }
    }
    return box;
  }

  /** The box outline, grown by the text editors' boxes (then drawn untransformed). */
  override _paintResizeBoxOutline(
    transform: Transform,
    context: EditorPaintContext,
    noVertices: unknown,
    color: Color | null,
  ): void {
    let textBoxes: Rect | null = null;
    if (this._selection) {
      for (let i = 0; i < this._selection.length; ++i) {
        const element = this._selection[i];
        if (element instanceof Text) {
          const editor = ElementEditor.getEditor(element);
          if (editor) {
            const textBox = editor._getBBox(transform, false);
            if (textBox) textBoxes = textBoxes ? textBoxes.united(textBox) : textBox;
          }
        }
      }
    }
    let box = this.getBox();
    if (box) {
      let boxTransform = transform;
      const own = this.getBoxTransform();
      boxTransform = own ? own.multiplied(boxTransform) : boxTransform;
      if (textBoxes) {
        box = boxTransform.mapRect(box).united(textBoxes);
        this._paintTransformedQuadrilateral(new Transform(), box, context, color);
      } else this._paintTransformedQuadrilateral(boxTransform, box, context, color);
    }
  }

  /** Applies a resize or rotation through each element's editor (except `exceptions`). */
  override _applyPartMove(
    partId: unknown,
    partData: unknown,
    option?: unknown,
    extra?: unknown,
  ): void {
    const exceptions = extra as Node[] | null | undefined;
    if (
      (partId === BoxEditor.RESIZE_HANDLE_PART_ID ||
        partId === BoxEditor.ROTATION_HANDLE_PART_ID) &&
      BaseEditor.prototype.canApplyTransform.call(this) &&
      this._selection
    ) {
      for (let i = 0; i < this._selection.length; ++i) {
        const element = this._selection[i] as EditedElement;
        if (!exceptions || exceptions.indexOf(element) < 0) {
          (ElementEditor.getEditor(element) as ElementEditor).applyTransform(
            element,
            partId === BoxEditor.ROTATION_HANDLE_PART_ID,
            exceptions,
            option,
          );
        }
      }
    }
    this.resetTransform();
    super._applyPartMove(partId, partData, option, extra);
  }

  /** Repaints with the active page's offset in the multi-page view. */
  override requestInvalidation(args?: unknown): void {
    let pageTransform: Transform | null = null;
    const selection = this._selection;
    if (selection && selection.length) {
      const page = (this._scene as SceneLike).getActivePage();
      const position = page ? page.getPosition(true) : null;
      if (position) pageTransform = new Transform(1, 0, 0, 1, position.getX(), position.getY());
    }
    if (pageTransform) {
      if (args) (args as { pageTransform?: Transform }).pageTransform = pageTransform;
      else args = { pageTransform: pageTransform };
    }
    (BaseEditor.getEditor<EditorHost>(this._scene) as EditorHost).requestInvalidation(this, args);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old code dropped the flag
  override invalidate(transform: Transform, skip?: unknown): Rect | null {
    return super.invalidate(transform, null);
  }

  /** Hit tests only this editor (no children), from the box. */
  override getPartInfoAt(
    location: Point,
    transform: Transform,
    filter?: ((editor: BaseEditor) => unknown) | null,
    tolerance?: number | null,
    // Passed on to getBBox, which takes one argument.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
    extra?: unknown,
  ): PartInfo | null {
    tolerance = tolerance || 0;
    if (filter && true !== filter.call(null, this)) return null;
    const matrix = transform || new Transform();
    const box = this.getBBox(matrix);
    if (box && box.expanded(tolerance, tolerance, tolerance, tolerance).containsPoint(location)) {
      const hit = this._getPartInfoAt(location, matrix, tolerance);
      if (hit) return hit;
    }
    return null;
  }

  override isRelativeToPage(): boolean {
    return false;
  }

  override _showOutline(): boolean {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the event isn't read
  _geometryChange(event?: unknown): void {
    this.requestInvalidation();
  }

  override toString(): string {
    return "[Object GSelectionPositionEditor]";
  }
}

Object.assign(SelectionPositionEditor.prototype, {
  _selection: null,
  _scene: null,
  _graphicEditor: null,
  _activated: false,
});
