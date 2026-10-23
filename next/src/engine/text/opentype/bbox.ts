// Old: chunk.vendor.js module 709 (opentype.js bbox.js, unchanged).

function derive(v0: number, v1: number, v2: number, v3: number, t: number): number {
  return (
    Math.pow(1 - t, 3) * v0 +
    3 * Math.pow(1 - t, 2) * t * v1 +
    3 * (1 - t) * Math.pow(t, 2) * v2 +
    Math.pow(t, 3) * v3
  );
}

/** A bounding box: the smallest rectangle around a path. Empty while any edge is NaN. */
export class BoundingBox {
  x1 = Number.NaN;
  y1 = Number.NaN;
  x2 = Number.NaN;
  y2 = Number.NaN;

  isEmpty(): boolean {
    return isNaN(this.x1) || isNaN(this.y1) || isNaN(this.x2) || isNaN(this.y2);
  }

  /** Grows the box to include the point. A null coordinate is left out. */
  addPoint(x: number | null, y: number | null): void {
    if (typeof x === "number") {
      if (isNaN(this.x1) || isNaN(this.x2)) {
        this.x1 = x;
        this.x2 = x;
      }
      if (x < this.x1) this.x1 = x;
      if (x > this.x2) this.x2 = x;
    }
    if (typeof y === "number") {
      if (isNaN(this.y1) || isNaN(this.y2)) {
        this.y1 = y;
        this.y2 = y;
      }
      if (y < this.y1) this.y1 = y;
      if (y > this.y2) this.y2 = y;
    }
  }

  addX(x: number): void {
    this.addPoint(x, null);
  }

  addY(y: number): void {
    this.addPoint(null, y);
  }

  /** Adds a cubic bezier: its end points and the extremes between them. */
  addBezier(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x: number,
    y: number,
  ): void {
    const p0 = [x0, y0];
    const p1 = [x1, y1];
    const p2 = [x2, y2];
    const p3 = [x, y];

    this.addPoint(x0, y0);
    this.addPoint(x, y);

    for (let i = 0; i <= 1; i++) {
      const v0 = p0[i] as number;
      const v1 = p1[i] as number;
      const v2 = p2[i] as number;
      const v3 = p3[i] as number;
      const b = 6 * v0 - 12 * v1 + 6 * v2;
      const a = -3 * v0 + 9 * v1 - 9 * v2 + 3 * v3;
      const c = 3 * v1 - 3 * v0;

      if (a === 0) {
        if (b === 0) continue;
        const t = -c / b;
        if (0 < t && t < 1) {
          if (i === 0) this.addX(derive(v0, v1, v2, v3, t));
          if (i === 1) this.addY(derive(v0, v1, v2, v3, t));
        }
        continue;
      }

      const b2ac = Math.pow(b, 2) - 4 * c * a;
      if (b2ac < 0) continue;
      const t1 = (-b + Math.sqrt(b2ac)) / (2 * a);
      if (0 < t1 && t1 < 1) {
        if (i === 0) this.addX(derive(v0, v1, v2, v3, t1));
        if (i === 1) this.addY(derive(v0, v1, v2, v3, t1));
      }
      const t2 = (-b - Math.sqrt(b2ac)) / (2 * a);
      if (0 < t2 && t2 < 1) {
        if (i === 0) this.addX(derive(v0, v1, v2, v3, t2));
        if (i === 1) this.addY(derive(v0, v1, v2, v3, t2));
      }
    }
  }

  /** Adds a quadratic bezier by raising it to a cubic one. */
  addQuad(x0: number, y0: number, x1: number, y1: number, x: number, y: number): void {
    const cp1x = x0 + (2 / 3) * (x1 - x0);
    const cp1y = y0 + (2 / 3) * (y1 - y0);
    const cp2x = cp1x + (1 / 3) * (x - x0);
    const cp2y = cp1y + (1 / 3) * (y - y0);
    this.addBezier(x0, y0, cp1x, cp1y, cp2x, cp2y, x, y);
  }
}
