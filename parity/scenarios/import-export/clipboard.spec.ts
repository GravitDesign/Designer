// Clipboard formats in headless Chromium. Copy and cut go through the real
// shortcut, which makes the browser fire a native copy event; the payload
// the app writes is read from that event. Pastes use either the real
// shortcut (async Clipboard API first, then the internal clipboard) or a
// paste event carrying a DataTransfer, which is how the browser delivers
// content pasted from other applications.
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import {
  clickMenu,
  fixtureBase64,
  importCounts,
  runInPage,
  visibleDialogs,
  waitForImport,
} from "./node-lib.ts";
import { inPageWithLib } from "./page-lib.ts";

/** Builds the shapes document, selects elements and fixes the view. */
const setup = inPageWithLib(async (_p, a: { select: string[]; doc?: string }, L) => {
  L.app.document().setTitle("Clip Doc");
  const built = await L.build(a.doc ?? "shapes");
  L.app.editor().updateSelection(
    false,
    a.select.map((n) => built[n]),
  );
  L.app.view().transform(-300, -150, 1);
  const w = window as unknown as { __copies: unknown[] };
  w.__copies = [];
  if (!(window as unknown as { __copyHooked?: boolean }).__copyHooked) {
    (window as unknown as { __copyHooked?: boolean }).__copyHooked = true;
    // Bubbling listener on window: runs after the app's document listener.
    for (const type of ["copy", "cut"]) {
      window.addEventListener(type, (e) => {
        const ev = e as ClipboardEvent;
        const data: Record<string, string> = {};
        for (const t of ev.clipboardData?.types ?? []) data[t] = ev.clipboardData?.getData(t) ?? "";
        w.__copies.push({ type, data });
      });
    }
  }
  return null;
});

const state = inPageWithLib(async (_p, _a: unknown, L) => {
  await L.io.settle();
  return L.sceneState();
});

/** The captured copy events, with the gravit XML unwrapped into JSON. */
const copies = inPageWithLib(() => {
  const list = (window as unknown as { __copies: { type: string; data: Record<string, string> }[] })
    .__copies;
  return JSON.stringify(
    list.map((c) => {
      const out: Record<string, unknown> = { type: c.type, types: Object.keys(c.data) };
      for (const [t, v] of Object.entries(c.data)) {
        if (t === "text/xml") {
          const doc = new DOMParser().parseFromString(v, "text/xml");
          const root = doc.documentElement;
          out.xml = {
            root: root.nodeName,
            mimeType: root.getAttribute("mimeType"),
            restricted: root.getAttribute("restricted"),
            content: JSON.parse(root.textContent ?? "null"),
          };
        } else out[t] = v;
      }
      return out;
    }),
  );
});

async function focusCanvas(page: Page): Promise<void> {
  await page.locator(".g-editor-widget > div[tabindex]").first().focus();
  await page.mouse.move(800, 500);
}

async function grant(page: Page): Promise<void> {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: new URL(page.url()).origin,
  });
}

/** Dispatches a paste event whose clipboardData holds `items` (strings or base64 files). */
async function pasteEvent(
  page: Page,
  items: { type: string; text?: string; b64?: string; name?: string }[],
): Promise<string> {
  const before = await importCounts(page);
  await page.evaluate((list) => {
    const dt = new DataTransfer();
    for (const it of list) {
      if (it.b64 !== undefined) {
        const bin = atob(it.b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        dt.items.add(new File([bytes], it.name ?? "pasted", { type: it.type }));
      } else dt.setData(it.type, it.text ?? "");
    }
    document.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }),
    );
  }, items);
  return waitForImport(page, { size: before.size }, 8000);
}

const CLIP = "import-export/clipboard";

function pasteCase(
  name: string,
  covers: string[],
  items: { type: string; text?: string; b64?: string; name?: string }[],
): Scenario<unknown> {
  return {
    id: `${CLIP}/paste-event-${name}`,
    covers: ["FMT-CLIP-001", "FMT-CLIP-003", ...covers],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, setup, { select: [] });
      await focusCanvas(page);
      const outcome = await pasteEvent(page, items);
      return {
        outcome,
        state: await runInPage(page, state, {}),
        dialogs: await visibleDialogs(page),
      };
    },
  };
}

const svgText =
  '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="40"><rect width="60" height="40" fill="#09c"/></svg>';
const fillLayerXml =
  '<gravit mimeType="application/gravit+node" restricted="false">' +
  JSON.stringify([{ "@": "fillPaintLayer", _pt: "C#[0,200,100]" }]).replace(/&/g, "&amp;") +
  "</gravit>";
const nodeXml =
  '<gravit mimeType="application/gravit+node" restricted="false">' +
  JSON.stringify([
    {
      "@": "rectangle",
      trf: [20, 0, 0, 10, 50, 50],
      name: "Pasted",
      _layers: { "@": "paintLayers", $: [{ "@": "fillPaintLayer", _pt: "C#[10,20,30]" }] },
    },
  ]) +
  "</gravit>";

/** Selects the element of the active page with this name. */
async function selectByName(page: Page, name: string): Promise<void> {
  await page.evaluate((n) => {
    const app = (
      window as unknown as {
        __parity: {
          app: {
            scene(): { getActivePage(): { getChildren(): { getProperty(k: string): unknown }[] } };
            editor(): { updateSelection(t: boolean, s: unknown[]): void };
          };
        };
      }
    ).__parity.app;
    const el = app
      .scene()
      .getActivePage()
      .getChildren()
      .find((c) => c.getProperty("name") === n);
    app.editor().updateSelection(false, el ? [el] : []);
  }, name);
}

/**
 * Copy style (FMT-CLIP-011): with the pointer over the Appearance fill
 * (or border) row of the selected element, Ctrl+C copies that one paint
 * layer instead of the element. The payload is then pasted onto another
 * element the way the system clipboard hands it back (a paste event), which
 * adds the layer to it (FMT-CLIP-006).
 */
const copyStyle: Scenario<unknown> = {
  id: `${CLIP}/copy-style`,
  covers: ["FMT-CLIP-011", "FMT-CLIP-006", "FMT-CLIP-010"],
  kind: "json",
  driver: async ({ page }) => {
    page.setDefaultTimeout(15_000);
    await runInPage(page, setup, { select: ["box"] });
    const out: Record<string, unknown> = {};
    for (const [row, target] of [
      ["fill-block", "Oval"],
      ["border-block", "Rounded"],
    ] as const) {
      await selectByName(page, "Box");
      const block = page.locator(`.sidebar-inspector .${row}`).first();
      await block.click({ position: { x: 5, y: 5 } });
      await block.hover({ position: { x: 5, y: 5 } });
      await page.evaluate(() => {
        (window as unknown as { __copies: unknown[] }).__copies.length = 0;
      });
      await page.keyboard.press("Control+c");
      await page.waitForFunction(
        () => (window as unknown as { __copies: unknown[] }).__copies.length > 0,
      );
      const copied = JSON.parse(await runInPage<string>(page, copies, {})) as {
        xml?: { content: unknown };
      }[];
      const xml = await page.evaluate(
        () =>
          (window as unknown as { __copies: { data: Record<string, string> }[] }).__copies[0]?.data[
            "text/xml"
          ] ?? "",
      );
      await selectByName(page, target);
      await focusCanvas(page);
      const outcome = await pasteEvent(page, [{ type: "text/xml", text: xml }]);
      out[row] = { copied, outcome, state: await runInPage(page, state, {}) };
    }
    return out;
  },
};

const scenarios = defineScenarios<unknown>([
  copyStyle,
  {
    id: `${CLIP}/copy-payload`,
    covers: ["FMT-CLIP-010", "FMT-GVD-016", "ACT-EDIT-004"],
    kind: "document",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, setup, { select: ["box", "oval"] });
      await focusCanvas(page);
      await page.keyboard.press("Control+c");
      await page.waitForTimeout(500);
      return runInPage<string>(page, copies, {});
    },
  },
  {
    id: `${CLIP}/copy-text-payload`,
    covers: ["FMT-CLIP-010"],
    kind: "document",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, setup, { doc: "text", select: ["title"] });
      await focusCanvas(page);
      await page.keyboard.press("Control+c");
      await page.waitForTimeout(500);
      return runInPage<string>(page, copies, {});
    },
  },
  {
    id: `${CLIP}/cut-then-paste`,
    covers: ["FMT-CLIP-010", "FMT-CLIP-013", "FMT-CLIP-007", "ACT-EDIT-003", "ACT-EDIT-005"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await grant(page);
      await runInPage(page, setup, { select: ["tilted"] });
      await focusCanvas(page);
      await page.keyboard.press("Control+x");
      await page.waitForTimeout(500);
      const afterCut = await runInPage(page, state, {});
      await focusCanvas(page);
      await page.keyboard.press("Control+v");
      await page.waitForTimeout(800);
      return {
        afterCut,
        afterPaste: await runInPage(page, state, {}),
        copies: JSON.parse(await runInPage<string>(page, copies, {})).map(
          (c: { type: string; types: string[] }) => [c.type, c.types],
        ),
      };
    },
  },
  {
    id: `${CLIP}/copy-paste-variants`,
    covers: [
      "FMT-CLIP-014",
      "ACT-EDIT-006",
      "ACT-EDIT-007",
      "ACT-EDIT-008",
      "ACT-EDIT-010",
      "FMT-CLIP-013",
    ],
    kind: "json",
    timeout: 120_000,
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await grant(page);
      await runInPage(page, setup, { select: ["box"] });
      await focusCanvas(page);
      await page.keyboard.press("Control+c");
      await page.waitForTimeout(300);
      const out: Record<string, unknown> = {};
      const select = (name: string) =>
        page.evaluate((n) => {
          const w = window as unknown as {
            __parity: {
              app: {
                scene(): {
                  querySingle(q: string): unknown;
                  getActivePage(): { getChildren(): { getProperty(k: string): unknown }[] };
                };
                editor(): { updateSelection(t: boolean, s: unknown[]): void };
              };
            };
          };
          const app = w.__parity.app;
          const el = app
            .scene()
            .getActivePage()
            .getChildren()
            .find((c) => c.getProperty("name") === n);
          app.editor().updateSelection(false, el ? [el] : []);
        }, name);
      await clickMenu(page, ["Edit", "Paste", "Paste In Place"]);
      out.inPlace = await runInPage(page, state, {});
      await select("Oval");
      await clickMenu(page, ["Edit", "Paste", "Paste and Replace"]);
      out.replace = await runInPage(page, state, {});
      await select("Rounded");
      await clickMenu(page, ["Edit", "Paste", "Paste Style"]);
      out.style = await runInPage(page, state, {});
      await select("Tilted");
      await clickMenu(page, ["Edit", "Paste", "Paste Inside Selection"]);
      out.inside = await runInPage(page, state, {});
      return out;
    },
  },
  {
    id: `${CLIP}/paste-here-context-menu`,
    covers: ["FMT-CLIP-014", "ACT-EDIT-009", "ACT-CTX-002"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await grant(page);
      await runInPage(page, setup, { select: ["box"] });
      await focusCanvas(page);
      await page.keyboard.press("Control+c");
      await page.waitForTimeout(300);
      await page.mouse.click(900, 600, { button: "right" });
      await page.waitForTimeout(400);
      const paste = page.locator("ul.g-menu:not(.g-menu-root):visible > li.g-menu-item", {
        has: page.locator(':scope > .g-menu-item-caption:text-is("Paste")'),
      });
      await paste.first().hover();
      await page.waitForTimeout(400);
      await page
        .locator("ul.g-menu:not(.g-menu-root):visible > li.g-menu-item", {
          has: page.locator(':scope > .g-menu-item-caption:text-is("Paste Here")'),
        })
        .first()
        .click();
      await page.waitForTimeout(500);
      return runInPage(page, state, {});
    },
  },
  {
    id: `${CLIP}/paste-async-png`,
    covers: ["FMT-CLIP-002", "FMT-CLIP-009", "FMT-CLIP-013"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await grant(page);
      await runInPage(page, setup, { select: [] });
      await page.evaluate(async (b64) => {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": new Blob([bytes], { type: "image/png" }) }),
        ]);
      }, fixtureBase64("raster/alpha.png"));
      await focusCanvas(page);
      const before = await importCounts(page);
      await page.keyboard.press("Control+v");
      await waitForImport(page, { size: before.size }, 8000);
      return { state: await runInPage(page, state, {}), dialogs: await visibleDialogs(page) };
    },
  },
  {
    id: `${CLIP}/paste-async-text`,
    covers: ["FMT-CLIP-002", "FMT-CLIP-008"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await grant(page);
      await runInPage(page, setup, { select: [] });
      await page.evaluate(() => navigator.clipboard.writeText("Pasted from outside"));
      await focusCanvas(page);
      const before = await importCounts(page);
      await page.keyboard.press("Control+v");
      await waitForImport(page, { size: before.size }, 8000);
      return runInPage(page, state, {});
    },
  },
  pasteCase("plain-text", ["FMT-CLIP-008"], [{ type: "text/plain", text: "Hello paste" }]),
  pasteCase("rtl-text", ["FMT-CLIP-008"], [{ type: "text/plain", text: "مرحبا بالعالم" }]),
  pasteCase("cjk-text", ["FMT-CLIP-008"], [{ type: "text/plain", text: "日本語のテキスト" }]),
  pasteCase(
    "svg-as-text",
    ["FMT-CLIP-005", "FMT-CLIP-009"],
    [{ type: "text/plain", text: svgText }],
  ),
  pasteCase("svg-file", ["FMT-CLIP-009"], [{ type: "image/svg+xml", text: svgText }]),
  pasteCase(
    "png-file",
    ["FMT-CLIP-009"],
    [{ type: "image/png", b64: fixtureBase64("raster/alpha.png"), name: "image.png" }],
  ),
  pasteCase(
    "jpeg-file",
    ["FMT-CLIP-009"],
    [{ type: "image/jpeg", b64: fixtureBase64("raster/photo.jpg"), name: "image.jpg" }],
  ),
  pasteCase(
    "gif-file",
    ["FMT-CLIP-009"],
    [{ type: "image/gif", b64: fixtureBase64("raster/indexed.gif"), name: "image.gif" }],
  ),
  pasteCase(
    "pdf-file",
    ["FMT-CLIP-009"],
    [{ type: "application/pdf", b64: fixtureBase64("pdf/plain.pdf"), name: "doc.pdf" }],
  ),
  pasteCase(
    "gravit-node-xml",
    ["FMT-CLIP-005", "FMT-CLIP-007"],
    [{ type: "text/xml", text: nodeXml }],
  ),
  pasteCase(
    "gravit-restricted-xml",
    ["FMT-CLIP-005", "FMT-CLIP-012"],
    [
      {
        type: "text/xml",
        text: nodeXml.replace('restricted="false"', 'restricted="other-doc-id"'),
      },
    ],
  ),
  pasteCase(
    "uri-list",
    ["FMT-CLIP-004"],
    // a data: URL, so the fetch does not depend on which server serves the app
    [
      {
        type: "text/uri-list",
        text: `# comment\ndata:image/png;base64,${fixtureBase64("raster/alpha.png")}`,
      },
    ],
  ),
  {
    id: `${CLIP}/paste-event-fill-layer`,
    covers: ["FMT-CLIP-001", "FMT-CLIP-006"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, setup, { select: ["box", "oval"] });
      await focusCanvas(page);
      await pasteEvent(page, [{ type: "text/xml", text: fillLayerXml }]);
      return runInPage(page, state, {});
    },
  },
  {
    id: `${CLIP}/new-from-clipboard`,
    covers: ["FMT-CLIP-015", "ACT-FILE-003"],
    kind: "json",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await runInPage(page, setup, { select: ["oval", "corner"] });
      await focusCanvas(page);
      await page.keyboard.press("Control+c");
      await page.waitForTimeout(300);
      await clickMenu(page, ["File", "New from Clipboard"]);
      await page.waitForTimeout(800);
      return { state: await runInPage(page, state, {}), dialogs: await visibleDialogs(page) };
    },
  },
  {
    id: `${CLIP}/copy-page`,
    covers: ["FMT-CLIP-016", "FMT-CLIP-017", "ACT-CTX-005"],
    kind: "document",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await grant(page);
      await runInPage(page, setup, { doc: "multipage", select: [] });
      await page
        .locator(".pages .page-row .page-title", { hasText: "Second" })
        .first()
        .click({ button: "right" });
      await page.waitForTimeout(400);
      await page
        .locator("ul.g-menu:not(.g-menu-root):visible > li.g-menu-item", {
          has: page.locator(':scope > .g-menu-item-caption:text-is("Copy Page")'),
        })
        .first()
        .click();
      await page.waitForTimeout(500);
      const text = await page.evaluate(() =>
        navigator.clipboard.readText().catch((e: Error) => "error: " + e.message),
      );
      const m = /^<gravit[^>]*>([\s\S]*)<\/gravit>$/.exec(text);
      const parsed = m ? JSON.parse((m[1] ?? "").replace(/&amp;/g, "&")) : text;
      return JSON.stringify({
        wrapper: m ? text.slice(0, text.indexOf(">") + 1) : null,
        content: parsed,
      });
    },
  },
]);

paritySuite("import-export clipboard", scenarios, { newApp: false });
