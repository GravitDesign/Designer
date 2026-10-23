import { describe, expect, it } from "vitest";
import { getTypeId } from "../core/object.ts";
import { Transform } from "../math/transform.ts";
import { Vertex } from "./vertex.ts";
import { VertexContainer } from "./vertex-container.ts";
import type { VertexReader } from "./vertex-source.ts";

type Source = VertexReader & { isClockWise(): boolean };

function flat(source: VertexReader | null): (number | null)[] | null {
  if (!source) return null;
  const out: (number | null)[] = [];
  const v = new Vertex();
  source.rewindVertices(0);
  while (source.readVertex(v)) out.push(v.command, v.x, v.y);
  return out;
}

const square = [1, 0, 0, 2, 10, 0, 2, 10, 10, 2, 0, 10, 5, 0, 0];
const squareCcw = [1, 0, 0, 2, 0, 10, 2, 10, 10, 2, 10, 0, 5, 0, 0];

describe("VertexContainer", () => {
  it("needs a rewind before reading what was added", () => {
    const c = new VertexContainer();
    c.addVertex(1, 1, 1);
    c.addVertex(2, 2, 2);
    expect(c.hasVertexForRead()).toBe(false);
    expect(c.readVertex(new Vertex())).toBe(false);
    expect(c.rewindVertices()).toBe(true);
    const v = new Vertex();
    expect(c.readVertex(v)).toBe(true);
    expect([v.command, v.x, v.y]).toEqual([1, 1, 1]);
    expect([
      c.rewindVertices(2),
      c.readVertex(v),
      c.rewindVertices(3),
      c.rewindVertices(-1),
    ]).toEqual([true, false, false, false]);
  });

  it("maps added vertices through a transform, Close included as is", () => {
    const c = new VertexContainer();
    c.addVertex(2, 1, 0, new Transform(1, 0, 0, 1, 100, 200));
    c.addVertex(5, 7, 8, new Transform(1, 0, 0, 1, 100, 200));
    expect(flat(c)).toEqual([2, 101, 200, 5, 7, 8]);
  });

  it("serializes to a flat list and back, and copies a source", () => {
    const c = VertexContainer.deserialize(square);
    expect(VertexContainer.serialize(c)).toEqual(square);
    expect(flat(new VertexContainer(c))).toEqual(square);
    expect(new VertexContainer().getCount()).toBe(0);
    c.clearVertices();
    expect(c.getCount()).toBe(0);
  });

  it("has no type id and its own toString", () => {
    expect(getTypeId(VertexContainer)).toBeNull();
    expect(new VertexContainer().toString()).toBe("[Object GVertexContainer]");
  });

  it("splits at every Move and returns a single sub-path unchanged", () => {
    const c = VertexContainer.deserialize([2, 9, 9, 1, 0, 0, 2, 1, 1, 1, 5, 5, 2, 6, 6]);
    expect(VertexContainer.splitVertexSource(c).map(flat)).toEqual([
      [1, 0, 0, 2, 1, 1],
      [1, 5, 5, 2, 6, 6],
    ]);
    const single = VertexContainer.deserialize(square);
    expect(VertexContainer.splitVertexSource(single)[0]).toBe(single);
    const moved = VertexContainer.splitVertexSource(single, new Transform(2, 0, 0, 2, 1, 1));
    expect(moved[0]).not.toBe(single);
    expect(flat(moved[0] as VertexReader)).toEqual([
      1, 1, 1, 2, 21, 1, 2, 21, 21, 2, 1, 21, 5, 0, 0,
    ]);
  });

  it("merges a list of sources, anything else passes through", () => {
    const a = VertexContainer.deserialize([1, 0, 0, 2, 1, 1]);
    const b = VertexContainer.deserialize([1, 5, 5]);
    expect(flat(VertexContainer.mergeVertexSources([a, b]))).toEqual([1, 0, 0, 2, 1, 1, 1, 5, 5]);
    const flipped = VertexContainer.mergeVertexSources([a, b], new Transform(1, 0, 0, -1, 0, 0));
    expect(flat(flipped)).toEqual([1, 0, 0, 2, 1, -1, 1, 5, -5]);
    expect(VertexContainer.mergeVertexSources(a)).toBe(a);
  });

  it("reverses open and closed paths", () => {
    const open = VertexContainer.deserialize([1, 0, 0, 2, 10, 0, 2, 10, 10]);
    expect(flat(VertexContainer.clone(open, true))).toEqual([1, 10, 10, 2, 10, 0, 2, 0, 0]);
    expect(flat(VertexContainer.clone(VertexContainer.deserialize(square), true))).toEqual([
      1,
      0,
      10,
      2,
      10,
      10,
      2,
      10,
      0,
      2,
      0,
      0,
      5,
      null,
      null,
    ]);
    expect(flat(VertexContainer.clone(open))).toEqual([1, 0, 0, 2, 10, 0, 2, 10, 10]);
  });

  it("reverses curves with their control points swapped", () => {
    // Cubic from (0,0) to (10,0) with controls (2,5) and (8,5).
    const cubic = VertexContainer.deserialize([1, 0, 0, 4, 10, 0, 4, 2, 5, 4, 8, 5]);
    expect(flat(VertexContainer.clone(cubic, true))).toEqual([1, 10, 0, 4, 0, 0, 4, 8, 5, 4, 2, 5]);
    // Quadratic from (0,0) to (10,0) with control (5,5).
    const quad = VertexContainer.deserialize([1, 0, 0, 3, 10, 0, 3, 5, 5]);
    expect(flat(VertexContainer.clone(quad, true))).toEqual([1, 10, 0, 3, 0, 0, 3, 5, 5]);
  });

  it("throws where the old code meant to log a broken path", () => {
    expect(() => VertexContainer.clone(VertexContainer.deserialize([2, 1, 1]), true)).toThrow(
      "Path doesn't start with moveTo!",
    );
    // A curve without its control points reaches the DEBUG log line.
    const broken = VertexContainer.deserialize([1, 0, 0, 3, 10, 0]);
    expect(() => VertexContainer.clone(broken, true)).toThrow(ReferenceError);
  });

  it("makes every sub-path clockwise, or reverses all with force", () => {
    const c = VertexContainer.deserialize([...square, ...squareCcw]);
    const parts = VertexContainer.splitVertexSource(VertexContainer.makeClockWise(c)) as Source[];
    expect(parts.map((p) => p.isClockWise())).toEqual([true, true]);
    expect(flat(parts[0] as VertexReader)).toEqual(square);
    const forced = VertexContainer.splitVertexSource(
      VertexContainer.makeClockWise(c, true),
    ) as Source[];
    expect(forced.map((p) => p.isClockWise())).toEqual([false, true]);
  });
});
