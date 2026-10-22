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
      // The bar's own toggle (a vertical gCollapsible) folds it away.
      await page.click("#assistant-bar > .g-collapsible-button");
      await page.locator("#assistant-bar.collapsed").waitFor({ state: "attached" });
      await page.mouse.move(900, 800);
      await settle(page, 400);
    },
    shot: ["#assistant-bar"],
    themes: ["light"],
  },
  {
    id: "touch/assistant-right-expanded",
    covers: ["UI-TOUCH-011", "UI-TOUCH-012", "UI-TOUCH-014"],
    open: TOUCH,
    setup: async (page) => {
      // The right side starts collapsed; its arrow button expands it.
      await page.click("#assistant-bar .container > .g-collapsible-button");
      await page.locator("#assistant-bar .right-side.expanded").waitFor({ state: "attached" });
      await page.mouse.move(900, 800);
      await settle(page, 400);
    },
    shot: ["#assistant-bar"],
    dom: ["#assistant-bar"],
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
    "touch/assistant-toggle-state",
    ["UI-TOUCH-011", "UI-TOUCH-014", "UI-STORAGE-006"],
    async (page) => {
      const state = () =>
        page.evaluate(() => {
          const bar = document.getElementById("assistant-bar");
          const right = bar?.querySelector(".right-side");
          const stored = localStorage.getItem("designer.assistant-bar.left-side.expanded");
          return {
            bar: bar ? [...bar.classList].sort() : null,
            right: right ? [...right.classList].sort() : null,
            arrows: [...(bar?.querySelectorAll(".g-collapsible-button span") ?? [])].map(
              (s) => s.className,
            ),
            stored,
          };
        });
      const out = [await state()];
      await page.click("#assistant-bar .container > .g-collapsible-button");
      await settle(page);
      out.push(await state());
      await page.click("#assistant-bar .container > .g-collapsible-button");
      await settle(page);
      out.push(await state());
      await page.click("#assistant-bar > .g-collapsible-button");
      await settle(page);
      out.push(await state());
      return out;
    },
    TOUCH,
  ),
  behaviour(
    "touch/virtual-keys",
    ["UI-TOUCH-012", "UI-TOUCH-013"],
    async (page) => {
      await S.rect(page);
      // Every key event the bar sends to the canvas, and where the rectangle is.
      await page.evaluate(() => {
        const w = window as unknown as { __keys: string[] };
        w.__keys = [];
        for (const type of ["keydown", "keyup"]) {
          window.addEventListener(
            type,
            (e) => {
              const k = e as KeyboardEvent;
              if (!k.isTrusted) w.__keys.push(`${k.type}:${k.keyCode}:${k.key}`);
            },
            true,
          );
        }
      });
      const read = () =>
        page.evaluate(() => {
          const w = window as unknown as {
            __keys: string[];
            __parity: {
              app: {
                selection(): { getGeometryBBox(): { getX(): number; getY(): number } }[];
              };
            };
          };
          const keys = w.__keys.splice(0);
          const b = w.__parity.app.selection()[0]?.getGeometryBBox();
          return {
            keys,
            at: b ? [b.getX(), b.getY()] : null,
            held: [...document.querySelectorAll("#assistant-bar .g-held")].map((e) => e.className),
            active: [...document.querySelectorAll("#assistant-bar .toolbar-button.g-active")]
              .length,
          };
        });
      await page.click("#assistant-bar .container > .g-collapsible-button");
      await settle(page);
      const out: Record<string, unknown> = { initial: await read() };
      // Shift is the first virtual key on the bar.
      const shift = page.locator("#assistant-bar .g-virtual-key").first();
      out.shiftClass = await shift.getAttribute("class");
      await shift.click();
      await settle(page);
      out.shiftTap = await read();
      await shift.dblclick();
      await settle(page);
      out.shiftDoubleTap = await read();
      await shift.dblclick();
      await settle(page);
      out.shiftReleased = await read();
      await page
        .locator("#assistant-bar .action-button:has(.gravit-icon-touch-arrow-key-right)")
        .click();
      await settle(page);
      out.arrowRight = await read();
      return out;
    },
    TOUCH,
  ),
];

paritySuite("ui touch", scenarios, { newApp: false });
