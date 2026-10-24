// Old: chunk.vendor.js module 987 (opentype.js hintingtt.js).
// A TrueType bytecode interpreter that grid-fits glyph outlines.
//
// Gravit changes:
// - The x and y axis vectors and UnitVector.setRelative throw "Wrong slope ..."
//   instead of producing Infinity/NaN coordinates when the freedom and
//   projection vectors make the move impossible.
// - MDAP and ALIGNRP retry with the dual projection vector when that throws
//   and keep using it for the rest of the state ("microsoftWorkaround").
// - MIAP moves by the CVT value when the measured distance is 0.
// - initTZone works without a glyph zone (empty twilight zone).
// - skip (IF/ELSE scanning) stops at the end of the program instead of
//   running past it.
// The old module also has the upstream DEBUG logging, but its DEBUG flag sits
// on an exports object that is replaced, so it can never be on; the port
// leaves the logging out.

import type { Font } from "./font.ts";
import * as glyf from "./tables/glyf.ts";

/** The glyph fields the interpreter reads. */
export interface HintableGlyph {
  points?: readonly HintableGlyphPoint[];
  advanceWidth?: number;
  components?: readonly HintableComponent[];
  instructions?: number[];
}

export interface HintableGlyphPoint {
  x: number;
  y: number;
  lastPointOfContour?: boolean;
  onCurve?: boolean;
}

export interface HintableComponent {
  glyphIndex: number;
  dx?: number;
  dy?: number;
}

type RoundFn = (this: State, v: number) => number;

/** A freedom or projection vector: one of the two axes or a free unit vector. */
interface Vector {
  readonly x: number;
  readonly y: number;
  readonly axis: "x" | "y" | undefined;
  readonly slope: number;
  readonly normalSlope: number;
  distance(p1: HPoint, p2: HPoint, o1?: boolean, o2?: boolean): number;
  interpolate(p: HPoint, rp1: HPoint, rp2: HPoint, pv: Vector): void;
  setRelative(p: HPoint, rp: HPoint, d: number, pv?: Vector, org?: boolean): void;
  touch(p: HPoint): void;
}

interface AxisVector extends Vector {
  touched(p: HPoint): boolean;
  untouch(p: HPoint): void;
}

/** Interpreter state. States chain through their prototypes: glyph -> prep -> fpgm -> defaults. */
interface State {
  env: string;
  stack: number[];
  prog: number[] | undefined;
  ip: number;
  zp0: number;
  zp1: number;
  zp2: number;
  rp0: number;
  rp1: number;
  rp2: number;
  fv: Vector;
  pv: Vector;
  dpv: Vector;
  round: RoundFn;
  cvCutIn: number;
  deltaBase: number;
  deltaShift: number;
  loop: number;
  minDis: number;
  autoFlip: boolean;
  funcs: number[][];
  font: Font;
  ppem: number;
  cvt: number[];
  gZone: HPoint[];
  tZone: HPoint[] | undefined;
  z0: HPoint[];
  z1: HPoint[];
  z2: HPoint[];
  contours: number[];
  store: number[] | undefined;
  srPeriod: number;
  srPhase: number;
  srThreshold: number;
  inhibitGridFit: boolean | undefined;
  ignoreCvt: boolean | undefined;
  /** Gravit: use the dual projection vector in MDAP and ALIGNRP. */
  microsoftWorkaround: boolean | undefined;
}

type Instruction = (state: State) => void;

function pop(stack: number[]): number {
  return stack.pop() as number;
}

function roundOff(v: number): number {
  return v;
}

function roundToGrid(v: number): number {
  return Math.sign(v) * Math.round(Math.abs(v));
}

function roundToDoubleGrid(v: number): number {
  return (Math.sign(v) * Math.round(Math.abs(v * 2))) / 2;
}

function roundToHalfGrid(v: number): number {
  return Math.sign(v) * (Math.round(Math.abs(v) + 0.5) - 0.5);
}

function roundUpToGrid(v: number): number {
  return Math.sign(v) * Math.ceil(Math.abs(v));
}

function roundDownToGrid(v: number): number {
  return Math.sign(v) * Math.floor(Math.abs(v));
}

/** Super rounding (SROUND, S45ROUND) with the state's period, phase and threshold. */
const roundSuper: RoundFn = function (v) {
  const period = this.srPeriod;
  const phase = this.srPhase;
  let sign = 1;
  if (v < 0) {
    v = -v;
    sign = -1;
  }
  v += this.srThreshold - phase;
  v = Math.trunc(v / period) * period;
  v += phase;
  if (v < 0) return phase * sign;
  return v * sign;
};

const xUnitVector: AxisVector = {
  x: 1,
  y: 0,
  axis: "x",

  distance(p1, p2, o1, o2) {
    return (o1 ? p1.xo : p1.x) - (o2 ? p2.xo : p2.x);
  },

  // Moves p so its relation to rp1 and rp2 stays as it was in the original outline.
  interpolate(p, rp1, rp2, pv) {
    if (!pv || pv === this) {
      const do1 = p.xo - rp1.xo;
      const do2 = p.xo - rp2.xo;
      const dm1 = rp1.x - rp1.xo;
      const dm2 = rp2.x - rp2.xo;
      const doa1 = Math.abs(do1);
      const doa2 = Math.abs(do2);
      const dt = doa1 + doa2;
      if (dt === 0) {
        p.x = p.xo + (dm1 + dm2) / 2;
        return;
      }
      p.x = p.xo + (dm1 * doa2 + dm2 * doa1) / dt;
      return;
    }
    const do1 = pv.distance(p, rp1, true, true);
    const do2 = pv.distance(p, rp2, true, true);
    const dm1 = pv.distance(rp1, rp1, false, true);
    const dm2 = pv.distance(rp2, rp2, false, true);
    const doa1 = Math.abs(do1);
    const doa2 = Math.abs(do2);
    const dt = doa1 + doa2;
    if (dt !== 0) {
      xUnitVector.setRelative(p, p, (dm1 * doa2 + dm2 * doa1) / dt, pv, true);
    } else {
      xUnitVector.setRelative(p, p, (dm1 + dm2) / 2, pv, true);
    }
  },

  normalSlope: Number.NEGATIVE_INFINITY,

  // Moves p along x so its distance to rp measured on pv is d.
  setRelative(p, rp, d, pv, org) {
    if (pv && pv !== this) {
      // Gravit change: a projection vector along y can't be reached by moving along x.
      if (pv.normalSlope === 0) throw new Error("Wrong slope in axis x");
      const rpx = org ? rp.xo : rp.x;
      const rpy = org ? rp.yo : rp.y;
      const rpdx = rpx + d * pv.x;
      const rpdy = rpy + d * pv.y;
      p.x = rpdx + (p.y - rpdy) / pv.normalSlope;
    } else {
      p.x = (org ? rp.xo : rp.x) + d;
    }
  },

  slope: 0,

  touch(p) {
    p.xTouched = true;
  },

  touched(p) {
    return p.xTouched;
  },

  untouch(p) {
    p.xTouched = false;
  },
};

const yUnitVector: AxisVector = {
  x: 0,
  y: 1,
  axis: "y",

  distance(p1, p2, o1, o2) {
    return (o1 ? p1.yo : p1.y) - (o2 ? p2.yo : p2.y);
  },

  interpolate(p, rp1, rp2, pv) {
    if (!pv || pv === this) {
      const do1 = p.yo - rp1.yo;
      const do2 = p.yo - rp2.yo;
      const dm1 = rp1.y - rp1.yo;
      const dm2 = rp2.y - rp2.yo;
      const doa1 = Math.abs(do1);
      const doa2 = Math.abs(do2);
      const dt = doa1 + doa2;
      if (dt === 0) {
        p.y = p.yo + (dm1 + dm2) / 2;
        return;
      }
      p.y = p.yo + (dm1 * doa2 + dm2 * doa1) / dt;
      return;
    }
    const do1 = pv.distance(p, rp1, true, true);
    const do2 = pv.distance(p, rp2, true, true);
    const dm1 = pv.distance(rp1, rp1, false, true);
    const dm2 = pv.distance(rp2, rp2, false, true);
    const doa1 = Math.abs(do1);
    const doa2 = Math.abs(do2);
    const dt = doa1 + doa2;
    if (dt !== 0) {
      yUnitVector.setRelative(p, p, (dm1 * doa2 + dm2 * doa1) / dt, pv, true);
    } else {
      yUnitVector.setRelative(p, p, (dm1 + dm2) / 2, pv, true);
    }
  },

  normalSlope: 0,

  setRelative(p, rp, d, pv, org) {
    if (pv && pv !== this) {
      // Gravit change: a projection vector along x can't be reached by moving along y.
      if (!isFinite(pv.normalSlope)) throw new Error("Wrong slope in axis y");
      const rpx = org ? rp.xo : rp.x;
      const rpy = org ? rp.yo : rp.y;
      const rpdx = rpx + d * pv.x;
      const rpdy = rpy + d * pv.y;
      p.y = rpdy + pv.normalSlope * (p.x - rpdx);
    } else {
      p.y = (org ? rp.yo : rp.y) + d;
    }
  },

  slope: Number.POSITIVE_INFINITY,

  touch(p) {
    p.yTouched = true;
  },

  touched(p) {
    return p.yTouched;
  },

  untouch(p) {
    p.yTouched = false;
  },
};

Object.freeze(xUnitVector);
Object.freeze(yUnitVector);

/** A freedom or projection vector that is not one of the axes. */
class UnitVector implements Vector {
  readonly x: number;
  readonly y: number;
  readonly axis = undefined;
  readonly slope: number;
  readonly normalSlope: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.slope = y / x;
    this.normalSlope = -x / y;
    Object.freeze(this);
  }

  distance(p1: HPoint, p2: HPoint, o1?: boolean, o2?: boolean): number {
    return (
      this.x * xUnitVector.distance(p1, p2, o1, o2) + this.y * yUnitVector.distance(p1, p2, o1, o2)
    );
  }

  interpolate(p: HPoint, rp1: HPoint, rp2: HPoint, pv: Vector): void {
    const do1 = pv.distance(p, rp1, true, true);
    const do2 = pv.distance(p, rp2, true, true);
    const dm1 = pv.distance(rp1, rp1, false, true);
    const dm2 = pv.distance(rp2, rp2, false, true);
    const doa1 = Math.abs(do1);
    const doa2 = Math.abs(do2);
    const dt = doa1 + doa2;
    if (dt !== 0) {
      this.setRelative(p, p, (dm1 * doa2 + dm2 * doa1) / dt, pv, true);
    } else {
      this.setRelative(p, p, (dm1 + dm2) / 2, pv, true);
    }
  }

  /** Moves p along this vector so its distance to rp measured on pv is d. */
  setRelative(p: HPoint, rp: HPoint, d: number, pv?: Vector, org?: boolean): void {
    pv = pv || this;
    const rpx = org ? rp.xo : rp.x;
    const rpy = org ? rp.yo : rp.y;
    const rpdx = rpx + d * pv.x;
    const rpdy = rpy + d * pv.y;
    const pvns = pv.normalSlope;
    const fvs = this.slope;
    const slopeDifference = fvs - pvns;
    const px = p.x;
    const py = p.y;
    // Gravit change: parallel or degenerate vectors throw instead of giving NaN.
    if (!isFinite(fvs) || !isFinite(pvns) || slopeDifference === 0) {
      throw new Error("Wrong slope in unit vector");
    }
    p.x = (fvs * px - pvns * rpdx + rpdy - py) / slopeDifference;
    p.y = fvs * (p.x - px) + py;
  }

  touch(p: HPoint): void {
    p.xTouched = true;
    p.yTouched = true;
  }
}

/** The unit vector along x,y; the axis vectors when it lies on an axis. */
function getUnitVector(x: number, y: number): Vector {
  const d = Math.sqrt(x * x + y * y);
  x /= d;
  y /= d;
  if (x === 1 && y === 0) return xUnitVector;
  else if (x === 0 && y === 1) return yUnitVector;
  else return new UnitVector(x, y);
}

/** A point being hinted: current x/y and original xo/yo, snapped to 1/64 pixel. */
export class HPoint {
  x: number;
  y: number;
  xo: number;
  yo: number;
  lastPointOfContour: boolean | undefined;
  onCurve: boolean | undefined;
  prevPointOnContour: HPoint | undefined;
  nextPointOnContour: HPoint | undefined;
  xTouched: boolean;
  yTouched: boolean;

  constructor(x: number, y: number, lastPointOfContour?: boolean, onCurve?: boolean) {
    this.x = this.xo = Math.round(x * 64) / 64;
    this.y = this.yo = Math.round(y * 64) / 64;
    this.lastPointOfContour = lastPointOfContour;
    this.onCurve = onCurve;
    this.prevPointOnContour = undefined;
    this.nextPointOnContour = undefined;
    this.xTouched = false;
    this.yTouched = false;
    Object.preventExtensions(this);
  }

  /** The next point on the contour touched along v, or this point. */
  nextTouched(v: AxisVector): HPoint {
    let p = this.nextPointOnContour as HPoint;
    while (!v.touched(p) && p !== this) p = p.nextPointOnContour as HPoint;
    return p;
  }

  /** The previous point on the contour touched along v, or this point. */
  prevTouched(v: AxisVector): HPoint {
    let p = this.prevPointOnContour as HPoint;
    while (!v.touched(p) && p !== this) p = p.prevPointOnContour as HPoint;
    return p;
  }
}

const HPZero = Object.freeze(new HPoint(0, 0));

/** The graphics state defaults at the root of every state's prototype chain. */
const defaultState = {
  cvCutIn: 17 / 16,
  deltaBase: 9,
  deltaShift: 0.125,
  loop: 1,
  minDis: 1,
  autoFlip: true,
};

/**
 * Creates a state that inherits everything it doesn't set from parent, as
 * the old `State.prototype = parent; new State(env, prog)`.
 */
function createState(parent: object, env: string, prog: number[] | undefined): State {
  const state = Object.create(parent) as State;
  state.env = env;
  state.stack = [];
  state.prog = prog;
  // glyf sets the zone and reference pointers and then, like prep, the vectors and rounding.
  if (env === "glyf") {
    state.zp0 = state.zp1 = state.zp2 = 1;
    state.rp0 = state.rp1 = state.rp2 = 0;
  }
  if (env === "glyf" || env === "prep") {
    state.fv = state.pv = state.dpv = xUnitVector;
    state.round = roundToGrid;
  }
  return state;
}

/** Grid-fits TrueType glyphs by running the font's fpgm, prep and glyph programs. */
export class HintingTrueType {
  font: Font;
  private _fpgmState: State | undefined;
  private _prepState: State | undefined;
  /** 0: fine, 1: a glyph failed, 2: prep failed, 3: fpgm failed (no more hinting). */
  private _errorState: number;

  constructor(font: Font) {
    this.font = font;
    this._fpgmState = this._prepState = undefined;
    this._errorState = 0;
  }

  /** The path commands of hinted points. */
  getCommands(hintedPoints: HPoint[]): ReturnType<typeof glyf.getPath>["commands"] {
    return glyf.getPath(hintedPoints as unknown as Parameters<typeof glyf.getPath>[0]).commands;
  }

  /**
   * Hints the glyph at ppem pixels per em and returns its points, or
   * undefined when hinting failed. Errors are logged once and then silenced.
   */
  exec(glyph: HintableGlyph, ppem: number): HPoint[] | undefined {
    if (typeof ppem !== "number") {
      throw new Error("Point size is not a number!");
    }
    if (this._errorState > 2) return undefined;

    const font = this.font;
    let prepState = this._prepState;
    if (!prepState || prepState.ppem !== ppem) {
      let fpgmState = this._fpgmState;
      if (!fpgmState) {
        fpgmState = this._fpgmState = createState(defaultState, "fpgm", font.tables.fpgm);
        fpgmState.funcs = [];
        fpgmState.font = font;
        try {
          exec(fpgmState);
        } catch (e) {
          console.log("Hinting error in FPGM:" + e);
          this._errorState = 3;
          return undefined;
        }
      }

      prepState = this._prepState = createState(fpgmState, "prep", font.tables.prep);
      prepState.ppem = ppem;

      // The CVT is scaled to pixels once per ppem.
      const oCvt = font.tables.cvt;
      if (oCvt) {
        const cvt = (prepState.cvt = new Array<number>(oCvt.length));
        const scale = ppem / font.unitsPerEm;
        for (let c = 0; c < oCvt.length; c++) {
          cvt[c] = (oCvt[c] as number) * scale;
        }
      } else {
        prepState.cvt = [];
      }

      try {
        exec(prepState);
      } catch (e) {
        if (this._errorState < 2) {
          console.log("Hinting error in PREP:" + e);
        }
        this._errorState = 2;
      }
    }

    if (this._errorState > 1) return undefined;

    try {
      return execGlyph(glyph, prepState);
    } catch (e) {
      if (this._errorState < 1) {
        console.log("Hinting error:" + e);
        console.log("Note: further hinting errors are silenced");
      }
      this._errorState = 1;
      return undefined;
    }
  }
}

/** Hints a simple or composite glyph; returns the glyph zone. */
function execGlyph(glyph: HintableGlyph, prepState: State): HPoint[] {
  const xScale = prepState.ppem / prepState.font.unitsPerEm;
  const yScale = xScale;
  const components = glyph.components;
  let gZone: HPoint[];

  if (!components) {
    const state = createState(prepState, "glyf", glyph.instructions);
    execComponent(glyph, state, xScale, yScale);
    gZone = state.gZone;
  } else {
    const font = prepState.font;
    gZone = [];
    const contours: number[] = [];
    // The composite's own program below checks the last component's state.
    let componentState: State | undefined;
    for (let i = 0; i < components.length; i++) {
      const c = components[i] as HintableComponent;
      const cg = font.glyphs.get(c.glyphIndex) as HintableGlyph;
      const state = (componentState = createState(prepState, "glyf", cg.instructions));
      execComponent(cg, state, xScale, yScale);
      // Each component is hinted alone, then moved by its rounded offset.
      const dx = Math.round((c.dx as number) * xScale);
      const dy = Math.round((c.dy as number) * yScale);
      const gz = state.gZone;
      const cc = state.contours;
      for (let pi = 0; pi < gz.length; pi++) {
        const p = gz[pi] as HPoint;
        p.xTouched = p.yTouched = false;
        p.xo = p.x = p.x + dx;
        p.yo = p.y = p.y + dy;
      }
      const gLen = gZone.length;
      gZone.push(...gz);
      for (let j = 0; j < cc.length; j++) {
        contours.push((cc[j] as number) + gLen);
      }
    }

    if (glyph.instructions && !(componentState as State).inhibitGridFit) {
      const state = createState(prepState, "glyf", glyph.instructions);
      state.gZone = state.z0 = state.z1 = state.z2 = gZone;
      state.contours = contours;
      // Phantom points for the origin and the advance width.
      gZone.push(
        new HPoint(0, 0),
        new HPoint(Math.round((glyph.advanceWidth as number) * xScale), 0),
      );
      exec(state);
      gZone.length -= 2;
    }
  }
  return gZone;
}

/** Sets up the glyph zone and contours of one glyph and runs its program. */
function execComponent(glyph: HintableGlyph, state: State, xScale: number, yScale: number): void {
  const points = glyph.points || [];
  const pLen = points.length;
  const gZone: HPoint[] = (state.gZone = state.z0 = state.z1 = state.z2 = []);
  const contours: number[] = (state.contours = []);

  for (let i = 0; i < pLen; i++) {
    const cp = points[i] as HintableGlyphPoint;
    gZone[i] = new HPoint(cp.x * xScale, cp.y * yScale, cp.lastPointOfContour, cp.onCurve);
  }

  let sp: HPoint | undefined;
  for (let i = 0; i < pLen; i++) {
    const cp = gZone[i] as HPoint;
    if (!sp) {
      sp = cp;
      contours.push(i);
    }
    if (cp.lastPointOfContour) {
      cp.nextPointOnContour = sp;
      sp.prevPointOnContour = cp;
      sp = undefined;
    } else {
      const np = gZone[i + 1] as HPoint;
      cp.nextPointOnContour = np;
      np.prevPointOnContour = cp;
    }
  }

  if (state.inhibitGridFit) return;

  gZone.push(new HPoint(0, 0), new HPoint(Math.round((glyph.advanceWidth as number) * xScale), 0));
  exec(state);
  gZone.length -= 2;
}

/** Runs the state's program. */
function exec(state: State): void {
  const prog = state.prog;
  if (!prog) return;
  const pLen = prog.length;
  for (state.ip = 0; state.ip < pLen; state.ip++) {
    const ins = instructionTable[prog[state.ip] as number];
    if (!ins) {
      throw new Error("unknown instruction: 0x" + Number(prog[state.ip]).toString(16));
    }
    ins(state);
  }
}

/** Creates the twilight zone, as many points as the glyph zone. */
function initTZone(state: State): void {
  // Gravit change: no glyph zone (fpgm, prep) gives an empty twilight zone.
  const tZone = (state.tZone = new Array<HPoint>(state.gZone ? state.gZone.length : 0));
  for (let i = 0; i < tZone.length; i++) {
    tZone[i] = new HPoint(0, 0);
  }
}

/** Skips to the matching EIF, or with handleElse to the matching ELSE. */
function skip(state: State, handleElse: boolean): void {
  const prog = state.prog as number[];
  let ip = state.ip;
  let nesting = 1;
  do {
    const ins = prog[++ip];
    // Gravit change: stop at the end of the program.
    if (typeof ins !== "number") break;
    if (ins === 0x58) nesting++;
    else if (ins === 0x59) nesting--;
    else if (ins === 0x40) ip += (prog[ip + 1] as number) + 1;
    else if (ins === 0x41) ip += 2 * (prog[ip + 1] as number) + 1;
    else if (ins >= 0xb0 && ins <= 0xb7) ip += ins - 0xb0 + 1;
    else if (ins >= 0xb8 && ins <= 0xbf) ip += (ins - 0xb8 + 1) * 2;
    else if (handleElse && nesting === 1 && ins === 0x1b) break;
  } while (nesting > 0);
  state.ip = ip;
}

// The instructions, one function each. Names are the TrueType mnemonics.

/** SVTCA[a]: set freedom and projection vectors to an axis. 0x00-0x01. */
function SVTCA(v: Vector, state: State): void {
  state.fv = state.pv = state.dpv = v;
}

/** SPVTCA[a]: set the projection vector to an axis. 0x02-0x03. */
function SPVTCA(v: Vector, state: State): void {
  state.pv = state.dpv = v;
}

/** SFVTCA[a]: set the freedom vector to an axis. 0x04-0x05. */
function SFVTCA(v: Vector, state: State): void {
  state.fv = v;
}

/** The vector along the line p1-p2, or perpendicular to it when a is set. */
function lineVector(a: number, state: State): Vector {
  const stack = state.stack;
  const p2i = pop(stack);
  const p1i = pop(stack);
  const p2 = state.z2[p2i] as HPoint;
  const p1 = state.z1[p1i] as HPoint;
  let dx: number;
  let dy: number;
  if (!a) {
    dx = p1.x - p2.x;
    dy = p1.y - p2.y;
  } else {
    dx = p2.y - p1.y;
    dy = p1.x - p2.x;
  }
  return getUnitVector(dx, dy);
}

/** SPVTL[a]: set the projection vector to a line. 0x06-0x07. */
function SPVTL(a: number, state: State): void {
  state.pv = state.dpv = lineVector(a, state);
}

/** SFVTL[a]: set the freedom vector to a line. 0x08-0x09. */
function SFVTL(a: number, state: State): void {
  state.fv = lineVector(a, state);
}

/** SPVFS[]: set the projection vector from the stack. 0x0A. */
function SPVFS(state: State): void {
  const stack = state.stack;
  const y = pop(stack);
  const x = pop(stack);
  state.pv = state.dpv = getUnitVector(x, y);
}

/** SFVFS[]: set the freedom vector from the stack. 0x0B. */
function SFVFS(state: State): void {
  const stack = state.stack;
  const y = pop(stack);
  const x = pop(stack);
  state.fv = getUnitVector(x, y);
}

/** GPV[]: get the projection vector. 0x0C. */
function GPV(state: State): void {
  const stack = state.stack;
  const pv = state.pv;
  stack.push(16384 * pv.x);
  stack.push(16384 * pv.y);
}

/** GFV[]: get the freedom vector. 0x0D. */
function GFV(state: State): void {
  const stack = state.stack;
  const fv = state.fv;
  stack.push(16384 * fv.x);
  stack.push(16384 * fv.y);
}

/** SFVTPV[]: set the freedom vector to the projection vector. 0x0E. */
function SFVTPV(state: State): void {
  state.fv = state.pv;
}

/** ISECT[]: move a point to the intersection of two lines. 0x0F. */
function ISECT(state: State): void {
  const stack = state.stack;
  const pa0i = pop(stack);
  const pa1i = pop(stack);
  const pb0i = pop(stack);
  const pb1i = pop(stack);
  const pi = pop(stack);
  const z0 = state.z0;
  const z1 = state.z1;
  const pa0 = z0[pa0i] as HPoint;
  const pa1 = z0[pa1i] as HPoint;
  const pb0 = z1[pb0i] as HPoint;
  const pb1 = z1[pb1i] as HPoint;
  const p = state.z2[pi] as HPoint;

  const x1 = pa0.x;
  const y1 = pa0.y;
  const x2 = pa1.x;
  const y2 = pa1.y;
  const x3 = pb0.x;
  const y3 = pb0.y;
  const x4 = pb1.x;
  const y4 = pb1.y;
  const div = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  const f1 = x1 * y2 - y1 * x2;
  const f2 = x3 * y4 - y3 * x4;
  p.x = (f1 * (x3 - x4) - f2 * (x1 - x2)) / div;
  p.y = (f1 * (y3 - y4) - f2 * (y1 - y2)) / div;
}

/** SRP0[]: set reference point 0. 0x10. */
function SRP0(state: State): void {
  state.rp0 = pop(state.stack);
}

/** SRP1[]: set reference point 1. 0x11. */
function SRP1(state: State): void {
  state.rp1 = pop(state.stack);
}

/** SRP2[]: set reference point 2. 0x12. */
function SRP2(state: State): void {
  state.rp2 = pop(state.stack);
}

/** The twilight (0) or glyph (1) zone. */
function zone(state: State, n: number): HPoint[] {
  switch (n) {
    case 0:
      if (!state.tZone) initTZone(state);
      return state.tZone as HPoint[];
    case 1:
      return state.gZone;
    default:
      throw new Error("Invalid zone pointer");
  }
}

/** SZP0[]: set zone pointer 0. 0x13. */
function SZP0(state: State): void {
  const n = pop(state.stack);
  state.zp0 = n;
  state.z0 = zone(state, n);
}

/** SZP1[]: set zone pointer 1. 0x14. */
function SZP1(state: State): void {
  const n = pop(state.stack);
  state.zp1 = n;
  state.z1 = zone(state, n);
}

/** SZP2[]: set zone pointer 2. 0x15. */
function SZP2(state: State): void {
  const n = pop(state.stack);
  state.zp2 = n;
  state.z2 = zone(state, n);
}

/** SZPS[]: set all zone pointers. 0x16. */
function SZPS(state: State): void {
  const n = pop(state.stack);
  state.zp0 = state.zp1 = state.zp2 = n;
  state.z0 = state.z1 = state.z2 = zone(state, n);
}

/** SLOOP[]: set the loop counter. 0x17. */
function SLOOP(state: State): void {
  state.loop = pop(state.stack);
}

/** RTG[]: round to grid. 0x18. */
function RTG(state: State): void {
  state.round = roundToGrid;
}

/** RTHG[]: round to half grid. 0x19. */
function RTHG(state: State): void {
  state.round = roundToHalfGrid;
}

/** SMD[]: set the minimum distance. 0x1A. */
function SMD(state: State): void {
  const d = pop(state.stack);
  state.minDis = d / 0x40;
}

/** ELSE[]: skip to EIF. 0x1B. */
function ELSE(state: State): void {
  skip(state, false);
}

/** JMPR[]: relative jump. 0x1C. */
function JMPR(state: State): void {
  const o = pop(state.stack);
  // The interpreter loop adds 1 after the instruction.
  state.ip += o - 1;
}

/** SCVTCI[]: set the control value cut-in. 0x1D. */
function SCVTCI(state: State): void {
  const n = pop(state.stack);
  state.cvCutIn = n / 0x40;
}

/** DUP[]: duplicate the top of the stack. 0x20. */
function DUP(state: State): void {
  const stack = state.stack;
  stack.push(stack[stack.length - 1] as number);
}

/** POP[]: drop the top of the stack. 0x21. */
function POP(state: State): void {
  state.stack.pop();
}

/** CLEAR[]: empty the stack. 0x22. */
function CLEAR(state: State): void {
  state.stack.length = 0;
}

/** SWAP[]: swap the two top elements. 0x23. */
function SWAP(state: State): void {
  const stack = state.stack;
  const a = pop(stack);
  const b = pop(stack);
  stack.push(a);
  stack.push(b);
}

/** DEPTH[]: push the stack depth. 0x24. */
function DEPTH(state: State): void {
  const stack = state.stack;
  stack.push(stack.length);
}

/** CINDEX[]: copy the kth element to the top. 0x25. */
function CINDEX(state: State): void {
  const stack = state.stack;
  const k = pop(stack);
  stack.push(stack[stack.length - k] as number);
}

/** MINDEX[]: move the kth element to the top. 0x26. */
function MINDEX(state: State): void {
  const stack = state.stack;
  const k = pop(stack);
  stack.push(stack.splice(stack.length - k, 1)[0] as number);
}

/** LOOPCALL[]: call a function repeatedly. 0x2A. */
function LOOPCALL(state: State): void {
  const stack = state.stack;
  const fn = pop(stack);
  const c = pop(stack);
  const cip = state.ip;
  const cprog = state.prog;
  state.prog = state.funcs[fn];
  for (let i = 0; i < c; i++) {
    exec(state);
  }
  state.ip = cip;
  state.prog = cprog;
}

/** CALL[]: call a function. 0x2B. */
function CALL(state: State): void {
  const fn = pop(state.stack);
  const cip = state.ip;
  const cprog = state.prog;
  state.prog = state.funcs[fn];
  exec(state);
  state.ip = cip;
  state.prog = cprog;
}

/** FDEF[]: define a function (fpgm only) up to the next ENDF. 0x2C. */
function FDEF(state: State): void {
  if (state.env !== "fpgm") throw new Error("FDEF not allowed here");
  const stack = state.stack;
  const prog = state.prog as number[];
  let ip = state.ip;
  const fn = pop(stack);
  const ipBegin = ip;
  while (prog[++ip] !== 0x2d);
  state.ip = ip;
  state.funcs[fn] = prog.slice(ipBegin + 1, ip);
}

/** MDAP[round]: move a point to its own (rounded) position. 0x2E-0x2F. */
function MDAP(round: number, state: State): void {
  const pi = pop(state.stack);
  const p = state.z0[pi] as HPoint;
  const fv = state.fv;
  // Gravit change: after a failed move the state uses the dual projection vector.
  let pv = state.microsoftWorkaround ? state.dpv : state.pv;
  let d = pv.distance(p, HPZero);
  if (round) d = state.round(d);
  try {
    fv.setRelative(p, HPZero, d, pv);
  } catch (e) {
    // Gravit change: retry once with the dual projection vector.
    if (state.microsoftWorkaround) throw e;
    state.microsoftWorkaround = true;
    pv = state.dpv;
    d = pv.distance(p, HPZero);
    if (round) d = state.round(d);
    fv.setRelative(p, HPZero, d, state.dpv);
  }
  fv.touch(p);
  state.rp0 = state.rp1 = pi;
}

/** IUP[a]: interpolate untouched points along an axis. 0x30-0x31. */
function IUP(v: AxisVector, state: State): void {
  const z2 = state.z2;
  // The last two points are the phantom points.
  const pLen = z2.length - 2;
  for (let i = 0; i < pLen; i++) {
    const cp = z2[i] as HPoint;
    if (v.touched(cp)) continue;
    const pp = cp.prevTouched(v);
    if (pp === cp) continue;
    const np = cp.nextTouched(v);
    if (pp === np) {
      // Only one touched point on the contour: shift with it.
      v.setRelative(cp, cp, v.distance(pp, pp, false, true), v, true);
    }
    v.interpolate(cp, pp, np, v);
  }
}

/** The reference point SHP, SHC and SHZ shift by: rp1 in zone 0 or rp2 in zone 1. */
function shiftReference(a: number, state: State): HPoint {
  const rpi = a ? state.rp1 : state.rp2;
  return (a ? state.z0 : state.z1)[rpi] as HPoint;
}

/** SHP[a]: shift points by the reference point's movement. 0x32-0x33. */
function SHP(a: number, state: State): void {
  const stack = state.stack;
  const rp = shiftReference(a, state);
  const fv = state.fv;
  const pv = state.pv;
  let loop = state.loop;
  const z2 = state.z2;
  while (loop--) {
    const pi = pop(stack);
    const p = z2[pi] as HPoint;
    const d = pv.distance(rp, rp, false, true);
    fv.setRelative(p, p, d, pv);
    fv.touch(p);
  }
  state.loop = 1;
}

/** SHC[a]: shift a contour by the reference point's movement. 0x34-0x35. */
function SHC(a: number, state: State): void {
  const stack = state.stack;
  const rp = shiftReference(a, state);
  const fv = state.fv;
  const pv = state.pv;
  const ci = pop(stack);
  const sp = state.z2[state.contours[ci] as number] as HPoint;
  let p = sp;
  const d = pv.distance(rp, rp, false, true);
  do {
    if (p !== rp) fv.setRelative(p, p, d, pv);
    p = p.nextPointOnContour as HPoint;
  } while (p !== sp);
}

/** SHZ[a]: shift a whole zone by the reference point's movement. 0x36-0x37. */
function SHZ(a: number, state: State): void {
  const stack = state.stack;
  const rp = shiftReference(a, state);
  const fv = state.fv;
  const pv = state.pv;
  const e = pop(stack);
  let z: HPoint[];
  switch (e) {
    case 0:
      z = state.tZone as HPoint[];
      break;
    case 1:
      z = state.gZone;
      break;
    default:
      throw new Error("Invalid zone");
  }
  const d = pv.distance(rp, rp, false, true);
  const pLen = z.length - 2;
  for (let i = 0; i < pLen; i++) {
    const p = z[i] as HPoint;
    fv.setRelative(p, p, d, pv);
  }
}

/** SHPIX[]: shift points by a pixel amount. 0x38. */
function SHPIX(state: State): void {
  const stack = state.stack;
  let loop = state.loop;
  const fv = state.fv;
  const d = pop(stack) / 0x40;
  const z2 = state.z2;
  while (loop--) {
    const pi = pop(stack);
    const p = z2[pi] as HPoint;
    fv.setRelative(p, p, d);
    fv.touch(p);
  }
  state.loop = 1;
}

/** IP[]: interpolate points between rp1 and rp2. 0x39. */
function IP(state: State): void {
  const stack = state.stack;
  const rp1i = state.rp1;
  const rp2i = state.rp2;
  let loop = state.loop;
  const rp1 = state.z0[rp1i] as HPoint;
  const rp2 = state.z1[rp2i] as HPoint;
  const fv = state.fv;
  const pv = state.dpv;
  const z2 = state.z2;
  while (loop--) {
    const pi = pop(stack);
    const p = z2[pi] as HPoint;
    fv.interpolate(p, rp1, rp2, pv);
    fv.touch(p);
  }
  state.loop = 1;
}

/** MSIRP[a]: move a point to a distance from rp0. 0x3A-0x3B. */
function MSIRP(a: number, state: State): void {
  const stack = state.stack;
  const d = pop(stack) / 64;
  const pi = pop(stack);
  const p = state.z1[pi] as HPoint;
  const rp0 = state.z0[state.rp0] as HPoint;
  const fv = state.fv;
  const pv = state.pv;
  fv.setRelative(p, rp0, d, pv);
  fv.touch(p);
  state.rp1 = state.rp0;
  state.rp2 = pi;
  if (a) state.rp0 = pi;
}

/** ALIGNRP[]: align points with rp0. 0x3C. */
function ALIGNRP(state: State): void {
  const stack = state.stack;
  const rp0 = state.z0[state.rp0] as HPoint;
  let loop = state.loop;
  const fv = state.fv;
  // Gravit change: see MDAP.
  let pv = state.microsoftWorkaround ? state.dpv : state.pv;
  const z1 = state.z1;
  while (loop--) {
    const pi = pop(stack);
    const p = z1[pi] as HPoint;
    try {
      fv.setRelative(p, rp0, 0, pv);
    } catch (e) {
      if (state.microsoftWorkaround) throw e;
      state.microsoftWorkaround = true;
      pv = state.dpv;
      fv.setRelative(p, rp0, 0, pv);
    }
    fv.touch(p);
  }
  state.loop = 1;
}

/** RTDG[]: round to double grid. 0x3D. */
function RTDG(state: State): void {
  state.round = roundToDoubleGrid;
}

/** MIAP[round]: move a point to a CVT distance from the origin. 0x3E-0x3F. */
function MIAP(round: number, state: State): void {
  const stack = state.stack;
  const n = pop(stack);
  const pi = pop(stack);
  const p = state.z0[pi] as HPoint;
  const fv = state.fv;
  const pv = state.pv;
  const cv = state.cvt[n] as number;
  let d = pv.distance(p, HPZero);
  if (round) {
    if (Math.abs(d - cv) < state.cvCutIn) d = cv;
    d = state.round(d);
  }
  // Gravit change: a zero distance moves by the CVT value.
  fv.setRelative(p, HPZero, d || cv, pv);
  if (state.zp0 === 0) {
    p.xo = p.x;
    p.yo = p.y;
  }
  fv.touch(p);
  state.rp0 = state.rp1 = pi;
}

/** NPUSHB[]: push n bytes. 0x40. */
function NPUSHB(state: State): void {
  const prog = state.prog as number[];
  let ip = state.ip;
  const stack = state.stack;
  const n = prog[++ip] as number;
  for (let i = 0; i < n; i++) stack.push(prog[++ip] as number);
  state.ip = ip;
}

/** Reads the signed 16-bit word after ip. */
function readWord(prog: number[], ip: number): number {
  let w = ((prog[ip + 1] as number) << 8) | (prog[ip + 2] as number);
  if (w & 0x8000) w = -((w ^ 0xffff) + 1);
  return w;
}

/** NPUSHW[]: push n words. 0x41. */
function NPUSHW(state: State): void {
  let ip = state.ip;
  const prog = state.prog as number[];
  const stack = state.stack;
  const n = prog[++ip] as number;
  for (let i = 0; i < n; i++) {
    stack.push(readWord(prog, ip));
    ip += 2;
  }
  state.ip = ip;
}

/** WS[]: write the storage area. 0x42. */
function WS(state: State): void {
  const stack = state.stack;
  let store = state.store;
  if (!store) store = state.store = [];
  const v = pop(stack);
  const l = pop(stack);
  store[l] = v;
}

/** RS[]: read the storage area. 0x43. */
function RS(state: State): void {
  const stack = state.stack;
  const store = state.store;
  const l = pop(stack);
  const v = (store && store[l]) || 0;
  stack.push(v);
}

/** WCVTP[]: write a CVT entry in pixels. 0x44. */
function WCVTP(state: State): void {
  const stack = state.stack;
  const v = pop(stack);
  const l = pop(stack);
  state.cvt[l] = v / 0x40;
}

/** RCVT[]: read a CVT entry. 0x45. */
function RCVT(state: State): void {
  const stack = state.stack;
  const cvte = pop(stack);
  stack.push(64 * (state.cvt[cvte] as number));
}

/** GC[a]: get a point's coordinate on the projection vector (a: original). 0x46-0x47. */
function GC(a: number, state: State): void {
  const stack = state.stack;
  const pi = pop(stack);
  const p = state.z2[pi] as HPoint;
  stack.push(64 * state.dpv.distance(p, HPZero, !!a, false));
}

/** MD[a]: measure the distance between two points (a: original). 0x49-0x4A. */
function MD(a: number, state: State): void {
  const stack = state.stack;
  const pi2 = pop(stack);
  const pi1 = pop(stack);
  const p2 = state.z1[pi2] as HPoint;
  const p1 = state.z0[pi1] as HPoint;
  const d = state.dpv.distance(p1, p2, !!a, !!a);
  state.stack.push(Math.round(64 * d));
}

/** MPPEM[]: push pixels per em. 0x4B. */
function MPPEM(state: State): void {
  state.stack.push(state.ppem);
}

/** FLIPON[]: turn auto flip on. 0x4D. */
function FLIPON(state: State): void {
  state.autoFlip = true;
}

/** Pops e2 then e1 and pushes f(e1, e2). */
function binary(state: State, f: (e1: number, e2: number) => number): void {
  const stack = state.stack;
  const e2 = pop(stack);
  const e1 = pop(stack);
  stack.push(f(e1, e2));
}

/** LT[]: 0x50. */
function LT(state: State): void {
  binary(state, (e1, e2) => (e1 < e2 ? 1 : 0));
}

/** LTEQ[]: 0x51. */
function LTEQ(state: State): void {
  binary(state, (e1, e2) => (e1 <= e2 ? 1 : 0));
}

/** GT[]: 0x52. */
function GT(state: State): void {
  binary(state, (e1, e2) => (e1 > e2 ? 1 : 0));
}

/** GTEQ[]: 0x53. */
function GTEQ(state: State): void {
  binary(state, (e1, e2) => (e1 >= e2 ? 1 : 0));
}

/** EQ[]: 0x54. */
function EQ(state: State): void {
  binary(state, (e1, e2) => (e2 === e1 ? 1 : 0));
}

/** NEQ[]: 0x55. */
function NEQ(state: State): void {
  binary(state, (e1, e2) => (e2 !== e1 ? 1 : 0));
}

/** ODD[]: 0x56. */
function ODD(state: State): void {
  const stack = state.stack;
  const n = pop(stack);
  stack.push(Math.trunc(n) % 2 ? 1 : 0);
}

/** EVEN[]: 0x57. */
function EVEN(state: State): void {
  const stack = state.stack;
  const n = pop(stack);
  stack.push(Math.trunc(n) % 2 ? 0 : 1);
}

/** IF[]: on false skip to ELSE or EIF. 0x58. */
function IF(state: State): void {
  const test = pop(state.stack);
  if (!test) {
    skip(state, true);
  }
}

/** EIF[]: end of IF. 0x59. */
function EIF(): void {}

/** AND[]: 0x5A. */
function AND(state: State): void {
  binary(state, (e1, e2) => (e2 && e1 ? 1 : 0));
}

/** OR[]: 0x5B. */
function OR(state: State): void {
  binary(state, (e1, e2) => (e2 || e1 ? 1 : 0));
}

/** NOT[]: 0x5C. */
function NOT(state: State): void {
  const stack = state.stack;
  const e = pop(stack);
  stack.push(e ? 0 : 1);
}

/** The delta step encoded in an argument byte, or undefined when it's for another ppem. */
function deltaMagnitude(state: State, base: number, arg: number): number | undefined {
  const appem = base + ((arg & 0xf0) >> 4);
  if (appem !== state.ppem) return undefined;
  let mag = (arg & 0x0f) - 8;
  if (mag >= 0) mag++;
  return mag;
}

/** DELTAP1-3[]: move points at specific ppems. 0x5D, 0x71, 0x72. */
function DELTAP123(b: number, state: State): void {
  const stack = state.stack;
  const n = pop(stack);
  const fv = state.fv;
  const pv = state.pv;
  const base = state.deltaBase + (b - 1) * 16;
  const ds = state.deltaShift;
  const z0 = state.z0;
  for (let i = 0; i < n; i++) {
    const pi = pop(stack);
    const arg = pop(stack);
    const mag = deltaMagnitude(state, base, arg);
    if (mag === undefined) continue;
    const p = z0[pi] as HPoint;
    fv.setRelative(p, p, mag * ds, pv);
  }
}

/** SDB[]: set the delta base. 0x5E. */
function SDB(state: State): void {
  state.deltaBase = pop(state.stack);
}

/** SDS[]: set the delta shift. 0x5F. */
function SDS(state: State): void {
  const n = pop(state.stack);
  state.deltaShift = Math.pow(0.5, n);
}

/** ADD[]: 0x60. */
function ADD(state: State): void {
  binary(state, (n1, n2) => n1 + n2);
}

/** SUB[]: 0x61. */
function SUB(state: State): void {
  binary(state, (n1, n2) => n1 - n2);
}

/** DIV[]: 26.6 division. 0x62. */
function DIV(state: State): void {
  binary(state, (n1, n2) => (64 * n1) / n2);
}

/** MUL[]: 26.6 multiplication. 0x63. */
function MUL(state: State): void {
  binary(state, (n1, n2) => (n1 * n2) / 64);
}

/** ABS[]: 0x64. */
function ABS(state: State): void {
  const stack = state.stack;
  stack.push(Math.abs(pop(stack)));
}

/** NEG[]: 0x65. */
function NEG(state: State): void {
  const stack = state.stack;
  stack.push(-pop(stack));
}

/** FLOOR[]: 0x66. */
function FLOOR(state: State): void {
  const stack = state.stack;
  const n = pop(stack);
  stack.push(64 * Math.floor(n / 64));
}

/** CEILING[]: 0x67. */
function CEILING(state: State): void {
  const stack = state.stack;
  const n = pop(stack);
  stack.push(64 * Math.ceil(n / 64));
}

/** ROUND[dt]: round with the current rounding; the distance type is ignored. 0x68-0x6B. */
function ROUND(_dt: number, state: State): void {
  const stack = state.stack;
  const n = pop(stack);
  stack.push(64 * state.round(n / 64));
}

/** WCVTF[]: write a CVT entry in font units. 0x70. */
function WCVTF(state: State): void {
  const stack = state.stack;
  const v = pop(stack);
  const l = pop(stack);
  state.cvt[l] = (v * state.ppem) / state.font.unitsPerEm;
}

/** DELTAC1-3[]: change CVT entries at specific ppems. 0x73-0x75. */
function DELTAC123(b: number, state: State): void {
  const stack = state.stack;
  const n = pop(stack);
  const base = state.deltaBase + (b - 1) * 16;
  const ds = state.deltaShift;
  for (let i = 0; i < n; i++) {
    const c = pop(stack);
    const arg = pop(stack);
    const mag = deltaMagnitude(state, base, arg);
    if (mag === undefined) continue;
    const delta = mag * ds;
    state.cvt[c] = (state.cvt[c] as number) + delta;
  }
}

/** SROUND[]: super round with a grid period of 1. 0x76. */
function SROUND(state: State): void {
  const n = pop(state.stack);
  state.round = roundSuper;
  let period: number;
  switch (n & 0xc0) {
    case 0x00:
      period = 0.5;
      break;
    case 0x40:
      period = 1;
      break;
    case 0x80:
      period = 2;
      break;
    default:
      throw new Error("invalid SROUND value");
  }
  setSuperRoundPhase(state, n, period, "SROUND");
}

/** S45ROUND[]: super round with a grid period of sqrt(2)/2. 0x77. */
function S45ROUND(state: State): void {
  const n = pop(state.stack);
  state.round = roundSuper;
  let period: number;
  switch (n & 0xc0) {
    case 0x00:
      period = Math.sqrt(2) / 2;
      break;
    case 0x40:
      period = Math.sqrt(2);
      break;
    case 0x80:
      period = 2 * Math.sqrt(2);
      break;
    default:
      throw new Error("invalid S45ROUND value");
  }
  setSuperRoundPhase(state, n, period, "S45ROUND");
}

/** The phase and threshold part of SROUND and S45ROUND. */
function setSuperRoundPhase(state: State, n: number, period: number, name: string): void {
  state.srPeriod = period;
  switch (n & 0x30) {
    case 0x00:
      state.srPhase = 0;
      break;
    case 0x10:
      state.srPhase = 0.25 * period;
      break;
    case 0x20:
      state.srPhase = 0.5 * period;
      break;
    case 0x30:
      state.srPhase = 0.75 * period;
      break;
    default:
      throw new Error("invalid " + name + " value");
  }
  n &= 0x0f;
  if (n === 0) state.srThreshold = 0;
  else state.srThreshold = (n / 8 - 0.5) * period;
}

/** ROFF[]: rounding off. 0x7A. */
function ROFF(state: State): void {
  state.round = roundOff;
}

/** RUTG[]: round up to grid. 0x7C. */
function RUTG(state: State): void {
  state.round = roundUpToGrid;
}

/** RDTG[]: round down to grid. 0x7D. */
function RDTG(state: State): void {
  state.round = roundDownToGrid;
}

/** SCANCTRL[]: scan conversion control, ignored. 0x85. */
function SCANCTRL(state: State): void {
  state.stack.pop();
}

/** SDPVTL[a]: set the dual projection vector to a line. 0x86-0x87. */
function SDPVTL(a: number, state: State): void {
  state.dpv = lineVector(a, state);
}

/** GETINFO[]: interpreter version 35, and grayscale rendering when asked. 0x88. */
function GETINFO(state: State): void {
  const stack = state.stack;
  const sel = pop(stack);
  let r = 0;
  if (sel & 0x01) r = 35;
  if (sel & 0x20) r |= 0x1000;
  stack.push(r);
}

/** ROLL[]: roll the top three elements. 0x8A. */
function ROLL(state: State): void {
  const stack = state.stack;
  const a = pop(stack);
  const b = pop(stack);
  const c = pop(stack);
  stack.push(b);
  stack.push(a);
  stack.push(c);
}

/** MAX[]: 0x8B. */
function MAX(state: State): void {
  binary(state, (e1, e2) => Math.max(e1, e2));
}

/** MIN[]: 0x8C. */
function MIN(state: State): void {
  binary(state, (e1, e2) => Math.min(e1, e2));
}

/** SCANTYPE[]: ignored. 0x8D. */
function SCANTYPE(state: State): void {
  state.stack.pop();
}

/** INSTCTRL[]: instruction control (inhibit grid fit, ignore CVT). 0x8E. */
function INSTCTRL(state: State): void {
  const s = pop(state.stack);
  const v = pop(state.stack);
  switch (s) {
    case 1:
      state.inhibitGridFit = !!v;
      return;
    case 2:
      state.ignoreCvt = !!v;
      return;
    default:
      throw new Error("invalid INSTCTRL[] selector");
  }
}

/** PUSHB[n]: push n bytes. 0xB0-0xB7. */
function PUSHB(n: number, state: State): void {
  const stack = state.stack;
  const prog = state.prog as number[];
  let ip = state.ip;
  for (let i = 0; i < n; i++) stack.push(prog[++ip] as number);
  state.ip = ip;
}

/** PUSHW[n]: push n words. 0xB8-0xBF. */
function PUSHW(n: number, state: State): void {
  let ip = state.ip;
  const prog = state.prog as number[];
  const stack = state.stack;
  for (let i = 0; i < n; i++) {
    stack.push(readWord(prog, ip));
    ip += 2;
  }
  state.ip = ip;
}

/**
 * MDRP[abcde] and MIRP[abcde]: move a point relative to rp0, by its original
 * distance (MDRP) or a CVT value (MIRP). 0xC0-0xFF. The distance type dt is
 * ignored.
 */
function MDRP_MIRP(
  indirect: number,
  setRp0: number,
  keepD: number,
  ro: number,
  _dt: number,
  state: State,
): void {
  const stack = state.stack;
  const cvte = indirect && pop(stack);
  const pi = pop(stack);
  const rp0i = state.rp0;
  const rp = state.z0[rp0i] as HPoint;
  const p = state.z1[pi] as HPoint;
  const md = state.minDis;
  const fv = state.fv;
  const pv = state.dpv;

  let d = pv.distance(p, rp, true, true);
  const sign = d >= 0 ? 1 : -1;
  d = Math.abs(d);
  if (indirect) {
    const cv = state.cvt[cvte] as number;
    if (ro && Math.abs(d - cv) < state.cvCutIn) d = cv;
  }
  if (keepD && d < md) d = md;
  if (ro) d = state.round(d);
  fv.setRelative(p, rp, sign * d, pv);
  fv.touch(p);
  state.rp1 = state.rp0;
  state.rp2 = pi;
  if (setRp0) state.rp0 = pi;
}

function bind1<A>(f: (a: A, state: State) => void, a: A): Instruction {
  return (state) => f(a, state);
}

function mdrpMirp(opcode: number): Instruction {
  const bits = opcode - 0xc0;
  return (state) =>
    MDRP_MIRP((bits >> 5) & 1, (bits >> 4) & 1, (bits >> 3) & 1, (bits >> 2) & 1, bits & 3, state);
}

/** The instruction for each opcode; undefined opcodes throw "unknown instruction". */
const instructionTable: (Instruction | undefined)[] = new Array<Instruction | undefined>(256);

function define(opcode: number, instruction: Instruction): void {
  instructionTable[opcode] = instruction;
}

define(0x00, bind1(SVTCA, yUnitVector));
define(0x01, bind1(SVTCA, xUnitVector));
define(0x02, bind1(SPVTCA, yUnitVector));
define(0x03, bind1(SPVTCA, xUnitVector));
define(0x04, bind1(SFVTCA, yUnitVector));
define(0x05, bind1(SFVTCA, xUnitVector));
define(0x06, bind1(SPVTL, 0));
define(0x07, bind1(SPVTL, 1));
define(0x08, bind1(SFVTL, 0));
define(0x09, bind1(SFVTL, 1));
define(0x0a, SPVFS);
define(0x0b, SFVFS);
define(0x0c, GPV);
define(0x0d, GFV);
define(0x0e, SFVTPV);
define(0x0f, ISECT);
define(0x10, SRP0);
define(0x11, SRP1);
define(0x12, SRP2);
define(0x13, SZP0);
define(0x14, SZP1);
define(0x15, SZP2);
define(0x16, SZPS);
define(0x17, SLOOP);
define(0x18, RTG);
define(0x19, RTHG);
define(0x1a, SMD);
define(0x1b, ELSE);
define(0x1c, JMPR);
define(0x1d, SCVTCI);
define(0x20, DUP);
define(0x21, POP);
define(0x22, CLEAR);
define(0x23, SWAP);
define(0x24, DEPTH);
define(0x25, CINDEX);
define(0x26, MINDEX);
define(0x2a, LOOPCALL);
define(0x2b, CALL);
define(0x2c, FDEF);
define(0x2e, bind1(MDAP, 0));
define(0x2f, bind1(MDAP, 1));
define(0x30, bind1(IUP, yUnitVector));
define(0x31, bind1(IUP, xUnitVector));
define(0x32, bind1(SHP, 0));
define(0x33, bind1(SHP, 1));
define(0x34, bind1(SHC, 0));
define(0x35, bind1(SHC, 1));
define(0x36, bind1(SHZ, 0));
define(0x37, bind1(SHZ, 1));
define(0x38, SHPIX);
define(0x39, IP);
define(0x3a, bind1(MSIRP, 0));
define(0x3b, bind1(MSIRP, 1));
define(0x3c, ALIGNRP);
define(0x3d, RTDG);
define(0x3e, bind1(MIAP, 0));
define(0x3f, bind1(MIAP, 1));
define(0x40, NPUSHB);
define(0x41, NPUSHW);
define(0x42, WS);
define(0x43, RS);
define(0x44, WCVTP);
define(0x45, RCVT);
define(0x46, bind1(GC, 0));
define(0x47, bind1(GC, 1));
define(0x49, bind1(MD, 0));
define(0x4a, bind1(MD, 1));
define(0x4b, MPPEM);
define(0x4d, FLIPON);
define(0x50, LT);
define(0x51, LTEQ);
define(0x52, GT);
define(0x53, GTEQ);
define(0x54, EQ);
define(0x55, NEQ);
define(0x56, ODD);
define(0x57, EVEN);
define(0x58, IF);
define(0x59, EIF);
define(0x5a, AND);
define(0x5b, OR);
define(0x5c, NOT);
define(0x5d, bind1(DELTAP123, 1));
define(0x5e, SDB);
define(0x5f, SDS);
define(0x60, ADD);
define(0x61, SUB);
define(0x62, DIV);
define(0x63, MUL);
define(0x64, ABS);
define(0x65, NEG);
define(0x66, FLOOR);
define(0x67, CEILING);
define(0x68, bind1(ROUND, 0));
define(0x69, bind1(ROUND, 1));
define(0x6a, bind1(ROUND, 2));
define(0x6b, bind1(ROUND, 3));
define(0x70, WCVTF);
define(0x71, bind1(DELTAP123, 2));
define(0x72, bind1(DELTAP123, 3));
define(0x73, bind1(DELTAC123, 1));
define(0x74, bind1(DELTAC123, 2));
define(0x75, bind1(DELTAC123, 3));
define(0x76, SROUND);
define(0x77, S45ROUND);
define(0x7a, ROFF);
define(0x7c, RUTG);
define(0x7d, RDTG);
// 0x7E (SANGW) and 0x7F (AA) are obsolete; they just pop their argument.
define(0x7e, POP);
define(0x7f, POP);
define(0x85, SCANCTRL);
define(0x86, bind1(SDPVTL, 0));
define(0x87, bind1(SDPVTL, 1));
define(0x88, GETINFO);
define(0x8a, ROLL);
define(0x8b, MAX);
define(0x8c, MIN);
define(0x8d, SCANTYPE);
define(0x8e, INSTCTRL);
for (let n = 1; n <= 8; n++) {
  define(0xb0 + n - 1, bind1(PUSHB, n));
  define(0xb8 + n - 1, bind1(PUSHW, n));
}
for (let opcode = 0xc0; opcode <= 0xff; opcode++) {
  define(opcode, mdrpMirp(opcode));
}
