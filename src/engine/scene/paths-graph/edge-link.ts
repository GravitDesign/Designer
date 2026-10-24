// Old: chunk.vendor.js module 930 (GEdgeLink, not in the G barrel).
/**
 * A reference to a graph edge by id that resolves to the edge object once
 * it is known. Facets of the paths graph point at their edges this way.
 */
import type { AnchorId } from "../anchor.ts";

/** What the link needs from an edge. */
export interface LinkedEdge {
  getId(): AnchorId | null;
}

export class EdgeLink<E extends LinkedEdge = LinkedEdge> {
  declare _uid: AnchorId | null;
  declare _edge: E | null;

  constructor(id?: AnchorId | null, edge?: E | null) {
    if (edge) this.setEdge(edge);
    else this._uid = id as AnchorId | null;
  }

  getId(): AnchorId | null {
    return this._uid;
  }

  /** A different id drops the resolved edge. */
  setId(id: AnchorId | null): void {
    if (id && this._edge && !(this._uid as AnchorId).isEqual(id)) this._edge = null;
    this._uid = id;
  }

  getEdge(): E | null {
    return this._edge;
  }

  setEdge(edge: E): void {
    this._uid = edge.getId();
    this._edge = edge;
  }

  toString(): string {
    return "[Object GEdgeLink]";
  }
}

EdgeLink.prototype._uid = null;
EdgeLink.prototype._edge = null;
