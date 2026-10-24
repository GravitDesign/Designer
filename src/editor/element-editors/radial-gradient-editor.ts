// Old: chunk.vendor.js module 780 (GRadialGradientEditor).
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { uuid } from "../../engine/core/util.ts";
import { Vertex } from "../../engine/geometry/vertex.ts";
import { VertexContainer } from "../../engine/geometry/vertex-container.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Canvas2DPaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { Node } from "../../engine/scene/node.ts";
import { RadialGradient } from "../../engine/style/radial-gradient.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { PartInfo } from "./base-editor.ts";
import type { GradientStop } from "../../engine/style/gradient.ts";
import { GradientStyleEditor, type StopPartId } from "./gradient-style-editor.ts";
import type { StyleEditorActivation } from "./style-editor.ts";

/** Part data of the move, extra, start and end handles. */
interface HandlePartData {
  point: Point;
  noEditorSelectionChangedEvent: boolean;
  origTransformInv?: Transform;
}

/**
 * Edits a radial gradient. Pivot points: 0 center, 1 the x radius end,
 * 2 the y radius end, 3 the focal point. One of the two radius ends
 * leads (carries the stops); clicking the other one ("extra" handle)
 * switches. The start handle moves the focal point, the end handle
 * scales and skews along the leading axis, the move handle (the radius
 * lines) translates.
 */
export class RadialGradientEditor extends GradientStyleEditor {
  static {
    registerClass(this, "GRadialGradientEditor");
  }

  static MOVE_HANDLE_PART_ID = uuid();
  static EXTRA_HANDLE_PART_ID = uuid();
  static START_HANDLE_PART_ID = uuid();
  static END_HANDLE_PART_ID = uuid();

  declare _gradient: RadialGradient;
  /** Whether the x radius end leads. */
  declare _xLeading: boolean;

  override activate(activation: StyleEditorActivation): boolean {
    if (activation.propName && activation.propHolder instanceof Node) {
      const value = activation.propHolder.getProperty(
        activation.propName,
        false,
        null,
        activation.propTemporary,
      );
      this._xLeading = true;
      if (value instanceof RadialGradient) return super.activate(activation);
    }
    return false;
  }

  override paint(transform: Transform, context: PaintContext): void {
    const canvas = context.canvas as NonNullable<PaintContext["canvas"]>;
    const points = this._getAnnotationPoints();
    const pivots = this._getPivotPoints();
    if (points && pivots && 4 == pivots.length) {
      if (transform && !transform.isIdentity()) {
        for (let i = 0; i < points.length; ++i) points[i] = transform.mapPoint(points[i] as Point);
        for (let i = 0; i < pivots.length; ++i) pivots[i] = transform.mapPoint(pivots[i] as Point);
      }
      const style = EditorOptions.annotationHandles.gradient;
      let axes = new VertexContainer();
      axes.addVertex(Vertex.Command.Move, (pivots[1] as Point).getX(), (pivots[1] as Point).getY());
      axes.addVertex(Vertex.Command.Line, (pivots[0] as Point).getX(), (pivots[0] as Point).getY());
      axes.addVertex(Vertex.Command.Line, (pivots[2] as Point).getX(), (pivots[2] as Point).getY());
      canvas.putVertices(axes);
      canvas.strokeVertices(context.selectionOutlineColor, EditorOptions.outlineWidth);
      let start = pivots[3] as Point;
      let end = this._xLeading ? (pivots[1] as Point) : (pivots[2] as Point);
      start = GradientStyleEditor.alignHandlePoint(start, style.outlineWidth);
      end = GradientStyleEditor.alignHandlePoint(end, style.outlineWidth);
      axes = new VertexContainer();
      axes.addVertex(Vertex.Command.Move, start.getX(), start.getY());
      axes.addVertex(Vertex.Command.Line, end.getX(), end.getY());
      canvas.putVertices(axes);
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
      const stops = this._gradient.getStops();
      if (!(stops.length && 0 == (stops[0] as GradientStop).position))
        this._paintCross(start, context);
      if (!(stops.length && 1 == (stops[stops.length - 1] as GradientStop).position))
        this._paintCross(end, context);
      EditorAnnotation.paintAnnotation(
        context,
        null,
        this._xLeading ? (pivots[2] as Point) : (pivots[1] as Point),
        style.type,
        false,
        style.size,
        RGBColor.WHITE,
        RGBColor.WHITE,
        style.outlineWidth,
        style.shadowColor,
      );
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
    if (pivots && 4 == pivots.length) {
      const extra = this._xLeading ? (pivots[2] as Point) : (pivots[1] as Point);
      const end = this._xLeading ? (pivots[1] as Point) : (pivots[2] as Point);
      const stops = this._gradient.getStops();
      if (hits(extra)) {
        result = new PartInfo(
          this,
          RadialGradientEditor.EXTRA_HANDLE_PART_ID,
          { point: extra, noEditorSelectionChangedEvent: true },
          true,
          true,
        );
      } else if (
        !(stops.length && 1 == (stops[stops.length - 1] as GradientStop).position) &&
        hits(end)
      ) {
        result = new PartInfo(
          this,
          RadialGradientEditor.END_HANDLE_PART_ID,
          { point: end, noEditorSelectionChangedEvent: true },
          true,
          false,
        );
      } else if (
        !(stops.length && 0 == (stops[0] as GradientStop).position) &&
        hits(pivots[3] as Point)
      ) {
        result = new PartInfo(
          this,
          RadialGradientEditor.START_HANDLE_PART_ID,
          { point: pivots[3], noEditorSelectionChangedEvent: true },
          true,
          false,
        );
      } else {
        const segment: number[] = [];
        const local = transform ? (transform.inverted() as Transform).mapPoint(position) : position;
        let limit = distance;
        if (transform && !transform.isIdentity()) {
          const scale = transform.getScaleFactor();
          limit = scale ? distance / scale : distance;
        }
        if (
          GMath.sqrSegmentDist(
            (pivots[3] as Point).getX(),
            (pivots[3] as Point).getY(),
            end.getX(),
            end.getY(),
            local.getX(),
            local.getY(),
            segment,
          ) <=
          limit * limit
        ) {
          result = new PartInfo(
            this,
            { type: GradientStyleEditor.PLUS_STOP_PART_ID, pos: segment[0] },
            { noEditorSelectionChangedEvent: true },
            true,
            true,
          );
        } else {
          for (const axisEnd of [pivots[1] as Point, pivots[2] as Point]) {
            if (
              GMath.sqrSegmentDist(
                (pivots[0] as Point).getX(),
                (pivots[0] as Point).getY(),
                axisEnd.getX(),
                axisEnd.getY(),
                local.getX(),
                local.getY(),
                segment,
              ) <=
              limit * limit
            ) {
              result = new PartInfo(
                this,
                RadialGradientEditor.MOVE_HANDLE_PART_ID,
                {
                  noEditorSelectionChangedEvent: true,
                  point: GMath.getPointAtSegment(
                    (pivots[0] as Point).getX(),
                    (pivots[0] as Point).getY(),
                    axisEnd.getX(),
                    axisEnd.getY(),
                    segment[0] as number,
                  ),
                  origTransformInv: this._getCompositeTransform(true).inverted(),
                },
                true,
                false,
              );
              break;
            }
          }
        }
      }
    }
    return result;
  }

  /** Clicking the extra handle switches the leading axis. */
  override updatePartSelection(
    _toggle: boolean,
    partIds: unknown[] | null,
    noEvent?: boolean,
  ): PartInfo | undefined {
    const part = partIds && partIds.length ? partIds[0] : null;
    let result: PartInfo | undefined;
    if (part && part === RadialGradientEditor.EXTRA_HANDLE_PART_ID) {
      this._xLeading = !this._xLeading;
      const stops = this._gradient.getStops();
      if (stops && stops.length && 1 == (stops[stops.length - 1] as GradientStop).position) {
        result = new PartInfo(
          this,
          { type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: stops.length - 1 },
          { noEditorSelectionChangedEvent: true },
          true,
          true,
        );
        super.updatePartSelection(false, [result.id], noEvent);
      } else {
        // Quirk: `point` of a string part id is undefined, see
        // "Radial gradient extra handle returns an end handle without a point"
        // in QUESTIONS.md.
        result = new PartInfo(
          this,
          RadialGradientEditor.END_HANDLE_PART_ID,
          {
            point: (part as unknown as { point?: Point }).point,
            noEditorSelectionChangedEvent: true,
          },
          true,
          false,
        );
      }
      this.requestInvalidation();
    } else {
      result = super.updatePartSelection(false, part ? [part] : null, noEvent);
    }
    if (result) return result;
    return undefined;
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
    let pivots = this._getPivotPoints();
    const stopPart = partId as StopPartId;
    const isStop = !!partId && stopPart.type === GradientStyleEditor.STOP_HANDLE_PART_ID;
    const isLastStopAtEnd =
      isStop &&
      !!stops.length &&
      stopPart.idx == stops.length - 1 &&
      1 == (stops[stops.length - 1] as GradientStop).position;
    let inverse: Transform | null;
    if (
      (isStop && 0 == stopPart.idx && stops.length && 0 == (stops[0] as GradientStop).position) ||
      partId === RadialGradientEditor.START_HANDLE_PART_ID
    ) {
      if (!Platform.modifiers.metaKey) point = this._snapPosition(point);
      if (shift && pivots) {
        point = this._constrainPosition(
          point,
          toScene.inverted(),
          null,
          pivots[0] as Point,
        ) as Point;
      }
      point = toScene.mapPoint(point);
      if ((inverse = this._getCompositeTransform(true).inverted())) {
        point = inverse.mapPoint(point);
        if (
          !GMath.isEqualEps(point.getX(), gradient._cx) ||
          !GMath.isEqualEps(point.getY(), gradient._cy)
        ) {
          // Keep the focal point inside the radius.
          const distanceSqr = GMath.ptSqrDist(
            point.getX(),
            point.getY(),
            gradient._cx,
            gradient._cy,
          );
          const radiusSqr = gradient._scale * gradient._scale;
          if (distanceSqr > radiusSqr || GMath.isEqualEps(radiusSqr, distanceSqr)) {
            const t = gradient._scale / Math.sqrt(distanceSqr) - 0.001;
            point = GMath.getPointAtSegment(
              gradient._cx,
              gradient._cy,
              point.getX(),
              point.getY(),
              t,
            );
          }
        }
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
      !this._xLeading &&
      partId &&
      (isLastStopAtEnd || partId === RadialGradientEditor.END_HANDLE_PART_ID)
    ) {
      if (!Platform.modifiers.metaKey) point = this._snapPosition(point);
      point = toScene.mapPoint(point);
      if ((inverse = this._getCompositeTransform(true).inverted())) {
        point = inverse.mapPoint(point);
        const axisEnd = new Point(gradient._cx, gradient._cy - gradient._scale);
        const scaleY = (gradient._cy - point.getY()) / gradient._scale;
        let dy = point.getY() - gradient._cy;
        if (GMath.isEqualEps(dy, 0)) dy = GMath.defaultEps;
        const skew = (point.getX() - axisEnd.getX()) / dy;
        let change = new Transform()
          .translated(-gradient._cx, -gradient._cy)
          .scaled(1, scaleY)
          .multiplied(new Transform(1, 0, skew, 1, 0, 0))
          .translated(gradient._cx, gradient._cy);
        if (gradient._transform) change = change.multiplied(gradient._transform);
        if (change.inverted()) {
          gradient.setTransform(change);
          this._propHolder.setProperty(
            this._propName as string,
            gradient.clone(),
            false,
            false,
            true,
          );
        }
      }
    } else if (
      this._xLeading &&
      partId &&
      (isLastStopAtEnd || partId === RadialGradientEditor.END_HANDLE_PART_ID)
    ) {
      if (!Platform.modifiers.metaKey) point = this._snapPosition(point);
      if (shift && (pivots = this._getPivotPoints())) {
        point = this._constrainPosition(
          point,
          toScene.inverted(),
          null,
          pivots[0] as Point,
        ) as Point;
      }
      point = toScene.mapPoint(point);
      if ((inverse = this._getCompositeTransform(true).inverted())) {
        point = inverse.mapPoint(point);
        const axisEnd = new Point(gradient._cx + gradient._scale, gradient._cy);
        let dx = point.getX() - gradient._cx;
        const scaleX = dx / gradient._scale;
        if (GMath.isEqualEps(dx, 0)) dx = GMath.defaultEps;
        const skew = (point.getY() - axisEnd.getY()) / dx;
        let change = new Transform()
          .translated(-gradient._cx, -gradient._cy)
          .scaled(scaleX, 1)
          .multiplied(new Transform(1, skew, 0, 1, 0, 0))
          .translated(gradient._cx, gradient._cy);
        if (gradient._transform) change = change.multiplied(gradient._transform);
        if (change.inverted()) {
          gradient.setTransform(change);
          this._propHolder.setProperty(
            this._propName as string,
            gradient.clone(),
            false,
            false,
            true,
          );
        }
      }
    } else if (
      isStop &&
      stops.length &&
      stopPart.idx >= 0 &&
      stopPart.idx <= stops.length - 1 &&
      pivots &&
      4 == pivots.length
    ) {
      // A middle stop slides along the focal point to leading end line.
      let start = pivots[3] as Point;
      let end = this._xLeading ? (pivots[1] as Point) : (pivots[2] as Point);
      const toView = toScene ? toScene.inverted() : null;
      if (toView) {
        start = toView.mapPoint(start);
        end = toView.mapPoint(end);
      }
      point = GMath.getVectorProjection(
        start.getX(),
        start.getY(),
        end.getX(),
        end.getY(),
        point.getX(),
        point.getY(),
        true,
        true,
      );
      point = toScene ? toScene.mapPoint(point) : point;
      if ((inverse = this._getCompositeTransform(true).inverted())) {
        point = inverse.mapPoint(point);
        const focal = new Point(gradient._fx, gradient._fy);
        const leading = this._xLeading
          ? new Point(gradient._cx + gradient._scale, gradient._cy)
          : new Point(gradient._cx, gradient._cy - gradient._scale);
        const distance = GMath.ptDist(point.getX(), point.getY(), focal.getX(), focal.getY());
        const length = GMath.ptDist(leading.getX(), leading.getY(), focal.getX(), focal.getY());
        let at = length ? distance / length : 0;
        if (GMath.isEqualEps(at, 1, GradientStyleEditor.DEFAULT_EPS)) at = 1;
        else if (GMath.isEqualEps(at, 0, GradientStyleEditor.DEFAULT_EPS)) at = 0;
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
    } else if (partId === RadialGradientEditor.MOVE_HANDLE_PART_ID) {
      point = toScene.mapPoint(point);
      if ((inverse = this._getCompositeTransform(true).inverted())) {
        point = inverse.mapPoint(point);
        const data = partData as HandlePartData;
        const grabbed = (data.origTransformInv as Transform).mapPoint(data.point);
        const dx = point.getX() - grabbed.getX();
        const dy = point.getY() - grabbed.getY();
        let change = new Transform(1, 0, 0, 1, dx, dy);
        if (gradient._transform) change = change.multiplied(gradient._transform);
        if (change.inverted()) {
          gradient.setTransform(change);
          this._propHolder.setProperty(
            this._propName as string,
            gradient.clone(),
            false,
            false,
            true,
          );
        }
      }
    }
    return undefined;
  }

  override getCursor(partId?: unknown): unknown {
    const cursor = super.getCursor(partId);
    return (
      cursor || (partId === RadialGradientEditor.MOVE_HANDLE_PART_ID ? Cursor.SelectCross : null)
    );
  }

  override getCustomBBox(transform: Transform | null): Rect | null {
    let bbox = super.getCustomBBox(transform);
    const pivots = this._getPivotPoints();
    if (pivots && pivots.length) {
      for (let i = 1; i < pivots.length; ++i) {
        const box = EditorAnnotation.getAnnotationBBox(
          transform,
          pivots[i] as Point,
          EditorOptions.annotationHandles.gradient.size,
          true,
        );
        bbox = bbox ? bbox.united(box) : box;
      }
    }
    return bbox;
  }

  override _getAnnotationPoints(): Point[] {
    const points = this._getGradientPoints();
    const transform = this._getCompositeTransform(true);
    for (let i = 0; i < points.length; ++i) points[i] = transform.mapPoint(points[i] as Point);
    return points;
  }

  /** Center, x radius end, y radius end and focal point in scene coordinates. */
  _getPivotPoints(): Point[] {
    const gradient = this._gradient;
    const points: Point[] = [];
    points[0] = new Point(gradient._cx, gradient._cy);
    points[1] = new Point(gradient._cx + gradient._scale, gradient._cy);
    points[2] = new Point(gradient._cx, gradient._cy - gradient._scale);
    points[3] = new Point(gradient._fx, gradient._fy);
    const transform = this._getCompositeTransform(true);
    for (let i = 0; i < points.length; ++i) points[i] = transform.mapPoint(points[i] as Point);
    return points;
  }

  /** The stop points on the focal point to leading end line, in gradient space. */
  _getGradientPoints(): Point[] {
    const gradient = this._gradient;
    const points: Point[] = [];
    const stops = gradient.getStops();
    const leading = this._xLeading
      ? new Point(gradient._cx + gradient._scale, gradient._cy)
      : new Point(gradient._cx, gradient._cy - gradient._scale);
    const focal = new Point(gradient._fx, gradient._fy);
    const dx = leading.getX() - focal.getX();
    const dy = leading.getY() - focal.getY();
    for (let i = 0; i < stops.length; ++i) {
      points.push(
        new Point(
          gradient._fx + dx * (stops[i] as GradientStop).position,
          gradient._fy + dy * (stops[i] as GradientStop).position,
        ),
      );
    }
    return points;
  }

  override toString(): string {
    return "[Object GRadialGradientEditor]";
  }
}

RadialGradientEditor.prototype._xLeading = true;
