// Old: chunk.vendor.js module 747 (GPolygonEditor).
/**
 * The editor of a polygon (and star). In detail mode every outer and
 * inner point gets a handle. Dragging one sets the radius of its kind to
 * the pointer's distance from the centre and turns its angle with the
 * pointer (not with Shift). With both kinds selected the other kind
 * follows: its point moves by the same offset.
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { registerClass } from "../../engine/core/object.ts";
import { uuid } from "../../engine/core/util.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { PathBase } from "../../engine/scene/path-base.ts";
import { Polygon } from "../../engine/scene/polygon.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { BaseEditor, PartInfo, type EditorPaintContext } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { PathBaseEditor, type EditedPathBase } from "./path-base-editor.ts";
import { ShapeEditor } from "./shape-editor.ts";

/** A polygon as its editor drives it. */
export type EditedPolygon = EditedPathBase & Polygon;

interface PolygonHandleOptions {
  innerType: string;
  outerType: string;
  size: number;
  inverted?: unknown;
  outlineWidth?: number;
  shadowColor?: string;
  outsideStroke?: unknown;
}

export class PolygonEditor<E extends EditedPolygon = EditedPolygon> extends PathBaseEditor<E> {
  static {
    registerClass(this, "GPolygonEditor");
    ElementEditor.exports(this, Polygon);
  }

  static INSIDE_PART_ID = uuid();
  static OUTSIDE_PART_ID = uuid();

  override getBBoxMargin(): number {
    return super.getBBoxMargin();
  }

  override getCustomBBox(transform: Transform | null, includeTransform?: unknown): Rect | null {
    let box = super.getCustomBBox(transform, includeTransform);
    if (this._showSegmentDetails()) {
      let viewTransform = transform;
      if (includeTransform && this._transform) {
        viewTransform = viewTransform ? this._transform.multiplied(viewTransform) : this._transform;
      }
      this.getPaintElement().iterateSegments((point) => {
        const handle = EditorAnnotation.getAnnotationBBox(
          viewTransform,
          point,
          EditorOptions.annotationHandles.polygon.size,
          true,
        );
        if (handle && !handle.isEmpty()) box = box ? box.united(handle) : handle;
      }, true);
    }
    return box;
  }

  override createElementPreview(): void {
    if (!this._elementPreview) {
      this._setElementPreview(new Polygon() as unknown as E);
      (this._elementPreview as unknown as E).transferProperties(this._element, [
        Shape.GeometryProperties,
        Polygon.GeometryProperties,
        PathBase.MetaProperties,
      ]);
    }
  }

  /** `partData` is the angle of the dragged point (from its PartInfo). */
  override movePart(
    partId: unknown,
    partData: unknown,
    position: Point,
    viewToWorld: Transform,
    guides: unknown,
    shift?: unknown,
    option?: unknown,
  ): unknown {
    const result = super.movePart(partId, partData, position, viewToWorld, guides, shift, option);
    if (partId === PolygonEditor.INSIDE_PART_ID || partId === PolygonEditor.OUTSIDE_PART_ID) {
      let point = viewToWorld.mapPoint(position);
      const own = this._element.getProperty("trf") as Transform | null;
      if (own) point = (own.inverted() as Transform).mapPoint(point);
      this.createElementPreview();
      const center = this._element.getCenter(false) as Point;
      const delta =
        Math.atan2(point.getY() - center.getY(), point.getX() - center.getX()) -
        (partData as number);
      const distance = GMath.ptDist(point.getX(), point.getY(), center.getX(), center.getY());
      const outerAngle = this._element.getProperty("oa") as number;
      const outerRadius = this._element.getProperty("or") as number;
      const innerAngle = this._element.getProperty("ia") as number;
      const innerRadius = this._element.getProperty("ir") as number;
      let newInnerAngle = innerAngle;
      let newInnerRadius = innerRadius;
      let newOuterAngle = outerAngle;
      let newOuterRadius = outerRadius;
      // Throws without a part selection, as in the old code.
      const selection = this._partSelection as unknown[];
      const inner = selection.indexOf(PolygonEditor.INSIDE_PART_ID) >= 0;
      const outer = selection.indexOf(PolygonEditor.OUTSIDE_PART_ID) >= 0;
      if (1 == selection.length) {
        if (inner) {
          if (!shift) newInnerAngle = GMath.normalizeAngleRadians(delta + innerAngle);
          newInnerRadius = distance;
        }
        if (outer) {
          if (!shift) newOuterAngle = GMath.normalizeAngleRadians(delta + outerAngle);
          newOuterRadius = distance;
        }
      } else if (inner && outer) {
        if (partId == PolygonEditor.INSIDE_PART_ID) {
          if (!shift) newInnerAngle = GMath.normalizeAngleRadians(delta + innerAngle);
          newInnerRadius = distance;
          const dx = newInnerRadius * Math.cos(newInnerAngle) - innerRadius * Math.cos(innerAngle);
          const dy = newInnerRadius * Math.sin(newInnerAngle) - innerRadius * Math.sin(innerAngle);
          const moved = new Point(
            outerRadius * Math.cos(outerAngle) + dx,
            outerRadius * Math.sin(outerAngle) + dy,
          );
          newOuterAngle = Math.atan2(moved.getY(), moved.getX());
          newOuterRadius = GMath.ptDist(moved.getX(), moved.getY(), 0, 0);
        } else if (partId == PolygonEditor.OUTSIDE_PART_ID) {
          if (!shift) newOuterAngle = GMath.normalizeAngleRadians(delta + outerAngle);
          newOuterRadius = distance;
          const dx = newOuterRadius * Math.cos(newOuterAngle) - outerRadius * Math.cos(outerAngle);
          const dy = newOuterRadius * Math.sin(newOuterAngle) - outerRadius * Math.sin(outerAngle);
          const moved = new Point(
            innerRadius * Math.cos(innerAngle) + dx,
            innerRadius * Math.sin(innerAngle) + dy,
          );
          newInnerAngle = Math.atan2(moved.getY(), moved.getX());
          newInnerRadius = GMath.ptDist(moved.getX(), moved.getY(), 0, 0);
        }
      }
      (this._elementPreview as unknown as E).setProperties(
        ["oa", "or", "ia", "ir"],
        [newOuterAngle, newOuterRadius, newInnerAngle, newInnerRadius],
      );
      this.requestInvalidation();
    }
    return result;
  }

  override _applyPartMove(
    partId: unknown,
    partData: unknown,
    option?: unknown,
    extra?: unknown,
  ): void {
    if (partId === PolygonEditor.INSIDE_PART_ID || partId === PolygonEditor.OUTSIDE_PART_ID) {
      const values = (this._elementPreview as unknown as E).getProperties(["oa", "or", "ia", "ir"]);
      this.resetPartMove(partId, partData);
      this._element.setProperties(["oa", "or", "ia", "ir"], values);
    }
    super._applyPartMove(partId, partData, option, extra);
  }

  override canApplyTransform(): unknown {
    return (
      (this._elementPreview && (this._elementPreview.getTransform() as Transform).invertible()) ||
      super.canApplyTransform()
    );
  }

  override _hasCenterCross(): boolean {
    return true;
  }

  override _postPaint(transform: Transform, context: EditorPaintContext): void {
    super._postPaint(transform, context);
    if (this._showSegmentDetails()) {
      this.getPaintElement().iterateSegments((point, isInner) => {
        const id = isInner ? PolygonEditor.INSIDE_PART_ID : PolygonEditor.OUTSIDE_PART_ID;
        const options = EditorOptions.annotationHandles.polygon as PolygonHandleOptions;
        let selected = !!this._partSelection && this._partSelection.indexOf(id) >= 0;
        if (options.inverted) selected = !selected;
        const type = isInner ? options.innerType : options.outerType;
        EditorAnnotation.paintAnnotation(
          context,
          transform,
          point,
          type,
          selected,
          options.size,
          RGBColor.WHITE,
          context.annotationColor,
          options.outlineWidth,
          options.shadowColor,
          options.outsideStroke,
        );
        if (EditorOptions.annotationHandles.suppressRedundantCorners && isInner) return true;
        return undefined;
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
      this._element.iterateSegments((point, isInner, angle) => {
        const pick = EditorOptions.annotPickDistance;
        if (
          EditorAnnotation.getAnnotationBBox(
            transform,
            point,
            EditorOptions.annotationHandles.polygon.size,
            false,
          )
            .expanded(pick, pick, pick, pick)
            .containsPoint(location)
        ) {
          const id = isInner ? PolygonEditor.INSIDE_PART_ID : PolygonEditor.OUTSIDE_PART_ID;
          hit = new PartInfo(this, id, angle, true, true);
          return true;
        }
        return undefined;
      }, true);
      if (hit) return hit;
    }
    return ShapeEditor.prototype._getPartInfoAt.call(this, location, transform, tolerance, extra);
  }

  _showSegmentDetails(): boolean {
    return this._showAnnotations() && this.hasFlag(BaseEditor.Flag.Detail) && !this._elementPreview;
  }

  override toString(): string {
    return "[Object GPolygonEditor]";
  }
}
