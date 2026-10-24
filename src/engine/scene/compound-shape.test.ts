import { describe, expect, it } from "vitest";
import { VertexPolyBoolean } from "../geometry/boolean/vertex-poly-boolean.ts";
import { VertexInfo } from "../geometry/vertex-info.ts";
import { Vertex } from "../geometry/vertex.ts";
import { Transform } from "../math/transform.ts";
import { CompoundShape } from "./compound-shape.ts";
import { Node } from "./node.ts";
import { AnchorPoint } from "./path-base.ts";
import { Path } from "./path.ts";

function square(x: number, y: number, size: number, bool?: number): Path {
  const p = new Path(true);
  for (const [px, py] of [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
  ] as [number, number][]) {
    const ap = new AnchorPoint();
    ap.setProperties(["x", "y"], [px, py]);
    p.getAnchorPoints().appendChild(ap);
  }
  if (undefined !== bool) p.setProperty("bool", bool);
  return p;
}

function count(source: CompoundShape): number {
  let n = 0;
  source.rewindVertices();
  const v = new Vertex();
  while (source.readVertex(v)) n++;
  return n;
}

describe("GCompoundShape", () => {
  it("is node 'Compound Shape' and saves its even-odd default", () => {
    const c = new CompoundShape();
    expect(c.getNodeName()).toBe("Compound Shape");
    expect(c.isFakeContainer()).toBe(true);
    const blob = JSON.parse(Node.serialize(c) as string) as Record<string, unknown>;
    expect(blob["evenodd"]).toBe(true);
  });

  it("unites, subtracts and intersects its children", () => {
    const union = new CompoundShape();
    union.appendChild(square(0, 0, 10));
    union.appendChild(square(5, 0, 10, VertexPolyBoolean.OR));
    expect(VertexInfo.calculateBounds(union, true)?.getWidth()).toBe(15);
    const difference = new CompoundShape();
    difference.appendChild(square(0, 0, 10));
    difference.appendChild(square(5, -5, 20, VertexPolyBoolean.SUB));
    expect(VertexInfo.calculateBounds(difference, true)?.getWidth()).toBe(5);
    const intersection = new CompoundShape();
    intersection.appendChild(square(0, 0, 10));
    intersection.appendChild(square(5, -5, 20, VertexPolyBoolean.AND));
    const box = VertexInfo.calculateBounds(intersection, true);
    expect([box?.getX(), box?.getWidth()]).toEqual([5, 5]);
  });

  it("adds children without `bool` as they are", () => {
    const c = new CompoundShape();
    c.appendChild(square(0, 0, 10));
    c.appendChild(square(50, 0, 10, 0));
    expect(count(c)).toBe(12);
    expect(c.getGeometryBBox()?.getWidth()).toBe(60);
  });

  it("recomputes when a child's `bool` changes", () => {
    const c = new CompoundShape();
    const child = square(5, -5, 20, VertexPolyBoolean.OR);
    c.appendChild(square(0, 0, 10));
    c.appendChild(child);
    expect(c.getGeometryBBox()?.getWidth()).toBe(25);
    child.setProperty("bool", VertexPolyBoolean.SUB);
    expect(VertexInfo.calculateBounds(c, true)?.getWidth()).toBe(5);
  });

  it("recomputes when a child is added", () => {
    const c = new CompoundShape();
    c.appendChild(square(0, 0, 10));
    expect(c.getGeometryBBox()?.getWidth()).toBe(10);
    c.appendChild(square(5, -5, 20, VertexPolyBoolean.OR));
    expect(c.getGeometryBBox()?.getWidth()).toBe(25);
  });

  it("follows its transform without recomputing", () => {
    const c = new CompoundShape();
    c.appendChild(square(0, 0, 10));
    c.rewindVertices();
    c.setProperty("trf", new Transform(1, 0, 0, 1, 100, 0));
    expect(VertexInfo.calculateBounds(c, true)?.getX()).toBe(100);
  });

  it("estimates the result box from the children's boxes", () => {
    const c = new CompoundShape();
    c.appendChild(square(0, 0, 10));
    c.appendChild(square(5, 0, 10, VertexPolyBoolean.OR));
    c.appendChild(square(0, 20, 5, VertexPolyBoolean.OR));
    const box = c._mergeBoxes();
    expect([box?.getWidth(), box?.getHeight()]).toEqual([15, 25]);
    expect(new CompoundShape()._mergeBoxes()).toBe(null);
  });

  it("moves the computed result by a new `trf` (the children stay)", () => {
    const c = new CompoundShape();
    c.appendChild(square(0, 0, 10));
    c.setProperty("trf", new Transform(1, 0, 0, 1, 100, 0));
    expect(c.getFirstChild() && (c.getFirstChild() as Path).getGeometryBBox()?.getX()).toBe(0);
    expect(c.getCenter(true)?.getX()).toBe(105);
    // Without `transformed`, the center is mapped back by `trf`.
    expect(c.getCenter()?.getX()).toBe(5);
  });

  it("computes the vertices right after restoring an old file without `evenodd`", () => {
    const c = new CompoundShape();
    c.appendChild(square(0, 0, 10));
    const blob = JSON.parse(Node.serialize(c) as string) as Record<string, unknown>;
    delete blob["evenodd"];
    const old = Node.deserialize(JSON.stringify(blob)) as CompoundShape;
    expect(old._vertexSource).not.toBe(null);
    const current = Node.deserialize(Node.serialize(c) as string) as CompoundShape;
    expect(current._vertexSource).toBe(null);
  });
});
