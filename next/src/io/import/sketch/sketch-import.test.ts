import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Workspace } from "../../../engine/scene/workspace.ts";
import { Node } from "../../../engine/scene/node.ts";
import { normalizeDocumentString } from "../../../../parity/support/normalize.ts";
import { renderPdfImage } from "../pdf/pdf-import.ts";
import { SketchImport } from "./sketch-import.ts";
import { SketchTexturePattern } from "./sketch-texture-pattern.ts";
import type { SketchImportResult } from "./sketch-file.ts";

/** Node has Blob but no FileReader; zip.js reads Blobs through one. */
class NodeFileReader {
  result: unknown = null;
  onload: ((event: { target: NodeFileReader }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;

  readAsArrayBuffer(blob: Blob): void {
    blob.arrayBuffer().then((buffer) => this.done(buffer), this.onerror);
  }

  readAsText(blob: Blob): void {
    blob.text().then((text) => this.done(text), this.onerror);
  }

  private done(result: unknown): void {
    this.result = result;
    this.onload?.({ target: this });
  }
}

beforeAll(() => {
  vi.stubGlobal("FileReader", NodeFileReader);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const ROOT = path.resolve(import.meta.dirname, "../../../..");
const FIXTURES = path.join(ROOT, "parity/fixtures/import/sketch");
const EXPECTED = path.join(ROOT, "parity/expected/io-import-sketch");

function importFile(file: string, options: Record<string, unknown> = {}): Promise<unknown> {
  return new Promise((resolve) => {
    SketchImport.import(
      new Uint8Array(fs.readFileSync(path.join(FIXTURES, file))),
      options,
      resolve,
    );
  });
}

/**
 * The parity recording of a fixture without fonts or images (those need
 * a browser): the pages and the progress the old app reported.
 */
function expectedFor(name: string): { progress: number[]; pages: string[]; error: unknown } {
  return JSON.parse(fs.readFileSync(path.join(EXPECTED, name + ".json"), "utf8")) as {
    progress: number[];
    pages: string[];
    error: unknown;
  };
}

describe("SketchImport", () => {
  for (const name of ["shapes-v49", "primitives-v49", "groups-v49", "booleans-v49"]) {
    it(`imports ${name} as the old app did`, async () => {
      const progress: number[] = [];
      const result = (await importFile(name + ".sketch", {
        progress: (value: number) => progress.push(value),
        workspace: new Workspace(),
      })) as SketchImportResult;
      const expected = expectedFor(name);
      expect(progress).toEqual(expected.progress);
      expect(result.replacedFonts).toBeNull();
      const pages = result.pages.map((page) => Node.serialize(page as unknown as Node) as string);
      expect(pages.map((page) => normalizeDocumentString(page))).toEqual(
        expected.pages.map((page) => normalizeDocumentString(page)),
      );
    });
  }

  it("reports Sketch 50 and later as v50error", async () => {
    expect(await importFile("shapes-v52.sketch")).toEqual({ v50error: true });
  });

  it("reports a file that is no zip with the localized unsupported-version text", async () => {
    expect(await importFile("not-a-zip.sketch")).toBe(expectedFor("not-a-zip").error);
  });

  it("answers an empty source with a message", () => {
    const callback = vi.fn();
    SketchImport.import(null, {}, callback);
    expect(callback).toHaveBeenCalledWith("Invalid sketch file.");
  });

  it("resolves a zip without pages with no pages", async () => {
    expect(await importFile("no-pages-v49.sketch")).toEqual({ pages: [], replacedFonts: null });
  });

  it("renders PDF image fills with pdf.js as soon as the importer is loaded", () => {
    // The old image fill called pdf.js itself; nothing else has to install it.
    expect(SketchTexturePattern.pdfRenderer).toBe(renderPdfImage);
  });
});

/** A scene node as this test reads it. */
interface ReadNode {
  getProperty(name: string): unknown;
  acceptChildren(visit: (node: ReadNode) => void): void;
  getEffects?(): { getChildren(): ReadNode[] } | null;
}

/** The node names and visibility of each layer's effects, by layer name. */
function effectsByLayer(pages: unknown[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const page of pages as ReadNode[]) {
    page.acceptChildren((node) => {
      const effects = node.getEffects ? node.getEffects() : null;
      const list = effects ? effects.getChildren() : [];
      if (list.length) {
        out[node.getProperty("name") as string] = list.map(
          (effect) =>
            `${Node.getName(effect)}${effect.getProperty("vs") === false ? " (hidden)" : ""}`,
        );
      }
    });
  }
  return out;
}

describe("Sketch layer effects (BUG-103)", () => {
  it("imports shadows, blurs and colour controls, a disabled one hidden", async () => {
    const result = (await importFile("styles-v49.sketch", {
      workspace: new Workspace(),
    })) as SketchImportResult;
    expect(effectsByLayer(result.pages)).toEqual({
      "blur-gauss": ["GGLBlurEffect"],
      "blur-zoom": ["GGLZoomBlurEffect"],
      "blur-bg": ["GGLBlurEffect"],
      shadows: [
        "GGLColorAdjustEffect",
        "dropShadowEffect",
        "dropShadowEffect (hidden)",
        "innerShadowEffect",
      ],
    });
  });
});
