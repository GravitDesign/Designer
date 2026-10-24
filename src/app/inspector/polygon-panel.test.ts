import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GMath } from "../../engine/math/math.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { Polygon } from "../../engine/scene/polygon.ts";
import { FakeEvent, type FakeElement } from "../menus/testing/fake-dom.testing.ts";
import { PolygonProperties } from "./polygon-properties.ts";
import type { InspectedElements } from "./properties.ts";
import {
  change,
  check,
  documentOf,
  find,
  installShapeTestDom,
  sceneWith,
  type ShapeTestDom,
} from "./shape-panels-dom.testing.ts";

let env: ShapeTestDom;
beforeEach(() => {
  env = installShapeTestDom();
});
afterEach(() => env.uninstall());

/** A five-pointed star with outer radius 100 and inner radius 50. */
function star(): Polygon {
  const polygon = new Polygon();
  polygon.setProperties(["pts", "or", "ir", "ia"], [5, 100, 50, Math.PI / 5]);
  return polygon;
}

/** A pentagon: the inner points on the edges. */
function pentagon(): Polygon {
  const polygon = new Polygon();
  polygon.setProperties(
    ["pts", "or", "ir", "ia"],
    [5, 100, 100 * Math.cos(Math.PI / 5), Math.PI / 5],
  );
  return polygon;
}

interface Shown {
  properties: PolygonProperties;
  panel: FakeElement;
  advanced: FakeElement;
  log: string[];
}

function shown(...polygons: Polygon[]): Shown {
  const log: string[] = [];
  const document = documentOf(sceneWith(...polygons), log);
  const panel = env.dom.document.createElement("div");
  const properties = new PolygonProperties();
  properties.init(panel as unknown as HTMLElement);
  expect(properties.update(document, polygons as unknown as InspectedElements)).toBe(true);
  return {
    properties,
    panel,
    advanced: properties._advancedPanel as unknown as FakeElement,
    log,
  };
}

function slide(slider: FakeElement, value: number, type: "input" | "change"): void {
  slider.setAttribute("value", String(value));
  slider.dispatchEvent(new FakeEvent(type));
}

const temporary = (polygon: Polygon, name: string) =>
  polygon.getProperty(name, false, undefined, true);

describe("PolygonProperties fields", () => {
  it("takes radii of 0 or more and restores the boxes otherwise", () => {
    const polygon = star();
    const { advanced, log } = shown(polygon);
    const outer = find(advanced, 'input[data-property="or"]');
    change(outer, "80");
    expect(polygon.getProperty("or")).toBe(80);
    expect(log).toEqual(["begin", "commit Change radius"]);
    change(outer, "-1");
    expect(polygon.getProperty("or")).toBe(80);
    expect(outer.value).toBe("80");
    const corner = find(advanced, 'input[data-property="icr"]');
    change(corner, "abc");
    expect(corner.value).toBe("0");
    change(corner, "4");
    expect(polygon.getProperty("icr")).toBe(4);
    expect(log).toEqual(["begin", "commit Change radius", "begin", "commit Change corner radius"]);
  });

  it("stores a typed angle as 2π minus its normalised radians", () => {
    const polygon = star();
    const { advanced, log } = shown(polygon);
    const angle = find(advanced, 'input[data-property="oa"]');
    change(angle, "90");
    expect(polygon.getProperty("oa")).toBeCloseTo((3 * Math.PI) / 2, 12);
    change(angle, "450");
    expect(polygon.getProperty("oa")).toBeCloseTo((3 * Math.PI) / 2, 12);
    change(angle, "-90");
    expect(polygon.getProperty("oa")).toBeCloseTo(Math.PI / 2, 12);
    expect(angle.value).toBe("270");
    expect(log.filter((entry) => entry !== "begin")).toEqual([
      "commit Change angle",
      "commit Change angle",
      "commit Change angle",
    ]);
  });

  it("sets the corner type of inner and outer corners from the advanced picker", () => {
    const polygon = star();
    const { advanced, log } = shown(polygon);
    find(advanced, '[data-property="corners-type"] button[data-corner-type="F"]').dispatchEvent(
      new FakeEvent("click"),
    );
    expect([polygon.getProperty("ict"), polygon.getProperty("oct")]).toEqual(["F", "F"]);
    expect(log).toEqual(["begin", "commit Change corner type"]);
  });
});

describe("PolygonProperties._assignCornersRadius", () => {
  it("halves a slider radius on stars for both corners, temporary without a transaction", () => {
    const polygon = star();
    const { panel, log } = shown(polygon);
    const distance = polygon.getPointsMinDistance();
    const slider = find(panel, '[data-property="corners-radius-slider"]');
    slide(slider, 40, "input");
    expect(temporary(polygon, "ocr")).toBe((0.4 * distance) / 2);
    expect(temporary(polygon, "icr")).toBe((0.4 * distance) / 2);
    expect(polygon.getProperty("ocr")).toBe(0);
    expect(log).toEqual([]);
    slide(slider, 40, "change");
    expect(polygon.getProperty("ocr")).toBe((0.4 * distance) / 2);
    expect(log).toEqual(["begin", "commit Change corners"]);
  });

  it("gives plain-edged polygons the whole slider radius on the outer corners only", () => {
    const polygon = pentagon();
    const { properties } = shown(polygon);
    expect(polygon.isPlainEdges()).toBe(true);
    const distance = polygon.getPointsMinDistance();
    expect(properties._assignCornersRadius(0.5, false)).toBe(0.5 * distance);
    expect([polygon.getProperty("ocr"), polygon.getProperty("icr")]).toEqual([0.5 * distance, 0]);
  });

  it("takes the box value as it is, for both corners of stars", () => {
    const polygon = star();
    const { panel, log } = shown(polygon);
    change(find(panel, 'input[data-property="corners-radius"]'), "6");
    expect([polygon.getProperty("ocr"), polygon.getProperty("icr")]).toEqual([6, 6]);
    expect(log).toEqual(["begin", "commit Change corners"]);
  });

  it("skips hidden polygons and returns the first polygon's radius only when it is visible", () => {
    const hidden = star();
    const visible = star();
    const { properties } = shown(hidden, visible);
    hidden.setFlag(ElementFlag.Hidden);
    expect(hidden.isVisible()).toBe(false);
    expect(properties._assignCornersRadius(5, false, true)).toBe(0);
    expect(hidden.getProperty("ocr")).toBe(0);
    expect(visible.getProperty("ocr")).toBe(5);
  });
});

describe("PolygonProperties size, points and edges", () => {
  it("sets the inner radius from the size slider and box", () => {
    const polygon = star();
    const { panel, log } = shown(polygon);
    const slider = find(panel, '.g-input-slider[data-property="size"]');
    const box = find(panel, 'input[type="text"][data-property="size"]');
    slide(slider, 30, "input");
    expect(temporary(polygon, "ir")).toBe(30);
    expect(box.value).toBe("30%");
    expect(log).toEqual([]);
    slide(slider, 30, "change");
    expect(polygon.getProperty("ir")).toBe(30);
    expect(log).toEqual(["begin", "commit Change polygon size"]);
    change(box, "75");
    expect(polygon.getProperty("ir")).toBe(75);
  });

  it("moves the inner points half a segment when the point count changes", () => {
    const polygon = star();
    const { panel, log } = shown(polygon);
    const slider = find(panel, '.g-input-slider[data-property="pts"]');
    slide(slider, 8, "input");
    expect(temporary(polygon, "pts")).toBe(8);
    expect(find(panel, 'input[type="text"][data-property="pts"]').value).toBe("8");
    expect(log).toEqual([]);
    change(find(panel, 'input[type="text"][data-property="pts"]'), "6");
    expect([polygon.getProperty("pts"), polygon.getProperty("ia")]).toEqual([6, Math.PI / 6]);
    expect(log).toEqual(["begin", "commit Change polygon points"]);
  });

  it("makes plain edges on check, hides the size row, and does nothing on uncheck", () => {
    const polygon = star();
    const { panel, advanced, log } = shown(polygon);
    const edges = find(advanced, 'input[data-property="edges"]');
    const sizeRow = find(panel, '[data-plain-edges="false"]');
    expect(sizeRow.style.display).toBe("");
    check(edges, true);
    expect(polygon.getProperty("ir")).toBeCloseTo(100 * Math.cos(Math.PI / 5), 12);
    expect(polygon.getProperty("ia")).toBe(Math.PI / 5);
    expect(polygon.isPlainEdges()).toBe(true);
    expect(sizeRow.style.display).toBe("none");
    expect(log).toEqual(["begin", "commit Change polygon size"]);
    check(edges, false);
    expect(polygon.isPlainEdges()).toBe(true);
    expect(log).toEqual(["begin", "commit Change polygon size"]);
  });

  it("checks plain edges when shown for a plain-edged polygon", () => {
    const { advanced, panel } = shown(pentagon());
    expect(
      (find(advanced, 'input[data-property="edges"]') as unknown as { checked: boolean }).checked,
    ).toBe(true);
    expect(find(panel, '[data-plain-edges="false"]').style.display).toBe("none");
  });

  it("shows angles counter-clockwise in degrees", () => {
    const polygon = star();
    polygon.setProperty("oa", GMath.PI2 - Math.PI / 2);
    const { advanced } = shown(polygon);
    expect(find(advanced, 'input[data-property="oa"]').value).toBe("90");
    expect(find(advanced, 'input[data-property="ia"]').value).toBe("324");
  });
});
