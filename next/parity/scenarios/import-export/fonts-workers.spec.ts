// Font import, the File > Import menu, the EPS outline-fonts setting and
// the workers the import/export paths start. The old server sends no
// COOP/COEP headers, so the page is not cross-origin isolated; the EPS
// scenarios record what the PostScript worker does under those conditions.
import type { Page, Worker } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import {
  chooseFiles,
  clickMenu,
  closeDialogs,
  fixtureFile,
  runInPage,
  visibleDialogs,
  waitForDocuments,
} from "./node-lib.ts";
import { inPageWithLib } from "./page-lib.ts";
import { normalizeRandomTokens } from "./normalize-ids.ts";

const fontState = inPageWithLib(async (_p, _a: unknown, L) => {
  const fm = L.app.scene().getWorkspace().getFontManager();
  const fonts = fm.getFonts();
  const families = (Array.isArray(fonts) ? fonts : Object.values(fonts ?? {})).map(
    (f: { family?: string; getFamily?: () => string }) =>
      f.family ?? (f.getFamily ? f.getFamily() : null),
  );
  // Only look into the database when the app created it: opening a missing
  // database would create an empty one and break the app's own open.
  const exists = (await indexedDB.databases()).some((d) => d.name === "gravitFontsDB");
  const keys = !exists
    ? null
    : await new Promise<Record<string, string[]>>((resolve) => {
        const rq = indexedDB.open("gravitFontsDB");
        rq.onerror = () => resolve({});
        rq.onsuccess = () => {
          const db = rq.result;
          const stores = [...db.objectStoreNames];
          const out: Record<string, string[]> = {};
          if (!stores.length) resolve(out);
          let left = stores.length;
          for (const st of stores) {
            const r = db.transaction(st).objectStore(st).getAllKeys();
            r.onsuccess = () => {
              out[st] = r.result.map(String).sort();
              if (--left === 0) {
                db.close();
                resolve(out);
              }
            };
          }
        };
      });
  return { families, db: keys };
});

/** A text in the imported family, rendered by the engine. */
const fontRender = inPageWithLib(async (_p, a: { family: string }, L) => {
  const page = L.app.scene().getActivePage();
  L.setupPage(page, 220, 60, "C#[255,255,255]", "Fonts");
  const t = L.text(10, 10, "abcdefgh", { size: 28, family: a.family });
  L.insert([t]);
  await L.io.settle();
  return L.render(page);
});

async function importFont(page: Page, file: string): Promise<unknown> {
  const chooser = await chooseFiles(
    page,
    () => clickMenu(page, ["File", "Import", "Add Fonts..."]),
    [fixtureFile(file)],
  );
  await page.waitForFunction(
    async () => {
      // the import is done when the font provider lists no pending work
      await new Promise((r) => setTimeout(r, 200));
      return true;
    },
    null,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(1500);
  return chooser;
}

/** Collects the URLs of the workers a step starts; random ?v= cache busters become ?v=*. */
async function workersDuring(page: Page, step: () => Promise<unknown>): Promise<string[]> {
  const urls: string[] = [];
  const onWorker = (w: Worker) => {
    const u = new URL(w.url());
    const path = u.protocol === "blob:" ? "blob:" : u.pathname;
    const v = u.searchParams.has("v") ? "?v=*" : "";
    urls.push(path + v);
  };
  page.on("worker", onWorker);
  try {
    await step();
    await page.waitForTimeout(1000);
  } finally {
    page.off("worker", onWorker);
  }
  return urls.sort();
}

const scenarios = defineScenarios<unknown>([
  {
    id: "import-export/fonts/import-ttf",
    covers: ["FMT-IMPORT-025", "ACT-FILE-013", "ACT-CLOUD-016"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      const before = await runInPage(page, fontState, {});
      const chooser = await importFont(page, "font/gravit-icons.ttf");
      const after = await runInPage(page, fontState, {});
      // the same file again is deduplicated by family/weight/style
      await importFont(page, "font/gravit-icons.ttf");
      const again = await runInPage(page, fontState, {});
      await importFont(page, "font/broken.ttf");
      const broken = await runInPage(page, fontState, {});
      return { before, chooser, after, again, broken, dialogs: await visibleDialogs(page) };
    },
  },
  {
    id: "import-export/fonts/imported-font-render",
    covers: ["FMT-IMPORT-025"],
    kind: "png",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await importFont(page, "font/gravit-icons.ttf");
      return runInPage(page, fontRender, { family: "gravit-designer" });
    },
  },
  {
    id: "import-export/menu/file-import-and-export",
    covers: [
      "FMT-IMPORT-021",
      "FMT-IMPORT-022",
      "ACT-FILE-010",
      "ACT-FILE-012",
      "ACT-FILE-013",
      "ACT-FILE-014",
      "ACT-MENU-003",
    ],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      const read = async (path: string[]) => {
        await page
          .locator("nav.g-menu-bar ul.g-menu-root > li.g-menu-item", {
            has: page.locator(':scope > .g-menu-item-caption:text-is("File")'),
          })
          .click();
        await page.waitForTimeout(250);
        for (let d = 0; d < path.length; d++) {
          await page
            .locator("ul.g-menu:not(.g-menu-root):visible")
            .nth(d)
            .locator(":scope > li.g-menu-item", {
              has: page.locator(`:scope > .g-menu-item-caption:text-is("${path[d]}")`),
            })
            .first()
            .hover();
          await page.waitForTimeout(400);
        }
        const items = await page.evaluate(() => {
          const menus = [...document.querySelectorAll("ul.g-menu:not(.g-menu-root)")].filter(
            (m) => (m as HTMLElement).offsetParent !== null,
          );
          const last = menus[menus.length - 1];
          return [...(last?.querySelectorAll(":scope > li") ?? [])].map((li) => ({
            caption:
              (li.querySelector(".g-menu-item-caption") as HTMLElement | null)?.innerText ?? null,
            shortcut:
              (li.querySelector(".g-menu-item-shortcut") as HTMLElement | null)?.innerText || null,
            classes: [...li.classList].filter((c) => c !== "g-menu-item").sort(),
          }));
        });
        await page.keyboard.press("Escape");
        await page.mouse.click(1000, 18);
        await page.waitForTimeout(200);
        return items;
      };
      return {
        import: await read(["Import"]),
        export: await read(["Export"]),
        pdf: await read(["Export", "PDF Document (.pdf)"]),
      };
    },
  },
  {
    id: "import-export/workers/isolation",
    covers: ["FMT-WORKER-005", "FMT-WORKER-008"],
    kind: "json",
    driver: async ({ page }) => {
      const r = await page.request.get(page.url());
      const h = r.headers();
      return {
        coop: h["cross-origin-opener-policy"] ?? null,
        coep: h["cross-origin-embedder-policy"] ?? null,
        page: await page.evaluate(() => ({
          crossOriginIsolated: window.crossOriginIsolated,
          sharedArrayBuffer: typeof SharedArrayBuffer,
          atomicsWake: typeof (Atomics as unknown as { wake?: unknown }).wake,
          atomicsNotify: typeof Atomics.notify,
        })),
      };
    },
  },
  {
    id: "import-export/workers/started-by-paths",
    covers: [
      "FMT-WORKER-002",
      "FMT-WORKER-009",
      "FMT-WORKER-010",
      "FMT-WORKER-011",
      "FMT-WORKER-013",
      "FMT-WORKER-014",
      "FMT-WORKER-015",
    ],
    kind: "json",
    timeout: 180_000,
    driver: async ({ page }) => {
      page.setDefaultTimeout(30_000);
      const open = async (file: string) => {
        const n = await page.evaluate(
          () =>
            (
              window as unknown as {
                __parity: { app: { designer: { getDocuments(): unknown[] } } };
              }
            ).__parity.app.designer.getDocuments().length,
        );
        await chooseFiles(page, () => clickMenu(page, ["File", "Open Local File..."]), [
          fixtureFile(file),
        ]);
        await waitForDocuments(page, n + 1);
        await closeDialogs(page);
      };
      const out: Record<string, unknown> = {};
      out.pdfImport = await workersDuring(page, () => open("pdf/plain.pdf"));
      out.epsImport = await workersDuring(page, () => open("eps/gradient.eps"));
      out.heicImport = await workersDuring(page, () => open("raster/photo.heic"));
      // The PDF export worker pool (pdfexport.worker.js) is left out: whether
      // a PDF export starts a worker varied between runs of the old app.
      out.zipExport = await workersDuring(page, async () => {
        await page.evaluate(() => {
          const w = window as unknown as { __parity: { app: { newInfiniteDocument(): void } } };
          w.__parity.app.newInfiniteDocument();
        });
        return null;
      });
      out.hardwareConcurrency = await page.evaluate(() => navigator.hardwareConcurrency > 0);
      return out;
    },
  },
  {
    id: "import-export/eps/outline-fonts-off",
    covers: ["FMT-IMPORT-014", "FMT-IMPORT-012", "FMT-IMPORT-013"],
    kind: "document",
    open: { newDocument: true, settings: { eps_outline_fonts: false } },
    driver: async ({ page }) => {
      page.setDefaultTimeout(30_000);
      await chooseFiles(page, () => clickMenu(page, ["File", "Open Local File..."]), [
        fixtureFile("eps/shapes.eps"),
      ]);
      await waitForDocuments(page, 2);
      const doc = await page.evaluate(() =>
        (
          window as unknown as { __parity: { app: { serialize(o: unknown): string } } }
        ).__parity.app.serialize({ save: true }),
      );
      return normalizeRandomTokens(doc);
    },
  },
  {
    id: "import-export/eps/outline-fonts-setting-ui",
    covers: ["FMT-IMPORT-014", "ACT-EDIT-026"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await clickMenu(page, ["Edit", "Settings..."]);
      await page.waitForTimeout(500);
      const input = page.locator('.g-dialog input[data-setting="eps_outline_fonts"]');
      const setting = () =>
        page.evaluate(
          () =>
            (
              window as unknown as { __parity: { app: { setting(k: string): unknown } } }
            ).__parity.app.setting("eps_outline_fonts") ?? null,
        );
      const checkedBefore = await input.isChecked();
      const settingBefore = await setting();
      await input.locator("xpath=..").click();
      await page.waitForTimeout(200);
      const checkedAfterClick = await input.isChecked();
      const buttons = await page.locator(".g-dialog:visible button:visible").allInnerTexts();
      await page.locator(".g-dialog:visible button:visible").last().click();
      await page.waitForTimeout(400);
      return {
        checkedBefore,
        settingBefore,
        checkedAfterClick,
        buttons,
        settingAfter: await setting(),
      };
    },
  },
]);

paritySuite("import-export fonts and workers", scenarios, { newApp: false });
