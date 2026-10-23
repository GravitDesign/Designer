// GSVGImport on its own: every SVG fixture goes through the importer with
// a fixed font setup, and the result (callback error, size info and the
// serialized node) is compared. The UI paths that wrap the importer
// (File > Open, Place Image, drop) are in import-export/import.spec.ts.
import fs from "node:fs";
import path from "node:path";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { NEXT_ROOT } from "../../support/env.ts";
import type { SvgSource } from "./contract.ts";

interface ImportArgs {
  source: SvgSource;
  options: Record<string, unknown>;
  /** Import into a new group (the "target" option) instead of a new node. */
  intoGroup?: boolean;
  /** Put the result on the active page and wait for its images to load. */
  place?: boolean;
}

const SHARED_DIR = path.join(NEXT_ROOT, "parity", "fixtures", "import", "svg");
const OWN_DIR = path.join(NEXT_ROOT, "parity", "scenarios", "io-import-svg", "fixtures");

function source(file: string): SvgSource {
  const bytes = fs.readFileSync(file);
  return file.endsWith(".svgz")
    ? { base64: bytes.toString("base64") }
    : { text: bytes.toString("utf8") };
}

/**
 * Runs in the page: a font manager of its own (Open Sans from the app's
 * assets as default font and for every style and weight of "Open Sans"
 * and "Parity Serif", resolved asynchronously like a font download; every
 * other family fails), a font provider that maps a few misspelled names
 * the way the app's provider would and answers null otherwise, then the
 * import, then the outcome with the node serialized. Gradient and
 * pattern fills arrive as promises after the callback, so a few frames
 * pass before the node is serialized.
 */
async function importInPage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the engine is driven through the untyped G namespace
  { G, app }: { G: any; app: any },
  a: ImportArgs,
): Promise<string> {
  const bytes = await (await fetch("assets/font/OpenSans-Regular.ttf")).arrayBuffer();
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
      setTimeout(() => {
        if (families.includes(e.family))
          e.resolved(G.GOpenTypeFont.create(e.family, e.style, e.weight, bytes));
        else e.failed();
      }, 0);
    },
  );
  // Like the app's provider (a library search), it answers with the
  // style and weight asked for; unknown families get null.
  const answers: Record<string, string> = {
    "Open Sans": "Open Sans",
    "Open San": "Open Sans",
    "Parity Serif": "Parity Serif",
    Robotto: "Parity Serif",
  };
  const queries: string[] = [];
  const fontProvider = {
    queryFirst(
      q: { fontFamily: string; fontWeight: number; fontStyle: string },
      done: (r: unknown) => void,
    ) {
      queries.push([q.fontFamily, q.fontWeight, q.fontStyle].join("/"));
      const family = answers[q.fontFamily];
      setTimeout(
        () => done(family ? { family, weight: q.fontWeight, style: q.fontStyle } : null),
        0,
      );
    },
  };
  const options: Record<string, unknown> = { ...a.options, fontProvider };
  if (a.intoGroup) options.target = new G.GGroup();
  const out = await app.svgImport.import(a.source, options, fm);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 200 && fm.hasPendingFonts(); i++) await sleep(10);
  await sleep(50);
  if (a.place && out.node && !(out.node instanceof G.GPage)) {
    app.scene().getActivePage().appendChild(out.node);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- engine nodes
    const loading = (node: any): boolean => {
      if (node instanceof G.GImage) {
        const status = node.getStatus();
        if (status !== G.GImage.ImageStatus.Loaded && status !== G.GImage.ImageStatus.Error)
          return true;
      }
      for (let c = node.getFirstChild ? node.getFirstChild() : null; c; c = c.getNext())
        if (loading(c)) return true;
      return false;
    };
    for (let i = 0; i < 250 && loading(out.node); i++) await sleep(20);
    await sleep(50);
  }
  const error =
    out.error === null || out.error === undefined
      ? null
      : typeof out.error === "string"
        ? out.error
        : "<" + String(out.error && out.error.name) + ">";
  return JSON.stringify({
    called: out.called,
    error,
    info: out.info,
    queries,
    // A placed image moves its data into the scene dictionary under a random key.
    node: out.node
      ? G.GNode.serialize(out.node).replace(/dictionary:\/\/[A-Za-z0-9]+/g, "dictionary://<key>")
      : null,
  });
}

const DEFAULT_OPTIONS = {};
const BASE_SIZE = { baseWidth: 120, baseHeight: 90, forceBaseSize: true };

function scenario(
  dir: string,
  file: string,
  options: Record<string, unknown>,
  suffix = "",
  extra: Partial<ImportArgs> = {},
): Scenario {
  const name = file.replace(/\.(svgz?)$/, "-$1");
  // Round-trip fixtures keep the original document next to the SVG; the
  // ids in its editing data must come back unchanged.
  const sourceJson = path.join(dir, file.replace(/\.svgz?$/, ".source.json"));
  return {
    id: `io-import-svg/${name}${suffix}`,
    covers: [
      "FMT-IMPORT-005",
      "FMT-IMPORT-006",
      ...(file.startsWith("roundtrip-") ? ["FMT-IMPORT-007"] : []),
    ],
    kind: "document",
    args: { source: source(path.join(dir, file)), options, ...extra } satisfies ImportArgs,
    ...(fs.existsSync(sourceJson)
      ? { keepIdsOf: path.relative(NEXT_ROOT, sourceJson).replace(/\\/g, "/") }
      : {}),
    inPage: importInPage as Scenario["inPage"],
  };
}

const list = (dir: string) =>
  fs
    .readdirSync(dir)
    .filter((f) => /\.svgz?$/.test(f))
    .sort();

/**
 * R5-E-401: CSS selectors named like Object.prototype members. canvg kept
 * its CSS rules in a plain object, so a `__proto__ { ... }` rule writes
 * its declarations onto Object.prototype and `constructor { ... }` onto
 * the Object function, for the rest of the page's life. These run in a
 * page of their own (a driver scenario) and record, next to the import,
 * whether the properties leaked.
 */
const PROTO_DIR = path.join(OWN_DIR, "prototype");

function prototypeScenario(file: string): Scenario {
  const base = scenario(PROTO_DIR, file, DEFAULT_OPTIONS);
  const { inPage: _unused, ...rest } = base;
  void _unused;
  return {
    ...rest,
    id: base.id.replace("io-import-svg/", "io-import-svg/prototype/"),
    driver: async ({ page }, a) => {
      let result: Record<string, unknown>;
      try {
        result = JSON.parse(
          (await page.evaluate(
            `(${importInPage.toString()})(window.__parity, ${JSON.stringify(a)})`,
          )) as string,
        ) as Record<string, unknown>;
      } catch (error) {
        result = { threw: String((error as Error).message).split("\n")[0] };
      }
      const leaked = await page.evaluate(() => {
        const proto = Object.prototype as unknown as Record<string, unknown>;
        const object = Object as unknown as Record<string, unknown>;
        const out = {
          prototypeKeys: ["fill", "stroke", "stroke-width"].filter((k) =>
            Object.prototype.hasOwnProperty.call(proto, k),
          ),
          objectKeys: ["fill", "stroke", "stroke-width"].filter((k) =>
            Object.prototype.hasOwnProperty.call(object, k),
          ),
          plainObjectFill: typeof ({} as Record<string, unknown>).fill,
        };
        for (const k of out.prototypeKeys) Reflect.deleteProperty(proto, k);
        for (const k of out.objectKeys) Reflect.deleteProperty(object, k);
        return out;
      });
      return JSON.stringify({ ...result, leaked });
    },
  };
}

const scenarios = defineScenarios([
  ...list(SHARED_DIR).map((f) => scenario(SHARED_DIR, f, DEFAULT_OPTIONS)),
  ...list(OWN_DIR).map((f) => scenario(OWN_DIR, f, DEFAULT_OPTIONS)),
  scenario(SHARED_DIR, "shapes.svg", BASE_SIZE, "-base-size"),
  scenario(SHARED_DIR, "no-size.svg", BASE_SIZE, "-base-size"),
  scenario(SHARED_DIR, "structure.svg", DEFAULT_OPTIONS, "-into-group", { intoGroup: true }),
  scenario(SHARED_DIR, "single-group.svg", DEFAULT_OPTIONS, "-into-group", { intoGroup: true }),
  scenario(SHARED_DIR, "markers-image.svg", DEFAULT_OPTIONS, "-placed", { place: true }),
  scenario(OWN_DIR, "images.svg", DEFAULT_OPTIONS, "-placed", { place: true }),
  scenario(OWN_DIR, "patterns.svg", DEFAULT_OPTIONS, "-placed", { place: true }),
  scenario(OWN_DIR, "image-svg-href.svg", DEFAULT_OPTIONS, "-placed", { place: true }),
  ...list(PROTO_DIR).map(prototypeScenario),
]);

paritySuite("io-import-svg", scenarios, { newApp: false });
