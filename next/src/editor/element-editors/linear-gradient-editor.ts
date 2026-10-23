// Old: chunk.vendor.js module 782 (GLinearGradientEditor).
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Vertex } from "../../engine/geometry/vertex.ts";
import { VertexContainer } from "../../engine/geometry/vertex-container.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Canvas2DPaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { Node } from "../../engine/scene/node.ts";
import { LinearGradient } from "../../engine/style/linear-gradient.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { PartInfo } from "./base-editor.ts";
import type { GradientStop } from "../../engine/style/gradient.ts";
import { GradientStyleEditor, type StopPartId } from "./gradient-style-editor.ts";
import type { StyleEditorActivation } from "./style-editor.ts";

/**
 * Edits a linear gradient: the end stops move, rotate and scale the
 * gradient (Shift constrains the angle), the middle stops slide along the
 * line between the first and last stop.
 */
export class LinearGradientEditor extends GradientStyleEditor {
  static {
    registerClass(this, "GLinearGradientEditor");
  }

  declare _gradient: LinearGradient;
  /**
   * Rotation and scale of the end-stop drag in progress. Not on the old
   * prototype: undefined until the first end-stop drag.
   */
  declare _angleDelta: number;
  declare _scaleDelta: number;

  override activate(activation: StyleEditorActivation): boolean {
    if (
      activation.propName &&
      activation.propHolder instanceof Node &&
      activation.propHolder.getProperty(
        activation.propName,
        false,
        null,
        activation.propTemporary,
      ) instanceof LinearGradient
    )
      return super.activate(activation);
    return false;
  }

  override paint(transform: Transform, context: PaintContext): void {
    const canvas = context.canvas as NonNullable<PaintContext["canvas"]>;
    const points = this._getAnnotationPoints();
    if (points) {
      if (transform && !transform.isIdentity()) {
        for (let i = 0; i < points.length; ++i) points[i] = transform.mapPoint(points[i] as Point);
      }
      const style = EditorOptions.annotationHandles.gradient;
      let start = points[0] as Point;
      let end = points[points.length - 1] as Point;
      start = GradientStyleEditor.alignHandlePoint(start, style.outlineWidth);
      end = GradientStyleEditor.alignHandlePoint(end, style.outlineWidth);
      const line = new VertexContainer();
      line.addVertex(Vertex.Command.Move, start.getX(), start.getY());
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
      const stops = this._gradient.getStops();
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
    this._iterateAnnotations((point, index) => {
      if (
        EditorAnnotation.getAnnotationBBox(
          transform,
          point,
          EditorOptions.annotationHandles.gradient.size,
          false,
        )
          .expanded(pick, pick, pick, pick)
          .containsPoint(position)
      ) {
        result = new PartInfo(
          this,
          { type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: index },
          { noEditorSelectionChangedEvent: true },
          true,
          true,
        );
        // A selected stop wins over the stops painted under it.
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
    const segment: number[] = [];
    const points = this._getAnnotationPoints();
    if (points && points.length > 1) {
      let start = points[0] as Point;
      let end = points[points.length - 1] as Point;
      if (transform && !transform.isIdentity()) {
        start = transform.mapPoint(start);
        end = transform.mapPoint(end);
      }
      if (
        GMath.sqrSegmentDist(
          start.getX(),
          start.getY(),
          end.getX(),
          end.getY(),
          position.getX(),
          position.getY(),
          segment,
        ) <=
        distance * distance
      ) {
        const stops = this._gradient.getStops();
        const first = stops && stops.length ? (stops[0] as GradientStop).position : null;
        const last =
          stops && stops.length ? (stops[stops.length - 1] as GradientStop).position : null;
        let at = 0;
        if (null !== first && null !== last) at = (segment[0] as number) * (last - first) + first;
        result = new PartInfo(
          this,
          { type: GradientStyleEditor.PLUS_STOP_PART_ID, pos: at },
          { noEditorSelectionChangedEvent: true },
          true,
          true,
        );
      }
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
    if (partId && (partId as StopPartId).type === GradientStyleEditor.STOP_HANDLE_PART_ID) {
      const toScene: Transform | null = viewToScene;
      let point = position;
      const inverse = this._getCompositeTransform(false).inverted() as Transform;
      const gradientPoints = this._getGradientPoints();
      const index = (partId as StopPartId).idx;
      const handles = this._getAnnotationPoints();
      let firstHandle: Point | undefined;
      let lastHandle: Point | undefined;
      if (handles) {
        firstHandle = handles[0];
        lastHandle = handles[handles.length - 1];
      }
      const scale = this._gradient.getScale();
      this._gradient.getAngle();
      if (0 == index || index == gradientPoints.length - 1) {
        if (!Platform.modifiers.metaKey) point = this._snapPosition(point);
        const first = gradientPoints[0] as Point;
        const last = gradientPoints[gradientPoints.length - 1] as Point;
        let dx = 0;
        let dy = 0;
        let translation: Transform | null = null;
        if (0 == index) {
          if (shift && last) {
            point = this._constrainPosition(
              point,
              toScene ? (toScene.inverted() as Transform) : null,
              null,
              lastHandle as Point,
            ) as Point;
          }
          point = toScene ? toScene.mapPoint(point) : point;
          point = inverse.mapPoint(point);
          dx = point.getX() - first.getX();
          dy = point.getY() - first.getY();
          translation = new Transform(1, 0, 0, 1, dx, dy);
          point = last;
        } else if (index == gradientPoints.length - 1) {
          if (shift && first) {
            point = this._constrainPosition(
              point,
              toScene ? (toScene.inverted() as Transform) : null,
              null,
              firstHandle as Point,
            ) as Point;
          }
          point = toScene ? toScene.mapPoint(point) : point;
          point = inverse.mapPoint(point);
        }
        const movedLast = new Point(last.getX() + dx, last.getY() + dy);
        const originX = first.getX() + dx;
        const originY = first.getY() + dy;
        const toOrigin = new Transform(1, 0, 0, 1, -originX, -originY);
        const fromOrigin = new Transform(1, 0, 0, 1, originX, originY);
        const oldLength = GMath.ptDist(originX, originY, movedLast.getX(), movedLast.getY());
        const newLength = GMath.ptDist(originX, originY, point.getX(), point.getY());
        const scaleDelta = oldLength > 0 ? newLength / oldLength : 1;
        const scaling = new Transform(scaleDelta, 0, 0, scaleDelta, 0, 0);
        const angleDelta =
          Math.atan2(movedLast.getY() - originY, movedLast.getX() - originX) -
          Math.atan2(point.getY() - originY, point.getX() - originX);
        const cos = Math.cos(angleDelta);
        const sin = Math.sin(angleDelta);
        const rotation = new Transform(cos, -sin, sin, cos, 0, 0);
        const change = toOrigin.multiplied(scaling).multiplied(rotation).multiplied(fromOrigin);
        translation = translation ? translation.multiplied(change) : change;
        this._angleDelta = angleDelta;
        this._scaleDelta = scaleDelta;
        this._gradient.setTransform(translation);
        this._propHolder.setProperty(
          this._propName as string,
          this._gradient.clone(),
          false,
          false,
          true,
        );
      } else if (index > 0 && index < gradientPoints.length - 1 && firstHandle && lastHandle) {
        const toView = toScene ? toScene.inverted() : null;
        if (toView) {
          firstHandle = toView.mapPoint(firstHandle);
          lastHandle = toView.mapPoint(lastHandle);
        }
        point = GMath.getVectorProjection(
          firstHandle.getX(),
          firstHandle.getY(),
          lastHandle.getX(),
          lastHandle.getY(),
          point.getX(),
          point.getY(),
          true,
          true,
        );
        point = toScene ? toScene.mapPoint(point) : point;
        point = inverse.mapPoint(point);
        const distance = GMath.ptDist(
          point.getX(),
          point.getY(),
          this._gradient._fx,
          this._gradient._fy,
        );
        let at = scale ? distance / scale : distance;
        const stops = this._gradient.getStops();
        if (at < (stops[0] as GradientStop).position) at = (stops[0] as GradientStop).position;
        else if (at > (stops[stops.length - 1] as GradientStop).position)
          at = (stops[stops.length - 1] as GradientStop).position;
        (stops[index] as GradientStop).position = at;
        this._synchIdx(partId);
        this._propHolder.setProperty(
          this._propName as string,
          this._gradient.clone(),
          false,
          false,
          true,
        );
      }
    }
    return undefined;
  }

  /** Bakes the end-stop drag into origin, scale and angle. */
  override _applyPartMove(
    partId: unknown,
    partData: unknown,
    option?: unknown,
    extra?: unknown,
  ): void {
    if (partId && (partId as StopPartId).type === GradientStyleEditor.STOP_HANDLE_PART_ID) {
      const index = (partId as StopPartId).idx;
      const stops = this._gradient.getStops();
      if (0 == index || index == stops.length - 1) {
        if (this._gradient.getTransform()) {
          const origin = (this._gradient.getTransform() as Transform).mapPoint(
            new Point(this._gradient._fx, this._gradient._fy),
          );
          this._gradient._fx = origin.getX();
          this._gradient._fy = origin.getY();
        }
        this._gradient._scale *= this._scaleDelta;
        this._scaleDelta = 1;
        this._gradient._angle -= this._angleDelta;
        this._angleDelta = 0;
        this._gradient._angle = GMath.normalizeAngleRadians(this._gradient._angle);
        this._gradient.setTransform(null);
      }
    }
    super._applyPartMove(partId, partData, option, extra);
  }

  override resetPartMove(partId: unknown, partData: unknown): void {
    this._scaleDelta = 1;
    this._angleDelta = 0;
    this._gradient.setTransform(null);
    super.resetPartMove(partId, partData);
  }

  override _getAnnotationPoints(): Point[] {
    const points = this._getGradientPoints();
    const transform = this._getCompositeTransform(true);
    for (let i = 0; i < points.length; ++i) points[i] = transform.mapPoint(points[i] as Point);
    return points;
  }

  /** The stop points in gradient space. */
  _getGradientPoints(): Point[] {
    const scale = this._gradient.getScale();
    const angle = this._gradient.getAngle();
    const dx = Math.cos(angle) * scale;
    const dy = Math.sin(angle) * scale;
    const stops = this._gradient.getStops();
    const points: Point[] = [];
    for (let i = 0; i < stops.length; ++i) {
      points.push(
        new Point(
          this._gradient._fx + dx * (stops[i] as GradientStop).position,
          this._gradient._fy + dy * (stops[i] as GradientStop).position,
        ),
      );
    }
    return points;
  }

  override toString(): string {
    return "[Object GLinearGradientEditor]";
  }
}
