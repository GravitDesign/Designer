// Files with edge cases (parity/corpus/edge/README.md): what the old app
// makes of a plain-JSON file, a file without preview, an unknown node type,
// a pre-3.10 file, an image linked to a local file, a minimal file and a
// file whose JSON is cut off.
import path from "node:path";
import type { Page } from "@playwright/test";
import { NEXT_ROOT } from "../../support/env.ts";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { pageBitmaps, savedFile } from "./corpus-scenarios.ts";
import type { CorpusHooks } from "./contract.ts";
import { EDGE_DIR, openFile, renameDeepIds, serializeActive } from "./lib.ts";

const edgeFile = (name: string) => `${EDGE_DIR}/files/${name}.gvdesign`;
const abs = (name: string) => path.join(NEXT_ROOT, edgeFile(name));

interface Edge {
  name: string;
  covers: string[];
  /** Also save it again and record the saved file. */
  resave?: boolean;
  /** Also record the page bitmaps. */
  bitmap?: boolean;
}

const EDGES: Edge[] = [
  { name: "uncompressed", covers: ["FMT-GVD-003"], resave: true },
  { name: "no-preview", covers: ["FMT-PREVIEW-001", "FMT-GVD-003"], resave: true },
  { name: "unknown-type", covers: ["FMT-GVD-006", "FMT-GVD-007"], resave: true },
  { name: "legacy-pre310", covers: ["FMT-GVD-009"], resave: true, bitmap: true },
  {
    name: "linked-file",
    covers: ["FMT-GVD-010", "FMT-GVD-011"],
    resave: true,
    bitmap: true,
  },
  { name: "tiny", covers: ["FMT-GVD-008", "FMT-GVD-013"], resave: true },
];

const scenarios: Scenario[] = EDGES.flatMap((e): Scenario[] => [
  {
    id: `corpus/edge/${e.name}/document`,
    covers: e.covers,
    kind: "document",
    keepIdsOf: edgeFile(e.name),
    dropKeys: ["_preview"],
    driver: async ({ page }) => {
      await openFile(page, abs(e.name));
      return renameDeepIds(await serializeActive(page), edgeFile(e.name));
    },
  },
  ...(e.resave
    ? [
        {
          id: `corpus/edge/${e.name}/resave`,
          covers: [...e.covers, "FMT-GVD-001", "FMT-GVD-002", "FMT-PREVIEW-001"],
          kind: "document" as const,
          keepIdsOf: edgeFile(e.name),
          driver: async ({ page }: { page: Page }) => {
            await openFile(page, abs(e.name));
            return renameDeepIds(await savedFile(page), edgeFile(e.name));
          },
        },
      ]
    : []),
  ...(e.bitmap
    ? [
        {
          id: `corpus/edge/${e.name}/bitmap`,
          covers: [...e.covers, "EDT-RENDER-014"],
          kind: "png" as const,
          driver: async ({ page }: { page: Page }) => {
            await openFile(page, abs(e.name));
            return pageBitmaps(page);
          },
        },
      ]
    : []),
]);

// A file whose JSON is cut off: deserializing fails, and the old app
// leaves the document in its Loading state without a scene or a message.
scenarios.push({
  id: "corpus/edge/invalid-json/state",
  covers: ["FMT-GVD-003", "FMT-GVD-006"],
  kind: "json",
  driver: async ({ page }) => {
    const chooser = page.waitForEvent("filechooser");
    await page.evaluate(() =>
      (
        window as unknown as { __parity: { app: { execute(id: string): void } } }
      ).__parity.app.execute("file.open"),
    );
    await (await chooser).setFiles(abs("invalid-json"));
    return page.evaluate(async () => {
      const { app } = (window as unknown as { __parity: { app: { corpus: CorpusHooks } } })
        .__parity;
      const titles = () => app.corpus.documentStates().map((d) => d.title);
      while (!titles().includes("invalid-json")) {
        await new Promise((r) => requestAnimationFrame(r));
      }
      // Loading runs in time slices; 60 frames is far past the last one.
      for (let i = 0; i < 60; i++) await new Promise((r) => requestAnimationFrame(r));
      return app.corpus.documentStates();
    });
  },
});

paritySuite("corpus edge files", defineScenarios(scenarios), { newApp: false });
