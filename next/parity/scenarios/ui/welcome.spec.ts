import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { behaviour, BROWSER_LOCALES, clickMenu, LOCALES, settle, surfaces } from "./lib.ts";

const WELCOME = { newDocument: false } as const;
const DIALOG = ".g-new-document-dialog";

const CATEGORIES = [
  { slug: "uiux", index: 0, covers: ["UI-NEWDOC-006", "RUN-START-013"] },
  { slug: "social", index: 1, covers: ["UI-NEWDOC-007", "RUN-START-014"] },
  { slug: "print", index: 2, covers: ["UI-NEWDOC-008", "RUN-START-015"] },
  { slug: "presentation", index: 3, covers: ["UI-NEWDOC-009", "RUN-START-016"] },
  { slug: "web", index: 4, covers: ["UI-NEWDOC-010", "RUN-START-017"] },
  { slug: "video", index: 5, covers: ["UI-NEWDOC-011", "RUN-START-018"] },
] as const;

async function openPreset(page: Page, index: number): Promise<void> {
  await page.locator(`${DIALOG} .presets > .preset`).nth(index).click();
  await page.locator(".g-overlay.preset-select").waitFor();
}

/** What the active document looks like after creating it from the dialog. */
async function documentInfo(page: Page): Promise<unknown> {
  await page.waitForFunction(() => {
    const d = (window as unknown as { gDesigner: { getActiveDocument(): unknown } }).gDesigner;
    return !!d.getActiveDocument();
  });
  await settle(page);
  return page.evaluate(() => {
    const { app } = (window as unknown as { __parity: { app: ParityApp } }).__parity;
    interface ParityApp {
      document(): { getTitle(): string };
      scene(): {
        getProperty(k: string): unknown;
        getActivePage(): { getProperty(k: string): unknown };
      };
    }
    const page = app.scene().getActivePage();
    const bck = page.getProperty("bck") as { toString(): string } | null;
    return {
      title: app.document().getTitle(),
      unit: app.scene().getProperty("ut"),
      dpi: app.scene().getProperty("dpi"),
      w: page.getProperty("w"),
      h: page.getProperty("h"),
      bck: bck ? bck.toString() : null,
      dialogOpen: !!document.querySelector(".g-new-document-dialog-container.visible"),
      tabs: [...document.querySelectorAll("#header .tabs .tab .title .cover")].map(
        (t) => t.textContent,
      ),
    };
  });
}

const scenarios = [
  ...surfaces([
    {
      id: "welcome/dialog",
      covers: [
        "UI-WELCOME-001",
        "UI-WELCOME-002",
        "UI-WELCOME-003",
        "UI-WELCOME-005",
        "UI-WELCOME-006",
        "UI-WELCOME-007",
        "UI-NEWDOC-001",
        "UI-NEWDOC-003",
        "UI-NEWDOC-005",
        "RUN-START-001",
        "RUN-START-002",
        "RUN-START-007",
        "RUN-START-008",
        "RUN-START-009",
        "RUN-START-011",
        "UI-I18N-003",
        "UI-I18N-006",
        "RUN-I18N-003",
        "RUN-I18N-004",
      ],
      open: WELCOME,
      shot: [DIALOG],
      locales: BROWSER_LOCALES,
      languages: LOCALES,
    },
    {
      // The whole window behind the dialog: shell is greyed out.
      id: "welcome/window",
      covers: ["UI-WELCOME-001", "RUN-START-001", "RUN-INSPECT-027", "UI-SHELL-018"],
      open: WELCOME,
      shot: ["body"],
      dom: false,
    },
    {
      id: "welcome/option-hover",
      covers: ["UI-WELCOME-003"],
      open: WELCOME,
      setup: async (page) => {
        await page.hover(`${DIALOG} .option.local-option`);
      },
      shot: [`${DIALOG} .sidebar`],
    },
    {
      id: "welcome/tile-hover",
      covers: ["UI-NEWDOC-001", "RUN-START-011"],
      open: WELCOME,
      setup: async (page) => {
        await page.hover(`${DIALOG} .presets > .preset >> nth=1`);
      },
      shot: [`${DIALOG} .presets`],
    },
    {
      id: "welcome/create-hover",
      covers: ["UI-NEWDOC-003"],
      open: WELCOME,
      setup: async (page) => {
        await page.hover(`${DIALOG} .cloud-button`);
      },
      shot: [`${DIALOG} .header`],
    },
    {
      id: "welcome/typed-size",
      covers: ["UI-NEWDOC-003", "RUN-START-008", "RUN-START-009"],
      open: WELCOME,
      setup: async (page) => {
        const inputs = page.locator(`${DIALOG} .custom-size input`);
        await inputs.nth(0).click();
        await page.keyboard.type("210");
        await inputs.nth(1).click();
        await page.keyboard.type("297");
        await page.selectOption(`${DIALOG} select[name=unit]`, "mm");
      },
      shot: [`${DIALOG} .header`],
    },
    {
      id: "welcome/recent-clicked",
      covers: ["UI-WELCOME-004", "RUN-START-004"],
      open: WELCOME,
      setup: async (page) => {
        await page.click(`${DIALOG} .option.recent-option`);
      },
      shot: [DIALOG, ".g-overlay.g-recent-documents"],
      dom: [DIALOG, ".g-overlay"],
    },
    {
      id: "welcome/dont-show-checked",
      covers: ["UI-WELCOME-005", "RUN-START-019"],
      open: WELCOME,
      setup: async (page) => {
        await page.click(`${DIALOG} .footer-section input`);
      },
      shot: [`${DIALOG} .footer-section`],
    },
    ...CATEGORIES.map((c) => ({
      id: `welcome/preset-${c.slug}`,
      covers: ["UI-NEWDOC-001", "UI-NEWDOC-002", "UI-NEWDOC-005", "RUN-START-012", ...c.covers],
      open: WELCOME,
      setup: (page: Page) => openPreset(page, c.index),
      shot: [DIALOG, ".g-overlay.preset-select"],
      dom: [".g-overlay.preset-select"],
    })),
    {
      id: "welcome/preset-hover-item",
      covers: ["UI-NEWDOC-002"],
      open: WELCOME,
      setup: async (page) => {
        await openPreset(page, 2);
        await page.hover(".g-overlay.preset-select li >> nth=3");
      },
      shot: [".g-overlay.preset-select"],
      dom: false,
    },
    {
      id: "welcome/reopened",
      covers: ["RUN-START-020", "RUN-MENU-001", "UI-WELCOME-001"],
      open: WELCOME,
      setup: async (page) => {
        const inputs = page.locator(`${DIALOG} .custom-size input`);
        await inputs.nth(0).click();
        await page.keyboard.type("640");
        await inputs.nth(1).click();
        await page.keyboard.type("480");
        await page.click(`${DIALOG} .cloud-button`);
        await settle(page, 300);
        await clickMenu(page, ["File", "New Design..."]);
        await page.locator(`${DIALOG}`).waitFor();
      },
      shot: [DIALOG],
    },
  ]),

  behaviour(
    "welcome/create-infinite",
    ["UI-NEWDOC-004", "RUN-START-010", "UI-WELCOME-001"],
    async (page) => {
      await page.click(`${DIALOG} .cloud-button`);
      return documentInfo(page);
    },
    WELCOME,
  ),
  behaviour(
    "welcome/create-a4-mm",
    ["UI-NEWDOC-004", "RUN-START-010", "RUN-INSPECT-003"],
    async (page) => {
      const inputs = page.locator(`${DIALOG} .custom-size input`);
      await inputs.nth(0).click();
      await page.keyboard.type("210");
      await inputs.nth(1).click();
      await page.keyboard.type("297");
      await page.selectOption(`${DIALOG} select[name=unit]`, "mm");
      await page.click(`${DIALOG} .cloud-button`);
      return documentInfo(page);
    },
    WELCOME,
  ),
  behaviour(
    "welcome/create-enter",
    ["UI-WELCOME-002"],
    async (page) => {
      const inputs = page.locator(`${DIALOG} .custom-size input`);
      await inputs.nth(0).click();
      await page.keyboard.type("300");
      await inputs.nth(1).click();
      await page.keyboard.type("200");
      await page.keyboard.press("Enter");
      return documentInfo(page);
    },
    WELCOME,
  ),
  ...CATEGORIES.map((c) =>
    behaviour(
      `welcome/pick-${c.slug}`,
      ["UI-NEWDOC-002", "UI-NEWDOC-004", "RUN-START-012", ...c.covers],
      async (page) => {
        await openPreset(page, c.index);
        // The third entry of every category.
        await page.click(".g-overlay.preset-select li >> nth=2");
        return documentInfo(page);
      },
      WELCOME,
    ),
  ),
  behaviour(
    "welcome/escape-keeps-dialog",
    ["RUN-START-001", "UI-WELCOME-002"],
    async (page) => {
      await page.keyboard.press("Escape");
      await settle(page, 300);
      return {
        open: await page.locator(".g-new-document-dialog-container.visible").count(),
        documents: await page.evaluate(
          () =>
            (
              window as unknown as { gDesigner: { getDocuments(): unknown[] } }
            ).gDesigner.getDocuments().length,
        ),
      };
    },
    WELCOME,
  ),
  behaviour(
    "welcome/dont-show-writes-setting",
    ["UI-WELCOME-005", "RUN-START-019", "RUN-STORAGE-001"],
    async (page) => {
      const read = () =>
        page.evaluate(
          () =>
            (
              JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as Record<
                string,
                unknown
              >
            ).show_welcome_screen ?? "<unset>",
        );
      const before = await read();
      await page.click(`${DIALOG} .footer-section input`);
      await settle(page);
      const checked = await read();
      await page.click(`${DIALOG} .footer-section input`);
      await settle(page);
      return { before, checked, unchecked: await read() };
    },
    WELCOME,
  ),
  behaviour(
    "welcome/not-shown-when-disabled",
    ["UI-WELCOME-001", "RUN-START-001"],
    async (page) => {
      await settle(page, 300);
      return {
        dialog: await page.locator(".g-new-document-dialog-container.visible").count(),
        ...((await documentInfo(page)) as Record<string, unknown>),
      };
    },
    { newDocument: false, settings: { show_welcome_screen: false } },
  ),
  behaviour(
    "welcome/open-from-computer",
    ["RUN-START-003", "UI-IMAGE-003"],
    async (page) => {
      const chooser = page.waitForEvent("filechooser");
      await page.click(`${DIALOG} .option.local-option`);
      const fc = await chooser;
      const input = await fc.element().evaluate((e) => ({
        accept: (e as HTMLInputElement).getAttribute("accept"),
        inputMultiple: (e as HTMLInputElement).multiple,
      }));
      return { multiple: fc.isMultiple(), ...input };
    },
    WELCOME,
  ),
  behaviour(
    "welcome/links",
    ["UI-WELCOME-006", "RUN-START-005", "RUN-START-006"],
    async (page) => {
      const urls: string[] = [];
      // Popups are aborted by the network isolation; note what they asked for.
      await page.context().route(/.*/, async (route) => {
        const r = route.request();
        let own = false;
        try {
          own = r.frame().page() === page;
        } catch {
          // Requests of a popup are issued before its frame exists.
        }
        if (r.isNavigationRequest() && !own) urls.push(r.url());
        await route.fallback();
      });
      for (const n of [0, 1]) {
        const popup = page.waitForEvent("popup");
        await page.locator(`${DIALOG} .links-container .link`).nth(n).click();
        const p = await popup;
        await p.waitForLoadState().catch(() => undefined);
        await p.close();
      }
      // The user guide is served by the app itself; drop host and port.
      return urls.map((u) => u.replace(/^http:\/\/(127\.0\.0\.1|localhost):\d+/, "<self>"));
    },
    WELCOME,
  ),
];

paritySuite("ui welcome", scenarios, { newApp: false });
