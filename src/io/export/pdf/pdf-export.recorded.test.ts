/* eslint-disable @typescript-eslint/no-explicit-any -- the test documents are built through the G namespace, like in the old app */
// Whole exports of vector documents (shapes, gradients, borders inside and
// outside, dashes, opacity and blend modes, CMYK, bleed, backgrounds,
// several pages) against the bytes the old app's GPDFExport wrote for the
// same documents (pdf-export.old-outputs.json, recorded in the old app
// with the documents of test-scenes.ts; only the dates are normalized).
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ASSETS_ROOT } from "../../../../server/paths.ts";
import { Color } from "../../../engine/color/color.ts";
import { IccProfile } from "../../../engine/color/icc-profile.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { Platform } from "../../../engine/core/platform.ts";
import { SceneOptions } from "../../../engine/scene/scene-options.ts";
import { Scene } from "../../../engine/scene/scene.ts";
import { Workspace } from "../../../engine/scene/workspace.ts";
import { PDFExport } from "./pdf-export.ts";
import { PDF_TEST_CASES, buildPdfTestScene, pdfTestExport } from "./test-scenes.ts";
import recorded from "./pdf-export.old-outputs.json" with { type: "json" };

/** The engine under its old names, as the parity bridge merges it. */
function engineNamespace(): Record<string, any> {
  const modules = import.meta.glob("../../../parity/g/*.ts", { eager: true }) as Record<
    string,
    Record<string, unknown>
  >;
  const G: Record<string, any> = {};
  for (const exports of Object.values(modules)) {
    for (const part of Object.values(exports)) {
      if (typeof part === "object" && part !== null) Object.assign(G, part);
    }
  }
  return G;
}

/** A new document as the app makes it: a white page without a size. */
function newScene(): Scene {
  const scene = new Scene(new Workspace());
  (scene.getActivePage() as NonNullable<ReturnType<Scene["getActivePage"]>>).setProperties(
    ["bck", "w", "h"],
    [RGBColor.WHITE, 0, 0],
  );
  scene.getAnnotations();
  return scene;
}

function exportPdf(element: unknown, options: Record<string, unknown>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    PDFExport.export(element as never, options, (error, bytes) => {
      if (error) reject(error instanceof Error ? error : new Error(String(error)));
      else resolve(bytes as unknown as Uint8Array);
    });
  });
}

function normalizedBase64(bytes: Uint8Array): string {
  const latin = Buffer.from(bytes).toString("latin1");
  return Buffer.from(
    latin.replace(/\(D:[0-9]{14}([^)]*)\)/g, "(D:20000101000000$1)"),
    "latin1",
  ).toString("base64");
}

const G = engineNamespace();
let previousProfile: typeof Color.currentCMYKProfile = null;
let previousZone: string | undefined;

beforeAll(() => {
  // The outputs were recorded in UTC; the zone offset is part of the dates.
  previousZone = process.env.TZ;
  process.env.TZ = "UTC";
  // What the app sets at boot: the scene options and the SWOP profile the
  // old app had loaded when the outputs were recorded.
  SceneOptions.scaleLabel = false;
  SceneOptions.defaultBorderPositionForLines = true;
  previousProfile = Color.currentCMYKProfile;
  const bytes = new Uint8Array(
    fs.readFileSync(path.join(ASSETS_ROOT, "data/icc/USWebCoatedSWOP.icc")),
  );
  new IccProfile().read(bytes.slice().buffer, (profile) => {
    Color.currentCMYKProfile = profile;
  });
  vi.spyOn(Platform, "scheduleFrame").mockImplementation((callback) => {
    setTimeout(() => callback(0), 0);
    return 1;
  });
});

afterAll(() => {
  if (previousZone === undefined) delete process.env.TZ;
  else process.env.TZ = previousZone;
  Color.currentCMYKProfile = previousProfile;
  vi.restoreAllMocks();
});

describe("PDFExport on recorded documents", () => {
  const outputs = recorded as Record<string, string>;
  for (const testCase of PDF_TEST_CASES) {
    it(testCase.id, async () => {
      const built = buildPdfTestScene(G, newScene(), testCase.doc);
      const { element, options } = pdfTestExport(G, built, testCase);
      const bytes = await exportPdf(element, options);
      if ("shapes-bleed" !== testCase.id) {
        expect(normalizedBase64(bytes)).toBe(outputs[testCase.id]);
        return;
      }
      // BUG-089: the bleed box is the whole page (it includes the bleed)
      // and the trim box the page inside it, written as llx lly urx ury.
      // The old file had the trim area as "/BleedBox [x y w h]". The rest
      // is the old file; the objects after the page move, so the
      // cross-reference offsets are left out.
      const latin = Buffer.from(normalizedBase64(bytes), "base64").toString("latin1");
      const old = Buffer.from(outputs[testCase.id] as string, "base64").toString("latin1");
      const oldBox = /\/BleedBox \[(\d+) \d+ (\d+) (\d+)\]/.exec(old) as RegExpExecArray;
      const [bleed, width, height] = [Number(oldBox[1]), Number(oldBox[2]), Number(oldBox[3])];
      const media = `[0 0 ${width + 2 * bleed} ${height + 2 * bleed}]`;
      expect(old).toContain(`/MediaBox ${media}`);
      expect(latin).toContain(`/BleedBox ${media}`);
      expect(latin).toContain(`/TrimBox [${bleed} ${bleed} ${width + bleed} ${height + bleed}]`);
      const rest = (text: string) =>
        text
          .replace(/\/BleedBox \[[^\]]*\]/, "")
          .replace(/\/TrimBox \[[^\]]*\]/, "")
          .replace(/\n\d{10} 00000 n /g, "\n<offset> 00000 n ")
          .replace(/startxref\n\d+/, "startxref\n<offset>");
      expect(rest(latin)).toBe(rest(old));
    });
  }

  it("leaves the scene as it was (slices and pages are restored)", async () => {
    const scene = newScene();
    const built = buildPdfTestScene(G, scene, "shapes");
    const before = G.GNode.serialize(scene);
    const { element, options } = pdfTestExport(G, built, PDF_TEST_CASES[0] as never);
    await exportPdf(element, options);
    expect(G.GNode.serialize(scene)).toBe(before);
  });
});
