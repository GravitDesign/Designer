// Runs the SVG export cases (testing/svg-export-cases.ts) against the port
// and compares them with the output recorded from the old GSVGExport
// (chunk.vendor.js module 1455) in the old app's page.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { decompressString } from "../../../engine/core/util.ts";
import { installFakeCanvas } from "../../../engine/paint/testing/fake-canvas.ts";
import { Scene } from "../../../engine/scene/scene.ts";
import { SceneOptions } from "../../../engine/scene/scene-options.ts";
import { Workspace } from "../../../engine/scene/workspace.ts";
import { FontManager, type ResolveFontEvent } from "../../../engine/text/fonts/font-manager.ts";
import { OpenTypeFont } from "../../../engine/text/fonts/open-type-font.ts";
import { ExportCompat } from "../export-compat.ts";
import { SvgExport } from "./svg-export.ts";
import { SVG_EXPORT_CASES, type SvgExportLib } from "./testing/svg-export-cases.ts";
import expected from "./testing/svg-export-cases.json" with { type: "json" };

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(here, "../../../../legacy/public/assets/font");

const FONTS: [string, string, number, string][] = [
  ["Open Sans", "N", 400, "OpenSans-Regular.ttf"],
  ["Open Sans", "N", 700, "OpenSans-Bold.ttf"],
];

function readFont(name: string): ArrayBuffer {
  const bytes = readFileSync(resolve(fontDir, name));
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/** The G namespace as the parity bridge builds it. */
function namespace(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const modules = import.meta.glob("../../../parity/g/*.ts", { eager: true }) as Record<
    string,
    Record<string, Record<string, unknown>>
  >;
  for (const exports of Object.values(modules)) {
    for (const part of Object.values(exports)) {
      if (typeof part === "object" && part) Object.assign(out, part);
    }
  }
  return out;
}

let uninstall: () => void;
const actual: Record<string, unknown> = {};

beforeAll(() => {
  uninstall = installFakeCanvas();
  // GDesigner.init's scene options, as the old app ran with them.
  SceneOptions.scaleLabel = false;
  SceneOptions.defaultBorderPositionForLines = true;
  const workspace = new Workspace();
  const fonts = workspace.getFontManager() as FontManager;
  for (const [family, style, weight, file] of FONTS) {
    fonts._fonts.push(OpenTypeFont.create(family, style, weight, readFont(file)) as OpenTypeFont);
  }
  fonts.setDefaultFont(fonts._fonts[0] as OpenTypeFont);
  fonts.addEventListener(FontManager.ResolveFontEvent, (event: ResolveFontEvent) => {
    event.failed();
  });
  const lib: SvgExportLib = {
    G: namespace(),
    SVGExport: SvgExport,
    ExportCompat,
    newScene() {
      const scene = new Scene(workspace);
      const page = scene.getActivePage() as NonNullable<ReturnType<Scene["getActivePage"]>>;
      page.setProperties(["bck", "w", "h"], [RGBColor.WHITE, 0, 0]);
      // What the old app's documents have: the page shadow area and the annotations list.
      scene.setShadowExpandArea(9, 9, 9, 11);
      scene.getAnnotations();
      return { scene, page };
    },
    decompress: decompressString,
  };
  for (const name of Object.keys(SVG_EXPORT_CASES)) {
    try {
      actual[name] = JSON.parse(
        JSON.stringify((SVG_EXPORT_CASES[name] as (lib: SvgExportLib) => unknown)(lib)),
      );
    } catch (error) {
      actual[name] = { throws: String(error) };
    }
  }
  // Debug aid: SVG_EXPORT_DUMP=<file> writes what the port produced.
  if (process.env.SVG_EXPORT_DUMP)
    writeFileSync(process.env.SVG_EXPORT_DUMP, JSON.stringify(actual, null, 1));
}, 120_000);

afterAll(() => uninstall());

describe("SvgExport against the old GSVGExport", () => {
  for (const [name, recorded] of Object.entries(expected as Record<string, unknown>)) {
    it(name, () => {
      expect(actual[name]).toEqual(recorded);
    });
  }
});
