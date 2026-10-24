// SymbolProperties' select: swapping an instance (overrides kept per
// master pair and given back on the way back), selecting the master and
// detaching. The symbols are stand-ins with the calls the panel makes.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Page } from "../../engine/scene/page.ts";
import { DetachSymbolAction } from "../actions/modify/detach-symbol-action.ts";
import { FitSelectionAction } from "../actions/view/fit-selection-action.ts";
import type { Document } from "../document/document.ts";
import { FakeEvent, type FakeElement } from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { installDocumentPanelsDom, type DocumentPanelsDom } from "./document-panels-dom.testing.ts";
import { setData } from "./paint-dom.ts";
import type { Symbol } from "../../engine/scene/symbol.ts";
import { SymbolProperties } from "./symbol-properties.ts";

let env: DocumentPanelsDom;
let log: string[];
let selection: unknown[];
let activePage: unknown;

beforeEach(() => {
  env = installDocumentPanelsDom();
  log = [];
  selection = [];
  activePage = null;
  setDesigner({
    addEventListener() {},
    removeEventListener() {},
    stats: (name: string) => log.push("stats " + name),
    isTouchEnabled: () => false,
    executeAction: (id: string) => log.push("action " + id),
  } as unknown as Designer);
});

afterEach(() => {
  resetGlobals();
  env.uninstall();
});

interface FakeSymbol {
  name: string;
  page: Page;
  master: FakeSymbol | null;
  overrides: Record<string, unknown>;
  restored: Record<string, unknown>[];
  getMasterSymbol(): FakeSymbol | null;
  getMultireferenceId(): string;
  getDisabledSiblings(): Record<string, unknown>;
  desynchronize(overrides: Record<string, unknown>): void;
  swapWith(target: FakeSymbol): FakeSymbol;
  findParent(test: (node: unknown) => boolean): unknown;
  getProperty(name: string): unknown;
  getScene(): unknown;
}

let counter = 0;
function symbol(name: string, master: FakeSymbol | null, page: Page): FakeSymbol {
  const self: FakeSymbol = {
    name,
    page,
    master,
    overrides: {},
    restored: [],
    getMasterSymbol: () => self.master,
    getMultireferenceId: () => self.name,
    getDisabledSiblings: () => ({ ...self.overrides }),
    desynchronize: (overrides) => {
      self.restored.push(overrides);
    },
    swapWith: (target) => symbol("instance-" + ++counter, target, self.page),
    findParent: (test) => (test(self.page) ? self.page : null),
    getProperty: (property) => ("name" === property ? self.name : null),
    getScene: () => (self.page.getScene() ? {} : null),
  };
  return self;
}

function setup(current: FakeSymbol, masters: FakeSymbol[]) {
  const editor = {
    beginTransaction: () => log.push("begin"),
    commitTransaction: (name: string) => log.push("commit " + name),
    updateSelection: (_toggle: boolean, nodes: unknown[]) => {
      selection = nodes;
      log.push("select");
    },
    clearSelection: () => {
      selection = [];
    },
    hasSelection: () => selection.length > 0,
    getSelection: () => selection,
  };
  const scene = {
    getActivePage: () => activePage,
    setActivePage: (page: unknown) => {
      activePage = page;
      log.push("activate page");
    },
  };
  const document = { getScene: () => scene, getEditor: () => editor } as unknown as Document;
  const panel = env.make("div");
  const properties = new SymbolProperties();
  properties.init(panel as unknown as HTMLElement, env.make("div") as unknown as HTMLElement);
  properties._document = document;
  properties._symbols = [current as unknown as Symbol];
  const select = panel.querySelector('select[data-property="symbol-instance"]') as FakeElement;
  // The options as _updateProperties builds them.
  const option = (value: string, data?: FakeSymbol) => {
    const element = env.make("option", { value });
    if (data) setData(element as unknown as Element, "symbol", data);
    select.appendChild(element);
  };
  option("-1");
  option("-2");
  masters.forEach((master, index) => option(String(index + 1), master));
  option("0");
  return { properties, select };
}

function choose(select: FakeElement, value: string): void {
  select.value = value;
  select.dispatchEvent(new FakeEvent("change"));
}

describe("SymbolProperties instance select", () => {
  it("keeps the overrides of a swapped instance and gives them back on the way back", () => {
    const pageA = new Page();
    const pageB = new Page();
    const a = symbol("A", null, pageA);
    const b = symbol("B", null, pageB);
    const instance = symbol("instance", a, pageB);
    instance.overrides = { fill: "red" };
    activePage = pageA;
    const first = setup(instance, [a, b]);
    choose(first.select, "2");
    const swapped = selection[0] as FakeSymbol;
    expect(swapped.master).toBe(b);
    // the page of the swapped instance became active
    expect(activePage).toBe(pageB);
    expect(swapped.restored).toEqual([]);
    expect(log).toEqual([
      "stats symbolproperties_select_swap",
      "begin",
      "activate page",
      "select",
      "commit Swap symbol instance",
    ]);
    const saved = first.properties._disabledSiblingMaps;
    expect(Object.keys(saved ?? {})).toEqual(["A_" + swapped.name]);

    // The panel object stays; the selection is now the swapped instance.
    first.properties._symbols = [swapped as unknown as Symbol];
    choose(first.select, "1");
    const back = selection[0] as FakeSymbol;
    expect(back.master).toBe(a);
    expect(back.restored).toHaveLength(1);
    expect(back.restored[0]).toEqual({ fill: "red" });
  });

  it("selects the master on its page and fits the view to it", () => {
    const pageA = new Page();
    const a = symbol("A", null, pageA);
    const instance = symbol("instance", a, new Page());
    const { select } = setup(instance, [a]);
    choose(select, "0");
    expect(selection).toEqual([a]);
    expect(activePage).toBe(pageA);
    expect(log).toEqual([
      "stats symbolproperties_select_swap",
      "begin",
      "activate page",
      "select",
      "action " + FitSelectionAction.ID,
      "commit Select master symbol",
    ]);
  });

  it("detaches through the action and reselects the selection", () => {
    const a = symbol("A", null, new Page());
    const instance = symbol("instance", a, new Page());
    selection = ["detached"];
    const { select } = setup(instance, [a]);
    choose(select, "-1");
    expect(log).toEqual([
      "stats symbolproperties_select_swap",
      "action " + DetachSymbolAction.ID,
      "select",
    ]);
    expect(selection).toEqual(["detached"]);
  });

  it("does nothing for the empty option", () => {
    const a = symbol("A", null, new Page());
    const { select } = setup(symbol("instance", a, new Page()), [a]);
    choose(select, "-2");
    expect(log).toEqual(["stats symbolproperties_select_swap"]);
  });
});

describe("SymbolProperties._updateProperties", () => {
  function listFor(current: FakeSymbol, symbols: FakeSymbol[], canDetach = true) {
    setDesigner({
      addEventListener() {},
      removeEventListener() {},
      isTouchEnabled: () => false,
      canExecuteAction: (id: string) => canDetach && id === DetachSymbolAction.ID,
    } as unknown as Designer);
    const panel = env.make("div");
    const toolbar = env.make("div");
    const properties = new SymbolProperties();
    properties.init(panel as unknown as HTMLElement, toolbar as unknown as HTMLElement);
    properties._document = {
      getScene: () => ({ getSymbols: () => symbols }),
    } as unknown as Document;
    properties._symbols = [current as unknown as Symbol];
    properties._updateProperties();
    const select = panel.querySelector("select") as FakeElement;
    return {
      title: toolbar.children[0]?.textContent,
      options: select.children.map(
        (option) =>
          option.getAttribute("value") +
          " " +
          option.textContent +
          ((option as unknown as { selected?: boolean }).selected ? " *" : ""),
      ),
    };
  }

  it("lists detach, the empty entry, the scene's symbols with the master selected, and (Master)", () => {
    const page = new Page();
    // a page in a scene: the master gets the "(Master)" entry
    (page as unknown as { getScene(): unknown }).getScene = () => ({});
    const a = symbol("A", null, page);
    const b = symbol("B", null, page);
    expect(listFor(symbol("Button", b, page), [a, b])).toEqual({
      title: "Button (instance of B)",
      options: ["-1 (Detach Symbol Instance)", "-2 ", "1 A", "2 B *", "0 (master)"],
    });
  });

  it("selects the empty entry when the master isn't in the list, and leaves out (Master) outside a scene", () => {
    const a = symbol("A", null, new Page());
    const other = symbol("Other", null, new Page());
    expect(listFor(symbol("Button", other, new Page()), [a]).options).toEqual([
      "-1 (Detach Symbol Instance)",
      "-2  *",
      "1 A",
    ]);
  });
});
