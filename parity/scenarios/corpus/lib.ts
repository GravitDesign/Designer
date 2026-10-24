// Helpers shared by the corpus, view and compat scenarios. Everything here
// drives the app through actions, DOM input and window.__parity hooks (see
// contract.ts), so the same code runs against both apps.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { Page } from "@playwright/test";
import { PNG } from "pngjs";
import { NEXT_ROOT } from "../../support/env.ts";
import { documentIds, type Json } from "../../support/normalize.ts";
import type { CorpusHooks } from "./contract.ts";

/** The corpus files, as paths from the repo root (what keepIdsOf expects). */
export const CORPUS_DIR = "parity/corpus/files";
/** Edge-case files (parity/corpus/edge/README.md). */
export const EDGE_DIR = "parity/corpus/edge";

export function corpusFile(name: string): string {
  return path.join(NEXT_ROOT, CORPUS_DIR, `${name}.gvdesign`);
}

interface ParityApp {
  execute(id: string): void;
  serialize(options: unknown): string;
  editor(): { clearSelection(): void };
  corpus: CorpusHooks;
}
export type ParityPage = Window & { __parity: { app: ParityApp } };

/**
 * Opens a file through File > Open Local File: the app's file input is
 * answered through Playwright's file chooser, as a user would pick it.
 */
export async function openFile(page: Page, file: string): Promise<void> {
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
    path.basename(file).replace(/\.gvdesign$/, ""),
  );
}

/** The active document, serialized as a save does. */
export async function serializeActive(page: Page): Promise<string> {
  return page.evaluate(() =>
    (window as unknown as ParityPage).__parity.app.serialize({ save: true }),
  );
}

/** Saves the active document through File > Download File; the file's bytes. */
export async function downloadSave(page: Page): Promise<Buffer> {
  const download = page.waitForEvent("download");
  await page.evaluate(() =>
    (window as unknown as ParityPage).__parity.app.execute("file.save-as.gvdesign"),
  );
  return fs.readFileSync(await (await download).path());
}

/** A gzip stream's JSON, or the text itself when the bytes are not gzip. */
export function fileJson(bytes: Buffer): string {
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return zlib.gunzipSync(bytes).toString("utf8");
  return bytes.toString("utf8");
}

/**
 * The gzip member header (RFC 1952): compression method, flags, mtime,
 * XFL (2 = the compressor used its slowest, best level, which pako level 9
 * writes) and OS.
 */
export function gzipHeader(bytes: Buffer): Record<string, number | string> {
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b)
    return { magic: bytes.subarray(0, 2).toString("hex") };
  return {
    magic: "1f8b",
    method: bytes[2] ?? -1,
    flags: bytes[3] ?? -1,
    mtime: bytes.readUInt32LE(4),
    xfl: bytes[8] ?? -1,
    os: bytes[9] ?? -1,
  };
}

/** Decodes an image data URL in the page and returns it as a PNG data URL. */
export async function decodeInPage(
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
export function stack(pngs: Buffer[]): Buffer {
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

export interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Takes screenshots of `clip` until two in a row are identical. Under heavy
 * load a capture has been seen to show a half-composited frame (parts of
 * the toolbar and black areas where the canvas should be).
 */
export async function stableScreenshot(page: Page, clip?: Clip): Promise<Buffer> {
  let last = await page.screenshot({ clip });
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    const next = await page.screenshot({ clip });
    if (next.equals(last)) return next;
    last = next;
  }
  throw new Error("stableScreenshot: the canvas keeps changing");
}

/** Waits until the active view has drawn everything (contract settle). */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as ParityPage).__parity.app.corpus.settle());
}

/**
 * The canvas area on screen: the view box plus the rulers when they are
 * shown, so a shot of it shows the theme's canvas background, the page
 * edges and the rulers.
 */
export async function canvasArea(page: Page): Promise<Clip> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine objects
    const { app } = (window as unknown as { __parity: { app: any } }).__parity;
    const vb = app.view().getViewBox(true);
    let l = vb.getX();
    let t = vb.getY();
    let r = l + vb.getWidth();
    let b = t + vb.getHeight();
    for (const el of document.querySelectorAll(".g-ruler-widget")) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      l = Math.min(l, rect.left);
      t = Math.min(t, rect.top);
      r = Math.max(r, rect.right);
      b = Math.max(b, rect.bottom);
    }
    const x = Math.floor(l);
    const y = Math.floor(t);
    return { x, y, width: Math.ceil(r) - x, height: Math.ceil(b) - y };
  });
}

/** Presses keys with the canvas focused, so shortcuts reach the editor. */
export async function focusCanvas(page: Page): Promise<void> {
  const area = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine objects
    const { app } = (window as unknown as { __parity: { app: any } }).__parity;
    const vb = app.view().getViewBox(true);
    return { x: vb.getX() + vb.getWidth() - 30, y: vb.getY() + vb.getHeight() - 30 };
  });
  // A click on empty canvas far from the content: it deselects and gives
  // the canvas the keyboard focus.
  await page.mouse.click(area.x, area.y);
  await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) active.blur();
  });
}

const ID_KEYS = new Set(["@id", "#", "&", "_effId", "_layId", "uuid"]);

/** Ids at the second or deeper level of JSON nested in strings. */
function deepIds(value: Json, depth: number, out: Set<string>): void {
  if (typeof value === "string") {
    const json = /^[A-Za-z]#([[{][\s\S]*)$/.exec(value)?.[1] ?? value;
    if (!/^[[{]/.test(json)) return;
    let parsed: Json;
    try {
      parsed = JSON.parse(json) as Json;
    } catch {
      return;
    }
    deepIds(parsed, depth + 1, out);
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => {
      const next = value[i + 1];
      if (depth >= 2 && (item === "#" || item === "&") && typeof next === "string") out.add(next);
      deepIds(item, depth, out);
    });
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (depth >= 2 && ID_KEYS.has(key) && typeof child === "string") out.add(child);
      else deepIds(child, depth, out);
    }
  }
}

/**
 * Renames random ids that sit in JSON nested two levels deep in strings,
 * such as the path a text-on-path keeps inside its `reftxt` copy. The
 * shared normalizer renames ids in JSON nested one level deep, but there
 * the inner JSON is escaped twice and it does not see them; the old app
 * gives these copies new ids on every load. Ids from the loaded file
 * (`keepFile`, a path from the repo root) stay as they are, the rest become
 * `deep1`, `deep2`, ... in order of first appearance, replaced in the text
 * so nothing is re-serialized.
 */
export function renameDeepIds(json: string, keepFile: string): string {
  let bytes = fs.readFileSync(path.join(NEXT_ROOT, keepFile));
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = zlib.gunzipSync(bytes);
  const keep = new Set(documentIds(JSON.parse(bytes.toString("utf8")) as Json));
  const found = new Set<string>();
  deepIds(JSON.parse(json) as Json, 0, found);
  let out = json;
  let n = 0;
  for (const id of found) {
    if (keep.has(id) || !/^[A-Za-z0-9]{6,}$/.test(id)) continue;
    out = out.split(id).join(`deep${++n}`);
  }
  return out;
}
