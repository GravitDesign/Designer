// Import/export pieces the rewrite drops (INVENTORY "to drop", R2-001 a1):
// the old app is recorded as usual, and for the new app `removedInNewApp`
// checks that no trace is left instead of comparing.
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import { PARITY_CONTEXT, isolateNetwork } from "../../support/apps.ts";

const STATIC_PAGES = ["/proxy.html", "/static.maintenance.js"];

async function staticPages(page: Page): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const p of STATIC_PAGES) {
    const r = await page.request.get(new URL(p, page.url()).href);
    out[p] = { status: r.status(), type: r.headers()["content-type"] ?? null };
  }
  return out;
}

/**
 * The WebSocket connections a fresh boot of the app at the page's URL
 * opens, plus those opened while the font list's System Fonts tab is
 * shown (the old native font agent, FMT-IMPORT-027, would connect to
 * ws://127.0.0.1:32119 there outside the browser runtime).
 */
async function webSockets(page: Page): Promise<string[]> {
  const browser = page.context().browser();
  if (!browser) throw new Error("no browser");
  const context = await browser.newContext({
    ...PARITY_CONTEXT,
    viewport: { width: 1600, height: 1000 },
  });
  try {
    await isolateNetwork(context);
    const fresh = await context.newPage();
    const urls: string[] = [];
    fresh.on("websocket", (ws) => urls.push(ws.url()));
    await fresh.goto(page.url());
    await fresh.locator("nav.g-menu-bar").waitFor({ state: "visible", timeout: 60_000 });
    await fresh.waitForLoadState("networkidle");
    return urls;
  } finally {
    await context.close();
  }
}

const IOS = /^file\.import-image-from-ios-/;

const scenarios = defineScenarios<unknown>([
  {
    // proxy.html (a cross-origin settings probe nothing references) and the
    // maintenance page script are served by the old app (FMT-WORKER-016,
    // FMT-WORKER-017).
    id: "import-export/removed/static-pages",
    covers: ["FMT-WORKER-016", "FMT-WORKER-017"],
    kind: "json",
    driver: async ({ page }) => staticPages(page),
    removedInNewApp: async ({ page }) => {
      const found = Object.entries(await staticPages(page)).filter(
        ([, v]) => (v as { status: number }).status !== 404,
      );
      if (found.length > 0) {
        throw new Error(`still served: ${found.map(([p]) => p).join(", ")}`);
      }
    },
  },
  {
    // The native font agent client (FMT-IMPORT-027) only runs outside the
    // browser runtime: the browser build opens no WebSocket at all.
    id: "import-export/removed/local-font-agent",
    covers: ["FMT-IMPORT-027"],
    kind: "json",
    timeout: 120_000,
    driver: async ({ page }) => ({ webSockets: await webSockets(page) }),
    removedInNewApp: async ({ page }) => {
      const agent = (await webSockets(page)).filter((u) => /:321(19|2[0-4])\b/.test(u));
      if (agent.length > 0) throw new Error(`font agent connections: ${agent.join(", ")}`);
    },
  },
  {
    // GImportImageFromIOSAction (FMT-IMPORT-023): registered, but only
    // available on iPad, so it never shows in File > Import.
    id: "import-export/removed/ios-import-action",
    covers: ["FMT-IMPORT-023"],
    kind: "json",
    driver: async ({ page }) => {
      const actions = await page.evaluate((re) => {
        const app = (
          window as unknown as {
            __parity: { app: { actionIds(): string[]; canExecute(id: string): boolean } };
          }
        ).__parity.app;
        return app
          .actionIds()
          .filter((id) => new RegExp(re).test(id))
          .map((id) => ({ id, canExecute: app.canExecute(id) }));
      }, IOS.source);
      await page
        .locator("nav.g-menu-bar ul.g-menu-root > li.g-menu-item", {
          has: page.locator(':scope > .g-menu-item-caption:text-is("File")'),
        })
        .click();
      const importMenu = page
        .locator("ul.g-menu:not(.g-menu-root):visible > li.g-menu-item", {
          has: page.locator(':scope > .g-menu-item-caption:text-is("Import")'),
        })
        .first();
      await importMenu.hover();
      const sub = page.locator("ul.g-menu:not(.g-menu-root):visible").nth(1);
      await sub.waitFor({ state: "visible" });
      const items = await sub.locator(":scope > li .g-menu-item-caption").allInnerTexts();
      return { actions, importMenu: items };
    },
    removedInNewApp: async ({ page }) => {
      const ids = await page.evaluate(() =>
        (window as unknown as { __parity: { app: { actionIds(): string[] } } }).__parity.app
          .actionIds()
          .filter((id) => /ios/i.test(id)),
      );
      if (ids.length > 0) throw new Error(`iOS import actions still registered: ${ids.join(", ")}`);
    },
  },
]);

paritySuite("import-export removed features", scenarios, { newApp: false });
