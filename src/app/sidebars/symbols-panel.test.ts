import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventTarget } from "../../engine/core/event-target.ts";
import { Rect } from "../../engine/math/rect.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { AfterFlagChangeEvent, AfterSpecialChangeEvent } from "../../engine/scene/node-events.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { Symbol as SymbolNode } from "../../engine/scene/symbol.ts";
import {
  fake,
  fire,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import type { Designer } from "../shell/designer.ts";
import { SymbolsPanel } from "./symbols-panel.ts";

interface FakeScene extends EventTarget {
  symbols: SymbolNode[];
  removed: SymbolNode[];
  images: Map<SymbolNode, unknown>;
  getSymbols(): SymbolNode[];
  getSymbolImage(symbol: SymbolNode): unknown;
  removeSymbol(symbol: SymbolNode): void;
}

function makeScene(): FakeScene {
  const scene = new EventTarget() as FakeScene;
  scene.symbols = [];
  scene.removed = [];
  scene.images = new Map();
  scene.getSymbols = () => scene.symbols;
  scene.getSymbolImage = (symbol) => scene.images.get(symbol) ?? null;
  scene.removeSymbol = (symbol) => {
    scene.removed.push(symbol);
    scene.symbols = scene.symbols.filter((s) => s !== symbol);
  };
  return scene;
}

/** A master symbol node with a 100x60 frame (no real scene behind it). */
function makeSymbol(scene: FakeScene, id: string, name = "Master"): SymbolNode {
  const symbol = Object.create(SymbolNode.prototype) as SymbolNode;
  const listeners: unknown[] = [];
  Object.assign(symbol, {
    getMultireferenceId: () => id,
    isMaster: () => true,
    getScene: () => scene,
    getParent: () => null,
    getProperty: (property: string) => (property === "name" ? name : null),
    getFrame: () => new Rect(0, 0, 100, 60),
    getPaintBBox: () => new Rect(0, 0, 100, 60),
    hasFlag: () => false,
    toBitmap: vi.fn(),
    hasEventListeners: () => listeners.length > 0,
    addEventListener: (_type: unknown, listener: unknown) => listeners.push(listener),
    testListeners: listeners,
  });
  scene.symbols.push(symbol);
  return symbol;
}

function thumbnail(): { canvas: unknown; image: unknown } {
  const canvas = document.createElement("canvas");
  return { canvas, image: { getBitmap: () => ({ getHTMLElement: () => canvas }) } };
}

let dom: FakeDomHandle;
let stats: string[];

beforeEach(() => {
  dom = installFakeDom();
  stats = [];
  setDesigner({
    stats: (name: string) => stats.push(name),
    canExecuteAction: () => false,
    executeAction: () => true,
  } as unknown as Designer);
});

afterEach(() => {
  resetGlobals();
  dom.uninstall();
});

function newPanel(options = {}): SymbolsPanel {
  const element = document.createElement("div");
  element.classList.add("symbols");
  document.body.appendChild(element);
  return new SymbolsPanel(element, options);
}

const tiles = (panel: SymbolsPanel) =>
  fake(panel.element).children.filter((c) => (c.getAttribute("id") || "").startsWith("symbol_"));

describe("SymbolsPanel", () => {
  it("shows the 'no symbols' note for a scene without masters", () => {
    const panel = newPanel();
    expect([...fake(panel.element).classList]).toEqual(["symbols", "g-symbols-panel"]);
    panel.setScene(makeScene() as unknown as Scene);
    expect(panel.element.querySelectorAll(".symbol-panel-info")).toHaveLength(1);
    expect(tiles(panel)).toHaveLength(0);
  });

  it("adds one tile per master and scales its thumbnail into 85x85", () => {
    const scene = makeScene();
    const master = makeSymbol(scene, "a1");
    const { canvas, image } = thumbnail();
    scene.images.set(master, image);
    const panel = newPanel();
    panel.setScene(scene as unknown as Scene);
    const [tile] = tiles(panel);
    expect(tile?.getAttribute("id")).toBe("symbol_a1");
    expect(tile?.getAttribute("style")).toBe("display: inline;");
    expect(panel.element.querySelectorAll(".symbol-panel-info")).toHaveLength(0);
    const group = tile?.children[0];
    expect(group?.getAttribute("style")).toBe(
      "display: inline-block; background-color: #eee; margin: 5px; height: 95px; width: 45%; text-align: center; line-height: 180px;",
    );
    expect(group?.children[0]?.getAttribute("style")).toBe("position: relative; top: -17px;");
    expect(fake(canvas).getAttribute("style")).toBe("width: 85px; height: 51px; margin: 5px;");
    // A master without an image yet renders one.
    const other = makeSymbol(scene, "b2");
    panel.setScene(null);
    panel.setScene(scene as unknown as Scene);
    expect(tiles(panel)).toHaveLength(2);
    expect(other.toBitmap).toHaveBeenCalled();
  });

  it("highlights the tile while the master is selected", () => {
    const scene = makeScene();
    const master = makeSymbol(scene, "a1");
    const panel = newPanel();
    panel.setScene(scene as unknown as Scene);
    scene.trigger(new AfterFlagChangeEvent(master, NodeFlag.Selected, true));
    expect(panel.isSelected()).toBe(true);
    scene.trigger(new AfterFlagChangeEvent(master, NodeFlag.Selected, false));
    expect(panel.isSelected()).toBe(false);
  });

  it("removeSelected removes the symbol from the scene and its tile", () => {
    const scene = makeScene();
    const master = makeSymbol(scene, "a1");
    const panel = newPanel();
    panel.setScene(scene as unknown as Scene);
    let blockedWhileRemoving: boolean | null = null;
    const remove = scene.removeSymbol;
    scene.removeSymbol = (symbol) => {
      blockedWhileRemoving = panel.blockHandlers;
      remove(symbol);
    };
    scene.trigger(new AfterFlagChangeEvent(master, NodeFlag.Selected, true));
    panel.removeSelected();
    expect(scene.removed).toEqual([master]);
    expect(blockedWhileRemoving).toBe(true);
    expect(panel.blockHandlers).toBe(false);
    expect(tiles(panel)).toHaveLength(0);
    expect(panel.element.querySelectorAll(".symbol-panel-info")).toHaveLength(1);
  });

  it("follows symbols created and removed in the scene, keeping removed ones in the scene", () => {
    const scene = makeScene();
    const panel = newPanel();
    panel.setScene(scene as unknown as Scene);
    const master = makeSymbol(scene, "c3");
    scene.trigger(new AfterSpecialChangeEvent(master, { created: true }));
    expect(tiles(panel)).toHaveLength(1);
    scene.trigger(new AfterSpecialChangeEvent(master, { created: false }));
    expect(tiles(panel)).toHaveLength(0);
    expect(scene.removed).toEqual([]);
    // Switching scenes stops listening to the old one.
    panel.setScene(null);
    scene.trigger(new AfterSpecialChangeEvent(master, { created: true }));
    expect(tiles(panel)).toHaveLength(0);
  });

  it("calls the click and double click callbacks with the master", () => {
    const scene = makeScene();
    const master = makeSymbol(scene, "a1");
    const clicked: unknown[] = [];
    const doubled: unknown[] = [];
    const panel = newPanel({
      clickCallback: (s: unknown) => clicked.push(s),
      dblClickCallback: (s: unknown) => doubled.push(s),
    });
    panel.setScene(scene as unknown as Scene);
    const group = tiles(panel)[0]?.children[0];
    fire(group, "click");
    fire(group, "dblclick");
    expect(clicked).toEqual([master]);
    expect(doubled).toEqual([master]);
    expect(stats).toEqual(["symbol_click_select", "symbol_click_focus"]);
  });

  it("adds another thumbnail listener per master on every scene switch, as the old code did", () => {
    const scene = makeScene();
    const master = makeSymbol(scene, "a1");
    const listeners = (master as unknown as { testListeners: ((event: unknown) => void)[] })
      .testListeners;
    const panel = newPanel();
    panel.setScene(scene as unknown as Scene);
    panel.setScene(null);
    panel.setScene(scene as unknown as Scene);
    // See "The symbols panel piles up thumbnail listeners" in QUESTIONS.md.
    expect(listeners).toHaveLength(2);
    const { canvas, image } = thumbnail();
    const updated = vi.spyOn(
      panel as unknown as { _thumbnailUpdated(update: unknown): void },
      "_thumbnailUpdated",
    );
    for (const listener of listeners) listener({ symbol: master, image });
    expect(updated).toHaveBeenCalledTimes(2);
    expect(fake(canvas).getAttribute("style")).toBe("width: 85px; height: 51px; margin: 5px;");
  });

  it("newSymbolClick runs Create Symbol only when it can, and always returns false", () => {
    const panel = newPanel();
    const runs: string[] = [];
    setDesigner({
      stats: () => undefined,
      canExecuteAction: (id: string) => id === "modify.createsymbol",
      executeAction: (id: string) => runs.push(id),
    } as unknown as Designer);
    expect(panel.newSymbolClick()).toBe(false);
    expect(runs).toEqual(["modify.createsymbol"]);
  });
});
