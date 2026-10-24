// GPDFImport, GEPSImport and GBitmapImport on their own: every PDF, AI,
// EPS/PS and bitmap fixture goes through the importer with a fixed font
// setup, and the result (callback error, pages or group, missing and
// embedded fonts, progress calls, error messages) is compared with the
// nodes serialized. The UI paths around the importers (File > Open, Place
// Image, drop, the missing-fonts dialog) are in import-export/import.spec.ts.
import fs from "node:fs";
import path from "node:path";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { NEXT_ROOT } from "../../support/env.ts";
import type { BinarySource, PdfImportFlags } from "./contract.ts";

type Importer = "pdf" | "ai-check" | "eps" | "bitmap";

interface ImportArgs {
  importer: Importer;
  source: BinarySource;
  options?: Record<string, unknown>;
  flags?: PdfImportFlags;
  outlineFonts?: boolean;
  timeoutMs?: number;
}

const SHARED_DIR = path.join(NEXT_ROOT, "parity", "fixtures", "import");
const OWN_DIR = path.join(NEXT_ROOT, "parity", "scenarios", "io-import-pdf-eps", "fixtures");

function source(file: string, type?: string): BinarySource {
  return { base64: fs.readFileSync(file).toString("base64"), ...(type ? { type } : {}) };
}

/**
 * Runs in the page: a font manager of its own (Open Sans from the app's
 * assets as default font and for every style and weight of "Open Sans",
 * resolved asynchronously like a font download; every other family
 * fails), then the import, then the outcome with the nodes serialized.
 * For PDFs the Open Sans fonts are resolved first (see below).
 */
async function importInPage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the engine is driven through the untyped G namespace
  { G, app }: { G: any; app: any },
  a: ImportArgs,
): Promise<string> {
  const hooks = app.pdfEpsImport;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine objects
  const serialize = (node: any) =>
    node
      ? G.GNode.serialize(node).replace(/dictionary:\/\/[A-Za-z0-9]+/g, "dictionary://<key>")
      : null;
  if (a.importer === "bitmap")
    return JSON.stringify(await hooks.importBitmap(a.source, a.timeoutMs));
  if (a.importer === "ai-check")
    return JSON.stringify(await hooks.isAIFormat(a.source, a.timeoutMs));

  const bytes = await (await fetch("assets/font/OpenSans-Regular.ttf")).arrayBuffer();
  const fm = new G.GFontManager();
  fm.setDefaultFont(G.GOpenTypeFont.create("Open Sans", "N", 400, bytes));
  const families = ["Open Sans"];
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
      setTimeout(() => {
        if (families.includes(e.family))
          e.resolved(G.GOpenTypeFont.create(e.family, e.style, e.weight, bytes));
        else e.failed();
      }, 0);
    },
  );

  if (a.importer === "eps") {
    const out = await hooks.importEps(a.source, a.outlineFonts !== false, fm, a.timeoutMs);
    for (let i = 0; i < 200 && fm.hasPendingFonts(); i++) await sleep(10);
    await sleep(50);
    const background = out.background
      ? out.background instanceof G.GNode
        ? serialize(out.background)
        : G.GPattern.serialize(out.background)
      : null;
    return JSON.stringify({
      called: out.called,
      threw: out.threw === true,
      error: out.error,
      size: out.size,
      background,
      errors: out.errors,
      progress: out.progress,
      node: serialize(out.node),
    });
  }

  // Every style and weight of Open Sans is resolved before the import:
  // the text meter measures with whatever font manager the first PDF
  // import of the page installed (old module 367), so a font that is
  // still loading would measure as 0 depending on what ran before.
  for (const style of ["N", "I"])
    for (let weight = 100; weight <= 900; weight += 100) fm.getFont("Open Sans", style, weight);
  for (let i = 0; i < 200 && fm.hasPendingFonts(); i++) await sleep(10);
  const out = await hooks.importPdf(a.source, a.options || {}, fm, a.flags || {}, a.timeoutMs);
  for (let i = 0; i < 200 && fm.hasPendingFonts(); i++) await sleep(10);
  await sleep(50);
  return JSON.stringify({
    called: out.called,
    threw: out.threw === true,
    error: out.error,
    aiAsked: out.aiAsked,
    progress: out.progress,
    missingFonts: out.missingFonts,
    embeddedFonts: out.embeddedFonts
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine fonts
        out.embeddedFonts.map((f: any) => ({
          family: f.getFamily(),
          style: f.getStyle(),
          weight: f.getWeight(),
          embedded: typeof f.isEmbedded === "function" ? f.isEmbedded() : null,
          bytes: f._buffer ? f._buffer.byteLength : null,
        }))
      : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine pages
    pages: out.pages ? out.pages.map((p: any) => serialize(p)) : null,
  });
}

const FORMAT_COVERS: Record<Importer, string[]> = {
  pdf: ["FMT-IMPORT-009", "FMT-WORKER-009", "FMT-WORKER-011", "FMT-LIB-001"],
  "ai-check": ["FMT-IMPORT-011"],
  eps: [
    "FMT-IMPORT-012",
    "FMT-WORKER-002",
    "FMT-WORKER-003",
    "FMT-WORKER-004",
    "FMT-WORKER-005",
    "FMT-WORKER-006",
    "FMT-WORKER-007",
    "FMT-WORKER-008",
  ],
  bitmap: ["FMT-IMPORT-016"],
};

function scenario(
  name: string,
  args: ImportArgs,
  extraCovers: string[] = [],
): Scenario<ImportArgs> {
  return {
    id: `io-import-pdf-eps/${args.importer}/${name}`,
    covers: [...FORMAT_COVERS[args.importer], ...extraCovers],
    kind: "document",
    args,
    timeout: 90_000,
    inPage: importInPage as Scenario<ImportArgs>["inPage"],
  };
}

const list = (dir: string, pattern: RegExp) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => pattern.test(f))
        .sort()
    : [];

const slug = (file: string) => file.replace(/\.([a-z0-9]+)$/i, "-$1");

// The old worker throws on "x y r 0 360 arc closepath" and never answers;
// those imports end at the hook's timeout.
const HANGS = new Set(["arc-closepath.eps", "shapes.ps"]);
const EPS_TIMEOUT = 20_000;

const pdfFiles: [string, string][] = [
  ...list(path.join(SHARED_DIR, "pdf"), /\.pdf$/).map((f): [string, string] => [
    path.join(SHARED_DIR, "pdf", f),
    f,
  ]),
  ...list(path.join(SHARED_DIR, "misc"), /\.ai$/)
    .filter((f) => f !== "postscript-only.ai")
    .map((f): [string, string] => [path.join(SHARED_DIR, "misc", f), f]),
  ...list(OWN_DIR, /\.pdf$/).map((f): [string, string] => [path.join(OWN_DIR, f), f]),
];

const epsFiles: [string, string][] = [
  ...list(path.join(SHARED_DIR, "eps"), /\.eps$/).map((f): [string, string] => [
    path.join(SHARED_DIR, "eps", f),
    f,
  ]),
  [path.join(SHARED_DIR, "misc", "shapes.ps"), "shapes.ps"],
  [path.join(SHARED_DIR, "misc", "postscript-only.ai"), "postscript-only.ai"],
  ...list(path.join(OWN_DIR, "eps"), /\.e?ps$/).map((f): [string, string] => [
    path.join(OWN_DIR, "eps", f),
    f,
  ]),
];

const BITMAP_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  heic: "image/heic",
};

const scenarios = defineScenarios<ImportArgs>([
  ...pdfFiles.map(([file, name]) =>
    scenario(slug(name), { importer: "pdf", source: source(file), flags: { progress: true } }),
  ),
  scenario("vector-2pages-pdf-first-page", {
    importer: "pdf",
    source: source(path.join(SHARED_DIR, "pdf", "vector-2pages.pdf")),
    options: { startPage: 1 },
    flags: { progress: true },
  }),
  scenario("vector-2pages-pdf-second-page", {
    importer: "pdf",
    source: source(path.join(SHARED_DIR, "pdf", "vector-2pages.pdf")),
    options: { startPage: 2, endPage: 2 },
  }),
  scenario("text-pdf-no-families", {
    importer: "pdf",
    source: source(path.join(OWN_DIR, "text.pdf")),
    flags: { families: [] },
  }),
  scenario(
    "embedded-fonts-pdf-families",
    {
      importer: "pdf",
      source: source(path.join(OWN_DIR, "embedded-fonts.pdf")),
      flags: { families: ["gravit-designer", "Open Sans Bold"] },
    },
    ["FMT-IMPORT-028"],
  ),
  scenario("pdf-compatible-ai-continue", {
    importer: "pdf",
    source: source(path.join(SHARED_DIR, "misc", "pdf-compatible.ai")),
    flags: { ai: "continue" },
  }),
  scenario("pdf-compatible-ai-stop", {
    importer: "pdf",
    source: source(path.join(SHARED_DIR, "misc", "pdf-compatible.ai")),
    flags: { ai: "stop" },
    timeoutMs: 10_000,
  }),
  scenario("plain-pdf-ai-continue", {
    importer: "pdf",
    source: source(path.join(SHARED_DIR, "misc", "plain-pdf.ai")),
    flags: { ai: "continue" },
  }),
  ...[
    ["misc", "pdf-compatible.ai"],
    ["misc", "plain-pdf.ai"],
    ["misc", "postscript-only.ai"],
    ["pdf", "plain.pdf"],
    ["pdf", "broken.pdf"],
  ].map(([dir, file]) =>
    scenario(slug(file as string), {
      importer: "ai-check",
      source: source(path.join(SHARED_DIR, dir as string, file as string)),
      timeoutMs: 10_000,
    }),
  ),
  // A PDF that needs a user password: pdf.js rejects the load, which the
  // AI check reports and the import itself never does.
  scenario("encrypted-user-password-pdf", {
    importer: "ai-check",
    source: source(path.join(OWN_DIR, "encrypted-user-password.pdf")),
    timeoutMs: 10_000,
  }),
  ...epsFiles.map(([file, name]) =>
    scenario(slug(name), {
      importer: "eps",
      source: source(file),
      outlineFonts: true,
      timeoutMs: HANGS.has(name) ? 8_000 : EPS_TIMEOUT,
    }),
  ),
  ...epsFiles
    .filter(([file]) =>
      /\bshow\b|charpath|findfont|selectfont/.test(fs.readFileSync(file, "latin1")),
    )
    .map(([file, name]) =>
      scenario(`${slug(name)}-text`, {
        importer: "eps",
        source: source(file),
        outlineFonts: false,
        timeoutMs: HANGS.has(name) ? 8_000 : EPS_TIMEOUT,
      }),
    ),
  ...list(path.join(SHARED_DIR, "raster"), /\.(png|jpg|gif|bmp|webp|heic)$/).map((f) =>
    scenario(slug(f), {
      importer: "bitmap",
      source: source(
        path.join(SHARED_DIR, "raster", f),
        BITMAP_TYPES[f.replace(/^.*\./, "")] as string,
      ),
      timeoutMs: 10_000,
    }),
  ),
]);

// The suite takes scenarios with untyped args; each scenario checks its own.
paritySuite("io-import-pdf-eps", scenarios as readonly Scenario[], { newApp: false });
