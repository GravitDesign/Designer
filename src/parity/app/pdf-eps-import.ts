/**
 * app.pdfEpsImport for the io-import-pdf-eps scenarios (contract in
 * parity/scenarios/io-import-pdf-eps/contract.ts): the PDF, EPS and
 * bitmap importers with the scenario's font manager installed in the
 * OpenType text meter while they run, as old-hooks.js does in the old app.
 */
import type { FontManager } from "../../engine/text/fonts/font-manager.ts";
import { openTypeMeasure } from "../../engine/text/gtl/measure.ts";
import { BitmapImport } from "../../io/import/bitmap-import.ts";
import { EPSImport } from "../../io/import/eps/eps-import.ts";
import { getList, setList } from "../../io/import/fonts/google-font-names.ts";
import { PDFImport } from "../../io/import/pdf/pdf-import.ts";

interface BinarySource {
  base64: string;
  type?: string;
}

interface PdfImportFlags {
  families?: string[] | null;
  progress?: boolean;
  ai?: "continue" | "stop";
}

function bytes(source: BinarySource): Uint8Array {
  const binary = atob(source.base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function errorText(error: unknown): string | null {
  if (error === null || error === undefined) return null;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const e = error as { name?: unknown; message?: unknown };
    return "<" + String(e.name) + ": " + String(e.message) + ">";
  }
  return String(error);
}

type Outcome = Record<string, unknown>;

function run(
  fontManager: FontManager | null,
  families: string[] | null,
  timeoutMs: number | undefined,
  timedOut: () => Outcome,
  start: (finish: (outcome: Outcome) => void) => void,
): Promise<Outcome> {
  return new Promise((resolve) => {
    const previousManager = openTypeMeasure.fontManager;
    const previousList = getList();
    if (fontManager) openTypeMeasure.fontManager = fontManager;
    if (families) PDFImport.updateFontFamilies(families);
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (outcome: Outcome) => {
      if (done) return;
      done = true;
      openTypeMeasure.fontManager = previousManager;
      setList(previousList);
      if (timer) clearTimeout(timer);
      resolve(outcome);
    };
    timer = setTimeout(() => finish(timedOut()), timeoutMs || 15000);
    try {
      start(finish);
    } catch (error) {
      finish(Object.assign(timedOut(), { error: errorText(error), threw: true }));
    }
  });
}

function importPdf(
  source: BinarySource,
  options: Record<string, unknown>,
  fontManager: FontManager,
  flags: PdfImportFlags,
  timeoutMs?: number,
): Promise<Outcome> {
  const progress: [number, number][] = [];
  let aiAsked = false;
  const notCalled = () => ({
    called: false,
    error: null,
    pages: null,
    missingFonts: null,
    embeddedFonts: null,
    progress,
    aiAsked,
  });
  return run(fontManager, flags.families || null, timeoutMs, notCalled, (finish) => {
    const aiCallback = flags.ai
      ? (proceed: () => void) => {
          aiAsked = true;
          if (flags.ai === "continue") proceed();
          else finish(notCalled());
        }
      : undefined;
    PDFImport.import(
      bytes(source),
      options,
      fontManager,
      (error, pages, missingFonts, embeddedFonts) =>
        finish({
          called: true,
          error: errorText(error),
          pages: pages || null,
          missingFonts: missingFonts || null,
          embeddedFonts: embeddedFonts || null,
          progress,
          aiAsked,
        }),
      flags.progress ? (done, total) => progress.push([done, total]) : undefined,
      aiCallback,
    );
  });
}

function isAIFormat(source: BinarySource, timeoutMs?: number): Promise<Outcome> {
  return run(
    null,
    null,
    timeoutMs,
    () => ({ called: false, result: null, error: null }),
    (finish) => {
      PDFImport.isAIFormat(bytes(source))
        .then((result) => finish({ called: true, result, error: null }))
        .catch((error: unknown) => finish({ called: true, result: null, error: errorText(error) }));
    },
  );
}

function importEps(
  source: BinarySource,
  outlineFonts: boolean,
  fontManager: FontManager,
  timeoutMs?: number,
): Promise<Outcome> {
  const progress: number[] = [];
  const errors: string[] = [];
  return run(
    fontManager,
    null,
    timeoutMs,
    () => ({
      called: false,
      error: null,
      node: null,
      size: null,
      background: null,
      errors,
      progress,
    }),
    (finish) => {
      EPSImport.import(
        bytes(source),
        outlineFonts,
        fontManager,
        (error, node, size, background) =>
          // Queued errors are reported right after this callback.
          setTimeout(
            () =>
              finish({
                called: true,
                error: errorText(error),
                node: node || null,
                size: size || null,
                background: background || null,
                errors,
                progress,
              }),
            0,
          ),
        (message) => errors.push(message),
        (percent) => progress.push(percent),
      );
    },
  );
}

function importBitmap(source: BinarySource, timeoutMs?: number): Promise<Outcome> {
  return run(
    null,
    null,
    timeoutMs,
    () => ({ called: false, error: null, url: null, width: null, height: null }),
    (finish) => {
      const blob = new Blob([bytes(source) as Uint8Array<ArrayBuffer>], { type: source.type });
      BitmapImport.import(blob, (error, url, width, height) =>
        finish({
          called: true,
          error: errorText(error),
          url: url || null,
          width: width === undefined ? null : width,
          height: height === undefined ? null : height,
        }),
      );
    },
  );
}

export const pdfEpsImportHooks = {
  pdfEpsImport: { importPdf, isAIFormat, importEps, importBitmap },
};
