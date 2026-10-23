// Old: chunk.vendor.js module 546 (GTransformBox).
/**
 * The transform box of the selection ("q" in the app): a quadrilateral
 * around the selection with resize handles, a movable rotation centre
 * (pivot), optional skew and rotate handles and zones (inside moves,
 * the outline skews, outside rotates). It is a vertex source of its four
 * corners, mapped by the box's own transform (`trf`, the drag preview)
 * and, while painting or hit testing, by the view transform.
 *
 * The scene editor owns it; calculateTransformation turns a drag of one
 * of its parts into the transform the selection previews.
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { uuid } from "../../engine/core/util.ts";
import { HitResult } from "../../engine/geometry/hit-result.ts";
import { VertexContainer } from "../../engine/geometry/vertex-container.ts";
import { VertexInfo } from "../../engine/geometry/vertex-info.ts";
import { VertexPixelAligner } from "../../engine/geometry/vertex-pixel-aligner.ts";
import type { VertexReader } from "../../engine/geometry/vertex-source.ts";
import { Vertex } from "../../engine/geometry/vertex.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect, type RectSide } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { PreserveAspectRatioAnnotation } from "../handles/preserve-aspect-ratio-annotation.ts";
import { RotateAnnotation } from "../handles/rotate-annotation.ts";
import { SkewHorizontalAnnotation } from "../handles/skew-horizontal-annotation.ts";
import { SkewVerticalAnnotation } from "../handles/skew-vertical-annotation.ts";
import { PartInfo, type BaseEditor, type EditorPaintContext } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";

const Handles = {
  TOP_LEFT: 0,
  TOP_CENTER: 1,
  TOP_RIGHT: 2,
  RIGHT_CENTER: 3,
  BOTTOM_RIGHT: 4,
  BOTTOM_CENTER: 5,
  BOTTOM_LEFT: 6,
  LEFT_CENTER: 7,
  ROTATION_CENTER: 8,
  SKEW_HORIZONTAL: 9,
  SKEW_VERTICAL: 10,
  ROTATE: 11,
} as const;

const HandlesToSide: readonly RectSide[] = [
  Rect.Side.TOP_LEFT,
  Rect.Side.TOP_CENTER,
  Rect.Side.TOP_RIGHT,
  Rect.Side.RIGHT_CENTER,
  Rect.Side.BOTTOM_RIGHT,
  Rect.Side.BOTTOM_CENTER,
  Rect.Side.BOTTOM_LEFT,
  Rect.Side.LEFT_CENTER,
];

const TBoxFlag = {
  Rotate: 1,
  Skew: 2,
  Resize: 4,
  Move: 8,
} as const;

/** PartInfo data of the OUTSIDE (rotation) zone. */
export interface RotationZoneData {
  rotationSegment: number;
  leftCenter: Point;
  rightCenter: Point;
}

/** Guides as calculateTransformation snaps with them. */
interface PointSnapper {
  mapPoint(point: Point): Point;
}

/** The scene the box belongs to: its workspace records the centre moves. */
interface TransformBoxSceneLike {
  getWorkspace(): {
    getTransactionRecorder(): {
      afterTBoxCenterTransform(
        scene: unknown,
        oldX: number,
        oldY: number,
        x: number,
        y: number,
      ): void;
    } | null;
  } | null;
}

export class TransformBox implements VertexReader {
  static TRANSFORM_MARGIN = 0;
  static Handles = Handles;
  static HandlesToSide = HandlesToSide;
  static OUTLINE = uuid();
  static INSIDE = uuid();
  static OUTSIDE = uuid();
  static FAR_OUTSIDE = uuid();
  static OUTSIDE_TOLERANCE = 100;
  static TBoxFlag = TBoxFlag;

  static isSkewing(id: unknown): boolean {
    return (
      id === TransformBox.OUTLINE || id === Handles.SKEW_HORIZONTAL || id === Handles.SKEW_VERTICAL
    );
  }

  static isRotating(id: unknown): boolean {
    return id === TransformBox.OUTSIDE || id === Handles.ROTATE;
  }

  declare tlx: number;
  declare tly: number;
  declare trx: number;
  declare try: number;
  declare brx: number;
  declare bry: number;
  declare blx: number;
  declare bly: number;
  declare cx: number;
  declare cy: number;
  /** The previewed transform of the box. */
  declare trf: Transform | null;
  /** The previewed move of the rotation centre. */
  declare cTrf: Transform | null;
  declare _tBoxFlags: number;
  declare _vertices: VertexContainer;
  declare _verticesDirty: boolean | undefined;
  declare _extTransform: Transform | null;
  declare _scene: unknown;
  /** Set by hide: only the rotation centre paints (during a drag). */
  declare _centerOnly: boolean | undefined;

  /**
   * A box around `rect`, rotating around (cx, cy) (the centre of the rect
   * when not given, or given as 0: the old code tested with ||).
   */
  constructor(
    rect: Rect,
    cx: number | null,
    cy: number | null,
    flags: number | null,
    scene: unknown,
  ) {
    const topLeft = rect.getSide(Rect.Side.TOP_LEFT);
    this.tlx = topLeft.getX();
    this.tly = topLeft.getY();
    const topRight = rect.getSide(Rect.Side.TOP_RIGHT);
    this.trx = topRight.getX();
    this.try = topRight.getY();
    const bottomRight = rect.getSide(Rect.Side.BOTTOM_RIGHT);
    this.brx = bottomRight.getX();
    this.bry = bottomRight.getY();
    const bottomLeft = rect.getSide(Rect.Side.BOTTOM_LEFT);
    this.blx = bottomLeft.getX();
    this.bly = bottomLeft.getY();
    this._vertices = new VertexContainer();
    this.cx = cx || (this.tlx + this.brx) / 2;
    this.cy = cy || (this.tly + this.bry) / 2;
    this._tBoxFlags = flags || TBoxFlag.Rotate | TBoxFlag.Skew | TBoxFlag.Move | TBoxFlag.Resize;
    this._scene = scene;
  }

  getTransform(): Transform | null {
    return this.trf;
  }

  setTransform(transform: Transform | null): void {
    this.trf = transform;
  }

  rewindVertices(index?: number): boolean {
    if (null == this._vertices || this._verticesDirty || 0 == this._vertices.getCount()) {
      this._vertices.clearVertices();
      this._generateVertices();
      this._verticesDirty = false;
    }
    return this._vertices.rewindVertices(index);
  }

  readVertex(vertex: Vertex): boolean {
    return this._vertices.readVertex(vertex);
  }

  hasVertexForRead(): boolean {
    return this._vertices.hasVertexForRead();
  }

  /**
   * The box over the corners, the pivot and the handles. The skew handles
   * count whenever the skew options exist, even when skewing is off (see
   * "Transform box bbox counts disabled skew handles" in QUESTIONS.md).
   */
  _calculateGeometryBBox(): Rect {
    const pivot = this._getPoint(Handles.ROTATION_CENTER) as Point;
    let minX = pivot.getX();
    let maxX = minX;
    let minY = pivot.getY();
    let maxY = minY;
    let handles: number[] = [
      Handles.TOP_LEFT,
      Handles.TOP_RIGHT,
      Handles.BOTTOM_RIGHT,
      Handles.BOTTOM_LEFT,
    ];
    if (EditorOptions.annotationHandles.tranformBox.skew) {
      handles = handles.concat([Handles.SKEW_HORIZONTAL, Handles.SKEW_VERTICAL]);
    }
    if (EditorOptions.annotationHandles.tranformBox.rotate) handles.push(Handles.ROTATE);
    for (let i = 0; i < handles.length; ++i) {
      const point = this._getPoint(handles[i] as number) as Point;
      if (minX > point.getX()) minX = point.getX();
      if (maxX < point.getX()) maxX = point.getX();
      if (minY > point.getY()) minY = point.getY();
      if (maxY < point.getY()) maxY = point.getY();
    }
    return new Rect(minX, minY, maxX - minX, maxY - minY);
  }

  _calculatePaintBBox(): Rect | null {
    let box: Rect | null = this._calculateGeometryBBox();
    if (box) {
      if (this._tBoxFlags & TBoxFlag.Resize) {
        const options = EditorOptions.annotationHandles.tranformBox;
        const margin = EditorAnnotation.getAnnotationPaintMargin(options.size);
        box = box.expanded(margin, margin, margin, margin);
      }
      return box;
    }
    return null;
  }

  /** Paints the box with `transform` (scene to view); `rotating` adds the dashed axis line. */
  paint(transform: Transform | null, context: EditorPaintContext, rotating?: boolean): void {
    const canvas = context.canvas as NonNullable<EditorPaintContext["canvas"]>;
    const canvasTransform = canvas.resetTransform() as Transform;
    this._extTransform = transform ? canvasTransform.multiplied(transform) : canvasTransform;
    this._verticesDirty = true;
    const options = EditorOptions.annotationHandles.tranformBox;
    if (!this._centerOnly) {
      if (!this.rewindVertices(0)) return;
      const aligned = new VertexPixelAligner(this);
      canvas.putVertices(aligned);
      canvas.strokeVertices(context.transformBoxOutlineColor, EditorOptions.outlineWidth);
      if (this._isSkewAnnotationEnabled() && this._tBoxFlags & TBoxFlag.Skew) {
        SkewHorizontalAnnotation.paintAnnotation(
          context,
          null,
          this._getPoint(Handles.SKEW_HORIZONTAL),
          0,
          context.transformBoxOutlineColor,
        );
        SkewVerticalAnnotation.paintAnnotation(
          context,
          null,
          this._getPoint(Handles.SKEW_VERTICAL),
          0,
          context.transformBoxOutlineColor,
        );
      }
      if (this._isRotateAnnotationEnabled() && this._tBoxFlags & TBoxFlag.Rotate) {
        const from = (this._getPoint(Handles.BOTTOM_CENTER) as Point).subtract(
          new Point(EditorOptions.outlineWidth / 2, EditorOptions.outlineWidth / 2),
        );
        const to = this._getPoint(Handles.ROTATE) as Point;
        canvas.strokeLine(
          from.getX(),
          from.getY(),
          to.getX(),
          to.getY(),
          EditorOptions.outlineWidth,
          context.transformBoxOutlineColor,
        );
        RotateAnnotation.paintAnnotation(
          context,
          null,
          this._getPoint(Handles.ROTATE),
          0,
          context.transformBoxOutlineColor,
        );
      }
      if (this._tBoxFlags & TBoxFlag.Resize) {
        const handles = this._collectResizeHandles(transform);
        for (let i = 0; i < handles.length; ++i) {
          const handle = handles[i] as number;
          const point = this._getPoint(handle);
          const side = HandlesToSide[handle];
          if (side && EditorOptions.isPreserveAspectRatioEnabledForSide(side)) {
            PreserveAspectRatioAnnotation.paintAnnotation(
              context,
              null,
              point,
              0,
              context.transformBoxOutlineColor,
            );
          } else {
            EditorAnnotation.paintAnnotation(
              context,
              null,
              point,
              options.resizeType,
              options.inverted,
              options.size,
              context.transformBoxOutlineColor,
              RGBColor.WHITE,
              options.outlineWidth,
              options.shadowColor,
              options.outsideStroke,
            );
          }
        }
      }
    }
    if (this._tBoxFlags & TBoxFlag.Rotate) {
      if (rotating) {
        const from = this._getPoint(Handles.LEFT_CENTER) as Point;
        const to = this._getPoint(Handles.RIGHT_CENTER) as Point;
        canvas.strokeLine(
          from.getX(),
          from.getY(),
          to.getX(),
          to.getY(),
          1,
          context.annotationColor,
          true,
        );
      }
      EditorAnnotation.paintAnnotation(
        context,
        null,
        this._getPoint(Handles.ROTATION_CENTER),
        options.pivotType,
        options.inverted,
        options.pivotSize || options.size,
        context.annotationColor,
        RGBColor.WHITE,
        options.pivotOutlineWidth,
        options.shadowColor,
        options.outsideStroke,
      );
    }
    canvas.setTransform(canvasTransform);
    this._extTransform = null;
  }

  hide(): void {
    this._centerOnly = true;
  }

  show(): void {
    this._centerOnly = false;
  }

  setCenterTransform(transform: Transform | null): void {
    this.cTrf = transform;
  }

  /**
   * The part of the box at view point `location` (`transform` maps scene
   * to view), owned by `editor`: a handle, the outline (skew; data is the
   * axis, 0 horizontal and 1 vertical), INSIDE (move), OUTSIDE (rotate,
   * up to OUTSIDE_TOLERANCE * 2 px away) or else FAR_OUTSIDE.
   */
  getPartInfoAt(
    location: Point,
    transform: Transform | null,
    tolerance: number,
    editor: BaseEditor,
  ): PartInfo {
    let hit: PartInfo | null = null;
    if (transform) {
      this._extTransform = transform;
      this._verticesDirty = true;
    }
    const options = EditorOptions.annotationHandles.tranformBox;
    const handles = this._collectResizeHandles(transform);
    if (this._tBoxFlags & TBoxFlag.Rotate) handles.push(Handles.ROTATION_CENTER);
    if (this._isSkewAnnotationEnabled() && this._tBoxFlags & TBoxFlag.Skew) {
      handles.push(Handles.SKEW_HORIZONTAL);
      handles.push(Handles.SKEW_VERTICAL);
    }
    const pick = EditorOptions.annotPickDistance;
    for (let i = 0; i < handles.length; ++i) {
      const point = this._getPoint(handles[i] as number);
      if (
        EditorAnnotation.getAnnotationBBox(null, point, options.size)
          .expanded(pick, pick, pick, pick)
          .containsPoint(location)
      ) {
        hit = new PartInfo(editor, handles[i], point, undefined, undefined);
        break;
      }
    }
    const result = new HitResult();
    if (
      !hit &&
      (this._tBoxFlags & TBoxFlag.Skew || this._tBoxFlags & TBoxFlag.Move) &&
      VertexInfo.hitTest(location.getX(), location.getY(), this, 2 * tolerance, true, result)
    ) {
      if (this._tBoxFlags & TBoxFlag.Skew && result.outline) {
        if (!this._isSkewAnnotationEnabled()) {
          const axis = (result.segment as number) % 2;
          hit = new PartInfo(editor, TransformBox.OUTLINE, axis, undefined, undefined);
        }
      } else if (this._tBoxFlags & TBoxFlag.Move) {
        hit = new PartInfo(editor, TransformBox.INSIDE, null, undefined, undefined);
      }
    }
    const rotationZone = (): PartInfo => {
      const segment = this.getRotationSegment(location, transform as Transform);
      const leftCenter = this._getPoint(Handles.LEFT_CENTER) as Point;
      const rightCenter = this._getPoint(Handles.RIGHT_CENTER) as Point;
      const data: RotationZoneData = { rotationSegment: segment, leftCenter, rightCenter };
      return new PartInfo(editor, TransformBox.OUTSIDE, data, undefined, undefined);
    };
    if (this._isRotateAnnotationEnabled() && this._tBoxFlags & TBoxFlag.Rotate) {
      const point = this._getPoint(Handles.ROTATE);
      if (
        EditorAnnotation.getAnnotationBBox(null, point, options.size)
          .expanded(pick, pick, pick, pick)
          .containsPoint(location)
      ) {
        hit = rotationZone();
      }
    }
    if (
      !hit &&
      !this._isRotateAnnotationEnabled() &&
      this._tBoxFlags & TBoxFlag.Rotate &&
      VertexInfo.hitTest(
        location.getX(),
        location.getY(),
        this,
        2 * TransformBox.OUTSIDE_TOLERANCE,
        true,
        result,
      )
    ) {
      hit = rotationZone();
    }
    if (!hit) hit = new PartInfo(editor, TransformBox.FAR_OUTSIDE, undefined, undefined, undefined);
    this._extTransform = null;
    return hit;
  }

  /** The cursor segment of `location` around the rotation centre. */
  getRotationSegment(location: Point, transform: Transform): number {
    const center = transform.mapPoint(new Point(this.cx, this.cy));
    return GMath.getRotationSegment(center, location);
  }

  /**
   * The transform a drag of `part` from `start` to `current` (scene
   * coordinates) builds: a resize for handles 0-7 (`fromCenter` with
   * option, `keepRatio` with shift), a translation of the pivot, a skew,
   * a move (snapping the nearest third of the box with `guides`) or a
   * rotation (constrained along the left-right axis with shift or snap
   * rotate; undefined when neither the axis is known nor
   * snapping is off). `transform` maps the axis points to the scene.
   */
  calculateTransformation(
    part: PartInfo,
    transform: Transform,
    start: Point,
    current: Point,
    guides: PointSnapper,
    fromCenter?: unknown,
    keepRatio?: unknown,
    step?: number | null,
  ): Transform | undefined {
    const delta = current.subtract(start);
    let dx = delta.getX();
    let dy = delta.getY();
    const snap = (x: number, y: number, snapX: boolean, snapY: boolean): void => {
      const mapped = guides.mapPoint(new Point(x + dx, y + dy));
      if (snapX) dx = mapped.getX() - x;
      if (snapY) dy = mapped.getY() - y;
    };
    const id = part.id as number;
    if (id < 8) {
      const sides = [
        Rect.Side.TOP_LEFT,
        Rect.Side.TOP_CENTER,
        Rect.Side.TOP_RIGHT,
        Rect.Side.RIGHT_CENTER,
        Rect.Side.BOTTOM_RIGHT,
        Rect.Side.BOTTOM_CENTER,
        Rect.Side.BOTTOM_LEFT,
        Rect.Side.LEFT_CENTER,
      ];
      const box = new Rect(this.tlx, this.tly, this.brx - this.tlx, this.bry - this.tly);
      const side = sides[id] as RectSide;
      const point = box.getSide(side);
      snap(point.getX(), point.getY(), true, true);
      if (EditorOptions.isPreserveAspectRatioEnabledForSide(side)) keepRatio = true;
      return Transform.getResizeTransform(
        box,
        side,
        dx,
        dy,
        keepRatio as boolean,
        fromCenter as boolean,
      );
    }
    if (id == Handles.ROTATION_CENTER) {
      snap(this.cx, this.cy, true, true);
      return new Transform(1, 0, 0, 1, dx, dy);
    }
    if (!TransformBox.isRotating(part.id)) {
      if (TransformBox.isSkewing(part.id)) {
        const toOrigin = new Transform(1, 0, 0, 1, -this.cx, -this.cy);
        const back = new Transform(1, 0, 0, 1, this.cx, this.cy);
        if (keepRatio && step) {
          const increment = step || 20;
          dx = Math.round(dx / increment) * increment;
          dy = Math.round(dy / increment) * increment;
        }
        const skew = new Transform(
          1,
          (2 * dy) / (this.brx - this.tlx),
          (2 * -dx) / (this.bry - this.tly),
          1,
          0,
          0,
        );
        return toOrigin.multiplied(skew).multiplied(back);
      }
      // A move snaps the corner, edge or centre of the third of the box
      // the drag started in.
      const third = (this.brx - this.tlx) / 3;
      const thirdHeight = (this.bry - this.tly) / 3;
      let anchorX = this.cx;
      let anchorY = this.cy;
      if (start.getX() <= this.tlx + third) anchorX = this.tlx;
      else if (start.getX() >= this.tlx + 2 * third) anchorX = this.brx;
      if (start.getY() <= this.tly + thirdHeight) anchorY = this.tly;
      else if (start.getY() >= this.tly + 2 * thirdHeight) anchorY = this.bry;
      snap(anchorX, anchorY, true, true);
      return new Transform(1, 0, 0, 1, dx, dy);
    }
    if (!keepRatio && !EditorOptions.snapRotate) {
      return Transform.getRotationTransform(
        start.getX(),
        start.getY(),
        current.getX(),
        current.getY(),
        this.cx,
        this.cy,
        !!(keepRatio || EditorOptions.snapRotate),
        keepRatio ? Math.PI / 12 : EditorOptions.snapRotate ? Math.PI / 180 : null,
        EditorOptions.snapRotate ? Math.PI / 45 : null,
      );
    }
    const data = part.data as RotationZoneData | null;
    if (data && data.leftCenter && data.rightCenter) {
      const left = transform.mapPoint(data.leftCenter);
      const right = transform.mapPoint(data.rightCenter);
      return Transform.getLineConstrainRotation(
        start.getX(),
        start.getY(),
        current.getX(),
        current.getY(),
        this.cx,
        this.cy,
        left.getX(),
        left.getY(),
        right.getX(),
        right.getY(),
        keepRatio ? Math.PI / 12 : EditorOptions.snapRotate ? Math.PI / 180 : null,
        EditorOptions.snapRotate ? Math.PI / 45 : null,
      );
    }
    return undefined;
  }

  /** Moves the pivot by the previewed transform and records the move for undo. */
  applyCenterTransform(): void {
    if (this.trf || this.cTrf) {
      const oldX = this.cx;
      const oldY = this.cy;
      const transform = (this.trf ? this.trf : this.cTrf) as Transform;
      this.applyCenterTransformAction(transform);
      const scene = this._scene as TransformBoxSceneLike;
      const workspace = scene.getWorkspace();
      const recorder = workspace ? workspace.getTransactionRecorder() : null;
      if (recorder) recorder.afterTBoxCenterTransform(this._scene, oldX, oldY, this.cx, this.cy);
    }
  }

  applyCenterTransformAction(transform: Transform | null): void {
    if (transform) {
      const center = transform.mapPoint(new Point(this.cx, this.cy));
      this.setCenter(center.getX(), center.getY());
      this.cTrf = null;
      this.trf = null;
    }
  }

  setCenter(x: number, y: number): void {
    const editor = ElementEditor.getEditor(this._scene);
    if (editor) editor.requestInvalidation();
    this.cx = x;
    this.cy = y;
    if (editor) editor.requestInvalidation();
  }

  _generateVertices(): void {
    if (this._vertices && 5 == this._vertices.getCount()) this._vertices.rewindVertices(0);
    else this._vertices = new VertexContainer();
    const topLeft = this._getPoint(Handles.TOP_LEFT) as Point;
    const topRight = this._getPoint(Handles.TOP_RIGHT) as Point;
    const bottomRight = this._getPoint(Handles.BOTTOM_RIGHT) as Point;
    const bottomLeft = this._getPoint(Handles.BOTTOM_LEFT) as Point;
    this._vertices.addVertex(Vertex.Command.Move, topLeft.getX(), topLeft.getY());
    this._vertices.addVertex(Vertex.Command.Line, topRight.getX(), topRight.getY());
    this._vertices.addVertex(Vertex.Command.Line, bottomRight.getX(), bottomRight.getY());
    this._vertices.addVertex(Vertex.Command.Line, bottomLeft.getX(), bottomLeft.getY());
    // Close without coordinates, as in the old code.
    this._vertices.addVertex(
      Vertex.Command.Close,
      undefined as unknown as number,
      undefined as unknown as number,
    );
  }

  /**
   * The point of `handle`, mapped by the box transform (unless
   * `noBoxTransform`; the pivot uses the centre preview instead) and the
   * view transform in use.
   */
  _getPoint(handle: number, noBoxTransform?: unknown): Point | null {
    let point: Point | null = null;
    const map = (source: Point, own?: Transform | null): Point => {
      const boxTransform = own || this.trf;
      let transform = this._extTransform;
      if (boxTransform && !noBoxTransform) {
        transform = transform ? boxTransform.multiplied(transform) : boxTransform;
      }
      if (transform && source) source = transform.mapPoint(source);
      return source;
    };
    const margin = TransformBox.TRANSFORM_MARGIN;
    const options = EditorOptions.annotationHandles.tranformBox;
    switch (handle) {
      case Handles.TOP_LEFT:
        point = map(new Point(this.tlx, this.tly));
        point = new Point(point.getX() - margin, point.getY() - margin);
        break;
      case Handles.TOP_CENTER:
        point = map(new Point((this.tlx + this.trx) / 2, (this.tly + this.try) / 2));
        point = new Point(point.getX(), point.getY() - margin);
        break;
      case Handles.TOP_RIGHT:
        point = map(new Point(this.trx, this.try));
        point = new Point(point.getX() + margin, point.getY() - margin);
        break;
      case Handles.RIGHT_CENTER:
        point = map(new Point((this.trx + this.brx) / 2, (this.try + this.bry) / 2));
        point = new Point(point.getX() + margin, point.getY());
        break;
      case Handles.BOTTOM_RIGHT:
        point = map(new Point(this.brx, this.bry));
        point = new Point(point.getX() + margin, point.getY() + margin);
        break;
      case Handles.BOTTOM_CENTER:
        point = map(new Point((this.blx + this.brx) / 2, (this.bly + this.bry) / 2));
        point = new Point(point.getX(), point.getY() + margin);
        break;
      case Handles.BOTTOM_LEFT:
        point = map(new Point(this.blx, this.bly));
        point = new Point(point.getX() - margin, point.getY() + margin);
        break;
      case Handles.LEFT_CENTER:
        point = map(new Point((this.tlx + this.blx) / 2, (this.tly + this.bly) / 2));
        point = new Point(point.getX() - margin, point.getY());
        break;
      case Handles.ROTATION_CENTER:
        point = map(new Point(this.cx, this.cy), this.cTrf);
        break;
      case Handles.SKEW_HORIZONTAL:
        point = map(new Point((this.tlx + this.trx) / 2, (this.tly + this.try) / 2));
        point = new Point(
          point.getX(),
          point.getY() - margin - options.skew.distance - options.skew.size,
        );
        break;
      case Handles.SKEW_VERTICAL:
        point = map(new Point((this.trx + this.brx) / 2, (this.try + this.bry) / 2));
        point = new Point(
          point.getX() + margin + options.skew.distance + options.skew.size,
          point.getY(),
        );
        break;
      case Handles.ROTATE:
        point = map(new Point((this.blx + this.brx) / 2, (this.bly + this.bry) / 2));
        point = new Point(
          point.getX(),
          point.getY() + margin + options.rotate.distance + options.rotate.size,
        );
    }
    return point;
  }

  /**
   * The resize handles that fit: corners when the box is more than two
   * handle margins high and wide, the side centres when more than three.
   */
  _collectResizeHandles(transform: Transform | null): number[] {
    let handles: number[] = [];
    if (this._tBoxFlags & TBoxFlag.Resize) {
      let box = new Rect(this.tlx, this.tly, this.brx - this.tlx, this.bry - this.tly);
      box = this.trf ? this.trf.mapRect(box) : box;
      const view = transform ? transform.mapRect(box) : box;
      const options = EditorOptions.annotationHandles.tranformBox;
      const margin = EditorAnnotation.getAnnotationPaintMargin(options.size);
      if (view.getHeight() > 2 * margin && view.getWidth() > 2 * margin) {
        handles = handles.concat([
          Handles.TOP_LEFT,
          Handles.TOP_RIGHT,
          Handles.BOTTOM_LEFT,
          Handles.BOTTOM_RIGHT,
        ]);
      }
      if (view.getHeight() > 3 * margin) {
        handles = handles.concat([Handles.RIGHT_CENTER, Handles.LEFT_CENTER]);
      }
      if (view.getWidth() > 3 * margin) {
        handles = handles.concat([Handles.TOP_CENTER, Handles.BOTTOM_CENTER]);
      }
    }
    return handles;
  }

  _isSkewAnnotationEnabled(): boolean {
    return !!(
      EditorOptions.annotationHandles.tranformBox.skew &&
      EditorOptions.annotationHandles.tranformBox.skew.enabled
    );
  }

  _isRotateAnnotationEnabled(): boolean {
    return !!(
      EditorOptions.annotationHandles.tranformBox.rotate &&
      EditorOptions.annotationHandles.tranformBox.rotate.enabled
    );
  }

  toString(): string {
    return "[GTransformBox]";
  }
}

Object.assign(TransformBox.prototype, {
  tlx: null,
  tly: null,
  trx: null,
  try: null,
  brx: null,
  bry: null,
  blx: null,
  bly: null,
  cx: null,
  cy: null,
  trf: null,
  cTrf: null,
  _tBoxFlags: 0,
  _vertices: null,
  _extTransform: null,
  _scene: null,
});
