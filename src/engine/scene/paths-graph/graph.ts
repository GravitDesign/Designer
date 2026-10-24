// Old: chunk.vendor.js module 818 (GGraph, not in the G barrel).
/**
 * A directed graph of anchors and edges kept in two maps by id, with a
 * depth first search that colors anchors and edges white (unvisited),
 * gray (in progress) and black (done), and a partitioner that runs the
 * search once per connected part. The paths graph mixes it in and keeps
 * its maps in node containers instead (it overrides the map accessors).
 */
import { defineMixin, registerClass, type AnyConstructor } from "../../core/object.ts";
import { AnchorLink } from "../anchor-link.ts";
import type { AnchorId } from "../anchor.ts";

/** Anything the color map can hold: it is keyed by the item's id. */
export interface GraphItem {
  getId(): AnchorId | null;
}

/** An anchor as the graph uses it. */
export interface GraphAnchor extends GraphItem {
  getOutEdges(): GraphEdge[];
  getInEdges(): GraphEdge[];
  addOutEdge(edge: GraphEdge): void;
  addInEdge(edge: GraphEdge): void;
  removeOutEdge(edge: GraphEdge): void;
  removeInEdge(edge: GraphEdge): void;
}

/** An edge as the graph uses it. */
export interface GraphEdge extends GraphItem {
  getAnchors(): (GraphAnchor | null)[];
  init(source: unknown, destination: unknown, data?: unknown): void;
  setAnchors(ends: readonly AnchorLink[]): void;
  getSource(): GraphAnchor | null;
  getDestination(): GraphAnchor | null;
}

/** Returns true to stop the search along that edge. */
export type EdgeVisitor = (edge: GraphEdge) => unknown;
export type AnchorVisitor = (anchor: GraphAnchor) => void;
/** Called once per connected part with its anchors and edges. */
export type PartitionVisitor = (anchors: GraphAnchor[], edges: GraphEdge[]) => void;

const Colors = {
  White: 0,
  Gray: 1,
  Black: 2,
} as const;

/** Map keys are ids converted to strings, as the old object keys were. */
function keyOf(item: GraphItem): string {
  return String(item.getId());
}

interface ColorEntry {
  idx: number;
  color: number;
}

/** GGraph.ColorMap: the color of every item, with one slot list per color. */
export class GraphColorMap<T extends GraphItem = GraphItem> {
  static Colors = Colors;

  declare _itemsIdx: Record<string, ColorEntry> | null;
  declare _colorMap: (T | null | undefined)[][] | null;

  /** Every item white. */
  initWhite(items: readonly T[]): void {
    this._itemsIdx = {};
    for (let i = 0; i < items.length; ++i) {
      this._itemsIdx[keyOf(items[i] as T)] = { idx: i, color: Colors.White };
    }
    this._colorMap = new Array<(T | null | undefined)[]>(Object.keys(Colors).length);
    this._colorMap[Colors.White] = items.slice();
    this._colorMap[Colors.Gray] = new Array<T>(items.length);
    this._colorMap[Colors.Black] = new Array<T>(items.length);
  }

  getColor(item: T): number | null {
    const entry = (this._itemsIdx as Record<string, ColorEntry>)[keyOf(item)];
    return entry ? entry.color : null;
  }

  setColor(item: T, color: number): void {
    if (color >= Colors.White && color <= Colors.Black) {
      const entry = (this._itemsIdx as Record<string, ColorEntry>)[keyOf(item)];
      if (entry && entry.color !== color) {
        const map = this._colorMap as (T | null | undefined)[][];
        const from = map[entry.color] as (T | null | undefined)[];
        entry.color = color;
        (map[entry.color] as (T | null | undefined)[])[entry.idx] = from[entry.idx];
        from[entry.idx] = null;
      }
    }
  }

  getFirstOfColor(color: number): T | null {
    if (color >= Colors.White && color <= Colors.Black) {
      const slots = (this._colorMap as (T | null | undefined)[][])[color] as (T | null)[];
      for (let i = 0; i < slots.length; ++i) if (slots[i]) return slots[i] as T;
    }
    return null;
  }

  getItemsOfColor(color: number): T[] {
    const items: T[] = [];
    if (color >= Colors.White && color <= Colors.Black) {
      const slots = (this._colorMap as (T | null | undefined)[][])[color] as (T | null)[];
      for (let i = 0; i < slots.length; ++i) if (slots[i]) items.push(slots[i] as T);
    }
    return items;
  }

  getIdxItemsOfColor(color: number): number[] {
    const indices: number[] = [];
    if (color >= Colors.White && color <= Colors.Black) {
      const slots = (this._colorMap as (T | null | undefined)[][])[color] as (T | null)[];
      for (let i = 0; i < slots.length; ++i) if (slots[i]) indices.push(i);
    }
    return indices;
  }

  clearItemsOfColor(color: number): void {
    if (color >= Colors.White && color <= Colors.Black) {
      const slots = (this._colorMap as (T | null | undefined)[][])[color] as (T | null)[];
      for (let i = 0; i < slots.length; ++i) if (slots[i]) slots[i] = null;
    }
  }
}

GraphColorMap.prototype._itemsIdx = null;
GraphColorMap.prototype._colorMap = null;

function graphMembers<TBase extends AnyConstructor>(Base: TBase) {
  abstract class GraphMembers extends Base {
    // The maps are plain objects here; the paths graph replaces them with
    // node containers and overrides every method that touches them directly.
    declare _edges: unknown;
    declare _anchors: unknown;
    declare _data: unknown;

    getEdges(): unknown {
      return this._edges;
    }

    getAnchors(): unknown {
      return this._anchors;
    }

    getData(): unknown {
      return this._data;
    }

    setData(data: unknown): void {
      this._data = data;
    }

    addEdge(edge: GraphEdge): void {
      (this._edges as Record<string, GraphEdge>)[keyOf(edge)] = edge;
    }

    /** Points `edge` from `source` to `destination`, unlinking it first when it pointed elsewhere. */
    interconnectAnchors(source: GraphAnchor, destination: GraphAnchor, edge: GraphEdge): void {
      const ends = edge.getAnchors().slice();
      if (ends[0] && ends[1]) {
        if (ends[0] == source && ends[1] == destination) return;
        this.disconnectAnchors(edge);
      }
      edge.init(source, destination);
      source.addOutEdge(edge);
      destination.addInEdge(edge);
    }

    connectAnchors(source: GraphAnchor, destination: GraphAnchor, edge: GraphEdge): void {
      this.interconnectAnchors(source, destination, edge);
      this.addEdge(edge);
    }

    addAnchor(anchor: GraphAnchor): void {
      (this._anchors as Record<string, GraphAnchor>)[keyOf(anchor)] = anchor;
    }

    /** Removes the edge from its anchors; it keeps their ids as unresolved links. */
    disconnectAnchors(edge: GraphEdge): void {
      const ends = edge.getAnchors().slice();
      if (ends[0] && ends[1]) {
        const sourceLink = new AnchorLink(ends[0].getId());
        const destinationLink = new AnchorLink(ends[1].getId());
        ends[0].removeOutEdge(edge);
        ends[1].removeInEdge(edge);
        edge.setAnchors([sourceLink, destinationLink]);
      }
    }

    removeEdge(edge: GraphEdge): void {
      this.disconnectAnchors(edge);
      this._removeEdge(edge);
    }

    _removeEdge(edge: GraphEdge): void {
      const edges = this._edges as Record<string, GraphEdge>;
      if (edges[keyOf(edge)]) {
        Reflect.deleteProperty(edges, keyOf(edge));
        if (!this._edges) this._edges = {};
      }
    }

    removeAnchor(anchor: GraphAnchor): void {
      let edges = anchor.getOutEdges().slice();
      for (let i = 0; i < edges.length; ++i) this.removeEdge(edges[i] as GraphEdge);
      edges = anchor.getInEdges().slice();
      for (let i = 0; i < edges.length; ++i) this.removeEdge(edges[i] as GraphEdge);
      this._removeAnchor(anchor);
    }

    _removeAnchor(anchor: GraphAnchor): void {
      const anchors = this._anchors as Record<string, GraphAnchor>;
      if (anchors[keyOf(anchor)]) {
        Reflect.deleteProperty(anchors, keyOf(anchor));
        if (!this._anchors) this._anchors = {};
      }
    }

    /**
     * Runs a search from `start` (or the first anchor), hands each
     * connected part to `onPart`, and repeats from the first anchor no
     * search reached until every anchor was reached.
     */
    dfsPartitioner(
      edgeVisitor: EdgeVisitor | null,
      anchorVisitor: AnchorVisitor | null,
      onPart: PartitionVisitor | null,
      start: GraphAnchor | null,
    ): void {
      const anchorColors = new GraphColorMap<GraphAnchor>();
      const anchors = this._getInternalMapAsArray(this._anchors) as GraphAnchor[] | null;
      const edges = this._getInternalMapAsArray(this._edges) as GraphEdge[] | null;
      if (anchors && edges) {
        anchorColors.initWhite(anchors);
        const edgeColors = new GraphColorMap<GraphEdge>();
        edgeColors.initWhite(edges);
        for (
          let anchor = start || anchorColors.getFirstOfColor(Colors.White);
          anchor;
          anchor = anchorColors.getFirstOfColor(Colors.White)
        ) {
          const partAnchors = new GraphColorMap<GraphAnchor>();
          partAnchors.initWhite(anchors);
          const partEdges = new GraphColorMap<GraphEdge>();
          partEdges.initWhite(edges);
          this.depthFirstSearch(edgeVisitor, anchorVisitor, anchor, partAnchors, partEdges);
          const reachedEdges = partEdges.getItemsOfColor(Colors.Black);
          const reachedAnchors = partAnchors.getItemsOfColor(Colors.Black);
          if (onPart) onPart(reachedAnchors, reachedEdges);
          for (let i = 0; i < reachedAnchors.length; ++i) {
            anchorColors.setColor(reachedAnchors[i] as GraphAnchor, Colors.Black);
          }
          for (let i = 0; i < reachedEdges.length; ++i) {
            edgeColors.setColor(reachedEdges[i] as GraphEdge, Colors.Black);
          }
        }
      }
    }

    /**
     * Visits `anchor`, then follows its out edges and in edges (both
     * directions). An edge is visited once; `edgeVisitor` returning true
     * stops the search from going on through that edge.
     */
    depthFirstSearch(
      edgeVisitor: EdgeVisitor | null,
      anchorVisitor: AnchorVisitor | null,
      anchor: GraphAnchor,
      anchorColors: GraphColorMap<GraphAnchor>,
      edgeColors: GraphColorMap<GraphEdge>,
    ): void {
      anchorColors.setColor(anchor, Colors.Gray);
      if (anchorVisitor) anchorVisitor(anchor);
      const follow = (edge: GraphEdge, next: GraphAnchor): void => {
        let stop = false;
        if (edgeColors.getColor(edge) === Colors.White) {
          edgeColors.setColor(edge, Colors.Black);
          if (edgeVisitor) stop = !!edgeVisitor(edge);
        }
        if (!stop && anchorColors.getColor(next) === Colors.White) {
          this.depthFirstSearch(edgeVisitor, anchorVisitor, next, anchorColors, edgeColors);
        }
      };
      const outEdges = anchor.getOutEdges();
      for (let i = 0; i < outEdges.length; ++i) {
        const edge = outEdges[i] as GraphEdge;
        follow(edge, edge.getDestination() as GraphAnchor);
      }
      const inEdges = anchor.getInEdges();
      for (let i = 0; i < inEdges.length; ++i) {
        const edge = inEdges[i] as GraphEdge;
        follow(edge, edge.getSource() as GraphAnchor);
      }
      anchorColors.setColor(anchor, Colors.Black);
    }

    /** The values of a plain map, in key order. */
    _getInternalMapAsArray(map: unknown): unknown[] | null {
      const object = map as Record<string, unknown>;
      const keys = Object.keys(object);
      const values = new Array<unknown>(keys.length);
      for (let i = 0; i < keys.length; ++i) values[i] = object[keys[i] as string];
      return values;
    }
  }
  // The old prototype defaults; the mixing copied them to the paths graph too.
  const prototype = GraphMembers.prototype;
  prototype._edges = {};
  prototype._anchors = {};
  prototype._data = null;
  return GraphMembers;
}

export class Graph extends graphMembers(Object) {
  static {
    registerClass(this, "GGraph");
  }

  static ColorMap = GraphColorMap;

  constructor() {
    super();
    this._edges = Object.create(null) as Record<string, GraphEdge>;
    this._anchors = Object.create(null) as Record<string, GraphAnchor>;
  }

  // Only the class has it: the old mixing skipped toString.
  override toString(): string {
    return "[Object GGraph]";
  }
}

/** GGraph as a mixin: `class PathsGraph extends GraphMixin(Shape)`. */
export const GraphMixin = defineMixin(Graph, graphMembers);
