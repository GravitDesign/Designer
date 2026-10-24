// Old: chunk.vendor.js module 760 (GLayerEditor).
/**
 * The editor of a layer. It paints in the layer's own colour (`cls`), and
 * like a group without a frame it previews and applies transforms through
 * its children's editors. A layer with a frame (`frm`) moves the frame
 * along and leaves the children alone unless `force`.
 */
import type { Color } from "../../engine/color/color.ts";
import { registerClass } from "../../engine/core/object.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Element } from "../../engine/scene/element.ts";
import { Layer } from "../../engine/scene/layer.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { EditorPaintContext } from "./base-editor.ts";
import { BlockEditor } from "./block-editor.ts";
import { BoxEditor, EdTransformOptions } from "./box-editor.ts";
import { ElementEditor, type EditedElement } from "./element-editor.ts";

export class LayerEditor<E extends EditedElement = EditedElement> extends BlockEditor<E> {
  static {
    registerClass(this, "GLayerEditor");
    ElementEditor.exports(this, Layer);
  }

  /** Paints with the layer colour as the selection outline colour (null when it has none). */
  override paint(transform: Transform, context: EditorPaintContext): void {
    const previous = context.selectionOutlineColor;
    const color = this._element.getProperty("cls") as Color;
    context.selectionOutlineColor = color;
    super.paint(transform, context);
    context.selectionOutlineColor = previous;
  }

  override _paintOutline(
    transform: Transform,
    context: EditorPaintContext,
    noVertices: unknown,
    color: Color | null,
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
   * Maps the frame by the transform (corrected for the frame, see
   * GTransform.correctForFrame); without a frame, or with `force`, the
   * children are transformed through their editors.
   */
  override _applyTransform(target: unknown, ...rest: unknown[]): void {
    const layer = target as EditedElement;
    const force = rest[0];
    const exceptions = rest[1] as readonly Node[] | false | null | undefined;
    const option = rest[2];
    const transform = this._transform as Transform;
    if (!transform.isIdentity()) {
      const frame = this._element.getProperty("frm") as Rect | null;
      if (frame) {
        const corrected = Transform.correctForFrame(transform, frame);
        if (corrected && !corrected.isIdentity())
          layer.setProperty("frm", corrected.mapRect(frame));
      }
      if (!layer.getProperty("frm") || force) {
        for (
          let child = layer.getFirstChild() as EditedElement | null;
          null != child;
          child = child.getNext() as EditedElement | null
        ) {
          if (child instanceof Element && (!exceptions || exceptions.indexOf(child) < 0)) {
            const editor = ElementEditor.openEditor(child) as ElementEditor;
            const options = new EdTransformOptions();
            options.fullContentsTransform = !!force;
            child.dependentUpdate = true;
            editor.edTransform(transform, null, null, options);
            editor.applyTransform(child, force, exceptions, option);
            child.dependentUpdate = false;
          }
        }
      }
    }
    BoxEditor.prototype._applyTransform.call(this, layer);
  }

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

  /** Resets and closes the children's editors (they were opened for the preview). */
  override resetTransform(): void {
    for (let i = this._editors ? this._editors.length : 0; i > 0; --i) {
      const editor = (this._editors as ElementEditor[])[i - 1] as ElementEditor;
      editor.resetTransform();
      ElementEditor.closeElementEditor(editor.getElement());
    }
    super.resetTransform();
  }

  override getPEGeometryBBox(): Rect | null {
    let box: Rect | null = null;
    if (this._transform && this._editors) {
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

  override toString(): string {
    return "[Object GLayerEditor]";
  }
}
