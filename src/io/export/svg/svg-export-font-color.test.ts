// A text colored by its font color (_fc, what the text tool sets) instead
// of a fill layer, exported to SVG.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { installFakeCanvas } from "../../../engine/paint/testing/fake-canvas.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Scene } from "../../../engine/scene/scene.ts";
import { Workspace } from "../../../engine/scene/workspace.ts";
import { FontManager, type ResolveFontEvent } from "../../../engine/text/fonts/font-manager.ts";
import { OpenTypeFont } from "../../../engine/text/fonts/open-type-font.ts";
import { SvgExport } from "./svg-export.ts";

const here = dirname(fileURLToPath(import.meta.url));
let uninstall: () => void;
let workspace: Workspace;

beforeAll(() => {
  uninstall = installFakeCanvas();
  workspace = new Workspace();
  const fonts = workspace.getFontManager() as FontManager;
  const bytes = readFileSync(
    resolve(here, "../../../../../public/assets/font/OpenSans-Regular.ttf"),
  );
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  fonts._fonts.push(OpenTypeFont.create("Open Sans", "N", 400, buffer) as OpenTypeFont);
  fonts.setDefaultFont(fonts._fonts[0] as OpenTypeFont);
  fonts.addEventListener(FontManager.ResolveFontEvent, (event: ResolveFontEvent) => {
    event.failed();
  });
});

afterAll(() => uninstall());

/** A text as the text tool makes it: no fill layer, colored by its run's font color. */
function exportText(): string {
  const scene = new Scene(workspace);
  const page = scene.getActivePage() as NonNullable<ReturnType<Scene["getActivePage"]>>;
  page.setProperties(["bck", "w", "h"], [RGBColor.WHITE, 200, 100]);
  const run = {
    text: "Font colored",
    fontColor: "C#[200,30,30]",
    fontFamily: "Open Sans",
    fontSize: 20,
  };
  const text = Node.deserialize(
    JSON.stringify({
      "@": "text",
      content: JSON.stringify([run]),
      trf: [1, 0, 0, 1, 10, 10],
      _fc: "C#[200,30,30]",
      _tff: "Open Sans",
    }),
  );
  page.appendChild(text as Node);
  let out = "";
  SvgExport.export(page, { decimalPlacesPrecision: 3 }, (error: unknown, svg?: string) => {
    if (error) throw error;
    out = svg as string;
  });
  return out;
}

describe("BUG-085: texts colored by their font color", () => {
  it("export the color as a CSS color", () => {
    const svg = exportText();
    expect(svg).toContain("<text");
    expect(svg).not.toContain("[Object");
    expect(svg).toMatch(/<text[^>]*style="[^"]*fill:#C81E1E/);
  });
});
