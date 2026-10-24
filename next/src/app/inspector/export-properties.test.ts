import { describe, expect, it } from "vitest";
import { Transform } from "../../engine/math/transform.ts";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Slice } from "../../engine/scene/slice.ts";
import type { Document } from "../document/document.ts";
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
