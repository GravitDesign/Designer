// Old: chunk.vendor.js module 330 (GRectangleEditor).
/**
 * The editor of a rectangle. In detail mode each corner gets a shoulder
 * handle, placed `annotationHandles.rectangle.margin` px inside the corner
 * along the edges plus the share of the corner radius. Dragging it
 * changes that corner's radii (`<side>_sx`, `<side>_sy`); with Shift, or
 * when the corner is uniform (`<side>_uf`), both radii stay equal. With
 * uniform corners (`uf`) the first handle drives all four.
 *
 * Shoulder part ids are objects ({ id: SHOULDER_PART_ID, side, ... }),
 * compared by id and side.
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { registerClass } from "../../engine/core/object.ts";
import { uuid } from "../../engine/core/util.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect, type RectSide } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { AnchorPoint } from "../../engine/scene/path-base.ts";
import { PathBase } from "../../engine/scene/path-base.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { BaseEditor, PartInfo, type EditorPaintContext } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { PathBaseEditor, type EditedPathBase } from "./path-base-editor.ts";

/** A rectangle as its editor drives it. */
export type EditedRectangle = EditedPathBase & Rectangle;

/** The part id of a shoulder handle. */
export interface ShoulderPartId {
  id: string;
  side: RectSide;
  /** The corner's anchor point (on hits). */
  ap?: AnchorPoint;
  /** The handle position in scene coordinates (on hits). */
  point?: Point;
}

/** How far a corner's shoulder handles can travel (view coordinates). */
export interface ShoulderLimits {
  limLPos: Point;
  sLeft: number;
  limRPos: Point;
  sRight: number;
}

type CornerVisitor = (
  point: AnchorPoint,
  side: RectSide,
  handle: Point,
  transform: Transform | null,
  leftShoulder: Point,
  rightShoulder: Point,
) => void;

/** `partId.id`, as the old code read it from any part id (undefined for strings). */
function idOf(partId: unknown): unknown {
  return (partId as { id?: unknown }).id;
}

export class RectangleEditor<
  E extends EditedRectangle = EditedRectangle,
> extends PathBaseEditor<E> {
  static {
    registerClass(this, "GRectangleEditor");
    ElementEditor.exports(this, Rectangle);
  }

  static SHOULDER_PART_ID = uuid();

  override getBBoxMargin(): number {
    const margin = super.getBBoxMargin();
    return this._showSegmentDetails()
      ? Math.max(
          EditorAnnotation.getAnnotationPaintMargin(EditorOptions.annotationHandles.rectangle.size),
          margin,
        )
      : margin;
  }

  override createElementPreview(): void {
    if (!this._elementPreview) {
      this._setElementPreview(new Rectangle() as unknown as E);
      (this._elementPreview as unknown as E).transferProperties(this._element, [
        Shape.GeometryProperties,
        Rectangle.GeometryProperties,
        PathBase.MetaProperties,
      ]);
    }
  }

  /** The preview's copy of anchor point `point`, creating the preview when needed. */
  override getPointPreview(point: AnchorPoint): AnchorPoint | null {
    if (!this._elementPreview) this.createElementPreview();
    const index = (
      point.getParent() as unknown as { getIndexOfChild(child: unknown): number }
    ).getIndexOfChild(point);
    return (this._elementPreview as unknown as E)
      .getAnchorPoints()
      .getChildByIndex(index) as AnchorPoint | null;
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
    // The multi-page argument of GBoxEditor.movePart is not passed on.
    const result = super.movePart(partId, partData, position, viewToWorld, guides, shift, option);
    if (idOf(partId) === RectangleEditor.SHOULDER_PART_ID) {
      const part = partId as ShoulderPartId;
      this.createElementPreview();
      const preview = this.getPaintElement();
      const own = preview.getTransform();
      const pointPreview = this.getPointPreview(part.ap as AnchorPoint) as AnchorPoint;
      const corner = new Point(
        pointPreview.getProperty("x") as number,
        pointPreview.getProperty("y") as number,
      );
      let toView = own || new Transform();
      const worldToView = viewToWorld.inverted() as Transform;
      toView = toView.multiplied(worldToView);
      const viewCorner = toView.mapPoint(corner);
      const uniform = preview.getProperty("uf");
      const limits = this._getShoulderLimits(pointPreview, uniform, own, worldToView, viewCorner);
      if (limits) {
        const local = (toView.inverted() as Transform).mapPoint(position);
        let neighbour = this._element
          .getAnchorPoints()
          .getPreviousPoint(part.ap as AnchorPoint) as AnchorPoint;
        const previous = new Point(
          neighbour.getProperty("x") as number,
          neighbour.getProperty("y") as number,
        );
        const onPrevious = GMath.getVectorProjection(
          corner.getX(),
          corner.getY(),
          previous.getX(),
          previous.getY(),
          local.getX(),
          local.getY(),
          true,
        );
        neighbour = this._element
          .getAnchorPoints()
          .getNextPoint(part.ap as AnchorPoint) as AnchorPoint;
        const next = new Point(
          neighbour.getProperty("x") as number,
          neighbour.getProperty("y") as number,
        );
        const onNext = GMath.getVectorProjection(
          corner.getX(),
          corner.getY(),
          next.getX(),
          next.getY(),
          local.getX(),
          local.getY(),
          true,
        );
        const viewOnPrevious = toView.mapPoint(onPrevious);
        const viewOnNext = toView.mapPoint(onNext);
        const leftDistance = GMath.ptDist(
          viewOnPrevious.getX(),
          viewOnPrevious.getY(),
          viewCorner.getX(),
          viewCorner.getY(),
        );
        const rightDistance = GMath.ptDist(
          viewOnNext.getX(),
          viewOnNext.getY(),
          viewCorner.getX(),
          viewCorner.getY(),
        );
        const margin = EditorOptions.annotationHandles.rectangle.margin;
        const leftLength = (leftDistance - margin) / limits.sLeft;
        const rightLength = (rightDistance - margin) / limits.sRight;
        const leftView = GMath.getPointAtLength(
          viewCorner.getX(),
          viewCorner.getY(),
          limits.limLPos.getX(),
          limits.limLPos.getY(),
          leftLength,
        );
        const rightView = GMath.getPointAtLength(
          viewCorner.getX(),
          viewCorner.getY(),
          limits.limRPos.getX(),
          limits.limRPos.getY(),
          rightLength,
        );
        const leftScene = viewToWorld.mapPoint(leftView);
        const rightScene = viewToWorld.mapPoint(rightView);
        const sceneCorner = own ? own.mapPoint(corner) : corner;
        let radiusX: number | null = GMath.ptDist(
          leftScene.getX(),
          leftScene.getY(),
          sceneCorner.getX(),
          sceneCorner.getY(),
        );
        let radiusY: number | null = GMath.ptDist(
          rightScene.getX(),
          rightScene.getY(),
          sceneCorner.getX(),
          sceneCorner.getY(),
        );
        const prefix = Rectangle.getGeometryPropertiesSidePrefix(part.side);
        // Shift keeps the smaller radius, a uniform corner the larger one.
        if (shift) {
          if (null !== radiusY && null !== radiusX) {
            if (radiusY > radiusX) radiusY = radiusX;
            else radiusX = radiusY;
          } else if (null !== radiusY) radiusX = radiusY;
          else radiusY = radiusX;
        } else if (this.getPaintElement().getProperty(prefix + "_uf")) {
          if (null !== radiusY && null !== radiusX) {
            if (radiusY > radiusX) radiusX = radiusY;
            else radiusY = radiusX;
          } else if (null !== radiusY) radiusX = radiusY;
          else radiusY = radiusX;
        }
        this.getPaintElement().setProperties([prefix + "_sx", prefix + "_sy"], [radiusX, radiusY]);
        this.requestInvalidation();
      }
    }
    return result;
  }

  override _applyPartMove(
    partId: unknown,
    partData: unknown,
    option?: unknown,
    extra?: unknown,
  ): void {
    if (idOf(partId) === RectangleEditor.SHOULDER_PART_ID) {
      this._element.transferProperties(this._elementPreview as unknown as E, [
        Rectangle.GeometryProperties,
      ]);
      this.resetPartMove(partId, partData);
      // Toggles the selected shoulders, which takes them out of the part
      // selection. Without a part selection this throws, as in the old code.
      const shoulders: unknown[] = [];
      const selection = this._partSelection as unknown[];
      for (let i = 0; i < selection.length; ++i) {
        if (idOf(selection[i]) === RectangleEditor.SHOULDER_PART_ID) shoulders.push(selection[i]);
      }
      this.updatePartSelection(true, shoulders);
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
    this.getPaintElement().iterateSegments((point, side, cornerType, radiusX, radiusY, index) => {
      const part = { id: RectangleEditor.SHOULDER_PART_ID, side: side };
      if (this._showSegmentDetails() || this.isPartSelected(part)) {
        this._processCornerVisualization(
          transform,
          index,
          side,
          (anchor, cornerSide, handle, viewTransform, leftShoulder, rightShoulder) => {
            const viewHandle = (viewTransform as Transform).mapPoint(handle);
            const canvas = context.canvas as NonNullable<EditorPaintContext["canvas"]>;
            if (!this._element.getProperty("uf") || this.isPartSelected(part)) {
              canvas.strokeLine(
                leftShoulder.getX(),
                leftShoulder.getY(),
                viewHandle.getX(),
                viewHandle.getY(),
                EditorOptions.outlineWidth,
                context.selectionOutlineColor,
                true,
              );
              canvas.strokeLine(
                rightShoulder.getX(),
                rightShoulder.getY(),
                viewHandle.getX(),
                viewHandle.getY(),
                EditorOptions.outlineWidth,
                context.selectionOutlineColor,
                true,
              );
            }
            const options = EditorOptions.annotationHandles.rectangle as Record<string, unknown> & {
              type: string;
              size: number;
              inverted?: unknown;
              outlineWidth?: number;
              shadowColor?: string;
              outsideStroke?: unknown;
            };
            let selected: unknown = this.isPartSelected(part);
            if (options.inverted) {
              selected = Object.prototype.hasOwnProperty.call(options, "selectable")
                ? options.inverted
                : !selected;
            }
            EditorAnnotation.paintAnnotation(
              context,
              null,
              viewHandle,
              options.type,
              selected,
              options.size,
              RGBColor.WHITE,
              context.annotationColor,
              options.outlineWidth,
              options.shadowColor,
              options.outsideStroke,
            );
          },
        );
        if (
          this._element.getProperty("uf") &&
          EditorOptions.annotationHandles.suppressRedundantCorners
        ) {
          return true;
        }
      }
      return undefined;
    }, true);
  }

  override _partIdAreEqual(a: unknown, b: unknown): boolean {
    let equal = a === b || idOf(a) === idOf(b);
    if (equal && idOf(a)) equal = (a as ShoulderPartId).side === (b as ShoulderPartId).side;
    return equal;
  }

  override _getPartInfoAt(
    location: Point,
    transform: Transform,
    tolerance: number,
    extra?: unknown,
  ): PartInfo | null {
    if (this._showSegmentDetails()) {
      const hit = this._getDetailsPartInfoAt(location, transform, tolerance);
      if (hit) return hit;
    }
    return super._getPartInfoAt(location, transform, tolerance, extra);
  }

  _getDetailsPartInfoAt(
    location: Point,
    transform: Transform,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
    tolerance?: number,
  ): PartInfo | null {
    let hit: PartInfo | null = null;
    this.getPaintElement().iterateSegments((point, side, cornerType, radiusX, radiusY, index) => {
      this._processCornerVisualization(
        transform,
        index,
        side,
        (anchor, cornerSide, handle, viewTransform) => {
          const pick = EditorOptions.annotPickDistance;
          if (
            EditorAnnotation.getAnnotationBBox(
              viewTransform,
              handle,
              EditorOptions.annotationHandles.rectangle.size,
              false,
            )
              .expanded(pick, pick, pick, pick)
              .containsPoint(location)
          ) {
            const id: ShoulderPartId = {
              id: RectangleEditor.SHOULDER_PART_ID,
              side: cornerSide,
              ap: anchor,
              point: handle,
            };
            hit = new PartInfo(this, id, null, true, true);
          }
        },
      );
      if (hit) return true;
      return undefined;
    }, true);
    return hit;
  }

  /**
   * How far the shoulder handles of `point` may go, in view coordinates
   * (`transform` maps the rectangle, `worldToView` the scene, `viewCorner`
   * is the corner in the view), or null when a side is too short for a
   * handle.
   */
  _getShoulderLimits(
    point: AnchorPoint,
    wholeSegment: unknown,
    transform: Transform | null,
    worldToView: Transform | null,
    viewCorner: Point,
  ): ShoulderLimits | null {
    let limits: ShoulderLimits | null = null;
    const left = point.getLeftShoulderLimitPoint(transform, wholeSegment as boolean) as Point;
    const right = point.getRightShoulderLimitPoint(transform, wholeSegment as boolean) as Point;
    const viewLeft = worldToView ? worldToView.mapPoint(left) : left;
    const viewRight = worldToView ? worldToView.mapPoint(right) : right;
    const leftLength = GMath.ptDist(
      viewLeft.getX(),
      viewLeft.getY(),
      viewCorner.getX(),
      viewCorner.getY(),
    );
    const rightLength = GMath.ptDist(
      viewRight.getX(),
      viewRight.getY(),
      viewCorner.getX(),
      viewCorner.getY(),
    );
    const reserved =
      EditorOptions.annotationHandles.rectangle.margin +
      EditorOptions.annotationHandles.rectangle.size;
    if (leftLength > reserved && rightLength > reserved) {
      limits = {
        limLPos: viewLeft,
        sLeft: (leftLength - reserved) / leftLength,
        limRPos: viewRight,
        sRight: (rightLength - reserved) / rightLength,
      };
    }
    return limits;
  }

  /**
   * Calls `visitor` with the corner at `index` and its shoulder handle (in
   * scene coordinates), the view transform and the shoulder points in the
   * view, when the corner has room for a handle.
   */
  _processCornerVisualization(
    transform: Transform | null,
    index: number,
    side: RectSide,
    visitor: CornerVisitor,
  ): void {
    const element = this.getPaintElement();
    const point = element.getAnchorPoints().getChildByIndex(index) as AnchorPoint;
    const own = element.getTransform();
    const corner = new Point(point.getProperty("x") as number, point.getProperty("y") as number);
    let toView = own || new Transform();
    toView = transform ? toView.multiplied(transform) : toView;
    const viewCorner = toView.mapPoint(corner);
    const uniform = element.getProperty("uf");
    const limits = this._getShoulderLimits(point, uniform, own, transform, viewCorner);
    if (limits) {
      let left = own
        ? point.getLeftShoulderPointTransformed(own, true)
        : point.getLeftShoulderPoint(true);
      if (!left) {
        left = new Point(point.getProperty("x") as number, point.getProperty("y") as number);
        left = own ? own.mapPoint(left) : left;
      }
      let right = own
        ? point.getRightShoulderPointTransformed(own, true)
        : point.getRightShoulderPoint(true);
      if (!right) {
        right = new Point(point.getProperty("x") as number, point.getProperty("y") as number);
        right = own ? own.mapPoint(right) : right;
      }
      left = transform ? transform.mapPoint(left) : left;
      right = transform ? transform.mapPoint(right) : right;
      let handle: Point | undefined;
      const leftLength = GMath.ptDist(
        left.getX(),
        left.getY(),
        viewCorner.getX(),
        viewCorner.getY(),
      );
      const rightLength = GMath.ptDist(
        right.getX(),
        right.getY(),
        viewCorner.getX(),
        viewCorner.getY(),
      );
      const margin = EditorOptions.annotationHandles.rectangle.margin;
      const leftDistance = margin + limits.sLeft * leftLength;
      const rightDistance = margin + limits.sRight * rightLength;
      const leftView = GMath.getPointAtLength(
        viewCorner.getX(),
        viewCorner.getY(),
        limits.limLPos.getX(),
        limits.limLPos.getY(),
        leftDistance,
      );
      const rightView = GMath.getPointAtLength(
        viewCorner.getX(),
        viewCorner.getY(),
        limits.limRPos.getX(),
        limits.limRPos.getY(),
        rightDistance,
      );
      const fromView = toView.inverted() as Transform;
      const leftLocal = fromView.mapPoint(leftView);
      const rightLocal = fromView.mapPoint(rightView);
      switch (side) {
        case Rect.Side.TOP_LEFT:
          handle = new Point(rightLocal.getX(), leftLocal.getY());
          break;
        case Rect.Side.TOP_RIGHT:
          handle = new Point(leftLocal.getX(), rightLocal.getY());
          break;
        case Rect.Side.BOTTOM_RIGHT:
          handle = new Point(rightLocal.getX(), leftLocal.getY());
          break;
        case Rect.Side.BOTTOM_LEFT:
          handle = new Point(leftLocal.getX(), rightLocal.getY());
      }
      if (handle) {
        handle = own ? own.mapPoint(handle) : handle;
        visitor(point, side, handle, transform, left, right);
      }
    }
  }

  _showSegmentDetails(): boolean {
    return this._showAnnotations() && this.hasFlag(BaseEditor.Flag.Detail) && !this._elementPreview;
  }

  override toString(): string {
    return "[Object GRectangleEditor]";
  }
}
