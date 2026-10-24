import { describe, expect, it } from "vitest";
import { CompoundPath } from "../scene/compound-path.ts";
import type { AnchorPoint } from "../scene/path-base.ts";
import { Path } from "../scene/path.ts";
import { PathUtil } from "./path-util.ts";
import { VertexContainer } from "./vertex-container.ts";
import { Vertex } from "./vertex.ts";

const C = Vertex.Command;

function container(flat: number[]): VertexContainer {
  const c = new VertexContainer();
  for (let i = 0; i < flat.length; i += 3) {
    c.addVertex(flat[i] as number, flat[i + 1] as number, flat[i + 2] as number);
  }
  return c;
}

function anchors(p: Path): unknown[][] {
  return (p.getAnchorPoints().getChildren() as AnchorPoint[]).map((ap) => [
    ap.$x,
    ap.$y,
    ap.$hlx,
    ap.$hly,
    ap.$hrx,
    ap.$hry,
  ]);
}

describe("GPathUtil", () => {
  it("can't be instantiated", () => {
    expect(() => new PathUtil()).toThrow("This class cannot be instantiated");
  });

  it("turns a closed polygon into a closed path", () => {
    const p = PathUtil.createPathFromVertexSource(
      container([C.Move, 0, 0, C.Line, 10, 0, C.Line, 10, 10, C.Close, 0, 0]),
    ) as Path;
    expect(p).toBeInstanceOf(Path);
    expect(p.getProperty("closed")).toBe(true);
    expect(anchors(p).map((a) => a.slice(0, 2))).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
  });

  it("puts cubic controls on both anchors", () => {
    const p = PathUtil.createPathFromVertexSource(
      container([C.Move, 0, 0, C.Curve2, 10, 0, C.Curve2, 2, 5, C.Curve2, 8, 5]),
    ) as Path;
    expect(anchors(p)).toEqual([
      [0, 0, null, null, 2, 5],
      [10, 0, 8, 5, null, null],
    ]);
  });

  it("makes a compound path of several sub-paths, or a list", () => {
    const source = container([
      C.Move,
      0,
      0,
      C.Line,
      10,
      0,
      C.Line,
      10,
      10,
      C.Close,
      0,
      0,
      C.Move,
      20,
      20,
      C.Line,
      30,
      20,
      C.Line,
      30,
      30,
      C.Close,
      0,
      0,
    ]);
    const compound = PathUtil.createPathFromVertexSource(source) as CompoundPath;
    expect(compound).toBeInstanceOf(CompoundPath);
    expect(compound.getPaths().getChildren()).toHaveLength(2);
    expect(PathUtil.createPathFromVertexSource(source, true) as Path[]).toHaveLength(2);
  });

  it("drops sub-paths of one point and sources that don't start with a move", () => {
    expect(
      PathUtil.createPathFromVertexSource(container([C.Move, 0, 0, C.Line, 10, 0, C.Move, 5, 5])),
    ).toBeInstanceOf(Path);
    expect(PathUtil.createPathFromVertexSource(container([C.Line, 5, 5, C.Line, 6, 6]))).toBe(null);
  });

  it("merges ends that meet, unless asked to keep them", () => {
    const flat = [C.Move, 0, 0, C.Line, 10, 0, C.Line, 10, 10, C.Line, 0, 0];
    const merged = PathUtil.createPathFromVertexSource(container(flat)) as Path;
    expect(merged.getProperty("closed")).toBe(true);
    expect(merged.getAnchorPoints().getChildren()).toHaveLength(3);
    const kept = PathUtil.createPathFromVertexSource(container(flat), false, false, true) as Path;
    expect(kept.getProperty("closed")).toBe(false);
    expect(kept.getAnchorPoints().getChildren()).toHaveLength(4);
  });

  it("makes paths clockwise in place", () => {
    const p = PathUtil.createPathFromVertexSource(
      container([C.Move, 0, 0, C.Line, 0, 10, C.Line, 10, 10, C.Close, 0, 0]),
    ) as Path;
    expect(p.isClockWise()).toBe(false);
    expect(PathUtil.makeClockWise(p)).toBe(p);
    expect(p.isClockWise()).toBe(true);
  });

  it("throws for a bare vertex container, which has no hasMixin", () => {
    expect(() => PathUtil.makeClockWise(container([C.Move, 0, 0, C.Line, 1, 1]))).toThrow();
  });
});
