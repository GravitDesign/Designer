import { describe, expect, it } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { HitResult } from "../geometry/hit-result.ts";
import { Vertex } from "../geometry/vertex.ts";
import { Point } from "../math/point.ts";
import { Transform } from "../math/transform.ts";
import { FillPaintLayer } from "../style/fill-paint-layer.ts";
import { CompoundPath, Paths } from "./compound-path.ts";
import { ElementFlag } from "./element-change.ts";
import { Node } from "./node.ts";
import { AnchorPoint } from "./path-base.ts";
import { Path } from "./path.ts";
import type { ShapeHitResult } from "./shape.ts";

function path(points: [number, number][], closed = true): Path {
  const p = new Path(closed);
  for (const [x, y] of points) {
    const ap = new AnchorPoint();
    ap.setProperties(["x", "y"], [x, y]);
    p.getAnchorPoints().appendChild(ap);
  }
  return p;
}

function square(x: number, y: number, size: number): Path {
  return path([
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
  ]);
}

function donut(): CompoundPath {
  const c = new CompoundPath();
  c.getPaths().appendChild(square(0, 0, 100));
  c.getPaths().appendChild(square(25, 25, 50));
  return c;
}

function verts(source: { rewindVertices(i: number): boolean; readVertex(v: Vertex): boolean }) {
  const out: number[][] = [];
  if (!source.rewindVertices(0)) return out;
  const v = new Vertex();
  while (source.readVertex(v)) out.push([v.command, v.x, v.y]);
  return out;
}

describe("GCompoundPath", () => {
  it("reads the vertices of every sub-path in order", () => {
    const c = donut();
    const v = verts(c);
    expect(v).toHaveLength(12);
    expect(v[0]).toEqual([Vertex.Command.Move, 0, 0]);
    expect(v[6]).toEqual([Vertex.Command.Move, 25, 25]);
    expect(new CompoundPath().rewindVertices(0)).toBe(false);
  });

  it("is even-odd by default and combines the sub-path boxes", () => {
    const c = donut();
    expect(c.$evenodd).toBe(true);
    expect(c.getGeometryBBox()?.getWidth()).toBe(100);
  });

  it("saves the sub-paths as serialized strings and restores them", () => {
    const c = donut();
    const blob = JSON.parse(Node.serialize(c) as string) as { "@": string; paths: string[] };
    expect(blob["@"]).toBe("compoundpath");
    expect(blob.paths).toHaveLength(2);
    expect(typeof blob.paths[0]).toBe("string");
    const back = Node.deserialize(JSON.stringify(blob)) as CompoundPath;
    expect(verts(back)).toEqual(verts(c));
  });

  it("hits the ring but not the hole (even-odd), and the hole with non-zero", () => {
    const c = donut();
    c.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([0, 0, 0])));
    c.beginUpdate();
    c.endUpdate();
    const view = new Transform();
    const ring = c._detailHitTest(new Point(10, 10), view, 0);
    expect((ring?.data as ShapeHitResult).type).toBe(1);
    expect(c._detailHitTest(new Point(50, 50), view, 0)).toBe(null);
    c.setProperty("evenodd", false);
    const result = new HitResult();
    const candidates = c._getVertexHitCandidates(new Point(50, 50), null, 0);
    expect(candidates).toHaveLength(2);
    expect(c._hitInside(new Point(50, 50), null, result, candidates)).toBe(true);
  });

  it("transforms every sub-path", () => {
    const c = donut();
    c.transform(new Transform(2, 0, 0, 2, 0, 0));
    const first = c.getPaths().getFirstChild() as Path;
    expect(first.getGeometryBBox()?.getWidth()).toBe(200);
    expect(c.getGeometryBBox()?.getWidth()).toBe(200);
  });

  it("passes flags on to the sub-paths", () => {
    const c = donut();
    c.setFlag(ElementFlag.Hidden);
    expect(c.getPaths().getFirstChild()?.hasFlag(ElementFlag.Hidden)).toBe(true);
    c.removeFlag(ElementFlag.Hidden);
    expect(c.getPaths().getFirstChild()?.hasFlag(ElementFlag.Hidden)).toBe(false);
    // New sub-paths get the compound path's flags.
    c.setFlag(ElementFlag.Hidden);
    const added = square(200, 0, 10);
    c.getPaths().appendChild(added);
    expect(added.hasFlag(ElementFlag.Hidden)).toBe(true);
  });

  it("passes `csc` on to the sub-paths", () => {
    const c = donut();
    c.setProperty("csc", false);
    expect(c.getPaths().getFirstChild()?.getProperty("csc")).toBe(false);
  });

  it("only holds paths in its own container, which can't be removed", () => {
    expect(new Paths().validateInsertion(new CompoundPath() as never)).toBe(true);
    expect(new Paths().validateInsertion(new Path() as never)).toBe(false);
    expect(new Paths().validateRemoval()).toBe(false);
    const c = donut();
    expect(CompoundPath.isOwnedPath(c.getPaths().getFirstChild() as Path)).toBe(true);
  });

  it("collects the pivots of every sub-path", () => {
    expect(donut().findPivots()).toHaveLength(8);
  });

  it("copies its sub-paths", () => {
    const c = donut();
    const copy = c.cloneSubPaths();
    expect(copy.getChildren()).toHaveLength(2);
    expect(copy.getFirstChild()).not.toBe(c.getPaths().getFirstChild());
  });
});
