import { describe, expect, it } from "vitest";
import { Node } from "../node.ts";
import { AnchorPoint, PathBase } from "../path-base.ts";
import { PGAnchor } from "./pg-anchor.ts";
import { PGEdge } from "./pg-edge.ts";

function edgeTo(x: number, y: number): PGEdge {
  const e = new PGEdge();
  const p = new PathBase();
  for (const [px, py] of [
    [0, 0],
    [x, y],
  ] as const) {
    const ap = new AnchorPoint();
    ap.setProperties(["x", "y"], [px, py]);
    p.getAnchorPoints().appendChild(ap);
  }
  e.setPathBase(p);
  return e;
}

describe("GPGAnchor", () => {
  it("saves [uid, x, y] and nothing else", () => {
    const anchor = new PGAnchor();
    anchor.setProperties(["x", "y"], [3, 4]);
    const blob = JSON.parse(Node.serialize(anchor) as string) as Record<string, unknown>;
    expect(blob).toEqual({ "@": "GPGAnchor", props: [anchor.getId().toString(), 3, 4] });
    const copy = Node.deserialize(JSON.stringify(blob)) as PGAnchor;
    expect([copy.getId().isEqual(anchor.getId()), copy.$x, copy.$y]).toEqual([true, 3, 4]);
  });

  it("orders its edges by the angle they leave at and walks them around", () => {
    const anchor = new PGAnchor();
    const east = edgeTo(10, 0); // angle 0
    const north = edgeTo(0, -10); // pi/2 (y up)
    const west = edgeTo(-10, 0); // pi
    anchor.addOutEdge(west);
    anchor.addOutEdge(east);
    anchor.addOutEdge(north);
    expect(anchor._orderedEdges?.map((o) => o.idx)).toEqual([1, 2, 0]);
    const next = anchor.getNextEdgeOrdered(east, PGAnchor.EdgeType.Out, true);
    expect(next?.edge).toBe(north);
    // Half way between 0 and pi/2, 0.001 away (y down on screen).
    expect(next?.insidePt?.getX()).toBeCloseTo(0.001 * Math.SQRT1_2, 15);
    expect(next?.insidePt?.getY()).toBeCloseTo(-0.001 * Math.SQRT1_2, 15);
    expect(anchor.getNextEdgeOrdered(west, PGAnchor.EdgeType.Out, false)?.edge).toBe(east);
    expect(anchor.getNextEdgeOrdered(west, PGAnchor.EdgeType.In, false)).toBe(null);

    // An equal angle goes before the edge already there.
    const east2 = edgeTo(20, 0);
    anchor.addInEdge(edgeTo(5, 5));
    anchor.removeInEdge(anchor.getInEdges()[0] as PGEdge);
    anchor.addOutEdge(east2);
    expect(anchor._orderedEdges?.map((o) => o.idx)).toEqual([3, 1, 2, 0]);
    anchor.removeOutEdge(east2);

    anchor.removeOutEdge(east);
    expect(anchor.getNextEdgeOrdered(north, PGAnchor.EdgeType.Out, false)?.edge).toBe(west);
    anchor.removeEdge(north);
    // Alone, the inside point is on the far side.
    const alone = anchor.getNextEdgeOrdered(west, PGAnchor.EdgeType.Out, true);
    expect(alone?.edge).toBe(west);
    expect(alone?.insidePt?.getX()).toBeCloseTo(0.001, 15);
  });
});
