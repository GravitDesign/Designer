// The Windows Explorer thumbnail handler (native/gvthumb, GravitThumbnail.dll)
// run on files the app saves. The test tool in parity/tools/gvthumb loads
// the DLL without registering it, creates the provider through
// DllGetClassObject / IClassFactory, initializes it with an IStream over the
// file and calls IThumbnailProvider.GetThumbnail. These scenarios prove that
// files saved by the app keep working with the shipped handler: the bytes
// come from the app under test (File > Download File, a save through the
// File System Access API, and a resave of every corpus document).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { Page } from "@playwright/test";
import { NEXT_ROOT } from "../../support/env.ts";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import {
  clickMenu,
  downloadDocument,
  drawSample,
  fsaFirstSave,
  fsaWritten,
  gvthumb,
  installFsaStub,
  reopen,
} from "./lib.ts";

/** Draws the sample shapes and saves them the way a user downloads a file. */
async function savedFile(page: Page): Promise<Buffer> {
  await drawSample(page);
  return (await downloadDocument(page)).bytes;
}

function thumbnail(bytes: Buffer, size = 256): Buffer {
  const { png, result } = gvthumb(bytes, size);
  if (!png) throw new Error(`no thumbnail: ${JSON.stringify(result)}`);
  return png;
}

const COVERS = ["FMT-THUMB-001", "FMT-THUMB-002", "FMT-THUMB-004"] as const;

const CORPUS_DIR = path.join(NEXT_ROOT, "parity", "corpus", "files");
const CORPUS = fs
  .readdirSync(CORPUS_DIR)
  .filter((f) => f.endsWith(".gvdesign"))
  .sort();

/** Opens a corpus file through File > Open Local File... and waits until it is drawn. */
async function openCorpusFile(page: Page, file: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await clickMenu(page, ["File", "Open Local File..."]);
  await (await chooser).setFiles(path.join(CORPUS_DIR, file));
  await page.evaluate(
    async (title) => {
      const { app } = (
        window as unknown as {
          __parity: {
            app: {
              editor(): { clearSelection(): void };
              corpus: { waitForDocument(t: string): Promise<void>; settle(): Promise<void> };
            };
          };
        }
      ).__parity;
      await app.corpus.waitForDocument(title);
      app.editor().clearSelection();
      await app.corpus.settle();
    },
    file.replace(/\.gvdesign$/, ""),
  );
}

/** One thumbnail scenario per corpus document, resaved by the app under test. */
const corpusResaves: Scenario<string>[] = CORPUS.map((file) => ({
  id: `platform/gvthumb/corpus/${file.replace(/\.gvdesign$/, "")}`,
  covers: [...COVERS],
  kind: "png",
  args: file,
  // Effect-heavy documents take a while to open and draw under load.
  timeout: 300_000,
  // The document is opened and saved again (File > Download File), so
  // the preview inside is the one the app under test renders.
  driver: async ({ page }, name) => {
    await openCorpusFile(page, name);
    return thumbnail((await downloadDocument(page)).bytes);
  },
}));

const scenarios = defineScenarios<unknown>([
  {
    id: "platform/gvthumb/saved-file",
    covers: [...COVERS, "RUN-SAVE-006"],
    kind: "png",
    // The thumbnail Explorer would show for a file the app saved (256 px).
    driver: async ({ page }) => thumbnail(await savedFile(page)),
  },
  {
    id: "platform/gvthumb/saved-file-result",
    covers: [...COVERS],
    kind: "json",
    // HRESULT of every step, alpha type (2 = WTSAT_ARGB) and bitmap size,
    // at the default size, scaled down, and asked for more than the
    // preview has (the handler never scales up).
    driver: async ({ page }) => {
      const bytes = await savedFile(page);
      return [256, 64, 2048].map((size) => ({ size, ...gvthumb(bytes, size).result }));
    },
  },
  {
    id: "platform/gvthumb/saved-file-small",
    covers: [...COVERS],
    kind: "png",
    // Scaled with WIC's Fant interpolation to 64 px on the long side.
    driver: async ({ page }) => thumbnail(await savedFile(page), 64),
  },
  {
    id: "platform/gvthumb/fsa-saved",
    covers: [...COVERS, "FMT-STORAGE-008"],
    kind: "png",
    open: { fileSystemAccess: true },
    // The bytes the app writes through a File System Access handle (File >
    // Save > Save to File), not a download.
    driver: async ({ page, kind }) => {
      await installFsaStub(page);
      await reopen(page, kind, { newDocument: true, fileSystemAccess: true });
      await drawSample(page);
      await fsaFirstSave(page);
      return thumbnail(await fsaWritten(page, 0));
    },
  },
  {
    id: "platform/gvthumb/corpus-files",
    covers: [...COVERS],
    kind: "json",
    // One handler run (a PowerShell process) per file, about 3 s each.
    timeout: 600_000,
    // The handler on every corpus file as stored in parity/corpus/files
    // (written by the old app): HRESULTs and thumbnail size.
    driver: async () =>
      CORPUS.map((file) => ({
        file,
        ...gvthumb(fs.readFileSync(path.join(CORPUS_DIR, file))).result,
      })),
  },
  {
    id: "platform/gvthumb/broken-files",
    covers: [...COVERS],
    kind: "json",
    // Variants of the saved file the handler must refuse with E_FAIL
    // (0x80004005) from GetThumbnail: the JSON without gzip, the gzip
    // without "_preview", a truncated gzip, and a "_preview" that is no
    // data URL.
    driver: async ({ page }) => {
      const bytes = await savedFile(page);
      const json = zlib.gunzipSync(bytes).toString("utf8");
      const scene = JSON.parse(json) as Record<string, unknown>;
      const withoutPreview = { ...scene };
      delete withoutPreview._preview;
      const notDataUrl = { ...scene, _preview: "https://example.invalid/preview.jpg" };
      const cases: [string, Buffer][] = [
        ["uncompressed JSON", Buffer.from(json, "utf8")],
        ["gzip without _preview", zlib.gzipSync(JSON.stringify(withoutPreview))],
        ["truncated gzip", bytes.subarray(0, Math.floor(bytes.length / 2))],
        ["_preview not a data URL", zlib.gzipSync(JSON.stringify(notDataUrl))],
        ["empty file", Buffer.alloc(0)],
      ];
      return cases.map(([name, data]) => ({ name, ...gvthumb(data).result }));
    },
  },
  ...(corpusResaves as Scenario<unknown>[]),
]);

paritySuite("platform gvthumb", scenarios, { newApp: false });
