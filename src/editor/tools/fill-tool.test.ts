import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Point } from "../../engine/math/point.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import { PathsGraph } from "../../engine/scene/paths-graph/paths-graph.ts";
import type { PGFacet } from "../../engine/scene/paths-graph/pg-facet.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import type { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { installFakeDom } from "../view/testing/fake-dom.ts";
import { FillTool } from "./fill-tool.ts";
import { clearModifiers, releaseTools, setupTools } from "./tool-testing.ts";

let uninstall: () => void;
beforeEach(() => {
  uninstall = installFakeDom();
  vi.useFakeTimers();
});
afterEach(() => {
  releaseTools();
  clearModifiers();
  vi.useRealTimers();
  uninstall();
});

function line(points: [number, number][]): PathBase {
  const base = new PathBase();
  for (const [x, y] of points) {
    const point = new AnchorPoint();
    point.setProperties(["x", "y"], [x, y]);
    base.getAnchorPoints().appendChild(point);
  }
  return base;
}

/**
 * A selected paths graph: the square (100, 100) - (300, 300) split by a
 * vertical line at x 200 into a left and a right facet, with the fill
 * tool active.
 */
function setup() {
  const s = setupTools();
  const graph = new PathsGraph();
  // In the page first, so the facets the lines create get the workspace
  // (and so the transaction recorder), as when the paths graph tool
  // draws them.
  s.page.appendChild(graph);
  graph.addGraphLine(
    line([
      [100, 100],
      [300, 100],
      [300, 300],
      [100, 300],
      [100, 100],
    ]),
    null,
    null,
    null,
    true,
  );
  graph.addGraphLine(
    line([
      [200, 100],
      [200, 300],
    ]),
    null,
    null,
    null,
    true,
  );
  s.editor.updateSelection(false, [graph]);
  expect(s.manager.activateTool(FillTool)).toBe(true);
  const tool = s.manager.getActiveTool() as FillTool;
  const facets = () => graph.getFacets().getChildren() as PGFacet[];
  /** The facet whose box contains (x, y). */
  const facetAt = (x: number, y: number): PGFacet => {
    const found = facets().find((f) => f.isInside(new Point(x, y), null));
    if (!found) throw new Error(`no facet at ${x}, ${y}`);
    return found;
  };
  return { ...s, graph, tool, facets, facetAt };
}

/** A paint layers' fills as [colour, opacity] pairs. */
const fills = (node: { getPaintLayers(): unknown }): unknown[] =>
  (node.getPaintLayers() as { getFillLayers(): FillPaintLayer[] })
    .getFillLayers()
    .map((layer) => [String(layer.$_pt), layer.$_op]);

const modifyFill = () => Locale.get(new LocaleKey("GFillTool", "action.modify-fill"));

describe("FillTool", () => {
  it("a press, drag and release over two facets fills both in one undo step", () => {
    const s = setup();
    expect(s.facets()).toHaveLength(2);
    const red = new RGBColor([255, 0, 0]);
    s.tool.setFill(red, 0.5);
    const undoBefore = s.editor.getUndoStates().length;
    s.input.dragThrough(
      [150, 200],
      [
        [180, 200],
        [250, 200],
      ],
    );
    for (const facet of [s.facetAt(150, 200), s.facetAt(250, 200)]) {
      expect(facet.getProperty("cSt")).toBe(true);
      expect(fills(facet)).toEqual([[String(red), 0.5]]);
    }
    expect(s.editor.getUndoStates().length).toBe(undoBefore + 1);
    expect(s.editor.getUndoStateName()).toBe(modifyFill());
  });

  it("without a fill a facet goes back to the paths graph's style", () => {
    const s = setup();
    s.tool.setFill(new RGBColor([255, 0, 0]), 0.5);
    s.input.click(150, 200);
    const left = s.facetAt(150, 200);
    expect(left.getProperty("cSt")).toBe(true);
    s.tool.setFill(null);
    s.input.click(150, 200);
    expect(left.getProperty("cSt")).toBe(false);
    // assignStyleFrom took the graph (the facet's parent is the graph's
    // facets map container, one step below the graph).
    expect(fills(left)).toEqual(fills(s.graph));
    expect(s.facetAt(250, 200).getProperty("cSt")).not.toBe(true);
  });

  it("a click outside the facets starts no transaction", () => {
    const s = setup();
    s.tool.setFill(new RGBColor([255, 0, 0]), 0.5);
    const undoBefore = s.editor.getUndoStates().length;
    s.input.click(500, 500);
    expect(s.editor.getUndoStates().length).toBe(undoBefore);
  });

  it("the selection fill getters read the first selected paths graph", () => {
    const s = setup();
    const graphFill = (
      s.graph.getPaintLayers() as { getFillLayers(): FillPaintLayer[] }
    ).getFillLayers()[0];
    if (graphFill) {
      expect(s.tool.getSelectionFillPattern()).toBe(graphFill.$_pt);
      expect(s.tool.getSelectionFillOpacity()).toBe(graphFill.$_op);
    }
    // A graph without fills: null for both.
    (s.graph.getPaintLayers() as { clearFillLayers(): void }).clearFillLayers();
    expect(s.tool.getSelectionFillPattern()).toBeNull();
    expect(s.tool.getSelectionFillOpacity()).toBeNull();
    // No paths graph selected: no pattern, but opacity 1 (old quirk).
    const rect = new Rectangle();
    s.page.appendChild(rect);
    s.editor.updateSelection(false, [rect]);
    expect(s.tool.getSelectionFillPattern()).toBeNull();
    expect(s.tool.getSelectionFillOpacity()).toBe(1);
  });
});
