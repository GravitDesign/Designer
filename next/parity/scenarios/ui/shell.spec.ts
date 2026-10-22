import type { Page } from "@playwright/test";
import * as ids from "./ids.ts";
import { paritySuite } from "../../support/suite.ts";
import type { Scenario } from "../../support/scenario.ts";
import {
  action,
  behaviour,
  clickMenu,
  drag,
  hoverLong,
  insertShapes,
  BROWSER_LOCALES,
  LOCALES,
  NEUTRAL,
  settle,
  surfaces,
  type SurfaceSpec,
} from "./lib.ts";

const RECT = [{ type: "GRectangle", x: 500, y: 340, w: 200, h: 120 }] as const;
const withRect = (page: Page) => insertShapes(page, RECT);

const SHELL_COVERS = [
  "UI-SHELL-001",
  "UI-SHELL-002",
  "UI-SHELL-003",
  "UI-SHELL-004",
  "UI-SHELL-005",
  "UI-SHELL-008",
  "UI-SHELL-009",
  "UI-SHELL-011",
  "UI-SHELL-012",
  "UI-SHELL-013",
  "UI-SHELL-015",
  "UI-SHELL-016",
  "UI-SHELL-020",
  "UI-SHELL-021",
  "UI-SHELL-022",
  "UI-SHELL-023",
  "UI-SHELL-035",
  "UI-SIDEBAR-001",
  "UI-SIDEBAR-002",
  "UI-THEME-001",
  "UI-THEME-004",
  "RUN-THEME-002",
  "RUN-THEME-004",
  "RUN-THEME-005",
];

const TOOLBAR_COVERS = [
  "UI-TOOLBAR-001",
  "UI-TOOLBAR-002",
  "UI-TOOLBAR-003",
  "UI-TOOLBAR-004",
  "UI-TOOLBAR-005",
  "UI-TOOLBAR-006",
  "UI-TOOLBAR-008",
  "UI-TOOLBAR-009",
  "UI-TOOLBAR-010",
  "UI-TOOLBAR-012",
  "UI-TOOLBAR-013",
  "RUN-SHELL-035",
  ...ids.RUN_SHELL_7_33,
];

/** Toolbar buttons in DOM order; index into `#toolbar .toolbar-button`. */
const TOOLBAR_BUTTONS = [
  "save",
  "undo",
  "redo",
  "zoom",
  "fit-all",
  "view",
  "snap",
  "select",
  "shape",
  "path",
  "knife",
  "text",
  "image",
  "flip-h",
  "flip-v",
  "rotate-left",
  "rotate-right",
  "group",
  "ungroup",
  "merge",
  "clip",
  "bring-forward",
  "send-backward",
  "create-symbol",
  "convert-to-path",
  "vectorize",
  "export",
] as const;

/** Buttons with a dropdown, and what opens it. */
const DROPDOWNS: { id: string; index: number; opener: string; covers: string[] }[] = [
  { id: "undo", index: 1, opener: ".dropdown-button", covers: ["UI-TOOLBAR-003", "RUN-SHELL-008"] },
  { id: "zoom", index: 3, opener: ".action-button", covers: ["UI-TOOLBAR-004", "RUN-SHELL-034"] },
  { id: "view", index: 5, opener: ".dropdown-button", covers: ["RUN-SHELL-012", "RUN-SHELL-042"] },
  { id: "snap", index: 6, opener: ".dropdown-button", covers: ["UI-TOOLBAR-005", "RUN-SHELL-013"] },
  {
    id: "select",
    index: 7,
    opener: ".dropdown-button",
    covers: ["RUN-SHELL-014", "RUN-SHELL-037"],
  },
  { id: "shape", index: 8, opener: ".dropdown-button", covers: ["RUN-SHELL-015", "RUN-SHELL-040"] },
  { id: "path", index: 9, opener: ".dropdown-button", covers: ["RUN-SHELL-016", "RUN-SHELL-038"] },
  {
    id: "knife",
    index: 10,
    opener: ".dropdown-button",
    covers: ["RUN-SHELL-017", "RUN-SHELL-039"],
  },
  { id: "image", index: 12, opener: ".dropdown-button", covers: ["RUN-SHELL-019"] },
  { id: "merge", index: 19, opener: ".dropdown-button", covers: ["RUN-SHELL-026"] },
];

const MENU_SHOT = ["#toolbar", "ul.g-menu:not(.g-menu-root)"];

async function openDropdown(page: Page, index: number, opener: string): Promise<void> {
  await page.locator("#toolbar .toolbar-button").nth(index).locator(opener).first().click();
  await settle(page, 400);
}

async function secondDocument(page: Page): Promise<void> {
  await clickMenu(page, ["File", "New Design..."]);
  await page.click(".g-new-document-dialog .cloud-button");
  await settle(page, 400);
}

const list: SurfaceSpec[] = [
  {
    id: "shell/window",
    covers: [...SHELL_COVERS, ...TOOLBAR_COVERS, "RUN-SHELL-044", "RUN-SHELL-045", "RUN-SHELL-049"],
    shot: ["body"],
    dom: ["#header", "#toolbar"],
    locales: BROWSER_LOCALES,
    languages: LOCALES,
  },
  {
    id: "shell/window-rect",
    covers: [...SHELL_COVERS, "UI-TOOLBAR-008", "RUN-SHELL-043"],
    setup: withRect,
    shot: ["body"],
    dom: ["#toolbar"],
  },
  {
    id: "shell/header",
    covers: ["UI-SHELL-008", "UI-SHELL-009", "UI-SHELL-011", "UI-TABS-001", "UI-TABS-002"],
    shot: ["#header"],
  },
  {
    id: "shell/toolbar",
    covers: TOOLBAR_COVERS,
    shot: ["#toolbar"],
  },
  {
    id: "shell/narrow",
    covers: ["UI-SHELL-004", "UI-TOOLBAR-001"],
    viewport: { width: 1024, height: 700 },
    shot: ["body"],
    dom: false,
  },
  {
    id: "shell/small",
    covers: ["UI-SHELL-004", "UI-SHELL-031"],
    viewport: { width: 800, height: 600 },
    shot: ["body"],
    dom: false,
  },
  {
    id: "shell/wide",
    covers: ["UI-SHELL-004"],
    viewport: { width: 2200, height: 1200 },
    shot: ["body"],
    dom: false,
  },
  {
    id: "shell/toolbar-center",
    covers: ["UI-SHELL-035", "UI-SETTING-008"],
    open: { settings: { ui_toolbar_alignment: false } },
    shot: ["#toolbar"],
    dom: false,
  },
  {
    id: "shell/rulers",
    covers: ["UI-SHELL-030", "RUN-MENU-138", "RUN-STORAGE-002"],
    setup: async (page) => {
      await withRect(page);
      await clickMenu(page, ["View", "Canvas", "Show Rulers"]);
      await page.mouse.move(640, 420);
      await settle(page, 300);
    },
    shot: ["#windows"],
    dom: ["#windows"],
  },
  {
    id: "shell/left-libraries",
    covers: [
      "UI-LIBRARY-001",
      "UI-LIBRARY-002",
      "UI-LIBRARY-003",
      "UI-LIBRARY-004",
      "RUN-SHELL-047",
    ],
    setup: async (page) => {
      await page.click("#left-sidebars .sidebar-option.sidebar-library");
      await settle(page, 500);
    },
    shot: ["#left-sidebars"],
  },
  {
    id: "shell/left-symbols",
    covers: ["UI-LIBRARY-010", "UI-LIBRARY-013", "RUN-SHELL-048"],
    setup: async (page) => {
      await page.click("#left-sidebars .sidebar-option.sidebar-symbols");
      await settle(page, 300);
    },
    shot: ["#left-sidebars"],
  },
  {
    id: "shell/left-symbols-rect",
    covers: ["UI-LIBRARY-010"],
    setup: async (page) => {
      await withRect(page);
      await page.click("#left-sidebars .sidebar-option.sidebar-symbols");
      await settle(page, 300);
    },
    shot: ["#left-sidebars .sidebar-container.sidebar-symbols .toolbar"],
    themes: ["light"],
  },
  {
    id: "shell/right-comments",
    covers: ["UI-SIDEBAR-003", "UI-SIDEBAR-004", "UI-SIDEBAR-005", "RUN-SHELL-049"],
    setup: async (page) => {
      await page.click("#right-sidebars .sidebar-option.sidebar-annotations");
      await settle(page, 500);
    },
    shot: ["#right-sidebars"],
  },
  {
    id: "shell/sidebar-tab-hover",
    covers: ["UI-SHELL-015"],
    setup: async (page) => {
      await page.hover("#left-sidebars .sidebar-option.sidebar-library");
    },
    shot: ["#left-sidebars .sidebar-selector"],
    dom: false,
  },
  {
    id: "shell/layers-hidden",
    covers: ["UI-SHELL-019", "RUN-MENU-156", "ACT-MENU-008"],
    setup: async (page) => {
      await clickMenu(page, ["View", "Show Layers Panel"]);
      await page.mouse.move(NEUTRAL.x, NEUTRAL.y);
    },
    shot: ["body"],
    dom: false,
  },
  {
    id: "shell/inspector-hidden",
    covers: ["UI-SHELL-019", "RUN-MENU-154"],
    setup: async (page) => {
      await clickMenu(page, ["View", "Show Inspector Panel"]);
      await page.mouse.move(NEUTRAL.x, NEUTRAL.y);
    },
    shot: ["body"],
    dom: false,
    themes: ["light"],
  },
  {
    id: "shell/sidebar-resized",
    covers: ["UI-SHELL-017"],
    setup: async (page) => {
      await page.mouse.move(249, 500);
      await settle(page, 200);
      await drag(page, [249, 500], [380, 500], { steps: 10 });
      await page.mouse.move(NEUTRAL.x, NEUTRAL.y);
    },
    shot: ["body"],
    dom: false,
  },
  {
    id: "shell/sidebar-resize-hover",
    covers: ["UI-SHELL-017"],
    setup: async (page) => {
      await page.mouse.move(248, 500);
      await settle(page, 200);
    },
    shot: ["body"],
    dom: false,
    themes: ["light"],
  },
  {
    id: "shell/play",
    covers: ["RUN-DIALOG-022", "RUN-MENU-160"],
    setup: async (page) => {
      await withRect(page);
      await clickMenu(page, ["View", "Play/Present..."]);
      await settle(page, 800);
    },
    shot: ["body"],
    dom: false,
  },
  {
    id: "shell/avatar-menu",
    covers: ["UI-SHELL-009", "RUN-SHELL-005"],
    setup: async (page) => {
      await page.click("#header .section.login .avatar");
      await settle(page, 400);
    },
    shot: ["#header", ".g-overlay", "ul.g-menu:not(.g-menu-root)"],
    dom: [".g-overlay", "ul.g-menu:not(.g-menu-root)"],
  },
  // Tabs
  {
    id: "tabs/modified",
    covers: ["UI-TABS-002", "UI-TABS-006", "RUN-SHELL-002"],
    setup: withRect,
    shot: ["#header .section.windows"],
  },
  {
    id: "tabs/two-documents",
    covers: ["UI-TABS-001", "UI-TABS-002", "UI-TABS-006", "RUN-START-020"],
    setup: async (page) => {
      await withRect(page);
      await secondDocument(page);
    },
    shot: ["#header"],
  },
  {
    id: "tabs/hover-inactive",
    covers: ["UI-TABS-002"],
    setup: async (page) => {
      await secondDocument(page);
      await page.hover("#header .tabs .tab >> nth=0");
    },
    shot: ["#header .section.windows"],
    dom: false,
  },
  {
    id: "tabs/context-menu",
    covers: ["UI-TABS-004", "ACT-CTX-010", "RUN-SHELL-003"],
    setup: async (page) => {
      await page.click("#header .tabs .tab", { button: "right" });
      await settle(page, 400);
    },
    shot: ["#header", "ul.g-menu:not(.g-menu-root)"],
    dom: ["ul.g-menu:not(.g-menu-root)"],
  },
  {
    id: "tabs/context-menu-two",
    covers: ["UI-TABS-004", "ACT-CTX-010"],
    setup: async (page) => {
      await withRect(page);
      await secondDocument(page);
      await page.click("#header .tabs .tab >> nth=1", { button: "right" });
      await settle(page, 400);
    },
    shot: ["#header", "ul.g-menu:not(.g-menu-root)"],
    dom: ["ul.g-menu:not(.g-menu-root)"],
    themes: ["light"],
  },
  {
    id: "tabs/rename",
    covers: ["UI-TABS-004", "ACT-CTX-010"],
    setup: async (page) => {
      await page.click("#header .tabs .tab", { button: "right" });
      await settle(page, 300);
      await page
        .locator("ul.g-menu:not(.g-menu-root):visible li.g-menu-item", {
          has: page.locator(':scope > .g-menu-item-caption:text-is("Rename")'),
        })
        .click();
      await settle(page, 300);
      await page.keyboard.type("Poster");
    },
    shot: ["#header .section.windows"],
  },
  {
    id: "tabs/more-list",
    covers: ["UI-TABS-005", "RUN-SHELL-004"],
    setup: async (page) => {
      await withRect(page);
      await secondDocument(page);
      await page.click("#header .more-button");
      await settle(page, 400);
    },
    shot: ["#header", "#header .more-button .moreTab"],
    dom: ["#header .more-button"],
  },
  {
    id: "shell/fullscreen-banner",
    covers: ["UI-SHELL-014", "RUN-MENU-161"],
    setup: async (page) => {
      await clickMenu(page, ["View", "Toggle Fullscreen..."]);
      await settle(page, 1000);
    },
    shot: ["body"],
    dom: [".g-fullscreen-banner"],
    themes: ["light"],
  },
];

for (const d of DROPDOWNS) {
  list.push({
    id: `toolbar/dropdown-${d.id}`,
    covers: ["UI-TOOLBAR-002", "UI-TOOLBAR-013", ...d.covers],
    setup: (page) => openDropdown(page, d.index, d.opener),
    shot: MENU_SHOT,
    dom: ["ul.g-menu:not(.g-menu-root)"],
  });
}
list.push({
  id: "toolbar/dropdown-undo-history",
  covers: ["UI-TOOLBAR-003", "RUN-SHELL-008"],
  setup: async (page) => {
    await withRect(page);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await action(page, "edit.undo");
    await openDropdown(page, 1, ".dropdown-button");
  },
  shot: MENU_SHOT,
  dom: ["ul.g-menu:not(.g-menu-root)"],
  themes: ["light"],
});
list.push({
  id: "toolbar/dropdown-merge-enabled",
  covers: ["RUN-SHELL-026", "UI-TOOLBAR-008"],
  setup: async (page) => {
    await insertShapes(page, [
      { type: "GRectangle", x: 500, y: 340, w: 200, h: 120 },
      { type: "GEllipse", x: 600, y: 400, w: 150, h: 150 },
    ]);
    await openDropdown(page, 19, ".dropdown-button");
  },
  shot: MENU_SHOT,
  dom: ["ul.g-menu:not(.g-menu-root)"],
  themes: ["light"],
});
list.push({
  id: "toolbar/shape-tool-remembered",
  covers: ["RUN-SHELL-040"],
  setup: async (page) => {
    await openDropdown(page, 8, ".dropdown-button");
    await page
      .locator("ul.g-menu:not(.g-menu-root):visible li.g-menu-item", {
        has: page.locator(':scope > .g-menu-item-caption:text-is("Star")'),
      })
      .click();
    await settle(page, 300);
    await page.mouse.move(NEUTRAL.x, NEUTRAL.y);
  },
  shot: ["#toolbar .tool-section"],
  themes: ["light"],
});

TOOLBAR_BUTTONS.forEach((name, index) => {
  list.push({
    id: `toolbar/tooltip-${name}`,
    covers: ["UI-TOOLTIP-001", "UI-TOOLTIP-002", "UI-TOOLBAR-002"],
    setup: (page) => hoverLong(page, `#toolbar .toolbar-button >> nth=${index} >> .action-button`),
    shot: [".g-rich-tooltip-container", ".g-tooltip"],
    dom: [".g-rich-tooltip-container", ".g-tooltip"],
    themes: index === 0 || index === 7 ? ["light", "dark"] : ["light"],
  });
});

list.push({
  id: "toolbar/tooltip-simple-when-not-enhanced",
  covers: ["UI-TOOLTIP-003", "RUN-MENU-168"],
  setup: async (page) => {
    await clickMenu(page, ["Help", "Learn", "Display Enhanced Tooltips"]);
    await page.mouse.move(NEUTRAL.x, NEUTRAL.y);
    await settle(page, 600);
    await hoverLong(page, "#toolbar .toolbar-button >> nth=7 >> .action-button");
  },
  shot: [".g-rich-tooltip-container", ".g-tooltip"],
  dom: [".g-rich-tooltip-container", ".g-tooltip"],
});
list.push({
  id: "tooltip/simple-data-title",
  covers: ["UI-TOOLTIP-004"],
  setup: async (page) => {
    await hoverLong(page, "#left-sidebars .page-toolbar button:has(.gravit-icon-addpage)");
  },
  shot: [".g-tooltip", ".g-rich-tooltip-container"],
  dom: [".g-tooltip", ".g-rich-tooltip-container"],
});
list.push({
  id: "tooltip/inspector-field",
  covers: ["UI-TOOLTIP-004"],
  setup: async (page) => {
    await withRect(page);
    await hoverLong(page, ".sidebar-inspector .hacr-start");
  },
  shot: [".g-tooltip", ".g-rich-tooltip-container"],
  dom: [".g-tooltip", ".g-rich-tooltip-container"],
  themes: ["light"],
});

const scenarios: Scenario[] = [
  ...surfaces(list),
  behaviour(
    "shell/body-and-title",
    ["UI-SHELL-001", "UI-SHELL-005", "UI-SHELL-006", "RUN-SHELL-006"],
    async (page) =>
      page.evaluate(() => ({
        title: document.title,
        body: [...document.body.classList],
        longPress: document.body.getAttribute("data-long-press-delay"),
        mainframe: getComputedStyle(document.getElementById("mainframe") as HTMLElement).display,
        parts: [
          "info",
          "header",
          "toolbar",
          "panels",
          "footer",
          "left-sidebars",
          "right-sidebars",
          "windows",
          "banner",
          "overlay",
        ].map((id) => {
          const el = document.getElementById(id);
          if (!el) return [id, null];
          const r = el.getBoundingClientRect();
          return [id, getComputedStyle(el).display, r.left, r.top, r.width, r.height];
        }),
      })),
  ),
  behaviour(
    "shell/welcome-title",
    ["UI-SHELL-006", "RUN-SHELL-006"],
    async (page) => page.title(),
    {
      newDocument: false,
    },
  ),
  behaviour("toolbar/zoom-buttons", ["UI-TOOLBAR-004", "RUN-SHELL-034"], async (page) => {
    const caption = () => page.locator("#toolbar .zoom-button .caption").textContent();
    const out: (string | null)[] = [await caption()];
    await page.click("#toolbar .zoom-button .right-attached.attached-button");
    await settle(page);
    out.push(await caption());
    await page.click("#toolbar .zoom-button .left-attached.attached-button");
    await page.click("#toolbar .zoom-button .left-attached.attached-button");
    await settle(page);
    out.push(await caption());
    return out;
  }),
  behaviour("shell/sidebar-width-setting", ["UI-SHELL-017", "UI-SHELL-016"], async (page) => {
    await page.mouse.move(249, 500);
    await settle(page, 200);
    await drag(page, [249, 500], [380, 500], { steps: 10 });
    return page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as Record<
        string,
        unknown
      >;
      return {
        width: s.sidebars_width_outline ?? null,
        box: (document.getElementById("left-sidebars") as HTMLElement).getBoundingClientRect()
          .width,
      };
    });
  }),
  behaviour("shell/sidebar-toggle-setting", ["UI-SHELL-019", "UI-SHELL-016"], async (page) => {
    const read = () =>
      page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as Record<
          string,
          unknown
        >;
        return [
          s.sidebars_left_active,
          s.sidebars_right_active,
          getComputedStyle(document.getElementById("left-sidebars") as HTMLElement).display,
          getComputedStyle(document.getElementById("right-sidebars") as HTMLElement).display,
        ];
      });
    const out = [await read()];
    await page.keyboard.press("Alt+1");
    await settle(page);
    out.push(await read());
    await page.keyboard.press("Alt+2");
    await settle(page);
    out.push(await read());
    await page.keyboard.press("Alt+1");
    await page.keyboard.press("Alt+2");
    await settle(page);
    out.push(await read());
    return out;
  }),
  behaviour("tabs/rename-commits", ["UI-TABS-004", "ACT-CTX-010", "UI-TABS-006"], async (page) => {
    await page.click("#header .tabs .tab", { button: "right" });
    await settle(page, 300);
    await page
      .locator("ul.g-menu:not(.g-menu-root):visible li.g-menu-item", {
        has: page.locator(':scope > .g-menu-item-caption:text-is("Rename")'),
      })
      .click();
    await settle(page, 300);
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Poster");
    await page.keyboard.press("Enter");
    await settle(page, 300);
    return page.evaluate(() => ({
      tabs: [...document.querySelectorAll("#header .tabs .tab .cover")].map((t) => t.textContent),
      title: document.title,
    }));
  }),
  behaviour(
    "tabs/close-and-activate",
    ["UI-TABS-002", "UI-SHELL-022", "UI-WELCOME-001"],
    async (page) => {
      await secondDocument(page);
      const tabs = () =>
        page.evaluate(() =>
          [...document.querySelectorAll("#header .tabs .tab")].map(
            (t) =>
              `${t.classList.contains("g-active") ? "*" : ""}${t.querySelector(".cover")?.textContent ?? ""}`,
          ),
        );
      const out = [await tabs()];
      await page.click("#header .tabs .tab >> nth=0");
      await settle(page);
      out.push(await tabs());
      await page.click("#header .tabs .tab >> nth=0 >> .close");
      await settle(page, 400);
      out.push(await tabs());
      await page.click("#header .tabs .tab >> nth=0 >> .close");
      await settle(page, 400);
      out.push(await tabs());
      const welcome = await page.locator(".g-new-document-dialog-container.visible").count();
      return { tabs: out, welcome };
    },
  ),
];

paritySuite("ui shell", scenarios, { newApp: false });
