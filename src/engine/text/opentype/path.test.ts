import { describe, expect, it } from "vitest";
import { BoundingBox } from "./bbox.ts";
import { Path } from "./path.ts";
import type { PathCommand } from "./path.ts";
import { readFixture } from "./test-fonts.ts";

interface PathFixture {
  path: {
    commands: PathCommand[];
    bbox: number[];
    data: string;
    data4: string;
    svg: string;
    svgStyled: string;
    svgNoFill: string;
  };
  emptyBBox: number[];
  extend: PathCommand[];
  beziers: number[][];
  quads: number[][];
}

const fixture = readFixture<PathFixture>("core.json");

function samplePath(): Path {
  const p = new Path();
  p.moveTo(10, 20);
  p.lineTo(30.5, -4.25);
  p.quadTo(50, 80, 70, 20);
  p.curveTo(80, -60, 120, 140, 100, 10);
  p.close();
  p.moveTo(-5, 3);
  p.lineTo(-7.123456, 2);
  return p;
}

function boxValues(box: BoundingBox): number[] {
  return [box.x1, box.y1, box.x2, box.y2];
}

describe("Path", () => {
  it("records commands and computes the bounding box like the old code", () => {
    const p = samplePath();
    expect(p.commands).toEqual(fixture.path.commands);
    expect(boxValues(p.getBoundingBox())).toEqual(fixture.path.bbox);
  });

  it("writes SVG path data and elements", () => {
    const p = samplePath();
    expect(p.toPathData()).toBe(fixture.path.data);
    expect(p.toPathData(4)).toBe(fixture.path.data4);
    expect(p.toSVG(1)).toBe(fixture.path.svg);
    p.fill = "red";
    p.stroke = "blue";
    p.strokeWidth = 3;
    expect(p.toSVG()).toBe(fixture.path.svgStyled);
    p.fill = null;
    expect(p.toSVG()).toBe(fixture.path.svgNoFill);
  });

  it("gives an empty path a box at the origin", () => {
    expect(boxValues(new Path().getBoundingBox())).toEqual(fixture.emptyBBox);
  });

  it("extends with a bounding box, a path and a command list", () => {
    const p = new Path();
    const box = new BoundingBox();
    box.addPoint(1, 2);
    box.addPoint(5, -3);
    p.extend(box);
    p.extend(samplePath());
    p.extend([{ type: "L", x: 1, y: 1 }]);
    expect(p.commands).toEqual(fixture.extend);
  });
});

describe("BoundingBox", () => {
  it("includes the extremes of cubic and quadratic curves", () => {
    const beziers: [number, number, number, number, number, number, number, number][] = [
      [0, 0, 10, 50, 90, -40, 100, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 30, 30, 60, 60, 90, 90],
      [5, 5, 5, 100, 100, 100, 100, 5],
      [1, 2, 3, 1, 0.5, 7, 2, 2],
    ];
    expect(
      beziers.map((b) => {
        const box = new BoundingBox();
        box.addBezier(...b);
        return boxValues(box);
      }),
    ).toEqual(fixture.beziers);
    const quads: [number, number, number, number, number, number][] = [
      [0, 0, 50, 100, 100, 0],
      [0, 0, 10, 10, 20, 20],
      [3, -4, -10, 7, 8, 2],
    ];
    expect(
      quads.map((q) => {
        const box = new BoundingBox();
        box.addQuad(...q);
        return boxValues(box);
      }),
    ).toEqual(fixture.quads);
  });
});
