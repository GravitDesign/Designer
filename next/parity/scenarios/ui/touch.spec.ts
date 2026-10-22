import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import type { Scenario } from "../../support/scenario.ts";
import {
  action,
  behaviour,
  clickMenu,
  rightClick,
  settle,
  surfaces,
  type SurfaceSpec,
} from "./lib.ts";
import * as S from "./states.ts";

const TOUCH = { settings: { touch: true } };
const BASE = [
  "UI-TOUCH-001",
  "UI-TOUCH-005",
  "UI-TOUCH-006",
  "UI-TOUCH-007",
  "UI-TOUCH-011",
  "UI-TOUCH-014",
];

async function rectOff(page: Page): Promise<void> {
  await S.rect(page);
  await page.mouse.move(900, 800);
  await settle(page, 300);
}

const list: SurfaceSpec[] = [
  {
    id: "touch/window",
    covers: [
      ...BASE,
      "UI-TOUCH-009",
      "UI-TOUCH-010",
      "ACT-MENU-009",
      "UI-SHELL-035",
      "UI-THEME-003",
      "UI-SIDEBAR-006",
    ],
    open: TOUCH,
    shot: ["body"],
    dom: [
      "#toolbar",
      "#assistant-bar",
      "#left-sidebars .g-touch-toolbar",
      "#right-sidebars .g-touch-toolbar",
    ],
  },
  {
    id: "touch/window-rect",
    covers: [...BASE, "UI-TOUCH-012", "UI-TOUCH-004"],
    open: TOUCH,
    setup: rectOff,
    shot: ["body"],
    dom: ["#assistant-bar"],
  },
  {
    id: "touch/narrow",
    covers: BASE,
    open: TOUCH,
    viewport: { width: 1024, height: 768 },
    shot: ["body"],
    dom: false,
  },
  {
    id: "touch/hamburger-menu",
    covers: ["ACT-MENU-009", "UI-TOUCH-007"],
    open: TOUCH,
    setup: async (page) => {
      await page.click("#toolbar .menubar-toolbar-button button, #toolbar .menubar-toolbar-button");
      await settle(page, 400);
    },
    shot: ["#toolbar", "ul.g-menu:not(.g-menu-root)", ".g-overlay"],
    dom: ["ul.g-menu:not(.g-menu-root)", ".g-overlay"],
  },
  {
    id: "touch/zoom-menu",
    covers: ["UI-TOUCH-008"],
    open: TOUCH,
    setup: async (page) => {
      await page
        .locator("#toolbar .menu-section .zoom-button, #toolbar .g-touch-only .zoom-button")
        .first()
        .click();
      await settle(page, 400);
    },
    shot: ["#toolbar", "ul.g-menu:not(.g-menu-root)", ".g-overlay"],
    dom: ["ul.g-menu:not(.g-menu-root)", ".g-overlay"],
    themes: ["light"],
  },
  {
    id: "touch/left-tool-open",
    covers: ["UI-TOUCH-005", "UI-TOUCH-006"],
    open: TOUCH,
    setup: async (page) => {
      await S.rect(page);
      await page.locator("#left-sidebars .g-touch-toolbar-button").first().click();
      await settle(page, 500);
    },
    shot: ["body"],
    dom: ["#left-sidebars"],
  },
  {
    id: "touch/right-tool-open",
    covers: ["UI-TOUCH-005", "UI-TOUCH-006", "UI-TOUCH-017"],
    open: TOUCH,
    setup: async (page) => {
      await S.rect(page);
      await page.locator("#right-sidebars .g-touch-toolbar-button").first().click();
      await settle(page, 500);
    },
    shot: ["body"],
    dom: ["#right-sidebars"],
  },
  {
    id: "touch/context-menu",
    covers: ["ACT-CTX-011", "UI-TOUCH-016"],
    open: TOUCH,
    setup: async (page) => {
      await S.rect(page);
      await rightClick(page, 600, 400);
    },
    shot: [".g-overlay", "ul.g-menu:not(.g-menu-root)"],
    dom: [".g-overlay", "ul.g-menu:not(.g-menu-root)"],
  },
  {
    id: "touch/assistant-collapsed",
    covers: ["UI-TOUCH-011", "UI-TOUCH-014"],
    open: TOUCH,
    setup: async (page) => {
      await page
        .locator("#assistant-bar .g-collapsible > *, #assistant-bar button")
        .first()
        .click();
      await page.mouse.move(900, 800);
      await settle(page, 400);
    },
    shot: ["#assistant-bar"],
    themes: ["light"],
  },
  {
    id: "touch/quick-help",
    covers: ["UI-TOUCH-015"],
    open: TOUCH,
    setup: (page) => action(page, "help.open-quick-help"),
    shot: ["body"],
    dom: [".g-quick-help-screen"],
    themes: ["light"],
  },
];

const scenarios: Scenario[] = [
  ...surfaces(list),
  behaviour(
    "touch/toggle-from-view-menu",
    ["UI-TOUCH-001", "UI-TOUCH-002", "RUN-MENU-162"],
    async (page) => {
      const state = () =>
        page.evaluate(() => ({
          touch: document.body.classList.contains("g-touch"),
          stored: (
            JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as Record<string, unknown>
          ).touch,
          assistant: getComputedStyle(document.getElementById("assistant-bar") ?? document.body)
            .display,
        }));
      const out = [await state()];
      await clickMenu(page, ["View", "Touch interface"]);
      await settle(page, 600);
      out.push(await state());
      return out;
    },
  ),
  behaviour(
    "touch/virtual-shift",
    ["UI-TOUCH-012", "UI-TOUCH-013"],
    async (page) => {
      await S.rect(page);
      const key = page
        .locator("#assistant-bar .g-virtual-key-shift, #assistant-bar [class*=virtual-key]")
        .first();
      const cls = await key.getAttribute("class");
      await key.click();
      await settle(page, 300);
      return { cls, after: await key.getAttribute("class") };
    },
    TOUCH,
  ),
];

paritySuite("ui touch", scenarios, { newApp: false });
