// Old: chunk.vendor.js module 1083 (GImageGridEditor).
/**
 * The editor of an image grid: its box is the geometry box without a
 * transform and the outline is the grid's own vertices.
 */
import type { Color } from "../../engine/color/color.ts";
import { registerClass } from "../../engine/core/object.ts";
import { VertexPixelAligner } from "../../engine/geometry/vertex-pixel-aligner.ts";
import type { VertexReader } from "../../engine/geometry/vertex-source.ts";
import { VertexTransformer } from "../../engine/geometry/vertex-transformer.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { ImageGrid } from "../../engine/scene/image-grid.ts";
import { EditorOptions } from "../editor-options.ts";
import { BaseEditor, type EditorPaintContext } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { ShapeEditor, type EditedShape } from "./shape-editor.ts";

export class ImageGridEditor<E extends EditedShape = EditedShape> extends ShapeEditor<E> {
  static {
    registerClass(this, "GImageGridEditor");
    ElementEditor.exports(this, ImageGrid);
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

  override resetTransform(): void {
    for (let i = this._editors ? this._editors.length : 0; i > 0; --i) {
      const editor = (this._editors as BaseEditor[])[i - 1];
      if (editor && editor instanceof ElementEditor) editor.resetTransform();
    }
    super.resetTransform();
  }

  override toString(): string {
    return "[Object GImageGridEditor]";
  }
}
