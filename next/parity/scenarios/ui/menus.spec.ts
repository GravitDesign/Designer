import type { Page } from "@playwright/test";
import * as ids from "./ids.ts";
import { paritySuite } from "../../support/suite.ts";
import type { Scenario } from "../../support/scenario.ts";
import {
  behaviour,
  BROWSER_LOCALES,
  insertShapes,
  openMenu,
  settle,
  surfaces,
  type SurfaceSpec,
} from "./lib.ts";

/** How long a hover rests before the shot, so delayed tooltips are in it. */
const MENU_SHOT = ["ul.g-menu-root", "ul.g-menu:not(.g-menu-root)", ".g-rich-tooltip-container"];
const MENU_DOM = ["ul.g-menu:not(.g-menu-root)"];

interface MenuPath {
  path: readonly string[];
  covers: readonly string[];
}

const MENUS: readonly MenuPath[] = [
  { path: ["File"], covers: [...ids.RUN_MENU_1_25, "ACT-MENU-003", "ACT-MENU-007"] },
  { path: ["File", "Open Recent"], covers: ["RUN-MENU-005", "RUN-MENU-006", "ACT-MENU-007"] },
  { path: ["File", "Import"], covers: ids.RUN_MENU_9_12 },
  { path: ["File", "Export"], covers: ids.RUN_MENU_13_18 },
  { path: ["File", "Export", "PDF Document (.pdf)"], covers: ids.RUN_MENU_18_23 },
  { path: ["Edit"], covers: ids.RUN_MENU_26_52 },
  { path: ["Edit", "Paste"], covers: ids.RUN_MENU_30_35 },
  { path: ["Edit", "Select Same"], covers: ids.RUN_MENU_42_51 },
  { path: ["Modify"], covers: ids.RUN_MENU_53_111 },
  { path: ["Modify", "Arrange"], covers: ids.RUN_MENU_53_57 },
  { path: ["Modify", "Align"], covers: ids.RUN_MENU_58_70 },
  { path: ["Modify", "Transform"], covers: ids.RUN_MENU_71_79 },
  { path: ["Modify", "Create Compound Shape"], covers: ids.RUN_MENU_86_90 },
  { path: ["Modify", "Path"], covers: ids.RUN_MENU_92_106 },
  { path: ["Modify", "Symbol"], covers: ids.RUN_MENU_107_110 },
  { path: ["View"], covers: [...ids.RUN_MENU_112_162, "ACT-MENU-008", "UI-TOUCH-002"] },
  { path: ["View", "Magnification"], covers: ids.RUN_MENU_116_134 },
  { path: ["View", "Canvas"], covers: ids.RUN_MENU_137_144 },
  { path: ["View", "Snap to"], covers: ids.RUN_MENU_145_153 },
  { path: ["Help"], covers: [...ids.RUN_MENU_163_171, "RUN-I18N-001", "UI-I18N-007"] },
  { path: ["Help", "Support"], covers: ["RUN-MENU-163", "RUN-MENU-164"] },
  { path: ["Help", "Learn"], covers: ids.RUN_MENU_165_169 },
];

const BASE_COVERS = [
  "ACT-MENU-001",
  "ACT-MENU-004",
  "ACT-MENU-005",
  "ACT-MENU-006",
  "UI-SHELL-010",
  "RUN-SHELL-001",
];

const slug = (path: readonly string[]): string =>
  path
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function withRectangle(page: Page): Promise<void> {
  await insertShapes(page, [{ type: "GRectangle", x: 500, y: 340, w: 200, h: 120 }]);
}

async function open(page: Page, path: readonly string[]): Promise<void> {
  await openMenu(page, path);
  // Rich tooltips appear after 500 ms of hovering; wait past that.
  await settle(page, 900);
}

const menuSurfaces: SurfaceSpec[] = [];
for (const m of MENUS) {
  menuSurfaces.push({
    id: `menu/empty/${slug(m.path)}`,
    covers: [...BASE_COVERS, ...m.covers],
    setup: (page) => open(page, m.path),
    shot: MENU_SHOT,
    dom: MENU_DOM,
    // Top-level menus also in other browser locales (engine strings translate).
    ...(m.path.length === 1 ? { locales: BROWSER_LOCALES } : {}),
  });
  menuSurfaces.push({
    id: `menu/rect/${slug(m.path)}`,
    covers: [...BASE_COVERS, ...m.covers],
    setup: async (page) => {
      await withRectangle(page);
      await open(page, m.path);
    },
    shot: MENU_SHOT,
    dom: MENU_DOM,
    themes: ["light"],
  });
}

// Hover states: an enabled leaf, a disabled leaf, a checked item.
const HOVERS: { id: string; path: string[]; covers: string[] }[] = [
  { id: "file-save", path: ["File", "Save"], covers: ["RUN-MENU-007"] },
  { id: "file-print-disabled", path: ["File", "Print..."], covers: ["RUN-MENU-024"] },
  {
    id: "view-canvas-guides-checked",
    path: ["View", "Canvas", "Show Guide Lines"],
    covers: ["RUN-MENU-139"],
  },
  { id: "help-show-welcome", path: ["Help", "Show Welcome Screen"], covers: ["RUN-MENU-171"] },
];
for (const h of HOVERS) {
  menuSurfaces.push({
    id: `menu/hover/${h.id}`,
    covers: [...BASE_COVERS, ...h.covers],
    setup: (page) => open(page, h.path),
    shot: MENU_SHOT,
    dom: false,
  });
}

menuSurfaces.push({
  // With the File System Access API the save entries read differently.
  id: "menu/fsa/file",
  covers: [...BASE_COVERS, "RUN-MENU-008", "RUN-SAVE-001"],
  open: { fileSystemAccess: true },
  setup: (page) => open(page, ["File"]),
  shot: MENU_SHOT,
  dom: MENU_DOM,
  themes: ["light"],
});

menuSurfaces.push({
  // State changes show up the next time a menu opens (title/checked refresh).
  id: "menu/refresh/view-canvas-after-toggles",
  covers: ["ACT-MENU-001", "ACT-MENU-006", "RUN-MENU-138", "RUN-MENU-141", "RUN-STORAGE-002"],
  setup: async (page) => {
    await open(page, ["View", "Canvas", "Show Rulers"]);
    await page.mouse.click(
      ...(await page
        .locator("ul.g-menu:not(.g-menu-root):visible li.g-menu-item", {
          has: page.locator(':scope > .g-menu-item-caption:text-is("Show Rulers")'),
        })
        .boundingBox()
        .then((b) => {
          if (!b) throw new Error("no Show Rulers item");
          return [b.x + b.width / 2, b.y + b.height / 2] as [number, number];
        })),
    );
    await settle(page, 300);
    await open(page, ["View", "Canvas"]);
  },
  shot: MENU_SHOT,
  dom: MENU_DOM,
  themes: ["light"],
});

menuSurfaces.push({
  // Undo label carries the last transaction name.
  id: "menu/rect/edit-after-move",
  covers: ["RUN-MENU-026", "RUN-MENU-027"],
  setup: async (page) => {
    await withRectangle(page);
    await page.keyboard.press("ArrowRight");
    await settle(page);
    await open(page, ["Edit"]);
  },
  shot: MENU_SHOT,
  dom: MENU_DOM,
  themes: ["light"],
});

const scenarios: Scenario[] = [
  ...surfaces(menuSurfaces),
  behaviour("menu/action-ids", ["ACT-MENU-002", "ACT-MENU-001"], async (page) =>
    page.evaluate(() =>
      (
        window as unknown as { __parity: { app: { actionIds(): string[] } } }
      ).__parity.app.actionIds(),
    ),
  ),
  behaviour("menu/escape-closes", ["ACT-MENU-005"], async (page) => {
    await open(page, ["File", "Export"]);
    const before = await page.locator("ul.g-menu:not(.g-menu-root):visible").count();
    await page.keyboard.press("Escape");
    await settle(page, 300);
    const afterEscape = await page.locator("ul.g-menu:not(.g-menu-root):visible").count();
    await open(page, ["Edit"]);
    await page.mouse.click(800, 600);
    await settle(page, 300);
    const afterClick = await page.locator("ul.g-menu:not(.g-menu-root):visible").count();
    return { before, afterEscape, afterClick };
  }),
  behaviour("menu/hover-switches-top-menu", ["ACT-MENU-005", "RUN-SHELL-001"], async (page) => {
    await open(page, ["File"]);
    await page.hover('nav.g-menu-bar li.g-menu-item:has(> .g-menu-item-caption:text-is("View"))');
    await settle(page, 400);
    return page.evaluate(() =>
      [...document.querySelectorAll("ul.g-menu:not(.g-menu-root)")]
        .filter((m) => (m as HTMLElement).offsetParent !== null)
        .map((m) =>
          [...m.querySelectorAll(":scope > li > .g-menu-item-caption")]
            .slice(0, 3)
            .map((c) => c.textContent),
        ),
    );
  }),
  behaviour(
    "menu/execute-from-menu",
    ["ACT-MENU-001", "RUN-MENU-122", "RUN-MENU-124"],
    async (page) => {
      const zoom = () =>
        page.evaluate(() =>
          (
            window as unknown as { __parity: { app: { view(): { getZoom(): number } } } }
          ).__parity.app
            .view()
            .getZoom(),
        );
      await openMenu(page, ["View", "Magnification", "200%"]);
      await page
        .locator("ul.g-menu:not(.g-menu-root):visible li.g-menu-item", {
          has: page.locator(':scope > .g-menu-item-caption:text-is("200%")'),
        })
        .click();
      await settle(page);
      const after200 = await zoom();
      const menus = await page.locator("ul.g-menu:not(.g-menu-root):visible").count();
      return { after200, menusLeftOpen: menus };
    },
  ),
];

paritySuite("ui menus", scenarios, { newApp: false });
