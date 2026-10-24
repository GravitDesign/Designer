import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Node } from "../../engine/scene/node.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { setDesigner } from "../shell/globals.ts";
import { SelectedPanel, type SelectionHit } from "./selected-panel.ts";
import {
  classHeights,
  fireEvent,
  installTreeDom,
  type TestElement,
} from "./testing/tree-dom.testing.ts";

let dom: ReturnType<typeof installTreeDom>;

beforeEach(() => {
  vi.useFakeTimers();
  dom = installTreeDom();
  classHeights["selected-row"] = 34;
  setDesigner({ isTouchEnabled: () => false } as never);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  setDesigner(null);
  dom.uninstall();
  delete classHeights["selected-row"];
});

function named(name: string): Rectangle {
  const rectangle = new Rectangle();
  rectangle.setProperty("name", name);
  return rectangle;
}

function makePanel(clicked: (Node | null)[] = []) {
  const element = dom.document.createElement("div");
  element.box = { x: 0, y: 0, width: 249, height: 600 };
  dom.document.body.appendChild(element);
  const panel = new SelectedPanel(element as unknown as HTMLElement, {
    clickCallback: (node) => clicked.push(node),
  });
  return { panel, element };
}

function rows(element: TestElement): TestElement[] {
  return element.children.filter((child) => child.id === "rowId" && child.style.display !== "none");
}

function titles(element: TestElement): string[] {
  return rows(element).map(
    (row) => row.querySelector<TestElement>(".layer-title")?.textContent ?? "",
  );
}

describe("gSelectedPanel", () => {
  it("keeps the defaults for options given as undefined, as $.extend did", () => {
    const element = dom.document.createElement("div");
    const panel = new SelectedPanel(element as unknown as HTMLElement, {
      renderer: undefined,
      nodeStyle: undefined,
      bottomHeight: 5,
    });
    expect(typeof panel.options.renderer).toBe("function");
    expect(panel.options.nodeStyle).toBe("selected-row");
    expect(panel.options.bottomHeight).toBe(5);
  });

  it("looks up a submenu by the hit's index in elementHits, not in the filtered list", () => {
    const { panel, element } = makePanel();
    const [a, b, c, sub1, sub2, wrong] = ["A", "B", "C", "S1", "S2", "W"].map(named) as [
      Rectangle,
      Rectangle,
      Rectangle,
      Rectangle,
      Rectangle,
      Rectangle,
    ];
    const hits: [SelectionHit, SelectionHit, SelectionHit] = [
      { element: a },
      { element: b },
      { element: c },
    ];
    panel.setSelections({
      elementHits: hits,
      filteredElementHits: [hits[2], hits[0]],
      // Index 0 in the filtered list is "temp-2"; "temp-1" (B) isn't listed.
      submenus: { "temp-2": [sub1, sub2], "temp-1": [wrong] },
    });
    vi.advanceTimersByTime(25);
    expect(titles(element)).toEqual(["C", "S1", "S2", "A"]);
    expect(rows(element)[0]?.children[0]?.id).toBe("clpsId");
  });

  it("maps a row click and a collapse back to the element", () => {
    const clicked: (Node | null)[] = [];
    const { panel, element } = makePanel(clicked);
    const [a, sub] = ["A", "S"].map(named) as [Rectangle, Rectangle];
    const hit = { element: a };
    panel.setSelections({
      elementHits: [hit],
      filteredElementHits: [hit],
      submenus: { "temp-0": [sub] },
    });
    vi.advanceTimersByTime(25);
    fireEvent(rows(element)[1], "click");
    expect(clicked).toEqual([sub]);
    a.setFlag(Node.Flag.Expanded as number);
    fireEvent(rows(element)[0]?.children[0], "click");
    expect(a.hasFlag(Node.Flag.Expanded as number)).toBe(false);
    expect(clicked).toEqual([sub]);
    expect(titles(element)).toEqual(["A"]);
  });

  it("refills only for new selections", () => {
    const { panel, element } = makePanel();
    const hit = { element: named("A") };
    const selections = { elementHits: [hit], filteredElementHits: [hit], submenus: {} };
    panel.setSelections(selections);
    const map = panel.layersTreeNodeMap;
    panel.setSelections(selections);
    expect(panel.layersTreeNodeMap).toBe(map);
    expect(panel.setSelections()).toBe(selections);
    vi.advanceTimersByTime(25);
    expect(titles(element)).toEqual(["A"]);
  });
});
