/* eslint-disable @typescript-eslint/no-explicit-any -- in-page code drives the untyped engine through the G namespace */
// GSVGExport on its own, in the browser: scenes built with G only (no
// editor, no export dialog) go straight into the exporter through
// app.svgExport (contract.ts), and the SVG text is compared. Three sets:
// - cases/<name>: every case of src/io/export/svg/testing/svg-export-cases.ts,
//   the cases the Node unit test runs with a fake canvas, here with the
//   browser's canvas, fonts and DOM;
// - engine/<id>: the SVG cases of the export matrix
//   (import-export/export-cases.ts) on the same test documents, built
//   without the editor; the options are the ones GExporter.exportExportable
//   derives from the dialog's settings;
// - corpus/<file>: every visible page of every corpus document, loaded with
//   GNode.deserializeAsync, exported with the dialog's defaults.
// Raster data (fallback images, embedded pictures) is compared by hash.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import ts from "typescript";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { NEXT_ROOT } from "../../support/env.ts";
import { EXPORT_CASES, type ExportCase } from "../import-export/export-cases.ts";
import { normalizeSvg } from "../import-export/normalize-ids.ts";
import { SVG_EXPORT_CASES } from "../../../src/io/export/svg/testing/svg-export-cases.ts";
import { EXTRA_CASES, runExtraCase, type ExtraArgs } from "./extra-cases.ts";
import { inPageWithSvgLib } from "./lib.ts";

const CASES_FILE = path.join(
  NEXT_ROOT,
  "src",
  "io",
  "export",
  "svg",
  "testing",
  "svg-export-cases.ts",
);
const CORPUS = path.join(NEXT_ROOT, "parity", "corpus", "files");
const RASTER = path.join(NEXT_ROOT, "parity", "fixtures", "import", "raster");

/** Data URLs replaced by their media type, size and hash; the rest as it is. */
function hashDataUrls(text: string): string {
  return text.replace(
    /data:([a-z]+\/[a-z0-9.+-]+)(;base64)?,([A-Za-z0-9+/=%._-]*)/g,
    (_m, type, b64, data) => {
      const hash = crypto.createHash("sha256").update(data).digest("hex");
      return `data:${type}${b64 ?? ""},<${data.length} chars sha256 ${hash}>`;
    },
  );
}

/**
 * The short random ids normalize-ids.ts leaves alone: source-in patterns
 * ("_pattern_" + 3 characters) and image mask filters ("_mask_filter_" +
 * 8), renamed in order of appearance.
 */
function renameShortIds(text: string): string {
  const names = new Map<string, string>();
  return text.replace(
    /_(pattern|mask_filter)_([A-Za-z0-9]{3}|[A-Za-z0-9]{8})(?![A-Za-z0-9])/g,
    (match: string, kind: string, token: string) => {
      if ((kind === "pattern") !== (token.length === 3)) return match;
      const key = kind + ":" + token;
      if (!names.has(key)) names.set(key, `_${kind}_~${names.size + 1}`);
      return names.get(key) as string;
    },
  );
}

/** An exported SVG made comparable (normalize-ids.ts), raster data hashed. */
function comparable(svg: string): string {
  return renameShortIds(hashDataUrls(normalizeSvg(svg)));
}

interface Outcome {
  called: boolean;
  error: string | null;
  svg: string | null;
}

function describeOutcome(out: Outcome): string {
  const head = `called: ${out.called}\nerror: ${out.error}\n`;
  return head + (out.svg === null ? "svg: null\n" : comparable(out.svg) + "\n");
}

// ---- cases/<name> ----------------------------------------------------

/** svg-export-cases.ts as plain JavaScript for the page. */
function casesSource(): string {
  const js = ts.transpileModule(fs.readFileSync(CASES_FILE, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return js.replace(/^export /gm, "");
}

/**
 * Runs one case in the page. The exporter handed to the case records every
 * SVG it writes, so raster data, which the case's own normalizer replaces
 * by its media type, is compared too (by hash, in Node).
 */
const runCaseInPage = inPageWithSvgLib(async (_p, a: { name: string }, L) => {
  const w = window as any;
  const workspace = await L.newWorkspace();
  const exporter = L.io.exporter();
  const written: string[] = [];
  const recording = Object.create(exporter, {
    export: {
      value: (node: any, options: any, done: (e: unknown, svg?: string) => void) =>
        exporter.export(node, options, (e: unknown, svg?: string) => {
          if (typeof svg === "string") written.push(svg);
          done(e, svg);
        }),
    },
  });
  const lib = {
    G: L.G,
    SVGExport: recording,
    ExportCompat: L.io.exportCompat(),
    newScene: () => L.newScene(workspace),
    decompress: (t: string) => L.G.GUtil.decompressString(t),
  };
  const result = await L.io.withTextMeter(workspace.getFontManager(), async () => {
    try {
      return JSON.parse(JSON.stringify(w.__svgExportCases[a.name](lib)));
    } catch (e) {
      return { throws: String(e) };
    }
  });
  return { result, written };
});

function caseScenario(name: string, source: string): Scenario<{ name: string }> {
  return {
    id: `io-export-svg/cases/${name}`,
    covers: ["FMT-EXPORT-005", "FMT-EXPORT-006", "FMT-EXPORT-007"],
    kind: "json",
    args: { name },
    driver: async ({ page }, a) => {
      await page.evaluate(`(() => { ${source}; window.__svgExportCases = SVG_EXPORT_CASES; })()`);
      const out = (await page.evaluate(
        `(${runCaseInPage.toString()})(window.__parity, ${JSON.stringify(a)})`,
      )) as { result: unknown; written: string[] };
      // The case's own output is already normalized; the raster data it
      // dropped is kept here as hashes, in the order it was written.
      const rasters = out.written.flatMap((svg) =>
        [...comparable(svg).matchAll(/data:[^,]*,<[^>]*>/g)].map((m) => m[0]),
      );
      return { result: out.result, rasters };
    },
  };
}

// ---- engine/<id> ------------------------------------------------------

interface EngineArgs {
  c: ExportCase;
  png: string;
  jpg: string;
}

const runEngineCase = inPageWithSvgLib(async (_p, a: EngineArgs, L) => {
  const built = await L.build(a.c.doc, { png: a.png, jpg: a.jpg });
  if (a.c.pageProps) {
    const names = Object.keys(a.c.pageProps);
    built.page.setProperties(
      names,
      names.map((n) => (a.c.pageProps as any)[n]),
    );
  }
  const element =
    a.c.target === "page"
      ? built.page
      : (built[a.c.target.toLowerCase()] ?? built.scene.querySingle(`[name="${a.c.target}"]`));
  if (!element) throw new Error("no target " + a.c.target);
  const ex: Record<string, any> = L.dialogDefaults(element);
  const bg = a.c.background ?? "page";
  if (bg === "page") {
    ex.configuration.sceneBackground = true;
  } else if (bg === "none") {
    ex.configuration.sceneBackground = false;
    ex.backgroundColor = null;
  } else {
    ex.configuration.sceneBackground = false;
    ex.backgroundColor = L.pat(bg.color);
    ex.backgroundOpacity = bg.opacity;
  }
  for (const [k, v] of Object.entries(a.c.settings ?? {})) {
    if (k === "configuration") Object.assign(ex.configuration, v);
    else ex[k] = v;
  }
  return L.exportNode(built.scene, element, L.exporterOptions(ex));
});

function engineScenario(c: ExportCase, images: { png: string; jpg: string }): Scenario<EngineArgs> {
  return {
    id: `io-export-svg/engine/${c.id.replace(/^svg\//, "")}`,
    covers: c.covers,
    kind: "text",
    extension: ".svg.txt",
    args: { c, ...images },
    driver: async ({ page }, a) =>
      describeOutcome(
        (await page.evaluate(
          `(${runEngineCase.toString()})(window.__parity, ${JSON.stringify(a)})`,
        )) as Outcome,
      ),
  };
}

// ---- corpus/<file> ----------------------------------------------------

const runCorpusFile = inPageWithSvgLib(async (_p, a: { json: string }, L) => {
  const { G } = L;
  const workspace = await L.newWorkspace();
  const fm = workspace.getFontManager();
  return L.io.withTextMeter(fm, async () => {
    const scene = await L.loadScene(a.json, workspace);
    await L.settle(scene);
    const pages = scene.getChildren().filter((n: any) => n instanceof G.GPage && n.isVisible());
    const out: { page: string; outcome: unknown }[] = [];
    for (const page of pages) {
      const ex = L.dialogDefaults(page);
      out.push({
        page: String(page.getProperty("name")),
        outcome: await L.io.export(page, L.exporterOptions(ex)),
      });
    }
    return out;
  });
});

function corpusScenario(file: string): Scenario<{ file: string }> {
  return {
    id: `io-export-svg/corpus/${file.replace(/\.gvdesign$/, "")}`,
    covers: ["FMT-EXPORT-005", "FMT-EXPORT-006", "FMT-EXPORT-007", "FMT-EXPORT-046"],
    kind: "text",
    extension: ".svg.txt",
    timeout: 300_000,
    // WebGL effects rasterize differently depending on what ran before in
    // the same browser (shared GPU-process state).
    freshBrowser: /^effects-/.test(file),
    args: { file },
    driver: async ({ page }, a) => {
      page.setDefaultTimeout(240_000);
      const json = zlib.gunzipSync(fs.readFileSync(path.join(CORPUS, a.file))).toString("utf8");
      const list = (await page.evaluate(
        `(${runCorpusFile.toString()})(window.__parity, ${JSON.stringify({ json })})`,
      )) as { page: string; outcome: Outcome }[];
      return list.map((p) => `== page ${p.page}\n` + describeOutcome(p.outcome)).join("");
    },
  };
}

// ---- extra/<name> -----------------------------------------------------

function extraScenario(
  c: (typeof EXTRA_CASES)[number],
  images: { png: string; jpg: string },
): Scenario<ExtraArgs & { corpus?: string }> {
  return {
    id: `io-export-svg/extra/${c.name}`,
    covers: ["FMT-EXPORT-005", "FMT-EXPORT-006", "FMT-EXPORT-007"],
    kind: "text",
    extension: ".svg.txt",
    args: { name: c.name, ...images, ...(c.corpus ? { corpus: c.corpus } : {}) },
    driver: async ({ page }, a) => {
      const args: ExtraArgs = { name: a.name, png: a.png, jpg: a.jpg };
      if (a.corpus) {
        args.json = zlib
          .gunzipSync(fs.readFileSync(path.join(CORPUS, a.corpus + ".gvdesign")))
          .toString("utf8");
      }
      const out = (await page.evaluate(
        `(${runExtraCase.toString()})(window.__parity, ${JSON.stringify(args)})`,
      )) as Outcome | Outcome[];
      const list = Array.isArray(out) ? out : [out];
      return list.map((o, i) => `== export ${i + 1}\n` + describeOutcome(o)).join("");
    },
  };
}

const images = {
  png:
    "data:image/png;base64," + fs.readFileSync(path.join(RASTER, "alpha.png")).toString("base64"),
  jpg:
    "data:image/jpeg;base64," + fs.readFileSync(path.join(RASTER, "photo.jpg")).toString("base64"),
};

const source = casesSource();
const caseNames = Object.keys(SVG_EXPORT_CASES);
const corpusFiles = fs.existsSync(CORPUS)
  ? fs
      .readdirSync(CORPUS)
      .filter((f) => f.endsWith(".gvdesign"))
      .sort()
  : [];

paritySuite(
  "io-export-svg",
  defineScenarios<any>([
    ...caseNames.map((n) => caseScenario(n, source)),
    ...EXPORT_CASES.filter((c) => c.format === "svg").map((c) => engineScenario(c, images)),
    ...corpusFiles.map(corpusScenario),
    ...EXTRA_CASES.map((c) => extraScenario(c, images)),
  ]),
  { newApp: false },
);
