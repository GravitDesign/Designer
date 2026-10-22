// Files saved by the app must open the same in the old app (R2-150).
//
// For every corpus file, "compat/<name>/roundtrip" opens the file, saves
// it through the app's real save (corpus hook saveDocumentBytes), opens
// those bytes again through the real open path (openDocumentBytes) and
// records the serialized result. Recorded from the old app, that is the
// old app's own round trip; run against the new app (once ported), the
// new app's.
//
// The cross-app test below goes one step further for every ported
// roundtrip scenario: the NEW app opens the corpus file and saves it, and
// the OLD app opens the bytes the new app wrote. The old app's serialized
// scene must equal the same expected output. That is what proves a file
// written by the new app opens unchanged in the old one. It is defined
// only for scenario ids listed in parity/ported/*.json, so it does not run
// until the new app can save.
import { test, expect, type Browser, type Page } from "@playwright/test";
import { PARITY_CONTEXT, isolateNetwork, openApp, type AppKind } from "../../support/apps.ts";
import { RECORDING } from "../../support/env.ts";
import { assertSameOutput, readExpected, storeOutput } from "../../support/runner.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { paritySuite, portedScenarioIds } from "../../support/suite.ts";
import { corpusNames } from "../corpus/corpus-scenarios.ts";
import {
  CORPUS_DIR,
  corpusFile,
  openFile,
  renameDeepIds,
  serializeActive,
  type ParityPage,
} from "../corpus/lib.ts";

/** Saves the active document with the app's own save code; base64 bytes. */
async function saveBytes(page: Page): Promise<string> {
  return page.evaluate(() =>
    (window as unknown as ParityPage).__parity.app.corpus.saveDocumentBytes(),
  );
}

/** Closes the active document (File > Close) and waits until it is gone. */
async function closeActive(page: Page, title: string): Promise<void> {
  await page.evaluate(async (t) => {
    const app = (window as unknown as ParityPage).__parity.app;
    app.execute("file.close-active-window");
    while (app.corpus.documentStates().some((d) => d.title === t)) {
      await new Promise((r) => requestAnimationFrame(r));
    }
  }, title);
}

/** Opens saved bytes through the app's own open path and serializes them. */
async function reopen(page: Page, bytes: string, name: string): Promise<string> {
  await page.evaluate(
    async ({ b, n }) => {
      const app = (window as unknown as ParityPage).__parity.app;
      await app.corpus.openDocumentBytes(b, n);
      app.editor().clearSelection();
      await app.corpus.settle();
    },
    { b: bytes, n: `${name}-saved.gvdesign` },
  );
  return renameDeepIds(await serializeActive(page), `${CORPUS_DIR}/${name}.gvdesign`);
}

const scenarios: Scenario[] = corpusNames.map((name) => ({
  id: `compat/${name}/roundtrip`,
  covers: [
    "FMT-GVD-001",
    "FMT-GVD-002",
    "FMT-GVD-003",
    "FMT-GVD-005",
    "FMT-GVD-006",
    "ACT-FILE-004",
    "ACT-FILE-008",
  ],
  kind: "document",
  // Two loads and a save, slow under parallel load.
  timeout: 300_000,
  keepIdsOf: `${CORPUS_DIR}/${name}.gvdesign`,
  driver: async ({ page }) => {
    await openFile(page, corpusFile(name));
    const bytes = await saveBytes(page);
    // Close the original first: a second document with the same reference
    // ids gets new ones, and the cross-app test opens the bytes in a page
    // where nothing else is open.
    await closeActive(page, name);
    return reopen(page, bytes, name);
  },
}));

paritySuite("compat round trip", defineScenarios(scenarios), { newApp: false });

async function appPage(browser: Browser, kind: AppKind): Promise<Page> {
  const context = await browser.newContext({
    ...PARITY_CONTEXT,
    viewport: { width: 1600, height: 1000 },
    acceptDownloads: true,
  });
  await isolateNetwork(context);
  const page = await context.newPage();
  await openApp(page, kind, { newDocument: true });
  return page;
}

// GD_COMPAT_SAVER=old lets the old app play the saving side, for every
// scenario: that checks this cross-app path itself before the new app
// exists (old saves, a second old page opens, same expected output).
const saver: AppKind = process.env.GD_COMPAT_SAVER === "old" ? "old" : "new";
const ported = portedScenarioIds();
const crossApp = RECORDING ? [] : scenarios.filter((s) => saver === "old" || ported.has(s.id));
if (crossApp.length > 0) {
  test.describe(`compat ${saver} app saves, old app opens`, () => {
    for (const scenario of crossApp) {
      const name = scenario.id.split("/")[1] ?? "";
      test(scenario.id, async ({ browser }) => {
        test.setTimeout(300_000);
        const newPage = await appPage(browser, saver);
        const oldPage = await appPage(browser, "old");
        try {
          await openFile(newPage, corpusFile(name));
          const bytes = await saveBytes(newPage);
          const actual = storeOutput(scenario, await reopen(oldPage, bytes, name));
          const expected = readExpected(scenario);
          expect(expected, `no expected output recorded for ${scenario.id}`).toBeDefined();
          if (expected) assertSameOutput(scenario, expected, actual, `${saver}-saved-old-opened`);
        } finally {
          await newPage.context().close();
          await oldPage.context().close();
        }
      });
    }
  });
}
