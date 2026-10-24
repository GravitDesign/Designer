// GSketchImport on its own: every Sketch fixture goes through the importer
// with a fixed font setup, and what the callback received (the pages
// serialized, the replaced fonts or the error) is compared together with
// the progress values and the font queries. The open list never offers
// .sketch (FMT-IMPORT-002, QUESTIONS.md Q-008); the UI path is covered in
// import-export/import.spec.ts.
import fs from "node:fs";
import path from "node:path";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { NEXT_ROOT } from "../../support/env.ts";

interface ImportArgs {
  base64: string;
  options: Record<string, unknown>;
  /** Leave out the font provider, so the importer's default one answers. */
  noFontProvider?: boolean;
  /**
   * "sync" (default): the provider answers and fonts resolve at once, so
   * every text run is set while the importer parses. "late": answers and
   * fonts arrive only after the import callback. Anything in between
   * races the importer's frame-sliced parsing in the old app too.
   */
  fonts?: "sync" | "late";
  timeoutMs?: number;
}

// Made by parity/fixtures/import/generators/mksketch.py, except
// symbols-edge-v49 and pdf-image-v49 (mkfixtures.py next to this file).
const DIR = path.join(NEXT_ROOT, "parity", "fixtures", "import", "sketch");

/**
 * Runs in the page: a font manager of its own (Open Sans from the app's
 * assets as default font and for every style and weight of "Open Sans"
 * and "Parity Serif"; every other family fails), a font provider that
 * maps a few names the way the app's library search would and answers
 * null otherwise, then the import. See `fonts` for when they answer.
 * Text runs, bitmaps and symbol overrides finish after the callback, so
 * the pages are serialized once fonts and images have settled.
 */
async function importInPage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the engine is driven through the untyped G namespace
  { G, app }: { G: any; app: any },
  a: ImportArgs,
): Promise<string> {
  const bytes = await (await fetch("assets/font/OpenSans-Regular.ttf")).arrayBuffer();
  const late = a.fonts === "late";
  // Provider answers held back until the import has called back ("late").
  const held: (() => void)[] = [];
  const fm = new G.GFontManager();
  fm.setDefaultFont(G.GOpenTypeFont.create("Open Sans", "N", 400, bytes));
  const families = ["Open Sans", "Parity Serif"];
  fm.addEventListener(
    G.GFontManager.QueryFontFamilyEvent,
    (e: { family: string; callback(fonts: unknown[]): void }) => {
      if (families.includes(e.family)) e.callback([{ family: e.family, style: "N", weight: 400 }]);
    },
  );
  fm.addEventListener(
    G.GFontManager.ResolveFontEvent,
    (e: {
      family: string;
      style: string;
      weight: number;
      resolved(f: unknown): void;
      failed(): void;
    }) => {
      const answer = () => {
        if (families.includes(e.family))
          e.resolved(G.GOpenTypeFont.create(e.family, e.style, e.weight, bytes));
        else e.failed();
      };
      if (late) setTimeout(answer, 0);
      else answer();
    },
  );
  const answers: Record<string, string> = {
    "Open Sans": "Open Sans",
    "Parity Serif-Italic": "Parity Serif",
  };
  const queries: string[] = [];
  const progress: number[] = [];
  const options: Record<string, unknown> = {
    ...a.options,
    progress: (value: number) => progress.push(value),
  };
  if (!a.noFontProvider) {
    options.fontProvider = {
      queryFirst(
        q: { fontName: string; fontFamily: string; fontWeight: number; fontStyle: string },
        done: (r: unknown) => void,
      ) {
        queries.push([q.fontName, q.fontFamily, q.fontWeight, q.fontStyle].join("/"));
        const family = answers[q.fontFamily];
        const answer = () =>
          done(family ? { family, weight: q.fontWeight, style: q.fontStyle } : null);
        if (late) held.push(answer);
        else answer();
      },
    };
  }
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  try {
    const out = await app.sketchImport.import(a.base64, options, fm, a.timeoutMs);
    const result = out.result;
    const pages: unknown[] = result && Array.isArray(result.pages) ? result.pages : [];
    for (const answer of held) {
      await sleep(0);
      answer();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine nodes
    const loading = (node: any): boolean => {
      if (node instanceof G.GImage) {
        const status = node.getStatus();
        if (status !== G.GImage.ImageStatus.Loaded && status !== G.GImage.ImageStatus.Error)
          return !!node.getProperty("url");
      }
      for (let c = node.getFirstChild ? node.getFirstChild() : null; c; c = c.getNext())
        if (loading(c)) return true;
      return false;
    };
    for (let i = 0; i < 100; i++) {
      await sleep(20);
      if (!fm.hasPendingFonts() && !pages.some(loading)) break;
    }
    await sleep(150);
    let error: unknown = null;
    if (!out.called || !result || !Array.isArray(result.pages)) {
      error =
        result === null || result === undefined
          ? null
          : typeof result === "string" || (typeof result === "object" && !(result instanceof Error))
            ? result
            : "<" + String(result && result.name) + ">";
    }
    return JSON.stringify({
      called: out.called,
      error,
      replacedFonts: result && result.pages ? result.replacedFonts : null,
      progress,
      queries,
      // Images keep their data in the scene dictionary under a random key.
      // A text whose archive was broken has no runs; when its fonts
      // arrive late, saving it throws in the old app as well.
      pages: pages.map((p) => {
        try {
          return G.GNode.serialize(p).replace(/dictionary:\/\/[A-Za-z0-9]+/g, "dictionary://<key>");
        } catch (e) {
          return "<serialize failed: " + String(e) + ">";
        }
      }),
    });
  } finally {
    app.sketchImport.release();
  }
}

function scenario(
  file: string,
  suffix = "",
  options: Record<string, unknown> = {},
  extra: Partial<ImportArgs> = {},
): Scenario {
  return {
    id: `io-import-sketch/${file.replace(/\.sketch$/, "")}${suffix}`,
    covers: ["FMT-IMPORT-015", "FMT-LIB-003", "FMT-WORKER-015"],
    kind: "document",
    args: {
      base64: fs.readFileSync(path.join(DIR, file)).toString("base64"),
      options,
      ...extra,
    } satisfies ImportArgs,
    inPage: importInPage as Scenario["inPage"],
    // Text layout in the old engine keeps state across imports in one
    // page (the late-fonts outputs changed with the scenarios run before
    // them), so every scenario boots a page of its own. An `open` with
    // settings is what keeps a scenario off the shared page.
    open: { settings: {} },
  };
}

const files = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith(".sketch"))
  .sort();

const scenarios = defineScenarios([
  ...files.map((f) =>
    // A zip without meta.json never calls back; wait less for it.
    f.startsWith("no-meta") ? scenario(f, "", {}, { timeoutMs: 3000 }) : scenario(f),
  ),
  scenario("symbols-v49.sketch", "-ignore-symbol-page", { ignoreSymbolPage: true }),
  scenario("text-v49.sketch", "-default-provider", {}, { noFontProvider: true }),
  scenario("text-v49.sketch", "-late-fonts", {}, { fonts: "late" }),
  scenario("text-valid-v49.sketch", "-late-fonts", {}, { fonts: "late" }),
  scenario("symbols-v49.sketch", "-late-fonts", {}, { fonts: "late" }),
]);

paritySuite("io-import-sketch", scenarios, { newApp: false });
