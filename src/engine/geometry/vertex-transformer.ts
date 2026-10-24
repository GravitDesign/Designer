// Old: chunk.vendor.js module 63 (GVertexTransformer).
import { registerClass } from "../core/object.ts";
import type { Transform } from "../math/transform.ts";
import { Vertex } from "./vertex.ts";
import { VertexSource, type VertexReader } from "./vertex-source.ts";

/** A vertex source that maps another source's vertices through a transform. */
export class VertexTransformer extends VertexSource {
  static {
    registerClass(this, "GVertexTransformer");
  }

  /**
   * Maps a vertex in place. Close vertices keep their position; an
   * unknown command throws, but only when there is a transform.
   */
  static transformVertex(vertex: Vertex, transform: Transform | null | undefined): void {
    if (!transform) return;
    switch (vertex.command) {
      case Vertex.Command.Move:
      case Vertex.Command.Line:
      case Vertex.Command.Curve:
      case Vertex.Command.Curve2:
        transform.map(vertex);
        break;
      case Vertex.Command.Close:
        break;
      default:
        throw new Error("Unknown vertex command: " + vertex.command.toString());
    }
  }

  private _source: VertexReader;
  private _transform: Transform | null | undefined;

  constructor(source: VertexReader, transform: Transform | null | undefined) {
    super();
    this._source = source;
    this._transform = transform;
  }

  getTransform(): Transform | null | undefined {
    return this._transform;
  }

  setTransform(transform: Transform | null | undefined): void {
    this._transform = transform;
  }

  override rewindVertices(index?: number): boolean {
    return this._source.rewindVertices(index);
  }

  override readVertex(vertex: Vertex): boolean {
    if (!this._source.readVertex(vertex)) return false;
    VertexTransformer.transformVertex(vertex, this._transform);
    return true;
  }

  override hasVertexForRead(): boolean {
    return this._source.hasVertexForRead();
  }

  override toString(): string {
    return "[Object GVertexTransformer]";
  }
}
