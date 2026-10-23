/* eslint-disable @typescript-eslint/no-explicit-any -- in-page code drives the untyped engine through the G namespace */
// Shared by io-export-pdf and io-export-bitmap: the export matrix's cases
// built without the editor, the in-page code that exports one, and the
// corpus files.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { NEXT_ROOT } from "../../support/env.ts";
import { EXPORT_CASES, type ExportCase } from "../import-export/export-cases.ts";
import { fixtureBase64 } from "../import-export/node-lib.ts";
import { inPageWithDocLib } from "./doc-lib.ts";

/** The signed-in user's name in the old app (the stub server's account): the PDF's /Author. */
export const PDF_USER = "Test";

export interface DocCase {
  id: string;
  covers: string[];
  doc: string;
  /** "page", "pages" (every visible page) or an element name from the builder. */
  target: string;
  format: string;
  settings?: Record<string, unknown>;
  background?: "page" | "none" | { color: string; opacity: number };
  pageProps?: Record<string, unknown>;
}

export interface CaseArgs {
  c: DocCase;
  png: string;
  jpg: string;
  user: string;
}

export const IMAGES = {
  png: "data:image/png;base64," + fixtureBase64("raster/alpha.png"),
  jpg: "data:image/jpeg;base64," + fixtureBase64("raster/photo.jpg"),
};

export const PDF_COVERS = [
  "FMT-EXPORT-005",
  "FMT-EXPORT-014",
  "FMT-EXPORT-020",
  "FMT-EXPORT-021",
  "FMT-WORKER-012",
];

/** Documents only these scenarios build (see doc-lib.ts build). */
const EXTRA_CASES: DocCase[] = [
  {
    id: "pdf/sharp-shadows",
    covers: [...PDF_COVERS, "FMT-EXPORT-016", "FMT-EXPORT-018"],
    doc: "sharp-shadows",
    target: "page",
    format: "pdf",
    settings: { size: "72dpi" },
  },
  {
    id: "pdf/sharp-shadows-150dpi",
    covers: [...PDF_COVERS, "FMT-EXPORT-016", "FMT-EXPORT-018"],
    doc: "sharp-shadows",
    target: "page",
    format: "pdf",
    settings: { size: "150dpi" },
  },
  {
    id: "pdf/decorations",
    covers: [...PDF_COVERS, "FMT-EXPORT-017"],
    doc: "decorations",
    target: "page",
    format: "pdf",
    settings: { size: "72dpi" },
  },
];

export const PDF_CASES: DocCase[] = [
  ...EXPORT_CASES.filter((c: ExportCase) => c.format === "pdf"),
  ...EXTRA_CASES,
];

/**
 * Builds the case's document in a scene of its own, exports it like the
 * export dialog would and returns the output as base64.
 */
export const runCase = inPageWithDocLib(async (_p, a: CaseArgs, L) => {
  const { G } = L;
  const workspace = await L.newWorkspace();
  const scene = L.newScene(workspace);
  const built = await L.build(scene, a.c.doc, { png: a.png, jpg: a.jpg });
  if (a.c.pageProps) {
    const names = Object.keys(a.c.pageProps);
    built.page.setProperties(
      names,
      names.map((n) => (a.c.pageProps as any)[n]),
    );
  }
  let element: any;
  if (a.c.target === "page") element = built.page;
  else if (a.c.target === "pages") element = L.visiblePages(scene);
  else element = built[a.c.target.toLowerCase()] ?? scene.querySingle(`[name="${a.c.target}"]`);
  if (!element) throw new Error("no target " + a.c.target);
  const ex: any = L.dialogDefaults(a.c.format, element);
  const bg = a.c.background ?? "page";
  if (bg === "page") {
    ex.configuration.sceneBackground = true;
  } else if (bg === "none") {
    ex.configuration.sceneBackground = false;
    ex.backgroundColor = a.c.format === "jpg" ? G.GRGBColor.WHITE : null;
  } else {
    ex.configuration.sceneBackground = false;
    ex.backgroundColor = L.pat(bg.color);
    ex.backgroundOpacity = bg.opacity;
  }
  for (const [k, v] of Object.entries(a.c.settings ?? {})) {
    if (k === "configuration") Object.assign(ex.configuration, v);
    else ex[k] = v;
  }
  if (a.c.format === "pdf") return L.bytesToB64(await L.exportPdf(ex, a.user, "Export Test"));
  const out = await L.exportBitmap(ex);
  return L.bytesToB64(out.bytes);
});

const CORPUS = path.join(NEXT_ROOT, "parity", "corpus", "files");
export const CORPUS_FILES = fs
  .readdirSync(CORPUS)
  .filter((f) => f.endsWith(".gvdesign"))
  .sort();

/** A corpus file's JSON (gunzipped when it is gzip). */
export function corpusJson(file: string): string {
  const bytes = fs.readFileSync(path.join(CORPUS, file));
  return bytes[0] === 0x1f && bytes[1] === 0x8b
    ? zlib.gunzipSync(bytes).toString("utf8")
    : bytes.toString("utf8");
}
