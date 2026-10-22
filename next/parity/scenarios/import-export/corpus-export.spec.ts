// Every document of the shared corpus (parity/corpus/files) opened through
// File > Open Local File... and exported page by page through the export
// dialog's code path in PNG, JPEG, SVG and PDF, plus the merged PDF the
// dialog writes for all pages. Outputs are recorded as sizes and hashes
// (PDFs normalized, see pdf-normalize.ts) so the corpus stays cheap to
// store; the per-format scenarios in export-engine.spec.ts keep the full
// files for the cases that need inspecting.
import fs from "node:fs";
import path from "node:path";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, type Scenario } from "../../support/scenario.ts";
import { NEXT_ROOT } from "../../support/env.ts";
import {
  chooseFiles,
  clickMenu,
  normalizePdf,
  normalizeSvg,
  renderPdf,
  runInPage,
  sha256,
  waitForDocuments,
} from "./node-lib.ts";
import { inPageWithLib } from "./page-lib.ts";

const CORPUS = path.join(NEXT_ROOT, "parity", "corpus", "files");
const files = fs.existsSync(CORPUS)
  ? fs
      .readdirSync(CORPUS)
      .filter((f) => f.endsWith(".gvdesign"))
      .sort()
  : [];

interface Out {
  format: string;
  page: string;
  mime: string | null;
  b64: string;
  error?: string;
}

/** Exports every visible page in every format, then all pages as one PDF. */
const exportAll = inPageWithLib(async (_p, _a: unknown, L) => {
  const { G } = L;
  await L.io.settle();
  const scene = L.app.scene();
  const pages = scene
    .getChildren()
    .filter((n: { isVisible(): boolean }) => n instanceof G.GPage && n.isVisible());
  const out: Out[] = [];
  const run = async (format: string, element: unknown, label: string) => {
    const ex: Record<string, unknown> = L.dialogDefaults(format, element);
    if (format === "pdf") ex.size = "72dpi";
    try {
      const r = await L.exportB64(ex);
      out.push({ format, page: label, mime: r.mime, b64: r.b64 });
    } catch (e) {
      out.push({ format, page: label, mime: null, b64: "", error: String((e as Error).message) });
    }
  };
  for (const page of pages) {
    const name = String(page.getProperty("name"));
    for (const format of ["png", "jpg", "svg", "pdf"]) await run(format, page, name);
  }
  if (pages.length > 1) await run("pdf", pages, "all pages");
  return out;
});

function corpusScenario(file: string): Scenario<unknown> {
  return {
    id: `import-export/corpus/${file.replace(/\.gvdesign$/, "")}`,
    covers: [
      "FMT-EXPORT-005",
      "FMT-EXPORT-002",
      "FMT-EXPORT-007",
      "FMT-EXPORT-014",
      "FMT-EXPORT-046",
    ],
    kind: "json",
    timeout: 300_000,
    driver: async ({ page }) => {
      page.setDefaultTimeout(30_000);
      await chooseFiles(page, () => clickMenu(page, ["File", "Open Local File..."]), [
        { name: file, buffer: fs.readFileSync(path.join(CORPUS, file)) },
      ]);
      const opened = await waitForDocuments(page, 2, 60_000);
      const list = await runInPage<Out[]>(page, exportAll, {});
      const results = [];
      for (const o of list) {
        let data: Buffer = Buffer.from(o.b64, "base64");
        const r: Record<string, unknown> = { format: o.format, page: o.page, mime: o.mime };
        if (o.error) r.error = o.error;
        if (o.format === "pdf" && data.length) {
          data = normalizePdf(data);
          const png = await renderPdf(page, data, 1);
          r.render = sha256(Buffer.from(png.split(",")[1] ?? "", "base64"));
        }
        if (o.format === "svg") data = Buffer.from(normalizeSvg(data.toString("utf8")), "utf8");
        r.size = data.length;
        r.sha256 = sha256(data);
        results.push(r);
      }
      return { opened, results };
    },
  };
}

paritySuite("import-export corpus exports", defineScenarios<unknown>(files.map(corpusScenario)), {
  newApp: false,
});
