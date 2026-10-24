import { afterEach, describe, expect, it } from "vitest";
import { VertexPolyBoolean } from "../../engine/geometry/boolean/vertex-poly-boolean.ts";
import { CompoundShape } from "../../engine/scene/compound-shape.ts";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import { Path } from "../../engine/scene/path.ts";
import { Polygon } from "../../engine/scene/polygon.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import type { Document } from "../document/document.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { boolOpElements, boolOpStatsName, BoolOpProperties } from "./bool-op-properties.ts";
import { angleText, angleValue, EllipseProperties } from "./ellipse-properties.ts";
import { nodeTypeChange, PathProperties, shownNodeType, statsNodeType } from "./path-properties.ts";
import { cornerRadiusPercent, pointsValues, PolygonProperties } from "./polygon-properties.ts";
import type { InspectedElements } from "./properties.ts";

const T = PathBase.AnchorPoint.Type;

/** An element that finds nothing (the panels' DOM is not under test here). */
const emptyPanel = {
  querySelectorAll: () => [],
  querySelector: () => null,
} as unknown as HTMLElement;

function fakeDesigner(): void {
  setDesigner({
    addEventListener() {},
    removeEventListener() {},
    getActiveDocument: () => null,
    isTouchEnabled: () => false,
    stats() {},
  } as unknown as Designer);
}

function fakeDocument(log: string[] = []): Document {
  const listeners = { addEventListener() {}, removeEventListener() {} };
  const scene = {
    ...listeners,
    getProperty: () => "px",
    getOptimalDecimalsCount: () => 2,
    pointToString: (v: number) => String(v),
  };
  return {
    getScene: () => scene,
    getEditor: () => ({
      ...listeners,
      beginTransaction: () => log.push("begin"),
      commitTransaction: (name: string) => log.push("commit " + name),
    }),
  } as unknown as Document;
}

afterEach(() => resetGlobals());

interface FakePoint {
  props: Record<string, unknown>;
  getProperty(name: string): unknown;
  getParent(): unknown;
}

/** Three points in a row; the middle one is the one changed. */
function fakeRow(middle: Record<string, unknown>): FakePoint[] {
  const points: FakePoint[] = [];
  const list = {
    getPreviousPoint: (p: FakePoint) => points[points.indexOf(p) - 1] ?? null,
    getNextPoint: (p: FakePoint) => points[points.indexOf(p) + 1] ?? null,
  };
  const make = (props: Record<string, unknown>): FakePoint => ({
    props,
    getProperty: (name) => props[name] ?? null,
    getParent: () => list,
  });
  points.push(make({ x: 0, y: 0, tp: "R" }));
  points.push(make({ x: 100, y: 0, tp: "R", ...middle }));
  points.push(make({ x: 100, y: 100, tp: "R" }));
  return points;
}

describe("path node types", () => {
  it("makes an Asymmetric point without handles get handles toward its neighbours", () => {
    const [, point] = fakeRow({});
    const change = nodeTypeChange(T.Asymmetric, point as FakePoint, null);
    const c = AnchorPoint.HANDLE_COEFF;
    expect(change.names).toEqual(["ah", "tp", "hlx", "hly", "hrx", "hry"]);
    expect(change.values).toEqual([false, T.Asymmetric, 100 - 100 * c, 0, 100, 100 * c]);
  });

  it("turns auto handles on for the other smooth types", () => {
    const [, point] = fakeRow({});
    expect(nodeTypeChange(T.Symmetric, point as FakePoint, null)).toEqual({
      names: ["ah", "tp"],
      values: [true, T.Symmetric],
    });
  });

  it("keeps existing handles", () => {
    const [, point] = fakeRow({ hlx: 50, hly: 0 });
    expect(nodeTypeChange(T.Mirror, point as FakePoint, null)).toEqual({
      names: ["ah", "tp"],
      values: [false, T.Mirror],
    });
  });

  it("shows corner types as straight", () => {
    expect(shownNodeType("R")).toEqual({ corner: true, shown: "-" });
    expect(shownNodeType(T.Connector)).toEqual({ corner: false, shown: T.Connector });
    expect(statsNodeType("-")).toBe("Straight");
    expect(statsNodeType(T.Symmetric)).toBe("Symmetric");
  });

  it("assignNodeType writes every selected point in one transaction", () => {
    fakeDesigner();
    const log: string[] = [];
    const panel = new PathProperties();
    panel._document = fakeDocument(log);
    const written: unknown[] = [];
    const point = {
      props: { tp: T.Mirror, ah: true } as Record<string, unknown>,
      getProperty(name: string) {
        return this.props[name] ?? null;
      },
      setProperties(names: string[], values: unknown[]) {
        written.push([names, values]);
      },
      setProperty(name: string, value: unknown) {
        written.push([name, value]);
      },
    };
    panel._points = [point as unknown as AnchorPoint];
    panel.assignNodeType("-");
    expect(written).toEqual([
      [
        ["tp", "hlx", "hly", "hrx", "hry", "ah"],
        [PathBase.CornerType.Rounded, null, null, null, null, false],
      ],
      // A mirrored point with auto handles gets them turned off.
      ["ah", false],
    ]);
    expect(log).toEqual(["begin", "commit Modify Path Node(s) Type"]);
  });

  it("is shown for paths only, and collects their selected points", () => {
    fakeDesigner();
    const panel = new PathProperties();
    panel._panel = emptyPanel;
    const path = new Path();
    expect(panel.update(fakeDocument(), [path] as InspectedElements)).toBe(true);
    expect(panel._points).toEqual([]);
    expect(panel.update(fakeDocument(), [path, new Rectangle()] as InspectedElements)).toBe(false);
    expect(panel.update(null, null)).toBe(false);
  });
});

describe("polygon values", () => {
  it("moves the inner angle half a segment and, with plain edges, the inner radius", () => {
    const star = pointsValues(5, 0, 100, false);
    expect(star.names).toEqual(["pts", "ia"]);
    expect(star.values).toEqual([5, Math.PI / 5]);
    const plain = pointsValues(4, 0, 100, true);
    expect(plain.names).toEqual(["pts", "ia", "ir"]);
    expect(plain.values[2]).toBe(100 * Math.cos(Math.PI / 4));
  });

  it("halves the distance for stars and caps the radius", () => {
    expect(cornerRadiusPercent(10, 40, true)).toBe(25);
    expect(cornerRadiusPercent(10, 40, false)).toBe(50);
    expect(cornerRadiusPercent(100, 40, false)).toBe(100);
    expect(cornerRadiusPercent(5, 0, true)).toBe(0);
  });

  it("is shown when every element is a polygon", () => {
    fakeDesigner();
    const panel = new PolygonProperties();
    panel._panel = emptyPanel;
    panel._advancedPanel = emptyPanel;
    expect(panel.update(fakeDocument(), [new Polygon()] as InspectedElements)).toBe(true);
    expect(panel.update(fakeDocument(), [new Polygon(), new Ellipse()] as InspectedElements)).toBe(
      false,
    );
  });
});

describe("ellipse angles", () => {
  it("shows the stored radians counter-clockwise in degrees", () => {
    expect(angleText(0)).toBe("360");
    expect(angleText(Math.PI / 2)).toBe("270");
    expect(angleValue(90)).toBeCloseTo((3 * Math.PI) / 2, 12);
    expect(angleValue(-90)).toBeCloseTo(Math.PI / 2, 12);
  });

  it("is shown when every element is an ellipse", () => {
    fakeDesigner();
    const panel = new EllipseProperties();
    panel._panel = emptyPanel;
    expect(panel.update(fakeDocument(), [new Ellipse()] as InspectedElements)).toBe(true);
    expect(panel.update(fakeDocument(), [new Ellipse(), new Path()] as InspectedElements)).toBe(
      false,
    );
  });
});

describe("boolean operations", () => {
  it("edits the compound children after the first", () => {
    const compound = new CompoundShape();
    const a = new Rectangle();
    const b = new Rectangle();
    const c = new Ellipse();
    compound.appendChild(a);
    compound.appendChild(b);
    compound.appendChild(c);
    expect(boolOpElements([compound])).toEqual([b, c]);
    expect(boolOpElements([a])).toEqual([]);
    expect(boolOpElements([b])).toEqual([b]);
    expect(boolOpElements([new Rectangle()])).toEqual([]);
  });

  it("names the operations for the statistics", () => {
    expect(boolOpStatsName(VertexPolyBoolean.OR)).toBe("merge");
    expect(boolOpStatsName(VertexPolyBoolean.SUB)).toBe("subtract");
    expect(boolOpStatsName(VertexPolyBoolean.AND)).toBe("intersect");
    expect(boolOpStatsName(VertexPolyBoolean.XOR)).toBe("difference");
    expect(boolOpStatsName(99)).toBe("unkn");
  });

  it("is shown only with something to edit", () => {
    const panel = new BoolOpProperties();
    panel._panel = emptyPanel;
    expect(panel.update(fakeDocument(), [new Rectangle()] as InspectedElements)).toBe(false);
    expect(panel.isGroup(null)).toBe(false);
  });
});
