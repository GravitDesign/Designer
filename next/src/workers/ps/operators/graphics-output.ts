// Old: public/pscore.js, systemdict srand … endcidrange: random numbers,
// rectangles, stroke, the show family, gsave/grestore, gstate objects and
// the CMap stubs.
import type { PSCore } from "../core.ts";
import type { GraphicsState, PSClipPath, PSPathSegment, PSValue } from "../objects.ts";
import { ShowMode } from "../show.ts";
import { colorHelper, positionX, positionY } from "./graphics-support.ts";

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

  rectfill(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    const top = this.stack[this.stack.length - 1];
    if (this.classes.isPSObject(top, "array")) {
      // Sic: the array form is not implemented.
      this.stack.pop();
      return;
    }
    if (this.stackunderflowCheck(4)) return;
    if (!topAreNumbers(this, 1, 4)) return;
    const x = this.stack[this.stack.length - 4];
    const y = this.stack[this.stack.length - 3];
    const width = this.stack[this.stack.length - 2];
    const height = this.stack[this.stack.length - 1];
    for (let i = 0; i < 4; i++) this.stack.pop();
    this.toGravit("rectfill", [
      x,
      y,
      width,
      height,
      colorHelper(this)._getGColor(this.gstate.colorSpace, this.gstate.color),
    ]);
  },

  /** Sic: not implemented; checks and drops its operands. */
  rectstroke(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    let top = this.stack[this.stack.length - 1];
    if (this.classes.isPSObject(top, "array") && top.value.length != 6) {
      this.stack.pop();
      return;
    }
    if (this.stackunderflowCheck(2)) return;
    const matrix = this.stack[this.stack.length - 1];
    top = this.stack[this.stack.length - 2];
    let count = 4;
    if (this.classes.isPSObject(matrix, "array") && matrix.value.length == 6) {
      if (this.classes.isPSObject(top, "array")) {
        this.stack.pop();
        this.stack.pop();
        return;
      }
      if (this.stackunderflowCheck(5)) return;
      count = 5;
    }
    if (!topAreNumbers(this, 2, count)) return;
    for (let i = 0; i < count; i++) this.stack.pop();
  },

  /**
   * Intersects the clip with a rectangle. Sic: the corners after the first
   * are offset by the current point instead of x and y.
   */
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
    const clip: PSClipPath = [];
    clip.push([{ type: "moveto", coord: this.CTM.transform(x, y) }]);
    const subpath = clip[0] as PSPathSegment[];
    subpath.push({
      type: "lineto",
      coord: this.CTM.transform(width + positionX(this), positionY(this)),
    });
    subpath.push({
      type: "lineto",
      coord: this.CTM.transform(width + positionX(this), height + positionY(this)),
    });
    subpath.push({
      type: "lineto",
      coord: this.CTM.transform(positionX(this), height + positionY(this)),
    });
    const start = (subpath[0] as PSPathSegment).coord as { x: number; y: number };
    subpath.push({ type: "closepath", coord: { x: start.x, y: start.y } });
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

  stroke(this: PSCore) {
    let lineWidth = this.gstate.lineWidth;
    if (this.gstate.strokeAdjustment) lineWidth *= this.CTM.getScaleFactor(this.gstate.CTM);
    this.toGravit("stroke", [
      this.gstate.path,
      colorHelper(this)._getGColor(this.gstate.colorSpace, this.gstate.color),
      lineWidth,
      this.gstate.clippingPath,
      this.gstate.lineCap,
      this.gstate.lineJoin,
      this.gstate.strokeAdjustment,
      this.gstate.miterLimit,
      this.gstate.dashPattern,
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
