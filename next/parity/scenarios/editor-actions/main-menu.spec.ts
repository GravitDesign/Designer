// The main menu as a user sees it: every top-level menu opened with a real
// click on the menu bar, every submenu opened by hovering, and each item's
// caption, shortcut hint and state classes (disabled, checked, hidden,
// divider). Recorded on a document with one selected rectangle, so the
// enabled states differ from an empty document.
import { expect, type Locator, type Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { menuState, openedSubmenu, runProbe } from "./lib.ts";

interface Entry {
  caption: string;
  shortcut: string;
  classes: string[];
  shown: boolean;
  submenu?: Entry[];
}

const MENUS = "ul.g-menu:not(.g-menu-root):visible";

async function lastMenu(page: Page): Promise<Locator> {
  await page.locator(MENUS).first().waitFor();
  const n = await page.locator(MENUS).count();
  return page.locator(MENUS).nth(n - 1);
}

async function dump(page: Page, menu: Locator, depth: number): Promise<Entry[]> {
  const entries = (await menu.evaluate((ul) =>
    Array.from(ul.children).map((li) => {
      const el = li as HTMLElement;
      const cap = el.querySelector(":scope > .g-menu-item-caption") as HTMLElement | null;
      const sc = el.querySelector(":scope > .g-menu-item-shortcut") as HTMLElement | null;
      return {
        caption: cap ? cap.innerText.trim() : "",
        shortcut: sc && sc.style.display !== "none" ? sc.innerText.trim() : "",
        classes: Array.from(el.classList)
          .filter((c) => c !== "g-menu-item")
          .sort(),
        shown: getComputedStyle(el).display !== "none",
      };
    }),
  )) as Entry[];
  if (depth > 0) {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i] as Entry;
      if (!e.shown || !e.classes.includes("g-menu-item-menu")) continue;
      const before = await menuState(page);
      await menu.locator(":scope > li").nth(i).hover();
      await openedSubmenu(page, before);
      const sub = await lastMenu(page);
      e.submenu = await dump(page, sub, depth - 1);
    }
  }
  return entries;
}

async function mainMenu(page: Page): Promise<unknown> {
  await runProbe(page, { setup: "rect", phase: "setup" });
  const bar = page.locator(".g-menu-bar ul.g-menu-root > li");
  const tops = await bar.evaluateAll((lis) =>
    lis.map((li) =>
      ((li.querySelector(".g-menu-item-caption") as HTMLElement | null)?.innerText ?? "").trim(),
    ),
  );
  const out: Record<string, Entry[]> = {};
  for (let i = 0; i < tops.length; i++) {
    await bar.nth(i).click();
    const menu = await lastMenu(page);
    out[tops[i] as string] = await dump(page, menu, 2);
    await page.keyboard.press("Escape");
    await expect(page.locator(MENUS)).toHaveCount(0);
  }
  return { menuBar: tops, menus: out };
}

const scenarios: Scenario[] = [
  {
    id: "editor-actions/main-menu/tree",
    covers: [
      "ACT-MENU-001",
      "ACT-MENU-003",
      "ACT-MENU-004",
      "ACT-MENU-005",
      "ACT-MENU-006",
      "ACT-MENU-007",
      "ACT-MENU-008",
      "ACT-KEY-025",
      "ACT-KEY-027",
    ],
    kind: "json",
    timeout: 240_000,
    driver: ({ page }) => mainMenu(page),
  },
];

paritySuite("editor-actions main menu", defineScenarios(scenarios), { newApp: false });
