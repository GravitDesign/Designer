// Old: chunk.vendor.js module 162 (GPathsGraph).
/**
 * The paths graph ("live paint" vector network), node "Paths Graph": a
 * shape made of anchors (GPGAnchor), edges between them (GPGEdge, each a
 * curve) and facets (GPGFacet), the closed regions the edges enclose.
 * Adding a line splits it and the existing edges at every crossing, so
 * the graph stays planar; the facets are then found again from scratch,
 * and facets that existed before keep their own style.
 *
 * The three parts are node containers outside the child list, saved as
 * JSON strings inside the blob: `anchors`, `edges` and `facets`.
 *
 * Painting fills every facet (three passes that hide the seams between
 * neighbours), then strokes every edge and the joins at the anchors.
 */
import type { Event } from "../../core/event.ts";
import { Locale } from "../../core/locale/locale.ts";
import { each } from "../../core/util.ts";
import { PolyIntersector, type PolyLine } from "../../geometry/boolean/poly-segments.ts";
import type { IntersectionPoint } from "../../geometry/boolean/intersection-point.ts";
import type { VertexReader } from "../../geometry/vertex-source.ts";
import { VertexTransformer } from "../../geometry/vertex-transformer.ts";
import type { Vertex } from "../../geometry/vertex.ts";
import { GMath } from "../../math/math.ts";
import { Point } from "../../math/point.ts";
import { Rect } from "../../math/rect.ts";
import { Transform } from "../../math/transform.ts";
import { ElementData } from "../../paint/element-data.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../paint/paint-canvas.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import type { BorderPaintLayer } from "../../style/border-paint-layer.ts";
import type { StylePaintContext } from "../../style/element-stylable.ts";
import type { Effects } from "../../style/effects.ts";
import { PaintLayer } from "../../style/paint-layer.ts";
import type { PaintLayers } from "../../style/paint-layers.ts";
import type { StylableNode } from "../../style/stylable.ts";
import { StyleLayer } from "../../style/stylable-sets.ts";
import { ElementChange } from "../element-change.ts";
import type { Element } from "../element.ts";
import { NodeChange } from "../node-change.ts";
import { Container, type ContainerNode } from "../node-container.ts";
import {
  AfterInsertEvent,
  AfterPropertiesChangeEvent,
  AfterRemoveEvent,
  AfterSpecialChangeEvent,
  BeforeInsertEvent,
  BeforeRemoveEvent,
} from "../node-events.ts";
import { MapContainer, Node, registerNodeClass } from "../node.ts";
import { AnchorPoint, PathBase } from "../path-base.ts";
import { Shape, ShapeHitResult, type ShapePaintContext } from "../shape.ts";
import { registerClass } from "../../core/object.ts";
import type { HitResult } from "../../geometry/hit-result.ts";
import {
  GraphColorMap,
  GraphMixin,
  type GraphAnchor,
  type GraphEdge,
  type PartitionVisitor,
} from "./graph.ts";
import { PGAnchor } from "./pg-anchor.ts";
import { PGEdge, SplitPoint, type EdgeBorder } from "./pg-edge.ts";
import { DirectedEdge, PGFacet } from "./pg-facet.ts";

const Type = AnchorPoint.Type;

/**
 * The old code passed null as drawCanvas's x and y, which the canvas
 * treats as 0. drawCanvas (paint cluster) is typed for numbers only, so
 * the null goes through this one cast.
 */
const NULL_COORDINATE = null as unknown as number;

/** Orders split points by segment, then parameter. */
function bySegmentAndSlope(a: SplitPoint, b: SplitPoint): number {
  return a.seg < b.seg ? -1 : a.seg > b.seg ? 1 : a.slope - b.slope;
}

type Intersection = IntersectionPoint<PolyLine>;

/** GPathsGraph.Edges: the edge container; it links an inserted edge to its anchors and unlinks a removed one. */
export class PathsGraphEdges extends MapContainer {
  static {
    registerNodeClass(this, "GPathsGraph.Edges", "GPathsGraph.Edges");
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change == NodeChange.BeforeChildInsert) {
      if (this._parent && this._parent instanceof PathsGraph) {
        const edge = args as PGEdge;
        const source = edge.getSourceId()
          ? (this._parent.getAnchors().getById(String(edge.getSourceId())) as PGAnchor | null)
          : null;
        const destination = edge.getDestinationId()
          ? (this._parent.getAnchors().getById(String(edge.getDestinationId())) as PGAnchor | null)
          : null;
        if (source && destination) {
          this._parent.interconnectAnchors(source, destination, edge);
        }
      }
    } else if (
      change == NodeChange.AfterChildRemove &&
      this._parent &&
      this._parent instanceof PathsGraph
    ) {
      this._parent.disconnectAnchors(args as PGEdge);
    }
    Node.prototype._handleChange.call(this, change, args);
  }
}

const PosType = {
  Edge: 1,
  Anchor: 2,
  Facet: 3,
} as const;

/** GPathsGraph.GraphPosition.EdgeSpec: a place on an edge. */
class EdgeSpec {
  declare _edge: PGEdge | null;
  declare _hitResult: unknown;

  toString(): string {
    return "[Object GPathsGraph.GraphPosition.EdgeSpec]";
  }
}
EdgeSpec.prototype._edge = null;
EdgeSpec.prototype._hitResult = null;

/** GPathsGraph.GraphPosition.AnchorSpec: an existing anchor. */
class AnchorSpec {
  declare _anchor: PGAnchor | null;

  constructor(anchor: PGAnchor) {
    this._anchor = anchor;
  }

  getAnchor(): PGAnchor {
    return this._anchor as PGAnchor;
  }

  toString(): string {
    return "[Object GPathsGraph.GraphPosition.AnchorSpec]";
  }
}
AnchorSpec.prototype._anchor = null;

/** GPathsGraph.GraphPosition.FacetSpec: a place inside a facet. */
class FacetSpec {
  declare _x: number | null;
  declare _y: number | null;

  toString(): string {
    return "[Object GPathsGraph.GraphPosition.FacetSpec]";
  }
}
FacetSpec.prototype._x = null;
FacetSpec.prototype._y = null;

/** Where a line starts or ends in the graph; only anchor positions are used. */
export class GraphPosition {
  static PosType = PosType;
  static EdgeSpec = EdgeSpec;
  static AnchorSpec = AnchorSpec;
  static FacetSpec = FacetSpec;

  declare _type: number | null;
  declare _posSpec: EdgeSpec | AnchorSpec | FacetSpec | null;

  constructor(type: number, spec: EdgeSpec | AnchorSpec | FacetSpec) {
    this._type = type;
    this._posSpec = spec;
  }

  getType(): number | null {
    return this._type;
  }

  getPosSpec(): EdgeSpec | AnchorSpec | FacetSpec | null {
    return this._posSpec;
  }

  toString(): string {
    return "[Object GPathsGraph.GraphPosition]";
  }
}
GraphPosition.prototype._type = null;
GraphPosition.prototype._posSpec = null;

function anchorOf(position: GraphPosition): PGAnchor {
  return (position.getPosSpec() as AnchorSpec).getAnchor();
}

/**
 * GPathsGraph.FacetsTree: facets nested by containment. A node with an
 * inside point is the outer boundary of a connected part; its children
 * without one are that part's inner facets, and parts inside a facet
 * become children of it (they are holes in it).
 */
export class FacetsTree extends Container(Node) {
  static {
    registerClass(this, "GPathsGraph.FacetsTree");
  }

  declare _facet: PGFacet | null;
  declare _extInsidePoint: Point | null;

  constructor(facet?: PGFacet | null, extInsidePoint?: Point | null) {
    super();
    this._facet = facet as PGFacet | null;
    this._extInsidePoint = extInsidePoint || null;
  }

  override getFirstChild(): FacetsTree | null {
    return super.getFirstChild() as FacetsTree | null;
  }

  override validateInsertion(parent: ContainerNode): boolean {
    return parent instanceof FacetsTree;
  }

  getExtPoint(): Point | null {
    return this._extInsidePoint;
  }

  getFacet(): PGFacet {
    return this._facet as PGFacet;
  }

  /**
   * Puts `tree` under the facet that contains its inside point, or here;
   * siblings inside `tree`'s outline move under it.
   */
  insert(tree: FacetsTree): boolean {
    let inserted = false;
    if (this.getFirstChild() && tree.getExtPoint()) {
      let next: FacetsTree | null;
      for (let child = this.getFirstChild(); child; child = next) {
        next = child.getNext() as FacetsTree | null;
        if (child.getFacet().isInside(tree.getExtPoint() as Point, null)) {
          if ((inserted = child.insert(tree))) break;
        } else if (
          child.getExtPoint() &&
          tree.getFacet().isInside(child.getExtPoint() as Point, null)
        ) {
          this.removeChild(child);
          tree.insert(child);
          if (!inserted) {
            this.insertChild(tree, next);
            inserted = true;
          }
        }
      }
      if (!inserted) {
        this.appendChild(tree);
        inserted = true;
      }
    } else {
      this.appendChild(tree);
      inserted = true;
    }
    return inserted;
  }
}
FacetsTree.prototype._facet = null;
FacetsTree.prototype._extInsidePoint = null;

/** One connected part as _constructFacets works on it. */
interface FacetsPart {
  anchors: PGAnchor[];
  edges: PGEdge[];
  intFacets: PGFacet[] | null;
  extFacet: PGFacet | null;
  extInsidePoint: Point | null;
}

/** A piece of a new line and the anchor it ends on (where it met an edge). */
interface LinePiece {
  pathBase: PathBase;
  finishAnchor: PGAnchor | null;
}

/** The special-change data a facets update sends (undo restores the old facets). */
export interface FacetsChange {
  oldFacets: MapContainer;
}

/** The point and segments of one line crossing; the second is the existing edge. */
type Crossing = [Intersection, PGAnchor | undefined];

export class PathsGraph extends GraphMixin(Shape) {
  static {
    registerNodeClass(this, "Paths Graph", "GPathsGraph");
  }

  static defaultEps = 1e-5;
  static Edges = PathsGraphEdges;
  static GraphPosition = GraphPosition;
  static FacetsTree = FacetsTree;

  declare _anchors: MapContainer;
  declare _edges: PathsGraphEdges;
  declare _facets: MapContainer;
  declare _facetsHash: Record<string, PGFacet[]> | null;
  declare _facetsUpdateCounter: number;
  declare _currentEdge: PGEdge | null;
  declare _currentFacet: PGFacet | null;
  declare _vertexSource: VertexReader | null;
  declare _oldGraph: PathsGraph | null | undefined;

  constructor() {
    super();
    this._anchors = new MapContainer();
    this._anchors._setParent(this);
    this._edges = new PathsGraphEdges();
    this._edges._setParent(this);
    this._facets = new MapContainer();
    this._facets._setParent(this);
    this.addEventListener(BeforeInsertEvent, this._beforeGeometryChange, this);
    this.addEventListener(BeforeRemoveEvent, this._beforeGeometryChange, this);
    this.addEventListener(AfterInsertEvent, this._geometryChange, this);
    this.addEventListener(AfterRemoveEvent, this._geometryChange, this);
    this.addEventListener(AfterPropertiesChangeEvent, this._geometryChange, this);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GPathsGraph", "name", this.getNodeName()) as string;
  }

  override getAnchors(): MapContainer {
    return this._anchors;
  }

  override getEdges(): PathsGraphEdges {
    return this._edges;
  }

  getFacets(): MapContainer {
    return this._facets;
  }

  /** Every anchor's point, mapped by `trf`. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override findPivots(details?: unknown, area?: unknown): unknown[] | null {
    let pivots: Point[] | null = null;
    for (
      let anchor = this._anchors.getFirstChild() as PGAnchor | null;
      null != anchor;
      anchor = anchor.getNext() as PGAnchor | null
    ) {
      let point = anchor.getPoint();
      if (this.$trf) point = this.$trf.mapPoint(point);
      if (pivots) pivots.push(point);
      else pivots = [point];
    }
    return pivots;
  }

  connectAnchorsInPlace(
    source: PGAnchor,
    destination: PGAnchor,
    edge: PGEdge,
    next: Node | null,
  ): void {
    this.interconnectAnchors(source, destination, edge);
    this.addEdgeInPlace(edge, next);
  }

  /** Inserts before `next`; an edge without its own style takes the graph's. */
  addEdgeInPlace(edge: PGEdge, next: Node | null): void {
    if (!edge.getProperty("cSt")) edge.assignStyleFrom(this);
    this._edges.insertChild(edge, next);
  }

  override addEdge(edge: GraphEdge): void {
    const pgEdge = edge as PGEdge;
    if (!pgEdge.getProperty("cSt")) pgEdge.assignStyleFrom(this);
    this._edges.insertChild(pgEdge, null);
  }

  override addAnchor(anchor: GraphAnchor): void {
    this._anchors.insertChild(anchor as PGAnchor, null);
  }

  override _removeEdge(edge: GraphEdge): void {
    this._edges.removeChild(edge as PGEdge);
  }

  override _removeAnchor(anchor: GraphAnchor): void {
    this._anchors.removeChild(anchor as PGAnchor);
  }

  override _getInternalMapAsArray(map: unknown): unknown[] | null {
    return map instanceof MapContainer ? map.getAsArray() : null;
  }

  /** A copy through serialize and deserialize. */
  override clone(options?: Parameters<Shape["clone"]>[0]): this | null {
    const json = Node.serialize(this, options);
    return json ? (Node.deserialize(json) as this) : null;
  }

  /**
   * Adds a line (a bare GPathBase) to the graph: splits it where it
   * crosses itself (and at its corners with `splitAtCorners`), splits it
   * and every edge it crosses at the crossings, and adds each piece as an
   * edge. `start` and `end` snap the line's ends to existing anchors;
   * `styleSource` gives the new edges its style. Facets are rebuilt.
   */
  addGraphLine(
    line: PathBase | null | undefined,
    start?: GraphPosition | null,
    end?: GraphPosition | null,
    styleSource?: StylableNode | null,
    splitAtCorners?: boolean,
  ): void {
    if (!(
      line &&
      line.getAnchorPoints().getFirstChild() &&
      line.getAnchorPoints().getFirstChild() != line.getAnchorPoints().getLastChild()
    )) {
      return;
    }
    try {
      this.prepareFacetsUpdate();
      for (
        let point = line.getAnchorPoints().getFirstChild();
        null != point;
        point = point.getNext() as AnchorPoint | null
      ) {
        point.setProperty("ah", false);
      }
      if (start && start.getType() == PosType.Anchor) {
        const anchor = anchorOf(start);
        (line.getAnchorPoints().getFirstChild() as AnchorPoint).setProperties(
          ["x", "y"],
          [anchor.getProperty("x"), anchor.getProperty("y")],
        );
      }
      if (end && end.getType() == PosType.Anchor) {
        const anchor = anchorOf(end);
        (line.getAnchorPoints().getLastChild() as AnchorPoint).setProperties(
          ["x", "y"],
          [anchor.getProperty("x"), anchor.getProperty("y")],
        );
      }
      let parts: PathBase[] = [];
      this._splitPathLineAtSelfIntersections(line, parts);
      let pieces: (PathBase | LinePiece)[] = [];
      if (splitAtCorners) {
        for (let i = 0; i < parts.length; ++i) {
          const split: PathBase[] = [];
          this._splitPathLineAtStraightPoints(parts[i] as PathBase, split);
          pieces = pieces.concat(split);
        }
        parts = pieces as PathBase[];
        pieces = [];
      }
      const intersector = new PolyIntersector();
      const byLineSegment = (a: Crossing, b: Crossing): number =>
        a[0].polySeg0.seg < b[0].polySeg0.seg
          ? -1
          : a[0].polySeg0.seg > b[0].polySeg0.seg
            ? 1
            : a[0].slope0 - b[0].slope0;
      const byEdgeSegment = (a: Intersection, b: Intersection): number =>
        a.polySeg1.seg < b.polySeg1.seg
          ? -1
          : a.polySeg1.seg > b.polySeg1.seg
            ? 1
            : a.slope1 - b.slope1;
      // Shared across the parts, as the old function-wide variables were.
      let lineSplits: PathBase[] = [];
      for (let i = 0; i < parts.length; ++i) {
        const part = parts[i] as PathBase;
        const crossings: Crossing[] = [];
        for (
          let edge = this._edges.getFirstChild() as PGEdge | null;
          edge;
          edge = edge.getNext() as PGEdge | null
        ) {
          const found = intersector.intersect(part, edge.getPathBase(), false);
          if (found && found.length) {
            found.sort(byEdgeSegment);
            const inner: Intersection[] = [];
            let segments = 0;
            for (
              let point = (
                edge.getPathBase().getAnchorPoints().getFirstChild() as AnchorPoint
              ).getNext();
              null != point;
              point = point.getNext(), ++segments
            );
            for (let j = 0; j < found.length; ++j) {
              const crossing = found[j] as Intersection;
              if (!(
                (1 == crossing.polySeg1.seg && GMath.isEqualEps(crossing.slope1, 0)) ||
                (crossing.polySeg1.seg == segments && GMath.isEqualEps(crossing.slope1, 1))
              )) {
                inner.push(crossing);
              }
            }
            if (inner.length) {
              const splitPoints = inner.map(
                (crossing) =>
                  new SplitPoint(crossing.polySeg1.seg - 1, crossing.slope1, crossing.pt),
              );
              const newEdges: PGEdge[] = [];
              const newAnchors: PGAnchor[] = [];
              this.splitEdge(edge, splitPoints, true, newEdges, newAnchors);
              edge = newEdges[newEdges.length - 1] as PGEdge;
              for (let j = 0; j < inner.length; ++j) {
                crossings.push([inner[j] as Intersection, newAnchors[j]]);
              }
            }
          }
        }
        const onLine: Crossing[] = [];
        if (crossings.length) {
          crossings.sort(byLineSegment);
          let segments = 0;
          for (
            let point = (part.getAnchorPoints().getFirstChild() as AnchorPoint).getNext();
            null != point;
            point = point.getNext(), ++segments
          );
          for (let j = 0; j < crossings.length; ++j) {
            const crossing = (crossings[j] as Crossing)[0];
            if (!(
              (1 == crossing.polySeg0.seg && GMath.isEqualEps(crossing.slope0, 0)) ||
              (crossing.polySeg0.seg == segments && GMath.isEqualEps(crossing.slope0, 1))
            )) {
              onLine.push(crossings[j] as Crossing);
            }
          }
          if (onLine.length) {
            const splitPoints = onLine.map(
              (crossing) =>
                new SplitPoint(crossing[0].polySeg0.seg - 1, crossing[0].slope0, crossing[0].pt),
            );
            lineSplits = [];
            this._splitPathBase(part, splitPoints, true, lineSplits);
            for (let j = 0; j < onLine.length; ++j) {
              pieces.push({
                pathBase: lineSplits[j] as PathBase,
                finishAnchor: (onLine[j] as Crossing)[1] as PGAnchor | undefined as PGAnchor,
              });
            }
          }
        }
        pieces.push(
          onLine.length
            ? { pathBase: lineSplits[onLine.length] as PathBase, finishAnchor: null }
            : { pathBase: part, finishAnchor: null },
        );
      }
      if (1 == pieces.length) this._addGraphLine(line, start, end, styleSource);
      else {
        let previous: GraphPosition | null | undefined = null;
        for (let i = 0; i < pieces.length; ++i) {
          const piece = pieces[i] as LinePiece;
          const from: GraphPosition | null | undefined = 0 == i ? start : previous;
          previous =
            i == pieces.length - 1
              ? end
              : piece.finishAnchor
                ? new GraphPosition(PosType.Anchor, new AnchorSpec(piece.finishAnchor))
                : null;
          previous = this._addGraphLine(piece.pathBase, from, previous, styleSource);
        }
      }
    } finally {
      this.finishFacetsUpdate();
    }
  }

  /**
   * Splits `edge` at `points` (sorted already when `sorted`): the edge is
   * replaced, in place, by one edge per piece joined by new anchors.
   * The new edges go to `newEdges`, the new anchors to `newAnchors`.
   */
  splitEdge(
    edge: PGEdge,
    points: SplitPoint[],
    sorted: boolean,
    newEdges: PGEdge[],
    newAnchors: PGAnchor[],
  ): void {
    try {
      this.prepareFacetsUpdate();
      const pieces: PathBase[] = [];
      this._splitPathBase(edge.getPathBase(), points, sorted, pieces);
      if (pieces.length > 1) {
        let anchor: PGAnchor | undefined;
        let from: PGAnchor;
        const source = edge.getSource() as PGAnchor;
        const destination = edge.getDestination() as PGAnchor;
        const next = edge.getNext();
        this.removeEdge(edge);
        for (let i = 0; i < pieces.length; ++i) {
          const piece = pieces[i] as PathBase;
          from = (0 == i ? source : anchor) as PGAnchor;
          if (piece.getAnchorPoints().getFirstChild() != piece.getAnchorPoints().getLastChild()) {
            if (i == pieces.length - 1) anchor = destination;
            else {
              anchor = new PGAnchor();
              const last = piece.getAnchorPoints().getLastChild() as AnchorPoint;
              anchor.setProperties(["x", "y"], [last.getProperty("x"), last.getProperty("y")]);
              this.addAnchor(anchor);
              newAnchors.push(anchor);
            }
            const created = new PGEdge();
            created.setPathBase(piece);
            this.connectAnchorsInPlace(from, anchor, created, next);
            newEdges.push(created);
          }
        }
      }
    } finally {
      this.finishFacetsUpdate();
    }
  }

  /** The undo action for a facets change: puts the new facets back. */
  getTransactionAction(data: FacetsChange | null | undefined): () => void {
    let action: () => void;
    if (data) {
      const oldFacets = data.oldFacets;
      const facets = this._facets;
      action = () => {
        oldFacets._setParent(null);
        this._facets = facets;
        this._facets._setParent(this);
      };
    } else action = () => {};
    return action;
  }

  getTransactionActionSerialized(
    data: FacetsChange | null | undefined,
  ): Record<string, never> | null {
    return data ? {} : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  getTransactionActionDeserialized(data: unknown): () => void {
    return function () {};
  }

  /** The revert action for a facets change: puts the old facets back. */
  getTransactionRevertAction(data: FacetsChange | null | undefined): () => void {
    let action: () => void;
    if (data) {
      const oldFacets = data.oldFacets;
      const facets = this._facets;
      action = () => {
        facets._setParent(null);
        this._facets = oldFacets;
        this._facets._setParent(this);
      };
    } else action = () => {};
    return action;
  }

  _setFacets(facets: MapContainer): void {
    const oldFacets = this._facets;
    oldFacets._setParent(null);
    this._facets = facets;
    this._facets._setParent(this);
    if (this._canEventBeSent(AfterSpecialChangeEvent)) {
      this._sendEvent(new AfterSpecialChangeEvent(this, { oldFacets } satisfies FacetsChange));
    }
  }

  /**
   * Finds the facets again: per connected part, the cycles around its
   * faces (the outer boundary has the inside point), nested by
   * containment; parts inside a facet become holes in it.
   */
  _recalculateFacets(): void {
    this._facetsHash = null;
    if (!this.getGeometryBBox()) return;
    this._setFacets(new MapContainer());
    const root = new FacetsTree();
    const onPart: PartitionVisitor = (anchors, edges) => {
      if (edges.length) {
        const part: FacetsPart = {
          anchors: anchors as PGAnchor[],
          edges: edges as PGEdge[],
          intFacets: null,
          extFacet: null,
          extInsidePoint: null,
        };
        this._constructFacets(part);
        if (part.extFacet && part.extInsidePoint) {
          const tree = new FacetsTree(part.extFacet, part.extInsidePoint);
          const inner = part.intFacets;
          if (inner && inner.length) {
            for (let i = 0; i < inner.length; ++i) tree.appendChild(new FacetsTree(inner[i]));
          }
          root.insert(tree);
        }
      }
    };
    this.dfsPartitioner(null, null, onPart, null);
    if (root && root.getFirstChild()) {
      const visit = (node: Node): boolean => {
        const tree = node as FacetsTree;
        if (!tree.getExtPoint()) {
          const facet = tree.getFacet();
          if (tree.getFirstChild() && (tree.getFirstChild() as FacetsTree).getExtPoint()) {
            const holes: Shape[] = [];
            for (
              let child = tree.getFirstChild();
              child;
              child = child.getNext() as FacetsTree | null
            ) {
              holes.push(child.getFacet().getPath());
            }
            if (holes.length) facet.extendPath(holes);
          }
          if (facet) {
            facet.assignStyleFrom(this);
            this._facets.insertChild(facet, undefined);
          }
        }
        return true;
      };
      root.acceptChildren(visit, false, true);
    }
  }

  /** Edges first (a hit on an edge's stroke), then facets (a hit inside). */
  override _detailHitTest(
    location: Point,
    transform?: Transform | null,
    tolerance?: number,
    force?: unknown,
  ): ElementData<Element, unknown> | null {
    let hit: ElementData<Element, unknown> | null = null;
    for (
      let edge = this._edges.getFirstChild() as PGEdge | null;
      edge;
      edge = edge.getNext() as PGEdge | null
    ) {
      if (
        (hit = edge
          .getPathBase()
          ._detailHitTest(
            location,
            this.$trf ? this.$trf.multiplied(transform as Transform) : transform,
            tolerance,
            false,
          ))
      ) {
        return new ElementData<Element, unknown>(this, {
          hitRes: new ShapeHitResult(
            ShapeHitResult.Type.Stroke,
            (hit.data as ShapeHitResult).vertex as HitResult,
          ),
          edge,
        });
      }
    }
    for (
      let facet = this._facets.getFirstChild() as PGFacet | null;
      facet;
      facet = facet.getNext() as PGFacet | null
    ) {
      if (
        (hit = facet
          .getPath()
          ._detailHitTest(
            location,
            this.$trf ? this.$trf.multiplied(transform as Transform) : transform,
            tolerance,
            force,
          ))
      ) {
        return new ElementData<Element, unknown>(this, {
          hitRes: new ShapeHitResult(
            ShapeHitResult.Type.Fill,
            (hit.data as ShapeHitResult).vertex as HitResult,
          ),
          facet,
        });
      }
    }
    return hit;
  }

  /**
   * Walks the faces of one connected part: from each end of each edge,
   * turn to the next edge in angle order at every anchor until the walk
   * comes back. The first cycle found with an inside point is the outer
   * boundary unless that point is inside it.
   */
  _constructFacets(part: FacetsPart): void {
    const visited: Record<string, PGAnchor[]> = {};
    const contains = (anchors: PGAnchor[] | null | undefined, anchor: PGAnchor): boolean => {
      if (anchors) for (let i = 0; i < anchors.length; ++i) if (anchors[i] == anchor) return true;
      return false;
    };
    for (let i = 0; i < part.edges.length; ++i) {
      const startEdge = part.edges[i] as PGEdge;
      const ends = startEdge.getAnchors() as PGAnchor[];
      let seen: PGAnchor[] | null | undefined = visited[String(startEdge.getId())];
      let facet: PGFacet | null = null;
      let cycle: DirectedEdge[] = [];
      let insidePoint: Point | null = null;
      for (let j = 0; j < ends.length; ++j) {
        const end = ends[j] as PGAnchor;
        const known = contains(seen, end);
        if (!known) {
          facet = new PGFacet();
          cycle = [];
          insidePoint = null;
        }
        let anchor = end;
        let edge: PGEdge | null = startEdge;
        let directed: DirectedEdge | null = new DirectedEdge(
          edge,
          (edge.getSource() as unknown) == anchor
            ? DirectedEdge.Direction.Straight
            : DirectedEdge.Direction.Reverse,
        );
        while (edge && !contains(seen, anchor)) {
          cycle.push(directed as DirectedEdge);
          if (seen) seen.push(anchor);
          else {
            seen = [anchor];
            visited[String(edge.getId())] = seen;
          }
          let wantInside = false;
          if (!(part.extFacet || insidePoint)) wantInside = true;
          let next;
          if (
            (directed as DirectedEdge).getProperty("direction") == DirectedEdge.Direction.Straight
          ) {
            next = (anchor = edge.getDestination() as PGAnchor).getNextEdgeOrdered(
              edge,
              PGAnchor.EdgeType.In,
              wantInside,
            );
          } else {
            next = (anchor = edge.getSource() as PGAnchor).getNextEdgeOrdered(
              edge,
              PGAnchor.EdgeType.Out,
              wantInside,
            );
          }
          if (next) {
            seen =
              visited[
                String(
                  (edge = (directed = new DirectedEdge(
                    next.edge as PGEdge,
                    next.type == PGAnchor.EdgeType.Out
                      ? DirectedEdge.Direction.Straight
                      : DirectedEdge.Direction.Reverse,
                  )).getEdge()).getId(),
                )
              ];
            if (wantInside && next.insidePt) insidePoint = next.insidePt;
          } else {
            directed = null;
            edge = null;
            seen = null;
          }
        }
        if (!known && cycle && cycle.length) {
          if ((facet as PGFacet).init(cycle)) {
            if (part.extFacet || !insidePoint || (facet as PGFacet).isInside(insidePoint, false)) {
              if (part.intFacets) part.intFacets.push(facet as PGFacet);
              else part.intFacets = [facet as PGFacet];
            } else {
              part.extFacet = facet;
              part.extInsidePoint = insidePoint;
            }
          }
        }
      }
    }
  }

  /** Starts a facets update (nested calls count); the first one keeps a copy of the graph. */
  prepareFacetsUpdate(): void {
    if (this._facetsUpdateCounter) ++this._facetsUpdateCounter;
    else {
      this._facetsUpdateCounter = 1;
      this._oldGraph = this.clone();
    }
  }

  /**
   * Ends a facets update. The last one rebuilds the facets; a new facet
   * that is the same as an old one with its own style (cSt) gets that
   * style back.
   */
  finishFacetsUpdate(): void {
    if (1 == this._facetsUpdateCounter) {
      this._facetsUpdateCounter = 0;
      this._recalculateFacets();
      if (this._oldGraph) {
        const oldHash = this._oldGraph.getFacetsHash();
        if (this._facets.getFirstChild()) this._calculateFacetsHash();
        if (oldHash && this._facetsHash) {
          for (const key in this._facetsHash) {
            const oldFacets = oldHash[key];
            if (oldFacets) {
              const facets = this._facetsHash[key] as PGFacet[];
              for (let i = 0; i < facets.length; ++i) {
                for (let j = 0, same = false; j < oldFacets.length && !same; ++j) {
                  same = (facets[i] as PGFacet).isSame(oldFacets[j] as PGFacet);
                  if (same && (oldFacets[j] as PGFacet).getProperty("cSt")) {
                    (facets[i] as PGFacet).assignStyleFrom(oldFacets[j] as PGFacet);
                    (facets[i] as PGFacet).setProperty("cSt", true);
                  }
                }
              }
            }
          }
        }
      }
      this._oldGraph = null;
    } else if (this._facetsUpdateCounter) --this._facetsUpdateCounter;
  }

  getFacetsHash(): Record<string, PGFacet[]> | null {
    if (!this._facetsHash && this._facets.getFirstChild()) this._calculateFacetsHash();
    return this._facetsHash;
  }

  _calculateFacetsHash(): void {
    let hash: Record<string, PGFacet[]> | null = null;
    if (this._facets && this._facets.getFirstChild()) {
      hash = Object.create(null) as Record<string, PGFacet[]>;
      for (
        let facet = this._facets.getFirstChild() as PGFacet | null;
        facet;
        facet = facet.getNext() as PGFacet | null
      ) {
        const key = facet.getHash();
        if (hash[key]) hash[key].push(facet);
        else hash[key] = [facet];
      }
    }
    this._facetsHash = hash;
  }

  /**
   * Splits `pathBase` at `points` (segment from 0 and parameter; the
   * exact point when given) into new paths in `out`. Splits at a
   * segment's start or end cut at the existing point; pieces of one
   * point are dropped. Curves are subdivided so the pieces keep the shape.
   */
  _splitPathBase(pathBase: PathBase, points: SplitPoint[], sorted: boolean, out: PathBase[]): void {
    let splits = points;
    if (!sorted) (splits = points.slice()).sort(bySegmentAndSlope);
    let index = 0;
    let piece = new PathBase();
    const xs = new Float64Array(4);
    const ys = new Float64Array(4);
    let current = pathBase.getAnchorPoints().getFirstChild();
    if (!current) return;
    let justSplit = false;
    let carried: AnchorPoint | null = null;
    let previous: AnchorPoint;
    let controlX: number;
    let controlY: number;
    for (
      let next = current.getNext() as AnchorPoint | null, segment = 0;
      null != next;
      current = next, next = next.getNext() as AnchorPoint | null, ++segment
    ) {
      const point = current as AnchorPoint;
      const x1 = point.getProperty("x") as number;
      const y1 = point.getProperty("y") as number;
      const x2 = next.getProperty("x") as number;
      const y2 = next.getProperty("y") as number;
      const hrx = point.getProperty("hrx") as number | null;
      const hry = point.getProperty("hry") as number | null;
      const hlx = next.getProperty("hlx") as number | null;
      const hly = next.getProperty("hly") as number | null;
      if (carried) previous = carried;
      else {
        (previous = new AnchorPoint()).deserialize(point.serialize());
        if (justSplit) previous.setProperties(["hlx", "hly"], [null, null]);
        piece.getAnchorPoints().appendChild(previous);
      }
      justSplit = false;
      if (splits.length && index < splits.length && (splits[index] as SplitPoint).seg == segment) {
        let t0 = 0;
        let t: number;
        for (; index < splits.length && (splits[index] as SplitPoint).seg == segment; ++index) {
          t = (splits[index] as SplitPoint).slope;
          const at = (splits[index] as SplitPoint).pt;
          if (
            GMath.isEqualEps(t, 0) &&
            (!at || (GMath.isEqualEps(at.getX(), x1) && GMath.isEqualEps(at.getY(), y1)))
          ) {
            if (!justSplit) {
              (piece.getAnchorPoints().getLastChild() as AnchorPoint).setProperties(
                ["hrx", "hry"],
                [null, null],
              );
              if (
                piece &&
                piece.getAnchorPoints().getFirstChild() != piece.getAnchorPoints().getLastChild()
              ) {
                out.push(piece);
              }
              piece = new PathBase();
              (previous = new AnchorPoint()).deserialize(point.serialize());
              previous.setProperties(["hlx", "hly"], [null, null]);
              piece.getAnchorPoints().appendChild(previous);
              justSplit = true;
            }
          } else if (
            GMath.isEqualEps(t, 1) &&
            (!at || (GMath.isEqualEps(at.getX(), x2) && GMath.isEqualEps(at.getY(), y2)))
          ) {
            if (!justSplit) {
              carried = new AnchorPoint();
              if (1 == t && 0 == t0) {
                carried.deserialize(next.serialize());
                carried.setProperties(["hrx", "hry"], [null, null]);
              } else if (null !== hrx && null !== hlx && null !== hry && null !== hly) {
                GMath.getCtrlPts(x1, x2, hrx, hlx, t0, t, xs);
                GMath.getCtrlPts(y1, y2, hry, hly, t0, t, ys);
                previous.setProperties(["hrx", "hry"], [xs[1], ys[1]]);
                carried.setProperties(
                  ["x", "y", "hlx", "hly", "hrx", "hry"],
                  [x2, y2, xs[2], ys[2], null, null],
                );
              } else if ((null !== hrx && null !== hry) || (null !== hlx && null !== hly)) {
                if (null !== hrx && null !== hry) {
                  controlX = hrx;
                  controlY = hry;
                } else {
                  controlX = hlx as number;
                  controlY = hly as number;
                }
                GMath.getCtrlPtsQuadratic(x1, x2, controlX, t0, t, xs);
                GMath.getCtrlPtsQuadratic(y1, y2, controlY, t0, t, ys);
                previous.setProperties(["hrx", "hry"], [xs[1], ys[1]]);
                carried.setProperties(
                  ["x", "y", "hlx", "hly", "hrx", "hry"],
                  [x2, y2, null, null, null, null],
                );
              } else carried.setProperties(["x", "y"], [x2, y2]);
              piece.getAnchorPoints().appendChild(carried);
              if (
                piece &&
                piece.getAnchorPoints().getFirstChild() != piece.getAnchorPoints().getLastChild()
              ) {
                out.push(piece);
              }
              piece = new PathBase();
              // Quirk kept: this point is not added to the new piece; the
              // next segment starts it again from the anchor point.
              (previous = new AnchorPoint()).setProperties(
                ["x", "y"],
                [carried.getProperty("x"), carried.getProperty("y")],
              );
              carried = null;
              justSplit = true;
            }
          } else {
            justSplit = false;
            carried = new AnchorPoint();
            if (null !== hrx && null !== hlx && null !== hry && null !== hly) {
              GMath.getCtrlPts(x1, x2, hrx, hlx, t0, t, xs);
              GMath.getCtrlPts(y1, y2, hry, hly, t0, t, ys);
              previous.setProperties(["hrx", "hry"], [xs[1], ys[1]]);
              carried.setProperties(
                ["x", "y", "hlx", "hly"],
                [at ? at.getX() : xs[3], at ? at.getY() : ys[3], xs[2], ys[2]],
              );
            } else if ((null !== hrx && null !== hry) || (null !== hlx && null !== hly)) {
              if (null !== hrx && null !== hry) {
                controlX = hrx;
                controlY = hry;
              } else {
                controlX = hlx as number;
                controlY = hly as number;
              }
              GMath.getCtrlPtsQuadratic(x1, x2, controlX, t0, t, xs);
              GMath.getCtrlPtsQuadratic(y1, y2, controlY, t0, t, ys);
              previous.setProperties(["hrx", "hry"], [xs[1], ys[1]]);
              carried.setProperties(["x", "y"], [at ? at.getX() : xs[2], at ? at.getY() : ys[2]]);
            } else {
              carried.setProperties(
                ["x", "y"],
                [at ? at.getX() : x1 + t * (x2 - x1), at ? at.getY() : y1 + t * (y2 - y1)],
              );
            }
            piece.getAnchorPoints().appendChild(carried);
            if (
              piece &&
              piece.getAnchorPoints().getFirstChild() != piece.getAnchorPoints().getLastChild()
            ) {
              out.push(piece);
            }
            piece = new PathBase();
            (previous = new AnchorPoint()).setProperties(
              ["x", "y"],
              [carried.getProperty("x"), carried.getProperty("y")],
            );
            piece.getAnchorPoints().appendChild(previous);
          }
          t0 = t;
        }
        if (
          !justSplit ||
          ((index == splits.length || (splits[index] as SplitPoint).seg != segment) &&
            !GMath.isEqualEps(t0, 1))
        ) {
          t = 1;
          (carried = new AnchorPoint()).deserialize(next.serialize());
          if (null !== hrx && null !== hlx && null !== hry && null !== hly) {
            GMath.getCtrlPts(x1, x2, hrx, hlx, t0, t, xs);
            GMath.getCtrlPts(y1, y2, hry, hly, t0, t, ys);
            previous.setProperties(["hrx", "hry"], [xs[1], ys[1]]);
            carried.setProperties(["hlx", "hly"], [xs[2], ys[2]]);
          } else if ((null !== hrx && null !== hry) || (null !== hlx && null !== hly)) {
            if (null !== hrx && null !== hry) {
              controlX = hrx;
              controlY = hry;
            } else {
              controlX = hlx as number;
              controlY = hly as number;
            }
            GMath.getCtrlPtsQuadratic(x1, x2, controlX, t0, t, xs);
            GMath.getCtrlPtsQuadratic(y1, y2, controlY, t0, t, ys);
            previous.setProperties(["hrx", "hry"], [xs[1], ys[1]]);
            carried.setProperties(["hlx", "hly"], [null, null]);
          }
          piece.getAnchorPoints().appendChild(carried);
        }
      } else {
        (carried = new AnchorPoint()).deserialize(next.serialize());
        piece.getAnchorPoints().appendChild(carried);
      }
    }
    if (
      piece &&
      piece.getAnchorPoints().getFirstChild() != piece.getAnchorPoints().getLastChild()
    ) {
      out.push(piece);
    }
  }

  /** Splits a line at every inner point that isn't smooth (not symmetric, mirrored or connector). */
  _splitPathLineAtStraightPoints(line: PathBase, out: PathBase[]): void {
    const point = line.getAnchorPoints().getFirstChild();
    if (!point) return;
    let piece = new PathBase();
    let copy = new AnchorPoint();
    copy.deserialize(point.serialize());
    piece.getAnchorPoints().appendChild(copy);
    let after: AnchorPoint | null;
    for (let next = point.getNext() as AnchorPoint | null; null != next; next = after) {
      after = next.getNext() as AnchorPoint | null;
      (copy = new AnchorPoint()).deserialize(next.serialize());
      piece.getAnchorPoints().appendChild(copy);
      const type = next.getProperty("tp");
      if (after && type != Type.Symmetric && type != Type.Mirror && type != Type.Connector) {
        out.push(piece);
        piece = new PathBase();
        (copy = new AnchorPoint()).deserialize(next.serialize());
        piece.getAnchorPoints().appendChild(copy);
      }
    }
    out.push(piece);
  }

  /**
   * Splits a line where it crosses itself: segment against every later
   * segment, plus the loop or cusp inside a single cubic segment.
   */
  _splitPathLineAtSelfIntersections(line: PathBase, out: PathBase[]): void {
    const intersector = new PolyIntersector();
    const splits: SplitPoint[] = [];
    const points = line.getAnchorPoints();
    let first = points.getFirstChild();
    if (first) {
      let closedLine = false;
      if (
        GMath.isEqualEps(
          first.getProperty("x") as number,
          (points.getLastChild() as AnchorPoint).getProperty("x") as number,
        ) &&
        GMath.isEqualEps(
          first.getProperty("y") as number,
          (points.getLastChild() as AnchorPoint).getProperty("y") as number,
        )
      ) {
        closedLine = true;
      }
      for (
        let current: AnchorPoint = first, next = first.getNext() as AnchorPoint | null, segment = 0;
        null != next;
        current = next, next = next.getNext() as AnchorPoint | null, ++segment
      ) {
        const segmentPath = new PathBase();
        let copy = new AnchorPoint();
        copy.deserialize(current.serialize());
        segmentPath.getAnchorPoints().appendChild(copy);
        (copy = new AnchorPoint()).deserialize(next.serialize());
        segmentPath.getAnchorPoints().appendChild(copy);
        for (
          let otherStart: AnchorPoint = next,
            otherEnd = otherStart.getNext() as AnchorPoint | null,
            otherSegment = segment + 1;
          null != otherEnd;
          otherStart = otherEnd, otherEnd = otherEnd.getNext() as AnchorPoint | null, ++otherSegment
        ) {
          const other = new PathBase();
          (copy = new AnchorPoint()).deserialize(otherStart.serialize());
          other.getAnchorPoints().appendChild(copy);
          (copy = new AnchorPoint()).deserialize(otherEnd.serialize());
          other.getAnchorPoints().appendChild(copy);
          const found = intersector.intersect(segmentPath, other, false);
          if (found && found.length) {
            for (let i = 0; i < found.length; ++i) {
              const crossing = found[i] as Intersection;
              // Neighbouring segments meet at their shared point; that
              // only counts for the first and last segment of a closed line.
              if (
                1 != crossing.slope0 ||
                0 != crossing.slope1 ||
                (closedLine && current == points.getFirstChild() && otherStart == next)
              ) {
                if (!(current == points.getFirstChild() && 0 == crossing.slope0)) {
                  splits.push(new SplitPoint(segment, crossing.slope0, crossing.pt));
                }
                if (!(otherEnd == points.getLastChild() && 1 == crossing.slope1)) {
                  splits.push(new SplitPoint(otherSegment, crossing.slope1, crossing.pt));
                }
              }
            }
          }
        }
        const hrx = current.getProperty("hrx") as number | null;
        const hry = current.getProperty("hry") as number | null;
        const hlx = next.getProperty("hlx") as number | null;
        const hly = next.getProperty("hly") as number | null;
        const loop: number[] = [];
        let cusp: number | null = null;
        let xs: Float64Array | undefined;
        let ys: Float64Array | undefined;
        if (null !== hrx && null !== hry && null !== hlx && null !== hly) {
          const x0 = current.getProperty("x") as number;
          const y0 = current.getProperty("y") as number;
          const x3 = next.getProperty("x") as number;
          const y3 = next.getProperty("y") as number;
          const dx = new Float64Array(3);
          const dy = new Float64Array(3);
          GMath.getBezierDerivativeEquationCoeffs(x0, y0, x3, y3, hrx, hry, hlx, hly, dx, dy);
          xs = new Float64Array(4);
          ys = new Float64Array(4);
          xs[0] = dx[0] as number;
          xs[1] = (3 * (dx[1] as number)) / 2;
          xs[2] = 3 * (dx[2] as number);
          xs[3] = x0;
          ys[0] = dy[0] as number;
          ys[1] = (3 * (dy[1] as number)) / 2;
          ys[2] = 3 * (dy[2] as number);
          ys[3] = y0;
          cusp = GMath.getBezierSelfIntersections(xs, ys, loop);
        }
        if (null !== cusp || loop.length) {
          const evalAt = (t: number): Point => {
            const cx = xs as Float64Array;
            const cy = ys as Float64Array;
            return new Point(
              GMath.evalCubic(
                cx[0] as number,
                cx[1] as number,
                cx[2] as number,
                cx[3] as number,
                t,
              ),
              GMath.evalCubic(
                cy[0] as number,
                cy[1] as number,
                cy[2] as number,
                cy[3] as number,
                t,
              ),
            );
          };
          if (cusp) splits.push(new SplitPoint(segment, cusp, evalAt(cusp)));
          else {
            const t0 = loop[0] as number;
            const t1 = loop[1] as number;
            if (t0 > 0) splits.push(new SplitPoint(segment, t0, evalAt(t0)));
            const middle = (t0 + t1) / 2;
            splits.push(new SplitPoint(segment, middle, evalAt(middle)));
            if (t1 < 1) splits.push(new SplitPoint(segment, t1, evalAt(t1)));
          }
        }
      }
    }
    if (splits.length) {
      splits.sort(bySegmentAndSlope);
      const withEnds: SplitPoint[] = [];
      first = points.getFirstChild() as AnchorPoint;
      let last = new Point(first.getProperty("x") as number, first.getProperty("y") as number);
      let split: SplitPoint;
      let at: Point;
      for (let i = 0; i < splits.length; ++i) {
        split = splits[i] as SplitPoint;
        at = split.pt as Point;
        // A crossing right after the previous one (or the start) also
        // splits at the anchor point before it.
        if (GMath.isEqualEps(last.getX(), at.getX()) && GMath.isEqualEps(last.getY(), at.getY())) {
          if (0 != split.slope) {
            const anchor = points.getChildByIndex(split.seg) as AnchorPoint;
            withEnds.push(
              new SplitPoint(
                split.seg,
                0,
                new Point(anchor.getProperty("x") as number, anchor.getProperty("y") as number),
              ),
            );
          } else if (split.seg > 2) {
            const before = split.seg - 1;
            const anchor = points.getChildByIndex(before) as AnchorPoint;
            withEnds.push(
              new SplitPoint(
                before,
                0,
                new Point(anchor.getProperty("x") as number, anchor.getProperty("y") as number),
              ),
            );
          }
        }
        withEnds.push(split);
        last = at;
      }
      const lastPoint = points.getLastChild() as AnchorPoint;
      at = new Point(lastPoint.getProperty("x") as number, lastPoint.getProperty("y") as number);
      if (GMath.isEqualEps(last.getX(), at.getX()) && GMath.isEqualEps(last.getY(), at.getY())) {
        split = splits[splits.length - 1] as SplitPoint;
        const anchor = points.getChildByIndex(split.seg) as AnchorPoint;
        withEnds.push(
          new SplitPoint(
            split.seg,
            1,
            new Point(anchor.getProperty("x") as number, anchor.getProperty("y") as number),
          ),
        );
      }
      this._splitPathBase(line, withEnds, false, out);
    } else out.push(line);
  }

  /**
   * Adds one piece of a line as an edge. Its ends snap to the given
   * anchor positions, or to an anchor within defaultEps, or get new
   * anchors. Returns the end anchor's position (the start's when the
   * piece has one point and there is no end).
   */
  _addGraphLine(
    line: PathBase,
    start: GraphPosition | null | undefined,
    end: GraphPosition | null | undefined,
    styleSource: StylableNode | null | undefined,
  ): GraphPosition | null | undefined {
    if (line.getAnchorPoints().getFirstChild() == line.getAnchorPoints().getLastChild()) {
      return end || start;
    }
    let source: PGAnchor;
    let destination: PGAnchor;
    const first = line.getAnchorPoints().getFirstChild() as AnchorPoint;
    let x: number;
    let y: number;
    let match: PGAnchor | null;
    if (start && start.getType() == PosType.Anchor) {
      source = anchorOf(start);
      first.setProperties(["x", "y"], [source.getProperty("x"), source.getProperty("y")]);
    } else {
      x = first.getProperty("x") as number;
      y = first.getProperty("y") as number;
      match = null;
      for (
        let anchor = this._anchors.getFirstChild() as PGAnchor | null;
        anchor && !match;
        anchor = anchor.getNext() as PGAnchor | null
      ) {
        if (
          GMath.isEqualEps(anchor.getProperty("x") as number, x, PathsGraph.defaultEps) &&
          GMath.isEqualEps(anchor.getProperty("y") as number, y, PathsGraph.defaultEps)
        ) {
          match = anchor;
        }
      }
      if (match) {
        source = match;
        first.setProperties(["x", "y"], [match.getProperty("x"), match.getProperty("y")]);
      } else {
        (source = new PGAnchor()).setProperties(["x", "y"], [x, y]);
        this.addAnchor(source);
      }
    }
    const last = line.getAnchorPoints().getLastChild() as AnchorPoint;
    if (end && end.getType() == PosType.Anchor) {
      destination = anchorOf(end);
      last.setProperties(["x", "y"], [destination.getProperty("x"), destination.getProperty("y")]);
    } else {
      x = last.getProperty("x") as number;
      y = last.getProperty("y") as number;
      match = null;
      for (
        let anchor = this._anchors.getFirstChild() as PGAnchor | null;
        anchor && !match;
        anchor = anchor.getNext() as PGAnchor | null
      ) {
        if (
          GMath.isEqualEps(anchor.getProperty("x") as number, x, PathsGraph.defaultEps) &&
          GMath.isEqualEps(anchor.getProperty("y") as number, y, PathsGraph.defaultEps)
        ) {
          match = anchor;
        }
      }
      if (match) {
        destination = match;
        last.setProperties(["x", "y"], [match.getProperty("x"), match.getProperty("y")]);
      } else {
        (destination = new PGAnchor()).setProperties(["x", "y"], [x, y]);
        this.addAnchor(destination);
      }
    }
    if (source != destination) {
      const edge = new PGEdge();
      edge.setPathBase(line);
      if (styleSource) edge.assignStyleFrom(styleSource);
      this.connectAnchors(source, destination, edge);
    }
    return new GraphPosition(PosType.Anchor, new AnchorSpec(destination));
  }

  /**
   * After a paint layer change, edges and facets without their own style
   * take the graph's again. Quirk kept: the old code then called
   * GStylable's empty _styleRepaint, so nothing is repainted here.
   */
  override _styleRepaint(source?: unknown): void {
    if (source instanceof PaintLayer) {
      for (
        let facet = this._facets.getFirstChild() as PGFacet | null;
        null != facet;
        facet = facet.getNext() as PGFacet | null
      ) {
        if (!facet.getProperty("cSt")) facet.assignStyleFrom(this);
      }
      for (
        let edge = this._edges.getFirstChild() as PGEdge | null;
        null != edge;
        edge = edge.getNext() as PGEdge | null
      ) {
        if (!edge.getProperty("cSt")) edge.assignStyleFrom(this);
      }
    }
  }

  /**
   * Saves the three containers as JSON strings (edges and facets only
   * when there are any) and restores them: edges are connected to their
   * anchors, facets resolve their edges and rebuild their paths.
   */
  override _handleChange(change: number, args?: unknown): void {
    let edge: PGEdge | null;
    if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      blob["anchors"] = Node.serialize(this._anchors);
      if (this._edges.getFirstChild()) blob["edges"] = Node.serialize(this._edges);
      if (this._facets.getFirstChild()) blob["facets"] = Node.serialize(this._facets);
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      if (Object.prototype.hasOwnProperty.call(blob, "anchors")) {
        this._anchors = Node.deserialize(blob["anchors"] as string) as MapContainer;
        this._anchors._setParent(this);
      }
      let edges: PathsGraphEdges | null = null;
      if (Object.prototype.hasOwnProperty.call(blob, "edges")) {
        edges = Node.deserialize(blob["edges"] as string) as PathsGraphEdges;
      }
      let facets: MapContainer | null = null;
      if (Object.prototype.hasOwnProperty.call(blob, "facets")) {
        facets = Node.deserialize(blob["facets"] as string) as MapContainer;
      }
      let next: Node | null;
      if (edges) {
        for (
          edge = edges.getFirstChild() as PGEdge | null;
          null != edge;
          edge = next as PGEdge | null
        ) {
          next = edge.getNext();
          const source = this._anchors.getById(String(edge.getSourceId())) as PGAnchor | null;
          const destination = this._anchors.getById(
            String(edge.getDestinationId()),
          ) as PGAnchor | null;
          if (source && destination) {
            edges.removeChild(edge);
            this.connectAnchors(source, destination, edge);
          }
        }
      }
      if (facets) {
        let valid = true;
        for (
          let facet = facets.getFirstChild() as PGFacet | null;
          null != facet && valid;
          facet = next as PGFacet | null
        ) {
          valid = false;
          next = facet.getNext();
          const directedEdges = facet.getDirectedEdges();
          const resolved: DirectedEdge[] = [];
          if (directedEdges && directedEdges.getFirstChild()) {
            let following: DirectedEdge | null;
            for (
              let directed = directedEdges.getFirstChild();
              null != directed;
              directed = following
            ) {
              following = directed.getNext() as DirectedEdge | null;
              edge = this._edges.getById(String(directed.getEdgeId())) as PGEdge | null;
              if (edge) {
                directedEdges.removeChild(directed);
                directed.updateEdge(edge);
                resolved.push(directed);
              }
            }
          }
          if (resolved.length) valid = facet.init(resolved);
        }
        if (valid) this._setFacets(facets);
      }
    }
    super._handleChange(change, args);
    if (change === NodeChange.Restore && this._edges) {
      for (
        edge = this._edges.getFirstChild() as PGEdge | null;
        edge;
        edge = edge.getNext() as PGEdge | null
      ) {
        if (!edge.getProperty("cSt")) edge.assignStyleFrom(this);
      }
    }
  }

  /** Reads the edges' curves one after the other (mapped by `trf`); facets add nothing. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override rewindVertices(index?: number): boolean {
    this._currentEdge = this._edges.getFirstChild() as PGEdge | null;
    this._vertexSource = null;
    for (let edge = this._currentEdge; edge; edge = edge.getNext() as PGEdge | null) {
      if (!edge.getPathBase().rewindVertices(0)) return false;
    }
    return true;
  }

  override readVertex(vertex: Vertex): boolean {
    if (this._currentEdge && !this._currentFacet) {
      if (this._vertexSource && this._vertexSource.readVertex(vertex)) return true;
      if (this._vertexSource) this._currentEdge = this._currentEdge.getNext() as PGEdge | null;
      if (this._currentEdge) {
        this._vertexSource = this.$trf
          ? new VertexTransformer(this._currentEdge.getPathBase(), this.$trf)
          : this._currentEdge.getPathBase();
        return this._vertexSource.readVertex(vertex);
      }
      this._vertexSource = null;
      return false;
    }
    return false;
  }

  /** Whether any facet has a fill. */
  override hasStyleFill(): boolean {
    let fill = false;
    if (this._facets.getFirstChild()) {
      for (
        let facet = this._facets.getFirstChild() as PGFacet | null;
        facet && !fill;
        facet = facet.getNext() as PGFacet | null
      ) {
        fill = (facet.getPaintLayers() as PaintLayers).hasStyleFill();
      }
    }
    return fill;
  }

  /**
   * Fills the facets: first at double size into a scratch canvas (seams,
   * then cut-out halves), drawn back at half size, then once more at
   * full size on top.
   */
  override _paintFill(context: ShapePaintContext, separate: boolean): void {
    if (context.configuration.isOutline(context as never) || !this.hasStyleFill()) return;
    const up = new Transform(2, 0, 0, 2, 0, 0);
    const down = new Transform(0.5, 0, 0, 0.5, 0, 0);
    const box = this.getPaintBBox() as Rect;
    const scaled = up.mapRect(box);
    const topLeft = scaled.getSide(Rect.Side.TOP_LEFT);
    const scratch = new Canvas2DPaintCanvas();
    scratch.resize(scaled.getWidth(), scaled.getHeight());
    scratch.prepare();
    scratch.setTransform(new Transform(1, 0, 0, 1, -topLeft.getX(), -topLeft.getY()));
    const target = context.pushCanvas(scratch);
    for (
      let facet = this._facets.getFirstChild() as PGFacet | null;
      facet;
      facet = facet.getNext() as PGFacet | null
    ) {
      facet._scene = this._scene;
      facet._paintFill(context, separate, this.$trf ? this.$trf.multiplied(up) : up, true);
    }
    for (
      let facet = this._facets.getFirstChild() as PGFacet | null;
      facet;
      facet = facet.getNext() as PGFacet | null
    ) {
      facet._scene = this._scene;
      facet._paintFill(context, separate, this.$trf ? this.$trf.multiplied(up) : up, false, true);
    }
    const saved = target.setTransform(target.getTransform(true).preMultiplied(down));
    target.drawImage(scratch, topLeft.getX(), topLeft.getY(), false, null, null, true);
    scratch.finish();
    target.setTransform(saved);
    context.popCanvas();
    for (
      let facet = this._facets.getFirstChild() as PGFacet | null;
      facet;
      facet = facet.getNext() as PGFacet | null
    ) {
      facet._scene = this._scene;
      facet._paintFill(context, separate, this.$trf);
    }
  }

  /** Whether any edge has a border. */
  override hasStyleBorder(): boolean {
    let border = false;
    for (
      let edge = this._edges.getFirstChild() as PGEdge | null;
      edge && !border;
      edge = edge.getNext() as PGEdge | null
    ) {
      const layers = edge.getPaintLayers();
      if (layers) border = layers.hasStyleBorder();
    }
    return border;
  }

  /** Fills always paint separately, borders when an edge has one; skips GShape's rules. */
  override _isSeparateStylePaintLayer(context: StylePaintContext, layer: string): boolean {
    return (
      !!(Object.getPrototypeOf(Shape.prototype) as Shape)._isSeparateStylePaintLayer.call(
        this,
        context,
        layer,
      ) || !!(layer === StyleLayer.Fill || (layer === StyleLayer.Border && this.hasStyleBorder()))
    );
  }

  /**
   * Strokes the edges that follow the graph's style together (with the
   * anchor joins) and fills them with `border`'s pattern, then each group
   * of connected edges with the same own style the same way.
   */
  override _paintBorder(
    context: ShapePaintContext,
    separate: boolean,
    border: BorderPaintLayer | null,
  ): void {
    if (context.configuration.isOutline(context as never)) {
      super._paintBorder(context, separate, border);
      return;
    }
    if (!(this.hasStyleBorder() && separate)) return;
    const layer = border as EdgeBorder;
    let canvas: PaintCanvas;
    let edge: PGEdge | null;
    if (layer.$_pt && layer.$_bw > 0 && layer.$_op > 0 && true === layer.$_vs) {
      const styleCanvas = this._createStyleCanvas(context, this.getPaintBBox() as Rect);
      canvas = context.pushCanvas(styleCanvas);
      try {
        for (
          edge = this._edges.getFirstChild() as PGEdge | null;
          edge;
          edge = edge.getNext() as PGEdge | null
        ) {
          if (edge.getProperty("cSt", false, null, true)) edge.painted = false;
          else {
            edge._paintBorder(context, this.$trf, this._scene, true, layer);
            edge.painted = true;
          }
        }
        for (
          let anchor = this._anchors.getFirstChild() as PGAnchor | null;
          anchor;
          anchor = anchor.getNext() as PGAnchor | null
        ) {
          anchor._paintBorder(context, this.$trf, this._scene, true);
        }
        let patternBox = this.getPatternBBox(context.isIncludingInvisible());
        if (patternBox) {
          let half = 0.5 * layer.$_bw;
          if (this.$trf) {
            half /= this.$trf.getScaleFactor();
            patternBox = patternBox.expanded(half, half, half, half);
          } else patternBox = patternBox.expanded(half, half, half, half);
        }
        const shapePaint = this.createShapePaint(context, layer.$_pt, patternBox);
        if (shapePaint && shapePaint.paint) {
          let box = this.getGeometryBBox() as Rect;
          const padding = this.getStyleBorderPadding(layer);
          if (padding) box = box.expanded(padding, padding, padding, padding);
          let area = (box = this._calculateMarkersBorderBBox(box, layer));
          let paintTransform: Transform | null = null;
          if (shapePaint.transform && shapePaint.transform.isValid()) {
            paintTransform = shapePaint.transform;
            if (this.$trf) paintTransform = paintTransform.multiplied(this.$trf);
            if (layer.$_px && !layer.$_px.isIdentity()) {
              paintTransform = paintTransform.preMultiplied(layer.$_px);
            }
          }
          const current = context.canvas;
          if (paintTransform) {
            area = (paintTransform.inverted() as Transform).mapRect(area);
            const saved = current.setTransform(
              current.getTransform(true).multiplied(paintTransform),
            );
            current.fillRect(
              area.getX(),
              area.getY(),
              area.getWidth(),
              area.getHeight(),
              shapePaint.paint,
              layer.$_op,
              Canvas2DPaintCanvas.CompositeOperator.SourceIn,
            );
            current.setTransform(saved);
          } else {
            current.fillRect(
              area.getX(),
              area.getY(),
              area.getWidth(),
              area.getHeight(),
              shapePaint.paint,
              layer.$_op,
              Canvas2DPaintCanvas.CompositeOperator.SourceIn,
            );
          }
        }
        canvas.drawCanvas(
          styleCanvas,
          NULL_COORDINATE,
          NULL_COORDINATE,
          layer.$_op,
          layer.getBlendingForContext(context as never),
        );
        styleCanvas.finish();
      } finally {
        context.popCanvas();
      }
    }
    const paintBox = this.getPaintBBox() as Rect;
    if (this.hasCustomStyleEdges()) {
      let styleEdge: PGEdge;
      let group: PGEdge[];
      const anchors = this._getInternalMapAsArray(this._anchors) as GraphAnchor[];
      const edges = this._getInternalMapAsArray(this._edges) as GraphEdge[];
      const anchorColors = new GraphColorMap<GraphAnchor>();
      const edgeColors = new GraphColorMap<GraphEdge>();
      const collect = (visited: GraphEdge): boolean => {
        const other = visited as PGEdge;
        const differs = !other.hasSameStyle(styleEdge);
        if (!differs) group.push(other);
        return differs;
      };
      for (
        edge = this._edges.getFirstChild() as PGEdge | null;
        edge;
        edge = edge.getNext() as PGEdge | null
      ) {
        if (!edge.painted && edge.getProperty("cSt", false, null, true)) {
          const groupCanvas = this._createStyleCanvas(context, paintBox);
          canvas = context.pushCanvas(groupCanvas);
          styleEdge = edge;
          group = [];
          try {
            const start = edge.getSource() as GraphAnchor;
            anchorColors.initWhite(anchors);
            edgeColors.initWhite(edges);
            this.depthFirstSearch(collect, null, start, anchorColors, edgeColors);
            const reached = anchorColors.getItemsOfColor(GraphColorMap.Colors.Black);
            for (let i = 0; i < reached.length; ++i) {
              (reached[i] as PGAnchor)._paintBorder(
                context,
                this.$trf,
                this._scene,
                true,
                styleEdge,
              );
            }
            each(
              (styleEdge.getPaintLayers() as PaintLayers).getBorderLayers(true),
              (_index, groupBorder) => {
                const borderLayer = groupBorder as EdgeBorder;
                const borderCanvas = this._createStyleCanvas(context, paintBox);
                const into = context.pushCanvas(borderCanvas);
                try {
                  let curves: Rect | null = null;
                  let markers: Rect | null = null;
                  for (let i = 0; i < group.length; ++i) {
                    const member = group[i] as PGEdge;
                    member._paintBorder(context, this.$trf, this._scene, true, borderLayer);
                    member.painted = true;
                    const box = member.getPathBase().getGeometryBBox() as Rect;
                    curves = curves ? curves.united(box) : box;
                    const markerBox = member.getMarkersBorderBBox(this.$trf, borderLayer);
                    if (markerBox) markers = markers ? markers.united(markerBox) : markerBox;
                  }
                  const shapePaint = this.createShapePaint(
                    context,
                    borderLayer.getProperty("_pt", false, null, true) as never,
                    curves,
                  );
                  if (shapePaint && shapePaint.paint) {
                    let area = this.$trf ? this.$trf.mapRect(curves as Rect) : (curves as Rect);
                    const padding = styleEdge.getStyleBorderPadding(borderLayer);
                    if (padding) area = area.expanded(padding, padding, padding, padding);
                    let fillArea = (area = markers ? area.united(markers) : area);
                    let paintTransform: Transform | null = null;
                    if (shapePaint.transform && shapePaint.transform.isValid()) {
                      paintTransform = shapePaint.transform;
                      if (this.$trf) paintTransform = paintTransform.multiplied(this.$trf);
                      const patternTransform = borderLayer.getProperty(
                        "_px",
                        false,
                        null,
                        true,
                      ) as Transform | null;
                      if (patternTransform && !patternTransform.isIdentity()) {
                        paintTransform = paintTransform.preMultiplied(patternTransform);
                      }
                    }
                    if (paintTransform) {
                      fillArea = (paintTransform.inverted() as Transform).mapRect(fillArea);
                      const saved = borderCanvas.setTransform(
                        borderCanvas.getTransform(true).multiplied(paintTransform),
                      );
                      borderCanvas.fillRect(
                        fillArea.getX(),
                        fillArea.getY(),
                        fillArea.getWidth(),
                        fillArea.getHeight(),
                        shapePaint.paint,
                        borderLayer.getProperty("_op", false, null, true) as number,
                        Canvas2DPaintCanvas.CompositeOperator.SourceIn,
                      );
                      borderCanvas.setTransform(saved);
                    } else {
                      borderCanvas.fillRect(
                        fillArea.getX(),
                        fillArea.getY(),
                        fillArea.getWidth(),
                        fillArea.getHeight(),
                        shapePaint.paint,
                        borderLayer.getProperty("_op", false, null, true) as number,
                        Canvas2DPaintCanvas.CompositeOperator.SourceIn,
                      );
                    }
                    into.drawCanvas(
                      borderCanvas,
                      NULL_COORDINATE,
                      NULL_COORDINATE,
                      borderLayer.$_op,
                      borderLayer.getBlendingForContext(context as never),
                    );
                  }
                } finally {
                  borderCanvas.finish();
                  context.popCanvas();
                }
              },
            );
            canvas.drawCanvas(
              groupCanvas,
              0,
              0,
              null,
              Canvas2DPaintCanvas.CompositeOperator.DestinationOut,
            );
            canvas.drawCanvas(
              groupCanvas,
              0,
              0,
              null,
              Canvas2DPaintCanvas.CompositeOperator.SourceOver,
            );
            groupCanvas.finish();
          } finally {
            context.popCanvas();
          }
        }
      }
    }
  }

  /** Whether any edge has its own style. */
  hasCustomStyleEdges(): boolean {
    let custom = false;
    for (
      let edge = this._edges.getFirstChild() as PGEdge | null;
      edge && !custom;
      edge = edge.getNext() as PGEdge | null
    ) {
      if (edge.getProperty("cSt", false, null, true)) custom = true;
    }
    return custom;
  }

  override _requireMiterLimitApproximation(): unknown {
    return true;
  }

  /** `box` grown by every edge's markers. */
  override _calculateMarkersBorderBBox(box: Rect, border: BorderPaintLayer): Rect {
    for (
      let edge = this._edges.getFirstChild() as PGEdge | null;
      edge;
      edge = edge.getNext() as PGEdge | null
    ) {
      const markers = edge.getMarkersBorderBBox(this.$trf, border);
      if (markers) box = box.united(markers);
    }
    return box;
  }

  /** Like GShape's, but the border padding is the widest of the graph's and the edges' own. */

  override _calculatePaintBBox(arg?: unknown, includeInvisible?: unknown): Rect | null {
    const geometry = this.getGeometryBBox(includeInvisible);
    if (!geometry) return null;
    const effects = this.getEffects() as Effects;
    let paint = geometry;
    const scaleBox = new Rect(
      geometry.getX(),
      geometry.getY(),
      geometry.getWidth(),
      geometry.getHeight(),
    );
    if (this.hasStyleFill()) {
      // The old code passes a box where the effects expect a scale; kept.
      const fill = effects.getEffectsBBox(geometry, StyleLayer.Fill, scaleBox as unknown as number);
      paint = paint.united(fill);
    }
    let borders: Rect | null = null;
    if (this.hasStyleBorder()) {
      let box = geometry;
      each((this.getPaintLayers() as PaintLayers).getBorderLayers(true), (_index, border) => {
        let padding = this.getStyleBorderPadding(border);
        for (
          let edge = this._edges.getFirstChild() as PGEdge | null;
          edge;
          edge = edge.getNext() as PGEdge | null
        ) {
          if (edge.getProperty("cSt", false, null, true)) {
            const own = edge.getStyleBorderPadding(border);
            if (own > padding) padding = own;
          }
        }
        // Quirk kept: the box grows from one border layer to the next.
        if (padding) box = box.expanded(padding, padding, padding, padding);
        box = this._calculateMarkersBorderBBox(box, border);
        const withEffects = effects.getEffectsBBox(
          box,
          StyleLayer.Border,
          box as unknown as number,
        );
        paint = paint.united(withEffects);
        borders = borders ? borders.united(box) : box;
      });
    }
    return (paint = effects.getEffectsBBox(
      paint,
      null,
      (borders || scaleBox) as unknown as number,
    ));
  }

  _geometryChange(event: Event): void {
    if (!(event as Event & { temporary?: unknown }).temporary)
      this._notifyChange(ElementChange.FinishGeometryUpdate);
  }

  _beforeGeometryChange(): void {
    this._notifyChange(ElementChange.PrepareGeometryUpdate);
  }

  override toString(): string {
    return "[Object GPathsGraph]";
  }
}

const proto = PathsGraph.prototype;
proto._facets = null as unknown as MapContainer;
proto._facetsHash = null;
proto._facetsUpdateCounter = 0;
proto._currentEdge = null;
proto._currentFacet = null;
proto._vertexSource = null;
