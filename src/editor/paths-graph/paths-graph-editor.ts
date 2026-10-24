// Old: chunk.vendor.js module 275 (GPathsGraphEditor).
/**
 * The editor of a paths graph (live paint vector network). Its part
 * selection holds one kind of part at a time (the selection mode):
 *
 * - Anchors: graph anchors ({type: Anchor, point: GPGAnchor}). Moving
 *   them previews on a clone of the graph (`_elementPreview`) and drags
 *   the ends of the edges they touch along.
 * - Edge: one edge, or anchor points and segments of its path base
 *   ({type: Point | Segment | LeftHandle | RightHandle, edge, ...}). The
 *   edge's path base gets a detached GPathBaseEditor (`_pbEditor`) that
 *   holds the point preview; applying replaces the edge's path base, or
 *   removes the edge and adds it again as a graph line when the new
 *   curve crosses itself or another edge.
 * - Facets: facets ({type: Facet, facet}), for styling.
 *
 * The Selected flags of the anchors, edges, facets and path base points
 * follow the part selection.
 *
 * Several methods call GPathBaseEditor's prototype although the editor
 * extends GShapeEditor; that is kept, so a whole-graph move goes through
 * GPathBaseEditor.edTransform (see "Moving a whole paths graph throws" in
 * QUESTIONS.md).
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { PolyIntersector } from "../../engine/geometry/boolean/poly-segments.ts";
import { VertexInfo } from "../../engine/geometry/vertex-info.ts";
import { VertexPixelAligner } from "../../engine/geometry/vertex-pixel-aligner.ts";
import type { VertexReader } from "../../engine/geometry/vertex-source.ts";
import { VertexTransformer } from "../../engine/geometry/vertex-transformer.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { GeometryChangeEvent } from "../../engine/scene/element.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import {
  AfterInsertEvent,
  AfterPropertiesChangeEvent,
  BeforeRemoveEvent,
} from "../../engine/scene/node-events.ts";
import type { Node } from "../../engine/scene/node.ts";
import { AnchorPoint, PathBase, type AnchorPoints } from "../../engine/scene/path-base.ts";
import { GraphPosition, PathsGraph } from "../../engine/scene/paths-graph/paths-graph.ts";
import type { PGAnchor } from "../../engine/scene/paths-graph/pg-anchor.ts";
import { SplitPoint, type PGEdge } from "../../engine/scene/paths-graph/pg-edge.ts";
import type { PGFacet } from "../../engine/scene/paths-graph/pg-facet.ts";
import { PaintLayer } from "../../engine/style/paint-layer.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { Cursor } from "../cursor.ts";
import { Editor } from "../editor.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { BaseEditor, PartInfo, type EditorPaintContext } from "../element-editors/base-editor.ts";
import { BlockEditor } from "../element-editors/block-editor.ts";
import { BoxEditor } from "../element-editors/box-editor.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { PathBaseEditor } from "../element-editors/path-base-editor.ts";
import { ShapeEditor, type EditedShape } from "../element-editors/shape-editor.ts";

/** A paths graph as its editor drives it. */
export type EditedPathsGraph = EditedShape & PathsGraph;

const PartType = {
  Segment: 1,
  Anchor: 2,
  Point: 3,
  LeftHandle: 4,
  RightHandle: 5,
  Facet: 6,
} as const;

const SegmentData = {
  HitRes: 1,
  Handles: 2,
} as const;

const SelectionMode = {
  None: 0,
  Anchors: 1,
  Edge: 2,
  Facets: 3,
} as const;

const PointsSelectionType = {
  No: "N",
  First: "F",
  Last: "L",
  Middle: "M",
  Several: "S",
} as const;

/**
 * A part id of the paths graph editor. `point` is a graph anchor
 * (GPGAnchor) for Anchor parts and an anchor point of the edge's path
 * base for Point and handle parts.
 */
export interface GraphPartId {
  type: number;
  point?: GraphPoint | null;
  edge?: PGEdge | null;
  apLeft?: AnchorPoint | null;
  apRight?: AnchorPoint | null;
  facet?: PGFacet | null;
}

/** An anchor of the graph or an anchor point of an edge's path base. */
export type GraphPoint = PGAnchor | AnchorPoint;

/** The data of a segment part: the hit (HitRes) or the handles a bend moves (Handles). */
export interface GraphSegmentData {
  type: number;
  hitRes: SegmentHit;
  rightButton?: { isolated: boolean; selectable: boolean };
  cL?: number;
  cR?: number;
  apLhr?: Point;
  apRhl?: Point;
}

/** A path hit on a segment (GHitResult with its fields set). */
export interface SegmentHit {
  segment: number;
  x: number;
  y: number;
  slope: number;
}

/** What _iteratePoints passes per anchor point. */
export interface GraphPointInfo {
  type: unknown;
  anchorPoint: AnchorPoint;
  position: Point;
  annotation: string;
  leftHandlePosition: Point | null;
  rightHandlePosition: Point | null;
}

/** A node with the old event target API. */
interface EventHost {
  addEventListener(
    eventClass: unknown,
    listener: (event: never) => void,
    target?: object | null,
  ): void;
  removeEventListener(eventClass: unknown, listener: unknown, target?: object | null): boolean;
}

interface PropertySource {
  getProperty(name: string): unknown;
}

/** The anchor or anchor point position (x, y). */
function pointOf(node: unknown): Point {
  const point = node as PropertySource;
  return new Point(point.getProperty("x") as number, point.getProperty("y") as number);
}

/** The id of a graph item as the container maps key it. */
const idOf = (item: { getId(): unknown }): string => item.getId() as string;

const asAnchorPoint = (point: GraphPoint | null | undefined): AnchorPoint => point as AnchorPoint;
const asGraphAnchor = (point: GraphPoint | null | undefined): PGAnchor => point as PGAnchor;

/** Edge ids to edges (Object.create(null) maps, iterated with for-in as in the old code). */
type EdgeMap = Record<string, PGEdge>;

export class PathsGraphEditor extends ShapeEditor<EditedPathsGraph> {
  static {
    registerClass(this, "GPathsGraphEditor");
    ElementEditor.exports(this, PathsGraph);
    Editor.registerPathsGraphEditor(this);
  }

  static PartType = PartType;
  static SegmentData = SegmentData;
  static SelectionMode = SelectionMode;
  static PointsSelectionType = PointsSelectionType;

  /** The path base of the edge in edit (its `_pbEditor` is open). */
  declare _pathBaseInEdit: PathBase | null;
  /** The anchor an outgoing line starts at (the paths graph tool draws it). */
  declare _startAnchor: PGAnchor | null;
  declare _selectionMode: number | null;
  declare _editMode: boolean;
  declare _highlightPart: GraphPartId | null;
  /** Edges with both ends selected (moved as a whole) while anchors move. */
  declare _moveEdgesLinks: EdgeMap | null;
  /** Edges whose first point follows a moved anchor. */
  declare _updateFirstPtELinks: EdgeMap | null;
  /** Edges whose last point follows a moved anchor. */
  declare _updateLastPtELinks: EdgeMap | null;
  declare _transformSubType: number | null;
  /** The constrain line (start, constrained point) of a Shift handle drag, in view coordinates. */
  declare _constrainPair: [Point, Point] | null;
  declare _constrainPainted: boolean;
  declare _activeExtendingMode: unknown;
  /** The detached editor of `_pathBaseInEdit` (undefined until the first edge edit). */
  declare _pbEditor: PathBaseEditor | null | undefined;
  declare _partSelection: GraphPartId[] | null;

  constructor(element: EditedPathsGraph) {
    super(element);
    this._ensureConsistentSelection();
  }

  getActiveExtendingMode(): unknown {
    return this._activeExtendingMode;
  }

  setActiveExtendingMode(mode: unknown): void {
    this._activeExtendingMode = mode;
  }

  getPathBaseInEdit(): PathBase | null {
    return this._pathBaseInEdit;
  }

  /** Starts an outgoing line at `anchor`, edited as `pathBase`. */
  setOutgoingPathBase(anchor: PGAnchor | null, pathBase: PathBase): void {
    this._startAnchor = anchor;
    this._initPBEditor(pathBase);
  }

  /** Adds the outgoing line as a graph line from the start anchor to `endAnchor` (or open). */
  insertOutgoingPathBase(endAnchor?: PGAnchor | null): void {
    if (this._startAnchor) {
      const line = this._pathBaseInEdit;
      this._closePBEditor(true);
      this.updatePartSelection(false, null);
      this._element.addGraphLine(
        line,
        new GraphPosition(
          GraphPosition.PosType.Anchor,
          new GraphPosition.AnchorSpec(this._startAnchor),
        ),
        endAnchor
          ? new GraphPosition(GraphPosition.PosType.Anchor, new GraphPosition.AnchorSpec(endAnchor))
          : null,
        null,
        true,
      );
      this._startAnchor = null;
    }
  }

  setEditMode(editMode: boolean, force?: unknown): void {
    if (this._editMode !== editMode || force) {
      this._editMode = editMode;
      if (this._partSelection) this._ensureConsistentSelection();
    }
  }

  override getEditorStateData(): unknown {
    return { startAnchor: this._startAnchor, pbInEdit: this._pathBaseInEdit };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override restoreEditorStateData(data: unknown): void {
    this._ensureConsistentSelection();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  getPathBasePreview(arg?: unknown): PathBase | null {
    return this._pbEditor ? this._pbEditor.getPathBasePreview() : null;
  }

  /** Graph edges get round caps unless the style comes from another paths graph. */
  override initialSetup(source?: unknown): void {
    super.initialSetup(source);
    if (!(source && source instanceof PathsGraph)) {
      const border = this.getElement().getPaintLayers().getBorderLayers().pop();
      if (border) border.setProperty("_blc", PaintCanvas.LineCap.Round);
    }
  }

  override getBBoxMargin(): number {
    const margin = PathBaseEditor.prototype.getBBoxMargin.call(this);
    return this._showAnnotations()
      ? Math.max(
          EditorAnnotation.getAnnotationPaintMargin(EditorOptions.annotationHandles.path.node.size),
          margin,
        )
      : margin;
  }

  override getCustomBBox(transform: Transform | null, includeTransform?: unknown): Rect | null {
    let box = super.getCustomBBox(transform, includeTransform);
    const graph = this.getGraphPaintElement();
    const own = graph.getTransform();
    const add = (rect: Rect | null): void => {
      if (rect && !rect.isEmpty()) box = box ? box.united(rect) : rect;
    };
    if (this._showAnnotations() && !this.hasFlag(BoxEditor.Flag.ResizeAll)) {
      for (
        let anchor = graph.getAnchors().getFirstChild() as PGAnchor | null;
        anchor;
        anchor = anchor.getNext() as PGAnchor | null
      ) {
        const point = own ? own.mapPoint(anchor.getPoint()) : anchor.getPoint();
        add(
          EditorAnnotation.getAnnotationBBox(
            transform,
            point,
            EditorOptions.annotationHandles.path.graph.size,
            true,
          ),
        );
      }
    } else if (!(
      this.hasFlag(BaseEditor.Flag.HideEditor) ||
      this.hasFlag(BaseEditor.Flag.Outline) ||
      (this.hasFlag(BoxEditor.Flag.ResizeAll) && this.hasFlag(BaseEditor.Flag.Selected))
    )) {
      for (
        let anchor = graph.getAnchors().getFirstChild() as PGAnchor | null;
        anchor;
        anchor = anchor.getNext() as PGAnchor | null
      ) {
        if (anchor.hasFlag(NodeFlag.Highlighted)) {
          const point = own ? own.mapPoint(anchor.getPoint()) : anchor.getPoint();
          add(
            EditorAnnotation.getAnnotationBBox(
              transform,
              point,
              EditorOptions.annotationHandles.path.graph.size,
              true,
            ),
          );
        }
      }
    }
    return box;
  }

  override getBBox(transform: Transform): Rect | null {
    let box: Rect | null = null;
    if (this.hasFlag(BaseEditor.Flag.Selected) || this.hasFlag(BaseEditor.Flag.Highlighted)) {
      const matrix = this._transform ? this._transform.multiplied(transform) : transform;
      const add = (rect: Rect | null): void => {
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
      if (this._pbEditor) {
        add(this._pbEditor.getBBox(transform));
        const own = this._element.getTransform();
        if (this._showAnnotations() && !this.hasFlag(BoxEditor.Flag.ResizeAll)) {
          this._iteratePoints(this._pbEditor.getPaintElement(), own, (info) => {
            if (info.leftHandlePosition) {
              add(
                EditorAnnotation.getAnnotationBBox(
                  matrix,
                  info.leftHandlePosition,
                  handles.control.size,
                  true,
                ),
              );
            }
            if (info.rightHandlePosition) {
              add(
                EditorAnnotation.getAnnotationBBox(
                  matrix,
                  info.rightHandlePosition,
                  handles.control.size,
                  true,
                ),
              );
            }
            add(EditorAnnotation.getAnnotationBBox(matrix, info.position, handles.node.size, true));
          });
        }
        let geometry = this._element.getGeometryBBox();
        if (geometry) {
          geometry = matrix.mapRect(geometry);
          box = box ? (box as Rect).united(geometry) : geometry;
        }
        const margin = this.getBBoxMargin();
        box = (box as unknown as Rect).expanded(margin, margin, margin, margin);
      } else add(super.getBBox(transform));
    }
    return box;
  }

  override getElementSelectionBBox(): Rect | null {
    let box: Rect | null = null;
    if (this._partSelection && this._partSelection.length) {
      for (let i = 0; i < this._partSelection.length; ++i) {
        const part = this._partSelection[i] as GraphPartId;
        if (part.type == PartType.Point || part.type == PartType.Anchor) {
          const coord = this.getPointCoord(part.point as GraphPoint);
          const rect = new Rect(coord.getX(), coord.getY(), 0, 0);
          box = box ? box.united(rect) : rect;
        } else if (part.type == PartType.Segment) {
          let coord = this.getPointCoord(part.apLeft as AnchorPoint);
          let rect = new Rect(coord.getX(), coord.getY(), 0, 0);
          box = box ? box.united(rect) : rect;
          coord = this.getPointCoord(part.apRight as AnchorPoint);
          rect = new Rect(coord.getX(), coord.getY(), 0, 0);
          box = box.united(rect);
        }
      }
    }
    if (!box) box = this._element.getGeometryBBox();
    return box;
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
    if (
      partId === BoxEditor.RESIZE_HANDLE_PART_ID ||
      partId === BoxEditor.ROTATION_HANDLE_PART_ID
    ) {
      PathBaseEditor.prototype.movePart.call(
        this,
        partId,
        partData,
        position,
        viewToWorld,
        guides,
        shift,
        option,
      );
    } else {
      const part = partId as GraphPartId;
      this.requestInvalidation();
      switch (part.type) {
        case PartType.LeftHandle:
          this._movePreviewPointCoordinates(
            asAnchorPoint(part.point),
            "hlx",
            "hly",
            position,
            viewToWorld,
            shift,
            guides,
          );
          break;
        case PartType.RightHandle:
          this._movePreviewPointCoordinates(
            asAnchorPoint(part.point),
            "hrx",
            "hry",
            position,
            viewToWorld,
            shift,
            guides,
          );
          break;
        case PartType.Segment: {
          const data = partData as GraphSegmentData;
          if (data.type == SegmentData.Handles) {
            // The old code read both point previews here without using the
            // values. The reads are kept: they throw a TypeError when the
            // path base editor or a preview is gone, as the old code did.
            const leftPreview = this.getPathPointPreview(
              part.apLeft as AnchorPoint,
            ) as PropertySource | null;
            const rightPreview = this.getPathPointPreview(
              part.apRight as AnchorPoint,
            ) as PropertySource | null;
            (leftPreview as PropertySource).getProperty("x");
            (leftPreview as PropertySource).getProperty("y");
            (rightPreview as PropertySource).getProperty("x");
            (rightPreview as PropertySource).getProperty("y");
            const target = viewToWorld.mapPoint(position);
            let hit = new Point(data.hitRes.x, data.hitRes.y);
            const own = this._element.getTransform();
            if (own) hit = own.mapPoint(hit);
            const delta = target.subtract(hit);
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
    return undefined;
  }

  override hasSelectionEditing(): boolean {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override resetPartMove(partId: unknown, partData: unknown): void {
    this.releasePreview();
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
      PathBaseEditor.prototype._applyPartMove.call(this, partId, partData, option, extra);
    } else {
      const part = partId as GraphPartId;
      if (
        part.type == PartType.LeftHandle ||
        part.type == PartType.RightHandle ||
        part.type == PartType.Segment
      ) {
        this._partsGeometryChanged([part]);
      }
    }
    this.resetPartMove(partId, partData);
  }

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
      this._transformSubType = null;
      this.requestInvalidation();
      if (this._selectionMode == SelectionMode.Edge) {
        this._createPathPreviewIfNecessary();
        const movePoint = (point: AnchorPoint): void => {
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
          const part = this._partSelection[i] as GraphPartId;
          if (part.type === PartType.Point) movePoint(asAnchorPoint(part.point));
          else if (part.type === PartType.Segment && partId && this._partIdAreEqual(part, partId)) {
            const data = partData as GraphSegmentData;
            this._transformSubType = data.type;
            if (data.type == SegmentData.HitRes) {
              movePoint(part.apLeft as AnchorPoint);
              movePoint(part.apRight as AnchorPoint);
            }
          }
        }
      }
      if (this._selectionMode == SelectionMode.Anchors) {
        this._createPathPreviewIfNecessary();
        let matrix = this._element.getProperty("trf") as Transform | null;
        matrix = matrix
          ? matrix.multiplied(transform).multiplied(matrix.inverted() as Transform)
          : transform;
        if (!this._moveEdgesLinks) {
          this._moveEdgesLinks = Object.create(null) as EdgeMap;
          this._updateFirstPtELinks = Object.create(null) as EdgeMap;
          this._updateLastPtELinks = Object.create(null) as EdgeMap;
          for (let i = 0; i < this._partSelection.length; ++i) {
            const anchor = asGraphAnchor((this._partSelection[i] as GraphPartId).point);
            const inEdges = anchor.getInEdges();
            for (let j = 0; j < inEdges.length; ++j) {
              const edge = inEdges[j] as PGEdge;
              if ((edge.getSource() as PGAnchor).hasFlag(NodeFlag.Selected)) {
                if (!this._moveEdgesLinks[idOf(edge)]) {
                  this._moveEdgesLinks[idOf(edge)] = edge;
                }
              } else (this._updateLastPtELinks as EdgeMap)[idOf(edge)] = edge;
            }
            const outEdges = anchor.getOutEdges();
            for (let j = 0; j < outEdges.length; ++j) {
              const edge = outEdges[j] as PGEdge;
              if ((edge.getDestination() as PGAnchor).hasFlag(NodeFlag.Selected)) {
                if (!this._moveEdgesLinks[idOf(edge)]) {
                  this._moveEdgesLinks[idOf(edge)] = edge;
                }
              } else (this._updateFirstPtELinks as EdgeMap)[idOf(edge)] = edge;
            }
          }
        }
        const preview = this._elementPreview as EditedPathsGraph;
        const movedIds = Object.keys(this._moveEdgesLinks);
        if (movedIds.length) {
          for (let i = 0; i < movedIds.length; ++i) {
            const id = movedIds[i] as string;
            const previewEdge = preview.getEdges().getById(id) as PGEdge | null;
            const edge = this._element.getEdges().getById(id) as PGEdge | null;
            if (edge && previewEdge) {
              const source = edge.getPathBase();
              const moved = new PathBase();
              for (
                let point = source.getAnchorPoints().getFirstChild() as AnchorPoint | null;
                null != point;
                point = point.getNext() as AnchorPoint | null
              ) {
                moved.getAnchorPoints().appendChild(point._getTransformedCopy(matrix));
              }
              if (moved.getAnchorPoints().getFirstChild()) previewEdge.setPathBase(moved);
            }
          }
        }
        for (let i = 0; i < this._partSelection.length; ++i) {
          const previewAnchor = preview
            .getAnchors()
            .getById(
              idOf(asGraphAnchor((this._partSelection[i] as GraphPartId).point)),
            ) as PGAnchor;
          const inEdges = previewAnchor.getInEdges();
          for (let j = 0; j < inEdges.length; ++j) {
            const pathBase = (inEdges[j] as PGEdge).getPathBase();
            const sourcePathBase = (
              this._element.getEdges().getById(idOf(inEdges[j] as PGEdge)) as PGEdge
            ).getPathBase();
            const last = pathBase.getAnchorPoints().getLastChild() as AnchorPoint;
            const moved = (
              sourcePathBase.getAnchorPoints().getLastChild() as AnchorPoint
            )._getTransformedCopy(matrix);
            last.setProperties(
              ["x", "y", "hlx", "hly"],
              [
                moved.getProperty("x"),
                moved.getProperty("y"),
                moved.getProperty("hlx"),
                moved.getProperty("hly"),
              ],
            );
          }
          const outEdges = previewAnchor.getOutEdges();
          for (let j = 0; j < outEdges.length; ++j) {
            const pathBase = (outEdges[j] as PGEdge).getPathBase();
            const sourcePathBase = (
              this._element.getEdges().getById(idOf(outEdges[j] as PGEdge)) as PGEdge
            ).getPathBase();
            const first = pathBase.getAnchorPoints().getFirstChild() as AnchorPoint;
            const moved = (
              sourcePathBase.getAnchorPoints().getFirstChild() as AnchorPoint
            )._getTransformedCopy(matrix);
            first.setProperties(
              ["x", "y", "hrx", "hry"],
              [
                moved.getProperty("x"),
                moved.getProperty("y"),
                moved.getProperty("hrx"),
                moved.getProperty("hry"),
              ],
            );
          }
          let point = asGraphAnchor((this._partSelection[i] as GraphPartId).point).getPoint();
          point = matrix.mapPoint(point);
          previewAnchor.setProperties(["x", "y"], [point.getX(), point.getY()]);
        }
      }
      this.requestInvalidation();
    } else PathBaseEditor.prototype.edTransform.call(this, transform, partId, partData, options);
  }

  override resetTransform(): void {
    this.releasePreview();
    if (this._selectionMode == SelectionMode.Anchors) {
      this._moveEdgesLinks = null;
      this._updateFirstPtELinks = null;
      this._updateLastPtELinks = null;
    }
    this._transformSubType = null;
    PathBaseEditor.prototype.resetTransform.call(this);
  }

  override canApplyTransform(): unknown {
    return (
      (this._partSelection &&
        this._partSelection.length > 0 &&
        !this.hasFlag(BoxEditor.Flag.ResizeAll)) ||
      (this._transform && !this._transform.isIdentity())
    );
  }

  override _applyTransform(target: unknown, ...rest: unknown[]): void {
    if (
      target instanceof PathBase &&
      this._partSelection &&
      this._partSelection.length > 0 &&
      !this.hasFlag(BoxEditor.Flag.ResizeAll)
    ) {
      target._beginBlockEvents([GeometryChangeEvent]);
      target.getAnchorPoints()._beginBlockCompositeEvents(false, true, false);
      const selection: GraphPartId[] = [];
      for (let i = 0; i < this._partSelection.length; ++i) {
        const part = this._partSelection[i] as GraphPartId;
        const last = i == this._partSelection.length - 1;
        if (part.type === PartType.Point) {
          if (last) {
            target._endBlockEvents([GeometryChangeEvent]);
            target.getAnchorPoints()._endBlockCompositeEvents(false, true, false);
          }
          this._transferPreviewProperties(asAnchorPoint(part.point), target);
          selection.push(part);
        } else if (part.type === PartType.Segment) {
          const left = part.apLeft as AnchorPoint;
          const right = part.apRight as AnchorPoint;
          this._transferPreviewProperties(left, target);
          if (last) {
            target._endBlockEvents([GeometryChangeEvent]);
            target.getAnchorPoints()._endBlockCompositeEvents(false, true, false);
          }
          this._transferPreviewProperties(right, target);
          if (
            (left.getParent() as AnchorPoints).getPreviousPoint(left) ||
            (right.getParent() as AnchorPoints).getNextPoint(right)
          ) {
            selection.push({ type: PartType.Point, point: left });
            selection.push({ type: PartType.Point, point: right });
          }
        }
      }
      this.requestInvalidation();
      this.resetTransform();
      this.updatePartSelection(false, selection);
    } else if (target instanceof PathBase) {
      if (this._transform && !this._transform.isIdentity()) {
        PathBaseEditor.prototype._applyTransform.call(this, target);
      }
      this.resetTransform();
    } else {
      if (
        this._partSelection &&
        this._partSelection.length > 0 &&
        !this.hasFlag(BoxEditor.Flag.ResizeAll)
      ) {
        let parts: GraphPartId[] | null = null;
        if (this._selectionMode == SelectionMode.Edge) {
          for (let i = 0; i < this._partSelection.length; ++i) {
            const part = this._partSelection[i] as GraphPartId;
            if (part.type == PartType.Segment || part.type == PartType.Point) {
              parts = [part];
              break;
            }
          }
        } else if (this._selectionMode == SelectionMode.Anchors) {
          parts = this._partSelection.slice();
        }
        if (parts && parts.length) this._partsGeometryChanged(parts);
      } else if (this._transform && !this._transform.isIdentity()) {
        ShapeEditor.prototype._applyTransform.call(this, target, ...rest);
      }
      this.resetTransform();
    }
  }

  /**
   * What a select tool drag on `part` moves. A right-button drag on an
   * edge selects its two anchors; a plain drag on a segment bends it
   * (handles are made where the segment had none); a right-button drag
   * on a corner point pulls handles out of it (Alt: only the missing one).
   */
  override selectToolDragStartAction(part: PartInfo, rightButton?: unknown): PartInfo | null {
    if (part.editor !== this) return null;
    let result: PartInfo | null = part;
    this._constrainPair = null;
    let isolated = part.isolated;
    let selectable = part.selectable;
    const id = part.id as GraphPartId;
    if (id.type == PartType.Segment) {
      if (rightButton) {
        const edge = id.edge;
        if (edge) {
          const anchors: GraphPartId[] = [
            { type: PartType.Anchor, point: edge.getSource() as PGAnchor },
            { type: PartType.Anchor, point: edge.getDestination() as PGAnchor },
          ];
          this.updatePartSelection(false, anchors);
          const data = part.data as GraphSegmentData;
          result.isolated = (data.rightButton as { isolated: boolean }).isolated;
          result.selectable = (data.rightButton as { selectable: boolean }).selectable;
        }
      } else {
        const hit = (part.data as GraphSegmentData).hitRes;
        const left = id.apLeft;
        const right = id.apRight;
        if (left && right) {
          this.requestInvalidation();
          if (!this._pbEditor) this._initPBEditor((id.edge as PGEdge).getPathBase());
          const pathPreview = (this._pbEditor as PathBaseEditor).getPathBasePreview();
          const leftPreview = this.getPathPointPreview(left);
          const rightPreview = this.getPathPointPreview(right);
          if (leftPreview && rightPreview) {
            if (GMath.isEqualEps(hit.slope, 0, 0.001)) {
              result = new PartInfo(
                this,
                { type: PartType.Point, edge: id.edge, point: left },
                { apSelected: false },
                false,
                true,
              );
            } else if (GMath.isEqualEps(hit.slope, 1, 0.001)) {
              result = new PartInfo(
                this,
                { type: PartType.Point, edge: id.edge, point: right },
                { apSelected: false },
                false,
                true,
              );
            } else {
              // Undefined when the segment has both handles and no hit (as in the old code).
              let leftHandleX = undefined as unknown as number;
              let leftHandleY = undefined as unknown as number;
              let rightHandleX = undefined as unknown as number;
              let rightHandleY = undefined as unknown as number;
              const x0 = left.getProperty("x") as number;
              const y0 = left.getProperty("y") as number;
              const x1 = right.getProperty("x") as number;
              const y1 = right.getProperty("y") as number;
              let bendHit = hit;
              const rehit = (): void => {
                const again = pathPreview.pathHitTest(
                  new Point(hit.x, hit.y),
                  null,
                  false,
                  EditorOptions.pickDistance,
                );
                if (again && again.data) bendHit = again.data as unknown as SegmentHit;
              };
              if (
                (null !== left.getProperty("hrx") && null !== left.getProperty("hry")) ||
                (null !== right.getProperty("hlx") && null !== right.getProperty("hly"))
              ) {
                if (null === left.getProperty("hrx") || null === left.getProperty("hry")) {
                  const hx = rightPreview.getProperty("hlx") as number;
                  const hy = rightPreview.getProperty("hly") as number;
                  leftHandleX = x0 + (2 / 3) * (hx - x0);
                  leftHandleY = y0 + (2 / 3) * (hy - y0);
                  rightHandleX = x1 + (2 / 3) * (hx - x1);
                  rightHandleY = y1 + (2 / 3) * (hy - y1);
                  leftPreview.setProperties(
                    ["ah", "hrx", "hry"],
                    [false, leftHandleX, leftHandleY],
                  );
                  rightPreview.setProperties(
                    ["ah", "hlx", "hly"],
                    [false, rightHandleX, rightHandleY],
                  );
                  this.requestInvalidation();
                  rehit();
                } else if (null === right.getProperty("hlx") || null === right.getProperty("hly")) {
                  const hx = leftPreview.getProperty("hrx") as number;
                  const hy = leftPreview.getProperty("hry") as number;
                  rightHandleX = x1 + (2 / 3) * (hx - x1);
                  rightHandleY = y1 + (2 / 3) * (hy - y1);
                  leftHandleX = x0 + (2 / 3) * (hx - x0);
                  leftHandleY = y0 + (2 / 3) * (hy - y0);
                  leftPreview.setProperties(
                    ["ah", "hrx", "hry"],
                    [false, leftHandleX, leftHandleY],
                  );
                  rightPreview.setProperties(
                    ["ah", "hlx", "hly"],
                    [false, rightHandleX, rightHandleY],
                  );
                  this.requestInvalidation();
                  rehit();
                } else if (hit) {
                  leftPreview.setProperty("ah", false);
                  rightPreview.setProperty("ah", false);
                  this.requestInvalidation();
                  leftHandleX = leftPreview.getProperty("hrx") as number;
                  leftHandleY = leftPreview.getProperty("hry") as number;
                  rightHandleX = rightPreview.getProperty("hlx") as number;
                  rightHandleY = rightPreview.getProperty("hly") as number;
                }
              } else {
                const dx = (x1 - x0) / 3;
                const dy = (y1 - y0) / 3;
                const dxLeft = dx * hit.slope;
                const dxRight = dx - dxLeft;
                const dyLeft = dy * hit.slope;
                const dyRight = dy - dyLeft;
                leftHandleX = hit.x - dxLeft;
                leftHandleY = hit.y - dyLeft;
                leftPreview.setProperties(
                  ["ah", "hrx", "hry"],
                  [false, hit.x - dxLeft, hit.y - dyLeft],
                );
                rightHandleX = hit.x + dxRight;
                rightHandleY = hit.y + dyRight;
                rightPreview.setProperties(
                  ["ah", "hlx", "hly"],
                  [false, hit.x + dxRight, hit.y + dyRight],
                );
                this.requestInvalidation();
                rehit();
              }
              const weightLeft = 3 * (1 - bendHit.slope) * (1 - bendHit.slope) * bendHit.slope;
              const weightRight = 3 * bendHit.slope * bendHit.slope * (1 - bendHit.slope);
              result = new PartInfo(
                this,
                { type: PartType.Segment, edge: id.edge, apLeft: left, apRight: right },
                {
                  type: SegmentData.Handles,
                  cL: 1 / (weightLeft + weightRight),
                  apLhr: new Point(leftHandleX, leftHandleY),
                  cR: 1 / (weightLeft + weightRight),
                  apRhl: new Point(rightHandleX, rightHandleY),
                  hitRes: bendHit,
                },
                isolated,
                selectable,
              );
              this._transformSubType = (result.data as GraphSegmentData).type;
            }
          } else result = null;
        }
      }
    } else if (rightButton && !part.isolated && id.type == PartType.Point) {
      const point = asAnchorPoint(id.point);
      const pointType = point.getProperty("tp");
      if (!point.hasFlag(NodeFlag.Selected)) this.selectOnePoint(point);
      if (!PathBase.isCornerType(pointType)) {
        this.requestInvalidation();
        this._createPathPreviewIfNecessary(point);
        const preview = this.getPathPointPreview(point);
        if (preview) {
          let handleType: number;
          isolated = true;
          selectable = false;
          if (Platform.modifiers.optionKey) {
            const hx = point.getProperty("hrx");
            const hy = point.getProperty("hry");
            if (null === hx || null === hy) {
              handleType = PartType.RightHandle;
              preview.setProperties(
                ["ah", "hrx", "hry"],
                [false, point.getProperty("x"), point.getProperty("y")],
              );
            } else {
              handleType = PartType.LeftHandle;
              preview.setProperties(
                ["ah", "hlx", "hly"],
                [false, point.getProperty("x"), point.getProperty("y")],
              );
            }
            result = new PartInfo(
              this,
              { type: handleType, edge: id.edge, point: point },
              { apSelected: true },
              isolated,
              selectable,
            );
            this.updatePartSelection(true, [result.id]);
          } else {
            const x = point.getProperty("x");
            const y = point.getProperty("y");
            if (pointType != AnchorPoint.Type.Connector) {
              handleType = PartType.RightHandle;
              preview.setProperties(
                ["tp", "ah", "hrx", "hry", "hlx", "hly"],
                [AnchorPoint.Type.Mirror, false, x, y, x, y],
              );
            } else {
              const previous = point.getPrevious() as AnchorPoint | null;
              if (previous && !PathBase.isCornerType(previous.getProperty("tp"))) {
                handleType = PartType.LeftHandle;
                preview.setProperties(["ah", "hlx", "hly"], [false, x, y]);
              } else {
                handleType = PartType.RightHandle;
                preview.setProperties(["ah", "hrx", "hry"], [false, x, y]);
              }
            }
            result = new PartInfo(
              this,
              { type: handleType, edge: id.edge, point: point },
              { apSelected: true },
              isolated,
              selectable,
            );
          }
        } else result = null;
      }
    }
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override getCursor(partId: unknown, partData?: unknown): unknown {
    return (partId as GraphPartId).type == PartType.Segment ? Cursor.SelectCurve : null;
  }

  override canHandleDblClick(): boolean {
    return true;
  }

  /** A double click on a smooth point in detail mode toggles it between asymmetric and symmetric. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override handleDblClick(partId: unknown, transform?: unknown): boolean {
    const part = partId as GraphPartId | null;
    if (
      part &&
      part.type == PartType.Point &&
      this.hasFlag(BaseEditor.Flag.Detail) &&
      !this._editMode
    ) {
      this.requestInvalidation();
      const preview = this.getPathPointPreview(asAnchorPoint(part.point));
      if (preview) {
        if (asAnchorPoint(part.point).getProperty("tp") === AnchorPoint.Type.Asymmetric) {
          preview.setProperties(["tp", "ah"], [AnchorPoint.Type.Symmetric, true]);
          preview.setProperties(["ah"], [false]);
        } else preview.setProperties(["tp", "ah"], [AnchorPoint.Type.Asymmetric, false]);
        this._partsGeometryChanged([part]);
        this.requestInvalidation();
        return true;
      }
    }
    return false;
  }

  /** The selected edges, or the edges around the selected facets. */
  override getStylableParts(): unknown {
    if (
      this._partSelection &&
      this._partSelection.length &&
      !this.hasFlag(BoxEditor.Flag.ResizeAll) &&
      (this._selectionMode == SelectionMode.Edge || this._selectionMode == SelectionMode.Facets)
    ) {
      const parts: PGEdge[] = [];
      for (let i = 0; i < this._partSelection.length; ++i) {
        const part = this._partSelection[i] as GraphPartId;
        const item =
          this._selectionMode == SelectionMode.Edge ? part.edge : (part.facet as PGFacet | null);
        if (item) {
          if (this._selectionMode == SelectionMode.Facets) {
            for (
              let directed = (item as PGFacet).getDirectedEdges().getFirstChild() as {
                getEdge(): PGEdge;
                getNext(): unknown;
              } | null;
              null != directed;
              directed = directed.getNext() as typeof directed
            ) {
              parts.push(directed.getEdge());
            }
          } else parts.push(item as PGEdge);
        }
      }
      return parts;
    }
    return undefined;
  }

  override _attach(): void {
    const scene = this._element.getScene() as unknown as EventHost | null;
    if (null != scene) {
      scene.addEventListener(GeometryChangeEvent, this._geometryChange, this);
      scene.addEventListener(AfterPropertiesChangeEvent, this._checkCustomStyle, this);
      scene.addEventListener(AfterInsertEvent, this._checkCustomStyle, this);
      scene.addEventListener(BeforeRemoveEvent, this._checkCustomStyle, this);
    }
  }

  override _detach(): void {
    this.requestInvalidation();
    for (
      let anchor = this._element.getAnchors().getFirstChild();
      null != anchor;
      anchor = anchor.getNext()
    ) {
      anchor.removeFlag(NodeFlag.Highlighted);
    }
    this._closePBEditor(true);
    this._updatePartSelection(null);
    const scene = this._element.getScene() as unknown as EventHost | null;
    if (null != scene) {
      scene.removeEventListener(GeometryChangeEvent, this._geometryChange, this);
      scene.removeEventListener(AfterPropertiesChangeEvent, this._checkCustomStyle, this);
      scene.removeEventListener(AfterInsertEvent, this._checkCustomStyle, this);
      scene.removeEventListener(BeforeRemoveEvent, this._checkCustomStyle, this);
    }
    ShapeEditor.prototype._detach.call(this);
  }

  /** Whether `location` (view) hits `point` with `transform` and `tolerance`. */
  hitAnchorPoint(
    point: Node | null,
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

  /**
   * The part under `location`: in edge mode the points and handles of the
   * edge in edit, then anchors, then each edge's points, handles and
   * segment, then facets; the box handles only with ResizeAll.
   */
  override _getPartInfoAt(
    location: Point,
    transform: Transform,
    tolerance: number,
    extra?: unknown,
  ): PartInfo | null {
    if (this._showAnnotations() && !this.hasFlag(BoxEditor.Flag.ResizeAll)) {
      const graph = this.getGraphPaintElement();
      const own = graph.getTransform();
      const hits = (center: Point | null, size: number): boolean =>
        !!center &&
        EditorAnnotation.getAnnotationBBox(transform, own ? own.mapPoint(center) : center, size)
          .expanded(
            EditorOptions.annotPickDistance,
            EditorOptions.annotPickDistance,
            EditorOptions.annotPickDistance,
            EditorOptions.annotPickDistance,
          )
          .containsPoint(location);
      // The visitor reads the edge of the loop below at call time (a
      // function-scoped variable in the old code).
      let currentEdge: unknown = null;
      let found: PartInfo | null = null;
      const visitPoint = (info: GraphPointInfo): boolean | undefined => {
        let type: number | null = null;
        let isolated = true;
        let selectable = false;
        const handles = EditorOptions.annotationHandles.path;
        if (hits(info.rightHandlePosition, handles.control.size)) type = PartType.RightHandle;
        else if (hits(info.leftHandlePosition, handles.control.size)) type = PartType.LeftHandle;
        else if (hits(info.position, handles.graph.size)) {
          type = PartType.Point;
          isolated = false;
          selectable = true;
        }
        if (type) {
          found = new PartInfo(
            this,
            { type: type, edge: currentEdge, point: info.anchorPoint },
            { apSelected: info.anchorPoint.hasFlag(NodeFlag.Selected) },
            isolated,
            selectable,
          );
          return true;
        }
        return undefined;
      };
      if (!this._editMode && this._pathBaseInEdit && this._selectionMode == SelectionMode.Edge) {
        currentEdge = this._pathBaseInEdit.getParent();
        this._iteratePoints(this._pathBaseInEdit, null, visitPoint);
        if (found) return found;
      }
      for (
        let anchor = graph.getAnchors().getFirstChild() as PGAnchor | null;
        anchor;
        anchor = anchor.getNext() as PGAnchor | null
      ) {
        if (hits(anchor.getPoint(), EditorOptions.annotationHandles.path.graph.size)) {
          return new PartInfo(
            this,
            { type: PartType.Anchor, point: anchor },
            { apSelected: anchor.hasFlag(NodeFlag.Selected) },
            false,
            true,
          );
        }
      }
      for (
        let edge = graph.getEdges().getFirstChild() as PGEdge | null;
        edge;
        edge = edge.getNext() as PGEdge | null
      ) {
        currentEdge = edge;
        const pathBase = edge.getPathBase();
        found = null;
        this._iteratePoints(pathBase, null, visitPoint);
        if (found) return found;
        const hit = pathBase.pathHitTest(
          location,
          own ? own.multiplied(transform) : transform,
          false,
          EditorOptions.pickDistance,
        );
        const segmentHit = hit ? (hit.data as unknown as SegmentHit) : null;
        if (
          hit &&
          !GMath.isEqualEps((segmentHit as SegmentHit).slope, 0) &&
          !GMath.isEqualEps((segmentHit as SegmentHit).slope, 1)
        ) {
          const data = segmentHit as SegmentHit;
          const leftPoint = pathBase
            .getAnchorPoints()
            .getChildByIndex(data.segment - 1) as AnchorPoint | null;
          const rightPoint = leftPoint
            ? (pathBase.getAnchorPoints().getNextPoint(leftPoint) as AnchorPoint | null)
            : null;
          return new PartInfo(
            this,
            { type: PartType.Segment, edge: edge, apLeft: leftPoint, apRight: rightPoint },
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
      for (
        let facet = graph.getFacets().getFirstChild() as PGFacet | null;
        facet;
        facet = facet.getNext() as PGFacet | null
      ) {
        const hit = facet
          .getPath()
          .hitTest(
            location,
            own ? own.multiplied(transform) : transform,
            null,
            false,
            0,
            0,
            true,
            null,
          );
        if (hit) {
          return new PartInfo(this, { type: PartType.Facet, facet: facet }, {}, false, true);
        }
      }
    }
    if (this.hasFlag(BoxEditor.Flag.ResizeAll)) {
      const box = BlockEditor.prototype._getPartInfoAt.call(
        this,
        location,
        transform,
        tolerance,
        extra,
      );
      if (
        box &&
        (box.id == BoxEditor.RESIZE_HANDLE_PART_ID || box.id == BoxEditor.ROTATION_HANDLE_PART_ID)
      ) {
        return box;
      }
    }
    return null;
  }

  /** The element's pivots plus the points of an outgoing line after its first. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override findPivots(area?: unknown, extra?: unknown): unknown[] | null {
    let pivots = ElementEditor.prototype.findPivots.call(this);
    const own = this._element.getTransform();
    if (this._pathBaseInEdit && this._startAnchor) {
      let point = this._pathBaseInEdit.getAnchorPoints().getFirstChild() as AnchorPoint | null;
      if (point) {
        for (
          point = point.getNext() as AnchorPoint | null;
          point;
          point = point.getNext() as AnchorPoint | null
        ) {
          const position = pointOf(point);
          const pivot = {
            point: own ? own.mapPoint(position) : position,
            ptType: point.getProperty("tp"),
            autoH: point.getProperty("ah"),
          };
          if (pivots) pivots.push(pivot);
          else pivots = [pivot];
        }
      }
    }
    return pivots;
  }

  /**
   * Splits the edge of `part` (a segment hit or an edge point) and
   * returns the new anchor; for an anchor part returns that anchor.
   * `blockEvents` blocks the geometry change events meanwhile.
   */
  splitEdge(part: PartInfo | null, blockEvents?: unknown): PGAnchor | null {
    let anchor: PGAnchor | null = null;
    if (part && part.editor == this) {
      const id = part.id as GraphPartId;
      if (id.type == PartType.Segment || id.type == PartType.Point) {
        const newAnchors: PGAnchor[] = [];
        const points: SplitPoint[] = [];
        if (id.type == PartType.Segment) {
          const hit = (part.data as GraphSegmentData).hitRes;
          points.push(new SplitPoint(hit.segment - 1, hit.slope, new Point(hit.x, hit.y)));
        } else {
          let index = 0;
          for (
            let point: Node | null = (id.edge as PGEdge)
              .getPathBase()
              .getAnchorPoints()
              .getFirstChild();
            point && point != id.point;
            point = point.getNext(), ++index
          );
          points.push(new SplitPoint(index, 0, pointOf(id.point as Node)));
        }
        if (blockEvents) this._element._beginBlockEvents([GeometryChangeEvent]);
        this._element.splitEdge(id.edge as PGEdge, points, true, [], newAnchors);
        if (blockEvents) this._element._endBlockEvents([GeometryChangeEvent]);
        if (newAnchors.length) anchor = newAnchors[0] as PGAnchor;
      } else if (id.type == PartType.Anchor) anchor = asGraphAnchor(id.point);
    }
    return anchor;
  }

  /**
   * Paints the constrain line, the anchor handles (or the highlighted
   * anchors) and the handles of the edge in edit. It doesn't call
   * GShapeEditor's _postPaint (no centre cross, no catch handle).
   */
  override _postPaint(transform: Transform, context: EditorPaintContext): void {
    const canvas = context.canvas as NonNullable<EditorPaintContext["canvas"]>;
    if (this._constrainPair && !this._constrainPainted) {
      const handle = EditorOptions.annotationHandles.path.constrain;
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
        handle.type,
        false,
        handle.size,
        RGBColor.WHITE,
        context.highlightOutlineColor,
      );
      this._constrainPair = null;
      this._constrainPainted = true;
    }
    if (this._showAnnotations() && !this.hasFlag(BoxEditor.Flag.ResizeAll)) {
      const graph = this.getGraphPaintElement();
      const own = graph.getTransform();
      const handle = EditorOptions.annotationHandles.path.graph;
      for (
        let anchor = graph.getAnchors().getFirstChild() as PGAnchor | null;
        anchor;
        anchor = anchor.getNext() as PGAnchor | null
      ) {
        const point = own ? own.mapPoint(anchor.getPoint()) : anchor.getPoint();
        EditorAnnotation.paintAnnotation(
          context,
          transform,
          point,
          handle.type,
          anchor.hasFlag(NodeFlag.Selected),
          handle.size,
          context.selectionOutlineColor,
          RGBColor.WHITE,
        );
        if (anchor.hasFlag(NodeFlag.Highlighted)) {
          EditorAnnotation.paintAnnotation(
            context,
            transform,
            point,
            handle.type,
            true,
            handle.size,
            context.highlightOutlineColor,
            RGBColor.WHITE,
          );
        }
      }
    } else if (
      !this.hasFlag(BaseEditor.Flag.HideEditor) &&
      !this.hasFlag(BaseEditor.Flag.Outline) &&
      this._element.hasFlag(NodeFlag.Highlighted) &&
      (!this.hasFlag(BoxEditor.Flag.ResizeAll) || !this.hasFlag(BaseEditor.Flag.Selected))
    ) {
      const graph = this.getGraphPaintElement();
      const own = graph.getTransform();
      const handle = EditorOptions.annotationHandles.path.graph;
      for (
        let anchor = graph.getAnchors().getFirstChild() as PGAnchor | null;
        anchor;
        anchor = anchor.getNext() as PGAnchor | null
      ) {
        if (anchor.hasFlag(NodeFlag.Highlighted)) {
          const point = own ? own.mapPoint(anchor.getPoint()) : anchor.getPoint();
          EditorAnnotation.paintAnnotation(
            context,
            transform,
            point,
            handle.type,
            true,
            handle.size,
            context.highlightOutlineColor,
            RGBColor.WHITE,
          );
        }
      }
    }
    if (this._pathBaseInEdit && this._pbEditor) {
      const color = this.getColor();
      if (this._selectionMode == SelectionMode.Edge && !this.hasFlag(BaseEditor.Flag.Highlighted)) {
        this.setColor(context.selectionSecondOutlineColor);
      }
      const own = this._element.getTransform();
      const pathBase = this._pbEditor.getPaintElement();
      if (!(!this._showAnnotations() || this.hasFlag(BoxEditor.Flag.ResizeAll) || this._editMode)) {
        this._iteratePoints(pathBase, own, (info) => {
          if (info.leftHandlePosition) {
            this._paintControlHandle(transform, context, info.position, info.leftHandlePosition);
          }
          if (info.rightHandlePosition) {
            this._paintControlHandle(transform, context, info.position, info.rightHandlePosition);
          }
          const node = EditorOptions.annotationHandles.path.node;
          EditorAnnotation.paintAnnotation(
            context,
            transform,
            info.position,
            info.annotation,
            info.anchorPoint.hasFlag(NodeFlag.Selected),
            node.size,
            context.selectionOutlineColor,
            RGBColor.WHITE,
          );
          return undefined;
        });
      }
      this.setColor(color);
    }
    this._highlightPart = null;
  }

  /**
   * Same type and same point, same segment ends or same facet. The facet
   * test runs for handle parts too, which have no facet, so two handle
   * parts of the same side are equal whatever their point; see "Paths
   * graph handle part ids compare by type only" in QUESTIONS.md.
   */
  override _partIdAreEqual(a: unknown, b: unknown): boolean {
    const first = a as GraphPartId;
    const second = b as GraphPartId;
    let equal = first.type === second.type;
    if (!equal || (first.type != PartType.Point && first.type != PartType.Anchor)) {
      if (equal && first.type == PartType.Segment) {
        equal = first.apLeft === second.apLeft && first.apRight == second.apRight;
      } else if (equal && PartType.Facet) equal = first.facet == second.facet;
    } else equal = first.point === second.point;
    return equal;
  }

  override _updatePartSelection(selection: unknown[] | null): void {
    if (this.hasFlag(BoxEditor.Flag.ResizeAll)) return;
    this.requestInvalidation();
    const previousMode = this._selectionMode;
    const parts = selection ? (selection.slice() as GraphPartId[]) : null;
    const mode = this._filterForSelMode(parts);
    let previousPathBase: PathBase | null = null;
    if (!this._startAnchor) {
      const previous = this._partSelection;
      previousPathBase = this._pathBaseInEdit ? this._pathBaseInEdit : null;
      this._partSelection = parts;
      this._selectionMode = mode;
      if (previous && previous.length) {
        for (let i = 0; i < previous.length; ++i) {
          const part = previous[i] as GraphPartId;
          let kept = false;
          if (mode == previousMode && parts) {
            for (let j = 0; j < parts.length; ++j) {
              const other = parts[j] as GraphPartId;
              if (
                (other.point === part.point && part.point) ||
                (part.type == PartType.Segment && part.edge == other.edge) ||
                (part.type == PartType.Facet && part.facet == other.facet)
              ) {
                kept = true;
                break;
              }
            }
          }
          if (!kept) {
            if (part.point) {
              part.point.removeFlag(NodeFlag.Selected);
              if (part.type == PartType.Point) this._closePBEditor(false);
            } else if (part.type == PartType.Segment) {
              (part.edge as PGEdge).removeFlag(NodeFlag.Selected);
              if (part.apLeft) part.apLeft.removeFlag(NodeFlag.Selected);
              if (part.apRight) part.apRight.removeFlag(NodeFlag.Selected);
              this._closePBEditor(false);
            } else if (part.type == PartType.Facet) {
              (part.facet as PGFacet).removeFlag(NodeFlag.Selected);
            }
          }
        }
      }
      if (parts && parts.length) {
        switch (this._selectionMode) {
          case SelectionMode.Anchors:
            for (let i = 0; i < parts.length; ++i) {
              ((parts[i] as GraphPartId).point as GraphPoint).setFlag(NodeFlag.Selected);
            }
            break;
          case SelectionMode.Edge: {
            const edge = (parts[0] as GraphPartId).edge as PGEdge;
            edge.setFlag(NodeFlag.Selected);
            this._initPBEditor(edge.getPathBase());
            break;
          }
          case SelectionMode.Facets:
            for (let i = 0; i < parts.length; ++i) {
              ((parts[i] as GraphPartId).facet as PGFacet).setFlag(NodeFlag.Selected);
            }
        }
      }
    }
    if (
      this._startAnchor ||
      (this._selectionMode == SelectionMode.Edge &&
        previousMode == SelectionMode.Edge &&
        this._pathBaseInEdit &&
        previousPathBase == this._pathBaseInEdit &&
        !this._editMode)
    ) {
      const filtered = this._filterSelection(parts);
      const previous = this._partSelection;
      this._partSelection = filtered;
      if (previous) {
        for (let i = 0; i < previous.length; ++i) {
          const part = previous[i] as GraphPartId;
          let kept = false;
          if (filtered) {
            for (let j = 0; j < filtered.length; ++j) {
              const other = filtered[j] as GraphPartId;
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
          const part = filtered[i] as GraphPartId;
          if (part.point) part.point.setFlag(NodeFlag.Selected);
          else if (part.type == PartType.Segment) {
            (part.apLeft as AnchorPoint).setFlag(NodeFlag.Selected);
            (part.apRight as AnchorPoint).setFlag(NodeFlag.Selected);
          }
        }
      }
    }
    this.requestInvalidation();
  }

  /**
   * The selection mode of `parts`, keeping only the parts of that mode's
   * type (in place). Anchors win; edge points count as edge parts
   * (segments in edit mode) unless an outgoing line is drawn.
   */
  _filterForSelMode(parts: GraphPartId[] | null): number {
    let mode: number = SelectionMode.None;
    let keep: number | null = null;
    if (parts && parts.length) {
      let done = false;
      for (let i = 0; i < parts.length && !done; ++i) {
        const part = parts[i] as GraphPartId;
        switch (part.type) {
          case PartType.Anchor:
            mode = SelectionMode.Anchors;
            keep = PartType.Anchor;
            done = true;
            break;
          case PartType.Point:
          case PartType.Segment:
            // The old code fell through from Point to Segment.
            if (part.type == PartType.Point && (this._startAnchor || !part.edge)) break;
            mode = SelectionMode.Edge;
            if (this._editMode && part.type == PartType.Point) part.type = PartType.Segment;
            keep = part.type;
            break;
          case PartType.Facet:
            if (mode == SelectionMode.None) {
              mode = SelectionMode.Facets;
              keep = PartType.Facet;
            }
        }
      }
      if (keep) {
        for (let i = parts.length - 1; i >= 0; --i) {
          if ((parts[i] as GraphPartId).type != keep) parts.splice(i, 1);
        }
      }
    }
    return mode;
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
    (context.canvas as NonNullable<EditorPaintContext["canvas"]>).strokeLine(
      from.getX(),
      from.getY(),
      to.getX(),
      to.getY(),
      EditorOptions.outlineWidth,
      this.getColor() || context.selectionOutlineColor,
    );
    const control = EditorOptions.annotationHandles.path.control;
    EditorAnnotation.paintAnnotation(
      context,
      transform,
      handle,
      control.type,
      false,
      control.size,
      context.selectionOutlineColor,
      context.selectionOutlineColor,
    );
  }

  /** The edge in edit's preview, else the graph preview, else the graph. */
  override getPaintElement(): EditedPathsGraph {
    return (
      this._pbEditor
        ? this._pbEditor.getPaintElement()
        : this._elementPreview
          ? this._elementPreview
          : this._element
    ) as EditedPathsGraph;
  }

  getGraphPaintElement(): EditedPathsGraph {
    return this._elementPreview ? this._elementPreview : this._element;
  }

  override _paintOutline(
    transform: Transform,
    context: EditorPaintContext,
    noVertices: unknown,
    color: Parameters<ShapeEditor["_paintOutline"]>[3],
    baseTransform?: Transform | null,
  ): void {
    const canvas = context.canvas as NonNullable<EditorPaintContext["canvas"]>;
    const paintElement = this.getPaintElement() as unknown;
    const own = this._element.getTransform();
    if (paintElement instanceof PathsGraph) {
      (ShapeEditor.prototype._paintOutline as (...args: unknown[]) => void).call(
        this,
        transform,
        context,
        noVertices,
        color,
        baseTransform,
      );
    } else {
      const aligner = new VertexPixelAligner(
        new VertexTransformer(this._element as unknown as VertexReader, transform),
      );
      if (aligner) {
        canvas.putVertices(aligner, false);
        canvas.strokeVertices(
          color ||
            (this.hasFlag(BaseEditor.Flag.Highlighted)
              ? context.highlightOutlineColor
              : context.selectionOutlineColor),
          EditorOptions.outlineWidth,
        );
      }
    }
    if (this._highlightPart && !noVertices) {
      let outline: VertexReader | null = null;
      if (this._highlightPart.edge) {
        if (this._highlightPart.edge.hasFlag(NodeFlag.Selected)) this._highlightPart = null;
        else outline = this._highlightPart.edge.getPathBase() as unknown as VertexReader;
      } else if (this._highlightPart.facet) {
        if (this._highlightPart.facet.hasFlag(NodeFlag.Selected)) this._highlightPart = null;
        else outline = this._highlightPart.facet.getPath() as unknown as VertexReader;
      }
      if (outline) {
        const aligner = new VertexPixelAligner(
          new VertexTransformer(outline, own ? own.multiplied(transform) : transform),
        );
        if (aligner) {
          canvas.putVertices(aligner, false);
          canvas.strokeVertices(context.highlightOutlineColor, EditorOptions.outlineWidth);
        }
        this._highlightPart = null;
      }
    }
    if (paintElement instanceof PathsGraph) {
      if (
        this._selectionMode == SelectionMode.Facets &&
        !this.hasFlag(BaseEditor.Flag.Highlighted)
      ) {
        const selection = this._partSelection as GraphPartId[];
        for (let i = 0; i < selection.length; ++i) {
          const facet = (selection[i] as GraphPartId).facet;
          if (facet) {
            const path = facet.getPath() as unknown as VertexReader | null;
            if (path) {
              const aligner = new VertexPixelAligner(
                new VertexTransformer(path, own ? own.multiplied(transform) : transform),
              );
              if (aligner) {
                canvas.putVertices(aligner, false);
                canvas.strokeVertices(
                  color || context.selectionSecondOutlineColor,
                  EditorOptions.outlineWidth,
                );
              }
            }
          }
        }
      }
    } else if (this._pbEditor) {
      let outlineColor =
        color ||
        (this.hasFlag(BaseEditor.Flag.Highlighted)
          ? context.highlightOutlineColor
          : context.selectionOutlineColor);
      if (!color && this._selectionMode == SelectionMode.Edge) {
        outlineColor = context.selectionSecondOutlineColor;
      }
      this._pbEditor._paintOutline(
        own ? own.multiplied(transform) : transform,
        context,
        noVertices,
        outlineColor,
      );
    }
  }

  /**
   * Calls `visitor` for each anchor point of `pathBase` with its position,
   * its handle kind and, next to selected points, its handle positions;
   * mapped by the path base's transform and `transform`. A visitor
   * returning true stops the walk.
   */
  _iteratePoints(
    pathBase: PathBase,
    transform: Transform | null,
    visitor: (info: GraphPointInfo) => unknown,
  ): void {
    const points = pathBase.getAnchorPoints();
    const own = pathBase.getTransform();
    if (own) transform = transform ? own.multiplied(transform) : own;
    for (
      let point = points.getFirstChild() as AnchorPoint | null;
      null != point;
      point = point.getNext() as AnchorPoint | null
    ) {
      const previous = points.getPreviousPoint(point) as AnchorPoint | null;
      const next = points.getNextPoint(point) as AnchorPoint | null;
      const type = point.getProperty("tp");
      const info: GraphPointInfo = {
        type: type,
        anchorPoint: point,
        position: pointOf(point),
        annotation: EditorOptions.annotationHandles.path.node.straightType,
        leftHandlePosition: null,
        rightHandlePosition: null,
      };
      if (
        type === AnchorPoint.Type.Asymmetric ||
        type === AnchorPoint.Type.Symmetric ||
        type === AnchorPoint.Type.Mirror ||
        type === AnchorPoint.Type.Connector
      ) {
        info.annotation = EditorOptions.annotationHandles.path.node.smoothType;
        if (true === point.getProperty("ah")) {
          info.annotation = EditorOptions.annotationHandles.path.node.autoType;
        }
      }
      if (point.hasFlag(NodeFlag.Selected) || (previous && previous.hasFlag(NodeFlag.Selected))) {
        const handle = new Point(
          point.getProperty("hlx") as number,
          point.getProperty("hly") as number,
        );
        if (null !== handle.getX() && null !== handle.getY()) info.leftHandlePosition = handle;
      }
      if (point.hasFlag(NodeFlag.Selected) || (next && next.hasFlag(NodeFlag.Selected))) {
        const handle = new Point(
          point.getProperty("hrx") as number,
          point.getProperty("hry") as number,
        );
        if (null !== handle.getX() && null !== handle.getY()) info.rightHandlePosition = handle;
      }
      if (transform) {
        info.position = transform.mapPoint(info.position);
        if (info.leftHandlePosition) {
          info.leftHandlePosition = transform.mapPoint(info.leftHandlePosition);
        }
        if (info.rightHandlePosition) {
          info.rightHandlePosition = transform.mapPoint(info.rightHandlePosition);
        }
      }
      if (true === visitor(info)) break;
    }
  }

  getGraph(): EditedPathsGraph {
    return this._element;
  }

  /**
   * Copied from GPathEditor: reads the element's anchor points, which a
   * paths graph doesn't have, so it throws for a single selected part;
   * see "Paths graph editor path-only methods" in QUESTIONS.md.
   */
  getPointsSelectionType(): string {
    let type: string = PointsSelectionType.No;
    if (this._partSelection && !this.hasFlag(BoxEditor.Flag.ResizeAll)) {
      if (this._partSelection.length > 1) type = PointsSelectionType.Several;
      else if (
        ((this._partSelection[0] as GraphPartId).point as GraphPoint).hasFlag(NodeFlag.Selected)
      ) {
        const point = (this._partSelection[0] as GraphPartId).point;
        const points = (
          this._element as unknown as { getAnchorPoints(): AnchorPoints }
        ).getAnchorPoints();
        type =
          point === points.getLastChild()
            ? PointsSelectionType.Last
            : point === points.getFirstChild()
              ? PointsSelectionType.First
              : PointsSelectionType.Middle;
      }
    }
    return type;
  }

  selectOnePoint(point: GraphPoint): void {
    this.updatePartSelection(false, [{ type: PartType.Point, point: point }]);
  }

  override isPartSelectionUnderCollisionAllowed(): boolean {
    return true;
  }

  /**
   * Selects (or with `highlight` highlights) the anchors inside the
   * collision area `area`; with `toggle` adds to the selection.
   */
  override updatePartSelectionUnderCollision(
    toggle: unknown,
    area?: unknown,
    highlight?: unknown,
  ): boolean {
    const anchors = this._element.getAnchors();
    const own = this._element.getTransform();
    const hit: GraphPartId[] = [];
    const missed: GraphPartId[] = [];
    this.requestInvalidation();
    for (
      let anchor = anchors.getFirstChild() as PGAnchor | null;
      null != anchor;
      anchor = anchor.getNext() as PGAnchor | null
    ) {
      if (!highlight && anchor.hasFlag(NodeFlag.Highlighted)) {
        anchor.removeFlag(NodeFlag.Highlighted);
      }
      let point = anchor.getPoint();
      point = own ? own.mapPoint(point) : point;
      if (
        !VertexInfo.hitTest(point.getX(), point.getY(), area as VertexReader, 0, true) ||
        (!highlight && toggle && anchor.hasFlag(NodeFlag.Selected))
      ) {
        if (
          highlight &&
          anchor.hasFlag(NodeFlag.Highlighted) &&
          !(toggle && anchor.hasFlag(NodeFlag.Selected))
        ) {
          missed.push({ type: PartType.Anchor, point: anchor });
        }
      } else hit.push({ type: PartType.Anchor, point: anchor });
    }
    if (hit.length && !this._element.hasFlag(NodeFlag.Selected)) {
      if (highlight) {
        if (!this._element.hasFlag(NodeFlag.Highlighted)) {
          this._element.setFlag(NodeFlag.Highlighted);
        }
      } else this._element.setFlag(NodeFlag.Selected);
    }
    if (highlight) {
      if (toggle && this._partSelection && this._partSelection.length) {
        for (let i = 0; i < this._partSelection.length; ++i) {
          const part = this._partSelection[i] as GraphPartId;
          if (
            part.type == PartType.Anchor &&
            !(part.point as GraphPoint).hasFlag(NodeFlag.Highlighted)
          ) {
            (part.point as GraphPoint).setFlag(NodeFlag.Highlighted);
          }
        }
      }
      for (let i = 0; i < hit.length; ++i) {
        const part = hit[i] as GraphPartId;
        if (
          part.type == PartType.Anchor &&
          !(part.point as GraphPoint).hasFlag(NodeFlag.Highlighted)
        ) {
          (part.point as GraphPoint).setFlag(NodeFlag.Highlighted);
        }
      }
      for (let i = 0; i < missed.length; ++i) {
        const part = missed[i] as GraphPartId;
        if (
          part.type == PartType.Anchor &&
          (part.point as GraphPoint).hasFlag(NodeFlag.Highlighted)
        ) {
          (part.point as GraphPoint).removeFlag(NodeFlag.Highlighted);
        }
      }
      this.requestInvalidation();
    } else {
      if (this._element.hasFlag(NodeFlag.Highlighted)) {
        this._element.removeFlag(NodeFlag.Highlighted);
      }
      this.updatePartSelection(toggle, hit);
    }
    // The old value: the selection length (or the falsy selection), not a
    // boolean. The cast keeps the base signature; the callers in editor.ts
    // only test the result for truthiness.
    return (this._partSelection && this._partSelection.length) as unknown as boolean;
  }

  /** An edge can always be deleted; anchors while at least one would remain. */
  override isDeletePartsAllowed(): boolean {
    let allowed = false;
    if (
      this._partSelection &&
      this._partSelection.length &&
      !this.hasFlag(BoxEditor.Flag.ResizeAll)
    ) {
      if (this._selectionMode == SelectionMode.Edge) allowed = true;
      else if (this._selectionMode == SelectionMode.Anchors) {
        let selected = 0;
        for (let i = 0; i < this._partSelection.length; ++i) {
          if ((this._partSelection[i] as GraphPartId).type == PartType.Anchor) ++selected;
        }
        if (selected) {
          let count = 0;
          for (
            let anchor = this._element.getAnchors().getFirstChild();
            null != anchor;
            anchor = anchor.getNext(), ++count
          );
          if (count > selected) allowed = true;
        }
      }
    }
    return allowed;
  }

  /**
   * Removes the selected anchors, or in edge mode the edge of the first
   * edge part only (the old loop breaks after it; see "Paths graph edge
   * delete removes only the first edge" in QUESTIONS.md).
   */
  override deletePartsSelected(): void {
    if (
      this._partSelection &&
      this._partSelection.length &&
      !this.hasFlag(BoxEditor.Flag.ResizeAll)
    ) {
      this.requestInvalidation();
      if (this._selectionMode == SelectionMode.Edge) {
        try {
          this._element.prepareFacetsUpdate();
          for (let i = 0; i < this._partSelection.length; ++i) {
            const part = this._partSelection[i] as GraphPartId;
            if (part.type == PartType.Segment || part.type == PartType.Point) {
              this._closePBEditor(false);
              this._element.removeEdge(part.edge as PGEdge);
              break;
            }
          }
          this._partSelection = null;
        } finally {
          this._element.finishFacetsUpdate();
        }
      } else if (this._selectionMode == SelectionMode.Anchors) {
        try {
          this._element.prepareFacetsUpdate();
          for (let i = 0; i < this._partSelection.length; ++i) {
            const part = this._partSelection[i] as GraphPartId;
            if (part.type == PartType.Anchor) this._element.removeAnchor(asGraphAnchor(part.point));
          }
          this._partSelection = null;
        } finally {
          this._element.finishFacetsUpdate();
        }
      }
    }
  }

  override isAlignPartsAllowed(): boolean {
    let allowed = false;
    if (
      this._partSelection &&
      this._partSelection.length &&
      !this.hasFlag(BoxEditor.Flag.ResizeAll) &&
      this._selectionMode == SelectionMode.Anchors
    ) {
      for (let i = 0; i < this._partSelection.length && !allowed; ++i) {
        if ((this._partSelection[i] as GraphPartId).type == PartType.Anchor) allowed = true;
      }
    }
    return allowed;
  }

  /** Moves the selected anchors to `x` and/or `y` (scene; null keeps the coordinate). */
  override alignParts(alignment: unknown, x?: unknown, y?: unknown): void {
    if (
      this._partSelection &&
      this._partSelection.length &&
      !this.hasFlag(BoxEditor.Flag.ResizeAll) &&
      this._selectionMode == SelectionMode.Anchors
    ) {
      this._createPathPreviewIfNecessary();
      const own = this._element.getTransform();
      this.requestInvalidation();
      const firstLinks = Object.create(null) as EdgeMap;
      const lastLinks = Object.create(null) as EdgeMap;
      this._updateFirstPtELinks = firstLinks;
      this._updateLastPtELinks = lastLinks;
      for (let i = 0; i < this._partSelection.length; ++i) {
        const part = this._partSelection[i] as GraphPartId;
        if (part.type === PartType.Anchor) {
          const anchor = asGraphAnchor(part.point);
          let point = anchor.getPoint();
          if (own) point = own.mapPoint(point);
          let target = new Point(
            null !== x ? (x as number) : point.getX(),
            null !== y ? (y as number) : point.getY(),
          );
          if (own) target = (own.inverted() as Transform).mapPoint(target);
          const previewAnchor = (this._elementPreview as EditedPathsGraph)
            .getAnchors()
            .getById(idOf(anchor));
          const inEdges = anchor.getInEdges();
          for (let j = 0; j < inEdges.length; ++j) {
            const edge = inEdges[j] as PGEdge;
            lastLinks[idOf(edge)] = edge;
          }
          const outEdges = anchor.getOutEdges();
          for (let j = 0; j < outEdges.length; ++j) {
            const edge = outEdges[j] as PGEdge;
            firstLinks[idOf(edge)] = edge;
          }
          if (previewAnchor)
            (previewAnchor as PGAnchor).setProperties(["x", "y"], [target.getX(), target.getY()]);
        }
      }
      this.applyTransform(undefined);
    }
  }

  override validateSelectionChange(): boolean {
    return true;
  }

  /** Constrains `position` (view) to the cursor angles around `point` (mapped by `transform`). */
  constrainPosition(position: Point, transform: Transform, point: Node): Point {
    let start = pointOf(point);
    let matrix = this._element.getTransform();
    matrix = matrix ? matrix.multiplied(transform) : transform;
    start = matrix.mapPoint(start);
    const constrained = Editor.convertToConstrain(
      start.getX(),
      start.getY(),
      position.getX(),
      position.getY(),
      EditorOptions.cursorConstraint,
    );
    this._constrainPair = [start, constrained];
    return constrained;
  }

  /** The graph preview (a clone), made on first use. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  _createPathPreviewIfNecessary(point?: unknown): EditedPathsGraph | null {
    if (!this._elementPreview) this._setElementPreview(this._element.clone() as EditedPathsGraph);
    return this._elementPreview;
  }

  releasePreview(): void {
    this._setElementPreview(null);
    this._constrainPair = null;
    if (this._pbEditor) this._pbEditor.releasePathBasePreview();
  }

  /** The preview of anchor point `point` of the edge in edit, or null. */
  getPathPointPreview(point: Node): AnchorPoint | null {
    return this._pbEditor ? this._pbEditor.getPointPreview(point) : null;
  }

  getTransformFromNative(transform?: Transform | null): Transform {
    let matrix = this._element.getTransform();
    if (transform) matrix = matrix ? matrix.multiplied(transform) : transform;
    if (!matrix) matrix = new Transform();
    return matrix;
  }

  /**
   * Moves `point` to `position` (scene, mapped by `transform`); its
   * handles (read from `source` when given) move along unless they are
   * automatic.
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
        const mapped = matrix.mapPoint(pointOf(from));
        const dx = position.getX() - mapped.getX();
        const dy = position.getY() - mapped.getY();
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

  /** The scene position of `point` (an anchor or an edge point). */
  getPointCoord(point: Node): Point {
    let coord = pointOf(point);
    const own = this._element.getTransform();
    if (own) coord = own.mapPoint(coord);
    return coord;
  }

  /** Highlights `part` when it is not selected (painted once by _paintOutline). */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  highlightPart(part: GraphPartId, extra?: unknown): void {
    if (!(
      this.hasFlag(BoxEditor.Flag.ResizeAll) ||
      (((part.type != PartType.Segment && part.type != PartType.Point) ||
        (part.edge as PGEdge).hasFlag(NodeFlag.Selected)) &&
        (part.type != PartType.Anchor || (part.point as GraphPoint).hasFlag(NodeFlag.Selected)) &&
        (part.type != PartType.Facet || (part.facet as PGFacet).hasFlag(NodeFlag.Selected)))
    )) {
      this._highlightPart = part;
      this.requestInvalidation();
    }
  }

  /**
   * Moves the `xName`/`yName` coordinates of `point`'s preview to
   * `position` (view; `viewToWorld` maps it), constrained with `shift`.
   */
  _movePreviewPointCoordinates(
    point: AnchorPoint,
    xName: string,
    yName: string,
    position: Point,
    viewToWorld: Transform,
    shift: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
    guides?: unknown,
  ): void {
    let target = position;
    if (shift) {
      const worldToView = viewToWorld.inverted() as Transform;
      target = this.constrainPosition(position, worldToView, point);
    }
    target = viewToWorld.mapPoint(target);
    const own = this._element.getTransform();
    let current = new Point(point.getProperty(xName) as number, point.getProperty(yName) as number);
    if (own) current = own.mapPoint(current);
    this._transformPreviewPointCoordinates(
      point,
      xName,
      yName,
      new Transform(1, 0, 0, 1, target.getX() - current.getX(), target.getY() - current.getY()),
    );
  }

  /**
   * Transforms the `xName`/`yName` coordinates of `point`'s preview (from
   * `origin`, else from the point) by `transform` in scene coordinates.
   * Moving a handle turns automatic handles off.
   */
  _transformPreviewPointCoordinates(
    point: AnchorPoint,
    xName: string,
    yName: string,
    transform: Transform,
    origin?: Point | null,
  ): void {
    const own = this._element.getTransform();
    const preview = this.getPathPointPreview(point);
    if (preview) {
      const start = origin
        ? origin
        : new Point(point.getProperty(xName) as number, point.getProperty(yName) as number);
      let matrix = transform;
      if (own) {
        matrix = transform.multiplied(own.inverted() as Transform);
        matrix = own.multiplied(matrix);
      }
      const moved = matrix.mapPoint(start);
      const names: string[] = [xName, yName];
      const values: unknown[] = [moved.getX(), moved.getY()];
      if ("hlx" === xName || "hrx" === xName || "hly" === yName || "hry" === yName) {
        names.push("ah");
        values.push(false);
      }
      preview.setProperties(names, values);
    }
  }

  _assignPreviewPointPropertiesToSourcePoint(point: AnchorPoint, names: string[]): void {
    const preview = this.getPathPointPreview(point);
    if (preview) point.setProperties(names, preview.getProperties(names));
  }

  /** Copies the preview geometry of `point` (of the edge in edit) to the same point of `target`. */
  _transferPreviewProperties(point: AnchorPoint, target: unknown): void {
    if (target instanceof PathBase) {
      const index = (this._pathBaseInEdit as PathBase).getAnchorPoints().getIndexOfChild(point);
      const targetPoint = target.getAnchorPoints().getChildByIndex(index) as AnchorPoint;
      const preview = this.getPathPointPreview(targetPoint);
      if (preview) targetPoint.transferProperties(preview, [AnchorPoint.GeometryProperties]);
    }
  }

  /** Drops edge points next to selected segments of the same points. */
  _filterSelection(selection: GraphPartId[] | null): GraphPartId[] | null {
    if (!selection) return null;
    const filtered: GraphPartId[] = [];
    for (let i = 0; i < selection.length; ++i) {
      const part = selection[i] as GraphPartId;
      if (part.type != PartType.Point) filtered.push(part);
      else {
        let keep = true;
        for (let j = 0; j < selection.length; ++j) {
          const other = selection[j] as GraphPartId;
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
    if (event.type == GeometryChangeEvent.Type.Before && event.element == this._element) {
      this.requestInvalidation();
    } else if (event.type == GeometryChangeEvent.Type.After && event.element == this._element) {
      if (this._elementPreview || this._pbEditor) {
        this.releasePreview();
        if (this._pbEditor) {
          this._closePBEditor(true);
          this.setActiveExtendingMode(PathBaseEditor.ExtendingMode.Off);
        }
      }
      this.requestInvalidation();
    }
  }

  /** A border added to or removed from a selected edge sets its custom style flag (`cSt`). */
  _checkCustomStyle(event: { temporary?: unknown; node: unknown }): void {
    if (!event.temporary && event.node instanceof PaintLayer) {
      const parts = this.getStylableParts() as PGEdge[] | undefined;
      if (parts) {
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i] as PGEdge;
          if (part === (event.node.getOwnerStylable() as unknown as PGEdge)) {
            part.setProperty(
              "cSt",
              !!(part.getPaintLayers() as PaintLayers).getBorderLayers().length,
            );
            break;
          }
        }
      }
    }
  }

  /**
   * Applies the preview of the changed parts to the graph. In edge mode
   * the edge gets the new path base, or is removed and added again as a
   * graph line when the new curve crosses itself or another edge (or a
   * dragged end left its anchor). In anchor mode the moved and attached
   * edges get their preview path bases the same way and the anchors their
   * preview positions.
   */
  _partsGeometryChanged(parts: GraphPartId[]): void {
    this.requestInvalidation();
    try {
      this._element.prepareFacetsUpdate();
      const intersector = new PolyIntersector();
      // `relink` of the old loop below; the crossing check stops its edge
      // loop on it, which never fires because it is false whenever the
      // check runs (kept from the old code).
      let relink: boolean | undefined;
      const crosses = (graph: EditedPathsGraph, edgeId: string, line: PathBase): boolean => {
        let crossing = false;
        const pieces: PathBase[] = [];
        graph._splitPathLineAtSelfIntersections(line, pieces);
        if (1 == pieces.length) {
          let segments = 0;
          for (
            let point = (line.getAnchorPoints().getFirstChild() as Node).getNext();
            null != point;
            point = point.getNext(), ++segments
          );
          for (
            let edge = graph.getEdges().getFirstChild() as PGEdge | null;
            null != edge && !relink;
            edge = edge.getNext() as PGEdge | null
          ) {
            if (edgeId != idOf(edge)) {
              const intersections = intersector.intersect(
                line as unknown as VertexReader,
                edge.getPathBase() as unknown as VertexReader,
                false,
              );
              if (intersections && intersections.length) {
                for (let i = 0; i < intersections.length && !crossing; ++i) {
                  const intersection = intersections[i] as NonNullable<
                    typeof intersections
                  >[number];
                  if (!(
                    (1 == intersection.polySeg0.seg && GMath.isEqualEps(intersection.slope0, 0)) ||
                    (intersection.polySeg0.seg == segments &&
                      GMath.isEqualEps(intersection.slope0, 1))
                  )) {
                    crossing = true;
                  }
                }
              }
            }
          }
        } else crossing = true;
        return crossing;
      };
      if (
        this._selectionMode == SelectionMode.Edge ||
        (1 == parts.length &&
          (parts[0] as GraphPartId).type == PartType.Segment &&
          this._transformSubType == SegmentData.Handles)
      ) {
        for (let n = 0; n < parts.length; ++n) {
          const part = parts[n] as GraphPartId;
          if (
            (part.type == PartType.LeftHandle ||
              part.type == PartType.RightHandle ||
              part.type == PartType.Point ||
              part.type == PartType.Segment) &&
            this._pbEditor
          ) {
            relink = false;
            const edge = part.edge as PGEdge;
            let keepStart = true;
            let keepEnd = true;
            if (part.type == PartType.Segment && this._transformSubType != SegmentData.Handles) {
              const points = edge.getPathBase().getAnchorPoints();
              if (points.getFirstChild() == part.apLeft) {
                keepStart = false;
                relink = true;
              }
              if (points.getLastChild() == part.apRight) {
                keepEnd = false;
                relink = true;
              }
            } else if (part.type == PartType.Point) {
              if (edge.getPathBase().getAnchorPoints().getFirstChild() == part.point) {
                keepStart = false;
                relink = true;
              } else if (edge.getPathBase().getAnchorPoints().getLastChild() == part.point) {
                keepEnd = false;
                relink = true;
              }
            }
            const edited = this._pbEditor.getPaintElement() as unknown as PathBase;
            if (!relink) relink = crosses(this._element, idOf(edge), edited);
            const line = new PathBase(false, edited.cloneAnchorPoints());
            if (relink) {
              let start: GraphPosition | null = null;
              let end: GraphPosition | null = null;
              if (keepStart) {
                const source = edge.getSource() as PGAnchor;
                start = new GraphPosition(
                  GraphPosition.PosType.Anchor,
                  new GraphPosition.AnchorSpec(source),
                );
              }
              if (keepEnd) {
                const destination = edge.getDestination() as PGAnchor;
                end = new GraphPosition(
                  GraphPosition.PosType.Anchor,
                  new GraphPosition.AnchorSpec(destination),
                );
              }
              this._element.removeEdge(edge);
              this._element.addGraphLine(line, start, end, edge);
              this.requestInvalidation();
              this._closePBEditor(true);
              this.updatePartSelection(false, null);
            } else {
              edge.setPathBase(line);
              this.requestInvalidation();
              this._closePBEditor(false);
              this._initPBEditor(edge.getPathBase());
              this.requestInvalidation();
            }
          }
        }
      } else if (
        this._selectionMode == SelectionMode.Anchors &&
        (this._moveEdgesLinks || this._updateLastPtELinks || this._updateFirstPtELinks)
      ) {
        this._element._beginBlockEvents([GeometryChangeEvent]);
        const preview = this._elementPreview as EditedPathsGraph;
        const relinked = Object.create(null) as EdgeMap;
        const moved = this._moveEdgesLinks || ({} as EdgeMap);
        for (const id in moved) {
          const edge = moved[id] as PGEdge;
          const previewEdge = preview.getEdges().getById(idOf(edge)) as PGEdge | null;
          if (previewEdge) {
            if (crosses(preview, id, previewEdge.getPathBase())) {
              relinked[id] = edge;
              this._element.removeEdge(edge);
            } else {
              const line = new PathBase(false, previewEdge.getPathBase().cloneAnchorPoints());
              edge.setPathBase(line);
            }
          }
        }
        const followEnd = (edge: PGEdge, first: boolean): void => {
          const previewEdge = preview.getEdges().getById(idOf(edge)) as PGEdge | null;
          if (previewEdge) {
            const previewPathBase = previewEdge.getPathBase();
            const pathBase = edge.getPathBase();
            if (first) {
              const from = previewPathBase.getAnchorPoints().getFirstChild() as AnchorPoint;
              (pathBase.getAnchorPoints().getFirstChild() as AnchorPoint).setProperties(
                ["x", "y", "hrx", "hry"],
                [
                  from.getProperty("x"),
                  from.getProperty("y"),
                  from.getProperty("hrx"),
                  from.getProperty("hry"),
                ],
              );
            } else {
              const from = previewPathBase.getAnchorPoints().getLastChild() as AnchorPoint;
              (pathBase.getAnchorPoints().getLastChild() as AnchorPoint).setProperties(
                ["x", "y", "hlx", "hly"],
                [
                  from.getProperty("x"),
                  from.getProperty("y"),
                  from.getProperty("hlx"),
                  from.getProperty("hly"),
                ],
              );
            }
          }
        };
        const firstLinks = this._updateFirstPtELinks || ({} as EdgeMap);
        for (const id in firstLinks) {
          const edge = firstLinks[id] as PGEdge;
          const previewEdge = preview.getEdges().getById(idOf(edge)) as PGEdge | null;
          if (previewEdge) {
            if (crosses(preview, id, previewEdge.getPathBase())) {
              relinked[id] = edge;
              this._element.removeEdge(edge);
            } else followEnd(edge, true);
          }
        }
        const lastLinks = this._updateLastPtELinks || ({} as EdgeMap);
        for (const id in lastLinks) {
          const edge = lastLinks[id] as PGEdge;
          const previewEdge = preview.getEdges().getById(idOf(edge)) as PGEdge | null;
          if (previewEdge) {
            if (crosses(preview, id, previewEdge.getPathBase())) {
              relinked[id] = edge;
              this._element.removeEdge(edge);
            } else followEnd(edge, false);
          }
        }
        const relinkedIds = Object.keys(relinked);
        for (let n = 0; n < parts.length; ++n) {
          const anchor = asGraphAnchor((parts[n] as GraphPartId).point);
          const previewAnchor = preview.getAnchors().getById(idOf(anchor));
          if (!(n != parts.length - 1 || relinkedIds.length)) {
            this._element._endBlockEvents([GeometryChangeEvent]);
          }
          if (previewAnchor) {
            anchor.setProperties(
              ["x", "y"],
              [
                (previewAnchor as PGAnchor).getProperty("x"),
                (previewAnchor as PGAnchor).getProperty("y"),
              ],
            );
          }
        }
        for (let n = 0; n < relinkedIds.length; ++n) {
          const edge = relinked[relinkedIds[n] as string] as PGEdge;
          const previewEdge = preview.getEdges().getById(idOf(edge)) as PGEdge | null;
          if (previewEdge) {
            const line = new PathBase(false, previewEdge.getPathBase().cloneAnchorPoints());
            const source = this._element
              .getAnchors()
              .getById(edge.getSourceId() as unknown as string) as PGAnchor;
            const destination = this._element
              .getAnchors()
              .getById(edge.getDestinationId() as unknown as string) as PGAnchor;
            if (n == relinkedIds.length - 1) this._element._endBlockEvents([GeometryChangeEvent]);
            this._element.addGraphLine(
              line,
              new GraphPosition(GraphPosition.PosType.Anchor, new GraphPosition.AnchorSpec(source)),
              new GraphPosition(
                GraphPosition.PosType.Anchor,
                new GraphPosition.AnchorSpec(destination),
              ),
              edge,
            );
          }
        }
      }
    } finally {
      this._element.finishFacetsUpdate();
    }
  }

  /** Rebuilds the part selection from the Selected flags of anchors, edges and facets. */
  _ensureConsistentSelection(): void {
    this._selectionMode = SelectionMode.None;
    const parts: PartInfo[] = [];
    for (
      let anchor = this._element.getAnchors().getFirstChild();
      null != anchor;
      anchor = anchor.getNext()
    ) {
      if (anchor.hasFlag(NodeFlag.Selected)) {
        parts.push(new PartInfo(this, { type: PartType.Anchor, point: anchor }, null, false, true));
      }
    }
    for (let edge = this._element.getEdges().getFirstChild(); null != edge; edge = edge.getNext()) {
      if (edge.hasFlag(NodeFlag.Selected)) {
        parts.push(
          new PartInfo(
            this,
            { type: PartType.Segment, edge: edge, apLeft: null, apRight: null },
            {},
            false,
            true,
          ),
        );
      }
    }
    for (
      let facet = this._element.getFacets().getFirstChild();
      null != facet;
      facet = facet.getNext()
    ) {
      if (facet.hasFlag(NodeFlag.Selected)) {
        parts.push(new PartInfo(this, { type: PartType.Facet, facet: facet }, {}, false, false));
      }
    }
    // The old code passed PartInfos, not part ids (see "Paths graph
    // editor restores PartInfos as part ids" in QUESTIONS.md).
    this.updatePartSelection(false, parts);
  }

  /** Opens a detached, selected path base editor for `pathBase` (the edge in edit). */
  _initPBEditor(pathBase: PathBase): void {
    this._pathBaseInEdit = pathBase;
    this._pbEditor = ElementEditor.openEditor(this._pathBaseInEdit, true) as PathBaseEditor;
    this._pbEditor.setFlag(BaseEditor.Flag.Selected);
    this._pbEditor.removeFlag(BoxEditor.Flag.ResizeAll);
    this._pbEditor.setCatchHandle(false);
    this._pbEditor.setFlag(BaseEditor.Flag.HideEditor);
  }

  /** Closes the path base editor; `clearParts` clears its part selection first. */
  _closePBEditor(clearParts: unknown): void {
    if (this._pbEditor && this._pathBaseInEdit) {
      this.requestInvalidation();
      this._pbEditor.requestInvalidation();
      if (clearParts) this._pbEditor.updatePartSelection(false, null);
      this._pbEditor = null;
      ElementEditor.closeElementEditor(this._pathBaseInEdit);
      this._pathBaseInEdit = null;
      this.requestInvalidation();
    }
  }

  override toString(): string {
    return "[Object GPathsGraphEditor]";
  }
}

Object.assign(PathsGraphEditor.prototype, {
  _pathBaseInEdit: null,
  _startAnchor: null,
  _selectionMode: null,
  _editMode: false,
  _highlightPart: null,
  _moveEdgesLinks: null,
  _updateFirstPtELinks: null,
  _updateLastPtELinks: null,
  _transformSubType: null,
  _constrainPair: null,
  _constrainPainted: false,
  _activeExtendingMode: false,
});
