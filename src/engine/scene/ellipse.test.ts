import { describe, expect, it } from "vitest";
import { Node } from "./node.ts";
import { Ellipse } from "./ellipse.ts";
import type { AnchorPoint } from "./path-base.ts";

function points(ellipse: Ellipse): unknown[][] {
  return (ellipse.getAnchorPoints().getChildren() as AnchorPoint[]).map((p) => [
    p.$tp,
    Math.round(p.$x * 1e6) / 1e6,
    Math.round(p.$y * 1e6) / 1e6,
  ]);
}

describe("GEllipse", () => {
  it("is the full unit circle by default: four smooth points", () => {
    const ellipse = new Ellipse();
    expect(Node.getName(ellipse)).toBe("ellipse");
    expect(points(ellipse)).toEqual([
      ["TS", -1, 0],
      ["TS", -0, -1],
      ["TS", 1, -0],
      ["TS", 0, 1],
    ]);
    expect(ellipse.$closed).toBe(true);
    const box = ellipse.getSourceBBox();
    expect([box?.getX(), box?.getY(), box?.getWidth(), box?.getHeight()]).toEqual([-1, -1, 2, 2]);
  });

  it("cuts a pie through the center, a chord, or an open arc", () => {
    const pie = new Ellipse();
    pie.setProperties(["sa", "ea"], [0, Math.PI / 2]);
    expect(points(pie)).toEqual([
      ["TA", 1, 0],
      ["TA", 0, 1],
      ["R", 0, 0],
    ]);
    expect(pie.$closed).toBe(true);
    const chord = new Ellipse();
    chord.setProperties(["sa", "ea", "etp"], [0, Math.PI / 2, Ellipse.Type.Chord]);
    expect(points(chord)).toHaveLength(2);
    expect(chord.$closed).toBe(true);
    const arc = new Ellipse();
    arc.setProperties(["sa", "ea", "etp"], [0, Math.PI / 2, Ellipse.Type.Arc]);
    expect(arc.$closed).toBe(false);
  });

  it("cuts partial quarters out of the quarter bezier (values from the old app)", () => {
    const arc = new Ellipse();
    arc.setProperties(["sa", "ea", "etp"], [0.3, 2.5, Ellipse.Type.Arc]);
    const list = (arc.getAnchorPoints().getChildren() as AnchorPoint[]).map((p) =>
      ["tp", "x", "y", "hlx", "hly", "hrx", "hry"].map((k) => p.getProperty(k)),
    );
    expect(list).toEqual([
      [
        "TA",
        0.9533656534214316,
        0.30246402179325727,
        null,
        null,
        0.8250568795004855,
        0.7067266945848162,
      ],
      ["TS", 6.123233995736766e-17, 1, 0.4465070156804054, 1, -0.32648501599662266, 1],
      [
        "TA",
        -0.79919385487218,
        0.6008651168685855,
        -0.6166367103810478,
        0.84320129619583,
        null,
        null,
      ],
    ]);
  });

  it("saves the angles and type and rebuilds the points on load", () => {
    const ellipse = new Ellipse();
    ellipse.setProperties(["sa", "ea", "etp"], [1, 2, 2]);
    const blob = JSON.parse(Node.serialize(ellipse) as string) as Record<string, unknown>;
    expect([blob["sa"], blob["ea"], blob["etp"]]).toEqual([1, 2, 2]);
    const back = Node.deserialize(JSON.stringify(blob)) as Ellipse;
    expect(points(back)).toEqual(points(ellipse));
    expect(back.$closed).toBe(false);
  });
});
