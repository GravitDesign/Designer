import zlib from "node:zlib";
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import type { Scenario } from "../../support/scenario.ts";
import {
  action,
  behaviour,
  clickMenu,
  drag,
  openMenu,
  settle,
  surfaces,
  tool,
  type SurfaceSpec,
} from "./lib.ts";
import * as S from "./states.ts";

interface AppWindow {
  __parity: {
    app: {
      activeTool(): string;
      selection(): { getNodeName(): string }[];
      serialize(o?: unknown): string;
    };
  };
}

const selection = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as AppWindow).__parity.app.selection().map((n) => n.getNodeName()),
  );

async function openStyleCreator(page: Page): Promise<void> {
  await page.click(".sidebar-inspector .g-styles-field");
  await settle(page, 300);
  await page.locator(".g-style-editor .style-toolbar button", { hasText: "Create" }).click();
  await page.locator(".g-overlay button:text-is('Create')").waitFor();
  await settle(page, 400);
}

async function createStyle(page: Page): Promise<void> {
  await openStyleCreator(page);
  await page.locator(".g-overlay button:text-is('Create')").click();
  await settle(page, 400);
}

const list: SurfaceSpec[] = [
  {
    id: "inspector/path-point",
    covers: ["UI-INSPECT-035", "UI-FIELD-153", "UI-FIELD-154", "UI-FIELD-155"],
    viewport: S.TALL,
    setup: async (page) => {
      await S.penPath(page);
      await tool(page, "GSubSelectTool");
      await page.mouse.move(600, 550, { steps: 4 });
      await settle(page, 300);
      await page.mouse.down();
      await page.mouse.up();
      await settle(page, 300);
    },
    shot: S.INSPECTOR,
    dom: S.INSPECTOR_DOM,
  },
  {
    id: "editor/image-colors",
    covers: ["UI-FIELD-157", "UI-INSPECT-036"],
    viewport: S.TALL,
    setup: async (page) => {
      await S.image(page);
      await page.click(
        ".sidebar-inspector .image-button-row button:has(.gravit-icon-extract-colors)",
      );
      await settle(page, 600);
    },
    shot: [...S.INSPECTOR, ".g-overlay"],
    dom: [".sidebar-inspector .image-button-row", ".g-overlay"],
    themes: ["light"],
  },
  {
    id: "editor/dpi-select",
    covers: ["UI-FIELD-160", "UI-FIELD-035"],
    viewport: S.TALL,
    setup: async (page) => {
      await page
        .locator(
          ".sidebar-inspector .dpi-row .g-input-select button, .sidebar-inspector .dpi-row .g-input-select .gravit-icon-down",
        )
        .first()
        .click();
      await settle(page, 300);
    },
    shot: [".sidebar-inspector .dpi-row", "ul.g-menu:not(.g-menu-root)", ".g-overlay"],
    dom: ["ul.g-menu:not(.g-menu-root)", ".g-overlay"],
    themes: ["light"],
  },
  {
    id: "shell/marquee",
    covers: ["RUN-SHELL-036", "RUN-SHELL-014"],
    setup: async (page) => {
      await S.rectAndEllipse(page);
      await page.mouse.click(400, 250);
      await drag(page, [400, 250], [650, 420], { release: false });
    },
    shot: ["#windows"],
    dom: false,
    themes: ["light"],
  },
  {
    id: "touch/fill-chooser",
    covers: ["UI-COLOR-027", "UI-COLOR-001"],
    open: { settings: { touch: true } },
    setup: async (page) => {
      await S.rect(page);
      await page.click('#right-sidebars .g-touch-toolbar-button[g-touch-tool="fill"]');
      await settle(page, 400);
      await S.openChooser(page, ".sidebar-inspector .fill-block .g-pattern-chooser .preview", 22);
    },
    shot: [".g-overlay"],
    themes: ["light"],
  },
  {
    id: "touch/long-press-menu",
    covers: ["ACT-CTX-012", "UI-TOUCH-018", "UI-TOUCH-016"],
    open: { settings: { touch: true } },
    setup: async (page) => {
      await S.rect(page);
      // A real touch press held past the 500 ms long-press delay.
      const cdp = await page.context().newCDPSession(page);
      const point = [{ x: 600, y: 400 }];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point });
      await page.waitForTimeout(900);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await settle(page, 400);
    },
    shot: [".g-overlay", "ul.g-menu:not(.g-menu-root)"],
    themes: ["light"],
  },
  {
    id: "style/creator-dialog",
    covers: ["UI-STYLE-003", "UI-STYLE-005", "UI-DIALOG-002"],
    setup: async (page) => {
      await S.rect(page);
      await openStyleCreator(page);
    },
    shot: [".g-overlay"],
  },
  {
    id: "style/picker-with-style",
    covers: ["UI-STYLE-003", "UI-STYLE-004", "UI-STYLE-007"],
    setup: async (page) => {
      await S.rect(page);
      await createStyle(page);
      await page.click(".sidebar-inspector .g-styles-field");
      await settle(page, 400);
    },
    shot: [".g-overlay", ".sidebar-inspector .appearance-style-property"],
    dom: [".g-overlay", ".sidebar-inspector .appearance-style-property"],
  },
  {
    id: "style/organizer",
    covers: ["UI-STYLE-006"],
    setup: async (page) => {
      await S.rect(page);
      await createStyle(page);
      await page.click(".sidebar-inspector .g-styles-field");
      await settle(page, 300);
      await page.locator(".g-style-editor .style-toolbar button", { hasText: "Organize" }).click();
      await settle(page, 400);
    },
    shot: [".g-overlay", ".g-dialog-container.visible .g-dialog"],
    themes: ["light"],
  },
  {
    id: "font/system-fonts-warning",
    covers: ["UI-FONT-003", "UI-FONT-002", "UI-FONT-010"],
    viewport: S.TALL,
    setup: async (page) => {
      await S.text(page);
      await page.locator(".sidebar-inspector .text-properties-panel input").first().click();
      await settle(page, 400);
      await page.locator(".g-font-list-overlay a.tablinks", { hasText: "System Fonts" }).click();
      await settle(page, 500);
    },
    shot: [".g-dialog-container.visible .g-dialog", ".g-overlay"],
    themes: ["light"],
  },
  {
    id: "dialog/symbol-name-prompt",
    covers: ["UI-DIALOG-005", "RUN-MENU-108"],
    setup: async (page) => {
      await S.rect(page);
      await action(page, "modify.createsymbol");
    },
    shot: [".g-dialog-container.visible .g-dialog"],
  },
];

const scenarios: Scenario[] = [
  ...surfaces(list),
  behaviour("pages/drag-reorders", ["UI-PAGES-009"], async (page) => {
    await S.a4Document(page);
    await page.click("#left-sidebars .page-toolbar button:has(.gravit-icon-addpage)");
    await settle(page, 300);
    const rows = page.locator("#left-sidebars .pages .page-row");
    const a = await rows.nth(0).boundingBox();
    const b = await rows.nth(1).boundingBox();
    if (!a || !b) throw new Error("no rows");
    await page.mouse.move(a.x + 60, a.y + a.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await drag(page, [a.x + 60, a.y + a.height / 2], [b.x + 60, b.y + b.height - 3], { steps: 10 });
    return page.evaluate(() =>
      [...document.querySelectorAll("#left-sidebars .pages .page-row .page-title")].map(
        (t) => t.textContent,
      ),
    );
  }),
  behaviour("symbols/click-and-dblclick", ["UI-LIBRARY-011"], async (page) => {
    await S.symbolMaster(page);
    await page.click("#left-sidebars .sidebar-option.sidebar-symbols");
    await settle(page, 400);
    await page.mouse.click(900, 800);
    await settle(page);
    const before = await selection(page);
    await page.locator("#left-sidebars .symbols .symbol-title-group").first().click();
    await settle(page, 300);
    const clicked = await selection(page);
    await page.locator("#left-sidebars .symbols .symbol-title-group").first().dblclick();
    await settle(page, 300);
    return { before, clicked, dblclicked: await selection(page) };
  }),
  behaviour("fields/typing-keeps-tool", ["UI-FIELD-174", "UI-SHELL-029"], async (page) => {
    await S.rect(page);
    await page
      .locator(
        '.sidebar-inspector [data-dimension="w"] input, .sidebar-inspector input[data-dimension="w"]',
      )
      .first()
      .click();
    await page.keyboard.type("tep");
    await settle(page);
    return page.evaluate(() => (window as unknown as AppWindow).__parity.app.activeTool());
  }),
  behaviour("shell/bring-to-front", ["UI-TOUCH-019"], async (page) => {
    const cls = () =>
      page.evaluate(() =>
        ["left-sidebars", "right-sidebars"].map((id) =>
          document.getElementById(id)?.classList.contains("bring-to-front"),
        ),
      );
    const before = await cls();
    await page.mouse.move(120, 600);
    await page.mouse.down();
    await page.mouse.up();
    await settle(page);
    const left = await cls();
    await page.mouse.move(1450, 900);
    await page.mouse.down();
    await page.mouse.up();
    await settle(page);
    return { before, left, right: await cls() };
  }),
  behaviour(
    "storage/ui-flags",
    ["UI-STORAGE-006", "UI-FIELD-003", "UI-TOOLTIP-003"],
    async (page) => {
      await S.rect(page);
      await page.click(
        ".sidebar-inspector [data-ratio], .sidebar-inspector .gravit-icon-unlinked, .sidebar-inspector .gravit-icon-linked",
      );
      await settle(page);
      await clickMenu(page, ["Help", "Learn", "Display Enhanced Tooltips"]);
      return page.evaluate(() => ({
        ratio: localStorage.getItem("designer.settings.dimension.preserveratio"),
        tooltips: localStorage.getItem("designer.settings.enhanced-tooltips.enabled"),
      }));
    },
  ),
  behaviour(
    "storage/global-swatch",
    ["UI-STORAGE-003", "UI-SWATCH-001", "UI-SWATCH-002"],
    async (page) => {
      await S.rect(page);
      await S.openChooser(page, ".sidebar-inspector .fill-block .g-pattern-chooser .preview", 10);
      await page.click('.g-overlay button[data-palette="swatches"]');
      await settle(page, 300);
      await page.locator(".g-overlay .swatches-palette.global .swatch-button").first().click();
      await settle(page, 400);
      // Swatch ids are random; keep everything else.
      return page.evaluate(() =>
        (JSON.parse(localStorage.getItem("swatches") ?? "[]") as string[]).map((item) => {
          const swatch = JSON.parse(item) as Record<string, unknown>;
          if (typeof swatch["@id"] === "string") swatch["@id"] = "<id>";
          return swatch;
        }),
      );
    },
  ),
  behaviour(
    "dialog/print-downloads-pdf",
    ["RUN-DIALOG-017", "UI-DIALOG-039", "RUN-MENU-024"],
    async (page) => {
      await S.rect(page);
      const dl = page.waitForEvent("download", { timeout: 30_000 });
      await clickMenu(page, ["File", "Print..."]);
      const no = page.locator('.g-dialog-container.visible button:text-is("No")');
      if (await no.count()) await no.first().click();
      const name = (await dl).suggestedFilename();
      return { uuidPdf: /^[0-9a-f-]{36}\.pdf$/.test(name) };
    },
  ),
  behaviour(
    "storage/recent-after-open",
    ["RUN-STORAGE-012", "ACT-MENU-007", "RUN-MENU-006"],
    async (page) => {
      await S.rect(page);
      const json = await page.evaluate(() =>
        (window as unknown as AppWindow).__parity.app.serialize({ save: true }),
      );
      const chooser = page.waitForEvent("filechooser");
      await clickMenu(page, ["File", "Open Local File..."]);
      await (
        await chooser
      ).setFiles({
        name: "recent-test.gvdesign",
        mimeType: "application/octet-stream",
        buffer: zlib.gzipSync(Buffer.from(json)),
      });
      await settle(page, 1500);
      await openMenu(page, ["File", "Open Recent"]);
      const items = await page.evaluate(() => {
        const menus = [...document.querySelectorAll("ul.g-menu:not(.g-menu-root)")].filter(
          (m) => (m as HTMLElement).offsetParent !== null,
        );
        const last = menus[menus.length - 1];
        return last
          ? [...last.querySelectorAll(":scope > li")].map(
              (li) =>
                `${li.classList.contains("g-disabled") ? "-" : "+"}${li.textContent?.trim() ?? ""}`,
            )
          : null;
      });
      const tabs = await page.evaluate(() =>
        [...document.querySelectorAll("#header .tabs .tab .cover")].map((t) => t.textContent),
      );
      const storage = await page.evaluate(() =>
        Object.keys(localStorage).filter((k) => k.includes("recent")),
      );
      return { items, tabs, storage };
    },
  ),
  behaviour("shell/boot-classes", ["UI-SHELL-026", "UI-SHELL-027"], async (page) =>
    page.evaluate(() => ({
      loading: document.body.classList.contains("loading"),
      gLoading: document.body.classList.contains("g-loading"),
      dragImage: document.querySelectorAll("body > div.g-drag-image").length,
    })),
  ),
  behaviour("symbols/delete-from-panel", ["UI-LIBRARY-011", "UI-LIBRARY-010"], async (page) => {
    await S.symbolMaster(page);
    await page.click("#left-sidebars .sidebar-option.sidebar-symbols");
    await settle(page, 300);
    await page.locator("#left-sidebars .symbols .symbol-title-group").first().click();
    await page.click("#left-sidebars .symbols-toolbar button:has(.gravit-icon-trash)");
    await settle(page, 400);
    const after = await page.locator("#left-sidebars .symbols .symbol-title-group").count();
    await action(page, "edit.undo");
    return {
      after,
      undone: await page.locator("#left-sidebars .symbols .symbol-title-group").count(),
    };
  }),
];

paritySuite("ui extras", scenarios, { newApp: false });
