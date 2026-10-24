// Swatch files (UI-SWATCH-006): the pattern chooser's Import Swatches and
// Export Swatches buttons, for the document and the global swatches. A
// .gvswatch file is a gzipped serialized GSwatches node. Exports are
// recorded as the gzip header fields, whether the deflate body is exactly
// what pako gives at level 9 (the level the old exportSwatches passes to
// pako.gzip), and the unzipped content (ids renamed by the shared
// normalizer); imports as the swatches the document or the chooser holds
// afterwards.
import zlib from "node:zlib";
import type { Page } from "@playwright/test";
import pako from "pako";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import { captureDownload, chooseFiles, fixtureFile, runInPage } from "./node-lib.ts";
import { inPageWithLib } from "./page-lib.ts";

const FIXTURE = "swatches/three.gvswatch";

/** The shapes document with two document swatches; the box is selected. */
const setup = inPageWithLib(async (_p, _a: unknown, L) => {
  const { G } = L;
  L.app.document().setTitle("Swatch Doc");
  const built = await L.build("shapes");
  const swatches = L.app.scene().getSwatches();
  // Enough swatches (600) that the deflate levels give different bytes,
  // so matching pako's level 9 output says the app compressed at level 9.
  const patterns = [
    "C#[10,20,30]",
    'L#{"fx":0,"x":[{"p":0,"c":"C#[255,0,0]","o":1},{"p":1,"c":"C#[0,0,255]","o":1}]}',
  ];
  for (let i = 2; i < 600; i++) {
    patterns.push(
      i % 3
        ? `C#[${(i * 37) % 256},${(i * 91) % 256},${(i * 53) % 256}]`
        : `L#{"fx":0,"x":[{"p":0,"c":"C#[${i % 256},0,0]","o":1},{"p":1,"c":"C#[0,0,${(i * 7) % 256}]","o":1}]}`,
    );
  }
  for (const pt of patterns) swatches.appendChild(new G.GSwatch(G.GPattern.deserialize(pt)));
  L.app.editor().updateSelection(false, [built.box]);
  return null;
});

/** Opens the box's fill pattern chooser on its Swatches tab. */
async function openSwatches(page: Page): Promise<void> {
  await runInPage(page, setup, {});
  await page
    .locator(".sidebar-inspector .fill-block .g-pattern-chooser .preview")
    .first()
    .click({ position: { x: 3, y: 3 } });
  await page.locator(".g-overlay button", { hasText: "SWATCHES" }).click();
  await page.locator(".swatches-palette .toolbar.document").waitFor({ state: "visible" });
}

/** The swatches a scope's section shows: how many, and the first 8 CSS backgrounds. */
async function shown(
  page: Page,
  scope: "global" | "document",
): Promise<{ count: number; first: string[] }> {
  const all = await page.evaluate(
    (s) =>
      [...document.querySelectorAll(`.swatches-palette .swatches-wrapper.${s} .swatch`)]
        .filter((e) => (e as HTMLElement).offsetParent !== null)
        .map((e) => (e as HTMLElement).style.background),
    scope,
  );
  return { count: all.length, first: all.slice(0, 8) };
}

/** Export Swatches for a scope: the file as JSON text with its content parsed. */
async function exportSwatches(page: Page, scope: "global" | "document"): Promise<unknown> {
  const d = await captureDownload(page, () =>
    page.locator(`.swatches-palette .toolbar.${scope} .gravit-icon-swatches-export`).click(),
  );
  const raw = zlib.gunzipSync(d.data);
  const gz = d.data;
  const flags = gz[3] ?? 0;
  // No optional header fields, so the body starts at byte 10; the trailer
  // is CRC32 + size (8 bytes).
  const body = gz.subarray(10, gz.length - 8);
  return {
    name: d.name,
    header: {
      magic: gz.subarray(0, 2).toString("hex"),
      method: gz[2],
      flags,
      mtime: gz.readUInt32LE(4),
      extraFlags: gz[8],
      os: gz[9],
    },
    // The exact deflate stream, compared to pako at the old app's level.
    // Not the set of levels that reproduce it: the content holds a fresh
    // random id (the exported GSwatches node's), and which of levels 4-9
    // happen to give identical bytes for it changes from run to run.
    deflateIsPakoLevel9:
      flags === 0 && Buffer.from(pako.deflateRaw(raw, { level: 9 })).equals(body),
    content: JSON.parse(raw.toString("utf8")) as unknown,
  };
}

/** Import Swatches for a scope with the fixture file; waits until the section changed. */
async function importSwatches(page: Page, scope: "global" | "document"): Promise<unknown> {
  const before = (await shown(page, scope)).count;
  const chooser = await chooseFiles(
    page,
    () => page.locator(`.swatches-palette .toolbar.${scope} .gravit-icon-swatches-import`).click(),
    [fixtureFile(FIXTURE)],
  );
  await page.waitForFunction(
    ({ s, n }) =>
      [...document.querySelectorAll(`.swatches-palette .swatches-wrapper.${s} .swatch`)].filter(
        (e) => (e as HTMLElement).offsetParent !== null,
      ).length !== n,
    { s: scope, n: before },
  );
  return chooser;
}

const documentSwatches = inPageWithLib((_p, _a: unknown, L) =>
  JSON.parse(L.G.GNode.serialize(L.app.scene().getSwatches())),
);

const scenarios = defineScenarios<unknown>([
  {
    id: "import-export/swatches/export-document",
    covers: ["UI-SWATCH-006"],
    kind: "document",
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await openSwatches(page);
      return JSON.stringify({
        shown: await shown(page, "document"),
        file: await exportSwatches(page, "document"),
      });
    },
  },
  {
    id: "import-export/swatches/import-document",
    covers: ["UI-SWATCH-006"],
    kind: "document",
    keepIdsOf: `parity/fixtures/import/${FIXTURE}`,
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await openSwatches(page);
      const chooser = await importSwatches(page, "document");
      return JSON.stringify({
        chooser,
        shown: await shown(page, "document"),
        scene: await runInPage(page, documentSwatches, {}),
      });
    },
  },
  {
    id: "import-export/swatches/global-import-export",
    covers: ["UI-SWATCH-006"],
    kind: "document",
    keepIdsOf: `parity/fixtures/import/${FIXTURE}`,
    driver: async ({ page }) => {
      page.setDefaultTimeout(15_000);
      await openSwatches(page);
      const before = await shown(page, "global");
      const chooser = await importSwatches(page, "global");
      return JSON.stringify({
        before,
        chooser,
        shown: await shown(page, "global"),
        file: await exportSwatches(page, "global"),
      });
    },
  },
]);

paritySuite("import-export swatches", scenarios, { newApp: false });
