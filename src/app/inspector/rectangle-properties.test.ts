import { afterEach, describe, expect, it } from "vitest";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { Image } from "../../engine/scene/image.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import type { Document } from "../document/document.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { ImageProperties } from "./image-properties.ts";
import { cornerDecimals, cornerPercent, RectangleProperties } from "./rectangle-properties.ts";
import type { InspectedElements } from "./properties.ts";

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
    stats() {},
  } as unknown as Designer);
}

function fakeDocument(log: string[] = []): Document {
  const scene = {
    addEventListener() {},
    removeEventListener() {},
    getProperty: () => "px",
    getOptimalDecimalsCount: () => 2,
    pointToString: (v: number) => String(v),
  };
  return {
    getScene: () => scene,
    getEditor: () => ({
      beginTransaction: () => log.push("begin"),
      commitTransaction: (name: string) => log.push("commit " + name),
    }),
  } as unknown as Document;
}

afterEach(() => resetGlobals());

describe("cornerDecimals", () => {
  it("shows no decimals in px or pt with full pixels on, else the scene's", () => {
    expect(cornerDecimals("px", ["guide.full-pixels"], () => 3)).toBe(0);
    expect(cornerDecimals("pt", ["guide.full-pixels"], () => 3)).toBe(0);
    expect(cornerDecimals("mm", ["guide.full-pixels"], () => 3)).toBe(3);
    expect(cornerDecimals("px", [], () => 3)).toBe(3);
  });
});

describe("cornerPercent", () => {
  it("is the radius over half the shorter side", () => {
    expect(cornerPercent(25, 100)).toBe(50);
  });
});

describe("RectangleProperties.update", () => {
  function panel(): RectangleProperties {
    const p = new RectangleProperties();
    p._panel = emptyPanel;
    p._advancedPanel = emptyPanel;
    return p;
  }

  it("shows for rectangles (images too) and not when anything else is selected", () => {
    fakeDesigner();
    const p = panel();
    const doc = fakeDocument();
    expect(p.update(doc, [new Rectangle(), new Image()] as unknown as InspectedElements)).toBe(
      true,
    );
    expect(p.update(doc, [new Rectangle(), new Ellipse()] as unknown as InspectedElements)).toBe(
      false,
    );
    expect(p.update(null, null)).toBe(false);
  });
});

describe("RectangleProperties._assignCorners", () => {
  function fakeRect(radius: number, minDistance: number) {
    const set: unknown[][] = [];
    return {
      set,
      isVisible: () => true,
      getProperty: (name: string) => (name === "tl_sx" ? radius : "R"),
      getGeometryBBox: () => null,
      getPointsMinDistance: () => minDistance,
      setProperties: (...args: unknown[]) => set.push(args),
    };
  }

  it("gives a corner type on a rectangle without radius 25% of half its shorter side", () => {
    const p = new RectangleProperties();
    const log: string[] = [];
    p._document = fakeDocument(log);
    const rect = fakeRect(0, 40);
    p._rectangles = [rect as unknown as Rectangle];
    const first = p._assignCorners(undefined, "B");
    expect(first).toBe(5);
    expect(rect.set[0]).toEqual([
      ["uf", "tl_sx", "tl_ct"],
      [true, 5, "B"],
      false,
      false,
      undefined,
    ]);
    expect(log[0]).toBe("begin");
  });

  it("keeps the radius for a type change and makes no transaction while temporary", () => {
    const p = new RectangleProperties();
    const log: string[] = [];
    p._document = fakeDocument(log);
    const rect = fakeRect(7, 40);
    p._rectangles = [rect as unknown as Rectangle];
    p._assignCorners(undefined, "F", true);
    expect(rect.set[0]?.[1]).toEqual([true, 7, "F"]);
    expect(log).toEqual([]);
  });
});

describe("ImageProperties.update", () => {
  it("shows for exactly one image, ignoring other elements", () => {
    fakeDesigner();
    const p = new ImageProperties();
    p._panel = emptyPanel;
    p._controls = emptyPanel;
    const doc = fakeDocument();
    const image = new Image();
    expect(p.update(doc, [image, new Ellipse()] as unknown as InspectedElements)).toBe(true);
    expect(p._image).toBe(image);
    expect(p.update(doc, [image, new Image()] as unknown as InspectedElements)).toBe(false);
    expect(p.update(doc, [new Rectangle()] as unknown as InspectedElements)).toBe(false);
  });
});
