// Old: chunk.vendor.js module 751 (GGroupEditor).
/**
 * The editor of a group. A group without a frame (`frm`) has no geometry
 * of its own: a previewed transform goes to the children's editors, the
 * outline is theirs, and applying it transforms every child through its
 * own editor. With a frame the group behaves like a block, and with
 * `force` (rotation) or for children without anchoring constraints the
 * children still follow.
 */
import { registerClass } from "../../engine/core/object.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Element } from "../../engine/scene/element.ts";
import { Group } from "../../engine/scene/group.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Text } from "../../engine/text/text.ts";
import { EditorOptions } from "../editor-options.ts";
import { BaseEditor, type EditorPaintContext } from "./base-editor.ts";
import {
  BoxEditor,
  EdTransformOptions,
  type PointMapper,
  type ResizePartData,
} from "./box-editor.ts";
import { ElementEditor, type EditedElement } from "./element-editor.ts";
import { ItemEditor, type EditedItem } from "./item-editor.ts";

/** A child editor as the group drives it (any element editor; `_scaleBorder` only on groups). */
type ChildEditor = ElementEditor & {
  _scaleBorder?(element: Node, scale: unknown): void;
};

export class GroupEditor<E extends EditedItem = EditedItem> extends ItemEditor<E> {
  static {
    registerClass(this, "GGroupEditor");
    ElementEditor.exports(this, Group);
  }

  /** Without a frame and with a previewed transform the children outline themselves. */
  override _paintOutline(
    transform: Transform,
    context: EditorPaintContext,
    noVertices: unknown,
    color: Parameters<ItemEditor["_paintOutline"]>[3],
    baseTransform?: Transform | null,
  ): void {
    if (this._transform && this._editors && !this._element.getProperty("frm")) {
      for (let i = 0; i < this._editors.length; ++i) {
        (this._editors[i] as ElementEditor)._paintOutline(
          transform,
          context,
          noVertices,
          color,
          baseTransform,
        );
      }
    } else super._paintOutline(transform, context, noVertices, color);
  }

  /**
   * Applies the previewed transform to the group's transform and through
   * each child's editor to the children (not those in `exceptions`; with
   * a frame only unconstrained children, unless `force`).
   */
  override _applyTransform(target: unknown, ...rest: unknown[]): void {
    const group = target as EditedElement;
    const force = rest[0];
    const exceptions = rest[1] as readonly Node[] | false | null | undefined;
    const option = rest[2];
    if (!(this._transform as Transform).isIdentity()) {
      group.beginUpdate();
      group.assignTransformFrom(this._transform as Transform, this._element);
      const frame = group.getProperty("frm");
      for (
        let child = group.getFirstChild() as EditedElement | null;
        null != child;
        child = child.getNext() as EditedElement | null
      ) {
        if (
          child instanceof Element &&
          (!exceptions || exceptions.indexOf(child) < 0) &&
          (!frame ||
            force ||
            (child.hasMixin(Element.Transform) &&
              !child.getProperty("hacr") &&
              !child.getProperty("vacr")))
        ) {
          const editor = ElementEditor.openEditor(child) as ElementEditor;
          const options = new EdTransformOptions();
          options.fullContentsTransform = !!force;
          child.dependentUpdate = true;
          editor.edTransform(this._transform as Transform, null, null, options);
          editor.applyTransform(child, force, exceptions, option);
          child.dependentUpdate = false;
        }
      }
      group.endUpdate();
    }
    BoxEditor.prototype._applyTransform.call(this, group);
  }

  /** Without a frame the children's editors preview the transform too. */
  override edTransform(
    transform: Transform,
    partId?: unknown,
    partData?: unknown,
    options?: unknown,
  ): void {
    const element = this.getElement();
    if (!element.getProperty("frm")) {
      for (let child = element.getFirstChild(); null != child; child = child.getNext()) {
        if (child instanceof Element) {
          child.dependentUpdate = true;
          (ElementEditor.openEditor(child) as ElementEditor).edTransform(
            transform,
            null,
            null,
            options,
          );
          child.dependentUpdate = false;
        }
      }
    }
    super.edTransform(transform, partId, partData, options);
  }

  override getBBox(transform: Transform): Rect | null {
    return this.hasFlag(BaseEditor.Flag.Selected) || this.hasFlag(BaseEditor.Flag.Highlighted)
      ? BoxEditor.prototype.getBBox.call(this, transform)
      : null;
  }

  /** The box editor's box, united with the boxes of the text children's editors. */
  override _getBBox(transform: Transform, includeTransform?: unknown): Rect | null {
    let box = BoxEditor.prototype._getBBox.call(this, transform, includeTransform);
    for (let child = this.getElement().getFirstChild(); null != child; child = child.getNext()) {
      if (child instanceof Text) {
        const editor = ElementEditor.getEditor(child);
        if (editor) {
          const childBox = editor._getBBox(transform, includeTransform);
          if (childBox) box = box ? box.united(childBox) : childBox;
        }
      }
    }
    return box;
  }

  override getPEGeometryBBox(): Rect | null {
    let box: Rect | null = null;
    if (
      this._transform &&
      !this._element.getProperty("frm") &&
      this._editors &&
      0 != this._editors.length
    ) {
      for (let i = 0; i < this._editors.length; ++i) {
        const editor = this._editors[i];
        if (editor instanceof ElementEditor) {
          const childBox = editor.getPEGeometryBBox();
          if (childBox) box = box ? box.united(childBox) : childBox;
        }
      }
    } else box = super.getPEGeometryBBox();
    return box;
  }

  override resetTransform(): void {
    for (let i = this._editors ? this._editors.length : 0; i > 0; --i) {
      ((this._editors as BaseEditor[])[i - 1] as BaseEditor).resetTransform();
    }
    super.resetTransform();
  }

  /**
   * A resize handle drag previews the resize of the group's source box
   * through edTransform (so the children follow) instead of transformBox.
   */
  override movePart(
    partId: unknown,
    partData: unknown,
    position: Point,
    viewToWorld: Transform,
    guides: unknown,
    shift?: unknown,
    option?: unknown,
    multiPage?: unknown,
  ): unknown {
    if (partId !== BoxEditor.RESIZE_HANDLE_PART_ID) {
      return super.movePart(partId, partData, position, viewToWorld, guides, shift, option);
    }
    BaseEditor.prototype.movePart.call(
      this,
      partId,
      partData,
      position,
      viewToWorld,
      guides,
      shift,
      option,
    );
    const data = partData as ResizePartData;
    let options: EdTransformOptions | null = null;
    if (multiPage) {
      options = new EdTransformOptions();
      options.isMultiPage = true;
    }
    let point = viewToWorld.mapPoint(position);
    point = (guides as PointMapper).mapPoint(point);
    const box = this._element.getSourceBBox();
    if (box) {
      const boxTransform = this.getBoxTransform();
      // Only set when the box transform is a real, invertible one (the old
      // `var` was read outside the block that assigned it).
      let inverse: Transform | null | undefined;
      if (boxTransform && !boxTransform.isIdentity() && boxTransform.invertible()) {
        inverse = boxTransform.inverted();
        if (inverse) point = inverse.mapPoint(point);
      }
      const side = box.getSide(data.side);
      const dx = point.getX() - side.getX();
      const dy = point.getY() - side.getY();
      let keepRatio = shift;
      if (EditorOptions.isPreserveAspectRatioEnabledForSide(data.side)) keepRatio = true;
      let resize = Transform.getResizeTransform(
        box,
        data.side,
        dx,
        dy,
        keepRatio as boolean,
        option as boolean,
      );
      if (inverse) resize = inverse.multiplied(resize).multiplied(boxTransform as Transform);
      this.edTransform(resize, null, null, options);
      return resize;
    }
    return null;
  }

  /**
   * Passes a border scale on to the child editors. Nothing calls it, and
   * only group editors have it, so a group with a non-group child would
   * throw here.
   */
  _scaleBorder(element: Node, scale: unknown): void {
    if (element instanceof Group) {
      for (let i = this._editors ? this._editors.length : 0; i > 0; --i) {
        const editor = (this._editors as BaseEditor[])[i - 1] as ChildEditor;
        (editor._scaleBorder as (element: Node, scale: unknown) => void).call(
          editor,
          editor.getElement(),
          scale,
        );
      }
    }
  }

  override toString(): string {
    return "[Object GGroupEditor]";
  }
}
