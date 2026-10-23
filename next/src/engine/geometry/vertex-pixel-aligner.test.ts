import { describe, expect, it } from "vitest";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { Vertex } from "./vertex.ts";
import { VertexContainer } from "./vertex-container.ts";
import { VertexPixelAligner } from "./vertex-pixel-aligner.ts";

function read(source: VertexPixelAligner): number[] {
  const out: number[] = [];
  const v = new Vertex();
  source.rewindVertices(0);
  while (source.readVertex(v)) out.push(v.command, v.x, v.y);
  return out;
}

const src = VertexContainer.deserialize([1, 0.3, 0.7, 2, 10.49, 0.2, 4, 3.99999999999, 2, 5, 7, 8]);

describe("VertexPixelAligner", () => {
  it("snaps to pixel centers, or corners with full", () => {
    const identity = new Transform();
    expect(read(new VertexPixelAligner(src, identity, false))).toEqual([
      1, 0.5, 0.5, 2, 10.5, 0.5, 4, 4.5, 2.5, 5, 7, 8,
    ]);
    expect(read(new VertexPixelAligner(src, identity, true))).toEqual([
      1, 0, 0, 2, 10, 0, 4, 4, 2, 5, 7, 8,
    ]);
  });

  it("snaps in device space and maps back", () => {
    const zoom = new Transform(2, 0, 0, 2, 0, 0);
    // 0.3 * 2 = 0.6 -> 0.5 -> 0.25; 10.49 * 2 = 20.98 -> 20.5 -> 10.25.
    expect(read(new VertexPixelAligner(src, zoom, false)).slice(0, 6)).toEqual([
      1, 0.25, 0.75, 2, 10.25, 0.25,
    ]);
  });

  it("passes vertices through without a transform or with a singular one", () => {
    const expected = [1, 0.3, 0.7, 2, 10.49, 0.2, 4, 3.99999999999, 2, 5, 7, 8];
    expect(read(new VertexPixelAligner(src, null, false))).toEqual(expected);
    expect(read(new VertexPixelAligner(src, new Transform(0, 0, 0, 0, 0, 0), false))).toEqual(
      expected,
    );
  });

  it("stretches the shape to the aligned bbox", () => {
    const bbox = new Rect(0.2, 0.2, 9.6, 9.6);
    const box = VertexContainer.deserialize([1, 0.2, 0.2, 2, 9.8, 9.8, 2, 5, 5, 2, 0.2, 9.8]);
    const out = read(new VertexPixelAligner(box, new Transform(), false, bbox));
    // Corners land on the box corners plus the half pixel.
    const expected = [1, 0.7, 0.7, 2, 10.3, 10.3, 2, 5.5, 5.5, 2, 0.7, 10.3];
    expect(out.length).toBe(expected.length);
    out.forEach((value, i) => expect(value).toBeCloseTo(expected[i] as number, 12));
  });

  it("needs a transform for a bbox", () => {
    expect(() => new VertexPixelAligner(src, null, false, new Rect(0, 0, 1, 1))).toThrow(TypeError);
  });
});
