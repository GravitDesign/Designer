import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
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
import { Exporter, ZipDirectory, type Exportable } from "./exporter.ts";
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
    expect(out).toEqual(expected("exportables-assets"));
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
