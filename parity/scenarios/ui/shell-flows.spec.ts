// Shell overlays and system dialogs reached through real flows: the
// document loading overlay, a failed save, dropping files, the one-time
// unsupported-screen dialog, the image-too-big message and the PWA
// install dialog.
import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { PNG } from "pngjs";
import { openApp } from "../../support/apps.ts";
import { NEXT_ROOT } from "../../support/env.ts";
import { paritySuite } from "../../support/suite.ts";
import type { Scenario } from "../../support/scenario.ts";
import { behaviour, clickMenu, settle, surfaces, testPng, type SurfaceSpec } from "./lib.ts";
import * as S from "./states.ts";

const SAMPLE = path.join(NEXT_ROOT, "parity", "corpus", "files", "shapes-rectangles.gvdesign");
const DIALOG = [".g-dialog-container.visible .g-dialog"];
const SMALL_SCREEN = { width: 900, height: 700 };

/** Texts of visible system dialogs (first line kept whole). */
const dialogs = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll(".g-dialog-container.visible .g-dialog")].map((d) => ({
      cls: [...d.classList].sort(),
      text: (d as HTMLElement).innerText.replace(/\s+/g, " ").trim(),
    })),
  );

/** Opens a file through File > Open Local File... (the file input fallback). */
async function openLocal(page: Page, name: string, buffer: Buffer): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await clickMenu(page, ["File", "Open Local File..."]);
  await (await chooser).setFiles({ name, mimeType: "application/octet-stream", buffer });
}

/**
 * Collects every text the document overlay (`.window-overlay`) shows from
 * now on, in order and without repeats, so a loading message that is only
 * up for a moment is still recorded.
 */
async function watchOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __overlayTexts: string[] };
    w.__overlayTexts = [];
    const note = () => {
      for (const o of document.querySelectorAll(".window-overlay-content")) {
        const text = (o as HTMLElement).innerText.replace(/\s+/g, " ").trim();
        if (text && w.__overlayTexts.at(-1) !== text) w.__overlayTexts.push(text);
      }
    };
    new MutationObserver(note).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
}

const overlayTexts = (page: Page) =>
  page.evaluate(() => (window as unknown as { __overlayTexts: string[] }).__overlayTexts.splice(0));

/**
 * Replaces showSaveFilePicker with one whose file can't be written (the
 * write rejects with QuotaExceededError, as a full disk does). Counts the
 * write attempts.
 */
async function failingSavePicker(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __writes: number; showSaveFilePicker: unknown };
    w.__writes = 0;
    w.showSaveFilePicker = async (o?: { suggestedName?: string }) => ({
      kind: "file",
      name: o?.suggestedName ?? "file",
      getFile: async () => new File([], o?.suggestedName ?? "file"),
      queryPermission: async () => "granted",
      requestPermission: async () => "granted",
      isSameEntry: async () => false,
      createWritable: async () => ({
        write: async () => {
          w.__writes++;
          throw new DOMException("The disk is full", "QuotaExceededError");
        },
        truncate: async () => undefined,
        seek: async () => undefined,
        close: async () => undefined,
      }),
    });
  });
}

/** File > Save, then "Save to File" in the chooser; the write fails. */
async function failSave(page: Page): Promise<void> {
  await S.rect(page);
  await failingSavePicker(page);
  await clickMenu(page, ["File", "Save"]);
  await page.locator(".g-dialog-container.visible .g-dialog").getByText("Save to File").click();
  await page.locator(".window-overlay-content button").first().waitFor();
  await settle(page);
}

/** Closes the alert dialog the failed write opens, leaving the overlay. */
async function closeAlert(page: Page): Promise<void> {
  await page.locator('.g-dialog-container.visible button:text-is("OK")').click();
  await page.locator(".g-dialog-container.visible").waitFor({ state: "detached" });
  await settle(page);
}

/**
 * Drops files on the window at a point, as the browser does when files are
 * dragged in from the desktop: dragenter, dragover and drop with a
 * DataTransfer holding the files.
 */
async function dropFiles(
  page: Page,
  at: readonly [number, number],
  files: { name: string; type: string; base64: string }[],
): Promise<{ prevented: boolean[] }> {
  return page.evaluate(
    ({ x, y, list }) => {
      const dt = new DataTransfer();
      for (const f of list) {
        const bytes = Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0));
        dt.items.add(new File([bytes], f.name, { type: f.type }));
      }
      const target = document.elementFromPoint(x, y) ?? document.body;
      const prevented: boolean[] = [];
      for (const type of ["dragenter", "dragover", "drop"]) {
        const e = new DragEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          dataTransfer: dt,
        });
        target.dispatchEvent(e);
        prevented.push(e.defaultPrevented);
      }
      return { prevented };
    },
    { x: at[0], y: at[1], list: files },
  );
}

/** What the scene holds: node names with their bounding boxes. */
const sceneNodes = (page: Page) =>
  page.evaluate(() => {
    const { app } = (
      window as unknown as {
        __parity: {
          app: {
            document(): unknown;
            scene(): {
              queryAll(q: string): {
                getNodeName(): string;
                getGeometryBBox(): {
                  getX(): number;
                  getY(): number;
                  getWidth(): number;
                  getHeight(): number;
                } | null;
              }[];
            };
          };
        };
      }
    ).__parity;
    if (!app.document()) return null;
    return app
      .scene()
      .queryAll("image, rectangle, ellipse, path, text")
      .map((n) => {
        const b = n.getGeometryBBox();
        return [n.getNodeName(), b ? [b.getX(), b.getY(), b.getWidth(), b.getHeight()] : null];
      });
  });

/** A PNG wider than any image the app accepts (GPlatform.maxImgLinearDimension). */
function hugePng(): Buffer {
  const png = new PNG({ width: 40_000, height: 2 });
  png.data.fill(200);
  return PNG.sync.write(png);
}

/** Image inspector > Replace image with a file. */
async function replaceImage(page: Page, file: Buffer): Promise<void> {
  await S.image(page);
  const chooser = page.waitForEvent("filechooser");
  await page.click(".sidebar-inspector button.g-flat:has(.gravit-icon-replaceimg)");
  await (await chooser).setFiles({ name: "huge.png", mimeType: "image/png", buffer: file });
}

/** Fires synthetic beforeinstallprompt events, as Chromium does on its own. */
async function firePwaPrompts(page: Page, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await page.evaluate(() => {
      const e = new Event("beforeinstallprompt") as Event & { prompt(): Promise<unknown> };
      e.prompt = () => Promise.resolve({ outcome: "dismissed" });
      window.dispatchEvent(e);
    });
    await settle(page, 300);
  }
}

const list: SurfaceSpec[] = [
  {
    id: "shell/save-failed-overlay",
    covers: ["UI-SHELL-025"],
    open: { fileSystemAccess: true },
    setup: async (page) => {
      await failSave(page);
      await closeAlert(page);
    },
    shot: [".window-overlay-content > span"],
    dom: [".window-overlay"],
  },
  {
    id: "dialog/one-time-small-screen",
    covers: ["UI-DIALOG-006"],
    viewport: SMALL_SCREEN,
    setup: async (page) => {
      await page.locator(".g-onetime-dialog").waitFor();
    },
    shot: DIALOG,
  },
  {
    id: "dialog/image-too-big",
    covers: ["UI-IMAGE-002", "UI-DIALOG-011"],
    setup: async (page) => {
      await replaceImage(page, hugePng());
      await page.locator(".g-dialog-container.visible .g-dialog .message").waitFor();
      await settle(page);
    },
    shot: DIALOG,
  },
  {
    id: "dialog/install-pwa",
    covers: ["UI-DIALOG-020", "UI-SHELL-032"],
    setup: async (page) => {
      await firePwaPrompts(page, 3);
      await page.locator(".g-install-pwa-dialog").waitFor();
      await settle(page);
    },
    shot: DIALOG,
  },
];

const scenarios: Scenario[] = [
  ...surfaces(list),
  behaviour("shell/loading-overlay", ["UI-SHELL-024"], async (page) => {
    await watchOverlay(page);
    await openLocal(page, "shapes-rectangles.gvdesign", fs.readFileSync(SAMPLE));
    await page.locator("#header .tabs .tab", { hasText: "shapes-rectangles" }).waitFor();
    await settle(page, 300);
    const opened = { overlay: await overlayTexts(page), dialogs: await dialogs(page) };
    // Not a design file. The old app never reports the failure: the new
    // tab keeps "Loading broken..." and the page logs an error.
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await openLocal(page, "broken.gvdesign", Buffer.from("this is not a design file"));
    await page.locator("#header .tabs .tab", { hasText: "broken" }).waitFor();
    await page.locator(".window-overlay-content").first().waitFor();
    await settle(page, 2000);
    return {
      opened,
      broken: { overlay: await overlayTexts(page), dialogs: await dialogs(page), errors },
      tabs: await page.locator("#header .tabs .tab .title .cover").allTextContents(),
    };
  }),
  behaviour(
    "shell/save-failed-flow",
    ["UI-SHELL-025"],
    async (page) => {
      await failSave(page);
      const writes = () =>
        page.evaluate(() => (window as unknown as { __writes: number }).__writes);
      const overlay = () =>
        page.evaluate(() =>
          [...document.querySelectorAll(".window-overlay-content")].map((o) =>
            (o as HTMLElement).innerText.replace(/\s+/g, " ").trim(),
          ),
        );
      const out: Record<string, unknown> = {
        failed: { overlay: await overlay(), dialogs: await dialogs(page), writes: await writes() },
      };
      await closeAlert(page);
      await page.click('.window-overlay-content button:text-is("Try again")');
      await page.locator(".g-dialog-container.visible").waitFor();
      await settle(page);
      out.retried = {
        overlay: await overlay(),
        dialogs: await dialogs(page),
        writes: await writes(),
      };
      await closeAlert(page);
      await page.click('.window-overlay-content button:text-is("Cancel")');
      await settle(page);
      out.cancelled = { overlay: await overlay(), writes: await writes() };
      out.tabs = await page.locator("#header .tabs .tab .title .cover").allTextContents();
      return out;
    },
    { fileSystemAccess: true },
  ),
  behaviour("shell/file-drop", ["UI-SHELL-028"], async (page) => {
    const png = { name: "dropped.png", type: "image/png", base64: testPng().toString("base64") };
    const out: Record<string, unknown> = {};
    out.withDocument = await dropFiles(page, [700, 450], [png]);
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __parity: { app: { scene(): { queryAll(q: string): unknown[] } } };
          }
        ).__parity.app
          .scene()
          .queryAll("image").length > 0,
    );
    await settle(page, 300);
    out.nodes = await sceneNodes(page);
    out.tabs = await page.locator("#header .tabs .tab .title .cover").allTextContents();
    return out;
  }),
  behaviour("shell/file-drop-no-document", ["UI-SHELL-028"], async (page) => {
    // Closing the only (unmodified) document leaves none open and shows
    // the welcome dialog; Escape closes that too.
    await page.click("#header .tabs .tab .close");
    await page.locator("#header .tabs .tab").waitFor({ state: "detached" });
    await page.locator(".g-new-document-dialog-container.visible").waitFor();
    await page.keyboard.press("Escape");
    await page.locator(".g-new-document-dialog-container.visible").waitFor({ state: "detached" });
    await settle(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const png = { name: "dropped.png", type: "image/png", base64: testPng().toString("base64") };
    const drop = await dropFiles(page, [700, 450], [png]);
    await settle(page, 1000);
    return {
      drop,
      tabs: await page.locator("#header .tabs .tab").count(),
      nodes: await sceneNodes(page),
      dialogs: await dialogs(page),
      errors,
    };
  }),
  behaviour(
    "dialog/one-time-dont-show-again",
    ["UI-DIALOG-006"],
    async (page, ctx) => {
      await page.locator(".g-onetime-dialog").waitFor();
      const key = "designer.settings.dont_show_unsupported_screen_size_dialog";
      const stored = () => page.evaluate((k) => localStorage.getItem(k), key);
      const before = await stored();
      await page.click(".g-onetime-dialog .g-dialog-footer input[type=checkbox]");
      await settle(page);
      const checked = await stored();
      await page.click('.g-onetime-dialog button:text-is("OK")');
      await settle(page);
      // Load the app again at the same size: the dialog stays away.
      await openApp(page, ctx.kind);
      await settle(page, 1000);
      return {
        before,
        checked,
        afterReload: { dialogs: await dialogs(page), stored: await stored() },
      };
    },
    undefined,
    undefined,
    // The dialog needs a screen narrower than 1024 px at boot.
    SMALL_SCREEN,
  ),
  behaviour("shell/pwa-not-now", ["UI-SHELL-032", "UI-DIALOG-020"], async (page) => {
    const keys = () =>
      page.evaluate(() => {
        const date = localStorage.getItem("pwa.closed-install-pwa-dialog-date");
        // Both hold epoch milliseconds of when things happened; only their
        // shape is recorded.
        const week = localStorage.getItem("pwa.show-install-dialog-3-times-a-week");
        const times = week === null ? null : (JSON.parse(JSON.parse(week) as string) as unknown[]);
        return {
          closedDate: date === null ? null : typeof JSON.parse(date),
          week: times === null ? null : times.map((t) => typeof t),
        };
      });
    await firePwaPrompts(page, 3);
    await page.locator(".g-install-pwa-dialog").waitFor();
    const shown = { dialogs: await dialogs(page) };
    const buttons = await page.locator(".g-install-pwa-dialog button").allTextContents();
    await page.click('.g-install-pwa-dialog button:text-is("Not now")');
    await settle(page);
    const afterNotNow = { dialogs: await dialogs(page), keys: await keys() };
    // Within 30 days of "Not now" more prompts never bring it back.
    await firePwaPrompts(page, 3);
    return { shown, buttons, afterNotNow, afterMorePrompts: { dialogs: await dialogs(page) } };
  }),
];

paritySuite("ui shell flows", scenarios, { newApp: false });
