// Old: chunk.vendor.js module 772 (GCommentAnnotationEditor).
/**
 * The editor of a comment annotation (the speech bubble placed with the
 * comment tool). It paints the bubble icon itself: a white bubble with a
 * coloured rim, scaled by half, instead of the path outline, and its
 * bounding box is the icon's. Dragging it always moves it as if Shift
 * were held. No point handles.
 *
 * See AnnotationEditorMixin for what all annotation editors share.
 */
import { registerClass } from "../../engine/core/object.ts";
import { VertexContainer } from "../../engine/geometry/vertex-container.ts";
import { VertexInfo } from "../../engine/geometry/vertex-info.ts";
import { VertexPixelAligner } from "../../engine/geometry/vertex-pixel-aligner.ts";
import { VertexTransformer } from "../../engine/geometry/vertex-transformer.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { CommentAnnotation } from "../../engine/scene/annotations/comment-annotation.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { BaseEditor, type EditorPaintContext } from "../element-editors/base-editor.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { PathEditor, type EditedPath } from "../element-editors/path-editor.ts";
import { AnnotationEditorMixin } from "./annotation-editor.ts";

/*
 * The icon data as the old bundle wrote it. Every literal is the shortest
 * form of its double (Number(text) prints the same text), so the rule's
 * precision warnings are false positives here.
 */
/* eslint-disable no-loss-of-precision */

/** The white inside of the bubble icon (32 x 32 icon units). */
const BUBBLE_FILL = VertexContainer.deserialize([
  1, 7, 1, 2, 25, 1, 4, 31, 7, 4, 28.311490120000002, 1, 4, 31, 3.68850988, 2, 31, 25, 4, 25, 31, 4,
  31, 28.311490120000002, 4, 28.311490120000002, 31, 2, 7, 31, 4, 1, 25, 4, 3.68850988, 31, 4, 1,
  28.311490120000002, 2, 1, 7, 4, 7, 1, 4, 1, 3.68850988, 4, 3.68850988, 1, 5, 0, 0, 1, 26, 4, 4,
  28, 6, 4, 27.104568481445085, 4, 4, 27.999999999999773, 4.895430564880371, 2, 28, 26, 4, 26, 28,
  4, 27.999999999999773, 27.104568481445312, 4, 27.104568481445085, 28, 2, 6, 28, 4, 4, 26, 4,
  4.895430564880144, 28, 4, 3.9999999999997726, 27.104568481445312, 2, 4, 6, 4, 6, 4, 4,
  3.9999999999997726, 4.895430564880371, 4, 4.895430564880144, 4, 2, 26, 4, 5, 0, 0,
]);

/** The rim of the bubble icon (an outer and an inner contour). */
const BUBBLE_RIM = VertexContainer.deserialize([
  1, 7, 0, 2, 25, 0, 4, 29.950000762939453, 2.049999952316284, 4, 26.860000610351562, 0, 4,
  28.639999389648438, 0.7400000095367432, 4, 32, 7, 4, 31.260000228881836, 3.359999895095825, 4, 32,
  5.139999866485596, 2, 32, 25, 4, 29.950000762939453, 29.950000762939453, 4, 32,
  26.860000610351562, 4, 31.260000228881836, 28.639999389648438, 4, 25, 32, 4, 28.639999389648438,
  31.260000228881836, 4, 26.860000610351562, 32, 2, 7, 32, 4, 2.049999952316284, 29.950000762939453,
  4, 5.139999866485596, 32, 4, 3.359999895095825, 31.260000228881836, 4, 0, 25, 4,
  0.7400000095367432, 28.639999389648438, 4, 0, 26.860000610351562, 2, 0, 7, 4, 2.049999952316284,
  2.049999952316284, 4, 0, 5.139999866485596, 4, 0.7400000095367432, 3.359999895095825, 4, 7, 0, 4,
  3.359999895095825, 0.7400000095367432, 4, 5.139999866485596, 0, 5, 0, 0, 1, 7, 2, 2, 25, 2, 4,
  28.540000915527344, 3.4600000381469727, 4, 26.329999923706055, 2, 4, 27.600000381469727,
  2.5299999713897705, 4, 30, 7, 4, 29.469999313354492, 4.400000095367432, 4, 30, 5.670000076293945,
  2, 30, 25, 4, 28.540000915527344, 28.540000915527344, 4, 30, 26.329999923706055, 4,
  29.469999313354492, 27.600000381469727, 4, 25, 30, 4, 27.600000381469727, 29.469999313354492, 4,
  26.329999923706055, 30, 2, 7, 30, 4, 3.4600000381469727, 28.540000915527344, 4, 5.670000076293945,
  30, 4, 4.400000095367432, 29.469999313354492, 4, 2, 25, 4, 2.5299999713897705, 27.600000381469727,
  4, 2, 26.329999923706055, 2, 2, 7, 4, 3.4600000381469727, 3.4600000381469727, 4, 2,
  5.670000076293945, 4, 2.5299999713897705, 4.400000095367432, 4, 7, 2, 4, 4.400000095367432,
  2.5299999713897705, 4, 5.670000076293945, 2, 5, 0, 0,
]);

/* eslint-enable no-loss-of-precision */

/** The icon's bounds plus one icon unit on every side. */
const BUBBLE_BOUNDS = (VertexInfo.calculateBounds(BUBBLE_RIM, true) as Rect).expanded(1, 1, 1, 1);

export class CommentAnnotationEditor extends AnnotationEditorMixin(PathEditor) {
  static {
    registerClass(this, "GCommentAnnotationEditor");
    ElementEditor.exports(this, CommentAnnotation);
  }

  constructor(element: EditedPath, uid?: unknown) {
    super(element);
    this._uid = uid;
  }

  /** Always moved as with Shift held. */
  override movePart(
    partId: unknown,
    partData: unknown,
    position: Point,
    viewToWorld: Transform,
    guides: unknown,
    shift?: unknown,
    option?: unknown,
  ): unknown {
    return super.movePart(partId, partData, position, viewToWorld, guides, true, option);
  }

  override _showAnnotations(): boolean {
    return false;
  }

  /** The bubble icon's box (scaled by half and by the annotation's transform). */
  override getCustomBBox(transform: Transform | null, includeTransform?: unknown): Rect | null {
    let matrix = transform;
    if (includeTransform && this._transform) {
      matrix = matrix ? this._transform.multiplied(matrix) : this._transform;
    }
    const half = new Transform().scaled(0.5, 0.5);
    const element = this.getPaintElement();
    return half
      .multiplied(element.getTransform() as Transform)
      .multiplied(matrix as Transform)
      .mapRect(BUBBLE_BOUNDS);
  }

  /** Paints the bubble icon: the white inside, then the rim in the outline colour. */
  override _paintOutline(
    transform: Transform,
    context: EditorPaintContext,
    noVertices: unknown,
    color: Parameters<PathEditor["_paintOutline"]>[3],
  ): void {
    const element = this.getPaintElement();
    // The old code looked the scene's editor up here and didn't use it.
    ElementEditor.getEditor(this._element.getScene());
    if (!noVertices && !this._element.hasFlag(ElementFlag.Hidden)) {
      const half = new Transform().scaled(0.5, 0.5);
      const matrix = half.multiplied(element.getTransform() as Transform).multiplied(transform);
      const fill = new VertexPixelAligner(new VertexTransformer(BUBBLE_FILL, matrix));
      const rim = new VertexPixelAligner(new VertexTransformer(BUBBLE_RIM, matrix));
      if (fill && rim) {
        const canvas = context.canvas as NonNullable<EditorPaintContext["canvas"]>;
        // The old code passed 0 as the composite operator, which means the default.
        canvas.putVertices(fill, false);
        canvas.fillVertices("#fff", 1, null, true);
        canvas.putVertices(rim, false);
        canvas.fillVertices(
          color ||
            (this.hasFlag(BaseEditor.Flag.Highlighted)
              ? context.highlightOutlineColor
              : context.selectionOutlineColor),
          1,
          null,
          true,
        );
      }
    }
  }

  override toString(): string {
    return "[Object GCommentAnnotationEditor]";
  }
}
