import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import type { Scenario } from "../../support/scenario.ts";
import {
  action,
  behaviour,
  drag,
  hoverLong,
  insertShapes,
  settle,
  surfaces,
  waitForImages,
  type SurfaceSpec,
} from "./lib.ts";
import * as S from "./states.ts";

const LEFT = ["#left-sidebars"];
const LAYERS = [
  "UI-LAYERS-001",
  "UI-LAYERS-002",
  "UI-LAYERS-004",
  "UI-LAYERS-005",
  "UI-LAYERS-006",
  "UI-LAYERS-007",
  "UI-LAYERS-017",
  "UI-LAYERS-018",
  "RUN-SHELL-045",
  "RUN-SHELL-046",
];

/** A tree with a group, shapes, a text and a layer. */
async function richTree(page: Page): Promise<void> {
  await insertShapes(page, [
    { type: "GRectangle", x: 400, y: 300, w: 120, h: 80, name: "Card" },
    { type: "GEllipse", x: 560, y: 300, w: 100, h: 100 },
    { type: "GPolygon", x: 700, y: 300, w: 100, h: 100 },
  ]);
  await action(page, "modify.group");
  await insertShapes(page, [{ type: "GRectangle", x: 400, y: 450, w: 80, h: 80 }]);
  await S.text(page);
}

const row = (n: number) => `#left-sidebars .layers .layer-row >> nth=${n}`;

const list: SurfaceSpec[] = [
  {
    // The only scenario with scrollbars (prepare() hides them elsewhere):
    // forty layers overflow the layers list, so the app's own scrollbar
    // styles (::-webkit-scrollbar rules per theme) show up.
    id: "layers/scrollbars",
    covers: ["UI-LAYERS-001", "UI-THEME-004", "UI-SIDEBAR-002"],
    scrollbars: true,
    setup: async (page) => {
      await insertShapes(
        page,
        Array.from({ length: 40 }, (_, i) => ({
          type: "GRectangle" as const,
          x: 300 + (i % 10) * 60,
          y: 300 + Math.floor(i / 10) * 60,
          w: 40,
          h: 40,
          select: false,
        })),
      );
      await page.mouse.move(120, 500);
      await settle(page, 300);
    },
    shot: LEFT,
    dom: false,
  },
  { id: "layers/empty", covers: LAYERS, shot: LEFT },
  { id: "layers/tree", covers: [...LAYERS, "UI-LAYERS-015"], setup: richTree, shot: LEFT },
  {
    id: "layers/expanded",
    covers: [...LAYERS, "UI-LAYERS-015"],
    setup: async (page) => {
      await richTree(page);
      await page.click(`${row(2)} >> .layer-arrow`).catch(async () => {
        await page.locator("#left-sidebars .layers .layer-arrow").first().click();
      });
      await settle(page, 300);
    },
    shot: LEFT,
    themes: ["light"],
  },
  {
    id: "layers/selected-row",
    covers: [...LAYERS, "UI-LAYERS-014"],
    setup: async (page) => {
      await richTree(page);
      await page.click(row(1));
      await settle(page, 300);
    },
    shot: LEFT,
  },
  {
    id: "layers/hover-row",
    covers: ["UI-LAYERS-006"],
    setup: async (page) => {
      await richTree(page);
      await page.hover(row(2));
      await settle(page, 300);
    },
    shot: ["body"],
    dom: false,
    themes: ["light"],
  },
  {
    id: "layers/hover-actions",
    covers: ["UI-LAYERS-008", "UI-LAYERS-009"],
    setup: async (page) => {
      await richTree(page);
      // Waits past the tooltip delay for the tooltip to show.
      await hoverLong(page, `${row(1)} >> .layer-visibility`);
    },
    shot: [...LEFT, ".g-tooltip", ".g-rich-tooltip-container"],
    dom: false,
    themes: ["light"],
  },
  {
    id: "layers/locked",
    covers: ["UI-LAYERS-008"],
    setup: async (page) => {
      await richTree(page);
      await page.hover(row(1));
      await page.click(`${row(1)} >> .layer-lock`);
      await page.mouse.move(800, 900);
      await settle(page, 300);
    },
    shot: LEFT,
  },
  {
    id: "layers/hidden",
    covers: ["UI-LAYERS-009"],
    setup: async (page) => {
      await richTree(page);
      await page.hover(row(1));
      await page.click(`${row(1)} >> .layer-visibility`);
      await page.mouse.move(800, 900);
      await settle(page, 300);
    },
    shot: LEFT,
  },
  {
    id: "layers/renaming",
    covers: ["UI-LAYERS-013", "UI-FIELD-171"],
    setup: async (page) => {
      await richTree(page);
      await page.dblclick(`${row(1)} >> .layer-title`);
      await settle(page, 300);
      await page.keyboard.type("Renamed");
    },
    shot: LEFT,
  },
  {
    id: "layers/renamed",
    covers: ["UI-LAYERS-013"],
    setup: async (page) => {
      await richTree(page);
      await page.dblclick(`${row(1)} >> .layer-title`);
      await settle(page, 300);
      await page.keyboard.press("Control+A");
      await page.keyboard.type("Renamed");
      await page.keyboard.press("Enter");
      await settle(page, 300);
    },
    shot: LEFT,
    themes: ["light"],
  },
  {
    id: "layers/dragging",
    covers: ["UI-LAYERS-016", "UI-LAYERS-017"],
    setup: async (page) => {
      await richTree(page);
      const a = await page.locator(row(0)).boundingBox();
      const b = await page.locator(row(2)).boundingBox();
      if (!a || !b) throw new Error("no rows");
      await page.mouse.move(a.x + 60, a.y + a.height / 2);
      await page.mouse.down();
      // Shorter than the 500 ms long press, which would open the row menu.
      await page.waitForTimeout(200);
      await page.mouse.move(b.x + 60, b.y + b.height / 2, { steps: 10 });
      await settle(page, 300);
    },
    shot: LEFT,
    dom: LEFT,
  },
  {
    id: "layers/new-layer",
    covers: ["UI-LAYERS-003", "UI-LAYERS-010", "UI-LAYERS-011"],
    setup: async (page) => {
      await S.rect(page);
      await S.newLayer(page);
    },
    shot: LEFT,
  },
  {
    id: "layers/symbol",
    covers: ["UI-LAYERS-007", "UI-LAYERS-012"],
    setup: S.symbolMaster,
    shot: LEFT,
    themes: ["light"],
  },
  // Pages
  {
    id: "pages/two-pages",
    covers: ["UI-PAGES-001", "UI-PAGES-003", "UI-PAGES-004", "UI-PAGES-005"],
    setup: async (page) => {
      await S.a4Document(page);
      await page.click("#left-sidebars .page-toolbar button:has(.gravit-icon-addpage)");
      await settle(page, 400);
    },
    shot: LEFT,
  },
  {
    id: "pages/multipage",
    covers: ["UI-PAGES-001", "UI-PAGES-002"],
    setup: async (page) => {
      await S.a4Document(page);
      await page.click("#left-sidebars .page-toolbar button:has(.gravit-icon-addpage)");
      await settle(page, 400);
      await page.click("#left-sidebars .page-toolbar label.g-switch");
      await settle(page, 600);
      // The mouse stays on the switch, whose tooltip shows after its delay;
      // on a slow machine that is before the shot. The recording has none.
      await page.waitForTimeout(700);
      await page.addStyleTag({
        content: ".g-tooltip,.g-rich-tooltip-container{display:none!important}",
      });
    },
    shot: ["body"],
    dom: ["#left-sidebars .page-toolbar"],
  },
  {
    id: "pages/multipage-infinite-alert",
    covers: ["UI-PAGES-002", "UI-DIALOG-003"],
    setup: async (page) => {
      await page.click("#left-sidebars .page-toolbar label.g-switch");
      await settle(page, 500);
    },
    shot: [".g-dialog"],
  },
  {
    id: "pages/rename",
    covers: ["UI-PAGES-008"],
    setup: async (page) => {
      // An infinite canvas has no page rows; a fixed-size document has one.
      await S.a4Document(page);
      await page.dblclick("#left-sidebars .pages .page-row .page-title");
      // The rename box is an input laid over the row (input.g-auto-edit).
      await page.locator("input.g-auto-edit").waitFor();
      await settle(page, 300);
      await page.keyboard.type("Cover");
    },
    shot: LEFT,
    dom: [...LEFT, "input.g-auto-edit"],
  },
  {
    id: "pages/locked-hidden",
    covers: ["UI-PAGES-006", "UI-PAGES-007"],
    setup: async (page) => {
      await page.hover("#left-sidebars .pages .page-row");
      await page.click("#left-sidebars .pages .page-row .page-lock");
      await page.click("#left-sidebars .pages .page-row .page-visibility");
      await page.mouse.move(800, 900);
      await settle(page, 300);
    },
    shot: LEFT,
  },
  {
    id: "pages/delete-master-confirm",
    covers: ["UI-PAGES-003", "UI-DIALOG-004"],
    setup: async (page) => {
      await S.a4Document(page);
      await page.click("#left-sidebars .page-toolbar button:has(.gravit-icon-addpage)");
      await settle(page, 300);
      await page.selectOption('.sidebar-inspector select[data-property="master-page"]', {
        index: 1,
      });
      await settle(page, 300);
      await page.click("#left-sidebars .pages .page-row >> nth=0");
      await page.click("#left-sidebars .page-toolbar button:has(.gravit-icon-trash)");
      await settle(page, 400);
    },
    shot: [".g-dialog"],
    themes: ["light"],
  },
  // Export rows in the left sidebar
  {
    id: "export/rows",
    covers: [
      "UI-INSPECT-025",
      "UI-FIELD-048",
      "UI-FIELD-049",
      "UI-FIELD-050",
      "UI-FIELD-051",
      "UI-FIELD-052",
      "UI-FIELD-053",
    ],
    setup: async (page) => {
      await S.rect(page);
      for (let i = 0; i < 3; i++) {
        await page.click("#left-sidebars .toolbar-export button:has(.gravit-icon-plus)");
        await settle(page, 200);
      }
    },
    shot: ["#left-sidebars .toolbar-export", "#left-sidebars .export-panel"],
    dom: ["#left-sidebars .toolbar-export", "#left-sidebars .export-panel"],
  },
  {
    id: "export/size-presets",
    covers: ["UI-FIELD-050", "UI-FIELD-162"],
    setup: async (page) => {
      await S.rect(page);
      await page.click("#left-sidebars .toolbar-export button:has(.gravit-icon-plus)");
      await settle(page, 200);
      // The arrow next to the size box opens the preset list.
      await page
        .locator(
          "#left-sidebars .export-panel .export-properties-row button:has(.gravit-icon-down)",
        )
        .first()
        .click();
      await page
        .locator(".g-overlay:visible, ul.g-menu:not(.g-menu-root):visible")
        .first()
        .waitFor();
      await settle(page, 400);
    },
    shot: ["#left-sidebars .export-panel", ".g-overlay", "ul.g-menu:not(.g-menu-root)"],
    dom: [".g-overlay", "ul.g-menu:not(.g-menu-root)"],
    themes: ["light"],
  },
  // Symbols and libraries
  {
    id: "symbols/one-symbol",
    covers: ["UI-LIBRARY-010", "UI-LIBRARY-012"],
    setup: async (page) => {
      await S.symbolMaster(page);
      await page.click("#left-sidebars .sidebar-option.sidebar-symbols");
      await settle(page, 600);
    },
    shot: LEFT,
  },
  {
    id: "library/search-typed",
    covers: ["UI-LIBRARY-003"],
    setup: async (page) => {
      await page.click("#left-sidebars .sidebar-option.sidebar-library");
      await settle(page, 300);
      await page.click("#left-sidebars .library-search input");
      await page.keyboard.type("star");
    },
    shot: LEFT,
    themes: ["light"],
  },
  {
    id: "library/category-open",
    covers: ["UI-LIBRARY-004", "UI-LIBRARY-005", "UI-LIBRARY-006", "UI-LIBRARY-007"],
    setup: async (page) => {
      await page.click("#left-sidebars .sidebar-option.sidebar-library");
      await settle(page, 300);
      await page.locator("#left-sidebars .category-row .category").first().click();
      await settle(page, 800);
      await waitForImages(page);
    },
    shot: LEFT,
  },
];

const scenarios: Scenario[] = [
  ...surfaces(list),
  behaviour("layers/new-layer-undo", ["UI-LAYERS-003"], async (page) => {
    await S.rect(page);
    await S.newLayer(page);
    const names = () =>
      page.evaluate(() =>
        [...document.querySelectorAll("#left-sidebars .layers .layer-row .layer-title")].map(
          (t) => t.textContent,
        ),
      );
    const after = await names();
    await action(page, "edit.undo");
    return { after, undone: await names() };
  }),
  behaviour("layers/row-click-selection", ["UI-LAYERS-014", "UI-LAYERS-004"], async (page) => {
    await richTree(page);
    const sel = () =>
      page.evaluate(() =>
        (
          window as unknown as { __parity: { app: { selection(): { getNodeName(): string }[] } } }
        ).__parity.app
          .selection()
          .map((n) => n.getNodeName()),
      );
    const out: unknown[] = [];
    await page.click(row(0));
    out.push(await sel());
    await page.click(row(2), { modifiers: ["Control"] });
    out.push(await sel());
    await page.click(row(1), { modifiers: ["Shift"] });
    out.push(await sel());
    await page.click("#left-sidebars .layers-container", { position: { x: 100, y: 500 } });
    await settle(page);
    out.push(await sel());
    return out;
  }),
  behaviour("layers/drag-reorders", ["UI-LAYERS-016"], async (page) => {
    await insertShapes(page, [
      { type: "GRectangle", x: 400, y: 300, w: 120, h: 80, name: "A" },
      { type: "GRectangle", x: 560, y: 300, w: 120, h: 80, name: "B" },
      { type: "GRectangle", x: 720, y: 300, w: 120, h: 80, name: "C" },
    ]);
    await page.locator(row(2)).waitFor();
    await settle(page, 300);
    const a = await page.locator(row(0)).boundingBox();
    const c = await page.locator(row(2)).boundingBox();
    if (!a || !c) throw new Error("no rows");
    await page.mouse.move(a.x + 60, a.y + a.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await drag(page, [a.x + 60, a.y + a.height / 2], [c.x + 60, c.y + c.height - 2], { steps: 10 });
    return page.evaluate(() =>
      [...document.querySelectorAll("#left-sidebars .layers .layer-row .layer-title")].map(
        (t) => t.textContent,
      ),
    );
  }),
  behaviour("pages/insert-and-click", ["UI-PAGES-003", "UI-PAGES-010"], async (page) => {
    await S.a4Document(page);
    await page.click("#left-sidebars .page-toolbar button:has(.gravit-icon-addpage)");
    await settle(page, 300);
    await page.click("#left-sidebars .pages .page-row >> nth=0");
    await settle(page, 300);
    return page.evaluate(() =>
      [...document.querySelectorAll("#left-sidebars .pages .page-row")].map(
        (r) =>
          `${r.classList.contains("g-active") ? "*" : ""}${r.querySelector(".page-title")?.textContent ?? ""}`,
      ),
    );
  }),
  behaviour("export/size-preset-picked", ["UI-FIELD-050", "UI-FIELD-162"], async (page) => {
    await S.rect(page);
    await page.click("#left-sidebars .toolbar-export button:has(.gravit-icon-plus)");
    await settle(page, 200);
    const out: unknown[] = [];
    for (const preset of ["0.5x", "512w"]) {
      await page
        .locator(
          "#left-sidebars .export-panel .export-properties-row button:has(.gravit-icon-down)",
        )
        .first()
        .click();
      const menu = page.locator("ul.g-menu:not(.g-menu-root):visible");
      const presets = await menu.locator("li > .g-menu-item-caption").allTextContents();
      await menu
        .locator("li.g-menu-item", {
          has: page.locator(`:scope > .g-menu-item-caption:text-is("${preset}")`),
        })
        .click();
      await settle(page);
      out.push({
        presets,
        box: await page
          .locator("#left-sidebars .export-panel input[type=text]")
          .first()
          .inputValue(),
        stored: await page.evaluate(
          () =>
            (
              window as unknown as {
                __parity: {
                  app: { selection(): { getProperty(k: string, custom: boolean): unknown }[] };
                };
              }
            ).__parity.app
              .selection()[0]
              ?.getProperty("__export", true) ?? null,
        ),
      });
    }
    return out;
  }),
  behaviour("export/rows-stored", ["UI-FIELD-049", "UI-STORAGE-015"], async (page) => {
    await S.rect(page);
    for (let i = 0; i < 5; i++) {
      await page.click("#left-sidebars .toolbar-export button:has(.gravit-icon-plus)");
      await settle(page, 200);
    }
    const rows = await page.locator("#left-sidebars .export-panel .export-properties-row").count();
    if (rows !== 5) throw new Error(`expected 5 export rows, found ${rows}`);
    return page.evaluate(() => {
      const { app } = (
        window as unknown as {
          __parity: {
            app: { selection(): { getProperty(k: string, custom: boolean): unknown }[] };
          };
        }
      ).__parity;
      // The panel writes the rows as a custom property of the element.
      return app.selection()[0]?.getProperty("__export", true) ?? null;
    });
  }),
];

paritySuite("ui panels", scenarios, { newApp: false });
