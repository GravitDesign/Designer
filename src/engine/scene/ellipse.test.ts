import { describe, expect, it, vi } from "vitest";
import type { NodeBlob } from "../serialize/blob.ts";
import { Node } from "./node.ts";
import { Ellipse, clearQuarterSegments, quarterSegment } from "./ellipse.ts";
import type { AnchorPoint } from "./path-base.ts";

function points(ellipse: Ellipse): unknown[][] {
  return (ellipse.getAnchorPoints().getChildren() as AnchorPoint[]).map((p) => [
    p.$tp,
    Math.round(p.$x * 1e6) / 1e6,
    Math.round(p.$y * 1e6) / 1e6,
  ]);
}

/** Every point property, exactly. */
function exactPoints(ellipse: Ellipse): unknown[][] {
  return (ellipse.getAnchorPoints().getChildren() as AnchorPoint[]).map((p) =>
    ["tp", "x", "y", "hlx", "hly", "hrx", "hry", "ah", "cl", "cr"].map((k) => p.getProperty(k)),
  );
}

/**
 * Restores `json` into an ellipse whose constructor has built the default
 * points, as every restore did before they were left out.
 */
function restoreIntoBuilt(json: string): Ellipse {
  const ellipse = new Ellipse();
  Node.restoreInstance(JSON.parse(json) as NodeBlob, ellipse);
  return ellipse;
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

  it("gives cut ellipses the same points with kept quarter segments as without", () => {
    const handles = (sa: number, ea: number): unknown[][] => {
      const arc = new Ellipse();
      arc.setProperties(["sa", "ea", "etp"], [sa, ea, Ellipse.Type.Arc]);
      return (arc.getAnchorPoints().getChildren() as AnchorPoint[]).map((p) =>
        ["x", "y", "hlx", "hly", "hrx", "hry"].map((k) => p.getProperty(k)),
      );
    };
    const angles: [number, number][] = [
      [0.3, 2.5],
      [1.9, 4],
      [0.3, 1.2],
      [3.5, 5.9],
      [1.9, 2.2],
    ];
    const fresh = angles.map(([sa, ea]) => {
      clearQuarterSegments();
      return handles(sa, ea);
    });
    clearQuarterSegments();
    expect(angles.map(([sa, ea]) => handles(sa, ea))).toEqual(fresh);
  });

  it("keeps a quarter segment per pair of angles, telling -0 from 0", () => {
    clearQuarterSegments();
    const half = Math.PI / 2;
    const quarter = quarterSegment(0, half);
    expect(quarterSegment(0, half)).toBe(quarter);
    expect([quarter.x0, quarter.x1]).toEqual([1, Math.cos(half)]);
    // The same start with another end.
    expect(quarterSegment(0, Math.PI).x1).toBe(-1);
    expect(quarterSegment(0, half).x1).toBe(Math.cos(half));
    // The Map finds the entry for 0 when asked for -0.
    expect(Object.is(quarterSegment(-0, half).start, -0)).toBe(true);
  });

  it("restores the points it got when its constructor built the default ones first", () => {
    const shapes: [number, number, number][] = [
      [Math.PI, Math.PI, Ellipse.Type.Pie],
      [0.3, 2.5, Ellipse.Type.Pie],
      [0.3, 2.5, Ellipse.Type.Chord],
      [1, 5.5, Ellipse.Type.Arc],
      [0.2, 0.9, Ellipse.Type.Arc],
      [4, 1, Ellipse.Type.Pie],
    ];
    for (const [sa, ea, etp] of shapes) {
      const ellipse = new Ellipse();
      ellipse.setProperties(["sa", "ea", "etp"], [sa, ea, etp]);
      const json = Node.serialize(ellipse) as string;
      const built = restoreIntoBuilt(json);
      const back = Node.deserialize(json) as Ellipse;
      expect(back._pathPending).toBe(false);
      expect(exactPoints(back)).toEqual(exactPoints(built));
      expect(back.$closed).toBe(built.$closed);
    }
  });

  it("builds a restored ellipse's points once per change of its angles", () => {
    const cut = new Ellipse();
    cut.setProperties(["sa", "ea"], [0.3, 2.5]);
    const jsons = [new Ellipse(), cut].map((ellipse) => Node.serialize(ellipse) as string);
    const builds = vi.spyOn(Ellipse.prototype, "_invalidatePath");
    try {
      for (const json of jsons) Node.deserialize(json);
      // The full circle in its Restore change only, the cut one also for its angles.
      expect(builds).toHaveBeenCalledTimes(3);
    } finally {
      builds.mockRestore();
    }
  });

  it("builds the default points when read before its blob is restored", () => {
    const arc = new Ellipse();
    arc.setProperties(["sa", "ea", "etp"], [0.3, 2.5, Ellipse.Type.Arc]);
    const json = Node.serialize(arc) as string;
    let early: unknown[][] = [];
    let result: Node | null = null;
    Node._restore(
      JSON.parse(json) as NodeBlob,
      null,
      null,
      null,
      null,
      (blob, node, restored, progress, total, done) => {
        expect((node as Ellipse)._pathPending).toBe(true);
        early = exactPoints(node as Ellipse);
        done(Node.restoreInstance(blob, node, restored, progress, total));
      },
      (node) => {
        result = node;
      },
    );
    expect(early).toEqual(exactPoints(new Ellipse()));
    expect(exactPoints(result as unknown as Ellipse)).toEqual(exactPoints(restoreIntoBuilt(json)));
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
