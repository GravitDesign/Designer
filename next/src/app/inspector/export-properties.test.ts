import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Transform } from "../../engine/math/transform.ts";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Slice } from "../../engine/scene/slice.ts";
import type { Document } from "../document/document.ts";
import { fake, installFakeDom, type FakeDomHandle } from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { ExportProperties } from "./export-properties.ts";

type Row = { sz: string; sf: string; fm: string };

interface FakeEditor {
  commits: string[];
  inserted: unknown[][];
  beginTransaction(): void;
  commitTransaction(name: string): void;
  insertElements(elements: unknown[]): void;
}

function panelFor(elements: unknown[]): { properties: ExportProperties; editor: FakeEditor } {
  const editor: FakeEditor = {
    commits: [],
    inserted: [],
    beginTransaction() {},
    commitTransaction(name: string) {
      this.commits.push(name);
    },
    insertElements(list: unknown[]) {
      this.inserted.push(list);
    },
  };
  const properties = new ExportProperties();
  const internals = properties as unknown as { _document: Document; _elements: unknown[] };
  internals._document = { getEditor: () => editor } as unknown as Document;
  internals._elements = elements;
  return { properties, editor };
}

const rows = (node: Rectangle): Row[] | null => node.getProperty("__export", true) as Row[] | null;

describe("ExportProperties", () => {
  it("is sticky and keeps the old class string", () => {
    const properties = new ExportProperties();
    expect(properties.isSticky()).toBe(true);
    expect(properties.toString()).toBe("[Object GExportProperties]");
  });

  it("adds 1x without suffix first, then the next free size with its suffix", () => {
    const rect = new Rectangle();
    const { properties, editor } = panelFor([rect]);
    for (let i = 0; i < 6; i++) properties._addExport();
    expect(rows(rect)).toEqual([
      { sz: "1x", sf: "", fm: "png" },
      { sz: "2x", sf: "@2x", fm: "png" },
      { sz: "3x", sf: "@3x", fm: "png" },
      { sz: "1.5x", sf: "@1,5x", fm: "png" },
      { sz: "0.5x", sf: "@0,5x", fm: "png" },
      // every default size taken: an empty size
      { sz: "", sf: "", fm: "png" },
    ]);
    expect(editor.commits).toHaveLength(6);
  });

  it("skips sizes already used, so a removed 1x comes back with a suffix", () => {
    const rect = new Rectangle();
    rect.setProperty("__export", [{ sz: "2x", sf: "@2x", fm: "png" }], true);
    const { properties } = panelFor([rect]);
    properties._addExport();
    expect(rows(rect)?.[1]).toEqual({ sz: "1x", sf: "@1x", fm: "png" });
  });

  it("updates and removes a row by index on every element, with fresh arrays", () => {
    const a = new Rectangle();
    const b = new Rectangle();
    const before: Row[] = [
      { sz: "1x", sf: "", fm: "png" },
      { sz: "2x", sf: "@2x", fm: "png" },
    ];
    a.setProperty("__export", before, true);
    b.setProperty("__export", [{ sz: "1x", sf: "", fm: "png" }], true);
    const { properties } = panelFor([a, b]);
    properties._updateExport(1, "fm", "svg");
    expect(rows(a)?.[1]).toEqual({ sz: "2x", sf: "@2x", fm: "svg" });
    // b has no second row: left alone
    expect(rows(b)).toEqual([{ sz: "1x", sf: "", fm: "png" }]);
    // the stored array and row were copied, not changed in place
    expect(before[1]?.fm).toBe("png");
    properties._removeExport(0);
    expect(rows(a)).toEqual([{ sz: "2x", sf: "@2x", fm: "svg" }]);
    expect(rows(b)).toEqual([]);
  });

  it("turns each non-slice element into a slice that takes over its rows", () => {
    const rect = new Rectangle();
    rect.setProperty("trf", new Transform(10, 0, 0, 5, 20, 30));
    const exportRows = [{ sz: "2x", sf: "", fm: "jpg" }];
    rect.setProperty("__export", exportRows, true);
    const slice = new Slice();
    const { properties, editor } = panelFor([rect, slice]);
    properties._createSlice();
    expect(editor.inserted).toHaveLength(1);
    const made = editor.inserted[0] as Slice[];
    expect(made).toHaveLength(1);
    expect(made[0]).toBeInstanceOf(Slice);
    expect(made[0]?.getProperty("__export", true)).toEqual(exportRows);
    expect(rect.getProperty("__export", true)).toBeFalsy();
    expect(editor.commits).toHaveLength(1);
  });

  it("shows nothing without a document", () => {
    expect(new ExportProperties().update(null)).toBe(false);
    expect(new Page()).toBeTruthy();
  });
});

// paint-dom's isInput checks element classes the fake DOM doesn't have.
const TAGS: Record<string, string> = {
  HTMLInputElement: "INPUT",
  HTMLSelectElement: "SELECT",
  HTMLTextAreaElement: "TEXTAREA",
  HTMLButtonElement: "BUTTON",
};
const g = globalThis as unknown as Record<string, unknown>;
const savedClasses: Record<string, unknown> = {};

describe("ExportProperties rows", () => {
  let dom: FakeDomHandle;
  beforeEach(() => {
    dom = installFakeDom();
    for (const [name, tag] of Object.entries(TAGS)) {
      savedClasses[name] = g[name];
      g[name] = {
        [Symbol.hasInstance]: (value: unknown) =>
          (value as { tagName?: string } | null)?.tagName === tag,
      };
    }
    setDesigner({ isTouchEnabled: () => false } as unknown as Designer);
  });
  afterEach(() => {
    resetGlobals();
    for (const name of Object.keys(TAGS)) g[name] = savedClasses[name];
    dom.uninstall();
  });

  it("leaves the size and suffix boxes empty for a row without sz and sf", () => {
    // Old: .val(p.sz) and .val(p.sf) with undefined write "" (a hand-written
    // __export list can miss either key).
    const rect = new Rectangle();
    rect.setProperty("__export", [{ fm: "svg" }], true);
    const { properties } = panelFor([rect]);
    const panel = dom.document.createElement("div");
    const internals = properties as unknown as {
      _panel: unknown;
      _toolbar: unknown;
      _exportButton: unknown;
    };
    internals._panel = panel;
    internals._toolbar = dom.document.createElement("div");
    internals._exportButton = dom.document.createElement("button");
    properties._updateProperties();
    const inputs = fake(panel).querySelectorAll("input");
    expect(inputs).toHaveLength(2);
    expect(inputs.map((input) => input.value)).toEqual(["", ""]);
  });
});
