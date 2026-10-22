/* eslint-disable @typescript-eslint/no-explicit-any -- in-page code drives the untyped engine through the G namespace */
// Export bookkeeping: which items an export produces, their file names,
// size specs, limits and the exporter/importer registries.
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import { inPageWithLib } from "./page-lib.ts";

/** An exportable as plain JSON. */
const describeList = inPageWithLib((_p, _a: unknown, L) => {
  return (list: any[]) =>
    list.map((e: any) => ({
      element: Array.isArray(e.element)
        ? e.element.map((n: any) => n.getNodeName())
        : e.element.getNodeName() + ":" + (e.element.getProperty("name") ?? ""),
      name: e.name,
      size: e.size,
      suffix: e.suffix,
      format: e.format,
      file: L.io.generateExportName(e),
    }));
});

const scenarios = defineScenarios<any>([
  {
    id: "import-export/meta/registries",
    covers: ["FMT-IMPORT-001", "FMT-IMPORT-002", "FMT-EXPORT-001", "FMT-WORKER-009"],
    kind: "json",
    inPage: inPageWithLib((_p, _a: unknown, L) => ({
      importers: L.io.importerNames(),
      exporters: L.io.exporterNames(),
      fileTypes: L.io.fileTypes(),
      openFileTypes: L.io.openFileTypes(),
      pdfWorkerSrc: L.io.pdfWorkerSrc(),
    })),
  },
  {
    id: "import-export/meta/canvas-limits",
    covers: ["FMT-IMPORT-017", "FMT-EXPORT-002", "FMT-EXPORT-036"],
    kind: "json",
    inPage: inPageWithLib(async (_p, _a: unknown, L) => {
      const built = await L.build("shapes");
      const max = L.io.maximumCanvasSize();
      const areas: Record<string, unknown> = {};
      for (const spec of ["1x", "2x", "300dpi", "512w", "100000w", "40000h"]) {
        areas[spec] = L.io.bitmapPaintArea(built.page, spec, 72);
      }
      return { max, areas };
    }),
  },
  {
    id: "import-export/meta/size-specs",
    covers: ["FMT-EXPORT-003", "FMT-EXPORT-024"],
    kind: "json",
    inPage: inPageWithLib((_p, _a: unknown, L) => {
      const specs = [
        "1x",
        "2x",
        "0.5x",
        "3x",
        "1.5X",
        " 2x ",
        "512w",
        "512h",
        "128x128",
        "100x400",
        "400x100",
        "300dpi",
        "72dpi",
        "150DPI",
        "",
        "abc",
        "-2x",
        "0x",
        "2",
        "2y",
        "1e2x",
      ];
      const out: Record<string, unknown> = {};
      for (const s of specs) {
        out[JSON.stringify(s)] = {
          noDpi: L.io.convertSizeToScale(320, 200, s),
          dpi72: L.io.convertSizeToScale(320, 200, s, 72),
          dpi144: L.io.convertSizeToScale(320, 200, s, 144),
        };
      }
      out.zeroSize = L.io.convertSizeToScale(0, 200, "2x", 72);
      return out;
    }),
  },
  {
    id: "import-export/meta/clamp-to-max",
    covers: ["FMT-EXPORT-002"],
    kind: "json",
    timeout: 180_000,
    inPage: inPageWithLib(async (_p, _a: unknown, L) => {
      const built = await L.build("shapes");
      const ex: any = L.dialogDefaults("png", built.page);
      ex.size = "40000w";
      const blob = await L.io.exportExportable(ex, 120_000);
      const bmp = await createImageBitmap(blob);
      return {
        type: blob.type,
        width: bmp.width,
        height: bmp.height,
        max: L.io.maximumCanvasSize(),
      };
    }),
  },
  {
    id: "import-export/meta/unknown-format",
    covers: ["FMT-EXPORT-005"],
    kind: "json",
    inPage: inPageWithLib(async (_p, _a: unknown, L) => {
      const built = await L.build("shapes");
      const out: Record<string, unknown> = {};
      for (const format of ["gif", "webp", "tiff", "bmp", "eps", "PNG"]) {
        const ex: any = L.dialogDefaults(format, built.page);
        try {
          const blob = await L.io.exportExportable(ex, 3000);
          out[format] = { ok: true, type: blob && blob.type };
        } catch (e) {
          out[format] = { error: String((e as Error).message) };
        }
      }
      return out;
    }),
  },
  {
    id: "import-export/meta/svg-unsupported-features",
    covers: ["FMT-EXPORT-012", "FMT-EXPORT-011"],
    kind: "json",
    inPage: inPageWithLib(async (_p, _a: unknown, L) => {
      const built = await L.build("effects");
      const { G } = L;
      const names = ["page", "shadow", "blurred", "inner", "sepia", "angular"];
      const describe = (list: any[]) =>
        list.map((x: any) => ({
          name: x.name,
          features: x.features.map((f: any) =>
            f instanceof G.GNode
              ? "effect:" + f.getNodeName()
              : "pattern:" + G.GPattern.serialize(f).slice(0, 2),
          ),
        }));
      const out: Record<string, unknown> = {};
      for (const n of names) out[n] = describe(L.io.svgUnsupportedFeatures(built[n]));
      // a texture fill and a background-blur effect on a fresh element
      const tex = L.shape("rectangle", 0, 0, 10, 10, {
        fill: 'T#{"u":null,"r":"repeat","s":"length","w":10,"h":10,"p":"auto","m":false,"a":0,"sm":"tile","ts":1}',
      });
      L.insert([tex]);
      out.texture = describe(L.io.svgUnsupportedFeatures(tex));
      return out;
    }),
  },
  {
    id: "import-export/meta/pdf-is-supported",
    covers: ["FMT-EXPORT-019"],
    kind: "json",
    inPage: inPageWithLib(async (_p, _a: unknown, L) => {
      const built = await L.build("effects");
      return {
        page72: L.io.pdfIsSupported(built.page, true, "72dpi"),
        page300: L.io.pdfIsSupported(built.page, true, "300dpi"),
        pageNoEffects: L.io.pdfIsSupported(built.page, false, "300dpi"),
        huge: L.io.pdfIsSupported(built.page, true, "20000dpi"),
        hugeNoEffects: L.io.pdfIsSupported(built.page, false, "20000dpi"),
        array: L.io.pdfIsSupported([built.page], true, "72dpi"),
      };
    }),
  },
  {
    id: "import-export/meta/exportables-canvas",
    covers: ["FMT-EXPORT-046", "FMT-EXPORT-047", "FMT-EXPORT-023"],
    kind: "json",
    args: { describe: describeList.toString() },
    inPage: inPageWithLib(async (p, a: { describe: string }, L) => {
      const describe = (0, eval)(`(${a.describe})`)(p, a);
      await L.build("multipage");
      const defaults = { name: "Doc Title", size: "1x", suffix: "", format: "png" };
      const scene = L.app.scene();
      // a single visible page takes the document title as its name
      const one = L.io.generateExportables(scene.getActivePage(), defaults, false);
      return {
        scene: describe(L.io.generateExportables(scene, defaults, false)),
        scenePdf: describe(L.io.generateExportables(scene, { ...defaults, format: "pdf" }, false)),
        singlePage: describe(one),
      };
    }),
  },
  {
    id: "import-export/meta/exportables-assets",
    covers: ["FMT-EXPORT-042", "FMT-EXPORT-046", "FMT-EXPORT-047", "FMT-EXPORT-044"],
    kind: "json",
    args: { describe: describeList.toString() },
    inPage: inPageWithLib(async (p, a: { describe: string }, L) => {
      const describe = (0, eval)(`(${a.describe})`)(p, a);
      const { G } = L;
      const page = L.app.scene().getActivePage();
      L.setupPage(page, 400, 300, "C#[255,255,255]", "Assets Page");
      const rows = (...r: [string, string, string][]) => r.map(([sz, sf, fm]) => ({ sz, sf, fm }));
      const a1 = L.shape("rectangle", 10, 10, 50, 50, {
        fill: "C#[255,0,0]",
        name: "Icon",
        exports: rows(
          ["1x", "", "png"],
          ["2x", "@2x", "png"],
          ["1x", "", "svg"],
          ["1x", "", "pdf"],
        ),
      });
      const a2 = L.shape("ellipse", 80, 10, 50, 50, {
        fill: "C#[0,255,0]",
        exports: rows(["1x", "", "png"], ["0.5x", "@0,5x", "jpg"]),
      });
      const a3 = L.shape("ellipse", 140, 10, 50, 50, {
        fill: "C#[0,0,255]",
        exports: rows(["1x", "", "png"], ["1x", "", ""]),
      });
      const dup = L.shape("rectangle", 200, 10, 30, 30, {
        fill: "C#[9,9,9]",
        name: "Icon",
        exports: rows(["1x", "", "png"]),
      });
      const odd = L.shape("rectangle", 240, 10, 30, 30, {
        fill: "C#[9,9,9]",
        name: 'a<b>:c"d|e?f*g\\h',
        exports: rows(["1x", "", "png"]),
      });
      const group = new G.GGroup();
      group.setProperty("name", "Folder/Sub/Leaf");
      group.setProperty("__export", rows(["2x", "_big", "png"]), true);
      const inner = L.shape("rectangle", 20, 120, 40, 40, {
        fill: "C#[100,100,0]",
        name: "Inner",
        exports: rows(["1x", "", "svg"]),
      });
      group.appendChild(inner);
      const slice = new G.GSlice();
      slice.setProperty("trf", new G.GTransform(50, 0, 0, 25, 300, 200));
      slice.setProperty("__export", rows(["1x", "", "png"]), true);
      L.insert([a1, a2, a3, dup, odd, group, slice]);
      const scene = L.app.scene();
      const used: { name: string; format: string }[] = [];
      const assets = L.io.generateExportables(scene, null, true);
      return {
        assets: describe(assets),
        namesWithDuplicates: assets.map((e: any) => L.io.generateExportName(e, null, used)),
        notRecursive: describe(L.io.generateExportables(scene, null, false)),
        selectionDefaults: describe(
          L.io.generateExportables([a1, a2], { size: "2x", suffix: "", format: "jpg" }, false),
        ),
        selectionSingle: describe(
          L.io.generateExportables(
            [a2],
            { name: "Given", size: "1x", suffix: "", format: "png" },
            false,
          ),
        ),
      };
    }),
  },
  {
    id: "import-export/meta/export-names",
    covers: ["FMT-EXPORT-047", "ADD-EXPORT-001"],
    kind: "json",
    inPage: inPageWithLib((_p, _a: unknown, L) => {
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
        png: L.io.generateExportName({ name: n, format: "png" }),
        suffixed: L.io.generateExportName({ name: n, suffix: "@2x", format: "jpg" }),
        override: L.io.generateExportName({ name: "ignored", format: "svg" }, n),
      }));
      const used: { name: string; format: string }[] = [];
      const seq = [
        { name: "A", format: "png" },
        { name: "A", format: "png" },
        { name: "A", format: "svg" },
        { name: "A", format: "png" },
        { name: "A", suffix: "@2x", format: "png" },
        { name: "A@2x", format: "png" },
      ].map((e) => L.io.generateExportName(e, null, used));
      return { one, seq, used };
    }),
  },
]);

paritySuite("import-export export bookkeeping", scenarios, { newApp: false });
