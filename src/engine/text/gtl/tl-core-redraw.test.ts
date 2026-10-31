// A fill render with `onlyChanged` draws only the lines that changed since
// the last such render (TLCore._planRedraw). These tests render a core,
// change it the ways an edit (or anything else) can, and check that the
// next render leaves the same pixels as a render of the whole text that
// starts from the same canvas, and that it draws fewer paths when it can.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RGBColor } from "../../color/rgb-color.ts";
import type { Context2D } from "../../paint/context-2d.ts";
import { installFakeCanvas, type FakeCanvas } from "../../paint/testing/fake-canvas.ts";
import { FontManager, type ResolveFontEvent } from "../fonts/font-manager.ts";
import { OpenTypeFont } from "../fonts/open-type-font.ts";
import { Formatting, type Run } from "./formatting.ts";
import type { Part } from "./inline.ts";
import { registerStylable } from "./late-bound.ts";
import { RenderFlags } from "./render-flags.ts";
import { TLCore, type TLRenderStyle } from "./tl-core.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(here, "../../../../assets/font");

const FILL = RenderFlags.RENDERFLAG_FILL | RenderFlags.RENDERFLAG_VERTEX;
const STROKE = RenderFlags.RENDERFLAG_STROKE | RenderFlags.RENDERFLAG_VERTEX;
const STYLE: TLRenderStyle = { shapePaint: null };

const TEXT =
  "The first paragraph wraps over a few lines, so that the edits in it move words.\n" +
  "A short one.\n" +
  "The last paragraph ends the text with a few more words, among them gypsy.";

let uninstall: () => void;

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

function colorCode(style: unknown): number {
  let code = 7;
  for (const char of String(style)) code = (code * 33 + char.charCodeAt(0)) % 1000003;
  return code;
}

/**
 * A 2D context that keeps a model of the pixels. A fill colours every
 * pixel inside the bounds of its path's points, rounded out (a canvas
 * colours no pixel outside them), and combines with what the pixel holds in
 * an order-dependent way: two renders give the same pixels only if the
 * same fills cover each pixel in the same order. clearRect clears the
 * pixels whose centres lie in the rectangle, as a canvas does without
 * antialiasing, and clip() keeps to the rectangles of the path.
 */
class PixelContext {
  pixels = new Float64Array(0);
  width = 0;
  height = 0;
  /** Fills and strokes since the count was last reset. */
  fills = 0;
  fillStyle: unknown = "#000000";
  strokeStyle: unknown = "#000000";
  font = "10px sans-serif";
  globalAlpha = 1;
  globalCompositeOperation = "source-over";
  lineWidth = 1;
  lineCap = "butt";
  lineJoin = "miter";
  miterLimit = 10;
  textAlign = "start";
  textBaseline = "alphabetic";
  _matrix = [1, 0, 0, 1, 0, 0];
  /** Each clip() adds the device rectangles of its path; a pixel must be in one of each. */
  _clips: number[][][] = [];
  /** The device bounds of each subpath of the current path ([minX, minY, maxX, maxY]). */
  _subpaths: number[][] = [];
  _stack: { matrix: number[]; clips: number[][][]; fillStyle: unknown }[] = [];

  constructor(readonly canvas: FakeCanvas) {
    this._sync();
  }

  /** A canvas whose size was set starts over, as a browser's does. */
  _sync(): void {
    if (this.canvas.width !== this.width || this.canvas.height !== this.height) {
      this.width = this.canvas.width;
      this.height = this.canvas.height;
      this.blank();
      this._matrix = [1, 0, 0, 1, 0, 0];
      this._clips = [];
      this._stack = [];
    }
  }

  blank(): void {
    this.pixels = new Float64Array(this.width * this.height);
  }

  _point(x: number, y: number): void {
    if (!this._subpaths.length) this._subpaths.push([Infinity, Infinity, -Infinity, -Infinity]);
    const [a, b, c, d, e, f] = this._matrix as [number, number, number, number, number, number];
    const px = a * x + c * y + e;
    const py = b * x + d * y + f;
    const bounds = this._subpaths[this._subpaths.length - 1] as number[];
    bounds[0] = Math.min(bounds[0] as number, px);
    bounds[1] = Math.min(bounds[1] as number, py);
    bounds[2] = Math.max(bounds[2] as number, px);
    bounds[3] = Math.max(bounds[3] as number, py);
  }

  _inClip(x: number, y: number): boolean {
    const cx = x + 0.5;
    const cy = y + 0.5;
    return this._clips.every((rects) =>
      rects.some(
        (r) =>
          cx > (r[0] as number) &&
          cx < (r[2] as number) &&
          cy > (r[1] as number) &&
          cy < (r[3] as number),
      ),
    );
  }

  _paint(bounds: number[], code: number): void {
    this._sync();
    this.fills++;
    const left = Math.max(0, Math.floor(bounds[0] as number));
    const top = Math.max(0, Math.floor(bounds[1] as number));
    const right = Math.min(this.width, Math.ceil(bounds[2] as number));
    const bottom = Math.min(this.height, Math.ceil(bounds[3] as number));
    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        if (!this._inClip(x, y)) continue;
        const i = y * this.width + x;
        this.pixels[i] = ((this.pixels[i] as number) * 31 + code) % 2147483647;
      }
    }
  }

  _pathBounds(): number[] | null {
    const all = [Infinity, Infinity, -Infinity, -Infinity];
    for (const bounds of this._subpaths) {
      all[0] = Math.min(all[0] as number, bounds[0] as number);
      all[1] = Math.min(all[1] as number, bounds[1] as number);
      all[2] = Math.max(all[2] as number, bounds[2] as number);
      all[3] = Math.max(all[3] as number, bounds[3] as number);
    }
    return Infinity === all[0] ? null : all;
  }

  save(): void {
    this._sync();
    this._stack.push({
      matrix: this._matrix.slice(),
      clips: this._clips.slice(),
      fillStyle: this.fillStyle,
    });
  }
  restore(): void {
    this._sync();
    const state = this._stack.pop();
    if (state) {
      this._matrix = state.matrix;
      this._clips = state.clips;
      this.fillStyle = state.fillStyle;
    }
  }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this._sync();
    this._matrix = [a, b, c, d, e, f];
  }
  beginPath(): void {
    this._subpaths = [];
  }
  moveTo(x: number, y: number): void {
    this._subpaths.push([Infinity, Infinity, -Infinity, -Infinity]);
    this._point(x, y);
  }
  lineTo(x: number, y: number): void {
    this._point(x, y);
  }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    this._point(cx, cy);
    this._point(x, y);
  }
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    this._point(c1x, c1y);
    this._point(c2x, c2y);
    this._point(x, y);
  }
  closePath(): void {}
  clip(): void {
    this._sync();
    this._clips = this._clips.concat([this._subpaths.map((bounds) => bounds.slice())]);
  }
  fill(): void {
    const bounds = this._pathBounds();
    if (bounds) this._paint(bounds, colorCode(this.fillStyle));
  }
  stroke(): void {
    const bounds = this._pathBounds();
    if (bounds) {
      const reach = Math.ceil(this.lineWidth);
      this._paint(
        [
          (bounds[0] as number) - reach,
          (bounds[1] as number) - reach,
          (bounds[2] as number) + reach,
          (bounds[3] as number) + reach,
        ],
        colorCode(this.strokeStyle) + 1,
      );
    }
  }
  fillRect(x: number, y: number, w: number, h: number): void {
    this.beginPath();
    this.moveTo(x, y);
    this.lineTo(x + w, y + h);
    this.fill();
  }
  clearRect(x: number, y: number, w: number, h: number): void {
    this._sync();
    const [a, , , d, e, f] = this._matrix as [number, number, number, number, number, number];
    const left = Math.min(a * x + e, a * (x + w) + e);
    const right = Math.max(a * x + e, a * (x + w) + e);
    const top = Math.min(d * y + f, d * (y + h) + f);
    const bottom = Math.max(d * y + f, d * (y + h) + f);
    for (let row = 0; row < this.height; row++) {
      for (let column = 0; column < this.width; column++) {
        const cx = column + 0.5;
        const cy = row + 0.5;
        if (cx > left && cx <= right && cy > top && cy <= bottom && this._inClip(column, row)) {
          this.pixels[row * this.width + column] = 0;
        }
      }
    }
  }

  snapshot(): { pixels: Float64Array; width: number; height: number } {
    this._sync();
    return { pixels: this.pixels.slice(), width: this.width, height: this.height };
  }
}

interface Fixture {
  core: TLCore;
  pixels: PixelContext;
  manager: FontManager;
}

function makeCore(runs: Run[], width = 260): Fixture {
  const manager = makeFontManager();
  const core = new TLCore();
  core.initialize(1, 1, manager, () => {});
  core.setText(runs);
  core.setWidth(width);
  core.setHeight(TLCore.AUTO);
  const pixels = new PixelContext(core.getCanvas() as unknown as FakeCanvas);
  core._ctx.$canvasContext = pixels as unknown as Context2D;
  return { core, pixels, manager };
}

function plainText(text = TEXT, extra?: Run): Fixture {
  return makeCore([
    { fontFamily: "Open Sans", fontSize: 18, fontColor: "#202020", text, ...extra },
  ]);
}

function render(fixture: Fixture, onlyChanged: boolean, style = STYLE, scale = 1): void {
  const flags = 1 === scale ? FILL : FILL | RenderFlags.RENDERFLAG_SCALEBITMAP;
  fixture.core.render(true, scale, style, flags, onlyChanged);
}

/**
 * Renders the whole text until its parts keep their path calls, then
 * records it (from the kept calls).
 */
function settle(fixture: Fixture): void {
  for (let i = 0; i < 3; i++) render(fixture, false);
  render(fixture, true);
}

/**
 * Renders with `onlyChanged`, then the whole text from the pixels and the
 * transform the first render started from (a blank canvas when the first
 * one changed its size).
 */
function renderBothWays(
  fixture: Fixture,
  style = STYLE,
  scale = 1,
): {
  before: Float64Array;
  partial: Float64Array;
  whole: Float64Array;
  drawn: number;
  all: number;
} {
  const { core, pixels } = fixture;
  const start = pixels.snapshot();
  const transform = core._ctx._transform;
  pixels.fills = 0;
  render(fixture, true, style, scale);
  const partial = pixels.snapshot();
  const drawn = pixels.fills;
  if (partial.width === start.width && partial.height === start.height) {
    pixels.pixels = start.pixels.slice();
  } else {
    pixels.blank();
  }
  core._ctx._transform = transform;
  pixels.fills = 0;
  render(fixture, false, style, scale);
  const whole = pixels.snapshot();
  expect([whole.width, whole.height]).toEqual([partial.width, partial.height]);
  return {
    before: start.pixels,
    partial: partial.pixels,
    whole: whole.pixels,
    drawn,
    all: pixels.fills,
  };
}

function parts(core: TLCore): Part[] {
  return core._doc.words.flatMap((word) => [...word.text.parts, ...word.space.parts]);
}

function same(a: Float64Array, b: Float64Array): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
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
});

afterAll(() => {
  uninstall();
});

describe("TLCore render of the changed lines", () => {
  it("draws only the lines an edit changed, with the pixels of a whole render", () => {
    const fixture = plainText();
    settle(fixture);
    fixture.core.select(TEXT.indexOf("short"));
    fixture.core.insert("very ");
    const { before, partial, whole, drawn, all } = renderBothWays(fixture);
    expect(same(whole, before)).toBe(false);
    expect(same(partial, whole)).toBe(true);
    expect(drawn).toBeGreaterThan(0);
    expect(drawn).toBeLessThan(all);
  });

  it("splits and joins paragraphs like a whole render", () => {
    const fixture = plainText();
    // A fixed height, so that the canvas keeps its size.
    fixture.core.setHeight(fixture.core.getHeight() + 60);
    settle(fixture);
    fixture.core.select(TEXT.indexOf("short"));
    fixture.core.insert("\n");
    let result = renderBothWays(fixture);
    expect(same(result.whole, result.before)).toBe(false);
    expect(same(result.partial, result.whole)).toBe(true);
    expect(result.drawn).toBeLessThan(result.all);
    render(fixture, true);
    const end = TEXT.indexOf("\nA short");
    fixture.core.getRange(end, end + 1)?.clear();
    result = renderBothWays(fixture);
    expect(same(result.whole, result.before)).toBe(false);
    expect(same(result.partial, result.whole)).toBe(true);
    expect(result.drawn).toBeLessThan(result.all);
  });

  it("draws underline and strikeout over lines like a whole render", () => {
    const fixture = plainText();
    settle(fixture);
    fixture.core.getRange(10, 60)?.setFormatting("underline", true);
    let result = renderBothWays(fixture);
    expect(same(result.whole, result.before)).toBe(false);
    expect(same(result.partial, result.whole)).toBe(true);
    expect(result.drawn).toBeLessThan(result.all);
    render(fixture, true);
    fixture.core.getRange(40, 70)?.setFormatting("strikeout", true);
    result = renderBothWays(fixture);
    expect(same(result.whole, result.before)).toBe(false);
    expect(same(result.partial, result.whole)).toBe(true);
  });

  it("draws the neighbours whose paths reach into the changed rows", () => {
    // Lines this close overlap, so the rows of a changed line hold paths
    // of the lines around it.
    const fixture = plainText(TEXT, { lineSpacing: 0.6 });
    settle(fixture);
    fixture.core.select(TEXT.indexOf("short"));
    fixture.core.insert("x");
    const { before, partial, whole } = renderBothWays(fixture);
    expect(same(whole, before)).toBe(false);
    expect(same(partial, whole)).toBe(true);
  });

  it("draws a line whose run changed in place", () => {
    const fixture = plainText();
    settle(fixture);
    // The inspector can change the run a part holds without a new layout.
    const part = parts(fixture.core).find((candidate) => "short" === candidate.run.text) as Part;
    part.run.charSpacing = 3;
    const { before, partial, whole, drawn, all } = renderBothWays(fixture);
    expect(same(whole, before)).toBe(false);
    expect(same(partial, whole)).toBe(true);
    expect(drawn).toBeGreaterThan(0);
    expect(drawn).toBeLessThan(all);
  });

  it("draws every line again with a font that replaced the old one", () => {
    const fixture = plainText();
    settle(fixture);
    const light = OpenTypeFont.create(
      "Open Sans",
      "N",
      400,
      readFont("OpenSans-Light.ttf"),
    ) as OpenTypeFont;
    fixture.manager._fonts.splice(0, 1, light);
    fixture.manager.setDefaultFont(light);
    const { partial, whole, drawn, all } = renderBothWays(fixture);
    expect(same(partial, whole)).toBe(true);
    expect(drawn).toBe(all);
  });

  it("draws every line again when the default it falls back to changed", () => {
    // No size in the run: it draws at the default size.
    const fixture = makeCore([{ fontFamily: "Open Sans", fontColor: "#202020", text: TEXT }]);
    settle(fixture);
    const defaults = Formatting.defaultFormatting;
    const size = defaults.fontSize;
    defaults.fontSize = size + 10;
    try {
      const { before, partial, whole, drawn, all } = renderBothWays(fixture);
      expect(same(whole, before)).toBe(false);
      expect(same(partial, whole)).toBe(true);
      expect(drawn).toBe(all);
    } finally {
      defaults.fontSize = size;
    }
  });

  // Texts whose content was parsed (files, undo) hold their colors as
  // objects, which drawText turns into a fill per part.
  it("draws only the changed lines of a text whose colors are objects", () => {
    const fixture = makeCore([
      { fontFamily: "Open Sans", fontSize: 18, fontColor: new RGBColor([32, 32, 32]), text: TEXT },
    ]);
    settle(fixture);
    fixture.core.select(TEXT.indexOf("short"));
    fixture.core.insert("very ");
    const { before, partial, whole, drawn, all } = renderBothWays(fixture);
    expect(same(whole, before)).toBe(false);
    expect(same(partial, whole)).toBe(true);
    expect(drawn).toBeGreaterThan(0);
    expect(drawn).toBeLessThan(all);
  });

  it("draws the lines of a color object that changed in place or was replaced", () => {
    const color = new RGBColor([32, 32, 32]);
    const fixture = makeCore([
      { fontFamily: "Open Sans", fontSize: 18, fontColor: color, text: TEXT },
    ]);
    settle(fixture);
    // The same object with another value: every line fills with it.
    (color as unknown as { _value: number[] })._value[0] = 200;
    let result = renderBothWays(fixture);
    expect(same(result.whole, result.before)).toBe(false);
    expect(same(result.partial, result.whole)).toBe(true);
    expect(result.drawn).toBe(result.all);
    render(fixture, true);
    // Another object in the run of one part.
    const part = parts(fixture.core).find((candidate) => "short" === candidate.run.text) as Part;
    part.run.fontColor = new RGBColor([0, 0, 200]);
    result = renderBothWays(fixture);
    expect(same(result.whole, result.before)).toBe(false);
    expect(same(result.partial, result.whole)).toBe(true);
    expect(result.drawn).toBeGreaterThan(0);
    expect(result.drawn).toBeLessThan(result.all);
  });

  it("draws everything again for another fill", () => {
    const fixture = plainText();
    settle(fixture);
    const red: TLRenderStyle = { shapePaint: "#ff0000" };
    const { before, partial, whole, drawn, all } = renderBothWays(fixture, red);
    expect(same(whole, before)).toBe(false);
    expect(same(partial, whole)).toBe(true);
    expect(drawn).toBe(all);
  });

  it("draws everything again when vertical alignment moves the text", () => {
    const fixture = plainText();
    fixture.core.setHeight(fixture.core.getHeight() + 30);
    settle(fixture);
    const bottom: TLRenderStyle = { shapePaint: null, valign: "b" };
    const { before, partial, whole, drawn, all } = renderBothWays(fixture, bottom);
    expect(same(whole, before)).toBe(false);
    expect(same(partial, whole)).toBe(true);
    expect(drawn).toBe(all);
  });

  it("draws everything again at another scale or width", () => {
    const fixture = plainText();
    settle(fixture);
    let result = renderBothWays(fixture, STYLE, 2);
    expect(same(result.partial, result.whole)).toBe(true);
    expect(result.drawn).toBe(result.all);
    settle(fixture);
    fixture.core.setWidth(200);
    result = renderBothWays(fixture);
    expect(same(result.partial, result.whole)).toBe(true);
    expect(result.drawn).toBe(result.all);
  });

  it("starts over after a border render or a draw into the canvas", () => {
    const fixture = plainText();
    settle(fixture);
    fixture.core.render(true, 1, { shapePaint: "#00ff00", strokeWidth: 2 }, STROKE);
    fixture.core.select(TEXT.indexOf("short"));
    fixture.core.insert("y");
    let result = renderBothWays(fixture);
    expect(same(result.partial, result.whole)).toBe(true);
    expect(result.drawn).toBe(result.all);
    settle(fixture);
    fixture.core._ctx.fillRect(0, 0, 40, 40, "#0000ff");
    fixture.core.insert("z");
    result = renderBothWays(fixture);
    expect(same(result.partial, result.whole)).toBe(true);
    expect(result.drawn).toBe(result.all);
  });

  it("draws again the lines in a last row the whole clear leaves", () => {
    // A fixed height that cuts through the last line, a fifth of a pixel
    // into the last row: the whole clear rounds that row away, and every
    // whole render draws over it.
    const fixture = plainText();
    const { core, pixels } = fixture;
    const height = Math.floor(core.getHeight()) - 7.8;
    core.setHeight(height);
    settle(fixture);
    const last = pixels.snapshot();
    const lastRow = last.pixels.subarray((last.height - 1) * last.width);
    expect(lastRow.some((value) => 0 !== value)).toBe(true);
    expect(height).toBeLessThan(last.height - 0.5);
    // Without an edit, the lines in that row are drawn again.
    const rows = core.changedRows(1, STYLE, FILL) as number[];
    expect(rows[rows.length - 1]).toBe(last.height);
    const { before, partial, whole, drawn, all } = renderBothWays(fixture);
    expect(same(whole, before)).toBe(false);
    expect(same(partial, whole)).toBe(true);
    expect(drawn).toBeLessThan(all);
  });

  it("measures a line again when it changed after the last plan", () => {
    // The last paragraph has another color, so where the changed line
    // paints over its first line, the order of the two shows in the pixels.
    const last = TEXT.indexOf("The last");
    const fixture = makeCore([
      { fontFamily: "Open Sans", fontSize: 18, fontColor: "#202020", text: TEXT.slice(0, last) },
      { fontFamily: "Open Sans", fontSize: 18, fontColor: "#2020c0", text: TEXT.slice(last) },
    ]);
    settle(fixture);
    const { core } = fixture;
    core.select(TEXT.indexOf("short"));
    core.insert("y");
    // A repaint plans first, and measures the changed line...
    expect(core.changedRows(1, STYLE, FILL)?.length).toBeGreaterThan(0);
    // ...then that line changes again before the render, keeping its
    // baseline and the places of its words: its run grows in place, and
    // the tail of the "y" reaches into the first line of the last
    // paragraph. The 18px measure from the plan doesn't reach that line,
    // so only a new measure draws it again after the changed line, as a
    // whole render does.
    const part = parts(core).find((candidate) => "yshort" === candidate.run.text) as Part;
    part.run.fontSize = 80;
    const { before, partial, whole, drawn, all } = renderBothWays(fixture);
    expect(same(whole, before)).toBe(false);
    expect(same(partial, whole)).toBe(true);
    expect(drawn).toBeLessThan(all);
  });

  it("tells which rows change: none, some, or all without a fitting record", () => {
    // A whole number of pixels high, so no line is drawn at every render.
    const fixture = makeCore([{ fontFamily: "Open Sans", fontSize: 18, text: "Hi" }], 100);
    const { core } = fixture;
    core.setHeight(40);
    expect(core.changedRows(1, STYLE, FILL)).toBeNull();
    render(fixture, true);
    expect(core.changedRows(1, STYLE, FILL)).toEqual([]);
    core.select(2);
    core.insert("s");
    const rows = core.changedRows(1, STYLE, FILL) as number[];
    expect(rows.length).toBe(2);
    expect(rows[0]).toBeLessThan(rows[1] as number);
    expect(core.changedRows(1, { shapePaint: "#ff0000" }, FILL)).toBeNull();
    expect(core.changedRows(2, STYLE, FILL | RenderFlags.RENDERFLAG_SCALEBITMAP)).toBeNull();
    render(fixture, false);
    expect(core.changedRows(1, STYLE, FILL)).toBeNull();
  });
});
