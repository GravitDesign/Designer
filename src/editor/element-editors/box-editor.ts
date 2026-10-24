// Old: chunk.vendor.js module 66 (GBoxEditor).
/**
 * An editor with a box: the resize handles on its corners and edge
 * centres, the rotation handle above (or below) it and the rotation zones
 * just outside the corners. Subclasses say what the box is (getBox, in
 * the element's own coordinates, and getBoxTransform).
 *
 * Dragging a resize handle builds GTransform.getResizeTransform for the
 * side and previews it through transformBox; the rotation handle and the
 * corner zones build a rotation around the box centre and preview it
 * through edTransform. Handle sizes are screen pixels from GEditorOptions.
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import type { Color } from "../../engine/color/color.ts";
import { GObject, registerClass } from "../../engine/core/object.ts";
import { uuid } from "../../engine/core/util.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect, type RectSide } from "../../engine/math/rect.ts";
import { Transform, type TransformDecomposition } from "../../engine/math/transform.ts";
import { Canvas2DPaintCanvas as PaintCanvasClass } from "../../engine/paint/paint-canvas.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { PreserveAspectRatioAnnotation } from "../handles/preserve-aspect-ratio-annotation.ts";
import { RotateAnnotation } from "../handles/rotate-annotation.ts";
import { BaseEditor, PartInfo, type EditorPaintContext } from "./base-editor.ts";

const BoxFlag = {
  ResizeEdges: 1024,
  ResizeCenters: 2048,
  RotateCorners: 4096,
  RotateHandle: 8192,
  ResizeAll: 3072,
} as const;

const OutlineAlignment = {
  Inside: -1,
  Center: 0,
  Outside: 1,
} as const;

/** What a box editor remembers of a resize drag (EdTransformOptions.storedMoveData). */
export interface StoredMoveData {
  side: RectSide;
  position: Point;
  shift: unknown;
  option: unknown;
  dx: number;
  dy: number;
}

/** GBoxEditor.EdTransformOptions: how a previewed transform is applied. */
export class EdTransformOptions extends GObject {
  static {
    registerClass(this, "GBoxEditor.EdTransformOptions");
  }

  declare isMultiPage: boolean;
  declare fullContentsTransform: boolean;
  declare storedMoveData: StoredMoveData | null;
  declare doCollisionlessTransform: unknown;
}
Object.assign(EdTransformOptions.prototype, {
  isMultiPage: false,
  fullContentsTransform: false,
  storedMoveData: null,
  doCollisionlessTransform: null,
});

/** PartInfo data of a resize handle. */
export interface ResizePartData {
  side: RectSide;
  point: Point;
  resizeSegment: number | null;
  offset: Point | null;
}

/** PartInfo data of the rotation handle or a rotation corner. */
export interface RotationPartData {
  point: Point;
  rotSegment?: number;
  handle?: boolean;
  corrPoint: Point;
  noRelayout: boolean;
}

/** Guides as movePart uses them (GGuides.mapPoint). */
export interface PointMapper {
  mapPoint(point: Point, ...rest: unknown[]): Point;
}

type ResizeHandleVisitor = (point: Point, side: RectSide, segment: number | null) => unknown;

export class BoxEditor extends BaseEditor {
  static {
    registerClass(this, "GBoxEditor");
  }

  static override Flag = { ...BaseEditor.Flag, ...BoxFlag };
  static OutlineAlignment = OutlineAlignment;
  static ROT_CORNER_DIST = 4;
  static RESIZE_HANDLE_PART_ID = uuid();
  static ROTATION_HANDLE_PART_ID = uuid();
  static EdTransformOptions = EdTransformOptions;

  declare _rotCornerDist: number;
  declare _alignment: number;
  declare _storedMoveData: StoredMoveData | null;
  declare _computedOutlineColor: Color | null;

  constructor() {
    super();
    this._flags = BoxFlag.ResizeAll | BoxFlag.RotateCorners | BoxFlag.RotateHandle;
    this._rotCornerDist = EditorOptions.annotationHandles.resize.rotateDistance;
  }

  /** The box in the element's coordinates, or null. */
  getBox(): Rect | null {
    return null;
  }

  getBoxTransform(): Transform | null {
    return null;
  }

  transformBox(transform: Transform, options?: EdTransformOptions | null): void {
    this.edTransform(transform, null, null, options);
  }

  override movePart(
    partId: unknown,
    partData: unknown,
    position: Point,
    viewToWorld: Transform,
    guides: unknown,
    shift?: unknown,
    option?: unknown,
    multiPage?: unknown,
  ): unknown {
    super.movePart(partId, partData, position, viewToWorld, guides, shift, option);
    const mapper = guides as PointMapper;
    this._storedMoveData = null;
    if (partId === BoxEditor.RESIZE_HANDLE_PART_ID) {
      const data = partData as ResizePartData;
      let point = viewToWorld.mapPoint(position);
      point = mapper.mapPoint(point, null, this._getGuideExclusions());
      const box = this.getBox();
      if (box) {
        const boxTransform = this.getBoxTransform();
        if (boxTransform) {
          const inverse = boxTransform.inverted();
          if (inverse) point = inverse.mapPoint(point);
        }
        if (data.offset) point = point.add(data.offset);
        const sidePoint = box.getSide(data.side);
        const dx = point.getX() - sidePoint.getX();
        const dy = point.getY() - sidePoint.getY();
        const stored: StoredMoveData = {
          side: data.side,
          position: mapper.mapPoint(
            viewToWorld.mapPoint(position),
            null,
            this._getGuideExclusions(),
          ),
          shift: shift,
          option: option,
          dx: dx,
          dy: dy,
        };
        const options = new EdTransformOptions();
        options.storedMoveData = stored;
        let keepRatio = shift;
        if (EditorOptions.isPreserveAspectRatioEnabledForSide(data.side)) keepRatio = true;
        const resize = Transform.getResizeTransform(
          box,
          data.side,
          dx,
          dy,
          keepRatio as boolean,
          option as boolean,
        );
        if (multiPage) options.isMultiPage = true;
        this.transformBox(resize, options);
        return resize;
      }
    } else if (partId === BoxEditor.ROTATION_HANDLE_PART_ID) {
      const data = partData as RotationPartData;
      const box = this.getBox();
      if (box) {
        let point = viewToWorld.mapPoint(position);
        let center = box.getSide(Rect.Side.CENTER);
        const boxTransform = this.getBoxTransform();
        if (boxTransform) center = boxTransform.mapPoint(center);
        let start = viewToWorld.mapPoint(data.point);
        if (data.corrPoint) {
          // Rotates the corrected start point (the box's right centre) along,
          // so the angle is measured from it.
          const rotation = Transform.getRotationTransform(
            start.getX(),
            start.getY(),
            point.getX(),
            point.getY(),
            center.getX(),
            center.getY(),
            false,
          );
          start = viewToWorld.mapPoint(data.corrPoint);
          point = rotation.mapPoint(start);
        }
        const rotation = Transform.getRotationTransform(
          start.getX(),
          start.getY(),
          point.getX(),
          point.getY(),
          center.getX(),
          center.getY(),
          (shift || EditorOptions.snapRotate) as boolean,
          shift ? Math.PI / 12 : EditorOptions.snapRotate ? Math.PI / 180 : null,
          EditorOptions.snapRotate ? Math.PI / 45 : null,
        );
        const options = new EdTransformOptions();
        options.isMultiPage = !!multiPage;
        options.fullContentsTransform = true;
        this.edTransform(rotation, partId, partData, options);
        return rotation;
      }
    }
    return null;
  }

  override _applyPartMove(
    partId: unknown,
    partData: unknown,
    option?: unknown,
    extra?: unknown,
  ): void {
    super._applyPartMove(partId, partData, option, extra);
    this._storedMoveData = null;
  }

  override edTransform(
    transform: Transform,
    partId?: unknown,
    partData?: unknown,
    options?: unknown,
  ): void {
    super.edTransform(transform, partId, partData, options);
    if (options) this._storedMoveData = (options as EdTransformOptions).storedMoveData;
  }

  override resetTransform(): void {
    super.resetTransform();
    this._storedMoveData = null;
  }

  /** Previews moving `side` of the box by `delta` (scene coordinates). */
  resize(side: RectSide, delta: Point): void {
    const box = this.getBox();
    if (box) {
      let dx = delta.getX();
      let dy = delta.getY();
      const boxTransform = this.getBoxTransform();
      if (boxTransform) {
        const sidePoint = box.getSide(side);
        const moved = boxTransform.mapPoint(sidePoint).add(delta);
        const inverse = boxTransform.inverted();
        const local = inverse ? inverse.mapPoint(moved) : moved;
        dx = local.getX() - sidePoint.getX();
        dy = local.getY() - sidePoint.getY();
      }
      const resize = Transform.getResizeTransform(box, side, dx, dy);
      this.transformBox(resize);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the argument
  _showEditor(context?: EditorPaintContext): boolean {
    return this.hasFlag(BaseEditor.Flag.Selected) && !this.hasFlag(BaseEditor.Flag.HideEditor);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the argument
  _computeOutlineColor(context: EditorPaintContext, transform?: Transform | null): unknown {
    return context.selectionShapeOutlineColor;
  }

  /**
   * The outline colour, computed once per editor. Only subclasses whose
   * _computeOutlineColor stores _computedOutlineColor cache it; the box
   * editor's own returns the colour without storing it, so this returns
   * null for it.
   */
  _getOutlineColor(context: EditorPaintContext, transform?: Transform | null): Color | null {
    if (!this._computedOutlineColor) this._computeOutlineColor(context, transform);
    return this._computedOutlineColor;
  }

  override paint(transform: Transform, context: EditorPaintContext): void {
    this._paintChildren.call(this, transform, context, function (editor) {
      return editor.hasFlag(BaseEditor.Flag.BackEditor);
    });
    if (this._showEditor(context)) {
      let paintTransform = transform;
      if (this._transform) paintTransform = this._transform.multiplied(transform);
      if (this._showOutline()) {
        const color =
          this.getColor() ||
          (this.hasFlag(BaseEditor.Flag.Highlighted)
            ? null
            : this._getOutlineColor(context, transform));
        this._paintOutline(paintTransform, context, false, color, transform);
      }
      if (this._showRotationHandle()) this._paintRotationHandle(transform, context);
      if (this._showResizeBox()) {
        this._paintResizeBoxOutline(paintTransform, context, false, this.getColor() || null);
      }
      if (this._showResizeHandles()) this._paintResizeHandles(transform, context);
      this._postPaint(paintTransform, context);
    }
    this._paintChildren.call(this, transform, context, function (editor) {
      return !editor.hasFlag(BaseEditor.Flag.BackEditor);
    });
  }

  override getCustomBBox(transform: Transform | null, includeTransform?: unknown): Rect | null {
    let box = super.getCustomBBox(transform, includeTransform);
    if (this._showResizeHandles() || this._showRotationCorners() || this._showRotationHandle()) {
      let boxTransform = transform;
      if (includeTransform && this._transform) {
        boxTransform = boxTransform ? this._transform.multiplied(boxTransform) : this._transform;
      }
      if (this._showResizeHandles()) {
        this._iterateResizeHandles(function (point) {
          const handle = EditorAnnotation.getAnnotationBBox(
            boxTransform,
            point,
            EditorOptions.annotationHandles.resize.size,
            true,
          );
          if (handle && !handle.isEmpty()) box = box ? box.united(handle) : handle;
        }, boxTransform);
      }
      if (this._showRotationHandle()) {
        this._processRotationHandle(function (point) {
          const handle = RotateAnnotation.getAnnotationBBox(null, point, true);
          if (handle && !handle.isEmpty()) box = box ? box.united(handle) : handle;
        }, boxTransform);
      }
      if (this._showRotationCorners()) {
        this._processRotationCorners((point) => {
          const handle = EditorAnnotation.getAnnotationBBox(
            null,
            point,
            EditorOptions.annotationHandles.resize.size,
            true,
          ).expanded(
            this._rotCornerDist,
            this._rotCornerDist,
            this._rotCornerDist,
            this._rotCornerDist,
          );
          if (handle && !handle.isEmpty()) box = box ? box.united(handle) : handle;
        }, boxTransform);
      }
    }
    return box;
  }

  override getBBox(transform: Transform): Rect | null {
    let box = this._getBBox(transform, true);
    if (box) {
      const margin = this.getBBoxMargin();
      box = box.expanded(margin, margin, margin, margin);
    }
    return box;
  }

  _getBBox(transform: Transform, includeTransform?: unknown): Rect | null {
    if (this.hasFlag(BaseEditor.Flag.Selected) || this.hasFlag(BaseEditor.Flag.Highlighted)) {
      let paintTransform = transform;
      if (this._transform && includeTransform) {
        paintTransform = this._transform.multiplied(transform);
      }
      let box = this.getBox();
      if (box) {
        const boxTransform = this.getBoxTransform();
        box = boxTransform
          ? boxTransform.multiplied(paintTransform).mapRect(box)
          : paintTransform.mapRect(box);
        const custom = this.getCustomBBox(paintTransform, false);
        if (custom) box = box.united(custom);
      }
      return box;
    }
    return null;
  }

  /** The four corners of the box in view coordinates (with the preview transform when `withTransform`). */
  getBoxQuadrilateral(transform: Transform, withTransform?: unknown): Point[] | null {
    const box = this.getBox();
    if (box && !box.isEmpty()) {
      let boxTransform = this.getBoxTransform();
      if (withTransform) {
        boxTransform = this._transform
          ? (boxTransform as Transform).multiplied(this._transform)
          : boxTransform;
      }
      boxTransform = boxTransform ? boxTransform.multiplied(transform) : transform;
      return boxTransform.mapQuadrilateral(box);
    }
    return null;
  }

  override getBBoxMargin(): number {
    const outside = this._alignment > 0 ? 2 : 0;
    return Math.max(super.getBBoxMargin(), outside);
  }

  override getCursor(partId: unknown, partData?: unknown): unknown {
    let cursor: unknown = null;
    if (partId === BoxEditor.ROTATION_HANDLE_PART_ID) {
      const data = partData as RotationPartData;
      cursor = data.handle
        ? Cursor.SelectRotateRound
        : Cursor.SelectRotate[data.rotSegment as number];
    } else if (partId === BoxEditor.RESIZE_HANDLE_PART_ID && partData) {
      const segment = (partData as ResizePartData).resizeSegment;
      if (null !== segment) {
        if (1 == segment || 5 == segment) cursor = Cursor.SelectResizeVert;
        else if (3 == segment || 7 == segment) cursor = Cursor.SelectResizeHoriz;
        else if (0 == segment || 4 == segment) cursor = Cursor.SelectResizeUpLeftDownRight;
        else if (2 == segment || 6 == segment) cursor = Cursor.SelectResizeUpRightDownLeft;
      }
    }
    return cursor || null;
  }

  override _getPartInfoAt(
    location: Point,
    transform: Transform,
    tolerance: number,
    extra?: unknown,
  ): PartInfo | null {
    let hit: PartInfo | null;
    if (
      this._showResizeHandles() &&
      (hit = this._getResizePartInfoAt(location, transform, tolerance))
    ) {
      return hit;
    }
    if (
      this._showRotationCorners() &&
      (hit = this._getRotationCornerPartInfoAt(location, transform, tolerance))
    ) {
      return hit;
    }
    if (
      this._showRotationHandle() &&
      (hit = this._getRotationHandlePartInfoAt(location, transform, tolerance))
    ) {
      return hit;
    }
    return super._getPartInfoAt(location, transform, tolerance, extra);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  _getResizePartInfoAt(location: Point, transform: Transform, tolerance?: number): PartInfo | null {
    let hit: PartInfo | null = null;
    this._iterateResizeHandles((point, side, segment) => {
      const pick = EditorOptions.annotPickDistance;
      if (
        EditorAnnotation.getAnnotationBBox(
          transform,
          point,
          EditorOptions.annotationHandles.resize.size,
          false,
        )
          .expanded(pick, pick, pick, pick)
          .containsPoint(location)
      ) {
        const offset = this._getResizePartInfoOffsetAt(point, side, transform);
        const data: ResizePartData = { side: side, point: point, resizeSegment: segment, offset };
        hit = new PartInfo(this, BoxEditor.RESIZE_HANDLE_PART_ID, data, true, false);
        return true;
      }
      return undefined;
    }, transform);
    return hit;
  }

  /** With adaptive handles moved off the box: how far the handle sits from the real side. */
  _getResizePartInfoOffsetAt(point: Point, side: RectSide, transform: Transform): Point | null {
    if (!EditorOptions.adaptiveResizeHandles) return null;
    const box = this.getBox();
    if (!box || box.isEmpty()) return null;
    const inverse = (this.getBoxTransform() || new Transform()).inverted();
    if (!inverse) return null;
    const handlesBox = this._getResizeHandlesBBox(transform);
    return handlesBox && Rect.equals(handlesBox, box)
      ? null
      : box.getSide(side).subtract(inverse.mapPoint(point));
  }

  _getRotationCornerPartInfoAt(
    location: Point,
    transform: Transform,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
    tolerance?: number,
  ): PartInfo | null {
    let hit: PartInfo | null = null;
    this._processRotationCorners(
      (corner, corrPoint) => {
        if (
          EditorAnnotation.getAnnotationBBox(
            null,
            corner,
            EditorOptions.annotationHandles.resize.size,
            false,
          )
            .expanded(
              this._rotCornerDist,
              this._rotCornerDist,
              this._rotCornerDist,
              this._rotCornerDist,
            )
            .containsPoint(location)
        ) {
          const segment = GMath.getRotationSegment(corner, location);
          const data: RotationPartData = {
            point: location,
            rotSegment: segment,
            corrPoint: corrPoint,
            noRelayout: true,
          };
          hit = new PartInfo(this, BoxEditor.ROTATION_HANDLE_PART_ID, data, true, false);
          return true;
        }
        return undefined;
      },
      transform,
      location,
    );
    return hit;
  }

  _getRotationHandlePartInfoAt(
    location: Point,
    transform: Transform,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
    tolerance?: number,
  ): PartInfo | null {
    let hit: PartInfo | null = null;
    this._processRotationHandle((point, base, corrPoint) => {
      const handle = RotateAnnotation.getAnnotationBBox(null, point, false);
      if (handle && handle.containsPoint(location)) {
        const data: RotationPartData = {
          point: point,
          handle: true,
          corrPoint: corrPoint,
          noRelayout: true,
        };
        hit = new PartInfo(this, BoxEditor.ROTATION_HANDLE_PART_ID, data, true, false);
        return true;
      }
      return undefined;
    }, transform);
    return hit;
  }

  _paintResizeHandles(transform: Transform, context: EditorPaintContext): void {
    const options = EditorOptions.annotationHandles.resize;
    this._iterateResizeHandles(
      (point, side) => {
        if (EditorOptions.isPreserveAspectRatioEnabledForSide(side)) {
          PreserveAspectRatioAnnotation.paintAnnotation(
            context,
            transform,
            point,
            0,
            this.getColor() || this._getOutlineColor(context, transform),
          );
        } else {
          EditorAnnotation.paintAnnotation(
            context,
            transform,
            point,
            options.type,
            options.inverted,
            options.size,
            this.getColor() || this._getOutlineColor(context, transform),
            RGBColor.WHITE,
            options.outlineWidth,
            options.shadowColor,
            options.outsideStroke,
          );
        }
      },
      transform,
      // Read as the old code did (it throws without a configuration),
      // though _iterateResizeHandles never uses it.
      (context.configuration as unknown as { multiPageView: unknown }).multiPageView,
    );
  }

  _paintRotationHandle(transform: Transform, context: EditorPaintContext): void {
    this._processRotationHandle((point, base) => {
      let offset = 0;
      if (EditorOptions.outlineWidth % 2 != 0) offset = 0.5;
      let stemEnd = point;
      const halfWidth = RotateAnnotation.getAnnotHalfWidth();
      stemEnd = GMath.getPointAtLength(
        stemEnd.getX(),
        stemEnd.getY(),
        base.getX(),
        base.getY(),
        halfWidth,
      );
      const stemStart = new Point(
        Math.floor(base.getX()) + offset,
        Math.floor(base.getY()) + offset,
      );
      stemEnd = new Point(Math.floor(stemEnd.getX()) + offset, Math.floor(stemEnd.getY()) + offset);
      (context.canvas as NonNullable<EditorPaintContext["canvas"]>).strokeLine(
        stemStart.getX(),
        stemStart.getY(),
        stemEnd.getX(),
        stemEnd.getY(),
        EditorOptions.outlineWidth,
        this.getColor() || this._getOutlineColor(context, transform),
      );
      RotateAnnotation.paintAnnotation(
        context,
        null,
        point,
        RotateAnnotation.isIconVisible() ? this.getRotationAngle() : 0,
        this.getColor() || this._getOutlineColor(context, transform),
      );
    }, transform);
  }

  _showOutline(): boolean {
    return false;
  }

  _getGuideExclusions(): unknown {
    return null;
  }

  override _showAnnotations(): boolean {
    return (
      super._showAnnotations() &&
      this._showEditor() &&
      this.hasFlag(BaseEditor.Flag.Selected) &&
      !this.hasFlag(BaseEditor.Flag.Outline)
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the arguments
  _postPaint(transform: Transform, context: EditorPaintContext): void {}

  _showResizeHandles(): boolean {
    return (
      !(this.hasFlag(BaseEditor.Flag.Detail) && !this._showResizeHandlesInDetailMode()) &&
      this._showAnnotations() &&
      !!EditorOptions.resizeHandles &&
      (this.hasFlag(BoxFlag.ResizeEdges) || this.hasFlag(BoxFlag.ResizeCenters))
    );
  }

  _showResizeHandlesInDetailMode(): boolean {
    return !!EditorOptions.resizeHandlesInDetailMode;
  }

  _showResizeBox(): boolean {
    return this._showResizeHandles() && !!EditorOptions.resizeBox;
  }

  _showRotationCorners(): boolean {
    return (
      this._showResizeHandles() &&
      this.hasFlag(BoxFlag.RotateCorners) &&
      !!EditorOptions.cornerRotate
    );
  }

  _showRotationHandle(): boolean {
    return (
      !(this.hasFlag(BaseEditor.Flag.Detail) && !EditorOptions.rotateHandleInDetailMode) &&
      this._showResizeHandles() &&
      this.hasFlag(BoxFlag.RotateHandle) &&
      !!EditorOptions.rotateHandle
    );
  }

  /**
   * Calls `visitor` with each resize handle (scene point, side, cursor
   * segment) until it returns true. Corner handles only show when the box
   * is bigger than a handle in view pixels (or with adaptive handles).
   */
  _iterateResizeHandles(
    visitor: ResizeHandleVisitor,
    transform: Transform | null,
    // Passed by _paintResizeHandles (multi-page view) and never read.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
    multiPageView?: unknown,
  ): void {
    const box = this._getResizeHandlesBBox(transform);
    if (box && !box.isEmpty()) {
      const boxTransform = this.getBoxTransform() || new Transform();
      const viewTransform = transform ? boxTransform.multiplied(transform) : boxTransform;
      const options = EditorOptions.annotationHandles.resize;
      const margin = EditorAnnotation.getAnnotationPaintMargin(options.size);
      let sides: RectSide[] = [];
      const viewBox = viewTransform.mapRect(box);
      const bigEnough =
        EditorOptions.adaptiveResizeHandles ||
        (viewBox.getHeight() > margin && viewBox.getWidth() > margin);
      if (this.hasFlag(BoxFlag.ResizeEdges) && bigEnough) {
        sides = sides.concat([
          Rect.Side.TOP_LEFT,
          Rect.Side.TOP_RIGHT,
          Rect.Side.BOTTOM_LEFT,
          Rect.Side.BOTTOM_RIGHT,
        ]);
      }
      if (this.hasFlag(BoxFlag.ResizeCenters)) {
        sides = sides.concat([
          Rect.Side.TOP_CENTER,
          Rect.Side.BOTTOM_CENTER,
          Rect.Side.RIGHT_CENTER,
          Rect.Side.LEFT_CENTER,
        ]);
      }
      const center = viewTransform.mapPoint(box.getSide(Rect.Side.CENTER));
      const topSegment = GMath.getRotationSegment(
        center,
        viewTransform.mapPoint(box.getSide(Rect.Side.TOP_CENTER)),
      );
      const rightSegment = GMath.getRotationSegment(
        center,
        viewTransform.mapPoint(box.getSide(Rect.Side.RIGHT_CENTER)),
      );
      // Whether the box is mirrored in the view (right comes before top
      // going clockwise).
      const mirrored =
        (rightSegment >= 3
          ? rightSegment
          : topSegment - rightSegment >= 4
            ? rightSegment + 8
            : rightSegment) >
        (topSegment >= 3
          ? topSegment
          : rightSegment - topSegment >= 4
            ? topSegment + 8
            : topSegment);
      for (let i = 0; i < sides.length; ++i) {
        const side = sides[i] as RectSide;
        if (
          true ===
          visitor(
            boxTransform.mapPoint(box.getSide(side)),
            side,
            this._getResizeSegment(side, topSegment, rightSegment, mirrored),
          )
        ) {
          break;
        }
      }
    }
  }

  /**
   * The box the handles sit on: the box itself, or with adaptive handles a
   * box grown so that the handles don't overlap in view pixels.
   */
  _getResizeHandlesBBox(transform: Transform | null): Rect | null {
    let box = this.getBox();
    if (!EditorOptions.adaptiveResizeHandles || !this._showResizeHandles()) return box;
    if (box && !box.isEmpty()) {
      const boxTransform = this.getBoxTransform() || new Transform();
      const viewTransform = transform ? boxTransform.multiplied(transform) : boxTransform;
      if (viewTransform.invertible()) {
        let viewBox = viewTransform.mapRect(box);
        const options = EditorOptions.annotationHandles.resize;
        let minimum = 0;
        if (this.hasFlag(BoxFlag.ResizeEdges)) minimum += 2 * options.size + 5;
        if (this.hasFlag(BoxFlag.ResizeCenters)) minimum += options.size + 5;
        const minWidth = minimum;
        const minHeight = minimum;
        const wideEnough = viewBox.getWidth() > minWidth;
        const highEnough = viewBox.getHeight() > minHeight;
        if (!wideEnough || !highEnough) {
          if (!wideEnough) {
            const grow = minWidth - viewBox.getWidth();
            viewBox = viewBox.expanded(grow / 2, 0, grow / 2, 0);
          }
          if (!highEnough) {
            const grow = minHeight - viewBox.getHeight();
            viewBox = viewBox.expanded(0, grow / 2, 0, grow / 2);
          }
          box = (viewTransform.inverted() as Transform).mapRect(viewBox);
        }
      }
    }
    return box;
  }

  /** The cursor segment (0..7, clockwise from the top) of the handle on `side`. */
  _getResizeSegment(
    side: RectSide,
    topSegment: number,
    rightSegment: number,
    mirrored: boolean,
  ): number | null {
    let segment: number | null = null;
    switch (side) {
      case Rect.Side.TOP_CENTER:
        segment = topSegment;
        break;
      case Rect.Side.TOP_RIGHT:
        segment = mirrored ? (topSegment + 1) % 8 : (topSegment + 7) % 8;
        break;
      case Rect.Side.RIGHT_CENTER:
        segment = rightSegment;
        break;
      case Rect.Side.BOTTOM_RIGHT:
        segment = mirrored ? (rightSegment + 1) % 8 : (rightSegment + 7) % 8;
        break;
      case Rect.Side.BOTTOM_CENTER:
        segment = (topSegment + 4) % 8;
        break;
      case Rect.Side.BOTTOM_LEFT:
        segment = mirrored ? (topSegment + 5) % 8 : (topSegment + 3) % 8;
        break;
      case Rect.Side.LEFT_CENTER:
        segment = (rightSegment + 4) % 8;
        break;
      case Rect.Side.TOP_LEFT:
        segment = mirrored ? (rightSegment + 5) % 8 : (rightSegment + 3) % 8;
    }
    return segment;
  }

  /**
   * Calls `visitor` with the rotation handle (view point), the point on
   * the box edge its stem starts at and the box's right centre.
   */
  _processRotationHandle(
    visitor: (point: Point, base: Point, rightCenter: Point) => unknown,
    transform: Transform | null,
  ): void {
    const box = this._getResizeHandlesBBox(transform);
    if (box && !box.isEmpty()) {
      const options = EditorOptions.annotationHandles.rotate;
      let boxTransform = this.getBoxTransform();
      boxTransform = boxTransform || new Transform();
      boxTransform = transform ? boxTransform.multiplied(transform) : boxTransform;
      const top = "top" == EditorOptions.rotateHandle;
      const first = boxTransform.mapPoint(
        box.getSide(top ? Rect.Side.TOP_LEFT : Rect.Side.BOTTOM_RIGHT),
      );
      const middle = boxTransform.mapPoint(
        box.getSide(top ? Rect.Side.TOP_CENTER : Rect.Side.BOTTOM_CENTER),
      );
      const last = boxTransform.mapPoint(
        box.getSide(top ? Rect.Side.TOP_RIGHT : Rect.Side.BOTTOM_LEFT),
      );
      const length = GMath.ptDist(first.getX(), first.getY(), middle.getX(), middle.getY());
      const dx = first.getX() - middle.getX();
      const dy = first.getY() - middle.getY();
      const distance = options.distance + options.size * this._alignment;
      const normal = new Point((-dy / length) * distance, (dx / length) * distance);
      let base = middle;
      if (this._alignment < 0) {
        base = GMath.getPointAtLength(
          middle.getX(),
          middle.getY(),
          first.getX(),
          first.getY(),
          -this._alignment,
        );
      } else if (this._alignment > 0) {
        base = GMath.getPointAtLength(
          middle.getX(),
          middle.getY(),
          last.getX(),
          last.getY(),
          this._alignment,
        );
      }
      let handle = base.add(normal);
      const center = boxTransform.mapPoint(box.getSide(Rect.Side.CENTER));
      // The handle goes on the side of the edge away from the centre.
      if (
        GMath.segmentSide(
          first.getX(),
          first.getY(),
          last.getX(),
          last.getY(),
          handle.getX(),
          handle.getY(),
        ) ==
        GMath.segmentSide(
          first.getX(),
          first.getY(),
          last.getX(),
          last.getY(),
          center.getX(),
          center.getY(),
        )
      ) {
        handle = base.subtract(normal);
      }
      let rightCenter = box.getSide(Rect.Side.RIGHT_CENTER);
      rightCenter = boxTransform.mapPoint(rightCenter);
      visitor(handle, base, rightCenter);
    }
  }

  /** The rotation of the box (with the preview transform) in radians. */
  getRotationAngle(): number {
    let boxTransform = this.getBoxTransform();
    if (this._transform) {
      boxTransform = boxTransform ? boxTransform.multiplied(this._transform) : this._transform;
    }
    // A singular transform has no decomposition; the old code threw here too.
    return boxTransform
      ? (boxTransform.decomposed() as TransformDecomposition).rotate.getRotationFactor()
      : 0;
  }

  /**
   * Calls `visitor` with each box corner (view point) and the box's right
   * centre, unless `location` lies inside the box.
   */
  _processRotationCorners(
    visitor: (corner: Point, rightCenter: Point) => unknown,
    transform: Transform | null,
    location?: Point,
  ): void {
    const box = this.getBox();
    if (box && !box.isEmpty()) {
      let boxTransform = this.getBoxTransform();
      boxTransform = boxTransform || new Transform();
      boxTransform = transform ? boxTransform.multiplied(transform) : boxTransform;
      const inverse = boxTransform.inverted();
      if (!location || !inverse || !box.containsPoint(inverse.mapPoint(location))) {
        const corners = [
          Rect.Side.TOP_LEFT,
          Rect.Side.TOP_RIGHT,
          Rect.Side.BOTTOM_LEFT,
          Rect.Side.BOTTOM_RIGHT,
        ];
        let rightCenter = box.getSide(Rect.Side.RIGHT_CENTER);
        rightCenter = boxTransform.mapPoint(rightCenter);
        for (let i = 0; i < corners.length; ++i) {
          const corner = corners[i] as RectSide;
          if (true === visitor(boxTransform.mapPoint(box.getSide(corner)), rightCenter)) break;
        }
      }
    }
  }

  _paintOutline(
    transform: Transform,
    context: EditorPaintContext,
    noVertices: unknown,
    color: Color | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the argument
    baseTransform?: Transform | null,
  ): void {
    if (!this._showResizeBox()) this._paintResizeBoxOutline(transform, context, noVertices, color);
  }

  _paintResizeBoxOutline(
    transform: Transform,
    context: EditorPaintContext,
    noVertices: unknown,
    color: Color | null,
    width?: number,
  ): void {
    const box = this._getResizeHandlesBBox(transform);
    if (box) {
      let boxTransform = transform;
      const own = this.getBoxTransform();
      boxTransform = own ? own.multiplied(boxTransform) : boxTransform;
      this._paintTransformedQuadrilateral(boxTransform, box, context, color, width);
    }
  }

  /**
   * Strokes `rect` mapped by `transform`, snapped to the pixel grid. With
   * an outline alignment the stroke is twice as wide and the half inside
   * (Outside) or outside (Inside) the box is cut away.
   */
  _paintTransformedQuadrilateral(
    transform: Transform | null,
    rect: Rect,
    context: EditorPaintContext,
    color: Color | null,
    width?: number,
  ): void {
    let previous: ReturnType<EditorPaintContext["pushCanvas"]> = null;
    let corners: Point[] | null = null;
    const lineWidth = width || EditorOptions.outlineWidth;
    const odd = lineWidth % 2 != 0;
    transform = transform || new Transform();
    const quadrilateral = transform.mapQuadrilateral(rect);
    if (quadrilateral && quadrilateral.length) {
      corners = quadrilateral.map(function (point) {
        let x = Math.floor(point.getX());
        let y = Math.floor(point.getY());
        if (odd) {
          x += 0.5;
          y += 0.5;
        }
        return new Point(x, y);
      });
    }
    if (corners) {
      const canvas = () => context.canvas as NonNullable<EditorPaintContext["canvas"]>;
      if (this._alignment) {
        previous = context.pushCanvas(
          canvas().createCanvas(transform.mapRect(rect).expanded(2, 2, 2, 2)),
        );
      }
      canvas().putVertices(corners, true);
      const paint =
        color ||
        (this.hasFlag(BaseEditor.Flag.Highlighted)
          ? context.highlightOutlineColor
          : this._getOutlineColor(context, transform));
      const strokeWidth = this._alignment ? (odd ? 2 * lineWidth + 1 : 2 * lineWidth) : lineWidth;
      canvas().strokeVertices(paint as Color, strokeWidth);
      if (this._alignment) {
        if (this._alignment === OutlineAlignment.Outside) {
          canvas().fillVertices(
            RGBColor.BLACK,
            1,
            PaintCanvasClass.CompositeOperator.DestinationOut,
          );
        } else if (this._alignment === OutlineAlignment.Inside) {
          canvas().fillVertices(
            RGBColor.BLACK,
            1,
            PaintCanvasClass.CompositeOperator.DestinationIn,
          );
        }
        (previous as NonNullable<typeof previous>).drawCanvas(canvas());
        canvas().finish();
        context.popCanvas();
      }
    }
  }

  override toString(): string {
    return "[Object GBoxEditor]";
  }
}

Object.assign(BoxEditor.prototype, {
  _rotCornerDist: 0,
  _alignment: 0,
  _storedMoveData: null,
  _computedOutlineColor: null,
});
