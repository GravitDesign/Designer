// Old: public/pscore.js, systemdict srand … endcidrange: random numbers,
// rectangles, stroke, the show family, gsave/grestore, gstate objects and
// the CMap stubs.
import type { PSCore } from "../core.ts";
import type { GraphicsState, PSClipPath, PSPathSegment, PSValue } from "../objects.ts";
import { ShowMode } from "../show.ts";
import { colorHelper } from "./graphics-support.ts";
import { paintOperators } from "./graphics-paint.ts";

type Rect4 = [number, number, number, number];

/** A closed rectangle subpath in device space (moveto, three linetos, closepath). */
function rectanglePath(core: PSCore, [x, y, width, height]: Rect4): PSPathSegment[] {
  const start = core.CTM.transform(x, y);
  return [
    { type: "moveto", coord: start },
    { type: "lineto", coord: core.CTM.transform(x + width, y) },
    { type: "lineto", coord: core.CTM.transform(x + width, y + height) },
    { type: "lineto", coord: core.CTM.transform(x, y + height) },
    { type: "closepath", coord: { x: start.x, y: start.y } },
  ];
}

/**
 * Takes the rectangles of rectfill or rectstroke off the stack: four
 * numbers or an array of numbers (four per rectangle), for rectstroke
 * optionally followed by a matrix. Null after an error.
 */
function rectOperands(core: PSCore, matrix: boolean): Rect4[] | null {
  if (core.stackunderflowCheck(1)) return null;
  const isMatrix = (value: unknown) =>
    core.classes.isPSObject(value, "array") &&
    (value as { value: unknown[] }).value.length == 6 &&
    (value as { value: unknown[] }).value.every((v) => typeof v == "number");
  let skip = 0;
  if (matrix && isMatrix(core.stack[core.stack.length - 1])) {
    if (core.stackunderflowCheck(2)) return null;
    skip = 1;
  }
  const top = core.stack[core.stack.length - 1 - skip];
  if (core.classes.isPSObject(top, "array")) {
    const values = (top as { value: unknown[] }).value;
    if (values.length % 4 != 0 || values.some((v) => typeof v != "number")) {
      core.initiateError("typecheck");
      return null;
    }
    for (let i = 0; i <= skip; i++) core.stack.pop();
    const rects: Rect4[] = [];
    for (let i = 0; i < values.length; i += 4) rects.push(values.slice(i, i + 4) as Rect4);
    return rects;
  }
  if (core.stackunderflowCheck(4 + skip)) return null;
  if (!topAreNumbers(core, 1 + skip, 4 + skip)) return null;
  const n = core.stack.length - skip;
  const rect = core.stack.slice(n - 4, n) as Rect4;
  for (let i = 0; i < 4 + skip; i++) core.stack.pop();
  return [rect];
}

/** Checks that the top `count` operands are numbers (typecheck otherwise). */
function topAreNumbers(core: PSCore, from: number, to: number): boolean {
  for (let i = from; i <= to; i++) {
    if (typeof core.stack[core.stack.length - i] != "number") {
      core.initiateError("typecheck");
      return false;
    }
  }
  return true;
}

export const outputOperators = {
  srand(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    if (typeof this.stack[this.stack.length - 1] == "number") {
      this.seedNum = this.stack.pop() as number;
      this.m_z = 987654321;
    } else this.initiateError("typecheck");
  },

  rand(this: PSCore) {
    this.m_z = (36969 * (65535 & this.m_z) + (this.m_z >> 16)) & 4294967295;
    this.seedNum = (18e3 * (65535 & this.seedNum) + (this.seedNum >> 16)) & 4294967295;
    let random = ((this.m_z << 16) + this.seedNum) & 4294967295;
    random /= 4294967296;
    random += 0.5;
    this.stack.push(Math.round(random * ((1 << 31) - 1)));
  },

  rrand(this: PSCore) {
    this.stack.push(this.seedNum);
  },

  /**
   * Fills rectangles (x y width height, or an array of them) like a path of
   * them and fill, without touching the current path. The old operator
   * posted its user-space numbers to the page, which drew them without the
   * CTM (mirrored); rectstroke drew nothing and rectclip took its corners
   * from the current point ("rectfill mirrored, rectstroke missing,
   * rectclip wrong, dashes lost" in BUGS-FIXED.md).
   */
  rectfill(this: PSCore) {
    const rects = rectOperands(this, false);
    if (!rects) return;
    const saved = this.gstate.path;
    this.gstate.path = rects.map((r) => rectanglePath(this, r));
    paintOperators.fill.call(this);
    this.gstate.path = saved;
  },

  /** Strokes rectangles like rectfill fills them; an optional matrix is taken but not applied to the pen. */
  rectstroke(this: PSCore) {
    const rects = rectOperands(this, true);
    if (!rects) return;
    const saved = this.gstate.path;
    this.gstate.path = rects.map((r) => rectanglePath(this, r));
    outputOperators.stroke.call(this);
    this.gstate.path = saved;
  },

  /** Intersects the clip with a rectangle and clears the current path. */
  rectclip(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    const top = this.stack[this.stack.length - 1];
    if (this.classes.isPSObject(top, "array") || this.classes.isPSObject(top, "string")) {
      this.stack.pop();
      return;
    }
    if (this.stackunderflowCheck(4)) return;
    if (!topAreNumbers(this, 1, 4)) return;
    const x = this.stack[this.stack.length - 4] as number;
    const y = this.stack[this.stack.length - 3] as number;
    const width = this.stack[this.stack.length - 2] as number;
    const height = this.stack[this.stack.length - 1] as number;
    for (let i = 0; i < 4; i++) this.stack.pop();
    const gstate = this.gstate;
    const clip: PSClipPath = [rectanglePath(this, [x, y, width, height])];
    gstate.position = { x, y };
    // Sic: the id goes on the first subpath, not on the clip path.
    (clip[0] as PSPathSegment[] & { clipPathId?: number }).clipPathId = this.clipPathId;
    this.clipPathId++;
    gstate.clippingPath.push(clip);
    gstate.path = [];
  },

  setflat(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    if (typeof this.stack[this.stack.length - 1] == "number")
      this.gstate.flatness = this.stack.pop() as number;
    else this.initiateError("typecheck");
  },

  /**
   * Posts the current path (in device space) with the line width, dash
   * lengths and dash phase scaled by the CTM, as PostScript applies them
   * in user space. A border has one width, so a CTM that scales x and y
   * differently gives the geometric mean, sqrt(|det|). The old worker
   * scaled the width only with stroke adjustment on (by the length of the
   * mapped diagonal) and never the dashes ("Dashed EPS borders render
   * solid" in BUGS-FIXED.md).
   */
  stroke(this: PSCore) {
    const [a, b, c, d] = this.gstate.CTM as [number, number, number, number];
    const scale = Math.sqrt(Math.abs(a * d - b * c));
    const dash = this.gstate.dashPattern;
    this.toGravit("stroke", [
      this.gstate.path,
      colorHelper(this)._getGColor(this.gstate.colorSpace, this.gstate.color),
      this.gstate.lineWidth * scale,
      this.gstate.clippingPath,
      this.gstate.lineCap,
      this.gstate.lineJoin,
      this.gstate.strokeAdjustment,
      this.gstate.miterLimit,
      { arr: dash.arr.map((length) => length * scale), param: dash.param * scale },
    ]);
    this.gstate.path = [];
  },

  /** Sic: not implemented; the matrix test (`typeof x == "array"`) never holds, so one operand is dropped. */
  ustroke(this: PSCore) {
    if (this.stackunderflowCheck(1, "ustroke")) return;
    this.stack.pop();
  },

  awidthshow(this: PSCore) {
    this.fill$error();
    this._show(ShowMode.AWidthShow);
  },

  widthshow(this: PSCore) {
    this.fill$error();
    this._show(ShowMode.WidthShow);
  },

  show(this: PSCore) {
    this.fill$error();
    this._show(ShowMode.Show);
  },

  ashow(this: PSCore) {
    this.fill$error();
    this._show(ShowMode.AShow);
  },

  xshow(this: PSCore) {
    this.fill$error();
    this._show(ShowMode.XShow);
  },

  yshow(this: PSCore) {
    this.fill$error();
    this._show(ShowMode.YShow);
  },

  xyshow(this: PSCore) {
    this.fill$error();
    this._show(ShowMode.XYShow);
  },

  cshow(this: PSCore) {
    this.fill$error();
    this._show(ShowMode.CShow);
  },

  kshow(this: PSCore) {
    this.fill$error();
    this._show(ShowMode.KShow);
  },

  charpath(this: PSCore) {
    this.fill$error();
    this._show(ShowMode.CharPath);
  },

  stringwidth(this: PSCore) {
    this.fill$error();
    this._show(ShowMode.StringWidth);
  },

  showpage() {},

  gsave(this: PSCore) {
    this.gstack.push(this.classes.newObject("graphicsState", this.gstate));
  },

  /**
   * Returns to the saved state (the saved object itself, not a copy). The
   * entry stays on the stack while a save object on the operand stack
   * still refers to it.
   */
  grestore(this: PSCore) {
    if (this.gstack.length > 0) this.gstate = this.gstack[this.gstack.length - 1] as GraphicsState;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const entry = this.stack[i];
      if (
        this.classes.isPSObject(entry, "saveState") &&
        entry.value.graphicsState == this.gstack.length - 1
      )
        return;
    }
    this.gstack.pop();
  },

  gstate(this: PSCore) {
    this.stack.push(this.classes.newObject("gstate", this.gstate));
  },

  currentgstate(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "currentgstate")) return;
    const target = this.stack[this.stack.length - 1];
    if (this.classes.isPSObject(target, "gstate")) target.value = this.gstate;
    else this.initiateError("typecheck", "currentgstate");
  },

  begincmap() {},

  endcmap() {},

  begincodespacerange(this: PSCore) {
    this.codespacerangeCount = this.stack.pop();
  },

  endcodespacerange(this: PSCore) {
    for (let i = 0; i < (this.codespacerangeCount as number); i++) {
      this.stack.pop();
      this.stack.pop();
    }
  },

  begincidrange(this: PSCore) {
    this.cidrangeCount = this.stack.pop();
  },

  endcidrange(this: PSCore) {
    for (let i = 0; i < (this.cidrangeCount as number); i++) {
      this.stack.pop();
      this.stack.pop();
      this.stack.pop();
    }
  },
} satisfies Record<string, PSValue>;
