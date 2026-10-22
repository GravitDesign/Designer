import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import type { Scenario } from "../../support/scenario.ts";
import {
  action,
  behaviour,
  hoverMenuItem,
  insertShapes,
  rightClick,
  settle,
  surfaces,
  type SurfaceSpec,
} from "./lib.ts";
import * as S from "./states.ts";

const MENUS = ["ul.g-menu:not(.g-menu-root)", ".g-overlay"];
const VIEW = { width: 1600, height: 1300 };

/** Rectangle selected, right-click on it. */
async function onRect(page: Page): Promise<void> {
  await S.rect(page);
  await rightClick(page, 600, 400);
}

const CANVAS = ["ACT-CTX-001", "ACT-CTX-002", "UI-LAYERS-019", "RUN-SHELL-050"];

const list: SurfaceSpec[] = [
  {
    id: "context/canvas-empty",
    covers: CANVAS,
    viewport: VIEW,
    setup: (page) => rightClick(page, 600, 300),
    shot: MENUS,
  },
  {
    id: "context/canvas-rect",
    covers: CANVAS,
    viewport: VIEW,
    setup: onRect,
    shot: MENUS,
  },
  {
    id: "context/canvas-two-shapes",
    covers: [...CANVAS, "ACT-CTX-003"],
    viewport: VIEW,
    setup: async (page) => {
      await S.rectAndEllipse(page);
      await rightClick(page, 660, 440);
    },
    shot: MENUS,
    themes: ["light"],
  },
  {
    id: "context/canvas-text",
    covers: CANVAS,
    viewport: VIEW,
    setup: async (page) => {
      await S.text(page);
      await rightClick(page, 520, 312);
    },
    shot: MENUS,
    themes: ["light"],
  },
];

for (const sub of ["Paste", "Arrange", "Align", "Transform", "Select Same", "Select"]) {
  list.push({
    id: `context/canvas-rect-${sub.toLowerCase().replace(/ /g, "-")}`,
    covers: [...CANVAS, ...(sub === "Select" ? ["ACT-CTX-003", "UI-LAYERS-020"] : [])],
    viewport: VIEW,
    setup: async (page) => {
      await onRect(page);
      await hoverMenuItem(page, sub, 0);
      await settle(page, 900);
    },
    shot: MENUS,
    themes: sub === "Arrange" ? ["light", "dark"] : ["light"],
  });
}
list.push({
  id: "context/select-hit-list-hover",
  covers: ["ACT-CTX-003", "UI-LAYERS-020"],
  viewport: VIEW,
  setup: async (page) => {
    await S.rectAndEllipse(page);
    await rightClick(page, 660, 440);
    await hoverMenuItem(page, "Select", 0);
    await settle(page, 600);
    const menus = page.locator("ul.g-menu:not(.g-menu-root):visible");
    await menus
      .nth((await menus.count()) - 1)
      .locator(":scope > li.g-menu-item")
      .first()
      .hover();
    await settle(page, 600);
  },
  shot: ["body"],
  dom: MENUS,
  themes: ["light"],
});
list.push(
  {
    id: "context/layer-row",
    covers: ["ACT-CTX-009", "UI-LAYERS-019", ...CANVAS],
    viewport: VIEW,
    setup: async (page) => {
      await S.rectAndEllipse(page);
      await page.click("#left-sidebars .layers .layer-row >> nth=0", { button: "right" });
      await settle(page, 400);
    },
    shot: MENUS,
  },
  {
    id: "context/page-row",
    covers: ["ACT-CTX-005", "UI-PAGES-011"],
    viewport: VIEW,
    setup: async (page) => {
      await page.click("#left-sidebars .pages .page-row >> nth=0", { button: "right" });
      await settle(page, 400);
    },
    shot: MENUS,
  },
  {
    id: "context/fill-row",
    covers: ["ACT-CTX-006"],
    viewport: VIEW,
    setup: async (page) => {
      await S.rect(page);
      await page.click(".sidebar-inspector .fill-block .drag-indicator", { button: "right" });
      await settle(page, 400);
    },
    shot: MENUS,
  },
  {
    id: "context/border-row",
    covers: ["ACT-CTX-007"],
    viewport: VIEW,
    setup: async (page) => {
      await S.rect(page);
      await S.addBorder(page);
      await page.click(".sidebar-inspector .border-block .drag-indicator", { button: "right" });
      await settle(page, 400);
    },
    shot: MENUS,
  },
  {
    id: "context/effect-row",
    covers: ["ACT-CTX-008"],
    viewport: VIEW,
    setup: async (page) => {
      await S.rect(page);
      await S.addEffect(page, "Shadow", "Drop Shadow");
      await page.mouse.move(800, 900);
      await page.click(".sidebar-inspector .effect-header", { button: "right" });
      await settle(page, 400);
    },
    shot: MENUS,
  },

  {
    id: "context/crop",
    covers: ["ACT-CTX-004", "RUN-MENU-084", "RUN-MENU-085"],
    viewport: VIEW,
    setup: async (page) => {
      await S.image(page);
      await action(page, "modify.crop");
      await rightClick(page, 60, 140);
    },
    shot: MENUS,
  },
);

const scenarios: Scenario[] = [
  ...surfaces(list),
  behaviour("context/native-menu-suppressed", ["ACT-CTX-013", "UI-SHELL-029"], async (page) => {
    await insertShapes(page, [{ type: "GRectangle", x: 500, y: 340, w: 200, h: 120 }]);
    await page.evaluate(() => {
      const w = window as unknown as { __ctx: string[] };
      w.__ctx = [];
      window.addEventListener("contextmenu", (e) => {
        const t = e.target as HTMLElement;
        w.__ctx.push(`${t.tagName.toLowerCase()}:${e.defaultPrevented}`);
      });
    });
    await page.mouse.click(600, 400, { button: "right" });
    await page.keyboard.press("Escape");
    await page.click("#header .section.menu", { button: "right" });
    await page.keyboard.press("Escape");
    await page.click(
      '.sidebar-inspector [data-dimension="x"] input, .sidebar-inspector input[data-dimension="x"]',
      {
        button: "right",
      },
    );
    await page.keyboard.press("Escape");
    return page.evaluate(() => (window as unknown as { __ctx: string[] }).__ctx);
  }),
  behaviour("context/layer-row-selects", ["ACT-CTX-009", "UI-LAYERS-019"], async (page) => {
    await S.rectAndEllipse(page);
    await page.click("#left-sidebars .layers .layer-row >> nth=1", { button: "right" });
    await settle(page, 300);
    return page.evaluate(() =>
      (
        window as unknown as { __parity: { app: { selection(): { getNodeName(): string }[] } } }
      ).__parity.app
        .selection()
        .map((n) => n.getNodeName()),
    );
  }),
  behaviour("context/arrange-from-menu", ["ACT-CTX-002"], async (page) => {
    await S.rectAndEllipse(page);
    await page.evaluate(() => {
      const { app } = (
        window as unknown as {
          __parity: {
            app: {
              scene(): { querySingle(q: string): unknown };
              editor(): { updateSelection(t: boolean, n: unknown[]): void };
            };
          };
        }
      ).__parity;
      app.editor().updateSelection(false, [app.scene().querySingle("rectangle")]);
    });
    await rightClick(page, 520, 360);
    await hoverMenuItem(page, "Arrange", 0);
    await settle(page, 400);
    await page
      .locator("ul.g-menu:not(.g-menu-root):visible li.g-menu-item", {
        has: page.locator(':scope > .g-menu-item-caption:text-is("Bring to Front")'),
      })
      .click();
    await settle(page);
    return page.evaluate(() =>
      [...document.querySelectorAll("#left-sidebars .layers .layer-row .layer-title")].map(
        (t) => t.textContent,
      ),
    );
  }),
];

paritySuite("ui context menus", scenarios, { newApp: false });
