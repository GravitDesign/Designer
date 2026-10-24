// Old: chunk.vendor.js module 1085 (GSimpleShapeEditor).
/**
 * The editor of a simple shape (the parametric shapes of the shapes
 * library). In detail mode it shows the shape's annotations (its
 * parameter handles); dragging one moves the annotation on a preview
 * copy of the shape and applying it writes the new position.
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { registerClass } from "../../engine/core/object.ts";
import { uuid } from "../../engine/core/util.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { SimpleShape } from "../../engine/scene/simple-shape.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { BaseEditor, PartInfo, type EditorPaintContext } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { ShapeEditor, type EditedShape } from "./shape-editor.ts";

/** A simple shape as its editor drives it. */
export type EditedSimpleShape = EditedShape & SimpleShape;

/** PartInfo data of an annotation handle. */
export interface AnnotationPartData {
  annotationIdx: number;
}

export class SimpleShapeEditor<
  E extends EditedSimpleShape = EditedSimpleShape,
> extends ShapeEditor<E> {
  static {
    registerClass(this, "GSimpleShapeEditor");
    ElementEditor.exports(this, SimpleShape);
  }

  static ANNOTATION_PART_ID = uuid();

  override getCustomBBox(transform: Transform | null, includeTransform?: unknown): Rect | null {
    let box = super.getCustomBBox(transform, includeTransform);
    if (this._showSegmentDetails()) {
      let viewTransform = transform;
      if (includeTransform && this._transform) {
        viewTransform = viewTransform ? this._transform.multiplied(viewTransform) : this._transform;
      }
      this.getPaintElement().iterateAnnotations(function (position) {
        const handle = EditorAnnotation.getAnnotationBBox(
          viewTransform,
          position,
          EditorOptions.annotationHandles.simpleShape.size,
          true,
        );
        if (handle && !handle.isEmpty()) box = box ? box.united(handle) : handle;
      }, true);
    }
    return box;
  }

  /** A copy of the shape (same processor and parameters, same geometry properties). */
  override createElementPreview(): void {
    if (!this._elementPreview) {
      this._setElementPreview(
        new SimpleShape(
          this._element._parameterizedVertexProcessor,
          this._element._annotationsParamVals,
          undefined,
          undefined,
          this._element._sShapeName,
        ) as unknown as E,
      );
      (this._elementPreview as unknown as E).transferProperties(this._element, [
        Shape.GeometryProperties,
      ]);
    }
  }

  override movePart(
    partId: unknown,
    partData: unknown,
    position: Point,
    viewToWorld: Transform,
    guides: unknown,
    shift?: unknown,
    option?: unknown,
  ): unknown {
    let result = super.movePart(partId, partData, position, viewToWorld, guides, shift, option);
    if (partId === SimpleShapeEditor.ANNOTATION_PART_ID) {
      const point = viewToWorld.mapPoint(position);
      this.createElementPreview();
      this.getPaintElement().setAnnotationMouseLocation(
        (partData as AnnotationPartData).annotationIdx,
        point,
      );
      this.requestInvalidation();
      result = null;
    }
    return result;
  }

  override _applyPartMove(
    partId: unknown,
    partData: unknown,
    option?: unknown,
    extra?: unknown,
  ): void {
    if (partId === SimpleShapeEditor.ANNOTATION_PART_ID) {
      const index = (partData as AnnotationPartData).annotationIdx;
      if (this._elementPreview) {
        this._element.setAnnotationMouseLocation(
          index,
          this._elementPreview.getAnnotationPosition(index) as Point,
        );
      }
      this.resetPartMove(partId, partData);
      this.requestInvalidation();
    } else super._applyPartMove(partId, partData, option, extra);
  }

  override isDeletePartsAllowed(): boolean {
    return false;
  }

  override canApplyTransform(): unknown {
    return (
      (this._elementPreview && (this._elementPreview.getTransform() as Transform).invertible()) ||
      super.canApplyTransform()
    );
  }

  override _postPaint(transform: Transform, context: EditorPaintContext): void {
    super._postPaint(transform, context);
    if (this._showSegmentDetails()) {
      this.getPaintElement().iterateAnnotations((position) => {
        const selected =
          this._partSelection &&
          this._partSelection.indexOf(SimpleShapeEditor.ANNOTATION_PART_ID) >= 0;
        const options = EditorOptions.annotationHandles.simpleShape;
        EditorAnnotation.paintAnnotation(
          context,
          transform,
          position,
          options.type,
          selected,
          options.size,
          RGBColor.WHITE,
          context.annotationColor,
        );
      }, true);
    }
  }

  override _getPartInfoAt(
    location: Point,
    transform: Transform,
    tolerance: number,
    extra?: unknown,
  ): PartInfo | null {
    if (this._showSegmentDetails()) {
      let hit: PartInfo | null = null;
      this._element.iterateAnnotations((position, index) => {
        const pick = EditorOptions.annotPickDistance;
        if (
          EditorAnnotation.getAnnotationBBox(
            transform,
            position,
            EditorOptions.annotationHandles.simpleShape.size,
            false,
          )
            .expanded(pick, pick, pick, pick)
            .containsPoint(location)
        ) {
          const data: AnnotationPartData = { annotationIdx: index };
          hit = new PartInfo(this, SimpleShapeEditor.ANNOTATION_PART_ID, data, true, false);
          return true;
        }
        return undefined;
      }, true);
      if (hit) return hit;
    }
    // The old call dropped `extra`.
    void extra;
    return super._getPartInfoAt(location, transform, tolerance);
  }

  /** Annotations show in detail mode while no preview is painted. */
  _showSegmentDetails(): boolean {
    return this._showAnnotations() && this.hasFlag(BaseEditor.Flag.Detail) && !this._elementPreview;
  }

  override toString(): string {
    return "[Object GSimpleShapeEditor]";
  }
}
