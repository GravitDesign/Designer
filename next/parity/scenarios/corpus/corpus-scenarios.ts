// Corpus scenarios (used by the *.spec.ts files here, split so two
// workers can run them side by side): every .gvdesign file in parity/corpus/files is opened
// through File > Open Local File and checked five ways:
//
// - document: the loaded scene, serialized as a save would (load check);
// - resave: saving it again through File > Save to Local File as... gives a
//   gzip stream whose JSON starts with "_preview" and otherwise equals the
//   serialized scene;
// - preview: the JPEG embedded by that save, decoded and stored as PNG;
// - render-light / render-dark: the canvas after rendering has finished at
//   25%, 33%, 100% and 400% zoom, stacked top to bottom, in each theme;
// - bitmap: every page rendered offscreen with GElement.toBitmap, the API
//   export and the preview use, stacked top to bottom.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { Page } from "@playwright/test";
import { PNG } from "pngjs";
import { NEXT_ROOT } from "../../support/env.ts";
import { normalizeDocument, type Json } from "../../support/normalize.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { CORPUS_DOCUMENTS, EXTRA_FILES, type CorpusDocument } from "../../corpus/documents.ts";

const FILES = path.join(NEXT_ROOT, "parity", "corpus", "files");

/** Zoom levels of the canvas renders, in render order. */
const ZOOMS = [0.25, 0.33, 1, 4];

const LOAD_COVERS = [
  "ENG-NODE-002",
  "ENG-NODE-006",
  "ENG-NODE-007",
  "ENG-NODE-048",
  "FMT-GVD-003",
  "FMT-GVD-004",
  "FMT-GVD-005",
  "FMT-GVD-006",
  "FMT-GVD-007",
  "FMT-GVD-008",
  "ENG-SER-001",
  "ENG-SER-002",
  "ENG-SER-003",
  "ENG-SER-004",
  "ENG-SER-009",
  "ACT-FILE-004",
];
const RESAVE_COVERS = [
  "FMT-GVD-001",
  "FMT-GVD-002",
  "FMT-PREVIEW-001",
  "FMT-PREVIEW-003",
  "ACT-FILE-008",
];
const PREVIEW_COVERS = ["FMT-PREVIEW-002", "EDT-RENDER-014", "EDT-PAINT-050", "ENG-GEOM-013"];
const RENDER_COVERS = [
  "EDT-RENDER-002",
  "EDT-RENDER-006",
  "EDT-RENDER-038",
  "ENG-SCENE-012",
  "EDT-RENDER-003",
  "EDT-RENDER-005",
  "EDT-RENDER-012",
  "EDT-RENDER-013",
  "EDT-RENDER-021",
  "EDT-RENDER-024",
  "EDT-RENDER-026",
  "EDT-RENDER-027",
  "EDT-RENDER-028",
  "EDT-RENDER-032",
  "EDT-RENDER-034",
  "EDT-RENDER-042",
  "EDT-RENDER-043",
  "EDT-RENDER-044",
  "EDT-RENDER-045",
  "EDT-RENDER-046",
  "EDT-RENDER-047",
  "EDT-RENDER-052",
  "EDT-RENDER-053",
  "EDT-RENDER-056",
  "EDT-RENDER-059",
  "EDT-PAINT-001",
  "EDT-PAINT-014",
  "EDT-PAINT-015",
  "EDT-PAINT-016",
  "EDT-PAINT-017",
  "EDT-PAINT-029",
  "EDT-PAINT-032",
  "EDT-PCTX-001",
];
const BITMAP_COVERS = ["EDT-RENDER-014", "EDT-PAINT-049", "EDT-PAINT-050", "ENG-NODE-012"];

interface ParityApp {
  execute(id: string): void;
  serialize(options: unknown): string;
  editor(): { clearSelection(): void };
  corpus: { waitForDocument(title: string): Promise<void>; settle(): Promise<void> };
}
type ParityPage = Window & { __parity: { app: ParityApp } };

async function openCorpusFile(page: Page, file: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page.evaluate(() => (window as unknown as ParityPage).__parity.app.execute("file.open"));
  await (await chooser).setFiles(file);
  await page.evaluate(
    async (title) => {
      const app = (window as unknown as ParityPage).__parity.app;
      await app.corpus.waitForDocument(title);
      app.editor().clearSelection();
      await app.corpus.settle();
    },
    path.basename(file, ".gvdesign"),
  );
}

/** Saves the active document through the app's save action; gzip bytes. */
async function resave(page: Page): Promise<Buffer> {
  const download = page.waitForEvent("download");
  await page.evaluate(() =>
    (window as unknown as ParityPage).__parity.app.execute("file.save-as.gvdesign"),
  );
  const file = await (await download).path();
  return fs.readFileSync(file);
}

/**
 * Loading a file makes some random ids that normalize.ts can't see, so they
 * differ on every load of the same file:
 * - pattern strings like `N#{...}` hold a serialized node (the noise
 *   pattern's internal rectangle gets new paint layer ids when it is
 *   restored);
 * - compact anchor arrays hold reference ids after a `"#"` or `"&"` element
 *   (a text-on-path's copy of its path gets new anchor references);
 * - scene `_links` is keyed by reference ids (the odd/even master pages in
 *   `ompg`/`empg` are restored as new page objects with new ids).
 * This renames those ids, and every other string or object key equal to
 * one, to `rid1`, `rid2`, ... in order of first appearance, keeping the
 * reference structure. normalize.ts then handles the ordinary ids.
 */
const ID_KEYS = new Set(["@id", "#", "&", "_effId", "_layId"]);
const PATTERN = /^([A-Z])#(\{.*\})$/s;

function parseNested(value: string): { prefix: string; json: Json } | undefined {
  const pattern = PATTERN.exec(value);
  const text = pattern ? (pattern[2] ?? "") : value;
  const first = text.charAt(0);
  if (first !== "{" && first !== "[") return undefined;
  try {
    return { prefix: pattern ? `${pattern[1]}#` : "", json: JSON.parse(text) as Json };
  } catch {
    return undefined;
  }
}

function collectIds(value: Json, ids: Map<string, string>): void {
  const add = (id: string) => {
    if (!ids.has(id)) ids.set(id, `rid${ids.size + 1}`);
  };
  if (typeof value === "string") {
    const nested = parseNested(value);
    if (nested) collectIds(nested.json, ids);
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => {
      const next = value[i + 1];
      if ((item === "#" || item === "&") && typeof next === "string") add(next);
      collectIds(item, ids);
    });
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (ID_KEYS.has(k) && typeof v === "string") add(v);
      collectIds(v, ids);
    }
  }
}

function renameIds(value: Json, ids: Map<string, string>): Json {
  if (typeof value === "string") {
    const renamed = ids.get(value);
    if (renamed !== undefined) return renamed;
    const nested = parseNested(value);
    if (!nested) return value;
    const out = nested.prefix + JSON.stringify(renameIds(nested.json, ids));
    return out;
  }
  if (Array.isArray(value)) return value.map((v) => renameIds(v, ids));
  if (value && typeof value === "object") {
    const out: { [key: string]: Json } = {};
    for (const [k, v] of Object.entries(value)) out[ids.get(k) ?? k] = renameIds(v, ids);
    return out;
  }
  return value;
}

function stabilizeIds(json: string): string {
  const doc = JSON.parse(json) as Json;
  const ids = new Map<string, string>();
  collectIds(doc, ids);
  return JSON.stringify(renameIds(doc, ids));
}

function previewOf(bytes: Buffer): { json: string; preview: unknown } {
  const json = zlib.gunzipSync(bytes).toString("utf8");
  const parsed = JSON.parse(json) as Record<string, unknown>;
  return { json, preview: parsed._preview };
}

/** Decodes an image data URL in the page and returns it as a PNG data URL. */
async function decodeInPage(
  page: Page,
  url: string,
): Promise<{ png: string; width: number; height: number }> {
  return page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    (c.getContext("2d") as CanvasRenderingContext2D).drawImage(img, 0, 0);
    return { png: c.toDataURL("image/png"), width: c.width, height: c.height };
  }, url);
}

/** Stacks PNGs top to bottom; narrower ones are padded with transparency. */
function stack(pngs: Buffer[]): Buffer {
  const images = pngs.map((b) => PNG.sync.read(b));
  const width = Math.max(1, ...images.map((i) => i.width));
  const height = Math.max(
    1,
    images.reduce((h, i) => h + i.height, 0),
  );
  const out = new PNG({ width, height });
  out.data.fill(0);
  let y = 0;
  for (const img of images) {
    PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, y);
    y += img.height;
  }
  return PNG.sync.write(out);
}

interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Zooms the view to `zoom` around the active page's content, waits until
 * rendering has finished and returns the part of the canvas that shows the
 * content (plus 24px of surroundings), clipped to the visible view box and
 * to 640 x 640 pixels around the content center.
 */
async function zoomAndMeasure(page: Page, zoom: number): Promise<Clip> {
  return page.evaluate(async (z) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine objects
    const { G, app } = (window as unknown as { __parity: { G: any; app: any } }).__parity;
    const view = app.view();
    const scene = app.scene();
    const pg = scene.getActivePage();
    // Drop the tiles cached at earlier zoom levels (the first render after
    // opening can take a different WebGL path), so every zoom level is
    // rendered fresh.
    view.cleanCache();
    // Zoom until the content center lands in the middle of the view box and
    // the content box stops changing: the panels can still change size right
    // after a document opens, and some bounding boxes (paths graph) are only
    // known after the first paint.
    // The geometry box, not the paint box: effect paddings (long shadows)
    // can make the paint box differ from one load to the next.
    const contentBox = () => pg.getGeometryBBox() || new G.GRect(0, 0, 100, 100);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine rect
    let box: any;
    for (let attempt = 0; ; attempt++) {
      const before = contentBox();
      const pos = pg.getPosition(view.getViewConfiguration().multiPageView);
      view.zoomAtCenter(before.getSide(G.GRect.Side.CENTER).add(pos), z);
      await app.corpus.settle();
      box = contentBox();
      const want = view.getViewBox().getSide(G.GRect.Side.CENTER);
      const got = view.getWorldTransform(pg).mapPoint(box.getSide(G.GRect.Side.CENTER));
      if (
        G.GRect.equals(box, before) &&
        Math.abs(want.getX() - got.getX()) <= 1 &&
        Math.abs(want.getY() - got.getY()) <= 1
      )
        break;
      if (attempt >= 20) throw new Error("zoomAndMeasure: content does not stay centered");
      await new Promise((r) => setTimeout(r, 250));
    }
    // One full repaint from scratch, so the pixels do not depend on how the
    // earlier partial repaints were split into dirty areas.
    view.cleanCache();
    view.invalidate(null, true);
    await app.corpus.settle();
    // The view box without the 8px next to the panels, whose CSS shadows
    // fall onto the canvas.
    const area = view.getViewBox(true).expanded(-8, -8, -8, -8);
    const mapped = view.getWorldTransform(pg).mapRect(box);
    // At most 640 x 640 pixels around the middle of the content, to keep
    // the expected files small; that still shows every zoom level in detail.
    const mid = mapped.getSide(G.GRect.Side.CENTER);
    const cap = new G.GRect(mid.getX() - 320, mid.getY() - 320, 640, 640);
    const r = mapped.expanded(24, 24, 24, 24).intersected(area)?.intersected(cap);
    if (!r || r.isEmpty()) throw new Error("zoomAndMeasure: content is not visible at zoom " + z);
    const x = Math.floor(r.getX());
    const y = Math.floor(r.getY());
    return {
      x,
      y,
      width: Math.ceil(r.getX() + r.getWidth()) - x,
      height: Math.ceil(r.getY() + r.getHeight()) - y,
    };
  }, zoom);
}

async function renderZooms(page: Page): Promise<Buffer> {
  const shots: Buffer[] = [];
  for (const z of ZOOMS) {
    const clip = await zoomAndMeasure(page, z);
    shots.push(await stableScreenshot(page, clip));
  }
  return stack(shots);
}

/**
 * Takes screenshots of `clip` until two in a row are identical. Under heavy
 * load a capture has been seen to show a half-composited frame (parts of
 * the toolbar and black areas where the canvas should be).
 */
async function stableScreenshot(page: Page, clip: Clip): Promise<Buffer> {
  let last = await page.screenshot({ clip });
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    const next = await page.screenshot({ clip });
    if (next.equals(last)) return next;
    last = next;
  }
  throw new Error("stableScreenshot: the canvas keeps changing");
}

async function pageBitmaps(page: Page): Promise<Buffer> {
  const urls = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine objects
    const { G, app } = (window as unknown as { __parity: { G: any; app: any } }).__parity;
    const out: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine page
    app.scene().iteratePages((pg: any) => {
      const box = pg.getPaintBBox();
      if (!box || box.isEmpty()) return;
      const scale = Math.min(1, 480 / Math.max(box.getWidth(), box.getHeight()));
      const bmp = pg.toBitmap(scale, scale, 0, null);
      if (bmp) out.push(bmp.toImageDataUrl(G.GBitmap.ImageType.PNG));
    }, true);
    return out;
  });
  return stack(urls.map((u) => Buffer.from(u.split(",")[1] ?? "", "base64")));
}

function scenariosFor(file: string, meta: CorpusDocument): Scenario[] {
  const id = `corpus/${meta.name}`;
  return [
    {
      id: `${id}/document`,
      covers: [...LOAD_COVERS, ...meta.covers],
      kind: "document",
      dropKeys: ["_preview"],
      driver: async ({ page }) => {
        await openCorpusFile(page, file);
        const json = await page.evaluate(() =>
          (window as unknown as ParityPage).__parity.app.serialize({ save: true }),
        );
        return stabilizeIds(json);
      },
    },
    {
      id: `${id}/resave`,
      covers: RESAVE_COVERS,
      kind: "json",
      driver: async ({ page }) => {
        await openCorpusFile(page, file);
        const serialized = await page.evaluate(() =>
          (window as unknown as ParityPage).__parity.app.serialize({ save: true }),
        );
        const bytes = await resave(page);
        const { json, preview } = previewOf(bytes);
        const rest = JSON.parse(json) as Record<string, Json>;
        delete rest._preview;
        const same =
          JSON.stringify(normalizeDocument(rest)) ===
          JSON.stringify(normalizeDocument(JSON.parse(serialized) as Json));
        let image: { mime: string; width: number; height: number } | null = null;
        if (typeof preview === "string") {
          const decoded = await decodeInPage(page, preview);
          image = {
            mime: /^data:([^;,]+)/.exec(preview)?.[1] ?? "",
            width: decoded.width,
            height: decoded.height,
          };
        }
        return {
          gzipMagic: bytes.subarray(0, 2).toString("hex"),
          firstKey: json.slice(0, 12),
          preview: image,
          restEqualsSerializedScene: same,
        };
      },
    },
    {
      id: `${id}/preview`,
      covers: PREVIEW_COVERS,
      kind: "png",
      driver: async ({ page }) => {
        await openCorpusFile(page, file);
        const { preview } = previewOf(await resave(page));
        if (typeof preview !== "string") throw new Error(`${meta.name}: saved without a preview`);
        return (await decodeInPage(page, preview)).png;
      },
    },
    ...(["light", "dark"] as const).map((theme): Scenario => ({
      id: `${id}/render-${theme}`,
      covers: [...RENDER_COVERS, ...meta.covers],
      kind: "png",
      open: { theme },
      // WebGL effects at 400% render slowly in software GL.
      timeout: 300_000,
      driver: async ({ page }) => {
        await openCorpusFile(page, file);
        return renderZooms(page);
      },
    })),
    {
      id: `${id}/bitmap`,
      covers: [...BITMAP_COVERS, ...meta.covers],
      kind: "png",
      driver: async ({ page }) => {
        await openCorpusFile(page, file);
        return pageBitmaps(page);
      },
    },
  ];
}

const metadata = new Map([...CORPUS_DOCUMENTS, ...EXTRA_FILES].map((d) => [d.name, d]));
const files = fs
  .readdirSync(FILES)
  .filter((f) => f.endsWith(".gvdesign"))
  .sort();

/** Corpus scenarios of the given kinds (the last part of their id). */
export function corpusScenarios(kinds: readonly string[]): Scenario[] {
  return defineScenarios(
    files.flatMap((f) => {
      const meta = metadata.get(path.basename(f, ".gvdesign"));
      if (!meta) throw new Error(`corpus file ${f} has no entry in corpus/documents.ts`);
      return scenariosFor(path.join(FILES, f), meta).filter((s) =>
        kinds.includes(s.id.slice(s.id.lastIndexOf("/") + 1)),
      );
    }),
  );
}
