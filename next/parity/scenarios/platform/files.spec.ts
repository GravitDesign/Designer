// The local file storage layer (GBrowserFileStorage): opening through the
// File System Access API or the hidden file input, saving through a file
// handle or a download, and what is (not) remembered afterwards. The File
// System Access API is stubbed in the page so the calls the app makes can
// be recorded; the fallbacks run on Playwright's file chooser and download
// events.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import {
  clickMenu,
  downloadDocument,
  drawSample,
  localStorageEntries,
  reopen,
  settle,
  storageDiff,
  tempDir,
  waitForStartupWrites,
} from "./lib.ts";

interface DocState {
  titles: string[];
  active: string | null;
  modified: boolean | null;
  nodes: string[];
}

/** Open documents, the active one, its modified flag and its page content. */
async function documents(page: Page): Promise<DocState> {
  return page.evaluate(() => {
    const { app } = (window as unknown as { __parity: { app: ParityApp } }).__parity;
    interface Node {
      getNodeName(): string;
      getFirstChild(): Node | null;
      getNext(): Node | null;
    }
    interface ParityApp {
      designer: { getDocuments(): { getTitle(): string }[] };
      document(): { getTitle(): string; isModified(): boolean } | null;
      scene(): { getActivePage(): Node };
    }
    const doc = app.document();
    const nodes: string[] = [];
    if (doc) {
      for (let n = app.scene().getActivePage().getFirstChild(); n; n = n.getNext())
        nodes.push(n.getNodeName());
    }
    return {
      titles: app.designer.getDocuments().map((d) => d.getTitle()),
      active: doc ? doc.getTitle() : null,
      modified: doc ? doc.isModified() : null,
      nodes,
    };
  });
}

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
async function dialogs(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".g-dialog")]
      .filter((d) => d.offsetParent !== null)
      .map((d) => d.className)
      .sort(),
  );
}

/**
 * Installs stand-ins for showSaveFilePicker / showOpenFilePicker that log
 * every call (options, permission requests, writes) to window.__fsaLog.
 * Files to open are read from window.__fsaOpen as base64.
 */
async function installFsaStub(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __fsaLog: unknown[];
      __fsaOpen: { name: string; base64: string }[];
      showSaveFilePicker: unknown;
      showOpenFilePicker: unknown;
    };
    w.__fsaLog = [];
    w.__fsaOpen = [];
    const log = (entry: unknown) => w.__fsaLog.push(JSON.parse(JSON.stringify(entry)) as unknown);
    const describe = async (data: unknown): Promise<unknown> => {
      const blob = data instanceof Blob ? data : new Blob([data as BlobPart]);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      return {
        kind: data instanceof Blob ? "Blob" : Object.prototype.toString.call(data),
        type: data instanceof Blob ? data.type : null,
        // The exact size depends on the save time stamp (lmd) inside the
        // gzip stream, so only "something was written" is recorded.
        nonEmpty: bytes.length > 0,
        head: [...bytes.slice(0, 3)].map((b) => b.toString(16).padStart(2, "0")).join(""),
      };
    };
    const handle = (name: string, file: File | null) => ({
      kind: "file",
      name,
      getFile: async () => {
        log({ call: "getFile", name });
        return file ?? new File([], name);
      },
      queryPermission: async (o: unknown) => {
        log({ call: "queryPermission", name, options: o ?? null });
        return "granted";
      },
      requestPermission: async (o: unknown) => {
        log({ call: "requestPermission", name, options: o ?? null });
        return "granted";
      },
      createWritable: async (o: unknown) => {
        log({ call: "createWritable", name, options: o ?? null });
        return {
          truncate: async (n: number) => log({ call: "truncate", name, size: n }),
          seek: async (n: number) => log({ call: "seek", name, position: n }),
          write: async (d: unknown) => log({ call: "write", name, data: await describe(d) }),
          close: async () => log({ call: "close", name }),
        };
      },
      isSameEntry: async () => false,
    });
    w.showSaveFilePicker = async (options: unknown) => {
      log({ call: "showSaveFilePicker", options: options ?? null });
      const suggested =
        (options as { suggestedName?: string } | undefined)?.suggestedName ?? "file";
      return handle(suggested, null);
    };
    w.showOpenFilePicker = async (options: unknown) => {
      log({ call: "showOpenFilePicker", options: options ?? null });
      return w.__fsaOpen.map((f) =>
        handle(f.name, new File([Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0))], f.name)),
      );
    };
  });
}

async function fsaLog(page: Page): Promise<unknown[]> {
  return page.evaluate(() => (window as unknown as { __fsaLog: unknown[] }).__fsaLog);
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
    // through a Blob download and clears the modified flag.
    driver: async ({ page }) => {
      await drawSample(page);
      const before = await documents(page);
      const { name, bytes } = await downloadDocument(page);
      await settle(page);
      const scene = JSON.parse(zlib.gunzipSync(bytes).toString("utf8")) as Record<string, unknown>;
      return {
        before,
        suggestedFilename: name,
        head: bytes.subarray(0, 3).toString("hex"),
        keys: Object.keys(scene).sort(),
        preview: String(scene._preview).slice(0, 23),
        after: await documents(page),
        tabs: await page.locator("#header .tabs .tab .title .cover").allTextContents(),
      };
    },
  },
  {
    id: "platform/files/save-new-without-fsa",
    covers: ["FMT-STORAGE-011", "RUN-SAVE-004"],
    kind: "json",
    // File > Save on a new document without the API: nothing is saved and
    // the old app throws (it calls an unregistered cloud action).
    driver: async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      let downloads = 0;
      page.on("download", () => downloads++);
      await drawSample(page);
      await clickMenu(page, ["File", "Save"]);
      await page.waitForTimeout(2000);
      return { errors, downloads, dialogs: await dialogs(page), documents: await documents(page) };
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
    // second Ctrl+S writes to the same handle without a picker.
    driver: async ({ page, kind }) => {
      await installFsaStub(page);
      await reopen(page, kind, { newDocument: true, fileSystemAccess: true });
      await drawSample(page);
      await clickMenu(page, ["File", "Save"]);
      await page.waitForTimeout(800);
      const chooser = await dialogs(page);
      await page.locator(".g-save-chooser-dialog").getByText("Save to File").first().click();
      await page.waitForFunction(() =>
        (window as unknown as { __fsaLog: { call: string }[] }).__fsaLog.some(
          (e) => e.call === "close",
        ),
      );
      await settle(page);
      const first = { log: await fsaLog(page), documents: await documents(page) };
      await page.evaluate(() => {
        (window as unknown as { __fsaLog: unknown[] }).__fsaLog.length = 0;
      });
      await drawSample(page);
      await page.mouse.click(900, 700);
      await page.keyboard.press("Control+s");
      await page.waitForFunction(() =>
        (window as unknown as { __fsaLog: { call: string }[] }).__fsaLog.some(
          (e) => e.call === "close",
        ),
      );
      await settle(page);
      return {
        chooser,
        first,
        second: {
          log: await fsaLog(page),
          documents: await documents(page),
          dialogs: await dialogs(page),
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
      await page.waitForFunction(
        () =>
          (
            window as unknown as { gDesigner: { getDocuments(): unknown[] } }
          ).gDesigner.getDocuments().length >= 3,
        null,
        { timeout: 20_000 },
      );
      await settle(page, 500);
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
        await page.waitForFunction(
          (n) =>
            (
              window as unknown as { gDesigner: { getDocuments(): unknown[] } }
            ).gDesigner.getDocuments().length >= n,
          count + files.length,
          { timeout: 20_000 },
        );
        await settle(page, 500);
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
      await page.waitForFunction(
        () =>
          (
            window as unknown as { gDesigner: { getDocuments(): unknown[] } }
          ).gDesigner.getDocuments().length >= 2,
      );
      await settle(page, 500);
      fs.rmSync(dir, { recursive: true, force: true });
      await clickMenu(page, ["File"]);
      await page
        .locator("ul.g-menu:not(.g-menu-root) > li.g-menu-item:visible", {
          has: page.locator(':scope > .g-menu-item-caption:text-is("Open Recent")'),
        })
        .last()
        .hover();
      await page.waitForTimeout(400);
      const recentMenu = await page.evaluate(() => {
        const menus = [
          ...document.querySelectorAll<HTMLElement>("ul.g-menu:not(.g-menu-root)"),
        ].filter((m) => m.offsetParent !== null);
        const last = menus[menus.length - 1];
        return last
          ? [...last.querySelectorAll<HTMLElement>(":scope > li.g-menu-item")].map((li) => ({
              caption: li.querySelector(":scope > .g-menu-item-caption")?.textContent ?? null,
              disabled: li.classList.contains("g-disabled"),
            }))
          : [];
      });
      await page.keyboard.press("Escape");
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
      await page.evaluate(() => {
        location.reload();
      });
      await page.waitForTimeout(1500);
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
      await page.waitForTimeout(2000);
      return { before, after: await documents(page), dialogs: await dialogs(page) };
    },
  },
]);

paritySuite("platform files", scenarios, { newApp: false });
