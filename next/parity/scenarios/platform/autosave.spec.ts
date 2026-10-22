// Auto-save with a local document. The old auto-save only uploads to the
// cloud: for a document without a cloud id it shows the "save to Gravit
// Designer to enable Auto-save" dialog when the interval is up, and stores
// nothing locally (no crash recovery). Playwright's fake clock moves time
// forward; it is installed before the document is created, so that
// document's auto-save timer runs on it.
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import {
  indexedDbSummary,
  localStorageEntries,
  settle,
  storageDiff,
  waitForStartupWrites,
} from "./lib.ts";

async function visibleDialogs(page: Page): Promise<{ className: string; text: string[] }[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".g-dialog")]
      .filter((d) => d.offsetParent !== null)
      .map((d) => ({
        className: d.className,
        text: d.innerText.split(/\s*\n\s*/).filter(Boolean),
      })),
  );
}

/** New modified document on the fake clock, then the clock moves 4 and 6 minutes on. */
async function runClock(page: Page): Promise<unknown> {
  await waitForStartupWrites(page);
  const before = await localStorageEntries(page);
  let downloads = 0;
  page.on("download", () => downloads++);
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
  await settle(page, 300);
  await page.clock.fastForward("04:00");
  await settle(page, 1000);
  const after4 = await visibleDialogs(page);
  await page.clock.fastForward("02:00");
  await settle(page, 1000);
  return {
    dialogsAfter4Minutes: after4,
    dialogsAfter6Minutes: await visibleDialogs(page),
    storageChanged: storageDiff(before, await localStorageEntries(page)),
    indexedDB: await indexedDbSummary(page),
    downloads,
  };
}

const scenarios = defineScenarios([
  {
    id: "platform/autosave/enabled-local-document",
    covers: ["FMT-AUTOSAVE-001", "FMT-AUTOSAVE-002", "FMT-AUTOSAVE-003", "FMT-AUTOSAVE-005"],
    kind: "json",
    open: { settings: { auto_save: true, auto_save_interval: 5 } },
    driver: async ({ page }) => runClock(page),
  },
  {
    id: "platform/autosave/disabled-by-default",
    covers: ["FMT-AUTOSAVE-002", "FMT-AUTOSAVE-003"],
    kind: "json",
    // The app default is auto_save false: after the default 5 minutes the
    // app asks whether to enable auto-save, and still stores nothing.
    driver: async ({ page }) => runClock(page),
  },
]);

paritySuite("platform autosave", scenarios, { newApp: false });
