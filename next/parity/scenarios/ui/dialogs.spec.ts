import { createHash } from "node:crypto";
import type { Page } from "@playwright/test";
import * as ids from "./ids.ts";
import { paritySuite } from "../../support/suite.ts";
import type { Scenario } from "../../support/scenario.ts";
import { openApp } from "../../support/apps.ts";
import {
  behaviour,
  BROWSER_LOCALES,
  start,
  clickMenu,
  drag,
  NEUTRAL,
  settle,
  shoot,
  surfaces,
  waitForTheme,
  type SurfaceSpec,
} from "./lib.ts";
import * as S from "./states.ts";

const DIALOG = [".g-dialog-container.visible .g-dialog"];
const TALL = { width: 1600, height: 2000 };

const SETTINGS = [
  "UI-SETTING-001",
  "UI-SETTING-002",
  "UI-SETTING-003",
  "UI-SETTING-004",
  "UI-SETTING-005",
  "UI-SETTING-006",
  "UI-SETTING-007",
  "UI-SETTING-008",
  "UI-SETTING-009",
  "UI-SETTING-010",
  "UI-SETTING-011",
  "UI-SETTING-012",
  "UI-SETTING-013",
  "UI-SETTING-014",
  "UI-SETTING-015",
  "UI-SETTING-019",
  "UI-DIALOG-001",
  ...ids.RUN_DIALOG_1_13,
  "RUN-MENU-052",
];

const openSettings = (page: Page) => clickMenu(page, ["Edit", "Settings..."]);

/**
 * The SVG exporter names clip paths and similar defs with a random
 * 32-character suffix (_clipPath_<random>); number them in order of
 * appearance so the rest of the markup is compared exactly.
 */
function svgWithStableIds(svg: string): string {
  const names = new Map<string, string>();
  return svg.replace(/_([A-Za-z]+)_([A-Za-z0-9]{32})\b/g, (_m, kind: string, id: string) => {
    if (!names.has(id)) names.set(id, `<id${names.size + 1}>`);
    return `_${kind}_${names.get(id) ?? ""}`;
  });
}

/** Answers "No" when the app asks to save before exporting. */
async function skipSavePrompt(page: Page): Promise<void> {
  const no = page.locator('.g-dialog-container.visible button:text-is("No")');
  if (await no.count()) {
    await no.first().click();
    await settle(page, 400);
  }
}

const list: SurfaceSpec[] = [
  {
    id: "dialog/settings",
    covers: SETTINGS,
    viewport: TALL,
    setup: openSettings,
    shot: DIALOG,
    locales: BROWSER_LOCALES,
  },
  {
    id: "dialog/settings-theme-selector",
    covers: ["UI-SETTING-007", "RUN-DIALOG-006"],
    viewport: TALL,
    setup: async (page) => {
      await openSettings(page);
      await page.click(".g-settings-dialog .g-theme-selector");
      await settle(page, 300);
      await page.hover(".g-overlay .g-theme-row >> nth=1");
    },
    shot: [...DIALOG, ".g-overlay"],
    dom: [".g-overlay"],
  },
  {
    id: "dialog/settings-toggled",
    covers: ["UI-SETTING-004", "UI-SETTING-010"],
    viewport: TALL,
    setup: async (page) => {
      await openSettings(page);
      await page.click(
        '.g-settings-dialog label.g-switch:has(> [data-setting="decimals-num-onoff"])',
      );
      await page.click('.g-settings-dialog label.g-switch:has(> [data-setting="auto_save"])');
      await settle(page, 300);
    },
    shot: DIALOG,
    themes: ["light"],
  },
  {
    id: "dialog/shortcuts",
    covers: ["UI-DIALOG-013", "RUN-DIALOG-021", "RUN-MENU-169"],
    viewport: TALL,
    setup: (page) => clickMenu(page, ["Help", "Learn", "Show Keyboard Shortcuts"]),
    shot: DIALOG,
  },
  {
    id: "dialog/expand-shrink",
    covers: ["UI-DIALOG-005", "RUN-DIALOG-020", "RUN-MENU-098"],
    setup: async (page) => {
      await S.rect(page);
      await clickMenu(page, ["Modify", "Path", "Expand/Shrink"]);
    },
    shot: DIALOG,
  },
  {
    id: "dialog/export-canvas",
    covers: ["UI-DIALOG-038", "RUN-DIALOG-014", "RUN-MENU-014"],

    setup: async (page) => {
      await S.rect(page);
      await clickMenu(page, ["File", "Export", "Advanced Export..."]);
      await skipSavePrompt(page);
    },
    shot: DIALOG,
  },
  {
    // Old bug: in a window taller than wide the settings column is pushed
    // off the left edge (the preview grows with the page's aspect ratio).
    id: "dialog/export-canvas-tall-window",
    covers: ["UI-DIALOG-038"],
    viewport: TALL,
    clipToWindow: true,
    setup: async (page) => {
      await S.rect(page);
      await clickMenu(page, ["File", "Export", "Advanced Export..."]);
      await skipSavePrompt(page);
    },
    shot: DIALOG,
    themes: ["light"],
  },
  {
    id: "dialog/export-save-prompt",
    covers: ["UI-DIALOG-004", "RUN-DIALOG-014"],
    setup: async (page) => {
      await S.rect(page);
      await clickMenu(page, ["File", "Export", "Advanced Export..."]);
    },
    shot: DIALOG,
  },
  ...["Selection", "Assets"].map((mode): SurfaceSpec => ({
    id: `dialog/export-${mode.toLowerCase()}`,
    covers: ["UI-DIALOG-038", "RUN-DIALOG-014"],

    setup: async (page) => {
      await S.rect(page);
      await clickMenu(page, ["File", "Export", "Advanced Export..."]);
      await skipSavePrompt(page);
      await page
        .locator(".g-export-dialog .mode-container label", { hasText: mode })
        .first()
        .click();
      await settle(page, 400);
    },
    shot: DIALOG,
    themes: ["light"],
  })),
  {
    id: "dialog/export-pdf-advanced",
    covers: ["UI-DIALOG-038", "RUN-DIALOG-015", "RUN-MENU-023"],

    setup: async (page) => {
      await S.rect(page);
      await clickMenu(page, ["File", "Export", "PDF Document (.pdf)", "Advanced Options..."]);
      await skipSavePrompt(page);
    },
    shot: DIALOG,
  },
  {
    id: "dialog/export-jpeg-format",
    covers: ["UI-DIALOG-038"],

    setup: async (page) => {
      await S.rect(page);
      await clickMenu(page, ["File", "Export", "Advanced Export..."]);
      await skipSavePrompt(page);
      await page.selectOption(
        '.g-export-dialog [data-setting="format"] select, .g-export-dialog select >> nth=0',
        {
          label: "JPEG",
        },
      );
      await settle(page, 300);
    },
    shot: DIALOG,
    themes: ["light"],
  },
  {
    id: "dialog/save-chooser",
    covers: ["UI-DIALOG-033", "RUN-DIALOG-023", "RUN-SAVE-001"],
    open: { fileSystemAccess: true },
    setup: async (page) => {
      await S.rect(page);
      await clickMenu(page, ["File", "Save"]);
    },
    shot: DIALOG,
  },
  {
    id: "dialog/close-modified-confirm",
    covers: ["UI-DIALOG-004", "UI-SHELL-022"],
    setup: async (page) => {
      await S.rect(page);
      await page.click("#header .tabs .tab .close");
      await settle(page, 400);
    },
    shot: DIALOG,
  },
  {
    id: "dialog/close-all-confirm",
    covers: ["UI-TABS-004", "UI-DIALOG-004"],
    setup: async (page) => {
      await S.rect(page);
      await page.click("#header .tabs .tab", { button: "right" });
      await settle(page, 300);
      await page
        .locator("ul.g-menu:not(.g-menu-root):visible li.g-menu-item", {
          has: page.locator(':scope > .g-menu-item-caption:text-is("Close All")'),
        })
        .click();
      await settle(page, 400);
    },
    shot: DIALOG,
    themes: ["light"],
  },
  {
    id: "dialog/svg-unsupported-features",
    covers: ["UI-DIALOG-046", "UI-SETTING-011"],
    setup: async (page) => {
      await S.rect(page);
      await S.openChooser(page, ".sidebar-inspector .fill-block .g-pattern-chooser .preview", 10);
      await page.selectOption(".g-overlay .pattern-type-select", "Noise");
      await page.keyboard.press("Escape");
      await settle(page, 300);
      await clickMenu(page, ["File", "Export", "Scalable Vector Graphics (.svg)"]);
      await skipSavePrompt(page);
      await settle(page, 800);
    },
    shot: DIALOG,
  },
  {
    id: "dialog/equal-swatch-alert",
    covers: ["UI-SWATCH-003", "UI-DIALOG-003"],
    setup: async (page) => {
      await S.rect(page);
      await S.openChooser(page, ".sidebar-inspector .fill-block .g-pattern-chooser .preview", 10);
      await page.click('.g-overlay button[data-palette="swatches"]');
      await settle(page, 300);
      const add = page.locator(".g-overlay .swatches-palette.document .swatch-button").first();
      await add.click();
      await settle(page, 300);
      await add.click();
      await settle(page, 400);
    },
    shot: DIALOG,
  },
  {
    id: "dialog/missing-fonts",
    covers: ["UI-FONT-011", "UI-DIALOG-001"],
    setup: async (page) => {
      await S.text(page);
      await page.evaluate(() => {
        const { app } = (
          window as unknown as {
            __parity: {
              app: {
                scene(): { querySingle(q: string): { setProperty(k: string, v: unknown): void } };
              };
            };
          }
        ).__parity;
        app.scene().querySingle("text").setProperty("_tff", "No Such Font");
      });
      await page.locator(".g-missingfonts-dialog").waitFor({ timeout: 15_000 });
      await settle(page, 500);
    },
    shot: DIALOG,
  },
  {
    id: "notify/message",
    covers: ["UI-NOTIFY-001", "UI-SHELL-021"],
    setup: async (page) => {
      await page.evaluate(() =>
        (
          window as unknown as { __parity: { app: { ui: { notify(m: string): void } } } }
        ).__parity.app.ui.notify("Something happened in the parity test"),
      );
      await page
        .locator("#footer .g-notification-panel:visible", {
          hasText: "Something happened in the parity test",
        })
        .waitFor();
      await settle(page, 300);
    },
    shot: ["#footer"],
  },
];

const scenarios: Scenario[] = [
  ...surfaces(list),
  behaviour("dialog/settings-escape-stays", ["UI-SETTING-001"], async (page) => {
    await openSettings(page);
    await page.keyboard.press("Escape");
    await settle(page, 300);
    return page.locator(".g-settings-dialog:visible").count();
  }),
  behaviour(
    "dialog/settings-save-writes",
    ["UI-SETTING-016", "UI-SETTING-017", "UI-STORAGE-002"],
    async (page) => {
      await openSettings(page);
      await page.click(
        '.g-settings-dialog label.g-switch:has(> [data-setting="highlight_on_hover"])',
      );
      await page.click(
        '.g-settings-dialog label.g-switch:has(> [data-setting="decimals-num-onoff"])',
      );
      await page.click('.g-dialog-container.visible button:text-is("Save Changes")');
      await settle(page, 400);
      return page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as Record<
          string,
          unknown
        >;
        const keys = Object.keys(s).sort();
        return Object.fromEntries(keys.map((k) => [k, s[k] === undefined ? "<undefined>" : s[k]]));
      });
    },
  ),
  behaviour("dialog/settings-cancel-keeps", ["UI-SETTING-001"], async (page) => {
    await openSettings(page);
    await page.click(
      '.g-settings-dialog label.g-switch:has(> [data-setting="highlight_on_hover"])',
    );
    await page.click('.g-dialog-container.visible button:text-is("Cancel")');
    await settle(page, 400);
    return page.evaluate(
      () =>
        (JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as Record<string, unknown>)
          .highlight_on_hover,
    );
  }),
  {
    // Theme switch through the settings dialog, then a reload keeps it.
    id: "ui/theme/switch-to-dark",
    covers: [
      "UI-THEME-001",
      "UI-THEME-002",
      "RUN-THEME-001",
      "RUN-THEME-002",
      "RUN-THEME-003",
      "UI-SETTING-007",
      "UI-THEME-004",
    ],
    kind: "png",
    open: { newDocument: true, theme: "light" },
    driver: async (ctx) => {
      const { page } = ctx;
      await start(ctx, { newDocument: true, theme: "light" });
      // Page label, rulers, a guide and a selection, so the shot shows
      // their dark colours too.
      await S.a4Document(page);
      await S.rect(page);
      await clickMenu(page, ["View", "Canvas", "Show Rulers"]);
      await drag(page, [700, 83], [700, 300], { steps: 10 });
      await drag(page, [260, 500], [450, 500], { steps: 10 });
      await openSettings(page);
      await page.click(".g-settings-dialog .g-theme-selector");
      await settle(page, 300);
      await page.click(".g-overlay .g-theme-row >> nth=1");
      await page.click('.g-dialog-container.visible button:text-is("Save Changes")');
      await waitForTheme(page, "dark");
      await page.mouse.move(NEUTRAL.x, NEUTRAL.y);
      return shoot(page, ["body"]);
    },
  },
  behaviour(
    "theme/switch-state",
    ["RUN-THEME-002", "RUN-THEME-003", "UI-THEME-001"],
    async (page, ctx) => {
      await openSettings(page);
      await page.click(".g-settings-dialog .g-theme-selector");
      await settle(page, 300);
      await page.click(".g-overlay .g-theme-row >> nth=1");
      await page.click('.g-dialog-container.visible button:text-is("Save Changes")');
      await waitForTheme(page, "dark");
      await settle(page, 400);
      const state = () =>
        page.evaluate(() => ({
          css: [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
            .map((l) => l.href.replace(/^.*\//, ""))
            .filter((h) => h.startsWith("designer")),
          body: [...document.body.classList],
          stored: (
            JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as Record<string, unknown>
          ).theme,
          windowsBg: getComputedStyle(document.getElementById("windows") as HTMLElement)
            .backgroundColor,
        }));
      const after = await state();
      // Load the app again in the same tab: the stored theme must win.
      await openApp(page, ctx.kind);
      await waitForTheme(page, "dark");
      await settle(page, 400);
      return { after, reloaded: await state() };
    },
  ),
  behaviour("dialog/expand-shrink-applies", ["RUN-DIALOG-020", "UI-DIALOG-005"], async (page) => {
    await S.rect(page);
    await clickMenu(page, ["Modify", "Path", "Expand/Shrink"]);
    const input = page.locator(".g-prompt-dialog input");
    await input.fill("10");
    await page.keyboard.press("Enter");
    await settle(page, 400);
    return page.evaluate(() => {
      const { app } = (
        window as unknown as {
          __parity: {
            app: {
              selection(): {
                getNodeName(): string;
                getGeometryBBox(): { getWidth(): number; getHeight(): number };
              }[];
            };
          };
        }
      ).__parity;
      return app
        .selection()
        .map((n) => [
          n.getNodeName(),
          n.getGeometryBBox().getWidth(),
          n.getGeometryBBox().getHeight(),
        ]);
    });
  }),
  behaviour(
    "dialog/quick-exports",
    ["RUN-DIALOG-016", "RUN-SAVE-010", "RUN-MENU-015", "RUN-MENU-016", "RUN-MENU-017"],
    async (page) => {
      await S.rect(page);
      const files: { name: string; size: number; content: string; head: string }[] = [];
      for (const item of [
        "PNG Image (.png)",
        "JPEG Image (.jpg)",
        "Scalable Vector Graphics (.svg)",
      ]) {
        const dl = page.waitForEvent("download", { timeout: 20_000 });
        await clickMenu(page, ["File", "Export", item]);
        await skipSavePrompt(page);
        const file = await dl;
        const chunks: Buffer[] = [];
        for await (const chunk of await file.createReadStream()) chunks.push(chunk as Buffer);
        const bytes = Buffer.concat(chunks);
        // The exported bytes themselves, not only the name the app suggests.
        files.push({
          name: file.suggestedFilename(),
          size: bytes.length,
          // SHA-256 of the bytes; SVG is text and kept whole, so a
          // difference is readable.
          content: file.suggestedFilename().endsWith(".svg")
            ? svgWithStableIds(bytes.toString("utf8"))
            : createHash("sha256").update(bytes).digest("hex"),
          head: bytes.subarray(0, 8).toString("hex"),
        });
      }
      return files;
    },
  ),
  behaviour(
    "dialog/file-pickers",
    ["RUN-DIALOG-018", "RUN-DIALOG-019", "UI-IMAGE-003", "RUN-MENU-012"],
    async (page) => {
      const out: unknown[] = [];
      for (const path of [
        ["File", "Import", "Add Fonts..."],
        ["File", "Import", "Place Image..."],
        ["File", "Open Local File..."],
      ]) {
        const chooser = page.waitForEvent("filechooser");
        await clickMenu(page, path);
        const fc = await chooser;
        out.push({
          path: path.join(" > "),
          multiple: fc.isMultiple(),
          accept: await fc
            .element()
            .evaluate((e) => (e as HTMLInputElement).getAttribute("accept")),
        });
        await fc.setFiles([]);
        await settle(page, 300);
      }
      return out;
    },
  ),
  behaviour(
    "dialog/help-links",
    ["RUN-DIALOG-024", "RUN-MENU-164", "RUN-MENU-166", "RUN-MENU-167", "RUN-MENU-170"],
    async (page) => {
      const urls: string[] = [];
      await page.context().route(/.*/, async (route) => {
        const r = route.request();
        let own = false;
        try {
          own = r.frame().page() === page;
        } catch {
          // Popup requests come before their frame exists.
        }
        if (r.isNavigationRequest() && !own) urls.push(r.url());
        await route.fallback();
      });
      for (const path of [
        ["Help", "Support", "Contact Us"],
        ["Help", "Request New Feature"],
        ["Help", "Learn", "User Guide"],
        ["Help", "Learn", "Tutorials"],
      ]) {
        const popup = page.waitForEvent("popup");
        await clickMenu(page, path);
        const p = await popup;
        await p.waitForLoadState().catch(() => undefined);
        await p.close();
      }
      return urls.map((u) => u.replace(/^http:\/\/(127\.0\.0\.1|localhost):\d+/, "<self>"));
    },
  ),
  behaviour("dialog/download-file", ["RUN-SAVE-005", "RUN-MENU-008"], async (page) => {
    await S.rect(page);
    const dl = page.waitForEvent("download");
    await clickMenu(page, ["File", "Download File"]);
    const name = (await dl).suggestedFilename();
    await settle(page, 300);
    return {
      name,
      tabs: await page.evaluate(() =>
        [...document.querySelectorAll("#header .tabs .tab .cover")].map((t) => t.textContent),
      ),
    };
  }),
];

paritySuite("ui dialogs", scenarios, { newApp: false });
