// The core's canvas doubles as its fill canvas after a fill render (see
// AdoptedFill in tl-core.ts). These tests check that the fill canvas still
// shows the last fill render, as the old separate copy did, whatever is
// drawn into the core's canvas afterwards.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { extend } from "../../core/util.ts";
import { FakeCanvas, FakeContext2D, installFakeCanvas } from "../../paint/testing/fake-canvas.ts";
import { FontManager, type ResolveFontEvent } from "../fonts/font-manager.ts";
import { OpenTypeFont } from "../fonts/open-type-font.ts";
import { registerStylable } from "./late-bound.ts";
import { RenderFlags } from "./render-flags.ts";
import { TLCore } from "./tl-core.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fontFile = resolve(here, "../../../../assets/font/OpenSans-Regular.ttf");

const FILL = RenderFlags.RENDERFLAG_FILL | RenderFlags.RENDERFLAG_VERTEX;
const STROKE = RenderFlags.RENDERFLAG_STROKE | RenderFlags.RENDERFLAG_VERTEX;
const RED = [255, 0, 0, 255];
const GREEN = [0, 255, 0, 255];
const BLUE = [0, 0, 255, 255];

let fontManager: FontManager;
let uninstall: () => void;
const saved: Record<string, unknown> = {};

function color(style: unknown): number[] {
  const value = parseInt(String(style).slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255];
}

function paintAll(context: FakeContext2D, rgba: number[]): void {
  for (let i = 0; i < context.canvas.pixels.length; i += 4) context.canvas.pixels.set(rgba, i);
}

beforeAll(() => {
  uninstall = installFakeCanvas();
  // The fake only paints rectangles; here a fill or stroke paints the whole
  // canvas in its color, and drawImage copies pixels, so canvases show what
  // was rendered into them last.
  const proto = FakeContext2D.prototype as unknown as Record<string, unknown>;
  for (const name of ["fill", "stroke", "drawImage"]) saved[name] = proto[name];
  proto.fill = function (this: FakeContext2D) {
    paintAll(this, color(this.fillStyle));
  };
  proto.stroke = function (this: FakeContext2D) {
    paintAll(this, color(this.strokeStyle));
  };
  proto.drawImage = function (this: FakeContext2D, source: unknown, x: number, y: number) {
    if (!(source instanceof FakeCanvas) || x || y) throw new Error("only whole canvases");
    const target = this.canvas;
    for (let row = 0; row < Math.min(source.height, target.height); row++) {
      for (let column = 0; column < Math.min(source.width, target.width); column++) {
        const from = (row * source.width + column) * 4;
        target.pixels.set(
          source.pixels.subarray(from, from + 4),
          (row * target.width + column) * 4,
        );
      }
    }
  };
  registerStylable({
    PropertySetInfo: {
      T: { geometryProperties: { _tfi: 20, _fc: undefined, _tcs: null, _tws: null } },
      P: { geometryProperties: { _plh: 1, _pal: null } },
    },
    PropertySet: { Text: "T", Paragraph: "P" },
    ParagraphAlignment: { Left: "l", Center: "c", Right: "r", Justify: "j" },
    BorderAlignment: { Inside: "I", Outside: "O" },
  });
  const bytes = readFileSync(fontFile);
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  fontManager = new FontManager();
  fontManager._fonts.push(OpenTypeFont.create("Open Sans", "N", 400, buffer) as OpenTypeFont);
  fontManager.setDefaultFont(fontManager._fonts[0] as OpenTypeFont);
  fontManager.addEventListener(FontManager.ResolveFontEvent, (event: ResolveFontEvent) => {
    event.failed();
  });
});

afterAll(() => {
  Object.assign(FakeContext2D.prototype, saved);
  uninstall();
});

function makeCore(): TLCore {
  const core = new TLCore();
  core.initialize(1, 1, fontManager, () => {});
  core.setWrap(false);
  core.setText([{ fontFamily: "Open Sans", text: "Paint me", fontSize: 18 }]);
  core.setWidth(TLCore.AUTO);
  core.setHeight(TLCore.AUTO);
  return core;
}

/** A copy of the core's fields, as the SVG and PDF exporters make one. */
function copyOf(core: TLCore): TLCore {
  return extend(new TLCore(), core) as unknown as TLCore;
}

function pixel(canvas: HTMLCanvasElement | null): number[] {
  const context = (canvas as HTMLCanvasElement).getContext("2d") as CanvasRenderingContext2D;
  return Array.from(context.getImageData(0, 0, 1, 1).data);
}

function render(core: TLCore, paint: string, flags: number): void {
  core.render(false, 1, { shapePaint: paint, strokeWidth: 1 }, flags);
}

describe("TLCore fill canvas", () => {
  it("is the core's canvas after a fill render, without a copy", () => {
    const core = makeCore();
    render(core, "#ff0000", FILL);
    expect(core.getCanvas(RenderFlags.RENDERFLAG_FILL)).toBe(core.getCanvas());
    expect(pixel(core.getCanvas(RenderFlags.RENDERFLAG_FILL))).toEqual(RED);
    render(core, "#0000ff", FILL);
    expect(pixel(core.getCanvas(RenderFlags.RENDERFLAG_FILL))).toEqual(BLUE);
  });

  it("keeps the fill when a border render follows", () => {
    const core = makeCore();
    render(core, "#ff0000", FILL);
    render(core, "#00ff00", STROKE);
    expect(pixel(core.getCanvas(RenderFlags.RENDERFLAG_FILL))).toEqual(RED);
    expect(pixel(core.getCanvas(RenderFlags.RENDERFLAG_STROKE))).toEqual(GREEN);
    render(core, "#0000ff", FILL);
    expect(pixel(core.getCanvas(RenderFlags.RENDERFLAG_FILL))).toEqual(BLUE);
    expect(pixel(core.getCanvas(RenderFlags.RENDERFLAG_STROKE))).toEqual(GREEN);
  });

  it("keeps the fill when the core draws outside a render", () => {
    const core = makeCore();
    render(core, "#ff0000", FILL);
    core._ctx.fillRect(0, 0, 3, 3, "#0000ff");
    expect(pixel(core.getCanvas())).toEqual(BLUE);
    expect(pixel(core.getCanvas(RenderFlags.RENDERFLAG_FILL))).toEqual(RED);
  });

  it("keeps the fill when an exporter's copy renders a border", () => {
    const core = makeCore();
    render(core, "#ff0000", FILL);
    const copy = copyOf(core);
    render(copy, "#00ff00", STROKE);
    expect(pixel(core.getCanvas(RenderFlags.RENDERFLAG_FILL))).toEqual(RED);
    expect(pixel(copy.getCanvas(RenderFlags.RENDERFLAG_FILL))).toEqual(RED);
    expect(pixel(copy.getCanvas(RenderFlags.RENDERFLAG_STROKE))).toEqual(GREEN);
  });

  it("shares the fill with an exporter's copy made after the fill render", () => {
    const core = makeCore();
    render(core, "#ff0000", FILL);
    const copy = copyOf(core);
    render(copy, "#0000ff", FILL);
    // The old copy shared the fill canvas, so its fill render replaced it.
    expect(pixel(core.getCanvas(RenderFlags.RENDERFLAG_FILL))).toEqual(BLUE);
  });

  it("keeps two fills apart when the copy was made before the first fill render", () => {
    const core = makeCore();
    const copy = copyOf(core);
    render(core, "#ff0000", FILL);
    render(copy, "#0000ff", FILL);
    expect(pixel(core.getCanvas(RenderFlags.RENDERFLAG_FILL))).toEqual(RED);
    expect(pixel(copy.getCanvas(RenderFlags.RENDERFLAG_FILL))).toEqual(BLUE);
    render(core, "#00ff00", STROKE);
    expect(pixel(core.getCanvas(RenderFlags.RENDERFLAG_FILL))).toEqual(RED);
    expect(pixel(copy.getCanvas(RenderFlags.RENDERFLAG_FILL))).toEqual(BLUE);
  });
});
