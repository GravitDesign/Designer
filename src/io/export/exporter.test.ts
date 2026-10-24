import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Transform } from "../../engine/math/transform.ts";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import type { Element } from "../../engine/scene/element.ts";
import { Group } from "../../engine/scene/group.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Slice } from "../../engine/scene/slice.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { FS, type ZipFileEntry } from "../zip/zip-fs.ts";
import {
  Exporter,
  ZipDirectory,
  type ExportDirectory,
  type ExportFile,
  type ExportFileType,
  type ExportStorage,
  type Exportable,
} from "./exporter.ts";
import { exporters } from "./index.ts";
import { sanitizeFilename } from "./sanitize-filename.ts";

// The parity scenarios in export-meta.spec.ts drive these through the
// editor, which the new app doesn't have yet; the same calls on engine
// nodes must give the outputs recorded from the old app.
const EXPECTED = path.join(import.meta.dirname, "../../../parity/expected/import-export/meta");
const expected = (name: string): Record<string, unknown> =>
  JSON.parse(fs.readFileSync(path.join(EXPECTED, name + ".json"), "utf8"));

type Row = [string, string, string];

function shape(
  type: "rectangle" | "ellipse",
  x: number,
  y: number,
  w: number,
  h: number,
  name?: string,
  rows?: Row[],
): Element {
  const element = type === "rectangle" ? new Rectangle() : new Ellipse();
  element.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  if (name) element.setProperty("name", name);
  if (rows)
    element.setProperty(
      "__export",
      rows.map(([sz, sf, fm]) => ({ sz, sf, fm })),
      true,
    );
  return element;
}

/** The scenario's describeList. */
function describeList(list: Exportable[]): unknown[] {
  return list.map((e) => ({
    element: Array.isArray(e.element)
      ? e.element.map((n) => n.getNodeName())
      : e.element.getNodeName() +
        ":" +
        ((e.element as unknown as { getProperty(name: string): unknown }).getProperty("name") ??
          ""),
    name: e.name,
    size: e.size,
    suffix: e.suffix,
    format: e.format,
    file: Exporter.generateExportName(e),
  }));
}

function insert(scene: Scene, elements: Node[]): void {
  const page = scene.getActivePage() as Page;
  // GEditor.insertElements puts new elements into the active layer, or the page.
  const target = (scene.getActiveLayer?.() as Node | null) || page;
  for (const element of elements) (target as unknown as Group).appendChild(element);
}

describe("Exporter.generateExportName", () => {
  it("matches import-export/meta/export-names", () => {
    const names = [
      "Plain",
      "with space ",
      "trailing.dots...",
      "...",
      ".",
      "con",
      "CON.txt",
      "lpt9",
      "com0.png",
      'a"b*c/d:e<f>g?h\\i|j',
      "ctl\u0001\u001f\u0085x",
      "Ümlaut ä ß 日本",
      "x".repeat(300),
      "",
    ];
    const one = names.map((n) => ({
      name: n,
      png: Exporter.generateExportName({ name: n, format: "png" }),
      suffixed: Exporter.generateExportName({ name: n, suffix: "@2x", format: "jpg" }),
      override: Exporter.generateExportName({ name: "ignored", format: "svg" }, n),
    }));
    const used: { name: string; format: string }[] = [];
    const seq = [
      { name: "A", format: "png" },
      { name: "A", format: "png" },
      { name: "A", format: "svg" },
      { name: "A", format: "png" },
      { name: "A", suffix: "@2x", format: "png" },
      { name: "A@2x", format: "png" },
    ].map((e) => Exporter.generateExportName(e, null, used));
    expect({ one, seq, used }).toEqual(expected("export-names"));
  });

  it("sanitizes like GUtil.sanitizeFilename", () => {
    expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe("a_b_c_d_e_f_g_h_i_j");
    expect(sanitizeFilename("nul.tar.gz")).toBe("_");
    expect(sanitizeFilename("name. ", "-")).toBe("name-");
    expect(sanitizeFilename("y".repeat(260))).toHaveLength(255);
  });
});

describe("Exporter.generateExportables", () => {
  it("matches import-export/meta/exportables-assets", () => {
    const scene = new Scene(new Workspace());
    const page = scene.getActivePage() as Page;
    page.setProperties(["w", "h", "name"], [400, 300, "Assets Page"]);
    const a1 = shape("rectangle", 10, 10, 50, 50, "Icon", [
      ["1x", "", "png"],
      ["2x", "@2x", "png"],
      ["1x", "", "svg"],
      ["1x", "", "pdf"],
    ]);
    const a2 = shape("ellipse", 80, 10, 50, 50, undefined, [
      ["1x", "", "png"],
      ["0.5x", "@0,5x", "jpg"],
    ]);
    const a3 = shape("ellipse", 140, 10, 50, 50, undefined, [
      ["1x", "", "png"],
      ["1x", "", ""],
    ]);
    const dup = shape("rectangle", 200, 10, 30, 30, "Icon", [["1x", "", "png"]]);
    const odd = shape("rectangle", 240, 10, 30, 30, 'a<b>:c"d|e?f*g\\h', [["1x", "", "png"]]);
    const group = new Group();
    group.setProperty("name", "Folder/Sub/Leaf");
    group.setProperty("__export", [{ sz: "2x", sf: "_big", fm: "png" }], true);
    group.appendChild(shape("rectangle", 20, 120, 40, 40, "Inner", [["1x", "", "svg"]]));
    const slice = new Slice();
    slice.setProperty("trf", new Transform(50, 0, 0, 25, 300, 200));
    slice.setProperty("__export", [{ sz: "1x", sf: "", fm: "png" }], true);
    insert(scene, [a1, a2, a3, dup, odd, group, slice]);
    const used: { name: string; format: string }[] = [];
    const assets = Exporter.generateExportables(scene, null, true);
    const out = {
      assets: describeList(assets),
      namesWithDuplicates: assets.map((e) => Exporter.generateExportName(e, null, used)),
      notRecursive: describeList(Exporter.generateExportables(scene, null, false)),
      selectionDefaults: describeList(
        Exporter.generateExportables([a1, a2], { size: "2x", suffix: "", format: "jpg" }, false),
      ),
      selectionSingle: describeList(
        Exporter.generateExportables(
          [a2],
          { name: "Given", size: "1x", suffix: "", format: "png" },
          false,
        ),
      ),
    };
    // BUG-091: the file names drop the "<" and ">" escaping of layer
    // names; the .fixed recording is the old one with that changed.
    expect(out).toEqual(expected("exportables-assets.fixed"));
    expect(out.namesWithDuplicates).toContain("a_b__c_d_e_f_g_h.png");
  });

  it("matches import-export/meta/exportables-canvas", () => {
    const scene = new Scene(new Workspace());
    const cover = scene.getActivePage() as Page;
    cover.setProperties(["w", "h", "name"], [200, 100, "Cover"]);
    insert(scene, [shape("rectangle", 20, 20, 160, 60, "Red")]);
    const second = new Page();
    second.setProperties(["w", "h", "name"], [150, 150, "Second"]);
    scene.appendChild(second);
    second.appendChild(shape("ellipse", 25, 25, 100, 100, "Green"));
    const hidden = new Page();
    hidden.setProperties(["w", "h", "name"], [100, 100, "Hidden"]);
    hidden.setProperty("vis", false);
    scene.appendChild(hidden);
    hidden.appendChild(shape("rectangle", 10, 10, 50, 50, "White"));
    const defaults = { name: "Doc Title", size: "1x", suffix: "", format: "png" };
    const out = {
      scene: describeList(Exporter.generateExportables(scene, defaults, false)),
      scenePdf: describeList(
        Exporter.generateExportables(scene, { ...defaults, format: "pdf" }, false),
      ),
      singlePage: describeList(Exporter.generateExportables(cover, defaults, false)),
    };
    expect(out).toEqual(expected("exportables-canvas"));
  });
});

describe("Exporter.exportExportable", () => {
  it('throws "Unknown format." for formats it has no exporter for', () => {
    const scene = new Scene(new Workspace());
    for (const format of ["gif", "webp", "tiff", "bmp", "eps", "PNG"]) {
      expect(() =>
        Exporter.exportExportable({ element: scene.getActivePage() as Page, format }, () => {}),
      ).toThrow("Unknown format.");
    }
  });

  it("reports an SVG export error to the messenger (BUG-086)", () => {
    const real = exporters.SVGExport;
    exporters.SVGExport = {
      export(_element: unknown, _options: unknown, callback: (error: unknown) => void) {
        callback(new Error("paint failed"));
      },
    } as unknown as typeof real;
    try {
      const scene = new Scene(new Workspace());
      const errors: unknown[] = [];
      const blobs: unknown[] = [];
      Exporter.exportExportable(
        { element: scene.getActivePage() as Page, format: "svg" },
        (blob) => blobs.push(blob),
        null,
        { error: (error: unknown) => errors.push(error) },
      );
      expect(blobs).toEqual([]);
      expect(String(errors[0])).toContain("paint failed");
    } finally {
      exporters.SVGExport = real;
    }
  });
});

describe("ZipDirectory", () => {
  it("adds files and subdirectories to one archive", async () => {
    const root = new ZipDirectory();
    const sub = await root.addDirectory("Folder");
    const file = await sub.addFile("a.png");
    let wrote = false;
    file.write(new Uint8Array([1, 2, 3]), () => {
      wrote = true;
    });
    expect(wrote).toBe(true);
    const entries = (root._zipRoot as NonNullable<typeof root._zipRoot>).entries;
    expect(entries.map((e) => e && e.getFullname())).toEqual([undefined, "Folder", "Folder/a.png"]);
    await expect(root.addDirectory("Folder")).rejects.toBe("Entry filename already exists.");
  });
});

/** Node has Blob but no FileReader; the exporter reads Blobs through one. */
class NodeFileReader {
  result: unknown = null;
  onload: ((event: { target: NodeFileReader }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;

  readAsArrayBuffer(blob: Blob): void {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onload?.({ target: this });
    }, this.onerror);
  }

  readAsText(blob: Blob): void {
    blob.text().then((text) => {
      this.result = text;
      this.onload?.({ target: this });
    }, this.onerror);
  }
}

const settle = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) await new Promise((resolve) => setTimeout(resolve, 1));
};

/** What the stubbed exporters were asked for. */
let exported: { format: string; element: unknown }[] = [];
const realBitmapExport = exporters.BitmapExport;
const realPDFExport = exporters.PDFExport;

beforeEach(() => {
  vi.stubGlobal("FileReader", NodeFileReader);
  exported = [];
  // The bitmap exporter gives a bitmap whose blob is the element's name.
  exporters.BitmapExport = {
    export(element: unknown) {
      exported.push({ format: "bitmap", element });
      return {
        toImageBlob(type: string, callback: (blob: Blob) => void) {
          const name = (element as { getProperty(name: string): unknown }).getProperty("name");
          callback(new Blob([String(name)], { type }));
        },
      };
    },
  } as unknown as typeof realBitmapExport;
  exporters.PDFExport = {
    export(element, _options, callback) {
      exported.push({ format: "pdf", element });
      callback(null, new Uint8Array([37, 80, 68, 70]));
      return { isAbort: () => false, abort: () => {} };
    },
    isSupported: () => true,
  };
});

afterEach(() => {
  exporters.BitmapExport = realBitmapExport;
  exporters.PDFExport = realPDFExport;
  vi.unstubAllGlobals();
});

/** An item named `name` whose element (and so its file content) is named `content`. */
function item(name: string, format = "png", content = name): Exportable {
  return {
    element: shape("rectangle", 0, 0, 10, 10, content),
    name,
    format,
    size: "1x",
    suffix: "",
  };
}

/** The archive's files with their contents. */
async function zipContents(data: Blob | Uint8Array | undefined): Promise<Record<string, string>> {
  const blob = data instanceof Blob ? data : new Blob([data as Uint8Array<ArrayBuffer>]);
  const fs = new FS();
  await new Promise<void>((resolve, reject) => fs.importBlob(blob, resolve, reject));
  const out: Record<string, string> = {};
  for (const entry of fs.entries) {
    if (!entry || entry.directory) continue;
    out[entry.getFullname()] = await new Promise<string>((resolve) =>
      (entry as ZipFileEntry).getText(resolve, null, undefined),
    );
  }
  return out;
}

function zipOf(directory: ZipDirectory): Promise<Blob> {
  return new Promise((resolve) => directory.exportBlob(resolve));
}

/** A directory that records the files written into it (subdirectories write into it too). */
function recordingDirectory(
  written: string[],
  fail: { files?: string[]; directories?: boolean } = {},
): ExportDirectory {
  const directory: ExportDirectory = {
    addDirectory: () =>
      fail.directories ? Promise.reject(new Error("no directories")) : Promise.resolve(directory),
    addFile: (name) =>
      fail.files?.includes(name)
        ? Promise.reject(new Error("disk full"))
        : Promise.resolve({
            write(_data: Uint8Array, onDone?: () => unknown) {
              written.push(name);
              return onDone ? onDone() : undefined;
            },
          }),
  };
  return directory;
}

/** A storage that records what the exporter saves through it. */
function storage(options: {
  prompt?: boolean;
  download?: boolean;
  directory?: "fallback" | ExportDirectory;
}) {
  const calls: { kind: string; name: string; types?: unknown; data: Uint8Array }[] = [];
  const file = (kind: string, name: string, types?: unknown): ExportFile => ({
    write(data: Uint8Array, onDone?: () => unknown) {
      calls.push({ kind, name, types, data });
      return onDone ? onDone() : undefined;
    },
  });
  const target: ExportStorage = {
    canPromptSave: () => options.prompt ?? false,
    savePrompt(name, types, callback) {
      callback(file("prompt", name, types));
    },
    canDownload: () => options.download ?? false,
    download(name, callback) {
      callback(file("download", name));
    },
    canChooseDirectory: () => options.directory !== undefined,
    chooseDirectory(callback, _owner, fallback) {
      if (options.directory === "fallback") fallback();
      else if (options.directory) callback(options.directory);
    },
  };
  return { target, calls };
}

describe("Exporter.exportToDirectory", () => {
  it('makes subdirectories for "/" (reused case-insensitively) and numbers names across them', async () => {
    const zip = new ZipDirectory();
    let done = 0;
    await Exporter.exportToDirectory(
      [item("Icons/A"), item("icons/B"), item("A"), item(" A "), item("x/ /Deep/C")],
      zip,
      () => done++,
    );
    await settle();
    expect(done).toBe(1);
    expect(await zipContents(await zipOf(zip))).toEqual({
      "Icons/A.png": "Icons/A",
      "Icons/B.png": "icons/B",
      "A(2).png": "A",
      "A(3).png": " A ",
      "x/Deep/C.png": "x/ /Deep/C",
    });
  });

  it("never calls onDone when an item has no name (old behaviour)", async () => {
    const zip = new ZipDirectory();
    let done = 0;
    await Exporter.exportToDirectory([item("A"), { ...item("B"), name: "" }], zip, () => done++);
    await settle();
    expect(exported).toHaveLength(1);
    expect(Object.keys(await zipContents(await zipOf(zip)))).toEqual(["A.png"]);
    expect(done).toBe(0);
  });

  it("drops a file whose final name is taken and still finishes (old behaviour)", async () => {
    // "a(2)", "a", "a" give "a(2).png", "a.png", "a(2).png": zip-fs refuses
    // the second "a(2).png" and the exporter counts it as written.
    const zip = new ZipDirectory();
    let done = 0;
    await Exporter.exportToDirectory(
      [item("a(2)", "png", "first"), item("a", "png", "second"), item("a", "png", "third")],
      zip,
      () => done++,
    );
    await settle();
    expect(done).toBe(1);
    expect(await zipContents(await zipOf(zip))).toEqual({ "a(2).png": "first", "a.png": "second" });
  });

  it("counts a file that can't be added as written and writes into the parent when a directory fails", async () => {
    const written: string[] = [];
    let done = 0;
    await Exporter.exportToDirectory(
      [item("Good"), item("Bad"), item("Sub/Inner")],
      recordingDirectory(written, { files: ["Bad.png"], directories: true }),
      () => done++,
    );
    await settle();
    expect(written.sort()).toEqual(["Good.png", "Inner.png"]);
    expect(done).toBe(1);
  });
});

describe("Exporter.export", () => {
  it("merges several PDF items into one PDF named after the document and downloads it", async () => {
    const { target, calls } = storage({ prompt: true, download: true });
    let done = 0;
    const items = [item("P1", "pdf"), item("P2", "pdf"), item("P3", "pdf")];
    Exporter.export(items, target, "Doc", () => done++);
    await settle();
    expect(exported).toHaveLength(1);
    expect(exported[0]?.element).toEqual(items.map((i) => i.element));
    // A PDF is downloaded without a prompt when the storage can download.
    expect(calls.map((c) => [c.kind, c.name])).toEqual([["download", "Doc.pdf"]]);
    expect(Array.from(calls[0]?.data ?? [])).toEqual([37, 80, 68, 70]);
    expect(done).toBe(1);
  });

  it("keeps PDF items apart in assets mode (into a ZIP)", async () => {
    const { target, calls } = storage({ prompt: true });
    let done = 0;
    Exporter.export(
      [item("P1", "pdf"), item("P2", "pdf")],
      target,
      "Doc",
      () => done++,
      null,
      true,
    );
    await settle();
    expect(exported).toHaveLength(2);
    expect(calls.map((c) => [c.kind, c.name, c.types])).toEqual([
      ["prompt", "Doc.zip", [{ ext: "zip", mime: "application/zip" }]],
    ]);
    expect(Object.keys(await zipContents(calls[0]?.data))).toEqual(["P1.pdf", "P2.pdf"]);
    expect(done).toBe(1);
  });

  it("prompts for a single file with the format's file type", async () => {
    const { target, calls } = storage({ prompt: true, download: true });
    let done = 0;
    Exporter.export([{ ...item("Logo", "jpg"), suffix: "@2x" }], target, "Doc", () => done++);
    await settle();
    expect(calls.map((c) => [c.kind, c.name, c.types])).toEqual([
      ["prompt", "Logo@2x.jpg", [{ ext: "jpg", mime: "image/jpeg" }]],
    ]);
    expect(done).toBe(1);
  });

  it("downloads a single PNG when the storage can't prompt", async () => {
    const { target, calls } = storage({ download: true });
    let done = 0;
    Exporter.export([item("Logo")], target, "Doc", () => done++);
    await settle();
    expect(calls.map((c) => [c.kind, c.name, new TextDecoder().decode(c.data)])).toEqual([
      ["download", "Logo.png", "Logo"],
    ]);
    expect(done).toBe(1);
  });

  it("writes several items into a ZIP when the storage can't choose a directory", async () => {
    const { target, calls } = storage({ prompt: true, download: true });
    let done = 0;
    Exporter.export([item("Icons/A"), item("icons/B"), item("A")], target, "Doc", () => done++);
    await settle();
    expect(calls.map((c) => [c.kind, c.name, c.types])).toEqual([
      ["prompt", "Doc.zip", [{ ext: "zip", mime: "application/zip" }]],
    ]);
    expect(await zipContents(calls[0]?.data)).toEqual({
      "Icons/A.png": "Icons/A",
      "Icons/B.png": "icons/B",
      "A(2).png": "A",
    });
    expect(done).toBe(1);
  });

  it("falls back to a ZIP saved without a prompt when no directory is chosen (old behaviour)", async () => {
    const { target, calls } = storage({ prompt: true, download: true, directory: "fallback" });
    let done = 0;
    Exporter.export([item("A", "jpg"), item("B", "jpg")], target, "Doc", () => done++);
    await settle();
    expect(calls.map((c) => [c.kind, c.name])).toEqual([["download", "Doc.zip"]]);
    expect(Object.keys(await zipContents(calls[0]?.data))).toEqual(["A.jpg", "B.jpg"]);
    expect(done).toBe(1);
  });

  it("saves nothing from the fallback ZIP when the storage can't download (old behaviour)", async () => {
    // The fallback asks not to prompt, so a storage that can only prompt
    // gets no file and onDone never runs.
    const { target, calls } = storage({ prompt: true, directory: "fallback" });
    let done = 0;
    Exporter.export([item("A", "jpg"), item("B", "jpg")], target, "Doc", () => done++);
    await settle();
    expect(exported).toHaveLength(2);
    expect(calls).toEqual([]);
    expect(done).toBe(0);
  });

  it("writes into a chosen directory", async () => {
    const written: string[] = [];
    const { target, calls } = storage({
      prompt: true,
      download: true,
      directory: recordingDirectory(written),
    });
    let done = 0;
    Exporter.export([item("A"), item("Sub/B")], target, "Doc", () => done++);
    await settle();
    expect(calls).toEqual([]);
    expect(written.sort()).toEqual(["A.png", "B.png"]);
    expect(done).toBe(1);
  });

  it("looks the first item's format up in GDocument.FileTypes", () => {
    const types: readonly ExportFileType[] = Exporter.getHost().getFileTypes();
    expect(types).toEqual([
      { ext: "gvdesign", mime: "application/gravit+design" },
      { ext: "png", mime: "image/png" },
      { ext: "heic", mime: "image/heic" },
      { ext: "jpg", mime: "image/jpeg" },
      { ext: "jpeg", mime: "image/jpeg" },
      { ext: "svg", mime: "image/svg+xml" },
      { ext: "pdf", mime: "application/pdf" },
      { ext: "eps", mime: "application/postscript" },
    ]);
  });
});
