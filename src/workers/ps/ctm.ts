// Old: public/psctm.js (PSCTM, webpack module 1371 of its own build).
//
// Matrix helpers for the interpreter. Matrices are PostScript arrays of six
// numbers [a b c d tx ty]; without an explicit matrix the current CTM of
// the graphics state is used.
import type { PSCore } from "./core.ts";

export interface PSPoint {
  x: number;
  y: number;
}

/** A PostScript matrix read as six numbers (missing entries read as undefined, as before). */
type Matrix6 = readonly [number, number, number, number, number, number];

type MatrixArgument = readonly number[] | undefined;

export class PSCTM {
  readonly core: PSCore;

  constructor(core: PSCore) {
    this.core = core;
    this.core.CTM = this;
  }

  /**
   * The matrix argument when it was passed (even as undefined, which then
   * fails like the old `arguments.length` check did), else the CTM.
   */
  private current(rest: readonly MatrixArgument[]): Matrix6 {
    return (rest.length == 1 ? rest[0] : this.core.gstate.CTM) as unknown as Matrix6;
  }

  getAngle(...matrix: MatrixArgument[]): number {
    const [a, b, c, d] = this.current(matrix);
    const scale = Math.sqrt(Math.abs(a * d - c * b));
    return Math.acos(a / scale);
  }

  transform(x: number, y: number, ...matrix: MatrixArgument[]): PSPoint {
    const [a, b, c, d, tx, ty] = this.current(matrix);
    return { x: x * a + y * c + tx, y: x * b + y * d + ty };
  }

  inverseTransform(x: number, y: number, ...matrix: MatrixArgument[]): PSPoint {
    const result = { x, y };
    const [a, b, c, d, tx, ty] = this.current(matrix);
    const determinant = a * d - c * b;
    if (!determinant) return result;
    const inverse = 1 / determinant;
    const ia = d * inverse;
    const id = a * inverse;
    const ib = -b * inverse;
    const ic = -c * inverse;
    const itx = -tx * ia - ty * ic;
    const ity = -tx * ib - ty * id;
    result.x = ia * x + ic * y + itx;
    result.y = ib * x + id * y + ity;
    return result;
  }

  inverseDeltaTransform(x: number, y: number, ...matrix: MatrixArgument[]): PSPoint {
    const result = { x, y };
    const [a, b, c, d] = this.current(matrix);
    const determinant = a * d - c * b;
    if (!determinant) return result;
    const inverse = 1 / determinant;
    const ia = d * inverse;
    const id = a * inverse;
    const ib = -b * inverse;
    const ic = -c * inverse;
    result.x = ia * x + ic * y;
    result.y = ib * x + id * y;
    return result;
  }

  deltaTransform(x: number, y: number, ...matrix: MatrixArgument[]): PSPoint {
    const result = { x: 0, y: 0 };
    const [a, b, c, d] = this.current(matrix);
    result.x = a * x + c * y;
    result.y = b * x + d * y;
    return result;
  }

  /** first × second. */
  multiply(first: readonly number[], second: readonly number[]): number[] {
    const [a, b, c, d, tx, ty] = first as unknown as Matrix6;
    const [e0, e1, e2, e3, e4, e5] = second as unknown as Matrix6;
    return [
      a * e0 + b * e2,
      a * e1 + b * e3,
      c * e0 + d * e2,
      c * e1 + d * e3,
      tx * e0 + ty * e2 + e4,
      tx * e1 + ty * e3 + e5,
    ];
  }

  invertible(matrix: readonly number[]): boolean {
    const [a, b, c, d] = matrix as unknown as Matrix6;
    return a * d - c * b != 0;
  }

  /** The inverse matrix, or [] when the matrix is singular. */
  invert(matrix: readonly number[]): number[] {
    const [a, b, c, d, tx, ty] = matrix as unknown as Matrix6;
    const determinant = a * d - c * b;
    if (!determinant) return [];
    const inverse = 1 / determinant;
    const ia = d * inverse;
    const id = a * inverse;
    const ib = -b * inverse;
    const ic = -c * inverse;
    return [ia, ib, ic, id, -tx * ia - ty * ic, -tx * ib - ty * id];
  }

  degreeToRadian(degrees: number): number {
    return (degrees / 360) * 2 * Math.PI;
  }

  radianToDegree(radians: number): number {
    return (360 * radians) / (2 * Math.PI);
  }

  /** Length of the image of the unit diagonal (1/√2, 1/√2). */
  getScaleFactor(matrix: readonly number[]): number {
    const [a, b, c, d] = matrix as unknown as Matrix6;
    const x = 0.7071067811865476 * a + 0.7071067811865476 * c;
    const y = 0.7071067811865476 * b + 0.7071067811865476 * d;
    return Math.sqrt(x * x + y * y);
  }
}
