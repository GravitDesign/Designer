// The local file storage layer (GBrowserFileStorage): opening through the
// File System Access API or the hidden file input, saving through a file
// handle or a download, and what is (not) remembered afterwards. The File
// System Access API is stubbed in the page so the calls the app makes can
// be recorded; the fallbacks run on Playwright's file chooser and download
// events. Saved files are recorded in full (savedDocument: the gunzipped,
// id-normalized scene and its decoded preview).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import {
  clearFsaLog,
  clickMenu,
  closeMenus,
  documents,
  downloadDocument,
  drawSample,
  fsaFirstSave,
  fsaLog,
  fsaWritten,
  installFsaStub,
  localStorageEntries,
  openMenu,
  openMenuItems,
  reopen,
  savedDocument,
  settle,
  storageDiff,
  tempDir,
  visibleDialogs,
  waitForDocumentCount,
  waitForFsaClose,
  waitForOpened,
  waitForStartupWrites,
} from "./lib.ts";

/** A .gvdesign the way the app stores it: the scene JSON, gzipped. */
async function sampleFile(page: Page): Promise<Buffer> {
  const json = await page.evaluate(() => {
    const { app } = (window as unknown as { __parity: { app: { serialize(o: unknown): string } } })
      .__parity;
    return app.serialize({ save: true });
  });
  return zlib.gzipSync(Buffer.from(json, "utf8"));
}

/** Visible dialogs by class name. */
async function dialogClasses(page: Page): Promise<string[]> {
  return (await visibleDialogs(page)).map((d) => d.className).sort();
}

/** Tab titles in the header, in order. */
async function tabTitles(page: Page): Promise<string[]> {
  return page.locator("#header .tabs .tab .title .cover").allTextContents();
}

/** Opens fifteen more documents through the harness, so the tabs overflow. */
async function openManyDocuments(page: Page): Promise<void> {
  await page.evaluate(() => {
    const { app } = (window as unknown as { __parity: { app: { newInfiniteDocument(): void } } })
      .__parity;
    for (let i = 0; i < 15; i++) app.newInfiniteDocument();
  });
  await waitForDocumentCount(page, 16);
  await settle(page);
}

/** Clicks the "more" button and waits until its list is shown with the active tab marked. */
async function openTabsList(page: Page): Promise<void> {
  await page.locator("#header .more-button .more-symbol").click();
  await page.waitForFunction(() => {
    const list = document.querySelector<HTMLElement>("#header .moreTab");
    return (
      !!list &&
      getComputedStyle(list).visibility === "visible" &&
      !!list.querySelector(".more-tab-icon")
    );
  });
  await settle(page);
}

/** The header tabs (which fit the row) and the "more" list. */
async function tabsState(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const row = document.querySelector<HTMLElement>("#header .section.windows");
    const box = row?.getBoundingClientRect();
    const right = box ? box.right : 0;
    const bottom = box ? box.bottom : 0;
    const more = document.querySelector<HTMLElement>("#header .more-button");
    const list = document.querySelector<HTMLElement>("#header .moreTab");
    return {
      tabs: [...document.querySelectorAll<HTMLElement>("#header .tabs > .tab")].map((t) => ({
        title: t.querySelector(".title .cover")?.textContent ?? null,
        active: t.classList.contains("g-active"),
        // Tabs that wrapped below the header row or past its end are cut off.
        inView:
          t.getBoundingClientRect().top < bottom && t.getBoundingClientRect().right <= right + 1,
      })),
      moreButton: more
        ? { active: more.classList.contains("active"), shown: more.offsetParent !== null }
        : null,
      moreList: [...document.querySelectorAll<HTMLElement>("#header .moreTab > .tab")].map((t) => ({
        title: t.querySelector(".title .cover")?.textContent ?? null,
        marked: !!t.querySelector(".more-tab-icon"),
      })),
      moreListVisible: !!list && getComputedStyle(list).visibility === "visible",
    };
  });
}

const scenarios = defineScenarios([
  {
    id: "platform/files/download-fallback",
    covers: [
      "FMT-STORAGE-009",
      "FMT-STORAGE-010",
      "FMT-STORAGE-001",
      "RUN-SAVE-005",
      "RUN-SAVE-006",
    ],
    kind: "json",
    // Without the File System Access API, File > Download File saves
    // through a Blob download and clears the modified flag. The file itself
    // is recorded in full.
    driver: async ({ page }) => {
      await drawSample(page);
      const before = await documents(page);
      const savedAfter = Date.now();
      const { name, bytes } = await downloadDocument(page);
      await settle(page);
      return {
        before,
        suggestedFilename: name,
        file: await savedDocument(page, bytes, savedAfter),
        after: await documents(page),
        tabs: await tabTitles(page),
      };
    },
  },
  {
    id: "platform/files/save-new-without-fsa",
    covers: ["FMT-STORAGE-011", "RUN-SAVE-004"],
    kind: "json",
    // File > Save on a new document without the API: nothing is saved and
    // the old app throws (it calls an unregistered cloud action) while
    // handling the click.
    driver: async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      let downloads = 0;
      page.on("download", () => downloads++);
      await drawSample(page);
      await clickMenu(page, ["File", "Save"]);
      await settle(page);
      return {
        errors,
        downloads,
        dialogs: await dialogClasses(page),
        documents: await documents(page),
      };
    },
  },
  {
    id: "platform/files/fsa-save",
    covers: [
      "FMT-STORAGE-002",
      "FMT-STORAGE-007",
      "FMT-STORAGE-008",
      "FMT-STORAGE-011",
      "RUN-SAVE-001",
      "RUN-SAVE-002",
      "RUN-SAVE-003",
    ],
    kind: "json",
    open: { fileSystemAccess: true },
    // With the API: Save on a new document opens the "file or cloud"
    // chooser, Save to File picks a handle and writes through it; the
    // second Ctrl+S writes to the same handle without a picker. Both
    // written files are recorded in full.
    driver: async ({ page, kind }) => {
      await installFsaStub(page);
      await reopen(page, kind, { newDocument: true, fileSystemAccess: true });
      await drawSample(page);
      const { chooser, savedAfter } = await fsaFirstSave(page);
      const first = {
        log: await fsaLog(page),
        file: await savedDocument(page, await fsaWritten(page, 0), savedAfter),
        documents: await documents(page),
      };
      await clearFsaLog(page);
      await drawSample(page);
      await page.mouse.click(900, 700);
      const secondAfter = Date.now();
      await page.keyboard.press("Control+s");
      await waitForFsaClose(page);
      await settle(page);
      return {
        chooser,
        first,
        second: {
          log: await fsaLog(page),
          file: await savedDocument(page, await fsaWritten(page, 1), secondAfter),
          documents: await documents(page),
          dialogs: await dialogClasses(page),
        },
      };
    },
  },
  {
    id: "platform/files/fsa-open",
    covers: ["FMT-STORAGE-002", "FMT-STORAGE-003", "FMT-STORAGE-005", "FMT-STORAGE-006"],
    kind: "json",
    open: { fileSystemAccess: true },
    // File > Open Local File... through showOpenFilePicker with two files.
    driver: async ({ page, kind }) => {
      await installFsaStub(page);
      await reopen(page, kind, { newDocument: true, fileSystemAccess: true });
      await drawSample(page);
      const file = (await sampleFile(page)).toString("base64");
      await page.evaluate((b64) => {
        (window as unknown as { __fsaOpen: unknown[] }).__fsaOpen = [
          { name: "first.gvdesign", base64: b64 },
          { name: "second.gvdesign", base64: b64 },
        ];
      }, file);
      await clickMenu(page, ["File", "Open Local File..."]);
      await waitForDocumentCount(page, 3);
      await waitForOpened(page, "second");
      await settle(page);
      return { log: await fsaLog(page), documents: await documents(page) };
    },
  },
  {
    id: "platform/files/input-fallback-open",
    covers: ["FMT-STORAGE-004", "FMT-STORAGE-005", "FMT-STORAGE-006"],
    kind: "json",
    // Without the API: the hidden file input, two files at once, then the
    // same file again (opened a second time: no de-duplication for local
    // files, they have no unique id).
    driver: async ({ page }) => {
      await drawSample(page);
      const dir = tempDir("open");
      const a = path.join(dir, "alpha.gvdesign");
      const b = path.join(dir, "beta.gvdesign");
      const bytes = await sampleFile(page);
      fs.writeFileSync(a, bytes);
      fs.writeFileSync(b, bytes);
      const open = async (files: string[]) => {
        const chooser = page.waitForEvent("filechooser");
        await clickMenu(page, ["File", "Open Local File..."]);
        const fc = await chooser;
        const input = await page.evaluate(() => {
          const i = document.getElementById("file-input") as HTMLInputElement | null;
          if (!i) return null;
          return {
            type: i.type,
            multiple: i.multiple,
            accept: i.getAttribute("accept"),
            inDocument: document.body.contains(i),
            position: getComputedStyle(i).position,
          };
        });
        const count = (await documents(page)).titles.length;
        await fc.setFiles(files);
        await waitForDocumentCount(page, count + files.length);
        await waitForOpened(page, path.basename(files[files.length - 1] ?? "", ".gvdesign"));
        await settle(page);
        return { isMultiple: fc.isMultiple(), input, documents: await documents(page) };
      };
      const both = await open([a, b]);
      const again = await open([a]);
      fs.rmSync(dir, { recursive: true, force: true });
      return { both, again };
    },
  },
  {
    id: "platform/files/recent-files",
    covers: ["FMT-STORAGE-013", "RUN-STORAGE-012", "UI-STORAGE-004"],
    kind: "json",
    // Opening and downloading files leaves no trace in localStorage, and
    // File > Open Recent stays empty.
    driver: async ({ page }) => {
      await waitForStartupWrites(page);
      const before = await localStorageEntries(page);
      await drawSample(page);
      const { bytes } = await downloadDocument(page);
      const dir = tempDir("recent");
      const file = path.join(dir, "recent.gvdesign");
      fs.writeFileSync(file, bytes);
      const chooser = page.waitForEvent("filechooser");
      await clickMenu(page, ["File", "Open Local File..."]);
      await (await chooser).setFiles(file);
      await waitForDocumentCount(page, 2);
      await waitForOpened(page, "recent");
      await settle(page);
      fs.rmSync(dir, { recursive: true, force: true });
      await openMenu(page, ["File", "Open Recent"]);
      const recentMenu = await openMenuItems(page);
      await closeMenus(page);
      return { changed: storageDiff(before, await localStorageEntries(page)), recentMenu };
    },
  },
  {
    id: "platform/files/save-all",
    covers: ["FMT-STORAGE-012"],
    kind: "json",
    // Save All exists as an action but is never enabled.
    driver: async ({ page }) => {
      await drawSample(page);
      return page.evaluate(() => {
        const { app } = (
          window as unknown as {
            __parity: { app: { actionIds(): string[]; canExecute(id: string): boolean } };
          }
        ).__parity;
        return {
          registered: app.actionIds().includes("file.save-all"),
          canExecute: app.canExecute("file.save-all"),
        };
      });
    },
  },
  {
    id: "platform/files/unsaved-guard",
    covers: ["FMT-STORAGE-017"],
    kind: "json",
    // Leaving the page with unsaved changes asks first (beforeunload);
    // after a save it doesn't.
    driver: async ({ page }) => {
      const seen: string[] = [];
      page.on("dialog", (d) => {
        seen.push(d.type());
        void d.dismiss();
      });
      await drawSample(page);
      // beforeunload dialogs need a user gesture on the page first.
      await page.mouse.click(900, 700);
      const modified = (await documents(page)).modified;
      const asked = page.waitForEvent("dialog");
      await page.evaluate(() => {
        location.reload();
      });
      await asked;
      await settle(page);
      const afterDismiss = { dialogs: [...seen], stillOpen: (await documents(page)).titles };
      await downloadDocument(page);
      await settle(page);
      const saved = (await documents(page)).modified;
      seen.length = 0;
      const reloaded = page.waitForEvent("load");
      await page.evaluate(() => {
        location.reload();
      });
      await reloaded;
      return { modified, afterDismiss, savedModified: saved, dialogsAfterSave: seen };
    },
  },
  {
    id: "platform/files/window-drop",
    covers: ["FMT-STORAGE-015"],
    kind: "json",
    // Dropping a .gvdesign file on the canvas does not open it as a document.
    driver: async ({ page }) => {
      await drawSample(page);
      const bytes = (await sampleFile(page)).toString("base64");
      const before = await documents(page);
      const dataTransfer = await page.evaluateHandle((b64) => {
        const dt = new DataTransfer();
        const data = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        dt.items.add(new File([data], "dropped.gvdesign", { type: "" }));
        return dt;
      }, bytes);
      const canvas = page.locator("#windows canvas").first();
      for (const type of ["dragenter", "dragover", "drop"]) {
        await canvas.dispatchEvent(type, { dataTransfer, clientX: 700, clientY: 400 });
      }
      // Nothing to wait for when nothing opens: read the dropped file once
      // more, so any read the app queued for it has finished too.
      await page.evaluate(async (dt) => {
        const file = dt.files[0];
        if (file) await file.arrayBuffer();
      }, dataTransfer);
      await settle(page);
      return { before, after: await documents(page), dialogs: await dialogClasses(page) };
    },
  },
  {
    id: "platform/files/tabs-overflow",
    covers: ["FMT-STORAGE-016", "FMT-DOCS-005"],
    kind: "json",
    // Sixteen open documents: the tabs that don't fit the header row are
    // cut off, and the "more" button lists a copy of every tab with the
    // active one marked. Picking a cut-off document there activates it and
    // moves its tab into view.
    driver: async ({ page }) => {
      await openManyDocuments(page);
      const initial = await tabsState(page);
      await openTabsList(page);
      const opened = await tabsState(page);
      await page.locator("#header .moreTab > .tab", { hasText: "Untitled-14" }).first().click();
      await page.waitForFunction(() => {
        const active = document.querySelector<HTMLElement>("#header .tabs > .tab.g-active");
        const row = document.querySelector<HTMLElement>("#header .section.windows");
        if (!active || !row) return false;
        const title = active.querySelector(".title .cover")?.textContent;
        const r = active.getBoundingClientRect();
        const box = row.getBoundingClientRect();
        return title === "Untitled-14" && r.top < box.bottom && r.right <= box.right + 1;
      });
      await settle(page);
      return {
        initial,
        opened,
        picked: { active: (await documents(page)).active, tabs: await tabsState(page) },
      };
    },
  },
  {
    id: "platform/files/tabs-overflow-list",
    covers: ["FMT-STORAGE-016"],
    kind: "png",
    // The open "more" list drawn above the toolbar and panels (32b5444).
    driver: async ({ page }) => {
      await openManyDocuments(page);
      await openTabsList(page);
      const clip = await page.evaluate(() => {
        const header = document.querySelector<HTMLElement>("#header")?.getBoundingClientRect();
        const list = document
          .querySelector<HTMLElement>("#header .moreTab")
          ?.getBoundingClientRect();
        if (!header || !list) throw new Error("no header or tab list");
        // The tabs left of the list, up to the list's right edge: the
        // account button further right belongs to the dropped cloud login.
        const x = Math.floor(list.left - 450);
        const right = Math.ceil(list.right) + 2;
        const bottom = Math.ceil(Math.max(list.bottom, header.bottom)) + 8;
        return { x, y: 0, width: right - x, height: bottom };
      });
      return page.screenshot({ clip, animations: "disabled", caret: "hide" });
    },
  },
]);

paritySuite("platform files", scenarios, { newApp: false });
