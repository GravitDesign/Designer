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
import {
  clickMenu,
  insertShapes,
  openMenu,
  prepare,
  settle,
  shoot,
  type Theme,
} from "../ui/lib.ts";

/** GD_RECORD_BRAND=1 writes the expected files from the new app. */
const RECORDING = process.env.GD_RECORD_BRAND === "1";
const SABOTAGE = process.env.GD_PARITY_SABOTAGE === "1";

/** The brand stylesheets; blocking them must change every brand shot. */
const BRAND_CSS = /\/brand\/(next|accent\.(light|dark))\.css$/;

interface BrandOpen {
  theme: Theme;
  /** Leave the introduction to open on its own (first start). */
  intro?: boolean;
  /** Block the brand stylesheets (the "needs the brand stylesheets" checks). */
  withoutBrandCss?: boolean;
}

interface BrandScenario {
  id: string;
  kind: "png" | "json";
  open: BrandOpen;
  /** `unstyled`: the brand stylesheets are blocked (a surface may then reach past the window). */
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
  const css = !open.withoutBrandCss;
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

async function editorWithSelection(page: Page): Promise<void> {
  await closeWelcome(page);
  await insertShapes(page, [
    { type: "GRectangle", x: 100, y: 80, w: 220, h: 140, name: "Card" },
    { type: "GEllipse", x: 380, y: 120, w: 120, h: 120, name: "Dot", select: false },
  ]);
  await page.mouse.move(1590, 66);
  await settle(page, 300);
}

const scenarios: BrandScenario[] = [
  ...(["light", "dark"] as const).map((theme): BrandScenario => ({
    id: `brand/welcome-${theme}`,
    kind: "png",
    open: { theme },
    run: (page) => shoot(page, [".g-new-document-dialog"]),
  })),
  ...(["light", "dark"] as const).map((theme): BrandScenario => ({
    id: `brand/intro-${theme}`,
    kind: "png",
    open: { theme, intro: true },
    run: async (page, unstyled) => {
      await page.locator(".gd-intro-dialog-container.visible").waitFor();
      return shoot(page, [".g-dialog.gd-intro-dialog"], 8, unstyled);
    },
  })),
  ...(["light", "dark"] as const).map((theme): BrandScenario => ({
    id: `brand/editor-selection-${theme}`,
    kind: "png",
    open: { theme },
    // The whole window: the selected layer, the tabs, the toolbar and the
    // inspector with the accent colours.
    run: async (page) => {
      await editorWithSelection(page);
      return shoot(page, ["#mainframe"]);
    },
  })),
  ...(["light", "dark"] as const).map((theme): BrandScenario => ({
    id: `brand/inspector-${theme}`,
    kind: "png",
    open: { theme },
    // The inspector of the selection: the opacity slider and the fill row.
    run: async (page) => {
      await editorWithSelection(page);
      return shoot(page, ["#right-sidebars"]);
    },
  })),
  {
    id: "brand/layers",
    kind: "png",
    open: { theme: "light" },
    // The active sidebar tab and the layers of the selection. (The desktop
    // toolbar has no accent colour in the old stylesheets, so it looks the
    // same in both looks; see README.md.)
    run: async (page) => {
      await editorWithSelection(page);
      return shoot(page, ["#left-sidebars"]);
    },
  },
  {
    id: "brand/loading",
    kind: "png",
    open: { theme: "light" },
    // The loading screen as index.html shows it before the app starts:
    // body.loading with nothing in front of it.
    run: async (page) => {
      await page.evaluate(() => {
        document.body.classList.add("loading");
        for (const child of document.body.children)
          (child as HTMLElement).style.setProperty("display", "none", "important");
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
});
