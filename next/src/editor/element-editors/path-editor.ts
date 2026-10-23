// Old: chunk.vendor.js module 127 (GPathEditor).
/**
 * The editor of a path: its anchor points, their handles (hl/hr), the
 * corner shoulders (cl/cr) of styled corners and the segments between
 * points. The part selection holds point and segment part ids
 * ({type, point} / {type, apLeft, apRight}); the Selected flag of the
 * anchor points follows it.
 *
 * Edits preview on `_elementPreview`, a plain GPath that starts with only
 * the points the edit touches (_createPathPreviewIfNecessary) and grows to
 * the whole path (extendPreviewToFull); `_sourceIndexToPreviewIndex` maps
 * source point indices to preview indices. Applying copies the preview
 * points' properties back to the source points.
 *
 * A right-button drag (selectToolDragStartAction with `rightButton`) pulls
 * handles out of a point, opens corner shoulders, or bends a segment.
 */
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { VertexInfo } from "../../engine/geometry/vertex-info.ts";
import type { VertexReader } from "../../engine/geometry/vertex-source.ts";
import type { HitResult } from "../../engine/geometry/hit-result.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Paths } from "../../engine/scene/compound-path.ts";
import { GeometryChangeEvent } from "../../engine/scene/element.ts";
import { NodeChange, NodeFlag } from "../../engine/scene/node-change.ts";
import { Node } from "../../engine/scene/node.ts";
import { AnchorPoint, PathBase, type AnchorPoints } from "../../engine/scene/path-base.ts";
import { Path } from "../../engine/scene/path.ts";
import { SceneOptions } from "../../engine/scene/scene-options.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import { BorderAlignment } from "../../engine/style/stylable-sets.ts";
import { Cursor } from "../cursor.ts";
import { Editor } from "../editor.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { BaseEditor, PartInfo, type EditorPaintContext } from "./base-editor.ts";
import { BoxEditor } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { PathBaseEditor, type EditedPathBase } from "./path-base-editor.ts";

/** A path as its editor drives it. */
export type EditedPath = EditedPathBase & Path;

const PartType = {
  Segment: 1,
  Point: 2,
  LeftHandle: 3,
  RightHandle: 4,
  LeftShoulder: 5,
  RightShoulder: 6,
} as const;

const SegmentData = {
  HitRes: 1,
  Handles: 2,
} as const;

const PointsSelectionType = {
  No: "N",
  First: "F",
  Last: "L",
  Middle: "M",
  Several: "S",
} as const;

/**
 * A part id of the path editor. `type` is one of PartType, except for the
 * ids the segment drag builds at slope ~0/1 (see "Segment drag at slope
 * 0 or 1" in BUGS-FIXED candidates), whose type is undefined.
 */
export interface PathPartId {
  type: number | undefined;
  point: AnchorPoint | null;
  apLeft?: AnchorPoint | null;
  apRight?: AnchorPoint | null;
}

/** The data of a segment part: the hit (HitRes) or the handles a bend moves (Handles). */
export interface SegmentPartData {
  type: number;
  hitRes: HitResult;
  rightButton?: { isolated: boolean; selectable: boolean };
  cL?: number;
  cR?: number;
  apLhr?: Point;
  apRhl?: Point;
}

/** What _iteratePoints passes per anchor point (view or scene coordinates). */
export interface PathPointInfo {
  type: unknown;
  anchorPoint: AnchorPoint;
  position: Point;
  annotation: string;
  leftHandlePosition: Point | null;
  rightHandlePosition: Point | null;
  leftShoulderPosition: Point | null;
  rightShoulderPosition: Point | null;
}

/** GEditor's static convertToConstrain (editor-core). */
interface ConstrainEditor {
  convertToConstrain(x: number, y: number, px: number, py: number, angle: number): Point;
}

/** The hidden symbol master search of isDeletePartsAllowed / deletePartsSelected. */
interface SymbolLike extends Node {
  isMaster(): boolean;
  _getMasterSibling(id: string, ownMap?: boolean, nested?: boolean): Node | null;
}

/** Handle options read from GEditorOptions that may carry an optional colour. */
interface ColoredHandle {
  type: string;
  size: number;
  color?: unknown;
  outlineWidth?: number;
}

type PointCallback = (info: PathPointInfo) => unknown;

function pointOf(point: AnchorPoint): Point {
  return new Point(point.getProperty("x") as number, point.getProperty("y") as number);
}

const MIRROR = AnchorPoint.Type.Mirror;

export class PathEditor<E extends EditedPath = EditedPath> extends PathBaseEditor<E> {
  static {
    registerClass(this, "GPathEditor");
    ElementEditor.exports(this, Path);
  }

  static PartType = PartType;
  static SegmentData = SegmentData;
  static PointsSelectionType = PointsSelectionType;

  declare _sourceIndexToPreviewIndex: Record<number, number> | null;
  /** The constrain line (start, constrained point) of a Shift handle drag, in view coordinates. */
  declare _constrainPair: [Point, Point] | null;
  declare _constrainPainted: boolean;
  declare _activeExtedingMode: unknown;
  declare _partSelection: PathPartId[] | null;

  constructor(element: E) {
    super(element);
    this._flags = this.filterFlags(this._flags);
    const selected = element.getAnchorPoints().queryAll(":selected");
    for (let i = 0; i < selected.length; ++i) {
      if (!this._partSelection) this._partSelection = [];
      this._partSelection.push({ type: PartType.Point, point: selected[i] as AnchorPoint });
    }
  }

  getActiveExtendingMode(): unknown {
    return this._activeExtedingMode;
  }

  setActiveExtendingMode(mode: unknown): void {
    this._activeExtedingMode = mode;
  }

  override getPointPreview(point: Node): AnchorPoint | null {
    return this.getPathPointPreview(point as AnchorPoint);
  }

  override getBBox(transform: Transform): Rect | null {
    let box = super.getBBox(transform);
    const add = function (rect: Rect | null) {
      if (rect && !rect.isEmpty()) box = box ? box.united(rect) : rect;
    };
    const handles = EditorOptions.annotationHandles.path;
    if (this._constrainPair) {
      add(
        EditorAnnotation.getAnnotationBBox(
          null,
          this._constrainPair[0],
          handles.constrain.size,
          true,
        ),
      );
    }
    if (this._showAnnotations() && !this.hasFlag(BoxEditor.Flag.ResizeAll)) {
      if (this._transform) transform = this._transform.multiplied(transform);
      this._iteratePoints(true, (info) => {
        if (info.leftHandlePosition) {
          add(
            EditorAnnotation.getAnnotationBBox(
              transform,
              info.leftHandlePosition,
              handles.control.size,
              true,
            ),
          );
        }
        if (info.rightHandlePosition) {
          add(
            EditorAnnotation.getAnnotationBBox(
              transform,
              info.rightHandlePosition,
              handles.control.size,
              true,
            ),
          );
        }
        if (info.leftShoulderPosition) {
          add(
            EditorAnnotation.getAnnotationBBox(
              transform,
              info.leftShoulderPosition,
              handles.corner.size,
              true,
            ),
          );
        }
        if (info.rightShoulderPosition) {
          add(
            EditorAnnotation.getAnnotationBBox(
              transform,
              info.rightShoulderPosition,
              handles.corner.size,
              true,
            ),
          );
        }
        add(EditorAnnotation.getAnnotationBBox(transform, info.position, handles.node.size, true));
      });
    } else if (!(
      this.hasFlag(BaseEditor.Flag.HideEditor) ||
      this.hasFlag(BaseEditor.Flag.Outline) ||
      (this.hasFlag(BoxEditor.Flag.ResizeAll) && this.hasFlag(BaseEditor.Flag.Selected))
    )) {
      this._iteratePoints(true, (info) => {
        if (info.anchorPoint.hasFlag(NodeFlag.Highlighted)) {
          add(
            EditorAnnotation.getAnnotationBBox(transform, info.position, handles.node.size, true),
          );
        }
      });
    }
    return box;
  }

  override getElementSelectionBBox(): Rect | null {
    let box: Rect | null = null;
    if (this._partSelection && this._partSelection.length) {
      for (let i = 0; i < this._partSelection.length; ++i) {
        const part = this._partSelection[i] as PathPartId;
        if (part.type == PartType.Point) {
          const coord = this.getPointCoord(part.point as AnchorPoint);
          if (coord) {
            const rect = new Rect(coord.getX(), coord.getY(), 0, 0);
            box = box ? box.united(rect) : rect;
          }
        } else if (part.type == PartType.Segment) {
          let coord = this.getPointCoord(part.apLeft as AnchorPoint);
          if (coord) {
            const rect = new Rect(coord.getX(), coord.getY(), 0, 0);
            box = box ? box.united(rect) : rect;
          }
          coord = this.getPointCoord(part.apRight as AnchorPoint);
          if (coord) {
            const rect = new Rect(coord.getX(), coord.getY(), 0, 0);
            box = (box as Rect).united(rect);
          }
        }
      }
    }
    if (!box) box = this._element.getGeometryBBox();
    return box;
  }

  override setFlag(flag: number, noInvalidation?: unknown): void {
    super.setFlag(this.filterFlags(flag), noInvalidation);
    if (this.hasFlag(BoxEditor.Flag.ResizeAll)) this._handleFinishDrawing();
  }

  override removeFlag(flag: number, noInvalidation?: unknown): void {
    super.removeFlag(flag, noInvalidation);
    if (!(flag !== BaseEditor.Flag.Selected || this._element.hasFlag(NodeFlag.Selected))) {
      this._handleFinishDrawing();
    }
  }

  /** A straight line in simple line mode has no resize box and no rotation handle. */
  filterFlags(flags: number): number {
    if (this._element.isLine() && EditorOptions.simpleLineMode) {
      if (0 != (flags & BoxEditor.Flag.ResizeAll)) flags &= ~BoxEditor.Flag.ResizeAll;
      if (0 != (flags & BoxEditor.Flag.RotateHandle)) flags &= ~BoxEditor.Flag.RotateHandle;
    }
    return flags;
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
    let result: unknown = null;
    if (
      partId === BoxEditor.RESIZE_HANDLE_PART_ID ||
      partId === BoxEditor.ROTATION_HANDLE_PART_ID
    ) {
      result = super.movePart(partId, partData, position, viewToWorld, guides, shift, option);
    } else {
      const part = partId as PathPartId;
      this.requestInvalidation();
      this._createPathPreviewIfNecessary(part.point);
      this.extendPreviewToFull();
      switch (part.type) {
        case PartType.LeftHandle:
          result = this._movePreviewPointCoordinates(
            part.point as AnchorPoint,
            "hlx",
            "hly",
            position,
            viewToWorld,
            shift,
            guides,
          );
          break;
        case PartType.RightHandle:
          result = this._movePreviewPointCoordinates(
            part.point as AnchorPoint,
            "hrx",
            "hry",
            position,
            viewToWorld,
            shift,
            guides,
          );
          break;
        case PartType.LeftShoulder:
        case PartType.RightShoulder: {
          const location = viewToWorld.mapPoint(position);
          result = this._movePreviewPointShoulders(part, location, shift);
          break;
        }
        case PartType.Segment: {
          const data = partData as SegmentPartData;
          if (data.type == SegmentData.Handles) {
            // The old code read both previews here without using them; the
            // reads still request a repaint.
            this.getPathPointPreview(part.apLeft);
            this.getPathPointPreview(part.apRight);
            const location = viewToWorld.mapPoint(position);
            let hit = new Point(data.hitRes.x as number, data.hitRes.y as number);
            const own = this._element.getTransform();
            if (own) hit = own.mapPoint(hit);
            const delta = location.subtract(hit);
            let move = new Transform().translated(
              delta.getX() * (data.cL as number),
              delta.getY() * (data.cL as number),
            );
            this._transformPreviewPointCoordinates(
              part.apLeft as AnchorPoint,
              "hrx",
              "hry",
              move,
              data.apLhr,
            );
            // The old code nudged the right handle by 0.01 (see "Segment
            // bend moves the right handle 0.01 further" in QUESTIONS.md).
            move = new Transform().translated(
              delta.getX() * (data.cR as number) + 0.01,
              delta.getY() * (data.cR as number) + 0.01,
            );
            this._transformPreviewPointCoordinates(
              part.apRight as AnchorPoint,
              "hlx",
              "hly",
              move,
              data.apRhl,
            );
          }
        }
      }
      this.requestInvalidation();
    }
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override resetPartMove(partId: unknown, partData: unknown): void {
    this.releasePathPreview();
    this.requestInvalidation();
  }

  override _applyPartMove(
    partId: unknown,
    partData: unknown,
    option?: unknown,
    extra?: unknown,
  ): void {
    if (
      partId === BoxEditor.RESIZE_HANDLE_PART_ID ||
      partId === BoxEditor.ROTATION_HANDLE_PART_ID
    ) {
      super._applyPartMove(partId, partData, option, extra);
    } else {
      const part = partId as PathPartId;
      switch (part.type) {
        case PartType.LeftHandle:
          this._assignPreviewPointPropertiesToSourcePoint(part.point as AnchorPoint, [
            "hlx",
            "hly",
            "ah",
            "tp",
          ]);
          break;
        case PartType.RightHandle:
          this._assignPreviewPointPropertiesToSourcePoint(part.point as AnchorPoint, [
            "hrx",
            "hry",
            "ah",
            "tp",
          ]);
          break;
        case PartType.LeftShoulder:
        case PartType.RightShoulder:
          this._assignPreviewPointPropertiesToSourcePoint(part.point as AnchorPoint, ["cl", "cr"]);
          break;
        case PartType.Segment:
          this._element._beginBlockEvents([GeometryChangeEvent]);
          this._element.beginUpdate();
          this._element.getAnchorPoints()._beginBlockCompositeEvents(false, true, false);
          this._assignPreviewPointPropertiesToSourcePoint(part.apLeft as AnchorPoint, [
            "hrx",
            "hry",
            "ah",
            "tp",
          ]);
          this._element._endBlockEvents([GeometryChangeEvent]);
          this._element.getAnchorPoints()._endBlockCompositeEvents(false, true, false);
          this._assignPreviewPointPropertiesToSourcePoint(part.apRight as AnchorPoint, [
            "hlx",
            "hly",
            "ah",
            "tp",
          ]);
          this._element.endUpdate();
      }
    }
    this.resetPartMove(partId, partData);
  }

  /**
   * With selected parts (and no resize box) a transform moves the
   * selected points (and their handles unless auto) on the preview;
   * otherwise the whole path is transformed.
   */
  override edTransform(
    transform: Transform,
    partId?: unknown,
    partData?: unknown,
    options?: unknown,
  ): void {
    if (
      this._partSelection &&
      this._partSelection.length > 0 &&
      !this.hasFlag(BoxEditor.Flag.ResizeAll)
    ) {
      this.requestInvalidation();
      this.extendPreviewToFull();
      const movePoint = (point: AnchorPoint) => {
        this._transformPreviewPointCoordinates(point, "x", "y", transform);
        if (!point.getProperty("ah")) {
          if (null != point.getProperty("hlx") && null != point.getProperty("hly")) {
            this._transformPreviewPointCoordinates(point, "hlx", "hly", transform);
          }
          if (null != point.getProperty("hrx") && null != point.getProperty("hry")) {
            this._transformPreviewPointCoordinates(point, "hrx", "hry", transform);
          }
        }
      };
      for (let i = 0; i < this._partSelection.length; ++i) {
        const part = this._partSelection[i] as PathPartId;
        if (part.type === PartType.Point) movePoint(part.point as AnchorPoint);
        else if (
          part.type === PartType.Segment &&
          partId &&
          this._partIdAreEqual(part, partId) &&
          (partData as SegmentPartData).type == SegmentData.HitRes
        ) {
          movePoint(part.apLeft as AnchorPoint);
          movePoint(part.apRight as AnchorPoint);
        }
      }
      this.requestInvalidation();
    } else super.edTransform(transform, partId, partData, options);
  }

  override resetTransform(): void {
    this.releasePathPreview();
    this._constrainPair = null;
    super.resetTransform();
  }

  override canApplyTransform(): unknown {
    return (
      (this._partSelection &&
        this._partSelection.length > 0 &&
        !this.hasFlag(BoxEditor.Flag.ResizeAll)) ||
      (this._transform && !this._transform.isIdentity() && this._transform.invertible()) ||
      (this._elementPreview &&
        (this._elementPreview.getTransform() as Transform).invertible() &&
        !(this._elementPreview.getTransform() as Transform).isIdentity()) ||
      super.canApplyTransform()
    );
  }

  override _applyTransform(target: unknown, ...rest: unknown[]): void {
    if (
      this._partSelection &&
      this._partSelection.length > 0 &&
      !this.hasFlag(BoxEditor.Flag.ResizeAll)
    ) {
      const path = target as EditedPath;
      path._beginBlockEvents([GeometryChangeEvent]);
      path.beginUpdate();
      path.getAnchorPoints()._beginBlockCompositeEvents(false, true, false);
      const selection: PathPartId[] = [];
      for (let i = 0; i < this._partSelection.length; ++i) {
        const part = this._partSelection[i] as PathPartId;
        const last = i == this._partSelection.length - 1;
        if (part.type === PartType.Point) {
          if (last) {
            path._endBlockEvents([GeometryChangeEvent]);
            path.getAnchorPoints()._endBlockCompositeEvents(false, true, false);
          }
          this._transferPreviewProperties(part.point as AnchorPoint, path);
          selection.push(part);
        } else if (part.type === PartType.Segment) {
          const left = part.apLeft as AnchorPoint;
          const right = part.apRight as AnchorPoint;
          this._transferPreviewProperties(left, path);
          if (last) {
            path._endBlockEvents([GeometryChangeEvent]);
            path.getAnchorPoints()._endBlockCompositeEvents(false, true, false);
          }
          this._transferPreviewProperties(right, path);
          if (
            (left.getParent() as AnchorPoints).getPreviousPoint(left) ||
            (right.getParent() as AnchorPoints).getNextPoint(right)
          ) {
            selection.push({ type: PartType.Point, point: left });
            selection.push({ type: PartType.Point, point: right });
          }
        }
      }
      path.endUpdate();
      this.requestInvalidation();
      this.resetTransform();
      this.updatePartSelection(false, selection);
    } else super._applyTransform(target, ...rest);
    this._constrainPair = null;
  }

  override selectToolDragStartAction(part: PartInfo, rightButton?: unknown): PartInfo | null {
    if (part.editor !== this) return null;
    this._constrainPair = null;
    let result: PartInfo | null = part;
    let isolated = part.isolated;
    let selectable = part.selectable;
    const id = part.id as PathPartId;
    if (part.isolated || id.type != PartType.Point) {
      if (id.type != PartType.Segment || rightButton) {
        if (id.type == PartType.Segment) {
          const data = part.data as SegmentPartData;
          (result as PartInfo).isolated = (data.rightButton as { isolated: boolean }).isolated;
          (result as PartInfo).selectable = (
            data.rightButton as { selectable: boolean }
          ).selectable;
        }
      } else {
        const hit = (part.data as SegmentPartData).hitRes;
        const left = id.apLeft as AnchorPoint;
        const right = id.apRight as AnchorPoint;
        if (left && right) {
          this.requestInvalidation();
          this.extendPreviewToFull();
          const leftPreview = this.getPathPointPreview(left);
          const rightPreview = this.getPathPointPreview(right);
          if (leftPreview && rightPreview) {
            if (GMath.isEqualEps(hit.slope as number, 0, 0.001)) {
              // The old code used a hoisted `var` here that is never set on
              // this path, so the part type is undefined (see "Segment drag
              // at slope 0 or 1" in BUGS-FIXED candidates).
              result = new PartInfo(
                this,
                { type: undefined, point: left },
                { apSelected: false },
                false,
                true,
              );
            } else if (GMath.isEqualEps(hit.slope as number, 1, 0.001)) {
              result = new PartInfo(
                this,
                { type: undefined, point: right },
                { apSelected: false },
                false,
                true,
              );
            } else {
              let leftX: number;
              let leftY: number;
              let rightX: number;
              let rightY: number;
              const x1 = left.getProperty("x") as number;
              const y1 = left.getProperty("y") as number;
              const x2 = right.getProperty("x") as number;
              const y2 = right.getProperty("y") as number;
              let usedHit = hit;
              const rehit = () => {
                const again = (this._elementPreview as E).pathHitTest(
                  new Point(hit.x as number, hit.y as number),
                  null,
                  false,
                );
                if (
                  again &&
                  again.data &&
                  !GMath.isEqualEps(again.data.slope as number, 0, 0.001) &&
                  !GMath.isEqualEps(again.data.slope as number, 1, 0.001)
                ) {
                  usedHit = again.data;
                }
              };
              if (
                (null !== left.getProperty("hrx") && null !== left.getProperty("hry")) ||
                (null !== right.getProperty("hlx") && null !== right.getProperty("hly"))
              ) {
                if (null === left.getProperty("hrx") || null === left.getProperty("hry")) {
                  const hx = rightPreview.getProperty("hlx") as number;
                  const hy = rightPreview.getProperty("hly") as number;
                  leftX = x1 + (2 / 3) * (hx - x1);
                  leftY = y1 + (2 / 3) * (hy - y1);
                  rightX = x2 + (2 / 3) * (hx - x2);
                  rightY = y2 + (2 / 3) * (hy - y2);
                  leftPreview.setProperties(["ah", "hrx", "hry"], [false, leftX, leftY]);
                  rightPreview.setProperties(["ah", "hlx", "hly"], [false, rightX, rightY]);
                  this.requestInvalidation();
                  rehit();
                } else if (null === right.getProperty("hlx") || null === right.getProperty("hly")) {
                  const hx = leftPreview.getProperty("hrx") as number;
                  const hy = leftPreview.getProperty("hry") as number;
                  rightX = x2 + (2 / 3) * (hx - x2);
                  rightY = y2 + (2 / 3) * (hy - y2);
                  leftX = x1 + (2 / 3) * (hx - x1);
                  leftY = y1 + (2 / 3) * (hy - y1);
                  leftPreview.setProperties(["ah", "hrx", "hry"], [false, leftX, leftY]);
                  rightPreview.setProperties(["ah", "hlx", "hly"], [false, rightX, rightY]);
                  this.requestInvalidation();
                  rehit();
                } else {
                  leftPreview.setProperty("ah", false);
                  rightPreview.setProperty("ah", false);
                  this.requestInvalidation();
                  leftX = leftPreview.getProperty("hrx") as number;
                  leftY = leftPreview.getProperty("hry") as number;
                  rightX = rightPreview.getProperty("hlx") as number;
                  rightY = rightPreview.getProperty("hly") as number;
                }
              } else {
                // A straight segment: handles a third of the way, shifted by the hit position.
                const thirdX = (x2 - x1) / 3;
                const thirdY = (y2 - y1) / 3;
                const beforeX = thirdX * (hit.slope as number);
                const afterX = thirdX - beforeX;
                const beforeY = thirdY * (hit.slope as number);
                const afterY = thirdY - beforeY;
                leftX = (hit.x as number) - beforeX;
                leftY = (hit.y as number) - beforeY;
                leftPreview.setProperties(
                  ["ah", "hrx", "hry"],
                  [false, (hit.x as number) - beforeX, (hit.y as number) - beforeY],
                );
                rightX = (hit.x as number) + afterX;
                rightY = (hit.y as number) + afterY;
                rightPreview.setProperties(
                  ["ah", "hlx", "hly"],
                  [false, (hit.x as number) + afterX, (hit.y as number) + afterY],
                );
                this.requestInvalidation();
                rehit();
              }
              const t = usedHit.slope as number;
              const b1 = 3 * (1 - t) * (1 - t) * t;
              const b2 = 3 * t * t * (1 - t);
              result = new PartInfo(
                this,
                { type: PartType.Segment, point: null, apLeft: left, apRight: right },
                {
                  type: SegmentData.Handles,
                  cL: 1 / (b1 + b2),
                  apLhr: new Point(leftX, leftY),
                  cR: 1 / (b1 + b2),
                  apRhl: new Point(rightX, rightY),
                  hitRes: usedHit,
                },
                isolated,
                selectable,
              );
            }
          } else result = null;
        } else result = null;
      }
    } else {
      const point = id.point as AnchorPoint;
      let type: number = PartType.Point;
      const pointType = point.getProperty("tp");
      if (!point.hasFlag(NodeFlag.Selected)) this.selectOnePoint(point);
      if (
        rightButton &&
        PathBase.isCornerType(pointType) &&
        null != this._element.getAnchorPoints().getPreviousPoint(point) &&
        null != this._element.getAnchorPoints().getNextPoint(point)
      ) {
        let left = point.getProperty("cl") as number | null;
        let right = point.getProperty("cr") as number | null;
        const minimum =
          EditorOptions.annotationHandles.path.corner.size + EditorOptions.annotPickDistance;
        if (null == right || right < 2 * minimum) type = PartType.RightShoulder;
        else if (null == left || left < 2 * minimum) type = PartType.LeftShoulder;
        if (type != PartType.Point) {
          left = null != left ? left : minimum;
          right = null != right ? right : minimum;
          this.requestInvalidation();
          this._createPathPreviewIfNecessary(point);
          this.extendPreviewToFull();
          const preview = this.getPathPointPreview(point);
          if (preview) {
            preview.setProperties(["cl", "cr"], [left, right]);
            isolated = true;
            selectable = false;
            result = new PartInfo(this, { type: type, point: point }, null, isolated, selectable);
          } else result = null;
        }
      } else if (rightButton) {
        if (PathBase.isCornerType(pointType)) {
          result = new PartInfo(
            this,
            { type: PartType.Point, point: point },
            { apSelected: true },
            isolated,
            selectable,
          );
        } else {
          this.requestInvalidation();
          this._createPathPreviewIfNecessary(point);
          this.extendPreviewToFull();
          const preview = this.getPathPointPreview(point);
          if (preview) {
            let handle: number;
            isolated = true;
            selectable = false;
            if (Platform.modifiers.optionKey) {
              const hrx = point.getProperty("hrx");
              const hry = point.getProperty("hry");
              if (null === hrx || null === hry) {
                handle = PartType.RightHandle;
                preview.setProperties(
                  ["ah", "hrx", "hry"],
                  [false, point.getProperty("x"), point.getProperty("y")],
                );
              } else {
                handle = PartType.LeftHandle;
                preview.setProperties(
                  ["ah", "hlx", "hly"],
                  [false, point.getProperty("x"), point.getProperty("y")],
                );
              }
              result = new PartInfo(
                this,
                { type: handle, point: point },
                { apSelected: true },
                isolated,
                selectable,
              );
              this.updatePartSelection(true, [result.id]);
            } else {
              const x = point.getProperty("x");
              const y = point.getProperty("y");
              if (pointType != AnchorPoint.Type.Connector) {
                handle = PartType.RightHandle;
                preview.setProperties(
                  ["tp", "ah", "hrx", "hry", "hlx", "hly"],
                  [MIRROR, false, x, y, x, y],
                );
              } else {
                const previous = point.getPrevious() as AnchorPoint | null;
                if (previous && !PathBase.isCornerType(previous.getProperty("tp"))) {
                  handle = PartType.LeftHandle;
                  preview.setProperties(["ah", "hlx", "hly"], [false, x, y]);
                } else {
                  handle = PartType.RightHandle;
                  preview.setProperties(["ah", "hrx", "hry"], [false, x, y]);
                }
              }
              result = new PartInfo(
                this,
                { type: handle, point: point },
                { apSelected: true },
                isolated,
                selectable,
              );
            }
          } else result = null;
        }
      }
    }
    return result;
  }

  override getCursor(partId: unknown, partData?: unknown): unknown {
    return (partId as PathPartId).type == PartType.Segment
      ? Cursor.SelectCurve
      : super.getCursor(partId, partData);
  }

  override canHandleDblClick(): boolean {
    return true;
  }

  /** In detail mode a double click on a point toggles it between asymmetric and symmetric. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override handleDblClick(partId: unknown, transform?: unknown): boolean {
    const part = partId as PathPartId | null;
    if (
      EditorOptions.toggleAnchorPointType &&
      part &&
      part.type == PartType.Point &&
      this.hasFlag(BaseEditor.Flag.Detail)
    ) {
      const point = part.point as AnchorPoint;
      if (point.getProperty("tp") === AnchorPoint.Type.Asymmetric) {
        point.setProperties(["tp", "ah"], [AnchorPoint.Type.Symmetric, true]);
      } else point.setProperties(["tp", "ah"], [AnchorPoint.Type.Asymmetric, false]);
      return true;
    }
    return false;
  }

  override _attach(): void {
    const scene = this._element.getScene() as unknown as EventHost | null;
    if (null != scene) scene.addEventListener(GeometryChangeEvent, this._geometryChange, this);
    (this._element as unknown as EventHost).addEventListener(
      Node.AfterInsertEvent,
      this._afterInsert,
      this,
    );
  }

  override _detach(): void {
    this.requestInvalidation();
    for (
      let point: Node | null = this._element.getAnchorPoints().getFirstChild();
      null != point;
      point = point.getNext()
    ) {
      point.removeFlag(NodeFlag.Selected);
      point.removeFlag(NodeFlag.Highlighted);
    }
    this.requestInvalidation();
    const scene = this._element.getScene() as unknown as EventHost | null;
    if (null != scene) scene.removeEventListener(GeometryChangeEvent, this._geometryChange, this);
    (this._element as unknown as EventHost).removeEventListener(
      Node.AfterInsertEvent,
      this._afterInsert,
      this,
    );
    super._detach();
  }

  /** Whether `location` (view) hits anchor point `point` with `transform` and `tolerance`. */
  hitAnchorPoint(
    point: AnchorPoint | null,
    location: Point,
    transform: Transform | null,
    tolerance: number,
  ): boolean {
    if (point) {
      let matrix = this._element.getTransform();
      if (transform) matrix = matrix ? matrix.multiplied(transform) : transform;
      return EditorAnnotation.getAnnotationBBox(
        matrix,
        pointOf(point),
        EditorOptions.annotationHandles.path.node.size,
      )
        .expanded(tolerance, tolerance, tolerance, tolerance)
        .containsPoint(location);
    }
    return false;
  }

  /** The scene position of a point of the element or of the preview. */
  getPointCoord(point: AnchorPoint): Point | null {
    let coord: Point | null = null;
    if (
      point.getPath() == this._element ||
      (this._elementPreview && point.getPath() == this._elementPreview)
    ) {
      let path: E = this._element;
      if (this._elementPreview && point.getPath() == this._elementPreview)
        path = this._elementPreview;
      coord = pointOf(point);
      const own = path.getTransform();
      if (own) coord = own.mapPoint(coord);
    }
    return coord;
  }

  override getPathBasePreview(): PathBase {
    this.extendPreviewToFull();
    return this._elementPreview as unknown as PathBase;
  }

  override _getPartInfoAt(
    location: Point,
    transform: Transform,
    tolerance: number,
  ): PartInfo | null {
    if (this._showAnnotations() && !this.hasFlag(BoxEditor.Flag.ResizeAll)) {
      const hits = (position: Point | null, size: number) => {
        const pick = EditorOptions.annotPickDistance;
        return (
          !!position &&
          EditorAnnotation.getAnnotationBBox(transform, position, size)
            .expanded(pick, pick, pick, pick)
            .containsPoint(location)
        );
      };
      const handles = EditorOptions.annotationHandles.path;
      let found: PartInfo | null = null;
      this._iteratePoints(false, (info) => {
        let type: number | null = null;
        let isolated = true;
        let selectable = false;
        if (hits(info.position, handles.node.size)) {
          type = PartType.Point;
          isolated = false;
          selectable = true;
        } else if (hits(info.rightHandlePosition, handles.control.size))
          type = PartType.RightHandle;
        else if (hits(info.leftHandlePosition, handles.control.size)) type = PartType.LeftHandle;
        else if (hits(info.rightShoulderPosition, handles.corner.size))
          type = PartType.RightShoulder;
        else if (hits(info.leftShoulderPosition, handles.corner.size)) type = PartType.LeftShoulder;
        if (type) {
          found = new PartInfo(
            this,
            { type: type, point: info.anchorPoint },
            { apSelected: info.anchorPoint.hasFlag(NodeFlag.Selected) },
            isolated,
            selectable,
          );
          return true;
        }
        return undefined;
      });
      if (found) return found;
      const hit = this._element.pathHitTest(location, transform, false, EditorOptions.pickDistance);
      if (
        hit &&
        !GMath.isEqualEps(hit.data.slope as number, 0) &&
        !GMath.isEqualEps(hit.data.slope as number, 1)
      ) {
        const data = hit.data;
        const left = this._element
          .getAnchorPoints()
          .getChildByIndex((data.segment as number) - 1) as AnchorPoint | null;
        const right = left ? this._element.getAnchorPoints().getNextPoint(left) : null;
        return new PartInfo(
          this,
          { type: PartType.Segment, point: null, apLeft: left, apRight: right },
          {
            type: SegmentData.HitRes,
            hitRes: data,
            rightButton: { isolated: false, selectable: true },
          },
          true,
          false,
        );
      }
    }
    const hit = super._getPartInfoAt(location, transform, tolerance);
    return hit &&
      ((hit.id !== BoxEditor.RESIZE_HANDLE_PART_ID &&
        hit.id !== BoxEditor.ROTATION_HANDLE_PART_ID) ||
        this.hasFlag(BoxEditor.Flag.ResizeAll))
      ? hit
      : null;
  }

  override _postPaint(transform: Transform, context: EditorPaintContext): void {
    super._postPaint(transform, context);
    const canvas = context.canvas as NonNullable<EditorPaintContext["canvas"]>;
    if (this._constrainPair && !this._constrainPainted) {
      const options = EditorOptions.annotationHandles.path.constrain;
      canvas.strokeLine(
        this._constrainPair[0].getX(),
        this._constrainPair[0].getY(),
        this._constrainPair[1].getX(),
        this._constrainPair[1].getY(),
        2 * EditorOptions.outlineWidth,
        context.highlightOutlineColor,
        false,
      );
      EditorAnnotation.paintAnnotation(
        context,
        null,
        this._constrainPair[0],
        options.type,
        false,
        options.size,
        RGBColor.WHITE,
        context.highlightOutlineColor,
      );
      this._constrainPainted = true;
    }
    if (this._showAnnotations() && !this.hasFlag(BoxEditor.Flag.ResizeAll)) {
      this._iteratePoints(true, (info) => {
        if (info.leftHandlePosition)
          this._paintControlHandle(transform, context, info.position, info.leftHandlePosition);
        if (info.rightHandlePosition)
          this._paintControlHandle(transform, context, info.position, info.rightHandlePosition);
        if (info.leftShoulderPosition || info.rightShoulderPosition) {
          const corner = EditorOptions.annotationHandles.path.corner;
          if (info.leftShoulderPosition) {
            EditorAnnotation.paintAnnotation(
              context,
              transform,
              info.leftShoulderPosition,
              corner.type,
              false,
              corner.size,
              RGBColor.WHITE,
              context.annotationColor,
            );
          }
          if (info.rightShoulderPosition) {
            EditorAnnotation.paintAnnotation(
              context,
              transform,
              info.rightShoulderPosition,
              corner.type,
              false,
              corner.size,
              RGBColor.WHITE,
              context.annotationColor,
            );
          }
        }
        const node = EditorOptions.annotationHandles.path.node as unknown as ColoredHandle;
        const color = node.color || context.selectionOutlineColor;
        EditorAnnotation.paintAnnotation(
          context,
          transform,
          info.position,
          info.annotation,
          info.anchorPoint.hasFlag(NodeFlag.Selected),
          node.size,
          color,
          RGBColor.WHITE,
          node.outlineWidth,
        );
        if (info.anchorPoint.hasFlag(NodeFlag.Highlighted)) {
          EditorAnnotation.paintAnnotation(
            context,
            transform,
            info.position,
            info.annotation,
            true,
            node.size,
            context.highlightOutlineColor,
            RGBColor.WHITE,
            node.outlineWidth,
          );
        }
      });
    } else if (!(
      this.hasFlag(BaseEditor.Flag.HideEditor) ||
      this.hasFlag(BaseEditor.Flag.Outline) ||
      !this._element.hasFlag(NodeFlag.Highlighted) ||
      (this.hasFlag(BoxEditor.Flag.ResizeAll) && this.hasFlag(BaseEditor.Flag.Selected))
    )) {
      this._iteratePoints(true, (info) => {
        if (info.anchorPoint.hasFlag(NodeFlag.Highlighted)) {
          const node = EditorOptions.annotationHandles.path.node;
          EditorAnnotation.paintAnnotation(
            context,
            transform,
            info.position,
            info.annotation,
            true,
            node.size,
            context.highlightOutlineColor,
            RGBColor.WHITE,
          );
        }
      });
    }
  }

  override _partIdAreEqual(a: unknown, b: unknown): boolean {
    const first = a as PathPartId;
    const second = b as PathPartId;
    let equal = first.type === second.type;
    if (equal && first.type == PartType.Point) equal = first.point === second.point;
    else if (equal && first.type == PartType.Segment) {
      equal = first.apLeft === second.apLeft && first.apRight == second.apRight;
    }
    return equal;
  }

  /** Keeps the Selected flag of the anchor points in step with the part selection. */
  override _updatePartSelection(selection: unknown[] | null): void {
    if (!this.hasFlag(BoxEditor.Flag.ResizeAll)) {
      this.requestInvalidation();
      const filtered = this._filterSelection(selection as PathPartId[] | null);
      const previous = this._partSelection;
      this._partSelection = filtered;
      if (previous) {
        for (let i = 0; i < previous.length; ++i) {
          const part = previous[i] as PathPartId;
          let kept = false;
          if (filtered) {
            for (let j = 0; j < filtered.length; ++j) {
              const other = filtered[j] as PathPartId;
              if (
                (other.point === part.point && part.point) ||
                (part.type == PartType.Segment &&
                  part.type == other.type &&
                  part.apLeft == other.apLeft &&
                  part.apRight == other.apRight)
              ) {
                kept = true;
                break;
              }
            }
          }
          if (!kept) {
            if (part.point) part.point.removeFlag(NodeFlag.Selected);
            else if (part.type == PartType.Segment) {
              (part.apLeft as AnchorPoint).removeFlag(NodeFlag.Selected);
              (part.apRight as AnchorPoint).removeFlag(NodeFlag.Selected);
            }
          }
        }
      }
      if (filtered) {
        for (let i = 0; i < filtered.length; ++i) {
          const part = filtered[i] as PathPartId;
          if (part.point) part.point.setFlag(NodeFlag.Selected);
          else if (part.type == PartType.Segment) {
            (part.apLeft as AnchorPoint).setFlag(NodeFlag.Selected);
            (part.apRight as AnchorPoint).setFlag(NodeFlag.Selected);
          }
        }
      }
      this.requestInvalidation();
    }
  }

  _paintControlHandle(
    transform: Transform | null,
    context: EditorPaintContext,
    position: Point,
    handle: Point,
  ): void {
    let from = position;
    let to = handle;
    if (transform) {
      from = transform.mapPoint(position);
      to = transform.mapPoint(handle);
    }
    const options = EditorOptions.annotationHandles.path.control as unknown as ColoredHandle;
    const color = (options.color ||
      context.selectionOutlineColor) as typeof context.selectionOutlineColor;
    (context.canvas as NonNullable<EditorPaintContext["canvas"]>).strokeLine(
      from.getX(),
      from.getY(),
      to.getX(),
      to.getY(),
      EditorOptions.outlineWidth,
      color,
    );
    EditorAnnotation.paintAnnotation(
      context,
      transform,
      handle,
      options.type,
      false,
      options.size,
      color,
      color,
    );
  }

  /**
   * Calls `visitor` per anchor point of the preview (`usePreview`) or the
   * element with its position, node annotation type and the handles and
   * shoulders that show (handles next to selected points, shoulders of
   * selected corner points), in scene coordinates; true stops.
   */
  _iteratePoints(usePreview: boolean, visitor: PointCallback): void {
    const path = usePreview ? this.getPaintElement() : this._element;
    const points = path.getAnchorPoints();
    const own = path.getTransform();
    const Type = AnchorPoint.Type;
    const node = EditorOptions.annotationHandles.path.node;
    for (
      let point = points.getFirstChild();
      null != point;
      point = point.getNext() as AnchorPoint | null
    ) {
      const previous = points.getPreviousPoint(point);
      const next = points.getNextPoint(point);
      const type = point.getProperty("tp");
      const info: PathPointInfo = {
        type: type,
        anchorPoint: point,
        position: pointOf(point),
        annotation: node.straightType,
        leftHandlePosition: null,
        rightHandlePosition: null,
        leftShoulderPosition: null,
        rightShoulderPosition: null,
      };
      const smooth =
        type === Type.Asymmetric ||
        type === Type.Symmetric ||
        type === Type.Mirror ||
        type === Type.Connector;
      if (smooth) {
        info.annotation = node.smoothType;
        if (true === point.getProperty("ah")) info.annotation = node.autoType;
      }
      let handle: Point | null;
      if (point.hasFlag(NodeFlag.Selected) || (previous && previous.hasFlag(NodeFlag.Selected))) {
        handle = new Point(point.getProperty("hlx") as number, point.getProperty("hly") as number);
        if (null !== handle.getX() && null !== handle.getY()) info.leftHandlePosition = handle;
      }
      if (point.hasFlag(NodeFlag.Selected) || (next && next.hasFlag(NodeFlag.Selected))) {
        handle = new Point(point.getProperty("hrx") as number, point.getProperty("hry") as number);
        if (null !== handle.getX() && null !== handle.getY()) info.rightHandlePosition = handle;
      }
      if (point.hasFlag(NodeFlag.Selected) && !smooth) {
        if (point.getProperty("cl") && previous) {
          handle = point.getLeftShoulderPoint(true);
          if (handle && null !== handle.getX() && null !== handle.getY())
            info.leftShoulderPosition = handle;
        }
        if (point.getProperty("cr") && next) {
          handle = point.getRightShoulderPoint(true);
          if (handle && null !== handle.getX() && null !== handle.getY())
            info.rightShoulderPosition = handle;
        }
      }
      if (own) {
        const position = own.mapPoint(info.position);
        if (info.leftHandlePosition)
          info.leftHandlePosition = own.mapPoint(info.leftHandlePosition);
        if (info.rightHandlePosition)
          info.rightHandlePosition = own.mapPoint(info.rightHandlePosition);
        if (info.leftShoulderPosition)
          info.leftShoulderPosition = point.getLeftShoulderPointTransformed(own, true);
        if (info.rightShoulderPosition)
          info.rightShoulderPosition = point.getRightShoulderPointTransformed(own, true);
        info.position = position;
      }
      if (true === visitor(info)) break;
    }
  }

  override createElementPreview(): void {
    this.getPathPreview(true);
  }

  /** The full preview path; without `full` it starts from the points around `point` first. */
  getPathPreview(full?: unknown, point?: AnchorPoint | null): E | null {
    this.requestInvalidation();
    if (!full) this._createPathPreviewIfNecessary(point);
    this.extendPreviewToFull();
    this.requestInvalidation();
    return this._elementPreview;
  }

  getPath(): E {
    return this._element;
  }

  getPointsSelectionType(): string {
    let type: string = PointsSelectionType.No;
    if (this._partSelection && !this.hasFlag(BoxEditor.Flag.ResizeAll)) {
      if (this._partSelection.length > 1) type = PointsSelectionType.Several;
      else {
        const first = this._partSelection[0] as PathPartId;
        if (first.point && first.point.hasFlag(NodeFlag.Selected)) {
          const point = first.point;
          type =
            point === this._element.getAnchorPoints().getLastChild()
              ? PointsSelectionType.Last
              : point === this._element.getAnchorPoints().getFirstChild()
                ? PointsSelectionType.First
                : PointsSelectionType.Middle;
        }
      }
    }
    return type;
  }

  selectOnePoint(point: AnchorPoint): void {
    this.updatePartSelection(false, [{ type: PartType.Point, point: point }]);
  }

  override isPartSelectionUnderCollisionAllowed(): boolean {
    return true;
  }

  /**
   * Selects (or with `highlight` highlights) the points inside `area` (a
   * vertex source in scene coordinates); `toggle` toggles them. Selects or
   * highlights the path itself when points were found.
   */
  override updatePartSelectionUnderCollision(
    toggle: unknown,
    area?: unknown,
    highlight?: unknown,
  ): boolean {
    const points = this._element.getAnchorPoints();
    const own = this._element.getTransform();
    const inside: PathPartId[] = [];
    const highlightOn: PathPartId[] = [];
    const highlightOff: PathPartId[] = [];
    this.requestInvalidation();
    for (
      let point = points.getFirstChild();
      null != point;
      point = point.getNext() as AnchorPoint | null
    ) {
      if (!highlight && point.hasFlag(NodeFlag.Highlighted)) point.removeFlag(NodeFlag.Highlighted);
      let position = pointOf(point);
      position = own ? own.mapPoint(position) : position;
      if (VertexInfo.hitTest(position.getX(), position.getY(), area as VertexReader, 0, true)) {
        if (highlight) {
          if (!(
            point.hasFlag(NodeFlag.Highlighted) ||
            (toggle && point.hasFlag(NodeFlag.Selected))
          )) {
            highlightOn.push({ type: PartType.Point, point: point });
          } else if (
            point.hasFlag(NodeFlag.Highlighted) &&
            toggle &&
            point.hasFlag(NodeFlag.Selected)
          ) {
            highlightOff.push({ type: PartType.Point, point: point });
          }
        } else inside.push({ type: PartType.Point, point: point });
      } else if (highlight) {
        if (!point.hasFlag(NodeFlag.Highlighted) && toggle && point.hasFlag(NodeFlag.Selected)) {
          highlightOn.push({ type: PartType.Point, point: point });
        } else if (
          (point.hasFlag(NodeFlag.Highlighted) && !toggle) ||
          !point.hasFlag(NodeFlag.Selected)
        ) {
          highlightOff.push({ type: PartType.Point, point: point });
        }
      }
    }
    if (!((!inside.length && !highlightOn.length) || this._element.hasFlag(NodeFlag.Selected))) {
      if (highlight) {
        if (!this._element.hasFlag(NodeFlag.Highlighted))
          this._element.setFlag(NodeFlag.Highlighted);
      } else this._element.setFlag(NodeFlag.Selected);
    }
    if (highlight) {
      for (let i = 0; i < highlightOn.length; ++i) {
        const part = highlightOn[i] as PathPartId;
        if (!(
          part.type != PartType.Point || (part.point as AnchorPoint).hasFlag(NodeFlag.Highlighted)
        )) {
          (part.point as AnchorPoint).setFlag(NodeFlag.Highlighted);
        }
      }
      for (let i = 0; i < highlightOff.length; ++i) {
        const part = highlightOff[i] as PathPartId;
        if (
          part.type == PartType.Point &&
          (part.point as AnchorPoint).hasFlag(NodeFlag.Highlighted)
        ) {
          (part.point as AnchorPoint).removeFlag(NodeFlag.Highlighted);
        }
      }
      this.requestInvalidation();
    } else {
      if (this._element.hasFlag(NodeFlag.Highlighted))
        this._element.removeFlag(NodeFlag.Highlighted);
      this.updatePartSelection(toggle, inside);
    }
    return (this._partSelection && this._partSelection.length) as unknown as boolean;
  }

  /** Inside a symbol instance, a point that comes from the master can't be deleted. */
  _canDeletePart(point: AnchorPoint, symbol: SymbolLike | null): boolean {
    if (symbol) {
      const master = symbol._getMasterSibling(point.getMultireferenceId(), false, true);
      if (master && master !== point) return false;
    }
    return true;
  }

  /** The nearest symbol instance (not master) above the path, or null. */
  _instanceSymbol(): SymbolLike | null {
    let parent = this._element.getParent() as SymbolLike | null;
    while (parent && ("symbol" !== Node.getName(parent) || parent.isMaster())) {
      parent = parent.getParent() as SymbolLike | null;
    }
    return parent;
  }

  /** Deleting is allowed while at least one point would stay. */
  override isDeletePartsAllowed(): boolean {
    let allowed = false;
    if (
      this._partSelection &&
      this._partSelection.length &&
      !this.hasFlag(BoxEditor.Flag.ResizeAll)
    ) {
      let deletable = 0;
      const symbol = this._instanceSymbol();
      for (let i = 0; i < this._partSelection.length; ++i) {
        const part = this._partSelection[i] as PathPartId;
        if (part.type == PartType.Point && this._canDeletePart(part.point as AnchorPoint, symbol))
          ++deletable;
      }
      let count = 0;
      for (
        let point: Node | null = this._element.getAnchorPoints().getFirstChild();
        null != point;
        point = point.getNext(), ++count
      );
      if (count > deletable) allowed = true;
    }
    return allowed;
  }

  override deletePartsSelected(): void {
    if (this._partSelection && !this.hasFlag(BoxEditor.Flag.ResizeAll)) {
      const points = this._element.getAnchorPoints();
      const symbol = this._instanceSymbol();
      for (let i = 0; i < this._partSelection.length; ++i) {
        const part = this._partSelection[i] as PathPartId;
        if (part.type == PartType.Point) {
          const point = part.point as AnchorPoint;
          const parent = point.getParent();
          if (parent && parent === points && this._canDeletePart(point, symbol))
            points.removeChild(point);
        }
      }
      this._partSelection = null;
    }
  }

  override isAlignPartsAllowed(): boolean {
    let allowed = false;
    if (
      this._partSelection &&
      this._partSelection.length &&
      !this.hasFlag(BoxEditor.Flag.ResizeAll)
    ) {
      for (let i = 0; i < this._partSelection.length && !allowed; ++i) {
        if ((this._partSelection[i] as PathPartId).type == PartType.Point) allowed = true;
      }
    }
    return allowed;
  }

  /** Moves the selected points to scene x (and/or y); null keeps the coordinate. */
  override alignParts(alignment: unknown, x?: unknown, y?: unknown): void {
    if (
      this._partSelection &&
      this._partSelection.length &&
      !this.hasFlag(BoxEditor.Flag.ResizeAll)
    ) {
      const own = this._element.getTransform();
      this.requestInvalidation();
      this._element._beginBlockEvents([GeometryChangeEvent]);
      this._element.getAnchorPoints()._beginBlockCompositeEvents(false, true, false);
      for (let i = 0; i < this._partSelection.length; ++i) {
        if (i == this._partSelection.length - 1) {
          this._element.getAnchorPoints()._endBlockCompositeEvents(false, true, false);
          this._element._endBlockEvents([GeometryChangeEvent]);
        }
        const part = this._partSelection[i] as PathPartId;
        if (part.type === PartType.Point) {
          const point = part.point as AnchorPoint;
          let position = pointOf(point);
          if (own) position = own.mapPoint(position);
          const target = new Point(
            null !== x ? (x as number) : position.getX(),
            null !== y ? (y as number) : position.getY(),
          );
          this.movePoint(point, target);
        }
      }
    }
  }

  /** A sub-path of a compound path can't change the selection. */
  override validateSelectionChange(): boolean {
    const parent = this._element.getParent();
    return !(parent && parent instanceof Paths);
  }

  hasAllPointsSelected(): boolean {
    let all = true;
    this._element.getAnchorPoints().acceptChildren(
      function (point) {
        if (!point.hasFlag(NodeFlag.Selected)) all = false;
        return true;
      },
      false,
      true,
    );
    return all;
  }

  /** Adds `delta` to the preview indices from `start` up to (not including) `end`. */
  shiftPreviewTable(delta: number, start?: number | null, end?: number | null): void {
    const table = this._sourceIndexToPreviewIndex as Record<number, number>;
    start = null != start ? start : 0;
    end = null != end ? end : (table as unknown as unknown[]).length - 1;
    for (let i = start; i < end; ++i) table[i] = (table[i] as number) + delta;
  }

  /** Adds the source points the preview doesn't hold yet, before and after the ones it does. */
  extendPreviewToFull(): void {
    this._createPathPreviewIfNecessary();
    const table = this._sourceIndexToPreviewIndex as Record<number, number>;
    const points = this._element.getAnchorPoints();
    const previewPoints = (this._elementPreview as E).getAnchorPoints();
    const firstPreview = previewPoints.getFirstChild();
    let source = points.getFirstChild() as AnchorPoint | null;
    let index = 0;
    let mapped = null != table[index];
    let previewIndex = mapped ? (table[index] as number) : 0;
    previewPoints._beginBlockChanges([NodeChange.BeforeChildInsert, NodeChange.AfterChildInsert]);
    try {
      while (!mapped && source) {
        const copy = new AnchorPoint();
        copy.transferProperties(source, [AnchorPoint.GeometryProperties]);
        if (source.hasFlag(NodeFlag.Selected)) copy.setFlag(NodeFlag.Selected);
        previewPoints.insertChild(copy, firstPreview);
        table[index] = previewIndex;
        source = source.getNext() as AnchorPoint | null;
        ++index;
        ++previewIndex;
        mapped = null != table[index];
      }
      const inserted = index - 0;
      while (mapped && source) {
        table[index] = (table[index] as number) + inserted;
        previewIndex = table[index] as number;
        source = source.getNext() as AnchorPoint | null;
        ++index;
        mapped = null != table[index];
      }
      for (++previewIndex; !mapped && source;) {
        const copy = new AnchorPoint();
        copy.transferProperties(source, [AnchorPoint.GeometryProperties]);
        if (source.hasFlag(NodeFlag.Selected)) copy.setFlag(NodeFlag.Selected);
        previewPoints.appendChild(copy);
        table[index] = previewIndex;
        source = source.getNext() as AnchorPoint | null;
        ++index;
        ++previewIndex;
        mapped = null != table[index];
      }
    } finally {
      previewPoints._endBlockChanges([NodeChange.BeforeChildInsert, NodeChange.AfterChildInsert]);
    }
    (this._elementPreview as E).transferProperties(this._element, [
      Shape.GeometryProperties,
      Path.GeometryProperties,
    ]);
  }

  /**
   * The constrained view position for dragging a handle of `point` to
   * `position` (Shift): GEditor.convertToConstrain around the point.
   * Remembers the pair to paint the constrain line.
   */
  constrainPosition(position: Point, worldToView: Transform, point: AnchorPoint): Point {
    let origin = pointOf(point);
    let matrix = this._element.getTransform();
    matrix = matrix ? matrix.multiplied(worldToView) : worldToView;
    origin = matrix.mapPoint(origin);
    const constrained = (Editor as unknown as ConstrainEditor).convertToConstrain(
      origin.getX(),
      origin.getY(),
      position.getX(),
      position.getY(),
      EditorOptions.cursorConstraint,
    );
    this._constrainPair = [origin, constrained];
    this._constrainPainted = false;
    return constrained;
  }

  /**
   * Creates the preview with only the run of points an edit of `point`
   * (or of the selected points) touches: from the first to the last
   * related point around them. Auto-handle ends extend it to the full path.
   */
  _createPathPreviewIfNecessary(point?: AnchorPoint | null): E | null {
    if (!this._elementPreview) {
      this._sourceIndexToPreviewIndex = {};
      this._setElementPreview(new Path() as unknown as E);
      const preview = this._elementPreview as unknown as E;
      preview.transferProperties(this._element, [
        Shape.GeometryProperties,
        Path.GeometryProperties,
        PathBase.MetaProperties,
      ]);
      const touched = (candidate: AnchorPoint) =>
        (point && candidate === point) || (!point && candidate.hasFlag(NodeFlag.Selected));
      const points = this._element.getAnchorPoints();
      const previewPoints = preview.getAnchorPoints();
      let first: AnchorPoint | null = null;
      let last: AnchorPoint | null = null;
      let candidate: AnchorPoint | null;
      for (
        candidate = points.getFirstChild() as AnchorPoint | null;
        !(null == candidate || (first && last));
        candidate = candidate.getNext() as AnchorPoint | null
      ) {
        const previous = points.getPreviousPoint(candidate);
        const next = points.getNextPoint(candidate);
        let related: AnchorPoint;
        if (!first) {
          if (!previous && touched(candidate)) first = candidate;
          else if (!touched(candidate) && next && touched(next)) {
            related = points.getFirstRelatedPoint(next);
            const beforeRelated = points.getPreviousPoint(related);
            if (!(touched(related) || (beforeRelated && touched(beforeRelated)))) first = related;
          }
        }
        if (!last) {
          if (!next && touched(candidate)) last = candidate;
          else if (!touched(candidate) && previous && touched(previous)) {
            related = points.getLastRelatedPoint(previous);
            const afterRelated = points.getNextPoint(related);
            if (!(touched(related) || (afterRelated && touched(afterRelated)))) last = related;
          }
        }
      }
      if ((first && !last) || (!first && last) || (first && last && first === last)) {
        first = null;
        last = null;
      }
      if (first && last) {
        let contiguous = true;
        for (
          candidate = points.getNextPoint(last);
          candidate && candidate != first && contiguous;
          candidate = points.getNextPoint(candidate)
        ) {
          if (touched(candidate)) {
            contiguous = false;
            first = null;
            last = null;
          }
        }
      }
      let done = false;
      first = first || (points.getFirstChild() as AnchorPoint);
      candidate = first;
      previewPoints._beginBlockChanges([NodeChange.BeforeChildInsert, NodeChange.AfterChildInsert]);
      try {
        while (!done) {
          const copy = new AnchorPoint();
          copy.transferProperties(candidate as AnchorPoint, [AnchorPoint.GeometryProperties]);
          if (touched(candidate as AnchorPoint)) copy.setFlag(NodeFlag.Selected);
          previewPoints.appendChild(copy);
          const sourceIndex = points.getIndexOfChild(candidate as AnchorPoint);
          const previewIndex = previewPoints.getIndexOfChild(copy);
          this._sourceIndexToPreviewIndex[sourceIndex] = previewIndex;
          if (candidate == last) done = true;
          if (!((candidate = points.getNextPoint(candidate)) && candidate != first)) done = true;
        }
      } finally {
        previewPoints._endBlockChanges([NodeChange.BeforeChildInsert, NodeChange.AfterChildInsert]);
      }
      preview.transferProperties(this._element, [
        Shape.GeometryProperties,
        Path.GeometryProperties,
        PathBase.MetaProperties,
      ]);
      if (first.getProperty("ah") || (last && last.getProperty("ah"))) this.extendPreviewToFull();
      else if (preview.getProperty("closed") && last) preview.setProperty("closed", false);
    }
    return this._elementPreview;
  }

  releasePathPreview(): void {
    this._setElementPreview(null);
    this._sourceIndexToPreviewIndex = null;
    this._constrainPair = null;
  }

  /** The preview copy of source point `point` (extending the preview when it lacks it). */
  getPathPointPreview(point: AnchorPoint | null | undefined): AnchorPoint | null {
    if (!point) return null;
    const parent = point.getParent() as AnchorPoints | null;
    if (!parent) {
      console.warn("GPathEditor.getPathPointPreview: requested preview for non bound point");
      return null;
    }
    const index = parent.getIndexOfChild(point);
    if (!(this._sourceIndexToPreviewIndex && null != this._sourceIndexToPreviewIndex[index])) {
      this.extendPreviewToFull();
    }
    this.requestInvalidation();
    const previewIndex = (this._sourceIndexToPreviewIndex as Record<number, number>)[
      index
    ] as number;
    return (this._elementPreview as E)
      .getAnchorPoints()
      .getChildByIndex(previewIndex) as AnchorPoint | null;
  }

  /** The element's transform followed by `transform`. */
  getTransformFromNative(transform?: Transform | null): Transform {
    let matrix = this._element.getTransform();
    if (transform) matrix = matrix ? matrix.multiplied(transform) : transform;
    if (!matrix) matrix = new Transform();
    return matrix;
  }

  /**
   * Moves `point` to `position` (scene, or view with `transform`), its
   * handles along unless auto (`source` gives the handles to move).
   */
  movePoint(
    point: AnchorPoint,
    position: Point,
    transform?: Transform | null,
    source?: AnchorPoint | null,
  ): void {
    const matrix = this.getTransformFromNative(transform);
    const inverse = matrix.inverted() as Transform;
    const local = inverse.mapPoint(position);
    if (point.getProperty("ah")) point.setProperties(["x", "y"], [local.getX(), local.getY()]);
    else {
      const from = source || point;
      let hlx = from.getProperty("hlx") as number | null;
      let hly = from.getProperty("hly") as number | null;
      let hrx = from.getProperty("hrx") as number | null;
      let hry = from.getProperty("hry") as number | null;
      if ((null != hlx && null != hly) || (null != hrx && null != hry)) {
        const current = matrix.mapPoint(pointOf(from));
        const dx = position.getX() - current.getX();
        const dy = position.getY() - current.getY();
        let moved: Point;
        if (null != hlx && null != hly) {
          moved = inverse.mapPoint(matrix.mapPoint(new Point(hlx, hly)).translated(dx, dy));
          hlx = moved.getX();
          hly = moved.getY();
        }
        if (null != hrx && null != hry) {
          moved = inverse.mapPoint(matrix.mapPoint(new Point(hrx, hry)).translated(dx, dy));
          hrx = moved.getX();
          hry = moved.getY();
        }
      }
      point.setProperties(
        ["x", "y", "hlx", "hly", "hrx", "hry"],
        [local.getX(), local.getY(), hlx, hly, hrx, hry],
      );
    }
  }

  override getPartSelection(): unknown[] | null {
    return this.hasFlag(BoxEditor.Flag.ResizeAll) ? null : this._partSelection;
  }

  /**
   * Moves the preview's `xName`/`yName` coordinates of `point` (a handle)
   * so they sit under `position` (view; Shift constrains). Returns the
   * scene translation applied.
   */
  _movePreviewPointCoordinates(
    point: AnchorPoint,
    xName: string,
    yName: string,
    position: Point,
    viewToWorld: Transform,
    shift?: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
    guides?: unknown,
  ): Transform {
    let target = position;
    if (shift) {
      const worldToView = viewToWorld.inverted() as Transform;
      target = this.constrainPosition(position, worldToView, point);
    }
    target = viewToWorld.mapPoint(target);
    const own = this._element.getTransform();
    let current = new Point(point.getProperty(xName) as number, point.getProperty(yName) as number);
    if (own) current = own.mapPoint(current);
    const move = new Transform(
      1,
      0,
      0,
      1,
      target.getX() - current.getX(),
      target.getY() - current.getY(),
    );
    this._transformPreviewPointCoordinates(point, xName, yName, move);
    return move;
  }

  /**
   * Sets the preview's `xName`/`yName` of `point` to the source values (or
   * `start`) mapped by the scene transform `transform`. Moving a handle
   * turns auto handles off.
   */
  _transformPreviewPointCoordinates(
    point: AnchorPoint,
    xName: string,
    yName: string,
    transform: Transform,
    start?: Point | null,
  ): void {
    const own = this._element.getTransform();
    const preview = this.getPathPointPreview(point);
    if (preview) {
      let from: Point;
      if (start) from = start;
      else from = new Point(point.getProperty(xName) as number, point.getProperty(yName) as number);
      let local = transform;
      if (own) {
        local = transform.multiplied(own.inverted() as Transform);
        local = own.multiplied(local);
      }
      const moved = local.mapPoint(from);
      const names = [xName, yName];
      const values: unknown[] = [moved.getX(), moved.getY()];
      if ("hlx" === xName || "hrx" === xName || "hly" === yName || "hry" === yName) {
        names.push("ah");
        values.push(false);
      }
      preview.setProperties(names, values);
    }
  }

  /**
   * Drags a corner shoulder to `location` (scene): the shoulder length is
   * the distance of the projection onto the segment. With `shift` both
   * shoulders change (in detail mode the other one shrinks by what this
   * one grows). Returns a translation by the change.
   */
  _movePreviewPointShoulders(part: PathPartId, location: Point, shift?: unknown): Transform {
    const point = part.point as AnchorPoint;
    const own = this._element.getTransform();
    let origin = pointOf(point);
    if (own) origin = own.mapPoint(origin);
    const limit = (
      part.type == PartType.LeftShoulder
        ? point.getLeftShoulderLimitPoint(own)
        : point.getRightShoulderLimitPoint(own)
    ) as Point;
    const projection = GMath.getVectorProjection(
      origin.getX(),
      origin.getY(),
      limit.getX(),
      limit.getY(),
      location.getX(),
      location.getY(),
      true,
    );
    const length = GMath.ptDist(projection.getX(), projection.getY(), origin.getX(), origin.getY());
    const preview = this.getPathPointPreview(point) as AnchorPoint;
    // Declared at function level like the old `var`s: the Shift branch
    // outside detail mode reads them unset (NaN translation).
    let left: number | undefined;
    let right: number | undefined;
    if (shift) {
      if (this.hasFlag(BaseEditor.Flag.Detail) && 1 != preview.getProperty("cu")) {
        const cl = point.getProperty("cl") as number | null;
        left = null != cl ? cl : 0;
        const cr = point.getProperty("cr") as number | null;
        // The old code read `cl` here when `cr` is set (see
        // "_movePreviewPointShoulders reads cl for cr" in BUGS-FIXED candidates).
        right = null != cr ? left : 0;
        if (part.type == PartType.LeftShoulder) {
          const grow = length - left;
          let other = right - grow;
          other = other > 0 ? other : 0;
          preview.setProperties(["cl", "cr"], [length, other]);
          return new Transform(1, 0, 0, 1, -grow, right - other);
        }
        const grow = length - right;
        let other = left - grow;
        other = other > 0 ? other : 0;
        preview.setProperties(["cl", "cr"], [other, length]);
        return new Transform(1, 0, 0, 1, left - other, -grow);
      }
      preview.setProperties(["cl", "cr"], [length, length]);
      return new Transform(1, 0, 0, 1, (left as number) - length, (right as number) - length);
    }
    if (part.type == PartType.LeftShoulder) {
      preview.setProperty("cl", length);
      return new Transform(1, 0, 0, 1, (point.getProperty("cl") as number) - length, 0);
    }
    preview.setProperty("cr", length);
    return new Transform(1, 0, 0, 1, 0, (point.getProperty("cr") as number) - length);
  }

  _assignPreviewPointPropertiesToSourcePoint(point: AnchorPoint, names: string[]): void {
    const preview = this.getPathPointPreview(point);
    if (preview) point.setProperties(names, preview.getProperties(names));
  }

  /** Copies the preview geometry of source `point` to the same-index point of `target`. */
  _transferPreviewProperties(point: AnchorPoint, target: EditedPath): void {
    const index = this._element.getAnchorPoints().getIndexOfChild(point);
    const targetPoint = target.getAnchorPoints().getChildByIndex(index) as AnchorPoint;
    const preview = this.getPathPointPreview(targetPoint);
    if (preview) targetPoint.transferProperties(preview, [AnchorPoint.GeometryProperties]);
  }

  /** Drops point parts that belong to a selected segment. */
  _filterSelection(selection: PathPartId[] | null): PathPartId[] | null {
    if (!selection) return null;
    const filtered: PathPartId[] = [];
    for (let i = 0; i < selection.length; ++i) {
      const part = selection[i] as PathPartId;
      if (part.type != PartType.Point) filtered.push(part);
      else {
        let keep = true;
        for (let j = 0; j < selection.length; ++j) {
          const other = selection[j] as PathPartId;
          if (
            other.type == PartType.Segment &&
            (part.point == other.apLeft || part.point == other.apRight)
          ) {
            keep = false;
            break;
          }
        }
        if (keep) filtered.push(part);
      }
    }
    return filtered;
  }

  _geometryChange(event: GeometryChangeEvent): void {
    if (
      event.type == GeometryChangeEvent.Type.After &&
      event.element == this._element &&
      this._elementPreview
    ) {
      this.releasePathPreview();
      this.requestInvalidation();
    }
  }

  /** A finished multi-point line gets centred borders (SceneOptions.defaultBorderPositionForLines). */
  _handleFinishDrawing(): void {
    if (SceneOptions.defaultBorderPositionForLines && this._element.isMultiPointsLine()) {
      this._setBorderAlignmentToCenter();
    }
  }

  _setBorderAlignmentToCenter(): void {
    const layers = this._element.getPaintLayers();
    const borders = layers && layers.getBorderLayers();
    if (borders) {
      borders.forEach((layer) => {
        layer.setProperty("_ba", BorderAlignment.Center);
      });
    }
  }

  _afterInsert(event: { node: unknown }): void {
    if (event.node instanceof BorderPaintLayer) this._handleFinishDrawing();
  }

  override toString(): string {
    return "[Object GPathEditor]";
  }
}

Object.assign(PathEditor.prototype, {
  _sourceIndexToPreviewIndex: null,
  _constrainPair: null,
  _constrainPainted: false,
  _activeExtedingMode: false,
});

/** A node with the old event target API. */
interface EventHost {
  addEventListener(
    eventClass: unknown,
    listener: (event: never) => void,
    target?: object | null,
  ): void;
  removeEventListener(eventClass: unknown, listener: unknown, target?: object | null): boolean;
}
