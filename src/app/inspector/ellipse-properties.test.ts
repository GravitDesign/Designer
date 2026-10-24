import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { BorderAlignment } from "../../engine/style/stylable-sets.ts";
import type { FakeElement } from "../menus/testing/fake-dom.testing.ts";
import { EllipseProperties } from "./ellipse-properties.ts";
import type { InspectedElements } from "./properties.ts";
import {
  change,
  click,
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

function shown(ellipse: Ellipse): { panel: FakeElement; log: string[] } {
  const log: string[] = [];
  const document = documentOf(sceneWith(ellipse), log);
  const panel = env.dom.document.createElement("div");
  const properties = new EllipseProperties();
  properties.init(panel as unknown as HTMLElement);
  expect(properties.update(document, [ellipse] as InspectedElements)).toBe(true);
  return { panel, log };
}

function withBorder(): { ellipse: Ellipse; border: BorderPaintLayer } {
  const ellipse = new Ellipse();
  const border = new BorderPaintLayer();
  border.setProperty("_ba", BorderAlignment.Inside);
  (ellipse.getPaintLayers() as PaintLayers).appendChild(border);
  return { ellipse, border };
}

describe("EllipseProperties", () => {
  it("makes an arc and centres its borders in a second transaction", () => {
    const { ellipse, border } = withBorder();
    const { panel, log } = shown(ellipse);
    click(find(panel, `[data-property="etp-${Ellipse.Type.Arc}"]`));
    expect(ellipse.getProperty("etp")).toBe(Ellipse.Type.Arc);
    expect(border.getProperty("_ba")).toBe(BorderAlignment.Center);
    expect(log).toEqual([
      "begin",
      "commit Change shape",
      "begin",
      "commit Ellipse set border allignment to center",
    ]);
    expect(env.stats).toContainEqual(["ellipse_change_type", Ellipse.Type.Arc]);
  });

  it("keeps the border alignment for chord and pie", () => {
    const { ellipse, border } = withBorder();
    const { panel, log } = shown(ellipse);
    click(find(panel, `[data-property="etp-${Ellipse.Type.Chord}"]`));
    expect(ellipse.getProperty("etp")).toBe(Ellipse.Type.Chord);
    expect(border.getProperty("_ba")).toBe(BorderAlignment.Inside);
    expect(log).toEqual(["begin", "commit Change shape"]);
  });

  it("marks the button of the current type active", () => {
    const ellipse = new Ellipse();
    ellipse.setProperty("etp", Ellipse.Type.Pie);
    const { panel } = shown(ellipse);
    const active = (type: number) =>
      find(panel, `[data-property="etp-${type}"]`).classList.contains("g-active");
    expect([
      active(Ellipse.Type.Arc),
      active(Ellipse.Type.Chord),
      active(Ellipse.Type.Pie),
    ]).toEqual([false, false, true]);
    click(find(panel, `[data-property="etp-${Ellipse.Type.Chord}"]`));
    expect([
      active(Ellipse.Type.Arc),
      active(Ellipse.Type.Chord),
      active(Ellipse.Type.Pie),
    ]).toEqual([false, true, false]);
  });

  // The box reads unparsable text as "0" before the panel sees it (gInputBox
  // value()), so the panel's fallback to _updateProperties never runs for typing.
  it("writes a typed angle; unparsable text counts as 0 degrees", () => {
    const ellipse = new Ellipse();
    const { panel, log } = shown(ellipse);
    const start = find(panel, 'input[data-property="sa"]');
    expect(start.value).toBe("180");
    change(start, "90");
    expect(ellipse.getProperty("sa")).toBeCloseTo((3 * Math.PI) / 2, 12);
    expect(start.value).toBe("90");
    expect(log).toEqual(["begin", "commit Change angle"]);
    change(start, "abc");
    expect(ellipse.getProperty("sa")).toBe(2 * Math.PI);
    expect(start.value).toBe("0");
    expect(log).toEqual(["begin", "commit Change angle", "begin", "commit Change angle"]);
  });
});
