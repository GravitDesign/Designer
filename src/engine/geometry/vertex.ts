// Old: chunk.vendor.js module 48 (GVertex).

/** Vertex commands. Curves spread over several vertices, see Vertex. */
export const VertexCommand = {
  Move: 1,
  Line: 2,
  /** Quadratic curve: this vertex is the end point, the next one the control point. */
  Curve: 3,
  /** Cubic curve: this vertex is the end point, the next two the control points. */
  Curve2: 4,
  Close: 5,
} as const;

/**
 * One vertex as vertex sources hand it out: a command and a position.
 * Readers reuse one Vertex and let `readVertex` overwrite it.
 */
export class Vertex {
  static Command = VertexCommand;

  // The old prototype defaults were null; a fresh vertex reads as
  // {command: null, x: null, y: null}, and the scenarios record that.
  declare command: number;
  declare x: number;
  declare y: number;
}

const nullDefault = null as unknown as number;
Vertex.prototype.command = nullDefault;
Vertex.prototype.x = nullDefault;
Vertex.prototype.y = nullDefault;
