// Old: chunk.vendor.js module 656 (GPGFacet).
/**
 * A closed region of the paths graph, bounded by a cycle of directed
 * edges (an edge walked forwards or backwards). It builds a closed path
 * from the edge curves and fills it with its own copy of the graph's
 * style. Saved as `props: [uid, cSt, {dir, euid}, ...]`.
 */
import { Color } from "../../color/color.ts";
import { RGBColor } from "../../color/rgb-color.ts";
import { registerClass } from "../../core/object.ts";
import { Uid } from "../../core/uid.ts";
import { each } from "../../core/util.ts";
import { HitResult } from "../../geometry/hit-result.ts";
import { VertexInfo } from "../../geometry/vertex-info.ts";
import { Point } from "../../math/point.ts";
import type { Rect } from "../../math/rect.ts";
import type { Transform } from "../../math/transform.ts";
import { Canvas2DPaintCanvas, type PaintStyle } from "../../paint/paint-canvas.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import type { PaintLayers } from "../../style/paint-layers.ts";
import { Stylable } from "../../style/stylable.ts";
import { PropertySet } from "../../style/stylable-sets.ts";
import type { AnchorId } from "../anchor.ts";
import { CompoundPath } from "../compound-path.ts";
import { ElementChange } from "../element-change.ts";
import { NodeChange } from "../node-change.ts";
import { Container, type ContainerNode } from "../node-container.ts";
import { Multireference } from "../node-identity.ts";
import { Properties } from "../node-properties.ts";
import { Store } from "../node-store.ts";
import { MapContainer, Node, registerNodeClass } from "../node.ts";
import { AnchorPoint, AnchorPoints, PathBase } from "../path-base.ts";
import { Path } from "../path.ts";
import type { SceneHooks } from "../scene-node.ts";
import type { Shape, ShapePaintContext } from "../shape.ts";
import { EdgeLink } from "./edge-link.ts";
import { PGEdge } from "./pg-edge.ts";

const GeometryProperties = {
  uid: null,
  cSt: false,
};

const Direction = {
  Straight: 1,
  Reverse: 2,
} as const;

const DirectedEdgeGeometryProperties = {
  direction: Direction.Straight,
};

/** GPGFacet.DirectedEdge: an edge of the facet's boundary and the way it is walked. */
export class DirectedEdge extends Properties(Node) {
  static {
    registerClass(this, "GPGFacet.DirectedEdge");
  }

  static Direction = Direction;
  static GeometryProperties: Readonly<Record<string, unknown>> = DirectedEdgeGeometryProperties;

  declare $direction: number;
  declare _edge: EdgeLink<PGEdge> | null;

  /** The defaults are never applied; the constructor sets the direction itself. */
  constructor(edge: EdgeLink<PGEdge> | PGEdge, direction?: number) {
    super();
    this.$direction = direction || Direction.Straight;
    this.updateEdge(edge);
  }

  getEdge(): PGEdge {
    return (this._edge as EdgeLink<PGEdge>).getEdge() as PGEdge;
  }

  /** A link is kept, an edge gets a new link. */
  updateEdge(edge: EdgeLink<PGEdge> | PGEdge): void {
    if (edge instanceof EdgeLink) this._edge = edge;
    else if (edge instanceof PGEdge) this._edge = new EdgeLink<PGEdge>(null, edge);
  }

  getEdgeId(): AnchorId | null {
    return (this._edge as EdgeLink<PGEdge>).getId();
  }

  getStartPoint(): Point {
    const pathBase = this.getEdge().getPathBase();
    const point = (
      this.$direction == Direction.Straight
        ? pathBase.getAnchorPoints().getFirstChild()
        : pathBase.getAnchorPoints().getLastChild()
    ) as AnchorPoint;
    return new Point(point.getProperty("x") as number, point.getProperty("y") as number);
  }

  getEndPoint(): Point {
    const pathBase = this.getEdge().getPathBase();
    const point = (
      this.$direction == Direction.Straight
        ? pathBase.getAnchorPoints().getLastChild()
        : pathBase.getAnchorPoints().getFirstChild()
    ) as AnchorPoint;
    return new Point(point.getProperty("x") as number, point.getProperty("y") as number);
  }

  override validateInsertion(parent: ContainerNode): boolean {
    return parent instanceof DirectedEdges;
  }

  override toString(): string {
    return "[Object GPGFacet.DirectedEdge]";
  }
}

DirectedEdge.prototype._edge = null;

/** GPGFacet.DirectedEdges: the boundary of a facet, in walking order. */
export class DirectedEdges extends Container(Node) {
  static {
    registerClass(this, "GPGFacet.DirectedEdges");
  }

  override getFirstChild(): DirectedEdge | null {
    return super.getFirstChild() as DirectedEdge | null;
  }

  override toString(): string {
    return "[Object GPGFacet.DirectedEdges]";
  }
}

/** True when the parent is the paths graph that owns this node's container. */
function graphOf(node: Node): Node | null {
  const parent = node._parent;
  return parent instanceof MapContainer &&
    parent.getParent() &&
    "Paths Graph" === Node.getName(parent.getParent())
    ? (parent.getParent() as Node)
    : null;
}

/** The facet's region: a closed path, or a compound path once holes were added. */
type FacetPath = Path | CompoundPath;

export class PGFacet extends Multireference(Stylable(Properties(Store(Node)))) {
  static {
    registerNodeClass(this, "GPGFacet", "GPGFacet");
  }

  static GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static DirectedEdge = DirectedEdge;
  static DirectedEdges = DirectedEdges;

  declare $uid: Uid;
  declare $cSt: boolean;
  declare _directedEdges: DirectedEdges;
  declare _path: FacetPath | null;
  /** Set by the graph before painting. */
  declare _scene: SceneHooks | null;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
    this.$uid = new Uid();
    this._init();
  }

  getId(): Uid {
    return this.$uid;
  }

  override validateInsertion(parent: ContainerNode): boolean {
    return (
      parent instanceof MapContainer &&
      (!parent.getParent() || "Paths Graph" === Node.getName(parent.getParent()))
    );
  }

  override getStylePropertySets(): string[] {
    return [PropertySet.BorderPaintLayers, PropertySet.FillPaintLayers];
  }

  /**
   * Takes the cycle and builds the closed path. False (and nothing kept)
   * when it is empty or not closed. Quirk kept: two points only count as
   * different when both x and y differ.
   */
  init(edges: readonly DirectedEdge[] | null | undefined): boolean {
    this._init();
    if (!edges || !edges.length) return false;
    let start: Point | null = null;
    let end: Point | null = null;
    for (let i = 0; i < edges.length; ++i) {
      const edge = edges[i] as DirectedEdge;
      this._directedEdges.appendChild(edge);
      if (end) {
        const next = edge.getStartPoint();
        if (next.getX() != end.getX() && next.getY() != end.getY()) {
          this._init();
          return false;
        }
      } else start = edge.getStartPoint();
      end = edge.getEndPoint();
    }
    const first = start as Point;
    const last = end as Point;
    if (first.getX() != last.getX() && first.getY() != last.getY()) {
      this._init();
      return false;
    }
    const points = new AnchorPoints();
    let startHrx: unknown = null;
    let startHry: unknown = null;
    for (
      let directed = this._directedEdges.getFirstChild();
      directed;
      directed = directed.getNext() as DirectedEdge | null
    ) {
      const piece = new PathBase();
      piece
        .getAnchorPoints()
        .deserialize(directed.getEdge().getPathBase().getAnchorPoints().serialize());
      if (directed.$direction == Direction.Reverse) piece.reverseOrder();
      const head = piece.getAnchorPoints().getFirstChild() as AnchorPoint;
      piece.getAnchorPoints().removeChild(head);
      if (points.getFirstChild()) {
        (points.getLastChild() as AnchorPoint).setProperties(
          ["ah", "tp", "hrx", "hry"],
          [false, AnchorPoint.Type.Asymmetric, head.getProperty("hrx"), head.getProperty("hry")],
        );
      } else {
        startHrx = head.getProperty("hrx");
        startHry = head.getProperty("hry");
      }
      for (
        let point = piece.getAnchorPoints().getFirstChild();
        point;
        point = piece.getAnchorPoints().getFirstChild()
      ) {
        piece.getAnchorPoints().removeChild(point);
        points.appendChild(point);
      }
      (points.getLastChild() as AnchorPoint).setProperties(
        ["ah", "tp", "hrx", "hry"],
        [false, AnchorPoint.Type.Asymmetric, startHrx, startHry],
      );
    }
    this._path = new Path(true, false, points);
    this._path.assignStyleFrom(this);
    return true;
  }

  /** The first character of every edge id, in order: a cheap key to find the same facet again. */
  getHash(): string {
    let hash = "";
    for (
      let directed = this._directedEdges.getFirstChild();
      directed;
      directed = directed.getNext() as DirectedEdge | null
    ) {
      hash += directed.getEdge().getId().toString()[0];
    }
    return hash;
  }

  /** The same edges in the same directions and order. */
  isSame(other: PGFacet): boolean {
    let same = true;
    if (!(this._directedEdges && other._directedEdges)) same = false;
    let mine = this._directedEdges.getFirstChild();
    let theirs = other._directedEdges.getFirstChild();
    for (
      ;
      null != mine && null != theirs && same;
      mine = mine.getNext() as DirectedEdge | null, theirs = theirs.getNext() as DirectedEdge | null
    ) {
      same =
        mine.getProperty("direction") == theirs.getProperty("direction") &&
        mine.getEdge().getId().toString() == theirs.getEdge().getId().toString();
    }
    if (same && ((null == mine && null != theirs) || (null != mine && null == theirs))) {
      same = false;
    }
    return same;
  }

  /** Whether `point` is inside the facet's region (not on its outline). */
  isInside(point: Point, evenOdd: boolean | null): boolean {
    if (this._path) {
      const result = new HitResult();
      if (VertexInfo.hitTest(point.getX(), point.getY(), this._path, 0, true, result, evenOdd)) {
        return !result.outline;
      }
    }
    return false;
  }

  /**
   * A copy of the region. The old class defined getPath twice; this, the
   * later one, wins. It clones through GPathBase's clone (no selection).
   */
  getPath(): FacetPath {
    return PathBase.prototype.clone.call(this._path as never) as unknown as FacetPath;
  }

  /** Turns the region into a compound path with `holes` after the outline. */
  extendPath(holes: readonly Shape[] | null | undefined): void {
    if (holes && holes.length) {
      const outline = this._path as FacetPath;
      const compound = new CompoundPath();
      this._path = compound;
      compound.assignFrom(outline);
      compound.getPaths().insertChild(outline, undefined);
      for (let i = 0; i < holes.length; ++i) compound.getPaths().appendChild(holes[i] as Shape);
    }
  }

  serialize(): unknown[] {
    const data: unknown[] = [];
    data.push(this.$uid.toString());
    data.push(this.$cSt);
    if (this._directedEdges && this._directedEdges.getFirstChild()) {
      for (
        let directed = this._directedEdges.getFirstChild();
        null != directed;
        directed = directed.getNext() as DirectedEdge | null
      ) {
        data.push({ dir: directed.$direction, euid: directed.getEdge().getId().toString() });
      }
    }
    return data;
  }

  /**
   * The edges stay links by id until the graph resolves them. Quirk kept:
   * the loop starts at index 1 (`cSt`), so the first link has a random id
   * that matches no edge; the graph drops it when it calls init.
   */
  deserialize(data: readonly unknown[]): void {
    if (data.length >= 3) {
      this.$uid = new Uid(data[0] as string);
      this.$cSt = data[1] as boolean;
      for (let i = 1; i < data.length; ++i) {
        const entry = data[i] as { euid?: string; dir?: number };
        const directed = new DirectedEdge(
          new EdgeLink<PGEdge>(new Uid(entry.euid as string)),
          entry.dir as number,
        );
        this._directedEdges.appendChild(directed);
      }
    }
  }

  getDirectedEdges(): DirectedEdges {
    return this._directedEdges;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      (args as StoreChangeArgs).blob["props"] = this.serialize();
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      if (Object.prototype.hasOwnProperty.call(blob, "props")) {
        this.deserialize(blob["props"] as unknown[]);
      }
    }
    this._handleStyleChange(change, args);
    Node.prototype._handleChange.call(this, change, args);
  }

  override _styleRepaint(): void {
    const graph = graphOf(this);
    if (graph) graph._notifyChange(ElementChange.InvalidationRequest);
  }

  override _styleFinishGeometryChange(): void {
    const graph = graphOf(this);
    if (graph) graph._notifyChange(ElementChange.FinishGeometryUpdate, 1);
  }

  _init(): void {
    this._directedEdges = new DirectedEdges();
    this._directedEdges._setParent(this as unknown as ContainerNode);
  }

  /**
   * Fills the region with each fill layer, mapped by `transform`. The
   * graph paints facets three times to hide the seams between them:
   * `seams` strokes the outline 1px (cutting out first), `cutOut` fills
   * after cutting out with half the opacity, and the plain pass fills
   * with the opacity that adds up to the layer's over two halves.
   */
  _paintFill(
    context: ShapePaintContext,
    separate: unknown,
    transform: Transform | null,
    seams?: boolean,
    cutOut?: boolean,
  ): void {
    void separate;
    const path = this._path as FacetPath;
    path._scene = this._scene;
    if (transform) path.setTransform(transform);
    if (!context.configuration.isOutline(context as never) && this.hasStyleFill()) {
      const geometry = path.getGeometryBBox() as Rect;
      each((this.getPaintLayers() as PaintLayers).getFillLayers(true), (_index, fill) => {
        const shapePaint = path.createShapePaint(context, fill.$_pt, path.getPatternBBox());
        if (shapePaint) {
          const vertices = path;
          const canvas = context.canvas;
          const half = fill.$_op / 2;
          const rest = half / (1 - half);
          let saved: Transform | null = null;
          if (void 0 !== canvas.putVertices(vertices)) {
            if (shapePaint.transform) {
              if (transform) shapePaint.transform = shapePaint.transform.multiplied(transform);
              if (fill.$_px && !fill.$_px.isIdentity()) {
                shapePaint.transform = shapePaint.transform.preMultiplied(fill.$_px);
              }
            }
            if (seams) {
              // Quirk kept: GRGBColor has no Black or White (only BLACK and
              // WHITE), so these strokes get an undefined paint.
              canvas.strokeVertices(
                (RGBColor as unknown as Record<string, PaintStyle>)["Black"] as PaintStyle,
                1,
                null,
                null,
                null,
                1,
                1,
                Canvas2DPaintCanvas.CompositeOperator.DestinationOut,
              );
              if (fill.$_pt instanceof Color) {
                canvas.strokeVertices(
                  shapePaint.paint as PaintStyle,
                  1,
                  null,
                  null,
                  null,
                  1,
                  fill.$_op,
                  Canvas2DPaintCanvas.CompositeOperator.SourceOver,
                );
              } else {
                canvas.strokeVertices(
                  (RGBColor as unknown as Record<string, PaintStyle>)["White"] as PaintStyle,
                  1,
                  null,
                  null,
                  null,
                  1,
                  fill.$_op,
                  Canvas2DPaintCanvas.CompositeOperator.SourceOver,
                );
                if (shapePaint.transform) {
                  saved = canvas.setTransform(
                    canvas.getTransform(true).preMultiplied(shapePaint.transform),
                  );
                }
                const area = shapePaint.transform
                  ? (shapePaint.transform.inverted() as Transform).mapRect(geometry)
                  : geometry;
                canvas.fillRect(
                  area.getX(),
                  area.getY(),
                  area.getWidth(),
                  area.getHeight(),
                  shapePaint.paint,
                  fill.$_op,
                  Canvas2DPaintCanvas.CompositeOperator.SourceAtTop,
                );
              }
            } else {
              if (shapePaint.transform) {
                saved = canvas.setTransform(
                  canvas.getTransform(true).preMultiplied(shapePaint.transform),
                );
              }
              if (cutOut) {
                canvas.fillVertices(
                  (RGBColor as unknown as Record<string, PaintStyle>)["Black"] as PaintStyle,
                  1,
                  Canvas2DPaintCanvas.CompositeOperator.DestinationOut,
                  path._isEvenOddFill(),
                );
              }
              canvas.fillVertices(
                shapePaint.paint as PaintStyle,
                cutOut ? half : rest,
                fill.getBlendingForContext(context as never),
                path._isEvenOddFill(),
              );
            }
            if (saved) canvas.setTransform(saved);
          }
        }
      });
    }
    if (transform) path.setTransform(null);
  }

  override toString(): string {
    return "[Object GPGFacet]";
  }
}

const proto = PGFacet.prototype;
proto._directedEdges = null as unknown as DirectedEdges;
proto._path = null;
