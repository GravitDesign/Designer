// Node-side helpers for the import/export scenarios: fixture files, file
// pickers and downloads, PDF normalization, ZIP listings and the reference
// PDF renderer. Drivers only use real input, DOM selectors and the
// documented app hooks, so they run unchanged against the new app.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { NEXT_ROOT, OLD_URL } from "../../support/env.ts";
import { PARITY_CONTEXT } from "../../support/apps.ts";
import { normalizePdfString } from "./pdf-normalize.ts";
import { normalizeSvg } from "./normalize-ids.ts";

export { normalizeSvg };

export const FIXTURES = path.join(NEXT_ROOT, "parity", "fixtures", "import");

export function fixture(rel: string): string {
  return path.join(FIXTURES, rel);
}

export function fixtureBase64(rel: string): string {
  return fs.readFileSync(fixture(rel)).toString("base64");
}

export function sha256(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/**
 * normalizePdfString on a Buffer (see pdf-normalize.ts). `since` is when
 * the export started (Date.now() before the step that produced the file);
 * the export must have ended by now.
 */
export function normalizePdf(input: Buffer, since: number): Buffer {
  return Buffer.from(normalizePdfString(input.toString("latin1"), since, Date.now()), "latin1");
}

/** An export's bytes made comparable: PDFs and SVGs normalized, others as they are. */
export function normalizeExport(name: string, data: Buffer, since: number): Buffer {
  if (name.endsWith(".pdf")) return normalizePdf(data, since);
  if (name.endsWith(".svg")) return Buffer.from(normalizeSvg(data.toString("utf8")), "utf8");
  return data;
}

export interface ZipEntry {
  name: string;
  size: number;
  sha256: string;
}

/**
 * Lists a ZIP's entries in archive order with their uncompressed size and
 * a hash of their content (PDF and SVG entries normalized first, see
 * normalizeExport). Entry dates (zip.js writes the export time) and
 * compression details are left out on purpose.
 */
export function zipEntries(buf: Buffer, since: number): ZipEntry[] {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("not a zip file");
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out: ZipEntry[] = [];
  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("bad central directory");
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const lNameLen = buf.readUInt16LE(local + 26);
    const lExtraLen = buf.readUInt16LE(local + 28);
    const start = local + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + csize);
    const data = normalizeExport(
      name,
      method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw),
      since,
    );
    out.push({ name, size: data.length, sha256: name.endsWith("/") ? "" : sha256(data) });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/** Extracts one entry's content from a ZIP. */
export function zipEntry(buf: Buffer, wanted: string): Buffer {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < total; i++) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    if (name === wanted) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const raw = buf.subarray(start, start + csize);
      return method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`no entry ${wanted}`);
}

export interface Download {
  name: string;
  data: Buffer;
  /** Date.now() just before the step that caused the download. */
  since: number;
}

/** Runs `trigger` and returns the browser download it causes. */
export async function captureDownload(
  page: Page,
  trigger: () => Promise<unknown>,
  timeout = 30_000,
): Promise<Download> {
  const since = Date.now();
  const pending = page.waitForEvent("download", { timeout });
  await trigger();
  const dl = await pending;
  const file = await dl.path();
  return { name: dl.suggestedFilename(), data: fs.readFileSync(file), since };
}

/** Runs `trigger`, which must open a file chooser, and picks `files`. */
export async function chooseFiles(
  page: Page,
  trigger: () => Promise<unknown>,
  files: { name: string; buffer: Buffer; mimeType?: string }[],
): Promise<{ multiple: boolean; accept: string | null }> {
  const pending = page.waitForEvent("filechooser", { timeout: 10_000 });
  await trigger();
  const chooser = await pending;
  const accept = await chooser.element().evaluate((e) => (e as Element).getAttribute("accept"));
  await chooser.setFiles(
    files.map((f) => ({
      name: f.name,
      mimeType: f.mimeType ?? mimeFor(f.name),
      buffer: f.buffer,
    })),
  );
  return { multiple: chooser.isMultiple(), accept };
}

export function mimeFor(name: string): string {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  const table: Record<string, string> = {
    svg: "image/svg+xml",
    svgz: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    heic: "image/heic",
    pdf: "application/pdf",
    ai: "application/postscript",
    eps: "application/postscript",
    ps: "application/postscript",
    sketch: "application/zip",
    ttf: "font/ttf",
    otf: "font/otf",
    gvdesign: "application/octet-stream",
  };
  return table[ext] ?? "application/octet-stream";
}

/** A fixture file as a file-chooser / drop payload. */
export function fixtureFile(rel: string, name?: string): { name: string; buffer: Buffer } {
  return { name: name ?? path.basename(rel), buffer: fs.readFileSync(fixture(rel)) };
}

interface IoWindow {
  __parity: {
    app: {
      serialize(o?: unknown): string;
      importExport: { documents(): { title: string; status: string }[]; settle(): Promise<void> };
    };
  };
}

/** The open documents (title and load status), through the contract hook. */
export async function documents(page: Page): Promise<{ title: string; status: string }[]> {
  return page.evaluate(() => (window as unknown as IoWindow).__parity.app.importExport.documents());
}

/** What waitForImport compares: the document count and the size of the active scene. */
export async function importCounts(page: Page): Promise<{ docs: number; size: number }> {
  return page.evaluate(() => {
    const app = (window as unknown as IoWindow).__parity.app;
    return { docs: app.importExport.documents().length, size: app.serialize().length };
  });
}

/**
 * Waits until an import started by the user finished or asks something:
 * a dialog is showing, or no document is still loading ("Init" before its
 * load starts, or "Loading"), no progress overlay (.window-overlay) is
 * visible, and either the document count reached `minDocs` or the
 * serialized active scene's length differs from `size`. Then waits for images, textures and
 * fonts. Returns "done", or "timeout" when that did not happen within
 * `timeout` ms (the old app hangs on some EPS files, see
 * eps/arc-closepath.eps).
 */
export async function waitForImport(
  page: Page,
  expect: { minDocs?: number; size?: number },
  timeout = 60_000,
): Promise<"done" | "timeout"> {
  try {
    await page.waitForFunction(
      (e) => {
        const app = (window as unknown as IoWindow).__parity.app;
        const docs = app.importExport.documents();
        const visible = (sel: string) =>
          [...document.querySelectorAll(sel)].some((d) => (d as HTMLElement).offsetParent !== null);
        // A dialog during a load asks the user something (AI check, fonts).
        if (visible(".g-dialog")) return true;
        if (
          docs.some((d) => d.status === "Init" || d.status === "Loading") ||
          visible(".window-overlay")
        )
          return false;
        if (e.minDocs !== undefined && docs.length >= e.minDocs) return true;
        return e.size !== undefined && app.serialize().length !== e.size;
      },
      expect,
      { timeout, polling: 100 },
    );
  } catch {
    return "timeout";
  }
  await page.evaluate(async () => {
    await (window as unknown as IoWindow).__parity.app.importExport.settle();
  });
  return "done";
}

/** waitForImport for opened files: at least `minCount` documents. */
export async function waitForDocuments(
  page: Page,
  minCount: number,
  timeout = 60_000,
): Promise<"done" | "timeout"> {
  return waitForImport(page, { minDocs: minCount }, timeout);
}

/** Texts of the visible dialogs and alerts, top to bottom. */
export async function visibleDialogs(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll(".g-dialog, .g-alert, .g-overlay .g-dialog-content")]
      .filter((d) => (d as HTMLElement).offsetParent !== null)
      .map((d) => (d as HTMLElement).innerText.replace(/\s+/g, " ").trim())
      .filter((t, i, all) => t && all.indexOf(t) === i),
  );
}

// ---------------------------------------------------------------------------
// Reference PDF renderer
//
// A PDF from either app is rendered with the pdf.js 2.1.286 that ships with
// the old app (webpack module 792), always in an old-app page, so the
// renderer is the same no matter which app produced the file. One page per
// browser is kept open and reused.

const referencePages = new WeakMap<Browser, Promise<Page>>();

async function referencePage(browser: Browser): Promise<Page> {
  let p = referencePages.get(browser);
  if (!p) {
    p = (async () => {
      const context: BrowserContext = await browser.newContext({
        ...PARITY_CONTEXT,
        viewport: { width: 800, height: 600 },
      });
      await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => route.abort());
      const page = await context.newPage();
      await page.goto(OLD_URL);
      // Only the old bundle's modules are needed, not a booted editor.
      await page.waitForFunction(
        () =>
          document.readyState === "complete" &&
          Array.isArray(
            (window as unknown as { webpackJsonpGravitDesigner?: unknown[] })
              .webpackJsonpGravitDesigner,
          ),
        null,
        { timeout: 60_000 },
      );
      await page.evaluate(() => {
        const w = window as unknown as {
          webpackJsonpGravitDesigner: unknown[];
          __refRequire?: (id: number) => unknown;
        };
        w.webpackJsonpGravitDesigner.push([
          [987655],
          {
            gdParityPdfRef: (_m: unknown, _e: unknown, r: (id: number) => unknown) => {
              w.__refRequire = r;
            },
          },
          [["gdParityPdfRef"]],
        ]);
        // The importer registry (module 1201) sets pdf.js's workerSrc.
        w.__refRequire?.(1201);
      });
      return page;
    })();
    referencePages.set(browser, p);
  }
  return p;
}

/**
 * Renders every page of a PDF at `scale` (1 = 72 dpi) on white and stacks
 * them vertically with a 4 px grey gap. Returns a PNG data URL.
 */
export async function renderPdf(page: Page, pdf: Buffer, scale = 1): Promise<string> {
  // pdf.js loads embedded fonts asynchronously; the first render of a file
  // can still use a fallback font. Render until two renders agree.
  let last = await renderPdfOnce(page, pdf, scale);
  for (let i = 0; i < 4; i++) {
    const next = await renderPdfOnce(page, pdf, scale);
    if (next === last) return next;
    last = next;
  }
  throw new Error("pdf render did not settle");
}

async function renderPdfOnce(page: Page, pdf: Buffer, scale: number): Promise<string> {
  const browser = page.context().browser();
  if (!browser) throw new Error("no browser");
  const ref = await referencePage(browser);
  return ref.evaluate(
    async ({ b64, s }) => {
      const w = window as unknown as { __refRequire: (id: number) => unknown };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf.js 2.1 has no types here
      const pdfjs = w.__refRequire(792) as any;
      const bin = atob(b64);
      const data = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
      const doc = await pdfjs.getDocument({ data, disableCMYKToRGB: true }).promise;
      const canvases: HTMLCanvasElement[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const pg = await doc.getPage(i);
        const vp = pg.getViewport({ scale: s });
        const c = document.createElement("canvas");
        c.width = Math.ceil(vp.width);
        c.height = Math.ceil(vp.height);
        // Software canvases only: Chrome moves a canvas between GPU and
        // software rendering by heuristics (readbacks), and the two draw
        // shadings with different pixels.
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("no 2d context");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        const canvasFactory = {
          create: (width: number, height: number) => {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            return { canvas, context: canvas.getContext("2d", { willReadFrequently: true }) };
          },
          reset: (cc: { canvas: HTMLCanvasElement }, width: number, height: number) => {
            cc.canvas.width = width;
            cc.canvas.height = height;
          },
          destroy: (cc: { canvas: HTMLCanvasElement }) => {
            cc.canvas.width = 0;
            cc.canvas.height = 0;
          },
        };
        await pg.render({ canvasContext: ctx, viewport: vp, canvasFactory }).promise;
        canvases.push(c);
      }
      await doc.destroy();
      const width = Math.max(...canvases.map((c) => c.width));
      const height = canvases.reduce((h, c) => h + c.height, 0) + 4 * (canvases.length - 1);
      const out = document.createElement("canvas");
      out.width = width;
      out.height = height;
      const octx = out.getContext("2d", { willReadFrequently: true });
      if (!octx) throw new Error("no 2d context");
      octx.fillStyle = "#808080";
      octx.fillRect(0, 0, width, height);
      let y = 0;
      for (const c of canvases) {
        octx.drawImage(c, 0, y);
        y += c.height + 4;
      }
      return out.toDataURL("image/png");
    },
    { b64: pdf.toString("base64"), s: scale },
  );
}

// ---------------------------------------------------------------------------
// Menus, dialogs and in-page calls

/** Opens a main-menu path and clicks its last item, like a user. */
export async function clickMenu(page: Page, menuPath: readonly string[]): Promise<void> {
  const [top, ...rest] = menuPath;
  if (!top) throw new Error("empty menu path");
  const open = page.locator("ul.g-menu:not(.g-menu-root):visible");
  await page
    .locator("nav.g-menu-bar ul.g-menu-root > li.g-menu-item", {
      has: page.locator(`:scope > .g-menu-item-caption:text-is("${top}")`),
    })
    .click();
  for (let depth = 0; depth < rest.length; depth++) {
    await open.nth(depth).waitFor({ state: "visible" });
    const item = open
      .nth(depth)
      .locator(":scope > li.g-menu-item", {
        has: page.locator(`:scope > .g-menu-item-caption:text-is("${rest[depth]}")`),
      })
      .first();
    if (depth < rest.length - 1) await item.hover();
    else await item.click();
  }
  // A clicked item closes the menu; a disabled one leaves it open.
  await page
    .waitForFunction(
      () =>
        ![...document.querySelectorAll("ul.g-menu:not(.g-menu-root)")].some(
          (m) => (m as HTMLElement).offsetParent !== null,
        ),
      null,
      { timeout: 2000 },
    )
    .catch(() => undefined);
}

/** Runs an in-page scenario function (from inPageWithLib) with args. */
export async function runInPage<T>(
  page: Page,
  fn: { toString(): string },
  args: unknown,
): Promise<T> {
  return (await page.evaluate(`(${fn.toString()})(window.__parity, ${JSON.stringify(args)})`)) as T;
}

/** Clicks a button with this exact text in the top visible dialog and waits until it closed. */
export async function clickDialogButton(page: Page, text: string): Promise<void> {
  const button = page.locator(`.g-dialog:visible button:text-is("${text}")`).last();
  const handle = await button.elementHandle();
  await button.click();
  await handle?.waitForElementState("hidden");
}

/** Closes the visible dialogs by clicking their last button (OK / Close). */
export async function closeDialogs(page: Page): Promise<void> {
  for (let i = 0; i < 5; i++) {
    const buttons = page.locator(".g-dialog:visible button:visible");
    if ((await buttons.count()) === 0) return;
    const handle = await buttons.last().elementHandle();
    await buttons.last().click();
    await handle?.waitForElementState("hidden");
  }
}
