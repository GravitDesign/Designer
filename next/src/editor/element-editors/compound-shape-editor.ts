// Old: chunk.vendor.js module 1082 (GCompoundShapeEditor).
/**
 * The editor of a compound shape (a boolean combination of shapes). Its
 * box is the combined geometry box without a transform; previews go to
 * the children's editors, and the outline is the combined shape's own
 * vertices.
 */
import type { Color } from "../../engine/color/color.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { VertexPixelAligner } from "../../engine/geometry/vertex-pixel-aligner.ts";
import type { VertexReader } from "../../engine/geometry/vertex-source.ts";
import { VertexTransformer } from "../../engine/geometry/vertex-transformer.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { CompoundShape } from "../../engine/scene/compound-shape.ts";
import { Element } from "../../engine/scene/element.ts";
import { EditorOptions } from "../editor-options.ts";
import { BaseEditor, type EditorPaintContext } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { ShapeEditor, type EditedShape } from "./shape-editor.ts";

export class CompoundShapeEditor<E extends EditedShape = EditedShape> extends ShapeEditor<E> {
  static {
    registerClass(this, "GCompoundShapeEditor");
    ElementEditor.exports(this, CompoundShape);
  }

  /**
   * Sets the boolean operation (`bool`) of every child shape that has a
   * shape editor open, in one transaction. False without a GEditor or
   * without such a child. The transaction is named "Drop Pattern" (see
   * "Compound shape boolean op is named Drop Pattern" in QUESTIONS.md).
   */
  setBooleanOp(operation: unknown): boolean {
    const editor = BaseEditor.getEditor(this.getElement().getScene());
    if (!editor) return false;
    if (!this._editors || !this._editors.length) return false;
    let hasShape = false;
    for (let i = 0; i < this._editors.length; ++i) {
      if (this._editors[i] instanceof ShapeEditor) hasShape = true;
    }
    if (!hasShape) return false;
    editor.beginTransaction();
    try {
      for (let i = 0; i < this._editors.length; ++i) {
        const child = this._editors[i];
        if (child instanceof ShapeEditor) child.getElement().setProperty("bool", operation);
      }
    } finally {
      editor.commitTransaction(
        Locale.get(new LocaleKey("GCompoundShapeEditor", "action.drop-pattern")),
      );
    }
    return true;
  }

  override _paintOutline(
    transform: Transform,
    context: EditorPaintContext,
    noVertices: unknown,
    color: Color | null,
  ): void {
    void noVertices;
    const element = this.getPaintElement();
    const transformed = new VertexTransformer(element as unknown as VertexReader, transform);
    const aligned = new VertexPixelAligner(transformed);
    if (aligned) {
      const canvas = context.canvas as NonNullable<EditorPaintContext["canvas"]>;
      canvas.putVertices(aligned, false);
      canvas.strokeVertices(
        color ||
          (this.hasFlag(BaseEditor.Flag.Highlighted)
            ? context.highlightOutlineColor
            : context.selectionOutlineColor),
        EditorOptions.outlineWidth,
      );
    }
  }

  override getBox(): Rect | null {
    return this.getPaintElement().getGeometryBBox();
  }

  override getBoxTransform(): Transform | null {
    return null;
  }

  override edTransform(
    transform: Transform,
    partId?: unknown,
    partData?: unknown,
    options?: unknown,
  ): void {
    for (let child = this.getElement().getFirstChild(); null != child; child = child.getNext()) {
      if (child instanceof Element) {
        const editor = ElementEditor.openEditor(child);
        if (editor) editor.edTransform(transform, null, null, options);
      }
    }
    super.edTransform(transform, partId, partData, options);
  }

  override resetTransform(): void {
    for (let i = this._editors ? this._editors.length : 0; i > 0; --i) {
      const editor = (this._editors as BaseEditor[])[i - 1];
      if (editor && editor instanceof ElementEditor) editor.resetTransform();
    }
    super.resetTransform();
  }

  override toString(): string {
    return "[Object GCompoundShapeEditor]";
  }
}
