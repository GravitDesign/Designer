// Old: chunk.vendor.js module 569 (GAnchor, not in the G barrel).
/**
 * A vertex of a graph with in and out edges and a payload. This is the
 * interface the paths graph implements (engine-paths-graph); the base
 * class only stores nothing and answers with its fields.
 */

/** An anchor id; the paths graph uses objects that compare with isEqual. */
export interface AnchorId {
  isEqual(other: unknown): boolean;
}

export class Anchor {
  declare _uid: AnchorId | null;
  declare _outEdges: unknown[] | null;
  declare _inEdges: unknown[] | null;
  declare _data: unknown;

  getId(): AnchorId | null {
    return this._uid;
  }

  getOutEdges(): unknown[] | null {
    return this._outEdges;
  }

  getInEdges(): unknown[] | null {
    return this._inEdges;
  }

  getData(): unknown {
    return this._data;
  }

  // The rest is implemented by subclasses.
  /* eslint-disable @typescript-eslint/no-unused-vars -- the old empty signatures */
  addEdge(edge: unknown): void {}
  addOutEdge(edge: unknown): void {}
  addInEdge(edge: unknown): void {}
  setData(data: unknown): void {}
  setOutEdges(edges: unknown): void {}
  removeEdge(edge: unknown): void {}
  removeOutEdge(edge: unknown): void {}
  removeInEdge(edge: unknown): void {}
  /* eslint-enable @typescript-eslint/no-unused-vars */

  toString(): string {
    return "[Object GAnchor]";
  }
}

const proto = Anchor.prototype;
proto._uid = null;
proto._outEdges = null;
proto._inEdges = null;
proto._data = null;
