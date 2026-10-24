/* eslint-disable @typescript-eslint/no-explicit-any -- in-page code drives the untyped engine through the G namespace */
// GPDFExport on its own, without the editor: documents are built or
// restored with the G namespace only (doc-lib.ts) and exported through
// app.pdfExport with the option object GExporter.exportExportable builds.
//
// - io-export-pdf/export/<case>: the PDF cases of the export matrix
//   (import-export/export-cases.ts) plus documents for the exporter's
//   vector shadows, inner shadows on images and text decorations; the
//   whole file with the dates normalized (pdf-normalize.ts).
// - io-export-pdf/corpus/<file>: every corpus document, each visible page
//   at 72 dpi and, with several pages, all pages merged into one file as
//   the export dialog does; sizes and hashes of the normalized files.
//
// The same documents exported through the export dialog's code path are
// in import-export/export-engine.spec.ts and corpus-export.spec.ts, which
// need the editor.
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import {
  CORPUS_FILES,
  IMAGES,
  PDF_CASES,
  PDF_COVERS,
  PDF_USER,
  corpusJson,
  runCase,
  type CaseArgs,
} from "./cases.ts";
import { inPageWithDocLib } from "./doc-lib.ts";

interface CorpusArgs {
  json: string;
  title: string;
  user: string;
}

/** Every visible page of a corpus document as PDF, then all pages merged. */
const exportCorpus = inPageWithDocLib(async (_p, a: CorpusArgs, L) => {
  const workspace = await L.newWorkspace();
  const scene = await L.loadScene(a.json, workspace);
  await L.settle(scene);
  const out: Record<string, unknown>[] = [];
  const run = async (element: unknown, label: string) => {
    const ex: any = L.dialogDefaults("pdf", element);
    ex.size = "72dpi";
    try {
      const bytes = await L.exportPdf(ex, a.user, a.title);
      out.push({ page: label, size: bytes.length, sha256: await L.sha256(bytes) });
    } catch (e) {
      out.push({ page: label, error: String((e as Error).message) });
    }
  };
  const pages = L.visiblePages(scene);
  for (const page of pages) await run(page, String(page.getProperty("name")));
  if (pages.length > 1) await run(pages, "all pages");
  return out;
});

const caseScenarios = PDF_CASES.map((c): Scenario<CaseArgs> => ({
  id: `io-export-pdf/export/${c.id.replace(/^pdf\//, "")}`,
  covers: c.covers,
  kind: "bytes",
  extension: ".pdf",
  timeout: 300_000,
  inPage: runCase,
  args: { c, ...IMAGES, user: PDF_USER },
}));

const corpusScenarios = CORPUS_FILES.map((file): Scenario<CorpusArgs> => ({
  id: `io-export-pdf/corpus/${file.replace(/\.gvdesign$/, "")}`,
  covers: [...PDF_COVERS, "FMT-EXPORT-046", "FMT-EXPORT-048"],
  kind: "json",
  timeout: 600_000,
  // Exports of WebGL effects came out differently depending on what ran
  // before in the same browser (shared GPU-process state).
  freshBrowser: /^effects-/.test(file),
  inPage: exportCorpus,
  args: { json: corpusJson(file), title: file.replace(/\.gvdesign$/, ""), user: PDF_USER },
}));

paritySuite(
  "io-export-pdf",
  defineScenarios<unknown>([
    ...(caseScenarios as Scenario<unknown>[]),
    ...(corpusScenarios as Scenario<unknown>[]),
  ]),
  { newApp: false },
);
