// Auto-save with a local document. The old auto-save only uploads to the
// cloud: for a document without a cloud id it shows the "save to Gravit
// Designer to enable Auto-save" dialog when the interval is up (or, with
// auto-save off, offers to turn it on), and stores nothing locally. Both
// prompts belong to the dropped cloud flow (removedInNewApp). What the
// rewrite keeps is that there is no local recovery either (QUESTIONS
// Q-010): no-local-recovery records that a reload brings nothing back.
//
// Playwright's fake clock moves time forward; it is installed before the
// document is created, so that document's auto-save timer runs on it.
import type { Page } from "@playwright/test";
import { openApp, type AppKind } from "../../support/apps.ts";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import {
  documents,
  indexedDbSummary,
  localStorageEntries,
  settle,
  storageDiff,
  visibleDialogs,
  waitForStartupWrites,
} from "./lib.ts";

/** A new modified document whose auto-save timer runs on the fake clock. */
async function modifiedDocumentOnFakeClock(page: Page): Promise<void> {
  await page.clock.install();
  await page.evaluate(() => {
    const { G, app } = (window as unknown as { __parity: ParityLike }).__parity;
    interface ParityLike {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      G: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      app: any;
    }
    app.newInfiniteDocument();
    const r = new G.GRectangle();
    r.setProperty("trf", new G.GTransform(100, 0, 0, 60, 200, 160));
    app.editor().insertElements([r]);
  });
  await settle(page);
}

/** New modified document on the fake clock, then the clock moves 4 and 6 minutes on. */
async function runClock(page: Page): Promise<unknown> {
  await waitForStartupWrites(page);
  const before = await localStorageEntries(page);
  let downloads = 0;
  page.on("download", () => downloads++);
  await modifiedDocumentOnFakeClock(page);
  await page.clock.fastForward("04:00");
  await settle(page);
  const after4 = await visibleDialogs(page);
  await page.clock.fastForward("02:00");
  await settle(page);
  return {
    dialogsAfter4Minutes: after4,
    dialogsAfter6Minutes: await visibleDialogs(page),
    storageChanged: storageDiff(before, await localStorageEntries(page)),
    indexedDB: await indexedDbSummary(page),
    downloads,
  };
}

/** The new app must not show either cloud auto-save prompt. */
async function assertNoCloudPrompt(page: Page): Promise<void> {
  await waitForStartupWrites(page);
  await modifiedDocumentOnFakeClock(page);
  await page.clock.fastForward("06:00");
  await settle(page);
  const prompts = (await visibleDialogs(page)).filter(
    (d) => /auto-save/.test(d.className) || d.text.some((t) => /auto-?save|cloud/i.test(t)),
  );
  if (prompts.length > 0) {
    throw new Error(`cloud auto-save prompt shown: ${JSON.stringify(prompts)}`);
  }
}

async function reload(page: Page, kind: AppKind): Promise<void> {
  // A modified document asks before the page unloads; leave anyway.
  page.on("dialog", (d) => void d.accept());
  await openApp(page, kind, { newDocument: false });
  await waitForStartupWrites(page);
  await settle(page);
}

const scenarios = defineScenarios([
  {
    id: "platform/autosave/enabled-local-document",
    covers: ["FMT-AUTOSAVE-001", "FMT-AUTOSAVE-003", "FMT-AUTOSAVE-004"],
    kind: "json",
    open: { settings: { auto_save: true, auto_save_interval: 5 } },
    driver: async ({ page }) => runClock(page),
    removedInNewApp: async ({ page }) => assertNoCloudPrompt(page),
  },
  {
    id: "platform/autosave/disabled-by-default",
    covers: ["FMT-AUTOSAVE-003"],
    kind: "json",
    // The app default is auto_save false: after the default 5 minutes the
    // app asks whether to enable auto-save, and still stores nothing.
    driver: async ({ page }) => runClock(page),
    removedInNewApp: async ({ page }) => assertNoCloudPrompt(page),
  },
  {
    id: "platform/autosave/no-local-recovery",
    covers: ["FMT-AUTOSAVE-002", "FMT-AUTOSAVE-005"],
    kind: "json",
    open: { settings: { auto_save: true, auto_save_interval: 5 } },
    // Auto-save on, a modified document, ten minutes pass, then the page is
    // reloaded: nothing is recovered and nothing was stored for it.
    driver: async ({ page, kind }) => {
      await waitForStartupWrites(page);
      const before = await localStorageEntries(page);
      await modifiedDocumentOnFakeClock(page);
      await page.clock.fastForward("10:00");
      await settle(page);
      await reload(page, kind);
      return {
        documents: (await documents(page)).titles,
        welcomeShown: await page.locator(".g-new-document-dialog-container.visible").count(),
        dialogs: (await visibleDialogs(page)).map((d) => d.className).sort(),
        storageChanged: storageDiff(before, await localStorageEntries(page)),
        indexedDB: await indexedDbSummary(page),
        caches: await page.evaluate(async () => (await caches.keys()).sort()),
      };
    },
  },
]);

paritySuite("platform autosave", scenarios, { newApp: false });
