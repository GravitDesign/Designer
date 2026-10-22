// Font import, the File > Import menu, the EPS outline-fonts setting and
// the workers the import/export paths start. The old server sends no
// COOP/COEP headers, so the page is not cross-origin isolated; the EPS
// scenarios record what the PostScript worker does under those conditions.
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import {
  captureDownload,
  chooseFiles,
  clickMenu,
  closeDialogs,
  documents,
  fixtureBase64,
  fixtureFile,
  runInPage,
  visibleDialogs,
  waitForDocuments,
  zipEntries,
} from "./node-lib.ts";
import { inPageWithLib } from "./page-lib.ts";

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

interface FontImportTrace {
  /** Files the page read (FileReader calls), by name. */
  reads: string[];
  /** IndexedDB writes: "<store>:<key>". */
  writes: string[];
  /** Uncaught page errors while importing. */
  errors: string[];
}

/**
 * Records what a font import does in the page: which files it reads and
 * which IndexedDB keys it writes (the font database, FMT-IMPORT-025).
 * Browser APIs only, so it works the same in both apps.
 */
async function traceFontImports(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __fontTrace?: FontImportTraceInPage };
    interface FontImportTraceInPage {
      reads: string[];
      writes: string[];
      errors: string[];
    }
    if (w.__fontTrace) return;
    const trace: FontImportTraceInPage = { reads: [], writes: [], errors: [] };
    w.__fontTrace = trace;
    for (const method of [
      "readAsArrayBuffer",
      "readAsBinaryString",
      "readAsDataURL",
      "readAsText",
    ]) {
      const proto = FileReader.prototype as unknown as Record<string, (b: Blob) => void>;
      const original = proto[method] as (b: Blob) => void;
      proto[method] = function (this: FileReader, blob: Blob) {
        if (blob instanceof File) trace.reads.push(blob.name);
        return original.call(this, blob);
      };
    }
    for (const method of ["put", "add"] as const) {
      const original = IDBObjectStore.prototype[method];
      IDBObjectStore.prototype[method] = function (
        this: IDBObjectStore,
        value: unknown,
        key?: IDBValidKey,
      ) {
        trace.writes.push(`${this.name}:${String(key ?? "")}`);
        return original.call(this, value, key);
      };
    }
    window.addEventListener("error", (e) => trace.errors.push(String(e.message)));
  });
}

/**
 * File > Import > Add Fonts... with one file. Waits until the import
 * finished: the font list is written back to the database (every accepted
 * file ends with that, a duplicate too), or the file was read and nothing
 * followed for 3 s (a rejected file writes nothing).
 */
async function importFont(page: Page, file: string): Promise<unknown> {
  await traceFontImports(page);
  await page.evaluate(() => {
    const t = (window as unknown as { __fontTrace: FontImportTrace }).__fontTrace;
    t.reads.length = 0;
    t.writes.length = 0;
    t.errors.length = 0;
  });
  const chooser = await chooseFiles(
    page,
    () => clickMenu(page, ["File", "Import", "Add Fonts..."]),
    [fixtureFile(file)],
  );
  const listWritten = page
    .waitForFunction(
      () =>
        (window as unknown as { __fontTrace: FontImportTrace }).__fontTrace.writes.some((w) =>
          w.endsWith(":_gravit_font_list_"),
        ),
      null,
      { timeout: 15_000 },
    )
    .then(
      () => "font list written",
      () => "not read",
    );
  // Nothing signals a rejected file, so after the read only time can tell.
  const readOnly = page
    .waitForFunction(
      () => (window as unknown as { __fontTrace: FontImportTrace }).__fontTrace.reads.length > 0,
      null,
      { timeout: 15_000 },
    )
    .then(() => page.waitForTimeout(3000))
    .then(
      () => "read, nothing written",
      () => "not read",
    );
  const outcome = await Promise.race([listWritten, readOnly]);
  const trace = await page.evaluate(
    () => (window as unknown as { __fontTrace: FontImportTrace }).__fontTrace,
  );
  // Once the font list is stored, the app resets its font provider and
  // loads the families again; wait for that to finish too.
  await page.evaluate(async () => {
    const w = window as unknown as {
      __parity: { app: { importExport: { settle(): Promise<void> } } };
    };
    await w.__parity.app.importExport.settle();
  });
  return { chooser, outcome, trace };
}

/**
 * Records the scripts every Worker the page constructs runs, in order.
 * Wrapping the constructor (instead of Playwright's worker event) also
 * sees workers that end before Playwright attaches. Random ?v= cache
 * busters become ?v=*, blob: URLs "blob:".
 */
async function traceWorkers(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __workers?: string[]; Worker: typeof Worker };
    if (w.__workers) return;
    const list: string[] = [];
    w.__workers = list;
    const Real = w.Worker;
    w.Worker = class extends Real {
      constructor(url: string | URL, options?: WorkerOptions) {
        const u = new URL(String(url), location.href);
        list.push(
          u.protocol === "blob:"
            ? "blob:"
            : u.pathname + (u.searchParams.has("v") ? "?v=*" : u.search),
        );
        super(url, options);
      }
    };
  });
}

async function workersDuring(page: Page, step: () => Promise<unknown>): Promise<string[]> {
  await traceWorkers(page);
  await page.evaluate(() => {
    (window as unknown as { __workers: string[] }).__workers.length = 0;
  });
  await step();
  return page.evaluate(() => [...(window as unknown as { __workers: string[] }).__workers]);
}

/** A two-page document (red rectangle, green ellipse) to export. */
const twoPages = inPageWithLib(async (_p, _a: unknown, L) => {
  L.app.document().setTitle("Workers");
  await L.build("multipage", { hidden: "no" });
  return null;
});

/** A selected text, so the inspector shows the font family field. */
const selectedText = inPageWithLib(async (_p, _a: unknown, L) => {
  const page = L.app.scene().getActivePage();
  L.setupPage(page, 300, 80, "C#[255,255,255]", "Local");
  const t = L.text(10, 10, "Local font", { size: 24 });
  L.insert([t]);
  L.app.editor().updateSelection(false, [t]);
  await L.io.settle();
  return null;
});

/**
 * The font family list's "System Fonts" tab (FMT-IMPORT-026) reads the
 * machine's fonts through window.queryLocalFonts. The stub stands in for
 * the browser: `fonts` FontData entries, one of them backed by a real font
 * file, or no API at all (`fonts` null).
 */
function localFonts(name: string, fonts: boolean): Scenario<unknown> {
  return {
    id: `import-export/fonts/local-fonts-${name}`,
    covers: ["FMT-IMPORT-026"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await page
        .context()
        .grantPermissions(["local-fonts"], { origin: new URL(page.url()).origin });
      await page.evaluate(
        ({ b64, on }) => {
          const w = window as unknown as {
            queryLocalFonts?: () => Promise<unknown[]>;
            __localFontCalls: number;
          };
          w.__localFontCalls = 0;
          if (!on) {
            delete w.queryLocalFonts;
            return;
          }
          const bin = atob(b64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const entry = (family: string, style: string, data: Uint8Array<ArrayBuffer>) => ({
            family,
            fullName: `${family} ${style}`,
            postscriptName: `${family.replace(/ /g, "")}-${style}`,
            style,
            blob: async () => new Blob([data], { type: "font/ttf" }),
          });
          w.queryLocalFonts = async () => {
            w.__localFontCalls++;
            return [
              // the family name inside gravit-icons.ttf
              entry("gravit-designer", "Regular", bytes),
              entry("Fake Sans", "Regular", new Uint8Array(16)),
              entry("Fake Sans", "Bold", new Uint8Array(16)),
            ];
          };
        },
        { b64: fixtureBase64("font/gravit-icons.ttf"), on: fonts },
      );
      await runInPage(page, selectedText, {});
      await page.locator(".sidebar-inspector .text-properties-panel input").first().click();
      const overlay = page.locator(".g-font-list-overlay");
      await overlay.waitFor({ state: "visible" });
      await overlay.locator("a.tablinks", { hasText: "System Fonts" }).click();
      const read = () =>
        page.evaluate(() => ({
          calls: (window as unknown as { __localFontCalls: number }).__localFontCalls,
          list: (
            (document.querySelector(".g-font-list-overlay") as HTMLElement | null)?.innerText ?? ""
          )
            .split(/\n+/)
            .map((t) => t.trim())
            .filter(Boolean),
          dialogs: [...document.querySelectorAll(".g-dialog-container.visible .g-dialog")].map(
            (d) => (d as HTMLElement).innerText.replace(/\s+/g, " ").trim(),
          ),
        }));
      if (!fonts) {
        await page.locator(".g-dialog-container.visible .g-dialog").first().waitFor();
        return { shown: await read() };
      }
      await overlay.getByText("Fake Sans", { exact: true }).first().waitFor();
      const shown = await read();
      // Pick the family backed by a real file: the text takes it.
      // The list fills in as the provider answers; click once it is stable.
      await page.waitForFunction(
        () => {
          const w = window as unknown as { __lastList?: string; __stable?: number };
          const text =
            (document.querySelector(".g-font-list-overlay") as HTMLElement | null)?.innerText ?? "";
          w.__stable = text === w.__lastList ? (w.__stable ?? 0) + 1 : 0;
          w.__lastList = text;
          return w.__stable >= 5;
        },
        null,
        { polling: 100 },
      );
      await overlay.getByText("gravit-designer", { exact: true }).first().click();
      // Picking a family closes the list.
      await overlay.waitFor({ state: "hidden" });
      await page.evaluate(async () => {
        const w = window as unknown as {
          __parity: { app: { importExport: { settle(): Promise<void> } } };
        };
        await w.__parity.app.importExport.settle();
      });
      const text = await page.evaluate(() => {
        const w = window as unknown as {
          __parity: {
            app: { selection(): { getProperty(n: string): unknown; getGeometryBBox(): unknown }[] };
          };
        };
        const t = w.__parity.app.selection()[0];
        return t ? { family: t.getProperty("_tff"), weight: t.getProperty("_tfw") ?? null } : null;
      });
      return { shown, text, after: await read() };
    },
  };
}

const scenarios = defineScenarios<unknown>([
  localFonts("stubbed", true),
  localFonts("unsupported", false),
  {
    id: "import-export/fonts/import-ttf",
    covers: ["FMT-IMPORT-025", "ACT-FILE-013", "ACT-CLOUD-016"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      const before = await runInPage(page, fontState, {});
      const first = await importFont(page, "font/gravit-icons.ttf");
      const after = await runInPage(page, fontState, {});
      // the same file again is deduplicated by family/weight/style
      const secondImport = await importFont(page, "font/gravit-icons.ttf");
      const again = await runInPage(page, fontState, {});
      // a file that isn't a font is read and then rejected
      const brokenImport = await importFont(page, "font/broken.ttf");
      const broken = await runInPage(page, fontState, {});
      return {
        before,
        first,
        after,
        secondImport,
        again,
        brokenImport,
        broken,
        dialogs: await visibleDialogs(page),
      };
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
        const open = page.locator("ul.g-menu:not(.g-menu-root):visible");
        for (let d = 0; d < path.length; d++) {
          await open
            .nth(d)
            .locator(":scope > li.g-menu-item", {
              has: page.locator(`:scope > .g-menu-item-caption:text-is("${path[d]}")`),
            })
            .first()
            .hover();
          await open.nth(d + 1).waitFor({ state: "visible" });
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
        await open.first().waitFor({ state: "hidden" });
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
      "FMT-WORKER-012",
      "FMT-WORKER-014",
      "FMT-WORKER-015",
      "FMT-EXPORT-021",
      "FMT-IMPORT-001",
    ],
    kind: "json",
    timeout: 180_000,
    driver: async ({ page }) => {
      page.setDefaultTimeout(30_000);
      // The PDF export starts one worker per core; pin the core count.
      await page.evaluate(() => {
        Object.defineProperty(Navigator.prototype, "hardwareConcurrency", {
          configurable: true,
          get: () => 3,
        });
      });
      const open = async (file: string) => {
        const n = (await documents(page)).length;
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
      await runInPage(page, twoPages, {});
      let pdf: unknown;
      out.pdfExport = await workersDuring(page, async () => {
        const d = await captureDownload(page, () =>
          clickMenu(page, ["File", "Export", "PDF Document (.pdf)", "72 dpi"]),
        );
        pdf = { name: d.name, head: d.data.subarray(0, 8).toString("latin1") };
      });
      out.pdf = pdf;
      // Two pages as PNG: the dialog writes a ZIP, with zip.js workers off.
      let zip: unknown;
      out.zipExport = await workersDuring(page, async () => {
        await clickMenu(page, ["File", "Export", "Advanced Export..."]);
        if ((await visibleDialogs(page)).some((t) => /before exporting/.test(t))) {
          await page.locator('.g-dialog:visible button:text-is("No")').last().click();
        }
        await page.locator(".g-export-dialog").waitFor({ state: "visible" });
        const d = await captureDownload(page, () =>
          page.locator('.g-export-dialog button:text-is("Export")').click(),
        );
        zip = { name: d.name, entries: zipEntries(d.data, d.since).map((e) => e.name) };
      });
      out.zip = zip;
      return out;
    },
  },
  {
    // The setting only changes how embedded Type 1 fonts come in; this
    // file uses Helvetica (not embedded), so the result equals the default
    // import. It records that the setting changes nothing else.
    id: "import-export/eps/outline-fonts-off",
    covers: ["FMT-IMPORT-012", "FMT-IMPORT-013"],
    kind: "document",
    open: { newDocument: true, settings: { eps_outline_fonts: false } },
    driver: async ({ page }) => {
      page.setDefaultTimeout(30_000);
      await chooseFiles(page, () => clickMenu(page, ["File", "Open Local File..."]), [
        fixtureFile("eps/shapes.eps"),
      ]);
      await waitForDocuments(page, 2);
      return page.evaluate(() =>
        (
          window as unknown as { __parity: { app: { serialize(o: unknown): string } } }
        ).__parity.app.serialize({ save: true }),
      );
    },
  },
  {
    id: "import-export/eps/outline-fonts-setting-ui",
    covers: ["FMT-IMPORT-014", "ACT-EDIT-026"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await clickMenu(page, ["Edit", "Settings..."]);
      const input = page.locator('.g-dialog input[data-setting="eps_outline_fonts"]');
      await input.waitFor({ state: "attached" });
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
      const checkedAfterClick = await input.isChecked();
      const buttons = await page.locator(".g-dialog:visible button:visible").allInnerTexts();
      await closeDialogs(page);
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
