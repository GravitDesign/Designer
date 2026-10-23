// Old: chunk.vendor.js module 781 (GAngularGradientEditor).
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { uuid } from "../../engine/core/util.ts";
import { Vertex } from "../../engine/geometry/vertex.ts";
import { VertexContainer } from "../../engine/geometry/vertex-container.ts";
import { VertexInfo } from "../../engine/geometry/vertex-info.ts";
import { VertexTransformer } from "../../engine/geometry/vertex-transformer.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Canvas2DPaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { Node } from "../../engine/scene/node.ts";
import { AngularGradient } from "../../engine/style/angular-gradient.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { PartInfo } from "./base-editor.ts";
import type { GradientStop } from "../../engine/style/gradient.ts";
import { GradientStyleEditor, type StopPartId } from "./gradient-style-editor.ts";
import type { StyleEditorActivation } from "./style-editor.ts";

/**
 * Edits an angular (conic) gradient: the center handle moves the center,
 * the end handle (and the stops at 0 and 1) turns the start angle, the
 * other stops move around the circle. Clicking the circle adds a stop.
 */
export class AngularGradientEditor extends GradientStyleEditor {
  static {
    registerClass(this, "GAngularGradientEditor");
  }

  static END_HANDLE_PART_ID = uuid();
  static CENTER_HANDLE_PART_ID = uuid();

  declare _gradient: AngularGradient;

  override activate(activation: StyleEditorActivation): boolean {
    if (
      activation.propName &&
      activation.propHolder instanceof Node &&
      activation.propHolder.getProperty(
        activation.propName,
        false,
        null,
        activation.propTemporary,
      ) instanceof AngularGradient
    )
      return super.activate(activation);
    return false;
  }

  /** The unit ellipse scaled to the gradient circle, in scene (or view) space. */
  _circleTransform(transform: Transform | null): Transform {
    const toCircle = new Transform(0.5, 0, 0, 0.5, this._gradient._fx, this._gradient._fy);
    let result = this._getCompositeTransform(true);
    result = toCircle.multiplied(result);
    if (transform && !transform.isIdentity()) result = result.multiplied(transform);
    return result;
  }

  override paint(transform: Transform, context: PaintContext): void {
    const canvas = context.canvas as NonNullable<PaintContext["canvas"]>;
    const points = this._getAnnotationPoints();
    const pivots = this._getPivotPoints();
    if (points && pivots && 2 == pivots.length) {
      if (transform && !transform.isIdentity()) {
        for (let i = 0; i < points.length; ++i) points[i] = transform.mapPoint(points[i] as Point);
        for (let i = 0; i < pivots.length; ++i) pivots[i] = transform.mapPoint(pivots[i] as Point);
      }
      const style = EditorOptions.annotationHandles.gradient;
      const end = pivots[0] as Point;
      const center = pivots[1] as Point;
      const line = new VertexContainer();
      line.addVertex(Vertex.Command.Move, center.getX(), center.getY());
      line.addVertex(Vertex.Command.Line, end.getX(), end.getY());
      canvas.putVertices(line);
      canvas.strokeVertices(
        new RGBColor(RGBColor.parseCSSColor(style.lineShadowColor)),
        style.outlineWidth + 2 * Canvas2DPaintCanvas.getScreenDPI(),
        null,
        null,
        null,
        null,
        0.6,
      );
      canvas.strokeVertices(RGBColor.WHITE, style.outlineWidth);
      const circle = new VertexTransformer(new Ellipse(), this._circleTransform(transform));
      canvas.putVertices(circle);
      canvas.strokeVertices(
        new RGBColor(RGBColor.parseCSSColor(style.lineShadowColor)),
        style.outlineWidth + 2 * Canvas2DPaintCanvas.getScreenDPI(),
        null,
        null,
        null,
        null,
        0.6,
      );
      canvas.strokeVertices(RGBColor.WHITE, style.outlineWidth);
      EditorAnnotation.paintAnnotation(
        context,
        null,
        center,
        style.type,
        false,
        style.size,
        RGBColor.WHITE,
        RGBColor.WHITE,
        style.outlineWidth,
        style.shadowColor,
      );
      const stops = this._gradient.getStops();
      if (
        !stops.length ||
        (0 != (stops[0] as GradientStop).position &&
          1 != (stops[stops.length - 1] as GradientStop).position)
      ) {
        this._paintCross(end, context);
      }
      let selected: number | null = null;
      for (let i = 0; i < points.length; ++i) {
        if (
          this._partSelection &&
          this._partSelection.length &&
          (this._partSelection[0] as StopPartId).idx == i
        ) {
          selected = i;
        } else {
          EditorAnnotation.paintAnnotation(
            context,
            null,
            points[i] as Point,
            style.type,
            false,
            style.size,
            RGBColor.WHITE,
            RGBColor.WHITE,
            style.outlineWidth,
            style.shadowColor,
          );
        }
      }
      if (null !== selected) {
        EditorAnnotation.paintAnnotation(
          context,
          null,
          points[selected] as Point,
          style.type,
          false,
          style.sizeBig,
          RGBColor.WHITE,
          (stops[selected] as GradientStop).color,
          style.outlineWidth,
          style.shadowColor,
        );
      }
    }
    super.paint(transform, context);
  }

  override getPartInfoAt(
    position: Point,
    transform: Transform,
    _filter?: unknown,
    tolerance?: number | null,
  ): PartInfo | null {
    const distance = tolerance as number;
    let result: PartInfo | null = null;
    const pick = EditorOptions.annotPickDistance;
    const size = EditorOptions.annotationHandles.gradient.size;
    const hits = (point: Point): boolean =>
      EditorAnnotation.getAnnotationBBox(transform, point, size, false)
        .expanded(pick, pick, pick, pick)
        .containsPoint(position);
    this._iterateAnnotations((point, index) => {
      if (hits(point)) {
        result = new PartInfo(
          this,
          { type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: index },
          { noEditorSelectionChangedEvent: true },
          true,
          true,
        );
        if (
          this._partSelection &&
          this._partSelection.length &&
          (this._partSelection[0] as StopPartId).idx == index
        )
          return true;
      }
      return false;
    });
    if (result) return result;
    const pivots = this._getPivotPoints();
    if (pivots && 2 == pivots.length) {
      if (hits(pivots[1] as Point)) {
        result = new PartInfo(
          this,
          AngularGradientEditor.CENTER_HANDLE_PART_ID,
          { point: pivots[1], noEditorSelectionChangedEvent: true },
          true,
          false,
        );
      } else if (hits(pivots[0] as Point)) {
        result = new PartInfo(
          this,
          AngularGradientEditor.END_HANDLE_PART_ID,
          { point: pivots[0], noEditorSelectionChangedEvent: true },
          true,
          false,
        );
      }
    }
    if (result) return result;
    const circleTransform = this._circleTransform(transform);
    const circle = new VertexTransformer(new Ellipse(), circleTransform);
    if (
      VertexInfo.hitTest(position.getX(), position.getY(), circle, 2 * distance, false) &&
      circleTransform.invertible()
    ) {
      const local = (circleTransform.inverted() as Transform).mapPoint(position);
      let angle = Math.atan2(-local.getY(), -local.getX());
      if (angle < this._gradient._a0) angle += GMath.PI2;
      let at = (angle - this._gradient._a0) / GMath.PI2;
      if (GMath.isEqualEps(at, 1, GradientStyleEditor.DEFAULT_EPS) || at > 1) at = 1;
      else if (GMath.isEqualEps(at, 0, GradientStyleEditor.DEFAULT_EPS) || at < 0) at = 0;
      result = new PartInfo(
        this,
        { type: GradientStyleEditor.PLUS_STOP_PART_ID, pos: at },
        { noEditorSelectionChangedEvent: true },
        true,
        true,
      );
    }
    return result;
  }

  override movePart(
    partId: unknown,
    partData: unknown,
    position: Point,
    viewToScene: Transform,
    guides: unknown,
    shift?: unknown,
    option?: unknown,
  ): unknown {
    super.movePart(partId, partData, position, viewToScene, guides, shift, option);
    const toScene = viewToScene;
    const gradient = this._gradient;
    let point = position;
    const stops = gradient.getStops();
    const stopPart = partId as StopPartId;
    const isStop = !!partId && stopPart.type === GradientStyleEditor.STOP_HANDLE_PART_ID;
    let inverse: Transform | null;
    if (partId === AngularGradientEditor.CENTER_HANDLE_PART_ID) {
      if (!Platform.modifiers.metaKey) point = this._snapPosition(point);
      point = toScene.mapPoint(point);
      if ((inverse = this._getCompositeTransform(true).inverted())) {
        point = inverse.mapPoint(point);
        gradient._fx = point.getX();
        gradient._fy = point.getY();
        this._propHolder.setProperty(
          this._propName as string,
          gradient.clone(),
          false,
          false,
          true,
        );
      }
    } else if (
      partId &&
      ((isStop && 0 == stopPart.idx && stops.length && 0 == (stops[0] as GradientStop).position) ||
        (isStop &&
          stops.length &&
          stopPart.idx == stops.length - 1 &&
          1 == (stops[stops.length - 1] as GradientStop).position) ||
        partId === AngularGradientEditor.END_HANDLE_PART_ID)
    ) {
      // An end turns the start angle.
      if (!Platform.modifiers.metaKey) point = this._snapPosition(point);
      if (shift) {
        const pivots = this._getPivotPoints();
        if (pivots && 2 == pivots.length) {
          point = this._constrainPosition(
            point,
            toScene.inverted(),
            null,
            pivots[1] as Point,
          ) as Point;
        }
      }
      point = toScene.mapPoint(point);
      if ((inverse = this._getCompositeTransform(true).inverted())) {
        point = inverse.mapPoint(point);
        const center = new Point(gradient._fx, gradient._fy);
        const offset = point.subtract(center);
        gradient._a0 = Math.atan2(-offset.getY(), -offset.getX());
        this._propHolder.setProperty(
          this._propName as string,
          gradient.clone(),
          false,
          false,
          true,
        );
      }
    } else if (isStop && stops.length && stopPart.idx >= 0 && stopPart.idx <= stops.length - 1) {
      if (!Platform.modifiers.metaKey) point = this._snapPosition(point);
      if (shift) {
        const pivots = this._getPivotPoints();
        if (pivots && 2 == pivots.length) {
          point = this._constrainPosition(
            point,
            toScene.inverted(),
            null,
            pivots[1] as Point,
          ) as Point;
        }
      }
      point = toScene.mapPoint(point);
      if ((inverse = this._getCompositeTransform(true).inverted())) {
        point = inverse.mapPoint(point);
        const center = new Point(gradient._fx, gradient._fy);
        const offset = point.subtract(center);
        let angle = Math.atan2(-offset.getY(), -offset.getX());
        if (angle < gradient._a0) angle += GMath.PI2;
        let at = (angle - gradient._a0) / GMath.PI2;
        if (GMath.isEqualEps(at, 1, GradientStyleEditor.DEFAULT_EPS) || at > 1) at = 1;
        else if (GMath.isEqualEps(at, 0, GradientStyleEditor.DEFAULT_EPS) || at < 0) at = 0;
        (stops[stopPart.idx] as GradientStop).position = at;
        this._synchIdx(partId);
        this._propHolder.setProperty(
          this._propName as string,
          gradient.clone(),
          false,
          false,
          true,
        );
      }
    }
    return undefined;
  }

  override getCursor(partId?: unknown): unknown {
    const cursor = super.getCursor(partId);
    return (
      cursor || (partId === AngularGradientEditor.CENTER_HANDLE_PART_ID ? Cursor.SelectCross : null)
    );
  }

  override getCustomBBox(transform: Transform | null): Rect | null {
    let bbox = super.getCustomBBox(transform);
    const unit = new Rect(this._gradient._fx - 0.5, this._gradient._fy - 0.5, 1, 1);
    let composite = this._getCompositeTransform(true);
    composite = transform ? composite.multiplied(transform) : composite;
    const box = composite.mapRect(unit);
    bbox = bbox ? bbox.united(box) : box;
    const margin = EditorOptions.annotationHandles.gradient.sizeBig + 1;
    bbox = bbox.expanded(margin, margin, margin, margin);
    return bbox;
  }

  override _getAnnotationPoints(): Point[] {
    const points = this._getGradientPoints();
    const transform = this._getCompositeTransform(true);
    for (let i = 0; i < points.length; ++i) points[i] = transform.mapPoint(points[i] as Point);
    return points;
  }

  /** The end handle (at the start angle) and the center, in scene coordinates. */
  _getPivotPoints(): Point[] {
    const center = new Point(this._gradient._fx, this._gradient._fy);
    const points: Point[] = [];
    points[0] = new Point(this._gradient._fx + this._gradient._scale, this._gradient._fy).rotatedAt(
      this._gradient._a0 + Math.PI,
      center,
    );
    points[1] = center;
    const transform = this._getCompositeTransform(true);
    for (let i = 0; i < points.length; ++i) points[i] = transform.mapPoint(points[i] as Point);
    return points;
  }

  /** The stops on the circle, in gradient space. */
  _getGradientPoints(): Point[] {
    const points: Point[] = [];
    const stops = this._gradient.getStops();
    const center = new Point(this._gradient._fx, this._gradient._fy);
    for (let i = 0; i < stops.length; ++i) {
      points.push(
        new Point(this._gradient._fx + this._gradient._scale, this._gradient._fy).rotatedAt(
          this._gradient._a0 + Math.PI + (stops[i] as GradientStop).position * GMath.PI2,
          center,
        ),
      );
    }
    return points;
  }

  override toString(): string {
    return "[Object GAngularGradientEditor]";
  }
}
