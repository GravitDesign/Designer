// Export through the UI: the export dialog, quick export menu items, the
// Export panel, the pages panel menu and Print. Drivers click like a user
// and capture the browser download (the File System Access API is hidden,
// so both apps fall back to Blob downloads).
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import {
  captureDownload,
  clickDialogButton,
  clickMenu,
  closeDialogs,
  normalizeExport,
  normalizePdf,
  normalizeSvg,
  renderPdf,
  runInPage,
  sha256,
  visibleDialogs,
  zipEntries,
  zipEntry,
  type Download,
} from "./node-lib.ts";
import { inPageWithLib } from "./page-lib.ts";

const build = inPageWithLib(
  async (
    _p,
    a: { doc: string; title?: string; select?: string[]; data?: Record<string, string> },
    L,
  ) => {
    if (a.title) L.app.document().setTitle(a.title);
    const built = await L.build(a.doc, a.data);
    if (a.select)
      L.app.editor().updateSelection(
        false,
        a.select.map((n) => built[n]),
      );
    return null;
  },
);

/** The assets document: elements with export rows, nested names with "/". */
const buildAssets = inPageWithLib(async (_p, _a: unknown, L) => {
  const { G } = L;
  L.app.document().setTitle("Asset Doc");
  const page = L.app.scene().getActivePage();
  L.setupPage(page, 300, 200, "C#[255,255,255]", "Assets Page");
  const rows = (...r: [string, string, string][]) => r.map(([sz, sf, fm]) => ({ sz, sf, fm }));
  const icon = L.shape("rectangle", 10, 10, 40, 40, {
    fill: "C#[255,0,0]",
    name: "Icon",
    exports: rows(["1x", "", "png"], ["2x", "@2x", "png"], ["1x", "", "svg"]),
  });
  const same = L.shape("ellipse", 60, 10, 40, 40, {
    fill: "C#[0,128,0]",
    name: "Icon",
    exports: rows(["1x", "", "png"]),
  });
  const nested = L.shape("rectangle", 110, 10, 40, 40, {
    fill: "C#[0,0,255]",
    name: "Icons/Small/Blue",
    exports: rows(["1x", "", "png"], ["1x", "", "pdf"]),
  });
  const nested2 = L.shape("rectangle", 160, 10, 40, 40, {
    fill: "C#[0,0,128]",
    name: "icons/Other",
    exports: rows(["1x", "", "jpg"]),
  });
  const slice = new G.GSlice();
  slice.setProperty("trf", new G.GTransform(40, 0, 0, 30, 60, 130));
  slice.setProperty("name", "Region");
  slice.setProperty("__export", rows(["1x", "", "png"]), true);
  L.insert([icon, same, nested, nested2, slice]);
  await L.io.settle();
  return null;
});

/** Reads the visible export dialog: mode, visible settings and preview items. */
async function dialogState(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const dlg = document.querySelector(".g-export-dialog") as HTMLElement | null;
    if (!dlg || dlg.offsetParent === null) return null;
    const visible = (e: Element) => (e as HTMLElement).offsetParent !== null;
    const settings = [...dlg.querySelectorAll(".settings-container > [data-setting]")]
      .filter(visible)
      .map((row) => {
        const out: Record<string, unknown> = { setting: row.getAttribute("data-setting") };
        const label = row.querySelector(":scope > .label");
        if (label) out.label = (label as HTMLElement).innerText.trim();
        const select = row.querySelector("select");
        if (select && visible(select)) {
          out.value = select.value;
          out.options = [...select.options]
            .filter((o) => getComputedStyle(o).display !== "none")
            .map((o) => o.value + "=" + o.text);
        }
        const inputs = [...row.querySelectorAll("input")].filter(visible);
        if (inputs.length) {
          out.inputs = inputs.map((i) =>
            i.type === "checkbox"
              ? { checked: i.checked, disabled: i.disabled }
              : { value: i.value },
          );
        }
        const text = (row.querySelector("label.label") as HTMLElement | null)?.innerText;
        if (text) out.text = text.replace(/\s+/g, " ").trim();
        return out;
      });
    const previews = [...dlg.querySelectorAll(".preview-container .item")].map((item) => ({
      text: (item as HTMLElement).innerText.replace(/\s+/g, " ").trim(),
      checked:
        (item.querySelector(".preview-check input") as HTMLInputElement | null)?.checked ?? null,
    }));
    const warnings = [...dlg.querySelectorAll(".warning, .warning-section, [class*=warning]")]
      .filter(visible)
      .map((w) => (w as HTMLElement).innerText.replace(/\s+/g, " ").trim())
      .filter((t, i, all) => t && all.indexOf(t) === i);
    return {
      mode:
        dlg.querySelector(".mode-container > label.g-active")?.getAttribute("data-mode") ?? null,
      modes: [...dlg.querySelectorAll(".mode-container > label")].map(
        (l) =>
          l.getAttribute("data-mode") + (l.classList.contains("g-disabled") ? " (disabled)" : ""),
      ),
      settings,
      previews,
      warnings,
      buttons: [...dlg.querySelectorAll("button")]
        .filter(visible)
        .map((b) => b.innerText.trim())
        .filter(Boolean),
    };
  });
}

/** File > Export > Advanced Export..., answering "No" to the save prompt. */
async function openExportDialog(page: Page): Promise<string[]> {
  await clickMenu(page, ["File", "Export", "Advanced Export..."]);
  const prompts = await visibleDialogs(page);
  if (prompts.some((t) => /save this file before exporting/.test(t)))
    await clickDialogButton(page, "No");
  await page.locator(".g-export-dialog").waitFor({ state: "visible" });
  return prompts;
}

// The dialog updates its rows in the change and click handlers, so the
// next read sees the new state without waiting.
async function selectFormat(page: Page, format: string): Promise<void> {
  await page.locator(".g-export-dialog [data-setting=format] select").selectOption(format);
}

async function setMode(page: Page, mode: string): Promise<void> {
  const label = page.locator(`.g-export-dialog .mode-container > label[data-mode=${mode}]`);
  await label.click();
  await page.waitForFunction(
    (m) =>
      document
        .querySelector(`.g-export-dialog .mode-container > label[data-mode=${m}]`)
        ?.classList.contains("g-active") ?? false,
    mode,
  );
}

async function setSize(page: Page, size: string): Promise<void> {
  const input = page.locator(".g-export-dialog [data-setting=size] input");
  await input.fill(size);
  await input.press("Enter");
}

async function clickExport(page: Page): Promise<Download> {
  return captureDownload(page, () =>
    page.locator('.g-export-dialog button:text-is("Export")').click(),
  );
}

/** A download as JSON: name, size, hash; PDFs normalized, ZIPs listed. */
function describeDownload(d: Download): Record<string, unknown> {
  if (d.name.endsWith(".zip")) return { name: d.name, entries: zipEntries(d.data, d.since) };
  const data = normalizeExport(d.name, d.data, d.since);
  return { name: d.name, size: data.length, sha256: sha256(data) };
}

/**
 * The export dialog's own output for one format, as bytes (FMT-EXPORT-022,
 * R2-133): canvas mode, defaults otherwise. PDFs and SVGs normalized.
 */
function dialogBytes(format: "png" | "jpg" | "svg" | "pdf"): Scenario<unknown> {
  return {
    id: `import-export/ui/dialog-bytes-${format}`,
    covers: ["FMT-EXPORT-022", "FMT-EXPORT-005", "FMT-EXPORT-037"],
    kind: format === "svg" ? "text" : "bytes",
    extension: `.${format}`,
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "shapes", title: `Bytes ${format}` });
      await openExportDialog(page);
      await selectFormat(page, format);
      const d = await clickExport(page);
      const data = normalizeExport(d.name, d.data, d.since);
      return format === "svg" ? data.toString("utf8") : data;
    },
  };
}

async function sizeMenu(page: Page): Promise<string[]> {
  await page.locator(".g-export-dialog [data-setting=size] .g-input-select button").click();
  await page.waitForTimeout(300);
  const items = await page.evaluate(() => {
    const menus = [...document.querySelectorAll("ul.g-menu:not(.g-menu-root)")].filter(
      (m) => (m as HTMLElement).offsetParent !== null,
    );
    const last = menus[menus.length - 1] as HTMLElement | undefined;
    return last ? last.innerText.split(/\s*\n\s*/).filter(Boolean) : [];
  });
  // Escape would close the whole dialog; a click on the dialog closes the menu.
  await page.locator(".g-export-dialog [data-setting=size] > .label").click();
  await page.waitForTimeout(200);
  return items;
}

const UI = "import-export/ui";

/**
 * File > Print... in Chromium: the document is stored as a 300 dpi PDF,
 * loaded into a hidden iframe as a blob: URL and printed from there
 * (FMT-EXPORT-051). Returns the iframe's style and the normalized PDF.
 */
async function printPdf(page: Page): Promise<{ style: string | null; pdf: Buffer }> {
  // The effects document: its blur and shadows are rasterized at the
  // print dpi, so the dpi shows in the file.
  await runInPage(page, build, { doc: "effects", title: "Print Doc" });
  const since = Date.now();
  await clickMenu(page, ["File", "Print..."]);
  await page.waitForFunction(() => !!document.querySelector("iframe[src^='blob:']"), null, {
    timeout: 60_000,
  });
  const frame = await page.evaluate(async () => {
    const f = document.querySelector("iframe[src^='blob:']") as HTMLIFrameElement;
    const buf = new Uint8Array(await (await fetch(f.src)).arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i] ?? 0);
    return { style: f.getAttribute("style"), b64: btoa(bin) };
  });
  return { style: frame.style, pdf: normalizePdf(Buffer.from(frame.b64, "base64"), since) };
}

function printScenarios(): Scenario<unknown>[] {
  return [
    {
      id: `${UI}/print`,
      covers: ["FMT-EXPORT-051", "ACT-FILE-023"],
      kind: "json",
      timeout: 120_000,
      driver: async ({ page }) => {
        page.setDefaultTimeout(15_000);
        const { style, pdf } = await printPdf(page);
        return {
          style,
          size: pdf.length,
          sha256: sha256(pdf),
          dialogs: await visibleDialogs(page),
        };
      },
    },
    {
      id: `${UI}/print-pdf`,
      covers: ["FMT-EXPORT-051", "FMT-EXPORT-014"],
      kind: "bytes",
      extension: ".pdf",
      timeout: 120_000,
      driver: async ({ page }) => {
        page.setDefaultTimeout(15_000);
        return (await printPdf(page)).pdf;
      },
    },
    {
      id: `${UI}/print-pdf.render`,
      covers: ["FMT-EXPORT-051"],
      kind: "png",
      timeout: 120_000,
      driver: async ({ page }) => {
        page.setDefaultTimeout(15_000);
        return renderPdf(page, (await printPdf(page)).pdf, 1);
      },
    },
  ];
}

const scenarios = defineScenarios<unknown>([
  {
    id: `${UI}/dialog-formats-and-modes`,
    covers: [
      "FMT-EXPORT-022",
      "FMT-EXPORT-023",
      "FMT-EXPORT-025",
      "FMT-EXPORT-026",
      "FMT-EXPORT-027",
      "FMT-EXPORT-028",
      "FMT-EXPORT-029",
      "FMT-EXPORT-030",
      "FMT-EXPORT-031",
      "FMT-EXPORT-032",
      "FMT-EXPORT-033",
      "FMT-EXPORT-034",
      "FMT-EXPORT-035",
      "FMT-EXPORT-038",
      "ACT-FILE-014",
    ],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "shapes", title: "Dialog Doc", select: ["box"] });
      const out: Record<string, unknown> = {};
      out.prompts = await openExportDialog(page);
      out.initial = await dialogState(page);
      for (const format of ["jpg", "svg", "pdf", "png"]) {
        await selectFormat(page, format);
        out[`canvas-${format}`] = await dialogState(page);
      }
      for (const mode of ["selection", "assets", "canvas"]) {
        await setMode(page, mode);
        out[`mode-${mode}`] = await dialogState(page);
      }
      return out;
    },
  },
  {
    id: `${UI}/dialog-size-menus`,
    covers: ["FMT-EXPORT-024"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "shapes", title: "Sizes" });
      await openExportDialog(page);
      const png = await sizeMenu(page);
      await selectFormat(page, "pdf");
      const pdf = await sizeMenu(page);
      const pdfSize = await page.locator(".g-export-dialog [data-setting=size] input").inputValue();
      await selectFormat(page, "svg");
      const svgVisible = await page.locator(".g-export-dialog [data-setting=size]").isVisible();
      return { png, pdf, pdfSize, svgVisible };
    },
  },
  {
    id: `${UI}/dialog-canvas-png`,
    covers: ["FMT-EXPORT-022", "FMT-EXPORT-037", "FMT-EXPORT-047", "FMT-EXPORT-039"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "shapes", title: "Canvas Doc" });
      await openExportDialog(page);
      const d = await clickExport(page);
      await page.waitForTimeout(500);
      return { download: describeDownload(d), after: await visibleDialogs(page) };
    },
  },
  {
    id: `${UI}/dialog-canvas-jpg-quality-40-2x`,
    covers: ["FMT-EXPORT-025", "FMT-EXPORT-024"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "shapes", title: "Quality Doc" });
      await openExportDialog(page);
      await selectFormat(page, "jpg");
      await setSize(page, "2x");
      const q = page.locator(".g-export-dialog [data-setting=jpeg-quality] input[type=text]");
      await q.fill("40");
      await q.press("Enter");
      await page.waitForTimeout(300);
      const state = await dialogState(page);
      const d = await clickExport(page);
      return { state, download: describeDownload(d) };
    },
  },
  {
    id: `${UI}/dialog-selection-svg-options`,
    covers: ["FMT-EXPORT-029", "FMT-EXPORT-030", "FMT-EXPORT-032", "FMT-EXPORT-012"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, {
        doc: "effects",
        title: "Svg Doc",
        select: ["sepia", "angular"],
      });
      await openExportDialog(page);
      await setMode(page, "selection");
      await selectFormat(page, "svg");
      const dp = page.locator(".g-export-dialog [data-setting=decimal-places-precision] input");
      await dp.fill("1");
      await dp.press("Enter");
      await page.locator(".g-export-dialog [data-setting=layer-as-id] input").check();
      const state = await dialogState(page);
      const d = await clickExport(page);
      await page.waitForTimeout(800);
      // the unsupported-features dialog appears after an SVG export (FMT-EXPORT-012)
      return {
        state,
        download: describeDownload(d),
        // two selected elements: a ZIP with one SVG each
        svgs: d.name.endsWith(".zip")
          ? Object.fromEntries(
              zipEntries(d.data, d.since).map((e) => [
                e.name,
                normalizeSvg(zipEntry(d.data, e.name).toString("utf8")),
              ]),
            )
          : { [d.name]: normalizeSvg(d.data.toString("utf8")) },
        after: await visibleDialogs(page),
      };
    },
  },
  {
    id: `${UI}/dialog-canvas-multipage-png-zip`,
    covers: ["FMT-EXPORT-023", "FMT-EXPORT-031", "FMT-EXPORT-046", "FMT-EXPORT-048"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, {
        doc: "multipage",
        title: "Pages Doc",
        data: { hidden: "no" },
      });
      await openExportDialog(page);
      const state = await dialogState(page);
      const d = await clickExport(page);
      return { state, download: describeDownload(d) };
    },
  },
  {
    id: `${UI}/dialog-canvas-multipage-pdf`,
    covers: ["FMT-EXPORT-048", "FMT-EXPORT-014"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, {
        doc: "multipage",
        title: "Pages Doc",
        data: { hidden: "no" },
      });
      await openExportDialog(page);
      await selectFormat(page, "pdf");
      const state = await dialogState(page);
      const d = await clickExport(page);
      return { state, download: describeDownload(d) };
    },
  },
  {
    id: `${UI}/dialog-uncheck-one-page`,
    covers: ["FMT-EXPORT-031", "FMT-EXPORT-037"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, {
        doc: "multipage",
        title: "Pages Doc",
        data: { hidden: "no" },
      });
      await openExportDialog(page);
      await page
        .locator(".g-export-dialog .preview-container .item .preview-check input")
        .first()
        .uncheck();
      await page.waitForTimeout(200);
      const state = await dialogState(page);
      const d = await clickExport(page);
      return { state, download: describeDownload(d) };
    },
  },
  {
    id: `${UI}/dialog-assets-zip`,
    covers: [
      "FMT-EXPORT-023",
      "FMT-EXPORT-046",
      "FMT-EXPORT-047",
      "FMT-EXPORT-048",
      "FMT-EXPORT-044",
    ],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, buildAssets, {});
      await openExportDialog(page);
      await setMode(page, "assets");
      const state = await dialogState(page);
      const d = await clickExport(page);
      return { state, download: describeDownload(d) };
    },
  },
  {
    id: `${UI}/dialog-assets-zip-icon-png`,
    covers: ["FMT-EXPORT-042", "FMT-EXPORT-048"],
    kind: "bytes",
    extension: ".png",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, buildAssets, {});
      await openExportDialog(page);
      await setMode(page, "assets");
      const d = await clickExport(page);
      return zipEntry(d.data, "Icon@2x.png");
    },
  },
  {
    id: `${UI}/dialog-remembers-settings`,
    covers: ["FMT-EXPORT-022"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "shapes", title: "Remember" });
      await openExportDialog(page);
      await selectFormat(page, "svg");
      await page.locator(".g-export-dialog [data-setting=convert-text-to-path] input").check();
      await clickExport(page);
      await page.waitForTimeout(500);
      const closed = await page.locator(".g-export-dialog").isVisible();
      await openExportDialog(page);
      const reopened = await dialogState(page);
      await page.locator('.g-export-dialog button:text-is("Cancel")').click();
      await page.waitForTimeout(300);
      // a cancelled dialog does not store its settings
      await openExportDialog(page);
      await selectFormat(page, "pdf");
      await page.locator('.g-export-dialog button:text-is("Cancel")').click();
      await page.waitForTimeout(300);
      await openExportDialog(page);
      const afterCancel = await dialogState(page);
      return { dialogVisibleAfterExport: closed, reopened, afterCancel };
    },
  },
  {
    id: `${UI}/dialog-warnings`,
    covers: ["FMT-EXPORT-036", "FMT-EXPORT-019"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "shapes", title: "Big" });
      await page.evaluate(() => {
        const app = (
          window as unknown as {
            __parity: {
              app: {
                scene(): { getActivePage(): { setProperties(n: string[], v: number[]): void } };
              };
            };
          }
        ).__parity.app;
        app.scene().getActivePage().setProperties(["w", "h"], [15000, 200]);
      });
      await openExportDialog(page);
      const out: Record<string, unknown> = {};
      await selectFormat(page, "pdf");
      out.pdf = await dialogState(page);
      await selectFormat(page, "png");
      await setSize(page, "3x");
      out.png3x = await dialogState(page);
      await page.locator('.g-export-dialog button:text-is("Export")').click();
      await page.waitForTimeout(800);
      out.pngAlert = await visibleDialogs(page);
      return out;
    },
  },
  {
    // Old-app bug: a hidden page has no geometry bbox, so
    // hasPagesWithInfiniteEmptyCanvas() treats it as an empty infinite
    // canvas and every export of the document is refused.
    id: `${UI}/hidden-page-blocks-export`,
    covers: ["FMT-EXPORT-039", "ADD-STORAGE-001"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "multipage", title: "Hidden Doc" });
      await clickMenu(page, ["File", "Export", "Advanced Export..."]);
      const advanced = await visibleDialogs(page);
      // The old app refuses with a message. With BUG-092 fixed the export
      // goes ahead: the save prompt, then the export dialog, closed again.
      if (JSON.stringify(advanced).includes("not allowed")) {
        await clickDialogButton(page, "OK");
      } else {
        if (advanced.some((t) => /save this file before exporting/.test(t)))
          await clickDialogButton(page, "No");
        await page.locator(".g-export-dialog").waitFor({ state: "visible" });
        advanced.push("<export dialog>");
        await page.keyboard.press("Escape");
        await page.locator(".g-export-dialog").waitFor({ state: "hidden" });
      }
      await clickMenu(page, ["File", "Export", "PNG Image (.png)"]);
      return { advanced, quickPng: await visibleDialogs(page) };
    },
  },
  {
    id: `${UI}/empty-infinite-canvas`,
    covers: ["FMT-EXPORT-039", "ADD-STORAGE-001", "FMT-EXPORT-041"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      const out: Record<string, unknown> = {};
      await clickMenu(page, ["File", "Export", "Advanced Export..."]);
      out.advanced = await visibleDialogs(page);
      await clickDialogButton(page, "OK");
      const d = await captureDownload(
        page,
        () => clickMenu(page, ["File", "Export", "PNG Image (.png)"]),
        3000,
      ).catch(() => null);
      out.quickPng = d === null ? { noDownload: true } : describeDownload(d);
      out.quickPngDialogs = await visibleDialogs(page);
      return out;
    },
  },
  {
    id: `${UI}/quick-export-menu`,
    covers: [
      "FMT-EXPORT-001",
      "FMT-EXPORT-040",
      "FMT-EXPORT-041",
      "ACT-FILE-015",
      "ACT-FILE-016",
      "ACT-FILE-017",
      "ACT-FILE-018",
      "ACT-FILE-019",
      "ACT-FILE-020",
      "ACT-FILE-021",
    ],
    kind: "json",
    timeout: 180_000,
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "effects", title: "Quick Doc" });
      const paths = [
        ["File", "Export", "PNG Image (.png)"],
        ["File", "Export", "JPEG Image (.jpg)"],
        ["File", "Export", "Scalable Vector Graphics (.svg)"],
        ["File", "Export", "PDF Document (.pdf)", "72 dpi"],
        ["File", "Export", "PDF Document (.pdf)", "96 dpi"],
        ["File", "Export", "PDF Document (.pdf)", "150 dpi"],
        ["File", "Export", "PDF Document (.pdf)", "300 dpi"],
      ];
      const out: unknown[] = [];
      for (const p of paths) {
        const d = await captureDownload(page, () => clickMenu(page, p));
        await page.waitForTimeout(500);
        out.push({
          menu: p.slice(2).join(" > "),
          download: describeDownload(d),
          dialogs: await visibleDialogs(page),
        });
        await closeDialogs(page);
      }
      return out;
    },
  },
  {
    id: `${UI}/quick-export-svg-content`,
    covers: ["FMT-EXPORT-041"],
    kind: "text",
    extension: ".svg",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "shapes", title: "Quick Svg" });
      const d = await captureDownload(page, () =>
        clickMenu(page, ["File", "Export", "Scalable Vector Graphics (.svg)"]),
      );
      return normalizeSvg(d.data.toString("utf8"));
    },
  },
  {
    id: `${UI}/quick-export-jpg-content`,
    covers: ["FMT-EXPORT-041"],
    kind: "bytes",
    extension: ".jpg",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "shapes", title: "Quick Jpg" });
      const d = await captureDownload(page, () =>
        clickMenu(page, ["File", "Export", "JPEG Image (.jpg)"]),
      );
      return d.data;
    },
  },
  {
    id: `${UI}/advanced-pdf-options`,
    covers: ["ACT-FILE-022", "FMT-EXPORT-039"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "shapes", title: "Adv Pdf" });
      await clickMenu(page, ["File", "Export", "PDF Document (.pdf)", "Advanced Options..."]);
      const prompts = await visibleDialogs(page);
      if (prompts.some((t) => /before exporting/.test(t))) await clickDialogButton(page, "No");
      await page.locator(".g-export-dialog").waitFor({ state: "visible" });
      await page.waitForTimeout(400);
      return { prompts, state: await dialogState(page) };
    },
  },
  {
    id: `${UI}/pages-panel-export-page`,
    covers: ["FMT-EXPORT-050", "ACT-CTX-005"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "multipage", title: "Ctx Doc", data: { hidden: "no" } });
      await page
        .locator(".pages .page-row .page-title", { hasText: "Second" })
        .first()
        .click({ button: "right" });
      await page.waitForTimeout(400);
      const menu = await page.evaluate(() =>
        [...document.querySelectorAll("ul.g-menu:not(.g-menu-root)")]
          .filter((m) => (m as HTMLElement).offsetParent !== null)
          .map((m) => (m as HTMLElement).innerText.split(/\s*\n\s*/).filter(Boolean)),
      );
      await page
        .locator("ul.g-menu:not(.g-menu-root):visible > li.g-menu-item", {
          has: page.locator(':scope > .g-menu-item-caption:text-is("Export Page")'),
        })
        .first()
        .click();
      await page.waitForTimeout(500);
      const prompts = await visibleDialogs(page);
      if (prompts.some((t) => /before exporting/.test(t))) await clickDialogButton(page, "No");
      await page.locator(".g-export-dialog").waitFor({ state: "visible" });
      await page.waitForTimeout(400);
      const state = await dialogState(page);
      const d = await clickExport(page);
      return { menu, prompts, state, download: describeDownload(d) };
    },
  },
  {
    id: `${UI}/export-panel-rows`,
    covers: ["FMT-EXPORT-042", "FMT-EXPORT-043"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "shapes", title: "Panel Doc", select: ["box"] });
      const add = page.locator('.toolbar-export button[data-title="Add Export"]');
      for (let i = 0; i < 6; i++) {
        await add.click();
        await page.waitForTimeout(200);
      }
      const read = () =>
        page.evaluate(() => {
          const w = window as unknown as {
            __parity: { app: { selection(): { getProperty(n: string, c: boolean): unknown }[] } };
          };
          const rows = [...document.querySelectorAll(".export-panel .export-properties-row")].map(
            (r) => ({
              size: (r.querySelector(".column:nth-child(1) input") as HTMLInputElement).value,
              suffix: (r.querySelector(".column:nth-child(2) input") as HTMLInputElement).value,
              format: (r.querySelector("select") as HTMLSelectElement).value,
            }),
          );
          return {
            title: (document.querySelector(".toolbar-export .panel-title") as HTMLElement)
              .innerText,
            rows,
            property: w.__parity.app.selection()[0]?.getProperty("__export", true) ?? null,
          };
        });
      const afterAdd = await read();
      // edit the second row: size, suffix, format; remove the first row
      const second = page.locator(".export-panel .export-properties-row").nth(1);
      await second.locator(".column:nth-child(1) input").fill("4x");
      await second.locator(".column:nth-child(1) input").press("Enter");
      await second.locator(".column:nth-child(2) input").fill("-big");
      await second.locator(".column:nth-child(2) input").press("Enter");
      await second.locator("select").selectOption("svg");
      await page.waitForTimeout(200);
      await page
        .locator(".export-panel .export-properties-row")
        .first()
        .locator("button:text-is('✕')")
        .click();
      await page.waitForTimeout(300);
      const afterEdit = await read();
      return { afterAdd, afterEdit };
    },
  },
  {
    id: `${UI}/export-panel-export-button`,
    covers: ["FMT-EXPORT-045", "FMT-EXPORT-048"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "shapes", title: "Panel Export", select: ["oval"] });
      const add = page.locator('.toolbar-export button[data-title="Add Export"]');
      await add.click();
      await add.click();
      await page.waitForTimeout(200);
      const d = await captureDownload(page, () =>
        page.locator(".toolbar-export #btn-export").click(),
      );
      return { download: describeDownload(d), dialogs: await visibleDialogs(page) };
    },
  },
  {
    id: `${UI}/export-panel-single-row`,
    covers: ["FMT-EXPORT-045", "FMT-EXPORT-047"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, { doc: "shapes", title: "Panel Single", select: ["tilted"] });
      await page.locator('.toolbar-export button[data-title="Add Export"]').click();
      await page.waitForTimeout(200);
      const d = await captureDownload(page, () =>
        page.locator(".toolbar-export #btn-export").click(),
      );
      return { download: describeDownload(d) };
    },
  },
  {
    id: `${UI}/export-panel-create-slice`,
    covers: ["FMT-EXPORT-044"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, build, {
        doc: "effects",
        title: "Slices",
        select: ["shadow", "blurred"],
      });
      await page.locator('.toolbar-export button[data-title="Add Export"]').click();
      await page.waitForTimeout(200);
      await page.locator('.toolbar-export button[data-title="Create Slice"]').click();
      await page.waitForTimeout(400);
      return page.evaluate(() => {
        const w = window as unknown as {
          __parity: {
            G: { GSlice: new () => unknown };
            app: {
              scene(): {
                queryAll(q: string): {
                  getProperty(n: string, c?: boolean): unknown;
                  getGeometryBBox(): {
                    getX(): number;
                    getY(): number;
                    getWidth(): number;
                    getHeight(): number;
                  };
                }[];
              };
              selection(): { getNodeName(): string }[];
            };
          };
        };
        const slices = w.__parity.app.scene().queryAll("slice");
        return {
          slices: slices.map((s) => {
            const b = s.getGeometryBBox();
            return {
              name: s.getProperty("name"),
              bbox: [b.getX(), b.getY(), b.getWidth(), b.getHeight()],
              export: s.getProperty("__export", true),
            };
          }),
          selection: w.__parity.app.selection().map((n) => n.getNodeName()),
        };
      });
    },
  },
  ...printScenarios(),
  dialogBytes("png"),
  dialogBytes("jpg"),
  dialogBytes("svg"),
  dialogBytes("pdf"),
]);

paritySuite("import-export export UI", scenarios, { newApp: false });
