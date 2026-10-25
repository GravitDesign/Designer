// The GravitDesign Next look (src/app/brand, public/brand). New-app only:
// the old app has no such look, so these outputs are recorded from the
// new app itself (GD_RECORD_BRAND=1) and compared against that recording
// afterwards. See README.md in this folder.
//
// Every other parity area runs the new app in its classic look
// (support/apps.ts isolateNetwork); these pages ask for the next look
// with ?branding=next, which wins over that.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { PARITY_CONTEXT, isolateNetwork } from "../../support/apps.ts";
import { NEW_URL } from "../../support/env.ts";
import {
  assertSameOutput,
  readExpected,
  storeOutput,
  writeExpected,
  type StoredOutput,
} from "../../support/runner.ts";
import type { Scenario } from "../../support/scenario.ts";
import { sabotage } from "../../support/suite.ts";
import * as S from "../ui/states.ts";
import {
  NEUTRAL,
  clickMenu,
  hoverMenuItem,
  insertShapes,
  openMenu,
  prepare,
  rerender,
  rightClick,
  settle,
  shoot,
  stableShot,
  tool,
  type Theme,
} from "../ui/lib.ts";

/** GD_RECORD_BRAND=1 writes the expected files from the new app. */
const RECORDING = process.env.GD_RECORD_BRAND === "1";
const SABOTAGE = process.env.GD_PARITY_SABOTAGE === "1";

/** The brand stylesheets; blocking them must change every brand shot. */
const BRAND_CSS = /\/brand\/(next|editor|accent\.(light|dark))\.css$/;

/** The editor restyle alone (public/brand/editor.css). */
const EDITOR_CSS = /\/brand\/editor\.css$/;

interface BrandOpen {
  theme: Theme;
  /** Leave the introduction to open on its own (first start). */
  intro?: boolean;
  /** Block the brand stylesheets (the "needs the brand stylesheets" checks). */
  withoutBrandCss?: boolean;
  /** Block only editor.css (the "needs editor.css" checks). */
  withoutEditorCss?: boolean;
}

interface BrandScenario {
  id: string;
  kind: "png" | "json";
  open: BrandOpen;
  /** The shot shows editor.css's work, so it must also differ with only editor.css blocked. */
  editor?: boolean;
  /** `unstyled`: brand stylesheets are blocked (a surface may then reach past the window). */
  run: (page: Page, unstyled: boolean) => Promise<unknown>;
}

async function waitForBrand(page: Page, brandCss = true): Promise<void> {
  await page.waitForFunction(() => !!(window as unknown as { __parity?: unknown }).__parity, null, {
    timeout: 60_000,
  });
  if (brandCss)
    await page.waitForFunction(() =>
      [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].every(
        (l) => l.sheet !== null,
      ),
    );
  await page.evaluate(async () => {
    await document.fonts.load('800 19px "Manrope"');
    await document.fonts.load('400 19px "Manrope"');
    await document.fonts.load('600 19px "Manrope"');
  });
}

/** Opens the new app in the next look; the dark theme boots twice like the ui scenarios. */
async function openBrand(browser: Browser, open: BrandOpen): Promise<Page> {
  const context = await browser.newContext({
    ...PARITY_CONTEXT,
    viewport: { width: 1600, height: 1000 },
  });
  await isolateNetwork(context);
  if (open.withoutBrandCss) await context.route(BRAND_CSS, (route) => route.abort());
  if (open.withoutEditorCss) await context.route(EDITOR_CSS, (route) => route.abort());
  await context.addInitScript(
    ({ theme, intro }) => {
      if (sessionStorage.getItem("__brand_settings_done")) return;
      sessionStorage.setItem("__brand_settings_done", "1");
      localStorage.setItem("designer.settings", JSON.stringify({ theme }));
      if (!intro) localStorage.setItem("designer.next-intro-shown", "true");
    },
    { theme: open.theme, intro: open.intro === true },
  );
  const page = await context.newPage();
  const url = NEW_URL + "?branding=next";
  // A blocked stylesheet never gets a sheet, so only wait when all of them load.
  const css = !open.withoutBrandCss && !open.withoutEditorCss;
  await page.goto(url);
  await waitForBrand(page, css);
  if (open.theme === "dark") {
    await page.goto(url);
    await waitForBrand(page, css);
  }
  await prepare(page);
  return page;
}

async function closeWelcome(page: Page): Promise<void> {
  await page.click(".g-new-document-dialog .cloud-button");
  await page.locator(".g-new-document-dialog-container").waitFor({ state: "detached" });
  await settle(page);
}

/** A selected card and a dot beside it, both on the visible canvas. */
async function editorWithSelection(page: Page): Promise<void> {
  await closeWelcome(page);
  await insertShapes(page, [
    { type: "GRectangle", x: 420, y: 200, w: 220, h: 140, name: "Card" },
    { type: "GEllipse", x: 700, y: 240, w: 120, h: 120, name: "Dot", select: false },
  ]);
  await page.mouse.move(NEUTRAL.x, NEUTRAL.y);
  await settle(page, 300);
}

/** The editor with the rectangle tool active (the shapes button and the snap toggle are on). */
async function activeTool(page: Page): Promise<void> {
  await editorWithSelection(page);
  await tool(page, "GRectangleTool");
  await page.mouse.move(NEUTRAL.x, NEUTRAL.y);
  await settle(page);
}

/** A selected text: the text inspector (font, weight, alignment, pivots, checkbox). */
async function textSelected(page: Page): Promise<void> {
  await closeWelcome(page);
  await S.text(page);
  await page.mouse.move(NEUTRAL.x, NEUTRAL.y);
  await settle(page, 300);
}

/** A selected rectangle with a border: the fill and border rows of the inspector. */
async function withBorder(page: Page): Promise<void> {
  await closeWelcome(page);
  await S.rect(page);
  await S.addBorder(page);
  await page.mouse.move(NEUTRAL.x, NEUTRAL.y);
  await settle(page, 300);
}

/** An 800 x 600 px page from the welcome screen: the canvas around it and its shadow. */
async function pageDocument(page: Page): Promise<void> {
  const inputs = page.locator(".g-new-document-dialog .custom-size input");
  await inputs.nth(0).click();
  await page.keyboard.type("800");
  await inputs.nth(1).click();
  await page.keyboard.type("600");
  await page.click(".g-new-document-dialog .cloud-button");
  await page.locator(".g-new-document-dialog-container").waitFor({ state: "detached" });
  await page.mouse.move(NEUTRAL.x, NEUTRAL.y);
  await settle(page, 500);
}

/** The canvas between the sidebars, below the toolbar. */
const CANVAS = { x: 250, y: 73, width: 1050, height: 927 };

const THEMES = ["light", "dark"] as const;

/** One editor scenario per theme. */
function inBothThemes(
  name: string,
  run: (page: Page, unstyled: boolean) => Promise<unknown>,
): BrandScenario[] {
  return THEMES.map((theme) => ({
    id: `brand/${name}-${theme}`,
    kind: "png",
    open: { theme },
    editor: true,
    run,
  }));
}

const scenarios: BrandScenario[] = [
  ...THEMES.map((theme): BrandScenario => ({
    id: `brand/welcome-${theme}`,
    kind: "png",
    open: { theme },
    // The size fields and the checkbox take the editor's control frames.
    editor: true,
    run: (page) => shoot(page, [".g-new-document-dialog"]),
  })),
  ...THEMES.map((theme): BrandScenario => ({
    id: `brand/intro-${theme}`,
    kind: "png",
    open: { theme, intro: true },
    // The dialog surface (outline and shadow) and the scrim around it.
    editor: true,
    run: async (page, unstyled) => {
      await page.locator(".gd-intro-dialog-container.visible").waitFor();
      return shoot(page, [".g-dialog.gd-intro-dialog"], 8, unstyled);
    },
  })),
  // The whole window: the mark and menu bar, the document tab, the toolbar
  // with the active tool, the sidebar tabs, the selected layer, the
  // inspector and the canvas.
  ...inBothThemes("editor-selection", async (page) => {
    await editorWithSelection(page);
    return shoot(page, ["#mainframe"]);
  }),
  // The inspector of the selection: section headers, fields, the slider,
  // the selects and the selected fill row.
  ...inBothThemes("inspector", async (page) => {
    await editorWithSelection(page);
    return shoot(page, ["#right-sidebars"]);
  }),
  // The sidebar tabs, the pages and the layers with the selected row.
  {
    id: "brand/layers",
    kind: "png",
    open: { theme: "light" },
    editor: true,
    run: async (page) => {
      await editorWithSelection(page);
      return shoot(page, ["#left-sidebars"]);
    },
  },
  {
    id: "brand/layers-dark",
    kind: "png",
    open: { theme: "dark" },
    editor: true,
    run: async (page) => {
      await editorWithSelection(page);
      return shoot(page, ["#left-sidebars"]);
    },
  },
  // The toolbar: the active tool and the snap toggle in the accent, the
  // group dividers, the disabled buttons.
  ...inBothThemes("toolbar", async (page) => {
    await activeTool(page);
    return shoot(page, ["#toolbar"]);
  }),
  // The text inspector: font selects, pivots (Auto/Fix), segmented
  // alignment buttons and the checkbox.
  ...inBothThemes("inspector-text", async (page) => {
    await textSelected(page);
    return shoot(page, ["#right-sidebars"]);
  }),
  // The fill and border rows with their swatches, selects and fields.
  ...inBothThemes("inspector-border", async (page) => {
    await withBorder(page);
    return shoot(page, ["#right-sidebars"]);
  }),
  // A focused field: the focus ring and the yellow selection hint.
  ...inBothThemes("focus", async (page) => {
    await editorWithSelection(page);
    await page.click('.sidebar-inspector input[data-dimension="x"]');
    await settle(page);
    return shoot(page, [".sidebar-inspector .dimension-panel"], 4);
  }),
  // The color chooser: the popover surface, its header, fields and the
  // palette tabs.
  ...inBothThemes("color-chooser", async (page) => {
    await closeWelcome(page);
    await S.rect(page);
    await S.openChooser(page, ".sidebar-inspector .fill-block .g-pattern-chooser .preview");
    return shoot(page, [".g-overlay"], 10);
  }),
  // The File menu under the menu bar with the mark, one item hovered.
  ...inBothThemes("menu", async (page) => {
    await editorWithSelection(page);
    await openMenu(page, ["File"]);
    await hoverMenuItem(page, "Open Local File...");
    await settle(page);
    return shoot(page, ["#header > .section.menu", "ul.g-menu:not(.g-menu-root)"], 10);
  }),
  // The canvas context menu of a selected rectangle.
  ...inBothThemes("context-menu", async (page) => {
    await closeWelcome(page);
    await S.rect(page);
    await rightClick(page, 600, 360);
    return shoot(page, ["ul.g-menu:not(.g-menu-root)"], 10);
  }),
  // A confirm dialog: the surface, the quiet buttons and the primary one.
  ...inBothThemes("dialog", async (page) => {
    await closeWelcome(page);
    await S.rect(page);
    await page.mouse.move(NEUTRAL.x, NEUTRAL.y);
    await page.click("#header .tabs .tab .close");
    await page.locator(".g-dialog-container.visible .g-dialog-footer").waitFor();
    await page.mouse.move(NEUTRAL.x, NEUTRAL.y);
    await settle(page, 300);
    return shoot(page, [".g-dialog-container.visible > .g-dialog"], 24);
  }),
  // The canvas around a page and the page shadow (tinted in code,
  // brand-theme.ts pageShadowColor).
  ...inBothThemes("canvas", async (page) => {
    await pageDocument(page);
    await settle(page);
    await rerender(page, true);
    return stableShot(page, CANVAS);
  }),
  {
    id: "brand/loading",
    kind: "png",
    open: { theme: "light" },
    // The loading screen as index.html shows it before the app starts:
    // body.loading with only the loader in front of it, its animation
    // stopped after the first lap, the ring whole and the node at its
    // right end.
    run: async (page) => {
      await page.evaluate(() => {
        document.body.classList.add("loading");
        for (const child of document.body.children)
          if (child.id !== "gd-loader")
            (child as HTMLElement).style.setProperty("display", "none", "important");
        for (const animation of document.getAnimations()) {
          animation.pause();
          animation.currentTime = 5100;
        }
      });
      await settle(page);
      return page.screenshot({ clip: { x: 600, y: 300, width: 400, height: 400 } });
    },
  },
  {
    id: "brand/names",
    kind: "json",
    open: { theme: "light", intro: true },
    // The names and links the look changes, and the introduction's one-time
    // opening and the Help entry that brings it back.
    run: async (page) => {
      const facts = () =>
        page.evaluate(() => ({
          title: document.title,
          branding: document.documentElement.getAttribute("data-branding"),
          theme: document.documentElement.getAttribute("data-gd-theme"),
          stylesheets: [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
            .map((l) => new URL(l.href).pathname)
            .filter((p) => !p.startsWith("/bundle/")),
          icon: document.querySelector('link[rel="icon"]')?.getAttribute("href") ?? null,
          manifest: document.querySelector('link[rel="manifest"]')?.getAttribute("href") ?? null,
          version: document.querySelector(".g-new-document-dialog .version")?.textContent ?? null,
          intro: !!document.querySelector(".gd-intro-dialog-container.visible"),
          introShown: localStorage.getItem("designer.next-intro-shown"),
        }));
      await page.locator(".gd-intro-dialog-container.visible").waitFor();
      const firstStart = await facts();
      await page.click(".gd-intro-dialog .g-dialog-footer button");
      await page.locator(".gd-intro-dialog-container").waitFor({ state: "detached" });
      const afterClose = await facts();
      await page.reload();
      await waitForBrand(page);
      await settle(page);
      const secondStart = await facts();
      await closeWelcome(page);
      const withDocument = await facts();
      await openMenu(page, ["Help"]);
      const helpMenu = await page.evaluate(() =>
        [...document.querySelectorAll("ul.g-menu:not(.g-menu-root) > li.g-menu-item")]
          .filter((li) => (li as HTMLElement).offsetParent !== null)
          .map((li) => li.querySelector(":scope > .g-menu-item-caption")?.textContent ?? "-"),
      );
      await page.keyboard.press("Escape");
      await clickMenu(page, ["Help", "About GravitDesign Next"]);
      await page.locator(".gd-intro-dialog-container.visible").waitFor();
      const fromHelp = await facts();
      return { firstStart, afterClose, secondStart, withDocument, helpMenu, fromHelp };
    },
  },
];

function asScenario(s: BrandScenario): Scenario {
  return { id: s.id, covers: ["BRAND"], kind: s.kind };
}

test.describe("brand (new app only)", () => {
  for (const s of scenarios) {
    test(s.id, async ({ browser }) => {
      test.setTimeout(180_000);
      const scenario = asScenario(s);
      const page = await openBrand(browser, s.open);
      try {
        let actual: StoredOutput = storeOutput(scenario, await s.run(page, false));
        if (SABOTAGE) actual = sabotage(actual, scenario);
        if (RECORDING) {
          writeExpected(scenario, actual);
          return;
        }
        const expected = readExpected(scenario);
        expect(expected, `no recording for ${s.id}; run with GD_RECORD_BRAND=1`).toBeDefined();
        assertSameOutput(scenario, expected as StoredOutput, actual, "new");
      } finally {
        await page.context().close();
      }
    });
  }

  // The shots must show the brand stylesheets' work: without them each
  // one differs from its recording.
  for (const s of RECORDING ? [] : scenarios.filter((x) => x.kind === "png")) {
    test(`${s.id} needs the brand stylesheets`, async ({ browser }) => {
      test.setTimeout(180_000);
      const scenario = asScenario(s);
      const page = await openBrand(browser, { ...s.open, withoutBrandCss: true });
      try {
        const actual = storeOutput(scenario, await s.run(page, true));
        const expected = readExpected(scenario);
        expect(expected, `no recording for ${s.id}`).toBeDefined();
        expect(
          () => assertSameOutput(scenario, expected as StoredOutput, actual, "without-brand-css"),
          `${s.id} looks the same without the brand stylesheets`,
        ).toThrow(/pixels differ/);
      } finally {
        await page.context().close();
      }
    });
  }

  // The editor shots must show editor.css's work in particular: with only
  // that stylesheet blocked (accent and next.css still load) each one
  // differs from its recording too.
  for (const s of RECORDING ? [] : scenarios.filter((x) => x.kind === "png" && x.editor)) {
    test(`${s.id} needs editor.css`, async ({ browser }) => {
      test.setTimeout(180_000);
      const scenario = asScenario(s);
      const page = await openBrand(browser, { ...s.open, withoutEditorCss: true });
      try {
        const actual = storeOutput(scenario, await s.run(page, true));
        const expected = readExpected(scenario);
        expect(expected, `no recording for ${s.id}`).toBeDefined();
        expect(
          () => assertSameOutput(scenario, expected as StoredOutput, actual, "without-editor-css"),
          `${s.id} looks the same without editor.css`,
        ).toThrow(/pixels differ/);
      } finally {
        await page.context().close();
      }
    });
  }
});
