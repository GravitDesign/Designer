// The Windows Explorer thumbnail handler (native/gvthumb, GravitThumbnail.dll)
// run on files the app saves. The test tool in parity/tools/gvthumb loads
// the DLL without registering it, creates the provider through
// DllGetClassObject / IClassFactory, initializes it with an IStream over the
// file and calls IThumbnailProvider.GetThumbnail. These scenarios prove that
// files saved by the app keep working with the shipped handler: the bytes
// come from File > Download File in the app under test.
import zlib from "node:zlib";
import type { Page } from "@playwright/test";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import { downloadDocument, drawSample, gvthumb } from "./lib.ts";

/** Draws the sample shapes and saves them the way a user downloads a file. */
async function savedFile(page: Page): Promise<Buffer> {
  await drawSample(page);
  return (await downloadDocument(page)).bytes;
}

const COVERS = ["FMT-THUMB-001", "FMT-THUMB-002", "FMT-THUMB-004"] as const;

const scenarios = defineScenarios([
  {
    id: "platform/gvthumb/saved-file",
    covers: [...COVERS, "RUN-SAVE-006"],
    kind: "png",
    // The thumbnail Explorer would show for a file the app saved (256 px).
    driver: async ({ page }) => {
      const { png, result } = gvthumb(await savedFile(page), 256);
      if (!png) throw new Error(`no thumbnail: ${JSON.stringify(result)}`);
      return png;
    },
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
    driver: async ({ page }) => {
      const { png, result } = gvthumb(await savedFile(page), 64);
      if (!png) throw new Error(`no thumbnail: ${JSON.stringify(result)}`);
      return png;
    },
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
]);

paritySuite("platform gvthumb", scenarios, { newApp: false });
