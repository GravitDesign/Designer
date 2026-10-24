import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import { AfterFlagChangeEvent } from "../../engine/scene/node-events.ts";
import { Node } from "../../engine/scene/node.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import { Path } from "../../engine/scene/path.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { BorderAlignment } from "../../engine/style/stylable-sets.ts";
import { ElementEditor } from "../../editor/element-editors/element-editor.ts";
import { FakeEvent, type FakeElement } from "../menus/testing/fake-dom.testing.ts";
import { PathProperties } from "./path-properties.ts";
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
afterEach(() => {
  vi.restoreAllMocks();
  env.uninstall();
});

const SELECTED = Node.Flag.Selected as number;
const PATH = "commit Modify Path Properties";
const POINT = "commit Modify Point Properties";

/** A path through `points`; the indices in `selected` are selected. */
function path(points: [number, number][], selected: number[] = [], closed = false): Path {
  const result = new Path(closed);
  points.forEach(([x, y], index) => {
    const point = new AnchorPoint();
    point.setProperties(["x", "y"], [x, y]);
    result.getAnchorPoints().appendChild(point);
    if (selected.includes(index)) point.setFlag(SELECTED);
  });
  return result;
}

const pointsOf = (p: Path) => p.getAnchorPoints().getChildren() as AnchorPoint[];

interface Shown {
  properties: PathProperties;
  panel: FakeElement;
  log: string[];
}

function shown(...elements: (Path | CompoundPath)[]): Shown {
  const log: string[] = [];
  const document = documentOf(sceneWith(...elements), log);
  const panel = env.dom.document.createElement("div");
  const properties = new PathProperties();
  properties.init(panel as unknown as HTMLElement);
  expect(properties.update(document, elements as unknown as InspectedElements)).toBe(true);
  return { properties, panel, log };
}

const display = (panel: FakeElement, selector: string) =>
  panel.querySelectorAll(selector).map((element) => element.style.display);

describe("PathProperties points", () => {
  it("collects the selected points of paths and of compound path children", () => {
    const single = path(
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      [1],
    );
    const compound = new CompoundPath();
    const inner = path(
      [
        [0, 0],
        [5, 5],
      ],
      [0, 1],
    );
    compound.getPaths().appendChild(inner);
    const { properties } = shown(single, compound);
    expect(properties._points).toEqual([pointsOf(single)[1], ...pointsOf(inner)]);
  });

  it("follows point selection in compound paths through the grandparent", () => {
    const compound = new CompoundPath();
    const inner = path([
      [0, 0],
      [5, 5],
    ]);
    compound.getPaths().appendChild(inner);
    const { properties, panel } = shown(compound);
    expect(properties._points).toEqual([]);
    expect(display(panel, "[path-only]")).toEqual([""]);
    const [first, second] = pointsOf(inner) as [AnchorPoint, AnchorPoint];
    first.setFlag(SELECTED);
    second.setFlag(SELECTED);
    expect(properties._points).toEqual([first, second]);
    expect(display(panel, "[path-only]")).toEqual(["none"]);
    expect(display(panel, "[point-only]").every((d) => d === "")).toBe(true);
    second.removeFlag(SELECTED);
    expect(properties._points).toEqual([first]);
  });

  it("removes the last point when an unknown point is deselected (splice(-1))", () => {
    const p = path(
      [
        [0, 0],
        [5, 5],
        [9, 9],
      ],
      [0, 1],
    );
    const { properties } = shown(p);
    const [first, second, third] = pointsOf(p) as [AnchorPoint, AnchorPoint, AnchorPoint];
    properties._afterFlagChange(new AfterFlagChangeEvent(third, SELECTED, false));
    expect(properties._points).toEqual([first]);
    expect(second.hasFlag(SELECTED)).toBe(true);
  });

  it("hides point rows without points, and corner rows for smooth points", () => {
    const p = path(
      [
        [0, 0],
        [5, 5],
      ],
      [0],
    );
    const point = pointsOf(p)[0] as AnchorPoint;
    point.setProperty("tp", PathBase.CornerType.Rounded);
    const { panel, properties } = shown(p);
    expect(display(panel, "[corner-only]")).toEqual(["", ""]);
    point.setProperty("tp", PathBase.AnchorPoint.Type.Symmetric);
    expect(display(panel, "[corner-only]")).toEqual(["none", "none"]);
    expect(find(panel, 'select[data-point-property="tp"]').value).toBe(
      PathBase.AnchorPoint.Type.Symmetric,
    );
    properties._points = [];
    properties._updatePointProperties();
    expect(display(panel, "[point-only]").every((d) => d === "none")).toBe(true);
  });
});

describe("PathProperties fields", () => {
  it("puts every selected point at the typed x or y, without an element editor", () => {
    const p = path(
      [
        [10, 20],
        [30, 40],
      ],
      [0, 1],
    );
    const { panel, log } = shown(p);
    const x = find(panel, 'input[data-point-property="x"]');
    expect(x.value).toBe("10");
    change(x, "50");
    expect(pointsOf(p).map((point) => [point.getProperty("x"), point.getProperty("y")])).toEqual([
      [50, 20],
      [50, 40],
    ]);
    expect(log).toEqual(["begin", POINT]);
    change(find(panel, 'input[data-point-property="y"]'), "0");
    expect(pointsOf(p).map((point) => point.getProperty("y"))).toEqual([0, 0]);
  });

  it("moves the points through the open path editor", () => {
    const p = path(
      [
        [10, 20],
        [30, 40],
      ],
      [0],
    );
    const moves: [AnchorPoint, number, number][] = [];
    const editor = {
      getPaintElement: () => p,
      getPathPointPreview: (point: AnchorPoint) => point,
      getPointCoord: () => new Point(1, 2),
      movePoint: (point: AnchorPoint, position: Point) =>
        moves.push([point, position.getX(), position.getY()]),
    };
    vi.spyOn(ElementEditor, "getEditor").mockReturnValue(editor as never);
    const { panel } = shown(p);
    const x = find(panel, 'input[data-point-property="x"]');
    expect(x.value).toBe("1");
    change(x, "5");
    expect(moves).toEqual([[pointsOf(p)[0], 5, 2]]);
    expect(pointsOf(p)[0]?.getProperty("x")).toBe(10);
  });

  it("centres the borders first when Closed is unchecked", () => {
    const p = path(
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      [],
      true,
    );
    const border = new BorderPaintLayer();
    border.setProperty("_ba", BorderAlignment.Inside);
    (p.getPaintLayers() as PaintLayers).appendChild(border);
    const { panel, log } = shown(p);
    const closed = find(panel, 'input[data-path-property="closed"]');
    expect((closed as unknown as { checked: boolean }).checked).toBe(true);
    check(closed, false);
    expect(p.getProperty("closed")).toBe(false);
    expect(border.getProperty("_ba")).toBe(BorderAlignment.Center);
    expect(log).toEqual(["begin", PATH, "begin", PATH]);
    check(closed, true);
    expect(p.getProperty("closed")).toBe(true);
    expect(border.getProperty("_ba")).toBe(BorderAlignment.Center);
    expect(log).toEqual(["begin", PATH, "begin", PATH, "begin", PATH]);
  });

  it("disables Closed for compound paths", () => {
    const compound = new CompoundPath();
    compound.getPaths().appendChild(path([[0, 0]]));
    const { panel } = shown(compound);
    const closed = find(panel, 'input[data-path-property="closed"]') as unknown as {
      checked: boolean;
      disabled: boolean;
    };
    const scale = find(panel, 'input[data-path-property="csc"]') as unknown as {
      disabled: boolean;
    };
    expect([closed.disabled, closed.checked, scale.disabled]).toEqual([true, false, false]);
  });

  it("rejects a negative corner and slides the corner temporarily", () => {
    const p = path(
      [
        [0, 0],
        [10, 0],
      ],
      [0, 1],
    );
    const { panel, log } = shown(p);
    const box = find(panel, 'input[data-point-property="cl"]');
    change(box, "4");
    expect(pointsOf(p).map((point) => point.getProperty("cl"))).toEqual([4, 4]);
    expect(log).toEqual(["begin", POINT]);
    change(box, "-2");
    expect(pointsOf(p).map((point) => point.getProperty("cl"))).toEqual([4, 4]);
    expect(box.value).toBe("4");
    expect(log).toEqual(["begin", POINT]);

    const slider = find(panel, 'div[data-point-property="cl"]');
    slider.dispatchEvent(new FakeEvent("mousedown"));
    env.dom.document.dispatchEvent(new FakeEvent("mouseup"));
    slider.setAttribute("value", "30");
    slider.dispatchEvent(new FakeEvent("input"));
    expect(pointsOf(p).map((point) => point.getProperty("cl", false, undefined, true))).toEqual([
      30, 30,
    ]);
    expect(pointsOf(p).map((point) => point.getProperty("cl"))).toEqual([4, 4]);
    expect(box.value).toBe("30");
    expect(log).toEqual(["begin", POINT, "hide", "reset-hide"]);
    slider.dispatchEvent(new FakeEvent("change"));
    expect(pointsOf(p).map((point) => point.getProperty("cl"))).toEqual([30, 30]);
    expect(log).toEqual(["begin", POINT, "hide", "reset-hide", "begin", POINT]);
  });
});
