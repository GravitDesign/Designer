// Swatches and paint drag and drop: adding, reordering and removing
// document swatches by drag, exporting and importing a swatches file, and
// dropping a paint on another paint field. The touch variants (long-press
// menu of a paint field, touch drag-and-drop polyfill) only run on a
// touch device ("ontouchstart" in window), which the parity context isn't.
import zlib from "node:zlib";
import type { Page } from "@playwright/test";
import { normalizeDocument, type Json } from "../../support/normalize.ts";
import { paritySuite } from "../../support/suite.ts";
import type { Scenario } from "../../support/scenario.ts";
import { action, behaviour, clickMenu, settle } from "./lib.ts";
import * as S from "./states.ts";

const FILL_PREVIEW = ".sidebar-inspector .fill-block .g-pattern-chooser .preview";
const DOC_SWATCHES = ".g-overlay .swatches-palette.document .swatches .swatch";

/** Opens the swatches palette of the fill chooser of a new rectangle. */
async function openSwatches(page: Page): Promise<void> {
  await S.rect(page);
  await S.openChooser(page, FILL_PREVIEW, 10);
  await page.click('.g-overlay button[data-palette="swatches"]');
  await page.locator(".g-overlay .swatches-palette.document").waitFor();
  await settle(page, 300);
}

/**
 * Adds document swatches in these colours: picks each colour from the
 * Colors palette (by index), then "Add swatch" in the document section.
 */
async function addSwatches(page: Page, colorIndexes: readonly number[]): Promise<void> {
  for (const index of colorIndexes) {
    await page.click(
      '.g-overlay button[data-palette="colors"], .g-overlay button:text-is("Colors")',
    );
    await page.click(`.g-overlay .colors-palette .swatch >> nth=${index}`);
    await settle(page);
    await page.click('.g-overlay button[data-palette="swatches"]');
    await page.locator(".g-overlay .swatches-palette.document .swatch-button").click();
    await settle(page, 300);
  }
}

/** The document swatches as their shown colours, in order. */
const swatchColors = (page: Page) =>
  page.evaluate(
    (sel) =>
      [...document.querySelectorAll(sel)].map((s) => {
        const st = getComputedStyle(s);
        // The checkerboard under the colour is the same data URI everywhere.
        const image = st.backgroundImage.replace(/,?\s*url\([^)]*\)/g, "");
        return `${st.backgroundColor} ${image === "none" ? "" : image}`.trim();
      }),
    DOC_SWATCHES,
  );

/** The paints of the selected element: fill and border patterns. */
const paints = (page: Page) =>
  page.evaluate(() => {
    const { G, app } = (
      window as unknown as {
        __parity: {
          G: { GPattern: { serialize(p: unknown): string } };
          app: {
            selection(): {
              getPaintLayers(): {
                getChildren(): { getNodeName(): string; getProperty(k: string): unknown }[];
              };
            }[];
          };
        };
      }
    ).__parity;
    const element = app.selection()[0];
    if (!element) return null;
    return element
      .getPaintLayers()
      .getChildren()
      .map((l) => [l.getNodeName(), G.GPattern.serialize(l.getProperty("_pt"))]);
  });

/** HTML5 drag with real mouse input, in steps (Chromium runs real drag and drop). */
async function mouseDrag(page: Page, from: string, to: { x: number; y: number }): Promise<void> {
  const box = await page.locator(from).first().boundingBox();
  if (!box) throw new Error(`nothing at ${from}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 4, box.y + box.height / 2, { steps: 2 });
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
  await settle(page, 300);
}

async function centerOf(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`nothing at ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

const scenarios: Scenario[] = [
  behaviour(
    "swatches/export-import",
    ["UI-SWATCH-006", "UI-SWATCH-007", "UI-SWATCH-001"],
    async (page) => {
      await openSwatches(page);
      await addSwatches(page, [3, 9, 17]);
      const added = await swatchColors(page);
      const download = page.waitForEvent("download");
      await page.click(".g-overlay .swatches-palette.document .gravit-icon-swatches-export");
      const file = await download;
      const name = file.suggestedFilename();
      const stream = await file.createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);
      const bytes = Buffer.concat(chunks);
      const content = JSON.parse(zlib.gunzipSync(bytes).toString("utf8")) as Json;
      // Into a new document, whose swatches start empty.
      await page.keyboard.press("Escape");
      await clickMenu(page, ["File", "New Design..."]);
      await page.click(".g-new-document-dialog .cloud-button");
      await page.locator(".g-new-document-dialog-container").waitFor({ state: "hidden" });
      await settle(page, 300);
      await openSwatches(page);
      const before = await swatchColors(page);
      const chooser = page.waitForEvent("filechooser");
      await page.click(".g-overlay .swatches-palette.document .gravit-icon-swatches-import");
      await (await chooser).setFiles({ name, mimeType: "application/octet-stream", buffer: bytes });
      await page.waitForFunction(({ sel, n }) => document.querySelectorAll(sel).length >= n, {
        sel: DOC_SWATCHES,
        n: added.length,
      });
      await settle(page);
      return {
        added,
        file: {
          name,
          gzip: bytes.subarray(0, 2).toString("hex"),
          content: normalizeDocument(content),
        },
        importedInto: { before, after: await swatchColors(page) },
      };
    },
  ),
  behaviour("swatches/drag-reorder", ["UI-SWATCH-004"], async (page) => {
    await openSwatches(page);
    await addSwatches(page, [3, 9, 17]);
    const before = await swatchColors(page);
    const last = await page.locator(DOC_SWATCHES).nth(2).boundingBox();
    if (!last) throw new Error("no third swatch");
    await mouseDrag(page, `${DOC_SWATCHES} >> nth=0`, {
      x: last.x + last.width - 2,
      y: last.y + last.height / 2,
    });
    return { before, after: await swatchColors(page) };
  }),
  behaviour("swatches/drag-out-removes", ["UI-SWATCH-005"], async (page) => {
    await openSwatches(page);
    await addSwatches(page, [3, 9]);
    const before = await swatchColors(page);
    // Out of the chooser, onto the canvas.
    await mouseDrag(page, `${DOC_SWATCHES} >> nth=0`, { x: 700, y: 700 });
    const removed = await swatchColors(page).catch(() => null);
    const open = await page.locator(".g-overlay .swatches-palette.document").count();
    await page.keyboard.press("Escape");
    await settle(page);
    await action(page, "edit.undo");
    await S.openChooser(page, FILL_PREVIEW, 10);
    await page.click('.g-overlay button[data-palette="swatches"]');
    await settle(page, 300);
    return { before, removed, chooserStillOpen: open, afterUndo: await swatchColors(page) };
  }),
  behaviour("color/paint-drop", ["UI-COLOR-026"], async (page) => {
    await S.rect(page);
    await S.addBorder(page);
    // A distinct fill first, then its preview dropped on the border's.
    await S.openChooser(page, FILL_PREVIEW, 10);
    await page.click(".g-overlay .colors-palette .swatch >> nth=13");
    await page.keyboard.press("Escape");
    await settle(page, 300);
    const before = await paints(page);
    await mouseDrag(
      page,
      FILL_PREVIEW,
      await centerOf(page, ".sidebar-inspector .border-block .g-pattern-chooser .preview"),
    );
    return { before, after: await paints(page) };
  }),
];

paritySuite("ui swatches", scenarios, { newApp: false });
