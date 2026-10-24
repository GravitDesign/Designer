// Corpus scenarios (used by the *.spec.ts files here, split so two
// workers can run them side by side): every .gvdesign file in
// parity/corpus/files is opened through File > Open Local File and checked
// these ways:
//
// - document: the loaded scene, serialized as a save would (load check).
//   Ids from the file must survive (keepIdsOf).
// - resave: File > Download File again: the gzip header, the preview's
//   type and size and the whole saved document, gunzipped.
// - preview: the JPEG embedded by that save, decoded and stored as PNG.
// - render-light / render-dark: the top left of the canvas area with the
//   rulers at 25% (theme colours), then the content at 25%, 33%,
//   100% and 400% zoom, stacked top to bottom.
// - bitmap: every page rendered offscreen with GElement.toBitmap, the API
//   export and the preview use, stacked top to bottom.
import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { NEXT_ROOT } from "../../support/env.ts";
import { normalizeDocument, type Json } from "../../support/normalize.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { CORPUS_DOCUMENTS, EXTRA_FILES, type CorpusDocument } from "../../corpus/documents.ts";
import {
  CORPUS_DIR,
  canvasArea,
  decodeInPage,
  downloadSave,
  fileJson,
  gzipHeader,
  openFile,
  renameDeepIds,
  serializeActive,
  stableScreenshot,
  stack,
  type Clip,
} from "./lib.ts";

const FILES = path.join(NEXT_ROOT, CORPUS_DIR);

/** Zoom levels of the canvas renders, in render order. */
const ZOOMS = [0.25, 0.33, 1, 4];

/** Smallest crop of a zoom level; smaller content gets this much around it. */
const MIN_CROP = 128;

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
/**
 * What a finished full render of the canvas shows. The partial repaint,
 * pan reuse, tile cache and paint modes are checked by view.spec.ts, which
 * compares them against full renders like these.
 */
const RENDER_COVERS = [
  "EDT-RENDER-003",
  "EDT-RENDER-005",
  "EDT-RENDER-012",
  "EDT-RENDER-013",
  "EDT-RENDER-021",
  "EDT-RENDER-026",
  "EDT-RENDER-027",
  "EDT-RENDER-028",
  "EDT-RENDER-042",
  "EDT-RENDER-043",
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
  "ENG-SCENE-012",
];
const BITMAP_COVERS = ["EDT-RENDER-014", "EDT-PAINT-049", "EDT-PAINT-050", "ENG-NODE-012"];

/**
 * Zooms the view to `zoom` around the active page's content, waits until
 * rendering has finished and returns the part of the canvas that shows the
 * content (plus 24px of surroundings, at least MIN_CROP square), clipped to
 * the visible view box and to 640 x 640 pixels around the content center.
 */
export async function zoomAndMeasure(page: Page, zoom: number, minCrop = MIN_CROP): Promise<Clip> {
  return page.evaluate(
    async ({ z, min }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine objects
      const { G, app } = (window as unknown as { __parity: { G: any; app: any } }).__parity;
      const view = app.view();
      const scene = app.scene();
      const pg = scene.getActivePage();
      // Drop the tiles cached at earlier zoom levels (the first render after
      // opening can take a different WebGL path), so every zoom level is
      // rendered fresh.
      view.cleanCache();
      // The content: the page itself when it has a size, and the union of
      // its children's geometry boxes (the page's own box is empty for an
      // infinite page that holds only text). Geometry, not paint boxes:
      // effect paddings (long shadows) can make the paint box differ from
      // one load to the next. A child without geometry adds its paint box.
      const contentBox = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine rect
        let box: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine rect
        const add = (r: any) => {
          if (!r || r.isEmpty()) return;
          box = box ? box.united(r) : r;
        };
        if (pg.isFixedSized()) add(new G.GRect(0, 0, pg.getProperty("w"), pg.getProperty("h")));
        for (let c = pg.getFirstChild(); c; c = c.getNext()) {
          const geo = c.getGeometryBBox();
          add(geo && !geo.isEmpty() ? geo : c.getPaintBBox());
        }
        return box || new G.GRect(0, 0, 100, 100);
      };
      // Zoom until the content center lands in the middle of the view box and
      // the content box stops changing: the panels can still change size right
      // after a document opens, and some bounding boxes (paths graph) are only
      // known after the first paint.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine rect
      let box: any;
      // Three checks in a row must agree: text on a path and some others get
      // their final box only after a few paints, later under load.
      let stable = 0;
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
        ) {
          if (++stable >= 3) break;
          continue;
        }
        stable = 0;
        if (attempt >= 30) throw new Error("zoomAndMeasure: content does not stay centered");
        // The layout is still moving; look again on the next frames.
        await app.corpus.settle();
      }
      // One full repaint from scratch, so the pixels do not depend on how the
      // earlier partial repaints were split into dirty areas.
      view.cleanCache();
      view.invalidate(null, true);
      await app.corpus.settle();
      // The view box without the 8px next to the panels, whose CSS shadows
      // fall onto the canvas.
      // The rulers lie over the top and left of the view box, so the crop
      // starts below and right of them.
      let area = view.getViewBox(true).expanded(-8, -8, -8, -8);
      for (const el of document.querySelectorAll(".g-ruler-widget")) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const l = area.getX();
        const t = area.getY();
        if (rect.width > rect.height && rect.bottom > t) {
          area = new G.GRect(l, rect.bottom, area.getWidth(), area.getHeight() - (rect.bottom - t));
        } else if (rect.height > rect.width && rect.right > l) {
          area = new G.GRect(rect.right, t, area.getWidth() - (rect.right - l), area.getHeight());
        }
      }
      let mapped = view.getWorldTransform(pg).mapRect(box).expanded(24, 24, 24, 24);
      const mid = mapped.getSide(G.GRect.Side.CENTER);
      if (mapped.getWidth() < min || mapped.getHeight() < min) {
        const w = Math.max(min, mapped.getWidth());
        const h = Math.max(min, mapped.getHeight());
        mapped = new G.GRect(mid.getX() - w / 2, mid.getY() - h / 2, w, h);
      }
      // At most 640 x 640 pixels around the middle of the content, to keep
      // the expected files small; that still shows every zoom level in detail.
      const cap = new G.GRect(mid.getX() - 320, mid.getY() - 320, 640, 640);
      const r = mapped.intersected(area)?.intersected(cap);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine rect
      const show = (b: any) =>
        b ? [b.getX(), b.getY(), b.getWidth(), b.getHeight()].join(",") : "null";
      if (!r || r.getWidth() < 100 || r.getHeight() < 100) {
        throw new Error(
          "zoomAndMeasure: the crop at zoom " +
            z +
            " is under 100 x 100 (area " +
            show(area) +
            ", content " +
            show(mapped) +
            ", crop " +
            show(r) +
            ")",
        );
      }
      if (!G.GRect.equals(contentBox(), box)) {
        throw new Error("zoomAndMeasure: the content box changed during the repaint");
      }
      const x = Math.floor(r.getX());
      const y = Math.floor(r.getY());
      return {
        x,
        y,
        width: Math.ceil(r.getX() + r.getWidth()) - x,
        height: Math.ceil(r.getY() + r.getHeight()) - y,
      };
    },
    { z: zoom, min: minCrop },
  );
}

/**
 * zoomAndMeasure, measured again (up to three times) when the crop came out
 * under 100 x 100 or the content box moved during the repaint: under heavy
 * load the panels and late text layout have been seen to change them right
 * after the measurement. Content that really is that small fails every
 * time.
 */
async function measureWithRetry(page: Page, zoom: number): Promise<Clip> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await zoomAndMeasure(page, zoom, MIN_CROP);
    } catch (error) {
      if (attempt >= 3 || !/under 100 x 100|changed during the repaint/.test(String(error)))
        throw error;
    }
  }
}

/** Shows the rulers (setting rulers_visible) through View > Rulers if needed. */
async function showRulers(page: Page): Promise<void> {
  const visible = await page.evaluate(() =>
    [...document.querySelectorAll(".g-ruler-widget")].some(
      (el) => el.getBoundingClientRect().width > 0,
    ),
  );
  if (!visible) {
    await page.evaluate(() =>
      (
        window as unknown as { __parity: { app: { execute(id: string): void } } }
      ).__parity.app.execute("view.canvas.show-rulers"),
    );
  }
}

/** Zoom and scroll of the active view. */
async function viewKey(page: Page): Promise<string> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine objects
    const { app } = (window as unknown as { __parity: { app: any } }).__parity;
    const v = app.view();
    const b = v.getViewBox(true);
    return [
      v.getZoom(),
      v.getScrollX(),
      v.getScrollY(),
      b.getX(),
      b.getY(),
      b.getWidth(),
      b.getHeight(),
    ].join(",");
  });
}

/**
 * A crop of the content at `zoom`, taken again (up to three times) when the
 * view scrolled or resized between measuring and taking the shot, which
 * has happened under heavy load.
 */
async function zoomShot(page: Page, zoom: number): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    const clip = await measureWithRetry(page, zoom);
    const before = await viewKey(page);
    const shot = await stableScreenshot(page, clip);
    if ((await viewKey(page)) === before) return shot;
    if (attempt >= 3) throw new Error("renderZooms: the view keeps moving at zoom " + zoom);
  }
}

async function renderZooms(page: Page): Promise<Buffer> {
  await showRulers(page);
  const shots: Buffer[] = [];
  for (const z of ZOOMS) {
    const shot = await zoomShot(page, z);
    if (z === ZOOMS[0]) {
      // The top left of the canvas area: the rulers and the canvas around
      // the content, which differ per theme. The page edges and the
      // background outside fixed pages show in the zoom crops below.
      const area = await canvasArea(page);
      const corner = {
        ...area,
        width: Math.min(area.width, 400),
        height: Math.min(area.height, 300),
      };
      shots.push(await stableScreenshot(page, corner));
    }
    shots.push(shot);
  }
  return stack(shots);
}

export async function pageBitmaps(page: Page): Promise<Buffer> {
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

/**
 * File > Download File, again (up to three times) while the file comes out
 * without a preview. The old app gives the preview 4 s and saves without
 * it after that (FMT-PREVIEW-001); under heavy parallel load the preview
 * of a text document has missed that window. A file that never gets a
 * preview (no page content) is saved three times and recorded without.
 */
export async function saveWithPreview(page: Page): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    const bytes = await downloadSave(page);
    const saved = JSON.parse(fileJson(bytes)) as Record<string, unknown>;
    if (typeof saved._preview === "string" || attempt >= 3) return bytes;
  }
}

/**
 * What File > Download File writes for the active document: the gzip
 * header, the first key, the preview's type and size, whether the rest
 * equals the serialized scene, and the saved document itself (without the
 * preview, which the preview scenario compares as pixels).
 */
export async function savedFile(page: Page): Promise<string> {
  const serialized = await serializeActive(page);
  const bytes = await saveWithPreview(page);
  const json = fileJson(bytes);
  const saved = JSON.parse(json) as Record<string, Json>;
  const preview = saved._preview;
  let image: { mime: string; width: number; height: number } | null = null;
  if (typeof preview === "string") {
    const decoded = await decodeInPage(page, preview);
    image = {
      mime: /^data:([^;,]+)/.exec(preview)?.[1] ?? "",
      width: decoded.width,
      height: decoded.height,
    };
  }
  const rest = { ...saved };
  delete rest._preview;
  return JSON.stringify({
    gzip: gzipHeader(bytes),
    firstKey: json.slice(0, 12),
    preview: image,
    restEqualsSerializedScene:
      JSON.stringify(normalizeDocument(rest)) ===
      JSON.stringify(normalizeDocument(JSON.parse(serialized) as Json)),
    document: rest,
  });
}

function scenariosFor(file: string, meta: CorpusDocument): Scenario[] {
  const id = `corpus/${meta.name}`;
  const keepIdsOf = `${CORPUS_DIR}/${path.basename(file)}`;
  // Booting, loading and WebGL effects in software GL take long while other
  // suites run in parallel; the default 120 s has run out under that load.
  const timeout = 300_000;
  return [
    {
      id: `${id}/document`,
      covers: [...LOAD_COVERS, ...meta.covers],
      kind: "document",
      dropKeys: ["_preview"],
      keepIdsOf,
      timeout,
      driver: async ({ page }) => {
        await openFile(page, file);
        return renameDeepIds(await serializeActive(page), keepIdsOf);
      },
    },
    {
      id: `${id}/resave`,
      covers: RESAVE_COVERS,
      kind: "document",
      keepIdsOf,
      timeout,
      driver: async ({ page }) => {
        await openFile(page, file);
        return renameDeepIds(await savedFile(page), keepIdsOf);
      },
    },
    {
      id: `${id}/preview`,
      covers: PREVIEW_COVERS,
      kind: "png",
      timeout,
      driver: async ({ page }) => {
        await openFile(page, file);
        const preview = (
          JSON.parse(fileJson(await saveWithPreview(page))) as Record<string, unknown>
        )._preview;
        if (typeof preview !== "string") throw new Error(`${meta.name}: saved without a preview`);
        return (await decodeInPage(page, preview)).png;
      },
    },
    ...(["light", "dark"] as const).map((theme): Scenario => ({
      id: `${id}/render-${theme}`,
      covers: [...RENDER_COVERS, ...meta.covers],
      kind: "png",
      open: { theme, settings: { rulers_visible: true } },
      // WebGL effects at 400% render slowly in software GL.
      timeout: 300_000,
      driver: async ({ page }) => {
        await openFile(page, file);
        return renderZooms(page);
      },
    })),
    {
      id: `${id}/bitmap`,
      covers: [...BITMAP_COVERS, ...meta.covers],
      kind: "png",
      timeout,
      driver: async ({ page }) => {
        await openFile(page, file);
        return pageBitmaps(page);
      },
    },
  ];
}

const metadata = new Map([...CORPUS_DOCUMENTS, ...EXTRA_FILES].map((d) => [d.name, d]));
/** Names of the corpus files, sorted. */
export const corpusNames = fs
  .readdirSync(FILES)
  .filter((f) => f.endsWith(".gvdesign"))
  .map((f) => path.basename(f, ".gvdesign"))
  .sort();

export function corpusMeta(name: string): CorpusDocument {
  const meta = metadata.get(name);
  if (!meta) throw new Error(`corpus file ${name}.gvdesign has no entry in corpus/documents.ts`);
  return meta;
}

/** Corpus scenarios of the given kinds (the last part of their id). */
export function corpusScenarios(kinds: readonly string[]): Scenario[] {
  return defineScenarios(
    corpusNames.flatMap((name) =>
      scenariosFor(path.join(FILES, `${name}.gvdesign`), corpusMeta(name)).filter((s) =>
        kinds.includes(s.id.slice(s.id.lastIndexOf("/") + 1)),
      ),
    ),
  );
}
