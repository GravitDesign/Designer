// Inspector fields and panels not reached by the main inspector states:
// value scrubbing and its setting, the touch layouts of the align,
// transform and path panels, effects that only come from older files, and
// the fonts panel (search, imported fonts, delete).
import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { NEXT_ROOT } from "../../support/env.ts";
import { paritySuite } from "../../support/suite.ts";
import type { Scenario } from "../../support/scenario.ts";
import { behaviour, clickMenu, insertShapes, settle, surfaces, type SurfaceSpec } from "./lib.ts";
import * as S from "./states.ts";

const TOUCH = { settings: { touch: true } };
const FONT = path.join(NEXT_ROOT, "parity", "fixtures", "import", "font", "gravit-icons.ttf");

interface FieldWindow {
  __parity: {
    G: Record<string, new () => unknown>;
    app: {
      selection(): {
        getProperty(k: string): unknown;
        getEffects(): { appendChild(e: unknown): void };
        getGeometryBBox(): { getWidth(): number };
      }[];
      scene(): { querySingle(q: string): { getProperty(k: string): unknown } | null };
    };
  };
}

/** Presses on a number box and drags upwards: the box's value scrubbing. */
async function scrub(page: Page, dimension: string, dy: number): Promise<void> {
  const box = page.locator(`.sidebar-inspector input[data-dimension="${dimension}"]:visible`);
  const b = await box.first().boundingBox();
  if (!b) throw new Error(`no ${dimension} box`);
  await page.mouse.move(b.x + 10, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 10, b.y + b.height / 2 - dy, { steps: 10 });
  await page.mouse.up();
  await settle(page);
}

async function scrubResult(page: Page): Promise<unknown> {
  await S.rect(page);
  const box = page.locator('.sidebar-inspector input[data-dimension="w"]:visible').first();
  const before = await box.inputValue();
  await scrub(page, "w", 20);
  return {
    before,
    after: await box.inputValue(),
    focused: await box.evaluate((e) => e === document.activeElement),
    width: await page.evaluate(() =>
      (window as unknown as FieldWindow).__parity.app.selection()[0]?.getGeometryBBox().getWidth(),
    ),
  };
}

const touchTool = (page: Page, tool: string) =>
  page.click(`#right-sidebars .g-touch-toolbar-button[g-touch-tool="${tool}"]`);

/** Adds effects by class name to the selected element (as an old file holds them). */
async function addEffects(page: Page, classes: readonly string[]): Promise<void> {
  await page.evaluate((list) => {
    const { G, app } = (window as unknown as FieldWindow).__parity;
    const element = app.selection()[0];
    if (!element) throw new Error("nothing selected");
    for (const name of list) {
      const Effect = G[name];
      if (!Effect) throw new Error(`no ${name}`);
      element.getEffects().appendChild(new Effect());
    }
  }, classes);
  await settle(page, 500);
}

const fontOf = (page: Page) =>
  page.evaluate(() => {
    const text = (window as unknown as FieldWindow).__parity.app.scene().querySingle("text");
    return text
      ? [text.getProperty("_tff"), text.getProperty("_tfw"), text.getProperty("_tfs")]
      : null;
  });

/** Rows of the open fonts panel: family name and the visible preview text. */
const fontRows = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll(".g-overlay .g-fonts-panel .fonts-row")]
      .filter((r) => (r as HTMLElement).offsetParent !== null)
      .map((r) => ({
        info: r.querySelector(".info")?.textContent ?? null,
        delete: !!r.querySelector(".g-font-delete"),
      })),
  );

async function openFontList(page: Page): Promise<void> {
  await page.locator(".sidebar-inspector .text-properties-panel input").first().click();
  await page.locator(".g-overlay .g-fonts-panel").first().waitFor();
  await settle(page, 300);
}

async function importFonts(page: Page, names: readonly string[]): Promise<void> {
  const buffer = fs.readFileSync(FONT);
  const chooser = page.waitForEvent("filechooser");
  await clickMenu(page, ["File", "Import", "Add Fonts..."]);
  await (await chooser).setFiles(names.map((name) => ({ name, mimeType: "font/ttf", buffer })));
  // The import stores the fonts in IndexedDB and then lists them.
  await page.waitForFunction(async () => {
    const dbs = await indexedDB.databases();
    return dbs.some((d) => d.name === "gravitFontsDB");
  });
  await settle(page, 500);
}

const list: SurfaceSpec[] = [
  {
    id: "inspector/touch-align",
    covers: ["UI-FIELD-008", "UI-FIELD-009", "UI-TOUCH-005"],
    open: TOUCH,
    viewport: S.TALL,
    setup: async (page) => {
      await S.rectAndEllipse(page);
      await touchTool(page, "dimension.align");
      await settle(page, 300);
    },
    shot: S.INSPECTOR,
    dom: S.INSPECTOR_DOM,
  },
  {
    id: "inspector/touch-align-settings",
    covers: ["UI-FIELD-010"],
    open: TOUCH,
    viewport: S.TALL,
    setup: async (page) => {
      await S.rectAndEllipse(page);
      await touchTool(page, "dimension.align");
      await settle(page, 300);
      await page.click(".sidebar-inspector .align-settings");
      await page.locator(".g-overlay .alignSettings").waitFor();
    },
    shot: S.OVERLAY,
  },
  {
    id: "inspector/touch-transform",
    covers: ["UI-FIELD-019", "UI-FIELD-005"],
    open: TOUCH,
    viewport: S.TALL,
    setup: async (page) => {
      await S.rect(page);
      await touchTool(page, "dimension.dimension");
      await settle(page, 300);
      await page.click(".sidebar-inspector .transform-button:visible");
      await settle(page, 300);
    },
    shot: S.INSPECTOR,
    dom: S.INSPECTOR_DOM,
    themes: ["light"],
  },
  {
    id: "inspector/touch-path-switches",
    covers: ["UI-FIELD-161", "UI-FIELD-152"],
    open: TOUCH,
    viewport: S.TALL,
    setup: async (page) => {
      await S.penPath(page);
      await touchTool(page, "appearance");
      await page.locator(".sidebar-inspector .closed-checkbox.g-checkbox-slider:visible").waitFor();
      await settle(page, 300);
    },
    shot: S.INSPECTOR,
    dom: S.INSPECTOR_DOM,
    themes: ["light"],
  },
  {
    id: "effects/legacy-and-hidden",
    covers: ["UI-FIELD-091", "UI-FIELD-097", "UI-FIELD-098", "UI-FIELD-115", "UI-INSPECT-030"],
    viewport: S.TALL,
    setup: async (page) => {
      await S.rect(page);
      // Effects the add menu doesn't offer; files made by older versions
      // still hold them, and the panel shows their settings.
      await addEffects(page, [
        "GGLBrightnessContrastEffect",
        "GGLHueSaturationEffect",
        "GColorAdjustMultiEffect",
        "GGLBlurEffect",
      ]);
    },
    shot: [".sidebar-inspector .effects-toolbar", ".sidebar-inspector .effects-properties-panel"],
    dom: [".sidebar-inspector .effects-properties-panel"],
  },
];

const scenarios: Scenario[] = [
  ...surfaces(list),
  behaviour("fields/scrubbing", ["UI-FIELD-173", "UI-FIELD-001"], async (page) =>
    scrubResult(page),
  ),
  behaviour(
    "fields/scrubbing-disabled",
    ["UI-FIELD-173", "UI-SETTING-020"],
    async (page) => scrubResult(page),
    { settings: { scrubbing_flag: false } },
  ),
  behaviour(
    "fields/touch-distribute-spacing",
    ["UI-FIELD-009"],
    async (page) => {
      // Spacing needs three elements to distribute.
      await insertShapes(page, [
        { type: "GRectangle", x: 420, y: 300, w: 80, h: 60 },
        { type: "GEllipse", x: 560, y: 380, w: 100, h: 100 },
        { type: "GRectangle", x: 900, y: 340, w: 60, h: 120 },
      ]);
      await touchTool(page, "dimension.align");
      await settle(page, 300);
      const input = page.locator(".sidebar-inspector .horizontalInput input").first();
      const before = await input.inputValue();
      await page.click(".sidebar-inspector .horizontalInput button");
      const menu = page.locator("ul.g-menu:not(.g-menu-root):visible");
      await menu.first().waitFor();
      const options = await menu.locator("li > .g-menu-item-caption").allTextContents();
      await menu
        .locator("li.g-menu-item", {
          has: page.locator(':scope > .g-menu-item-caption:text-is("20")'),
        })
        .click();
      await settle(page);
      return { before, options, after: await input.inputValue() };
    },
    TOUCH,
  ),
  behaviour("fonts/search", ["UI-FONT-005", "UI-FONT-007", "UI-FONT-002"], async (page) => {
    await S.text(page);
    await openFontList(page);
    const box = page.locator(".sidebar-inspector .text-properties-panel input").first();
    const out: Record<string, unknown> = {};
    for (const query of ["Noto Sans", "Lato"]) {
      await box.fill(query);
      await settle(page, 500);
      out[query] = (await fontRows(page)).slice(0, 12);
    }
    await page.keyboard.press("Enter");
    await settle(page, 500);
    out.font = await fontOf(page);
    return out;
  }),
  behaviour(
    "fonts/import-dedupe-delete",
    ["UI-FONT-008", "UI-FONT-009", "UI-STORAGE-012"],
    async (page) => {
      await S.text(page);
      // The same font twice under two names: one entry is kept.
      await importFonts(page, ["gravit-icons.ttf", "gravit-icons-copy.ttf"]);
      await openFontList(page);
      await page.locator(".g-fonts-panel .tablinks", { hasText: "Imported Fonts" }).click();
      await settle(page, 300);
      const imported = await fontRows(page);
      await page.locator(".g-overlay .g-fonts-panel .fonts-row .info").first().click();
      await settle(page, 500);
      const applied = await fontOf(page);
      await page.keyboard.press("Escape");
      await settle(page, 300);
      await openFontList(page);
      await page.locator(".g-fonts-panel .tablinks", { hasText: "Imported Fonts" }).click();
      await settle(page, 300);
      await page.locator(".g-overlay .g-fonts-panel .g-font-delete").first().click();
      await page.locator(".g-dialog-container.visible .g-dialog").waitFor();
      const confirm = await page.evaluate(() =>
        [...document.querySelectorAll(".g-dialog-container.visible .g-dialog")].map((d) =>
          (d as HTMLElement).innerText.replace(/\s+/g, " ").trim(),
        ),
      );
      const buttons = await page
        .locator(".g-dialog-container.visible .g-dialog button")
        .allTextContents();
      await page.locator(".g-dialog-container.visible .g-dialog button").last().click();
      await settle(page, 800);
      return {
        imported,
        applied,
        confirm,
        buttons,
        afterDelete: await fontOf(page),
        rowsAfterDelete: await fontRows(page),
      };
    },
  ),
];

paritySuite("ui fields extra", scenarios, { newApp: false });
