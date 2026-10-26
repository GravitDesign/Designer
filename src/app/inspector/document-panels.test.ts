// SceneProperties, SliceProperties and SymbolProperties: which selections
// show them and how they write (the DOM is left out; the parity
// scenarios ui/inspector/* compare it).
import { afterEach, describe, expect, it } from "vitest";
import { GMath } from "../../engine/math/math.ts";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Slice } from "../../engine/scene/slice.ts";
import { Symbol } from "../../engine/scene/symbol.ts";
import type { Document } from "../document/document.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import type { InspectedElements } from "./properties.ts";
import { clampGridAngle, SceneProperties } from "./scene-properties.ts";
import { SliceProperties } from "./slice-properties.ts";
import { SymbolProperties } from "./symbol-properties.ts";

/** An element that finds nothing. */
const emptyPanel = {
  querySelectorAll: () => [],
  querySelector: () => null,
} as unknown as HTMLElement;

function fakeDesigner(): void {
  setDesigner({
    addEventListener() {},
    removeEventListener() {},
    stats() {},
    isTouchEnabled: () => false,
    getSetting: (_key: string, fallback: unknown) => fallback,
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
    hasCDR: () => false,
    getEditor: () => ({
      beginTransaction: () => log.push("begin"),
      commitTransaction: (name: string) => log.push("commit " + name),
    }),
  } as unknown as Document;
}

const elements = (...list: unknown[]) => list as InspectedElements;

afterEach(() => resetGlobals());

describe("clampGridAngle", () => {
  it("folds angle 1 into 0..89 degrees", () => {
    expect(clampGridAngle("ga1", 30)).toBe(30);
    expect(clampGridAngle("ga1", 210)).toBe(30);
    expect(clampGridAngle("ga1", 95)).toBe(89);
    expect(clampGridAngle("ga1", 90)).toBe(89);
    expect(clampGridAngle("ga1", 89.5)).toBe(89.5);
    expect(clampGridAngle("ga1", -30)).toBe(89);
  });

  it("folds angle 2 into -89..0 degrees", () => {
    expect(clampGridAngle("ga2", -30)).toBe(-30);
    expect(clampGridAngle("ga2", 330)).toBe(-30);
    expect(clampGridAngle("ga2", 30)).toBe(-89);
    expect(clampGridAngle("ga2", 150)).toBe(-30);
  });
});

describe("SceneProperties.update", () => {
  function panel(): SceneProperties {
    const p = new SceneProperties();
    p._panel = emptyPanel;
    return p;
  }

  it("shows for exactly one page that is in a scene", () => {
    fakeDesigner();
    const page = new Page();
    const scene = { getProperty: () => null, setProperty() {} };
    page.getScene = (() => scene) as unknown as Page["getScene"];
    const p = panel();
    expect(p.update(fakeDocument(), elements(page))).toBe(true);
    expect(p._scene).toBe(scene);
    expect(p.update(fakeDocument(), elements(page, page))).toBe(false);
    expect(p.update(fakeDocument(), elements(new Page()))).toBe(false);
    expect(p.update(null, null)).toBe(false);
  });

  it("writes the scene in one transaction", () => {
    fakeDesigner();
    const log: string[] = [];
    const p = panel();
    const written: unknown[] = [];
    p._document = fakeDocument(log);
    p._scene = {
      setProperties: (names: string[], values: unknown[]) => written.push([names, values]),
    } as unknown as SceneProperties["_scene"];
    p._assignProperty("ga1", GMath.toRadians(30), "grid");
    expect(written).toEqual([[["ga1"], [GMath.toRadians(30)]]]);
    expect(log).toEqual(["begin", "commit grid"]);
  });
});

describe("SliceProperties", () => {
  function panel(): SliceProperties {
    const p = new SliceProperties();
    p._panel = emptyPanel;
    return p;
  }

  it("shows only when every inspected element is a slice", () => {
    fakeDesigner();
    const p = panel();
    const doc = fakeDocument();
    expect(p.update(doc, elements(new Slice(), new Slice()))).toBe(true);
    expect(p._slices.length).toBe(2);
    expect(p.update(doc, elements(new Slice(), new Rectangle()))).toBe(false);
    expect(p.update(null, null)).toBe(false);
  });

  // The old code passed true as setProperties' third argument, which is
  // "custom", so a temporary change landed in the custom property (BUG-161).
  it("writes temporary changes as temporary values, the rest in one transaction", () => {
    fakeDesigner();
    const log: string[] = [];
    const p = panel();
    const a = new Slice();
    const b = new Slice();
    p._document = fakeDocument(log);
    p._slices = [a, b];
    p._assignProperty("trm", false, true);
    expect(log).toEqual([]);
    expect([a.hasProperty("trm", true), b.hasProperty("trm", true)]).toEqual([false, false]);
    expect([
      a.getProperty("trm", false, null, true),
      b.getProperty("trm", false, null, true),
    ]).toEqual([false, false]);
    expect([a.getProperty("trm"), b.getProperty("trm")]).toEqual([true, true]);
    p._assignProperty("trm", false);
    expect(log.length).toBe(2);
    expect(log[0]).toBe("begin");
    expect([a.getProperty("trm"), b.getProperty("trm")]).toEqual([false, false]);
    expect(p._ownChange).toBe(false);
  });
});

describe("SymbolProperties.update", () => {
  function instance(master: Symbol | null, isMaster = false): Symbol {
    const symbol = new Symbol();
    symbol.isMaster = () => isMaster;
    symbol.getMasterSymbol = () => master;
    return symbol;
  }

  it("shows for instances with a master, not for masters or detached ones", () => {
    fakeDesigner();
    const p = new SymbolProperties();
    p._panel = emptyPanel;
    // _updateProperties needs the DOM; only the filter is under test.
    p._updateProperties = () => {};
    const master = instance(null, true);
    const doc = fakeDocument();
    expect(p.update(doc, elements(instance(master), new Rectangle()))).toBe(true);
    expect(p._symbols?.length).toBe(1);
    expect(p.update(doc, elements(master))).toBe(false);
    expect(p.update(doc, elements(instance(null)))).toBe(false);
    expect(p._symbols).toBe(null);
  });
});
