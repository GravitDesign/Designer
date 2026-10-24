import { describe, expect, it } from "vitest";
import { getTypeId } from "../core/object.ts";
import { Transform } from "../math/transform.ts";
import { Vertex } from "./vertex.ts";
import { VertexContainer } from "./vertex-container.ts";
import { VertexSource } from "./vertex-source.ts";
import { VertexTransformer } from "./vertex-transformer.ts";

function read(source: VertexTransformer): number[] {
  const out: number[] = [];
  const v = new Vertex();
  source.rewindVertices(0);
  while (source.readVertex(v)) out.push(v.command, v.x, v.y);
  return out;
}

describe("VertexTransformer", () => {
  const src = VertexContainer.deserialize([1, 1, 2, 3, 3, 4, 5, 7, 8]);

  it("maps every vertex but Close", () => {
    const t = new VertexTransformer(src, new Transform(2, 0, 0, 3, 10, 20));
    expect(read(t)).toEqual([1, 12, 26, 3, 16, 32, 5, 7, 8]);
    expect(t.hasVertexForRead()).toBe(false);
    expect(t.toString()).toBe("[Object GVertexTransformer]");
  });

  it("passes vertices through without a transform and can change it", () => {
    const t = new VertexTransformer(src, null);
    expect(read(t)).toEqual([1, 1, 2, 3, 3, 4, 5, 7, 8]);
    t.setTransform(new Transform(1, 0, 0, 1, 1, 1));
    expect(t.getTransform()?.getMatrix()).toEqual([1, 0, 0, 1, 1, 1]);
    expect(read(t)).toEqual([1, 2, 3, 3, 4, 5, 5, 7, 8]);
  });

  it("throws on an unknown command only when there is a transform", () => {
    const v = new Vertex();
    v.command = 99;
    v.x = 1;
    v.y = 2;
    VertexTransformer.transformVertex(v, null);
    expect(() => VertexTransformer.transformVertex(v, new Transform(2, 0, 0, 2, 0, 0))).toThrow(
      "Unknown vertex command: 99",
    );
  });

  it("keeps the old type ids", () => {
    expect(getTypeId(VertexTransformer)).toBe(21);
    expect(getTypeId(VertexSource)).toBe(22);
  });
});
