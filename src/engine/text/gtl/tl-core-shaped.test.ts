// A text's parts keep the outlines drawText shaped for them (ShapedText in
// tl-canvas-context.ts). These tests render a core, change it the ways an
// edit can, and check that the next render makes the same canvas calls as
// a render in which every part is shaped again.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Context2D } from "../../paint/context-2d.ts";
import { installFakeCanvas } from "../../paint/testing/fake-canvas.ts";
import { FontManager, type ResolveFontEvent } from "../fonts/font-manager.ts";
import { OpenTypeFont } from "../fonts/open-type-font.ts";
import { ShapedText } from "../tl-canvas-context.ts";
import { TLDirectionTextTransformer } from "../tl-direction-text-transformer.ts";
import type { Part } from "./inline.ts";
import { registerStylable } from "./late-bound.ts";
import { RenderFlags } from "./render-flags.ts";
import { TLCore } from "./tl-core.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(here, "../../../../assets/font");

const FILL = RenderFlags.RENDERFLAG_FILL | RenderFlags.RENDERFLAG_VERTEX;
const PATH_CALL =
  /^(beginPath|moveTo|lineTo|quadraticCurveTo|bezierCurveTo|closePath|fill|stroke|setTransform|fillStyle)\b/;

let uninstall: () => void;
let shapings = 0;
let original: OpenTypeFont["stringToGlyphs"];

function readFont(name: string): ArrayBuffer {
  const bytes = readFileSync(resolve(fontDir, name));
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function makeFontManager(): FontManager {
  const manager = new FontManager();
  manager._fonts.push(
    OpenTypeFont.create("Open Sans", "N", 400, readFont("OpenSans-Regular.ttf")) as OpenTypeFont,
  );
  manager.setDefaultFont(manager._fonts[0] as OpenTypeFont);
  manager.addEventListener(FontManager.ResolveFontEvent, (event: ResolveFontEvent) => {
    event.failed();
  });
  return manager;
}

function makeCore(manager = makeFontManager()): TLCore {
  const core = new TLCore();
  core.initialize(1, 1, manager, () => {});
  core.setWrap(false);
  core.setText([
    { fontFamily: "Open Sans", text: "Waffles and words, again\nThe second line", fontSize: 18 },
  ]);
  core.setWidth(TLCore.AUTO);
  core.setHeight(TLCore.AUTO);
  return core;
}

/**
 * The path calls of a fill render (all of them with a scale), from the
 * first path on: before it, a render that resizes the canvas leaves out
 * a transform reset that the next render makes.
 */
function render(core: TLCore, scale = 1): string[] {
  const log: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(object, key: string) {
      if (key in object) return object[key];
      return (...args: unknown[]) => log.push(key + "(" + args.join(",") + ")");
    },
    set(object, key: string, value: unknown) {
      object[key] = value;
      log.push(key + "=" + String(value));
      return true;
    },
  });
  core._ctx.$canvasContext = ctx as unknown as Context2D;
  const flags = 1 === scale ? FILL : FILL | RenderFlags.RENDERFLAG_SCALEBITMAP;
  core.render(false, scale, { shapePaint: "#000000" }, flags);
  const calls = log.filter((entry) => PATH_CALL.test(entry));
  return calls.slice(calls.indexOf("beginPath()"));
}

function parts(core: TLCore): Part[] {
  return core._doc.words.flatMap((word) => [...word.text.parts, ...word.space.parts]);
}

/** A render in which every part is shaped again. */
function renderShaped(core: TLCore, scale = 1): string[] {
  for (const part of parts(core)) {
    if (part._shaped instanceof ShapedText) ShapedText.release(part, part._shaped);
    part._shaped = null;
  }
  return render(core, scale);
}

/** Renders until the parts keep their path calls. */
function settle(core: TLCore): string[] {
  render(core);
  render(core);
  return render(core);
}

beforeAll(() => {
  uninstall = installFakeCanvas();
  registerStylable({
    PropertySetInfo: {
      T: { geometryProperties: { _tfi: 20, _fc: undefined, _tcs: null, _tws: null } },
      P: { geometryProperties: { _plh: 1, _pal: null } },
    },
    PropertySet: { Text: "T", Paragraph: "P" },
    ParagraphAlignment: { Left: "l", Center: "c", Right: "r", Justify: "j" },
    BorderAlignment: { Inside: "I", Outside: "O" },
  });
  original = OpenTypeFont.prototype.stringToGlyphs;
  OpenTypeFont.prototype.stringToGlyphs = function (this: OpenTypeFont, ...args) {
    shapings++;
    return original.apply(this, args);
  };
});

afterAll(() => {
  OpenTypeFont.prototype.stringToGlyphs = original;
  uninstall();
});

describe("TLCore render with kept outlines", () => {
  it("doesn't shape unchanged parts again", () => {
    const core = makeCore();
    const before = settle(core);
    const count = shapings;
    expect(render(core)).toEqual(before);
    expect(shapings).toBe(count);
    expect(renderShaped(core)).toEqual(before);
  });

  it("draws an edited word and the words it moves", () => {
    const core = makeCore();
    const before = settle(core);
    core.select(2);
    core.insert("x");
    const after = render(core);
    expect(after).not.toEqual(before);
    expect(after).toEqual(renderShaped(core));
  });

  it("draws a word that got another size", () => {
    const core = makeCore();
    const before = settle(core);
    core.getRange(12, 17)?.setFormatting("fontSize", 30);
    const after = render(core);
    expect(after).not.toEqual(before);
    expect(after).toEqual(renderShaped(core));
  });

  it("draws a run changed in place", () => {
    const core = makeCore();
    const before = settle(core);
    // The inspector can change the run a part holds without a new layout.
    const part = parts(core).find((candidate) => "again" === candidate.run.text) as Part;
    part.run.charSpacing = 3;
    const after = render(core);
    expect(after).not.toEqual(before);
    expect(after).toEqual(renderShaped(core));
  });

  it("draws with a font that replaced the old one", () => {
    const manager = makeFontManager();
    const core = makeCore(manager);
    const before = settle(core);
    const light = OpenTypeFont.create(
      "Open Sans",
      "N",
      400,
      readFont("OpenSans-Light.ttf"),
    ) as OpenTypeFont;
    manager._fonts.splice(0, 1, light);
    manager.setDefaultFont(light);
    const after = render(core);
    expect(after).not.toEqual(before);
    expect(after).toEqual(renderShaped(core));
  });

  it("draws at another scale", () => {
    const core = makeCore();
    settle(core);
    expect(render(core, 2)).toEqual(renderShaped(core, 2));
  });

  it("draws right to left through the direction transformer", () => {
    const core = makeCore();
    const before = settle(core);
    core.setDirection(TLDirectionTextTransformer.RTL);
    const after = render(core);
    expect(after).not.toEqual(before);
    expect(after).toEqual(renderShaped(core));
  });
});
