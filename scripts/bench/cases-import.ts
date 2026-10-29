// Large imports, one per importer the File > Open dialog reaches: SVG,
// PDF (which .ai files go through too), EPS, Sketch and bitmaps (PNG and
// JPEG). The files are generated (synthetic-files.ts) and cached in the
// inputs folder.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  bootWithDocument,
  type AppWindow,
  cached,
  closeActive,
  countNodes,
  openThroughUi,
  TMP,
  withMetrics,
  type Case,
  type Env,
  type Session,
} from "./drive.ts";
import type { Page } from "./lib.ts";
import { bigPdf, bigSketch, richEps, richSvg } from "./synthetic-files.ts";

/** Long enough for the slowest import to give a number; a failed open is reported at once. */
const LONG = 300_000;

/**
 * The generated files' names carry a hash of the generators' sources (and
 * of this file, which draws the bitmaps), so a change to them makes new
 * files instead of reusing cached ones.
 */
const VERSION = createHash("sha1")
  .update(fs.readFileSync(new URL("./synthetic-files.ts", import.meta.url)))
  .update(fs.readFileSync(new URL("./synthetic.ts", import.meta.url)))
  .update(fs.readFileSync(new URL(import.meta.url)))
  .digest("hex")
  .slice(0, 10);

/**
 * A bitmap of `w` x `h` drawn in the page (a gradient with seeded circles
 * and lines) and encoded by the browser's canvas.toBlob as `type`; base64.
 */
async function canvasImage(page: Page, w: number, h: number, type: string): Promise<string> {
  return page.evaluate(
    async ({ w, h, type }) => {
      let seed = 37;
      const rnd = (): number => {
        seed = (seed + 0x6d2b79f5) >>> 0;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#1d3557");
      g.addColorStop(0.5, "#a8dadc");
      g.addColorStop(1, "#e63946");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 3000; i++) {
        ctx.fillStyle = `hsla(${Math.floor(rnd() * 360)},70%,55%,${(0.2 + rnd() * 0.6).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(rnd() * w, rnd() * h, 5 + rnd() * 120, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      for (let i = 0; i < 1000; i++) {
        ctx.lineWidth = 1 + rnd() * 4;
        ctx.beginPath();
        ctx.moveTo(rnd() * w, rnd() * h);
        ctx.lineTo(rnd() * w, rnd() * h);
        ctx.stroke();
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
      if (!blob) throw new Error("canvas.toBlob gave nothing");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let text = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(text);
    },
    { w, h, type },
  );
}

interface BigImport {
  id: string;
  what: string;
  /** The file, made in Node or (with the session's page) in the browser. */
  file(s: Session): Promise<string>;
}

const BITMAP = { w: 6000, h: 4000 };

const BIG_IMPORTS: BigImport[] = [
  {
    id: "import-svg-20000",
    what: "File > Open a generated SVG with 20,000 elements: paths, rects, circles, ellipses, texts (3 in 10), embedded PNG images (1 in 40), linear and radial gradients",
    file: async () => cached(`bench-rich-20000-${VERSION}.svg`, () => richSvg(20_000)),
  },
  {
    id: "import-pdf-20pages",
    what: "File > Open a generated PDF of 20 pages, each with 600 curves, 150 text runs, 4 images and 4 gradient shadings (.ai files take the same path)",
    file: async () => cached(`bench-20pages-${VERSION}.pdf`, () => bigPdf(20, 600, 150)),
  },
  {
    id: "import-eps-4000",
    what: "File > Open a generated EPS with 4,000 objects: curves, texts (1 in 10), 16 x 16 images and gradient shadings (1 in 100 each)",
    file: async () => cached(`bench-rich-4000-${VERSION}.eps`, () => richEps(4000)),
  },
  {
    id: "import-png-6000x4000",
    what: `File > Open a ${BITMAP.w} x ${BITMAP.h} PNG (drawn and encoded by the browser)`,
    file: async (s) => {
      const name = `bench-${BITMAP.w}x${BITMAP.h}-${VERSION}.png`;
      if (fs.existsSync(path.join(TMP, name))) return path.join(TMP, name);
      const base64 = await canvasImage(s.page, BITMAP.w, BITMAP.h, "image/png");
      return cached(name, () => Buffer.from(base64, "base64"));
    },
  },
  {
    id: "import-jpeg-6000x4000",
    what: `File > Open a ${BITMAP.w} x ${BITMAP.h} JPEG (drawn and encoded by the browser, quality 0.9)`,
    file: async (s) => {
      const name = `bench-${BITMAP.w}x${BITMAP.h}-${VERSION}.jpg`;
      if (fs.existsSync(path.join(TMP, name))) return path.join(TMP, name);
      const base64 = await canvasImage(s.page, BITMAP.w, BITMAP.h, "image/jpeg");
      return cached(name, () => Buffer.from(base64, "base64"));
    },
  },
];

function bigImportCase(input: BigImport): Case {
  let file = "";
  return {
    id: input.id,
    what: input.what,
    headline: "painted",
    group: "import-export",
    runs: 3,
    async setup(env: Env) {
      const s = await bootWithDocument(env);
      file = await input.file(s);
      return s;
    },
    async run(s) {
      const out = await withMetrics(s.cdp, async () => ({
        ...(await openThroughUi(s.page, file, LONG)),
      }));
      const nodes = await countNodes(s.page);
      await closeActive(s.page, LONG);
      return { ...out, nodes, fileKB: fs.statSync(file).size / 1024 };
    },
  };
}

/**
 * File > Open refuses .sketch files before any importer runs (as the old
 * app did, see parity/scenarios/import-export/import.spec.ts), so this
 * case runs the Sketch importer through the parity hook the
 * io-import-sketch scenarios use, with the app's font manager, until it
 * calls back with the pages. Nothing is inserted or painted.
 */
function sketchImportCase(): Case {
  let base64 = "";
  let kb = 0;
  return {
    id: "import-sketch-4000",
    what: "the Sketch importer (app.sketchImport, File > Open refuses .sketch) on a generated Sketch 49 file: 4 artboards of 50 groups of 20 layers (shapes with fills, gradients, borders and shadows, texts 1 in 6, bitmaps 1 in 20), until it calls back",
    headline: "ms",
    group: "import-export",
    runs: 3,
    async setup(env: Env) {
      const file = cached(`bench-4000-${VERSION}.sketch`, () => bigSketch(4, 50, 20));
      base64 = fs.readFileSync(file).toString("base64");
      kb = fs.statSync(file).size / 1024;
      return bootWithDocument(env);
    },
    async run(s) {
      const out = await withMetrics(s.cdp, () =>
        s.page.evaluate(
          async ({ base64, timeout }) => {
            const app = (window as unknown as AppWindow).__parity.app;
            const fonts = app.scene().getWorkspace().getFontManager();
            const start = performance.now();
            const outcome = (await app.sketchImport.import(base64, {}, fonts, timeout)) as {
              called: boolean;
              result: { pages?: { acceptChildren?(v: () => void): void }[] } | null;
            };
            const ms = performance.now() - start;
            app.sketchImport.release();
            if (!outcome.called) throw new Error("the Sketch importer did not call back");
            const pages = outcome.result?.pages ?? [];
            let nodes = 0;
            for (const page of pages) {
              nodes++;
              page.acceptChildren?.(() => {
                nodes++;
              });
            }
            return { ms, pages: pages.length, nodes };
          },
          { base64, timeout: LONG },
        ),
      );
      return { ...out, fileKB: kb };
    },
  };
}

export function fileImportCases(): Case[] {
  return [...BIG_IMPORTS.map(bigImportCase), sketchImportCase()];
}
