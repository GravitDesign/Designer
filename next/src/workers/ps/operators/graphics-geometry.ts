// Old: public/pscore.js, systemdict moveto … arct: path construction and
// the coordinate transforms.
import type { PSCore } from "../core.ts";
import type { PSPoint } from "../ctm.ts";
import type { PSArray, PSPathSegment, PSValue } from "../objects.ts";
import { currentPath, outsideBBox, positionX, positionY } from "./graphics-support.ts";

type PointMapper = (x: number, y: number, matrix: readonly number[]) => PSPoint;

/**
 * transform, dtransform, idtransform and itransform: `x y` or
 * `x y matrix`, mapped with the CTM or the given matrix.
 */
function mapOperands(core: PSCore, name: string, map: PointMapper): void {
  let matrix: readonly number[] = core.gstate.CTM;
  let operandCount = 2;
  let x: PSValue;
  let y: PSValue;
  const top = core.stack[core.stack.length - 1];
  if (core.classes.isPSObject(top, "array") || core.classes.isPSObject(top, "packedarray")) {
    if (core.stackunderflowCheck(3, name)) return;
    x = core.stack[core.stack.length - 3];
    y = core.stack[core.stack.length - 2];
    operandCount++;
    matrix = top.value as number[];
  } else {
    if (typeof top != "number") {
      core.initiateError("typecheck", name);
      return;
    }
    if (core.stackunderflowCheck(2, name)) return;
    x = core.stack[core.stack.length - 2];
    y = core.stack[core.stack.length - 1];
  }
  if (typeof x == "number" && typeof y == "number") {
    const mapped = map(x, y, matrix);
    for (let i = 0; i < operandCount; i++) core.stack.pop();
    core.stack.push(mapped.x);
    core.stack.push(mapped.y);
  } else core.initiateError("typecheck", name);
}

/** moveto and rmoveto: a moveto right after another replaces it. */
function addMoveTo(core: PSCore, point: PSPoint): void {
  const path = core.gstate.path;
  if (path.length > 0) {
    const subpath = path[path.length - 1] as PSPathSegment[];
    const last = subpath.length - 1;
    const segment = subpath[last];
    if (segment === undefined || (segment.type != "moveto" && segment.type != "rmoveto"))
      path.push([{ type: "moveto", coord: point }]);
    else subpath[last] = { type: "moveto", coord: point };
  } else path.push([{ type: "moveto", coord: point }]);
}

/** The subpath lineto and curveto extend (undefined without a current point: they then throw). */
function lastSubpath(core: PSCore): PSPathSegment[] {
  return core.gstate.path[core.gstate.path.length - 1] as PSPathSegment[];
}

function arcOperator(core: PSCore, name: "arc" | "arcn"): void {
  core.fill$error();
  if (core.stackunderflowCheck(5, name)) return;
  const cx = core.stack[core.stack.length - 5];
  const cy = core.stack[core.stack.length - 4];
  const radius = core.stack[core.stack.length - 3];
  let angle1 = core.stack[core.stack.length - 2];
  let angle2 = core.stack[core.stack.length - 1];
  if (
    typeof cx != "number" ||
    typeof cy != "number" ||
    typeof radius != "number" ||
    typeof angle1 != "number" ||
    typeof angle2 != "number"
  ) {
    core.initiateError("typecheck", name);
    return;
  }
  const gstate = core.gstate;
  if (name == "arc") while (angle2 < angle1) angle2 += 360;
  else while (angle2 > angle1) angle2 -= 360;
  angle1 = core.CTM.degreeToRadian(angle1);
  angle2 = core.CTM.degreeToRadian(angle2);
  const box = currentPath(core).bbox;
  let subpath: PSPathSegment[];
  if (gstate.position.x !== null && gstate.path.length > 0) {
    const start = { x: cx + radius * Math.cos(angle1), y: cy + radius * Math.sin(angle1) };
    const mapped = core.CTM.transform(start.x, start.y);
    if (box && outsideBBox(mapped, box)) {
      core.initiateError("rangecheck", name);
      return;
    }
    subpath = gstate.path[gstate.path.length - 1] as PSPathSegment[];
    subpath.push({ type: "lineto", coord: mapped });
  } else {
    subpath = [];
    gstate.path.push(subpath);
  }
  subpath.push({
    type: name,
    center: core.CTM.transform(cx, cy),
    radius: core.CTM.deltaTransform(radius, radius),
    angle1,
    angle2,
    bbox: box,
  });
  gstate.position = { x: cx + radius * Math.cos(angle2), y: cy + radius * Math.sin(angle2) };
  core.stack.pop();
  core.stack.pop();
  core.stack.pop();
  core.stack.pop();
  core.stack.pop();
}

export const geometryOperators = {
  moveto(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2)) return;
    const x = this.stack[this.stack.length - 2];
    const y = this.stack[this.stack.length - 1];
    if (typeof x == "number" && typeof y == "number") {
      const point = this.CTM.transform(x, y);
      const box = currentPath(this).bbox;
      if (box && outsideBBox(point, box)) this.initiateError("rangecheck", "moveto");
      else {
        addMoveTo(this, point);
        this.gstate.position = { x, y };
        this.stack.pop();
        this.stack.pop();
      }
    } else this.initiateError("typecheck", "moveto");
  },

  /** Sic: no type check on the operands. */
  rmoveto(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "rmoveto")) return;
    const dx = this.stack[this.stack.length - 2] as number;
    const dy = this.stack[this.stack.length - 1] as number;
    if (this.gstate.position.x !== null) {
      const point = this.CTM.transform(dx + positionX(this), dy + positionY(this));
      const box = currentPath(this).bbox;
      if (box && outsideBBox(point, box)) this.initiateError("rangecheck", "rmoveto");
      else {
        addMoveTo(this, point);
        this.gstate.position = { x: dx + positionX(this), y: dy + positionY(this) };
        this.stack.pop();
        this.stack.pop();
      }
    } else this.initiateError("nocurrentpoint", "rmoveto");
  },

  currentpoint(this: PSCore) {
    if (this.gstate.position.x !== null) {
      this.stack.push(this.gstate.position.x);
      this.stack.push(this.gstate.position.y);
    } else this.initiateError("nocurrentpoint", "currentpoint");
  },

  transform(this: PSCore) {
    mapOperands(this, "transform", (x, y, matrix) => this.CTM.transform(x, y, matrix));
  },

  dtransform(this: PSCore) {
    mapOperands(this, "dtransform", (x, y, matrix) => this.CTM.deltaTransform(x, y, matrix));
  },

  idtransform(this: PSCore) {
    mapOperands(this, "idtransform", (x, y, matrix) =>
      this.CTM.inverseDeltaTransform(x, y, matrix),
    );
  },

  itransform(this: PSCore) {
    this.fill$error();
    mapOperands(this, "itransform", (x, y, matrix) => this.CTM.inverseTransform(x, y, matrix));
  },

  concatmatrix(this: PSCore) {
    const name = "concatmatrix";
    this.fill$error();
    if (this.stackunderflowCheck(3, name)) return;
    const first = this.stack[this.stack.length - 3];
    const second = this.stack[this.stack.length - 2];
    const result = this.stack[this.stack.length - 1];
    if (
      this.classes.isPSObject(first, "array") &&
      this.classes.isPSObject(second, "array") &&
      this.classes.isPSObject(result, "array")
    ) {
      if (first.value.length == second.value.length && first.value.length == 6) {
        result.value = this.CTM.multiply(first.value as number[], second.value as number[]);
        this.stack.pop();
        this.stack.pop();
        this.stack.pop();
        this.stack.push(result);
      } else this.initiateError("rangecheck", name);
    } else this.initiateError("typecheck", name);
  },

  concat(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "concat")) return;
    const matrix = this.stack[this.stack.length - 1];
    if (this.classes.isPSObject(matrix, "array")) {
      if (matrix.value.length == 6) {
        this.gstate.CTM = this.CTM.multiply(matrix.value as number[], this.gstate.CTM);
        this.stack.pop();
      } else this.initiateError("rangecheck", "concat");
    } else this.initiateError("typecheck", "concat");
  },

  scale(this: PSCore) {
    this.fill$error();
    const ctm = this.gstate.CTM;
    let operandCount = 2;
    let sx: PSValue;
    let sy: PSValue;
    let matrix: PSArray | undefined;
    const top = this.stack[this.stack.length - 1];
    if (this.classes.isPSObject(top, "array")) {
      if (this.stackunderflowCheck(3, "scale")) return;
      sx = this.stack[this.stack.length - 3];
      sy = this.stack[this.stack.length - 2];
      matrix = top;
      operandCount++;
    } else {
      if (typeof top != "number") {
        this.initiateError("typecheck", "scale");
        return;
      }
      if (this.stackunderflowCheck(2, "scale")) return;
      sx = this.stack[this.stack.length - 2];
      sy = this.stack[this.stack.length - 1];
    }
    if (typeof sx == "number" && typeof sy == "number") {
      for (let i = 0; i < operandCount; i++) this.stack.pop();
      if (operandCount == 2) this.gstate.CTM = this.CTM.multiply([sx, 0, 0, sy, 0, 0], ctm);
      else {
        (matrix as PSArray).value = [sx, 0, 0, sy, 0, 0];
        this.stack.push(matrix);
      }
    } else this.initiateError("typecheck", "scale");
  },

  translate(this: PSCore) {
    const name = "translate";
    this.fill$error();
    const ctm = this.gstate.CTM;
    let operandCount = 2;
    let tx: PSValue;
    let ty: PSValue;
    let matrix: PSArray | undefined;
    const top = this.stack[this.stack.length - 1];
    if (this.classes.isPSObject(top, "array") || this.classes.isPSObject(top, "packedarray")) {
      if (this.stackunderflowCheck(3, name)) return;
      tx = this.stack[this.stack.length - 3];
      ty = this.stack[this.stack.length - 2];
      matrix = top as PSArray;
      operandCount++;
    } else {
      if (typeof top != "number") {
        this.initiateError("typecheck", name);
        return;
      }
      if (this.stackunderflowCheck(2, name)) return;
      tx = this.stack[this.stack.length - 2];
      ty = this.stack[this.stack.length - 1];
    }
    if (typeof tx == "number" && typeof ty == "number") {
      if (operandCount == 2) this.gstate.CTM = this.CTM.multiply([1, 0, 0, 1, tx, ty], ctm);
      for (let i = 0; i < operandCount; i++) this.stack.pop();
      if (operandCount === 3) {
        (matrix as PSArray).value = [1, 0, 0, 1, tx, ty];
        this.stack.push(matrix);
      }
    } else this.initiateError("typecheck", name);
  },

  rotate(this: PSCore) {
    this.fill$error();
    const ctm = this.gstate.CTM;
    let operandCount = 1;
    let angle: number;
    let matrix: PSArray | undefined;
    const top = this.stack[this.stack.length - 1];
    if (this.classes.isPSObject(top, "array") || this.classes.isPSObject(top, "packedarray")) {
      if (this.stackunderflowCheck(2, "rotate")) return;
      const degrees = this.stack[this.stack.length - 2];
      if (typeof degrees != "number") {
        this.initiateError("typecheck", "rotate");
        return;
      }
      angle = degrees;
      matrix = top as PSArray;
      operandCount++;
    } else {
      if (typeof top != "number") {
        this.initiateError("typecheck", "rotate");
        return;
      }
      if (this.stackunderflowCheck(1, "rotate")) return;
      angle = top;
    }
    angle = this.CTM.degreeToRadian(angle);
    if (operandCount === 1)
      this.gstate.CTM = this.CTM.multiply(
        [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0],
        ctm,
      );
    for (let i = 0; i < operandCount; i++) this.stack.pop();
    if (operandCount === 2) {
      (matrix as PSArray).value = [
        Math.cos(angle),
        Math.sin(angle),
        -Math.sin(angle),
        Math.cos(angle),
        0,
        0,
      ];
      this.stack.push(matrix);
    }
  },

  /** Sic: no type or current point check; without a subpath it throws. */
  rlineto(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "rlineto")) return;
    const dx = this.stack[this.stack.length - 2] as number;
    const dy = this.stack[this.stack.length - 1] as number;
    const box = currentPath(this).bbox;
    const point = this.CTM.transform(dx + positionX(this), dy + positionY(this));
    if (box && outsideBBox(point, box)) this.initiateError("rangecheck", "rlineto");
    else {
      lastSubpath(this).push({ type: "lineto", coord: point });
      this.gstate.position = { x: dx + positionX(this), y: dy + positionY(this) };
      this.stack.pop();
      this.stack.pop();
    }
  },

  /** Sic: no type check; without a subpath it throws. */
  lineto(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "lineto")) return;
    const x = this.stack[this.stack.length - 2] as number;
    const y = this.stack[this.stack.length - 1] as number;
    const box = currentPath(this).bbox;
    const point = this.CTM.transform(x, y);
    if (box && outsideBBox(point, box)) this.initiateError("rangecheck", "lineto");
    else {
      lastSubpath(this).push({ type: "lineto", coord: point });
      this.gstate.position = { x, y };
      this.stack.pop();
      this.stack.pop();
    }
  },

  rcurveto(this: PSCore) {
    const name = "rcurveto";
    this.fill$error();
    if (this.stackunderflowCheck(6, name)) return;
    const dx1 = this.stack[this.stack.length - 6];
    const dy1 = this.stack[this.stack.length - 5];
    const dx2 = this.stack[this.stack.length - 4];
    const dy2 = this.stack[this.stack.length - 3];
    const dx3 = this.stack[this.stack.length - 2];
    const dy3 = this.stack[this.stack.length - 1];
    if (
      typeof dx1 != "number" ||
      typeof dy1 != "number" ||
      typeof dx2 != "number" ||
      typeof dy2 != "number" ||
      typeof dx3 != "number" ||
      typeof dy3 != "number"
    ) {
      this.initiateError("typecheck", name);
      return;
    }
    const box = currentPath(this).bbox;
    const control1 = this.CTM.transform(dx1 + positionX(this), dy1 + positionY(this));
    if (box && outsideBBox(control1, box)) {
      this.initiateError("rangecheck", name);
      return;
    }
    const control2 = this.CTM.transform(dx2 + positionX(this), dy2 + positionY(this));
    if (box && outsideBBox(control2, box)) {
      this.initiateError("rangecheck", name);
      return;
    }
    const end = this.CTM.transform(dx3 + positionX(this), dy3 + positionY(this));
    if (box && outsideBBox(end, box)) {
      this.initiateError("rangecheck", name);
      return;
    }
    lastSubpath(this).push({ type: "curveto", coord1: control1, coord2: control2, coord3: end });
    this.gstate.position = { x: dx3 + positionX(this), y: dy3 + positionY(this) };
    for (let i = 0; i < 6; i++) this.stack.pop();
  },

  curveto(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(6, "curveto")) return;
    const x1 = this.stack[this.stack.length - 6];
    const y1 = this.stack[this.stack.length - 5];
    const x2 = this.stack[this.stack.length - 4];
    const y2 = this.stack[this.stack.length - 3];
    const x3 = this.stack[this.stack.length - 2];
    const y3 = this.stack[this.stack.length - 1];
    if (
      typeof x1 != "number" ||
      typeof y1 != "number" ||
      typeof x2 != "number" ||
      typeof y2 != "number" ||
      typeof x3 != "number" ||
      typeof y3 != "number"
    ) {
      this.initiateError("typecheck", "curveto");
      return;
    }
    const box = currentPath(this).bbox;
    const control1 = this.CTM.transform(x1, y1);
    if (box && outsideBBox(control1, box)) {
      this.initiateError("rangecheck", "curveto");
      return;
    }
    const control2 = this.CTM.transform(x2, y2);
    if (box && outsideBBox(control2, box)) {
      this.initiateError("rangecheck", "curveto");
      return;
    }
    const end = this.CTM.transform(x3, y3);
    if (box && outsideBBox(end, box)) {
      this.initiateError("rangecheck", "curveto");
      return;
    }
    lastSubpath(this).push({ type: "curveto", coord1: control1, coord2: control2, coord3: end });
    this.gstate.position = { x: x3, y: y3 };
    for (let i = 0; i < 6; i++) this.stack.pop();
  },

  arc(this: PSCore) {
    arcOperator(this, "arc");
  },

  arcn(this: PSCore) {
    arcOperator(this, "arcn");
  },

  /** Sic: not implemented; drops its five operands. */
  arct(this: PSCore) {
    for (let i = 0; i < 5; i++) this.stack.pop();
  },
} satisfies Record<string, PSValue>;
