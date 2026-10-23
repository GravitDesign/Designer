// GBitmapExport on its own, without the editor: documents are built or
// restored with the G namespace only (io-export-pdf/doc-lib.ts), exported
// through app.bitmapExport as GExporter.exportExportable does (screen DPI,
// clamped to the canvas limit) and encoded with GBitmap.toImageBlob.
//
// - io-export-bitmap/export/<png|jpg>/<case>: the PNG and JPEG cases of
//   the export matrix (import-export/export-cases.ts): sizes, DPI specs,
//   backgrounds, JPEG qualities; the whole file.
// - io-export-bitmap/corpus/<file>: every visible page of every corpus
//   document as PNG and as JPEG with the dialog's defaults; type, size and
//   hash of each file.
//
// The same documents exported through the export dialog's code path are
// in import-export/export-engine.spec.ts and corpus-export.spec.ts, which
// need the editor.
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { EXPORT_CASES } from "../import-export/export-cases.ts";
import {
  CORPUS_FILES,
  IMAGES,
  PDF_USER,
  corpusJson,
  runCase,
  type CaseArgs,
} from "../io-export-pdf/cases.ts";
import { inPageWithDocLib } from "../io-export-pdf/doc-lib.ts";

interface CorpusArgs {
  json: string;
}

/** Every visible page of a corpus document as PNG and as JPEG. */
const exportCorpus = inPageWithDocLib(async (_p, a: CorpusArgs, L) => {
  const workspace = await L.newWorkspace();
  const scene = await L.loadScene(a.json, workspace);
  await L.settle(scene);
  const out: Record<string, unknown>[] = [];
  for (const page of L.visiblePages(scene)) {
    for (const format of ["png", "jpg"]) {
      const label = String(page.getProperty("name"));
      try {
        const r = await L.exportBitmap(L.dialogDefaults(format, page));
        out.push({
          page: label,
          format,
          mime: r.mime,
          size: r.bytes.length,
          sha256: await L.sha256(r.bytes),
        });
      } catch (e) {
        out.push({ page: label, format, error: String((e as Error).message) });
      }
    }
  }
  return out;
});

const caseScenarios = EXPORT_CASES.filter((c) => c.format === "png" || c.format === "jpg").map(
  (c): Scenario<CaseArgs> => ({
    id: `io-export-bitmap/export/${c.id}`,
    covers: c.covers,
    kind: "bytes",
    extension: c.format === "png" ? ".png" : ".jpg",
    timeout: 300_000,
    inPage: runCase,
    args: { c, ...IMAGES, user: PDF_USER },
  }),
);

const corpusScenarios = CORPUS_FILES.map((file): Scenario<CorpusArgs> => ({
  id: `io-export-bitmap/corpus/${file.replace(/\.gvdesign$/, "")}`,
  covers: ["FMT-EXPORT-002", "FMT-EXPORT-004", "FMT-EXPORT-005", "FMT-EXPORT-046"],
  kind: "json",
  timeout: 600_000,
  // WebGL effects came out differently depending on what ran before in
  // the same browser (shared GPU-process state).
  freshBrowser: /^effects-/.test(file),
  inPage: exportCorpus,
  args: { json: corpusJson(file) },
}));

paritySuite(
  "io-export-bitmap",
  defineScenarios<unknown>([
    ...(caseScenarios as Scenario<unknown>[]),
    ...(corpusScenarios as Scenario<unknown>[]),
  ]),
  { newApp: false },
);
