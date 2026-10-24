// Old: chunk.vendor.js module 903 (GVertexTarget).
/**
 * Something vertices can be written to. Only used as a mixin in the old
 * code (GVertexContainer); the base members throw until a class
 * overrides them.
 */
import { defineMixin, registerClass, type AnyConstructor } from "../core/object.ts";
import { Vertex } from "./vertex.ts";
import type { VertexReader } from "./vertex-source.ts";

function vertexTargetMembers<TBase extends AnyConstructor>(Base: TBase) {
  abstract class VertexTargetMembers extends Base {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature, overridden by real targets
    addVertex(command: number, x: number, y: number): void {
      throw new Error("Not Supported");
    }

    /** Adds every vertex of `source` from `index` (default 0) on. */
    appendVertices(source: VertexReader, index?: number): void {
      if (source.rewindVertices(index || 0)) {
        const vertex = new Vertex();
        while (source.readVertex(vertex)) this.addVertex(vertex.command, vertex.x, vertex.y);
      }
    }

    clearVertices(): void {
      throw new Error("Not Supported.");
    }
  }
  return VertexTargetMembers;
}

export class VertexTarget extends vertexTargetMembers(Object) {
  static {
    // Not on the old G namespace, so it never had a recorded number; it
    // only needs one to work as a mixin identity.
    registerClass(this, "GVertexTarget");
  }

  override toString(): string {
    return "[Object GVertexTarget]";
  }
}

/** GVertexTarget as a mixin: `class X extends VertexTargetMixin(Base)`. */
export const VertexTargetMixin = defineMixin(VertexTarget, vertexTargetMembers);
