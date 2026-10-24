import { describe, expect, it } from "vitest";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { PropertySet } from "../style/stylable-sets.ts";
import { Connector } from "./connector.ts";
import type { Element } from "./element.ts";
import { Group } from "./group.ts";
import { Node } from "./node.ts";
import { AnchorPoint } from "./path-base.ts";

function connector(): Connector {
  const c = new Connector();
  for (const [x, y] of [
    [0, 0],
    [1, 1],
  ] as [number, number][]) {
    const point = new AnchorPoint();
    point.setProperties(["x", "y"], [x, y]);
    c.getAnchorPoints().appendChild(point);
  }
  return c;
}

/** An element as relayout sees it: only its geometry box. */
function element(x: number, y: number, w: number, h: number): Element {
  return { getGeometryBBox: () => new Rect(x, y, w, h) } as unknown as Element;
}

/** A scene whose reference lookup reports the given connectors as attached to every element. */
function sceneWith(connectors: Connector[]): void {
  const scene = {
    _invalidateArea() {},
    getTransformSettings: () => null,
    visitReferences(_node: Node, visit: (reference: Node) => void) {
      for (const c of connectors) visit(c.getAnchorPoints().getFirstChild() as AnchorPoint);
    },
  };
  for (const c of connectors) (c as unknown as { _scene: unknown })._scene = scene;
}

function ends(c: Connector): number[] {
  const points = c.getAnchorPoints();
  const first = points.getFirstChild() as AnchorPoint;
  const last = points.getLastChild() as AnchorPoint;
  return [first.$x, first.$y, last.$x, last.$y];
}

describe("GConnector", () => {
  it("is a path with borders and effects only", () => {
    const c = new Connector();
    expect(Node.getName(c)).toBe("connector");
    expect(c.getStylePropertySets()).toEqual([
      PropertySet.Style,
      PropertySet.BorderPaintLayers,
      PropertySet.Effects,
    ]);
    expect(c.relayout()).toBeUndefined();
  });

  it("joins the closest edge centers, 5 units off the destination", () => {
    const c = connector();
    sceneWith([c]);
    const source = element(0, 0, 10, 10);
    const destination = element(100, 0, 10, 10);
    c.attachPath(c.getAnchorPoints().getFirstChild() as AnchorPoint, source as never);
    c.attachPath(c.getAnchorPoints().getLastChild() as AnchorPoint, destination as never);
    expect([c.getSrcPath(), c.getDstPath()]).toEqual([source, destination]);
    c.relayout();
    expect(ends(c)).toEqual([10, 5, 95, 5]);
  });

  it("spreads connectors between the same two elements 20 apart", () => {
    const a = connector();
    const b = connector();
    // Sibling connectors are put in tree order, so they share a parent.
    const parent = new Group();
    parent.appendChild(a);
    parent.appendChild(b);
    sceneWith([a, b]);
    const source = element(0, 0, 10, 10);
    const destination = element(0, 100, 10, 10);
    for (const c of [a, b]) {
      c.attachPath(c.getAnchorPoints().getFirstChild() as AnchorPoint, source as never);
      c.attachPath(c.getAnchorPoints().getLastChild() as AnchorPoint, destination as never);
    }
    a.relayout();
    b.relayout();
    expect(ends(a)).toEqual([-5, 10, -5, 95]);
    expect(ends(b)).toEqual([15, 10, 15, 95]);
  });

  it("maps its anchor points", () => {
    const c = connector();
    c.transformAnchors(new Transform(2, 0, 0, 3, 1, 1));
    expect(ends(c)).toEqual([1, 1, 3, 4]);
  });
});
