// Regenerates the corpus: drives the old app to build every document in
// documents.ts and saves it through File > Save to Local File as...
// (action file.save-as.gvdesign, a Blob download), so the files are exactly
// what the old app writes: gzip of JSON with the embedded JPEG preview.
//
//   cd next && node parity/corpus/build.ts                 # all documents
//   cd next && node parity/corpus/build.ts shapes-rect ... # some documents
//   cd next && node parity/corpus/build.ts --readme        # README.md only
//   --shot <dir> also writes a screenshot of the app after each build.
//
// The old server must be running (http://127.0.0.1:3190). Every run gives
// new random ids, so the committed files are the fixed corpus and this
// script is only for regenerating it.
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import * as prettier from "prettier";
import { PARITY_CONTEXT, isolateNetwork, openApp } from "../support/apps.ts";
import { NEXT_ROOT } from "../support/env.ts";
import { CORPUS_DOCUMENTS, EXTRA_FILES, type BuildArgs } from "./documents.ts";

const CORPUS = path.join(NEXT_ROOT, "parity", "corpus");
const FILES = path.join(CORPUS, "files");
const FIXTURES = path.join(CORPUS, "fixtures");
const LIB = fs.readFileSync(path.join(CORPUS, "builder-lib.js"), "utf8");

/** 48x32 RGBA PNG: color ramps, a transparent hole and a half-transparent band. */
function makePng(): Buffer {
  const w = 48;
  const h = 32;
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dx = x - 34;
      const dy = y - 16;
      const hole = dx * dx + dy * dy < 49;
      png.data[i] = Math.round((x / (w - 1)) * 255);
      png.data[i + 1] = Math.round((y / (h - 1)) * 255);
      png.data[i + 2] = (x >> 3) % 2 === (y >> 3) % 2 ? 220 : 40;
      png.data[i + 3] = hole ? 0 : y >= 24 ? 128 : 255;
    }
  }
  return PNG.sync.write(png);
}

async function makeJpeg(page: Page): Promise<Buffer> {
  const url = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 40;
    const ctx = c.getContext("2d") as CanvasRenderingContext2D;
    const g = ctx.createLinearGradient(0, 0, 64, 40);
    g.addColorStop(0, "#1e5799");
    g.addColorStop(0.5, "#f3c623");
    g.addColorStop(1, "#c0392b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 40);
    ctx.fillStyle = "#2ecc71";
    ctx.beginPath();
    ctx.arc(20, 20, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(40, 8, 16, 6);
    return c.toDataURL("image/jpeg", 0.85);
  });
  return Buffer.from(url.split(",")[1] ?? "", "base64");
}

async function ensureFixtures(page: Page): Promise<BuildArgs> {
  fs.mkdirSync(FIXTURES, { recursive: true });
  const pngFile = path.join(FIXTURES, "sprite.png");
  const jpgFile = path.join(FIXTURES, "photo.jpg");
  if (!fs.existsSync(pngFile)) fs.writeFileSync(pngFile, makePng());
  if (!fs.existsSync(jpgFile)) fs.writeFileSync(jpgFile, await makeJpeg(page));
  return {
    png: {
      url: `data:image/png;base64,${fs.readFileSync(pngFile).toString("base64")}`,
      w: 48,
      h: 32,
    },
    jpeg: {
      url: `data:image/jpeg;base64,${fs.readFileSync(jpgFile).toString("base64")}`,
      w: 64,
      h: 40,
    },
  };
}

async function writeReadme(): Promise<void> {
  const rows = CORPUS_DOCUMENTS.map(
    (d) => `| ${d.name}.gvdesign | ${d.features.join("; ")} | ${d.covers.join(", ")} |`,
  );
  const extra = EXTRA_FILES.map(
    (d) => `| ${d.name}.gvdesign | ${d.features.join("; ")} | ${d.covers.join(", ")} |`,
  );
  const text = fs
    .readFileSync(path.join(CORPUS, "README.template.md"), "utf8")
    .replace(/\n*<!-- TABLE -->/, "\n" + [...rows, ...extra].join("\n"));
  const file = path.join(CORPUS, "README.md");
  fs.writeFileSync(file, await prettier.format(text, { filepath: file }));
}

async function buildOne(
  page: Page,
  doc: (typeof CORPUS_DOCUMENTS)[number],
  args: BuildArgs,
  shotDir: string | undefined,
): Promise<void> {
  await page.evaluate(LIB);
  await page.evaluate(
    async ({ source, a }) => {
      const fn = (0, eval)(`(${source})`) as (l: unknown, a: unknown) => unknown;
      const w = window as unknown as {
        __cb: { ed(): { clearSelection(): void } };
        __parity: { app: { corpus: { settle(): Promise<void> } } };
      };
      await fn(w.__cb, a);
      w.__cb.ed().clearSelection();
      await w.__parity.app.corpus.settle();
    },
    { source: (doc.build ?? (() => undefined)).toString(), a: args },
  );
  if (doc.drive) {
    // Scene point (200, 150) to the middle of the visible canvas, so the
    // drive coordinates are not under a panel.
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine objects
      const { G, app } = (window as unknown as { __parity: { G: any; app: any } }).__parity;
      app.view().zoomAtCenter(new G.GPoint(200, 150), 1);
    });
    const at = (x: number, y: number) =>
      page.evaluate(
        ([px, py]) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- old engine objects
          const { G, app } = (window as unknown as { __parity: { G: any; app: any } }).__parity;
          const p = app
            .view()
            .getWorldTransform(app.scene().getActivePage())
            .mapPoint(new G.GPoint(px, py));
          return [p.getX(), p.getY()] as [number, number];
        },
        [x, y] as [number, number],
      );
    await doc.drive(page, at);
    await page.evaluate(async () => {
      const w = window as unknown as {
        __cb: { ed(): { clearSelection(): void } };
        __parity: { app: { corpus: { settle(): Promise<void> } } };
      };
      w.__cb.ed().clearSelection();
      await w.__parity.app.corpus.settle();
    });
  }
  if (shotDir) {
    fs.mkdirSync(shotDir, { recursive: true });
    await page.evaluate(async () => {
      const w = window as unknown as {
        __parity: {
          app: {
            view(): { zoomAll(r: unknown, reduce: boolean): void };
            scene(): { getActivePage(): { getPaintBBox(): unknown } };
            corpus: { settle(): Promise<void> };
          };
        };
      };
      const app = w.__parity.app;
      const box = app.scene().getActivePage().getPaintBBox();
      if (box) app.view().zoomAll(box, false);
      await app.corpus.settle();
    });
    await page.screenshot({
      path: path.join(shotDir, `${doc.name}.png`),
      clip: { x: 250, y: 73, width: 1050, height: 927 },
    });
  }
  const download = page.waitForEvent("download", { timeout: 30_000 });
  await page.evaluate(() => {
    (
      window as unknown as { __parity: { app: { execute(id: string): void } } }
    ).__parity.app.execute("file.save-as.gvdesign");
  });
  const file = path.join(FILES, `${doc.name}.gvdesign`);
  await (await download).saveAs(file);
  console.log(`${doc.name}: ${fs.statSync(file).size} bytes`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const shotIdx = argv.indexOf("--shot");
  const shotDir = shotIdx >= 0 ? argv[shotIdx + 1] : undefined;
  const names = argv.filter((a, i) => !a.startsWith("--") && (shotIdx < 0 || i !== shotIdx + 1));
  await writeReadme();
  if (argv.includes("--readme")) return;
  fs.mkdirSync(FILES, { recursive: true });
  const selected = CORPUS_DOCUMENTS.filter((d) => names.length === 0 || names.includes(d.name));
  const browser = await chromium.launch({
    // The same flags as playwright.config.ts, so WebGL runs on SwiftShader.
    args: [
      "--font-render-hinting=none",
      "--disable-gpu-rasterization",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--force-color-profile=srgb",
      "--disable-accelerated-2d-canvas",
    ],
  });
  try {
    for (const doc of selected) {
      const context = await browser.newContext({
        ...PARITY_CONTEXT,
        viewport: { width: 1600, height: 1000 },
        deviceScaleFactor: 1,
        acceptDownloads: true,
      });
      await isolateNetwork(context);
      const page = await context.newPage();
      page.on("pageerror", (e) =>
        console.error(`${doc.name}: page error: ${e.stack ?? e.message}`),
      );
      page.on("console", (m) => {
        if (m.type() === "error") console.error(`${doc.name}: console: ${m.text()}`);
      });
      try {
        await openApp(page, "old", { newDocument: true });
        const args = await ensureFixtures(page);
        await buildOne(page, doc, args, shotDir);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

await main();
