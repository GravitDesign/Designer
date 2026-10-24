import { describe, expect, it } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { Vertex } from "../geometry/vertex.ts";
import { Point } from "../math/point.ts";
import { Transform } from "../math/transform.ts";
import { BorderPaintLayer } from "../style/border-paint-layer.ts";
import { FillPaintLayer } from "../style/fill-paint-layer.ts";
import { CollisionFlag } from "./element-change.ts";
import type { Element } from "./element.ts";
import { Node } from "./node.ts";
import { AnchorPoint } from "./path-base.ts";
import { Path } from "./path.ts";
import { Shape, type ShapeCollisionInfo, type ShapeHitResult } from "./shape.ts";

function path(points: [number, number][], closed = true): Path {
  const p = new Path(closed);
  for (const [x, y] of points) {
    const ap = new AnchorPoint();
    ap.setProperties(["x", "y"], [x, y]);
    p.getAnchorPoints().appendChild(ap);
  }
  return p;
}

function fill(shape: Shape): void {
  shape.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([0, 0, 0])));
}

function border(shape: Shape, props: Record<string, unknown>): BorderPaintLayer {
  const layer = new BorderPaintLayer();
  layer.setProperty("_pt", new RGBColor([0, 0, 0]));
  layer.setProperties(Object.keys(props), Object.values(props));
  shape.getPaintLayers()?.appendChild(layer);
  return layer;
}

function rect(x: number, y: number, w: number, h: number): VertexContainer {
  const c = new VertexContainer();
  c.addVertex(Vertex.Command.Move, x, y);
  c.addVertex(Vertex.Command.Line, x + w, y);
  c.addVertex(Vertex.Command.Line, x + w, y + h);
  c.addVertex(Vertex.Command.Line, x, y + h);
  c.addVertex(Vertex.Command.Close, 0, 0);
  return c;
}

const SQUARE: [number, number][] = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
];

describe("GShape", () => {
  it("saves `trf` as an array and restores it invertible", () => {
    const p = path(SQUARE);
    p.setProperty("trf", new Transform(2, 0, 0, 2, 5, 6));
    const blob = JSON.parse(Node.serialize(p) as string) as Record<string, unknown>;
    expect(blob["trf"]).toEqual([2, 0, 0, 2, 5, 6]);
    expect(blob["bool"]).toBeUndefined();
    const singular = { ...blob, trf: [0, 0, 0, 0, 1, 1] };
    const back = Node.deserialize(JSON.stringify(singular)) as Path;
    expect(back.$trf?.invertible()).toBe(true);
  });

  it("measures the rotation of the bottom edge", () => {
    const p = path(SQUARE);
    p.setProperty("trf", new Transform().rotated(-0.5));
    expect(p.getAngle()).toBeCloseTo(0.5, 12);
    expect(path([]).getAngle()).toBe(0);
  });

  it("copies trf, bool, scc and the sharp painting on assignFrom", () => {
    const source = path(SQUARE);
    source.setProperties(["trf", "bool", "scc"], [new Transform(1, 0, 0, 1, 3, 4), 4, false]);
    source._paintSharp = false;
    const target = path(SQUARE);
    target.assignFrom(source);
    expect([target.$bool, target.$scc, target._paintSharp]).toEqual([4, false, false]);
    expect(target.$trf?.getMatrix()).toEqual([1, 0, 0, 1, 3, 4]);
  });

  it("anchors the children at the start when they stop scaling with the shape", () => {
    const parent = path(SQUARE);
    const child = path([
      [10, 10],
      [20, 20],
    ]);
    parent.appendChild(child);
    parent.setProperty("scc", false);
    expect([child.getProperty("hacr"), child.getProperty("vacr")]).toEqual([1, 1]);
  });

  it("grows the border padding by the miter limit on shapes with corners", () => {
    const p = path(SQUARE);
    const layer = border(p, { _bw: 4, _blj: "miter", _bml: 3 });
    expect(p.getStyleBorderPadding(layer)).toBe(6);
    const line = path(
      [
        [0, 0],
        [10, 0],
      ],
      false,
    );
    expect(line.getStyleBorderPadding(border(line, { _bw: 4, _blj: "miter", _bml: 3 }))).toBe(2);
  });

  it("hits the border, the fill and the outline", () => {
    const p = path(SQUARE);
    fill(p);
    border(p, { _bw: 4 });
    const view = new Transform();
    const type = (x: number, y: number, tolerance = 0, force?: boolean) => {
      const hit = p._detailHitTest(new Point(x, y), view, tolerance, force);
      return hit ? (hit.data as ShapeHitResult).type : null;
    };
    expect(type(1, 50)).toBe(Shape.HitResult.Type.Stroke);
    expect(type(50, 50)).toBe(Shape.HitResult.Type.Fill);
    expect(type(150, 50)).toBe(null);
    const bare = path(SQUARE);
    const bareType = (x: number, y: number, tolerance: number, force?: boolean) => {
      const hit = bare._detailHitTest(new Point(x, y), view, tolerance, force);
      return hit ? (hit.data as ShapeHitResult).type : null;
    };
    expect(bareType(50, 50, 0)).toBe(null);
    expect(bareType(50, 50, 0, true)).toBe(Shape.HitResult.Type.Other);
    expect(bareType(102, 50, 3)).toBe(Shape.HitResult.Type.Outline);
  });

  it("collides with an area by the outline, not the box", () => {
    const triangle = path([
      [0, 0],
      [100, 0],
      [0, 100],
    ]);
    fill(triangle);
    const flags = CollisionFlag.Partial | CollisionFlag.GeometryBBox;
    expect(triangle.getCollisions(rect(10, 10, 10, 10), flags)).toEqual([triangle]);
    expect(triangle.getCollisions(rect(80, 80, 10, 10), flags)).toEqual([]);
    expect(triangle.getCollisions(rect(40, -10, 20, 20), flags)).toEqual([triangle]);
    const info: unknown[] = [];
    triangle.getCollisions(
      rect(10, 10, 10, 10),
      flags | CollisionFlag.CollisionInfo,
      null,
      null,
      null,
      (found: Element) => info.push(found),
    );
    expect(info).toEqual([
      { element: triangle, separate: false, containsArea: true, intersects: false },
    ] satisfies ShapeCollisionInfo[]);
  });

  it("makes arrowhead markers at the path ends and counts them in the paint box", () => {
    const line = path(
      [
        [0, 0],
        [100, 0],
      ],
      false,
    );
    const layer = border(line, { _bw: 2 });
    const plain = line.getPaintBBox();
    expect(line.getHeadMarkerVertices(layer)).toBe(null);
    layer.setProperty("_btm", "A");
    const tail = line.getTailMarkerVertices(layer);
    expect(tail).not.toBe(null);
    expect(Object.prototype.hasOwnProperty.call(Shape.MARKER_CACHE, "A")).toBe(true);
    const box = line.getPaintBBox();
    expect(box?.getX()).toBe(plain?.getX());
    expect((box?.getWidth() as number) > (plain?.getWidth() as number)).toBe(true);
  });

  it("scales markers with the square root of widths from 1", () => {
    const shape = path(SQUARE);
    expect(shape._calculateMarkerVerticeBorderScale(4)).toBe(2);
    expect(shape._calculateMarkerVerticeBorderScale(0.5)).toBe(0.5);
  });

  it("uses the geometry box for patterns when the source box is empty", () => {
    const p = path([[5, 5]], false);
    p.setProperty("trf", new Transform(2, 0, 0, 2, 0, 0));
    const box = p.getPatternBBox();
    expect([box?.getX(), box?.getY()]).toEqual([5, 5]);
  });

  it("transforms the shape and the children", () => {
    const parent = path(SQUARE);
    const child = path([
      [10, 10],
      [20, 20],
    ]);
    parent.appendChild(child);
    parent.transform(new Transform(1, 0, 0, 1, 5, 0));
    expect(parent.$trf?.getMatrix()).toEqual([1, 0, 0, 1, 5, 0]);
    expect(child.$trf?.getMatrix()).toEqual([1, 0, 0, 1, 5, 0]);
    parent.transform(new Transform());
    expect(parent.$trf?.getMatrix()).toEqual([1, 0, 0, 1, 5, 0]);
  });
});
