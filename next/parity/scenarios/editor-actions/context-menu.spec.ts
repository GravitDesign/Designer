// Context menus (ACT-CTX), opened with a real right click and used with the
// mouse: the canvas menu over a selection (all submenus), choosing items
// from it, the Select hit list, Paste Here at the click position, the
// Layers panel trigger, the crop menu, the pages panel, the fill / border /
// effect rows of the inspector, the document tab, and which right clicks
// keep the browser's own menu.
import type { Locator, Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { signature, waitForChange } from "./keys.ts";
import { menuState, openedSubmenu, runProbe, sceneToClient, type ProbeArgs } from "./lib.ts";

interface MenuItem {
  caption: string;
  shortcut: string;
  classes: string[];
  shown: boolean;
}

const MENUS = "ul.g-menu:not(.g-menu-root):visible";

/**
 * The context menu opened last, pinned by its index so it keeps pointing
 * at the same menu when a submenu opens later.
 */
async function openMenu(page: Page): Promise<Locator> {
  await page.locator(MENUS).first().waitFor();
  const n = await page.locator(MENUS).count();
  return page.locator(MENUS).nth(n - 1);
}

async function dumpMenu(menu: Locator): Promise<MenuItem[]> {
  return menu.evaluate((ul) =>
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
        shown: el.style.display !== "none" && getComputedStyle(el).display !== "none",
      };
    }),
  );
}

function item(menu: Locator, caption: string): Locator {
  return menu.locator(":scope > li", {
    has: menu.page().locator(`:scope > .g-menu-item-caption:text-is("${caption}")`),
  });
}

async function rightClickScene(page: Page, x: number, y: number): Promise<Locator> {
  const p = await sceneToClient(page, x, y);
  await page.mouse.click(p.x, p.y, { button: "right" });
  const menu = await openMenu(page);
  return menu;
}

/** Opens a submenu by hovering its item and returns it with its items. */
async function submenu(
  page: Page,
  menu: Locator,
  caption: string,
): Promise<{ menu: Locator; items: MenuItem[] }> {
  const before = await menuState(page);
  await item(menu, caption).hover({ timeout: 5000 });
  await openedSubmenu(page, before);
  const sub = await openMenu(page);
  return { menu: sub, items: await dumpMenu(sub) };
}

async function after(page: Page, args: ProbeArgs): Promise<unknown> {
  return JSON.parse(await runProbe(page, { ...args, phase: "after" })) as unknown;
}

async function canvasMenuTree(page: Page): Promise<unknown> {
  const args: ProbeArgs = { setup: "overlap", phase: "setup", center: true };
  await runProbe(page, args);
  const menu = await rightClickScene(page, 150, 130);
  const top = await dumpMenu(menu);
  const subs: Record<string, MenuItem[]> = {};
  for (const name of ["Paste", "Arrange", "Align", "Transform", "Select Same", "Select"]) {
    if (!top.some((i) => i.caption === name)) continue;
    subs[name] = (await submenu(page, menu, name)).items;
  }
  await page.keyboard.press("Escape");
  return { top, subs };
}

async function chooseFromCanvasMenu(
  page: Page,
  setup: string,
  at: [number, number],
  path: string[],
  args: Partial<ProbeArgs> = {},
  prepare?: (page: Page, base: ProbeArgs) => Promise<void>,
): Promise<unknown> {
  const base: ProbeArgs = { setup, center: true, ...args };
  await runProbe(page, { ...base, phase: "setup" });
  if (prepare) await prepare(page, base);
  const before = await signature(page, base);
  let menu = await rightClickScene(page, at[0], at[1]);
  const shown = await dumpMenu(menu);
  for (let i = 0; i < path.length - 1; i++)
    menu = (await submenu(page, menu, path[i] as string)).menu;
  const last = path[path.length - 1] as string;
  const target = last.startsWith("#")
    ? menu.locator(":scope > li").nth(Number(last.slice(1)))
    : item(menu, last);
  const lastItems = await dumpMenu(menu);
  await target.click();
  await waitForChange(page, base, before);
  return {
    topLevelCaptions: shown.filter((i) => i.shown).map((i) => i.caption),
    lastMenu: lastItems,
    ...((await after(page, base)) as object),
  };
}

/** Enters crop mode on image "I" (40x20 at 100,100) with a real double click. */
async function doubleClickImage(page: Page, base: ProbeArgs): Promise<void> {
  const before = await signature(page, base);
  const c = await sceneToClient(page, 120, 110);
  await page.mouse.dblclick(c.x, c.y);
  await waitForChange(page, base, before);
}

async function layersPanelRightClick(page: Page): Promise<unknown> {
  const base: ProbeArgs = { setup: "rects2", center: true };
  await runProbe(page, { ...base, phase: "setup", pre: ["edit.deselect-all"] });
  // Right click the row of rectangle "A" in the Layers panel.
  const row = page.locator(".g-layer-panel .layer-row").filter({ hasText: /^A$/ }).first();
  await row.click({ button: "right" });
  const menu = await openMenu(page);
  const items = (await dumpMenu(menu)).filter((i) => i.shown).map((i) => i.caption);
  await page.keyboard.press("Escape");
  return { items, ...((await after(page, base)) as object) };
}

async function rowMenu(
  page: Page,
  setup: string,
  rowSelector: string,
  choose: string | null,
  hasText?: string,
): Promise<unknown> {
  const base: ProbeArgs = { setup, center: true };
  await runProbe(page, { ...base, phase: "setup" });
  let row = page.locator(rowSelector);
  if (hasText) row = row.filter({ hasText });
  // Near the left edge of the row, away from its inputs.
  await row.first().click({ button: "right", position: { x: 3, y: 8 } });
  const menu = await openMenu(page);
  const items = await dumpMenu(menu);
  let sub: MenuItem[] | undefined;
  if (items.some((i) => i.caption === "Apply to"))
    sub = (await submenu(page, menu, "Apply to")).items;
  if (choose) {
    const before = await signature(page, base);
    await item(await openMenu(page), choose).click();
    await waitForChange(page, base, before);
  } else await page.keyboard.press("Escape");
  return { items, sub, ...((await after(page, base)) as object) };
}

async function nativeMenuSuppression(page: Page): Promise<unknown> {
  await runProbe(page, { setup: "rect", phase: "setup", center: true });
  return page.evaluate(() => {
    const fire = (el: Element | null) => {
      if (!el) return "missing";
      const r = el.getBoundingClientRect();
      const ev = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        button: 2,
        clientX: r.left + 2,
        clientY: r.top + 2,
      });
      el.dispatchEvent(ev);
      return ev.defaultPrevented;
    };
    const input =
      Array.from(document.querySelectorAll("input[type=text]")).find(
        (i) => (i as HTMLElement).offsetParent !== null,
      ) ?? null;
    const header = document.querySelector(".g-menu-bar");
    const result = {
      canvas: fire(document.elementFromPoint(800, 500)),
      input: fire(input),
      menuBar: fire(header),
    };
    document
      .querySelectorAll("ul.g-menu:not(.g-menu-root)")
      .forEach((m) => ((m as HTMLElement).style.display = "none"));
    return result;
  });
}

async function tabMenu(page: Page): Promise<unknown> {
  await runProbe(page, { setup: "rect", phase: "setup" });
  await page.locator(".tabs .tab").first().click({ button: "right" });
  const menu = await openMenu(page);
  return dumpMenu(menu);
}

const scenarios: Scenario[] = [
  {
    id: "editor-actions/context-menu/canvas-tree",
    covers: ["ACT-CTX-001", "ACT-CTX-002", "ACT-CTX-003"],
    kind: "json",
    driver: ({ page }) => canvasMenuTree(page),
  },
  {
    id: "editor-actions/context-menu/empty-canvas",
    covers: ["ACT-CTX-001", "ACT-CTX-002"],
    kind: "json",
    driver: async ({ page }) => {
      await runProbe(page, { setup: "rect-nosel", phase: "setup", center: true });
      const menu = await rightClickScene(page, 400, 400);
      return dumpMenu(menu);
    },
  },
  {
    id: "editor-actions/context-menu/choose-group",
    covers: ["ACT-CTX-002", "ACT-MODIFY-001"],
    kind: "document",
    driver: ({ page }) =>
      chooseFromCanvasMenu(page, "rects2", [150, 130], ["Group Selection"]).then(JSON.stringify),
  },
  {
    id: "editor-actions/context-menu/choose-bring-to-front",
    covers: ["ACT-CTX-002", "ACT-ARRANGE-001"],
    kind: "document",
    driver: ({ page }) =>
      chooseFromCanvasMenu(page, "stack", [130, 130], ["Arrange", "Bring to Front"]).then(
        JSON.stringify,
      ),
  },
  {
    id: "editor-actions/context-menu/choose-align-left",
    covers: ["ACT-CTX-002", "ACT-ALIGN-001"],
    kind: "document",
    driver: ({ page }) =>
      chooseFromCanvasMenu(page, "rects3", [150, 130], ["Align", "Align Left"]).then(
        JSON.stringify,
      ),
  },
  {
    id: "editor-actions/context-menu/choose-flip-horizontal",
    covers: ["ACT-CTX-002", "ACT-ARRANGE-012"],
    kind: "document",
    driver: ({ page }) =>
      chooseFromCanvasMenu(page, "rects2", [150, 130], ["Transform", "Flip Horizontal"]).then(
        JSON.stringify,
      ),
  },
  {
    id: "editor-actions/context-menu/choose-select-same-fill",
    covers: ["ACT-CTX-002", "ACT-EDIT-018"],
    kind: "document",
    driver: ({ page }) =>
      chooseFromCanvasMenu(page, "styled", [130, 130], ["Select Same", "Fill"]).then(
        JSON.stringify,
      ),
  },
  {
    id: "editor-actions/context-menu/paste-here",
    covers: ["ACT-CTX-002", "EDT-CLIP-017", "ACT-EDIT-009"],
    kind: "document",
    driver: ({ page }) =>
      chooseFromCanvasMenu(page, "rect", [400, 350], ["Paste", "Paste Here"], {
        copyFirst: "selection",
      }).then(JSON.stringify),
  },
  {
    id: "editor-actions/context-menu/select-hit-list",
    covers: ["ACT-CTX-003"],
    kind: "document",
    // Overlap of R and E; pick the second entry of the hit list.
    driver: ({ page }) =>
      chooseFromCanvasMenu(page, "overlap", [190, 160], ["Select", "#1"], {
        pre: ["edit.deselect-all"],
      }).then(JSON.stringify),
  },
  {
    id: "editor-actions/context-menu/crop-menu",
    covers: ["ACT-CTX-004", "ACT-MODIFY-006", "EDT-CROP-006"],
    kind: "document",
    driver: ({ page }) =>
      chooseFromCanvasMenu(
        page,
        "image",
        [120, 110],
        ["Cancel Cropping"],
        {},
        doubleClickImage,
      ).then(JSON.stringify),
  },
  {
    id: "editor-actions/context-menu/layers-panel",
    covers: ["ACT-CTX-009"],
    kind: "document",
    driver: ({ page }) => layersPanelRightClick(page).then(JSON.stringify),
  },
  {
    id: "editor-actions/context-menu/fill-row-delete",
    covers: ["ACT-CTX-001", "ACT-CTX-006"],
    kind: "document",
    driver: ({ page }) =>
      rowMenu(page, "rect-border", ".fill-properties-panel .g-property-row", "Delete Fill").then(
        JSON.stringify,
      ),
  },
  {
    id: "editor-actions/context-menu/border-row",
    covers: ["ACT-CTX-001", "ACT-CTX-007"],
    kind: "document",
    driver: ({ page }) =>
      rowMenu(
        page,
        "rect-border",
        ".border-properties-panel .g-property-row",
        "Delete Border",
      ).then(JSON.stringify),
  },
  {
    id: "editor-actions/context-menu/effect-row",
    covers: ["ACT-CTX-001", "ACT-CTX-008"],
    kind: "document",
    driver: ({ page }) =>
      rowMenu(
        page,
        "styled-effect",
        ".effects-properties-panel .g-property-row, .effect-properties-panel .g-property-row",
        null,
      ).then(JSON.stringify),
  },
  {
    id: "editor-actions/context-menu/pages-panel",
    covers: ["ACT-CTX-005"],
    kind: "document",
    driver: ({ page }) =>
      rowMenu(page, "pages3", ".g-page-panel .page-row", "Duplicate Page", "P2").then(
        JSON.stringify,
      ),
  },
  {
    id: "editor-actions/context-menu/tab",
    covers: ["ACT-CTX-010"],
    kind: "json",
    driver: ({ page }) => tabMenu(page),
  },
  {
    id: "editor-actions/context-menu/native-menu-suppression",
    covers: ["ACT-CTX-013"],
    kind: "json",
    driver: ({ page }) => nativeMenuSuppression(page),
  },
];

paritySuite("editor-actions context menu", defineScenarios(scenarios), { newApp: false });
