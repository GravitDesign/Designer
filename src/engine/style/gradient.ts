// Old: chunk.vendor.js module 138 (GGradient).
import { registerClass } from "../core/object.ts";
import { equals as valuesEqual } from "../core/util.ts";
import { GMath } from "../math/math.ts";
import { Transform } from "../math/transform.ts";
import type { Color } from "../color/color.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { Pattern } from "./pattern.ts";

export interface GradientStop {
  /** 0-1 along the gradient. */
  position: number;
  color: Color;
  opacity: number;
}

/** One saved stop: position, serialized color, opacity. */
export interface GradientStopBlob {
  p: number;
  c?: string | null;
  o?: number;
}

/**
 * The saved form of a gradient. Only values that differ from the defaults
 * are written; subclasses add their own keys.
 */
export interface GradientBlob {
  s?: number;
  t?: number[];
  fx?: number;
  fy?: number;
  x: GradientStopBlob[];
  [key: string]: unknown;
}

function compareStops(a: GradientStop, b: GradientStop): number {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
}

/**
 * Base of the gradients: color stops sorted by position (default white to
 * black), a scale, a focal point (fx, fy) and an optional transform.
 */
export class Gradient extends Pattern {
  static {
    registerClass(this, "GGradient");
  }

  /**
   * Compares stops and, unless `ignoreTransform`, transform, scale and
   * focal point. Two missing gradients are equal; one missing gradient
   * throws, as it did in the old code.
   */
  static equals(a: unknown, b: unknown, ignoreTransform?: boolean): boolean {
    if (!((a && b) || a !== b)) return true;
    const first = a as Gradient;
    const second = b as Gradient;
    if (!ignoreTransform) {
      if (!Transform.equals(first._transform, second._transform)) return false;
      if (first._scale !== second._scale || first._fx !== second._fx || first._fy !== second._fy) {
        return false;
      }
    }
    if (first._stops.length !== second._stops.length) return false;
    const stopsA = first._stops;
    const stopsB = second._stops;
    for (let i = 0; i < stopsA.length; ++i) {
      const stopA = stopsA[i] as GradientStop;
      const stopB = stopsB[i] as GradientStop;
      if (stopA.position !== stopB.position) return false;
      if (stopA.opacity !== stopB.opacity) return false;
      if (!valuesEqual(stopA.color, stopB.color)) return false;
    }
    return true;
  }

  _stops: GradientStop[];
  _scale: number;
  _fx: number;
  _fy: number;
  _transform: Transform | null | undefined;

  constructor(
    stops?: readonly GradientStop[] | null,
    scale?: number,
    fx?: number,
    fy?: number,
    transform?: Transform | null,
  ) {
    super();
    if (stops) {
      this._stops = [];
      for (let i = 0; i < stops.length; ++i) {
        const stop = stops[i] as GradientStop;
        this._stops.push({
          position: Math.max(0, Math.min(1, stop.position)),
          color: stop.color,
          opacity: stop.opacity,
        });
      }
      this._stops.sort(compareStops);
    } else {
      this._stops = [
        { color: RGBColor.WHITE, position: 0, opacity: 1 },
        { color: RGBColor.BLACK, position: 1, opacity: 1 },
      ];
    }
    this._scale = "number" == typeof scale ? scale : 1;
    this._fx = "number" == typeof fx ? fx : 0.5;
    this._fy = "number" == typeof fy ? fy : 0.5;
    this._transform = transform || null;
  }

  getStops(): GradientStop[] {
    return this._stops;
  }

  /** The unweighted mean of the stop colors and opacities. */
  override getAverageColor(): number[] {
    const stops = this._stops;
    const count = stops.length;
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for (let i = 0; i < count; i++) {
      const stop = stops[i] as GradientStop;
      const opacity = stop.opacity;
      const rgb = stop.color.toScreen();
      r += rgb[0] as number;
      g += rgb[1] as number;
      b += rgb[2] as number;
      a += opacity;
    }
    return [r / count, g / count, b / count, a / count];
  }

  getClonedStops(): GradientStop[] {
    return this._stops.map((stop) => ({
      position: stop.position,
      color: stop.color,
      opacity: stop.opacity,
    }));
  }

  override serialize(): string {
    return JSON.stringify(this._serializeToBlob());
  }

  override deserialize(blob: string): void {
    const data = JSON.parse(blob) as GradientBlob | null;
    if (data) this._deserializeFromBlob(data);
  }

  getScale(): number {
    return this._scale;
  }

  getTransform(): Transform | null | undefined {
    return this._transform;
  }

  setTransform(transform: Transform | null | undefined): void {
    this._transform = transform;
  }

  /** The stops as CSS color stops ("#FF0000 0%, rgba(...) 50%"). */
  toScreenCSS(opacity?: number, noProfile?: boolean): string {
    const stops = this.getStops();
    const parts: string[] = [];
    for (let i = 0; i < stops.length; ++i) {
      const stop = stops[i] as GradientStop;
      let stopOpacity = stop.opacity;
      if ("number" == typeof opacity) stopOpacity *= opacity;
      parts.push(
        stop.color.toScreenCSS(stopOpacity, noProfile) +
          " " +
          Math.round(100 * stop.position) +
          "%",
      );
    }
    return parts.join(", ");
  }

  sortStops(): void {
    this._stops.sort(compareStops);
  }

  override clone(): Gradient {
    throw new Error("Not Supported");
  }

  _serializeToBlob(): GradientBlob {
    const blob: Partial<GradientBlob> = {};
    if (this._scale && 1 !== this._scale) blob.s = this._scale;
    if (this._transform) blob.t = Transform.serialize(this._transform);
    if (!GMath.isEqualEps(this._fx, 0.5)) blob.fx = this._fx;
    if (!GMath.isEqualEps(this._fy, 0.5)) blob.fy = this._fy;
    blob.x = [];
    for (let i = 0; i < this._stops.length; ++i) {
      const stop = this._stops[i] as GradientStop;
      // The opacity is always written, also when it is 1.
      blob.x.push({ p: stop.position, c: Pattern.serialize(stop.color), o: stop.opacity });
    }
    return blob as GradientBlob;
  }

  /**
   * Reads the saved form. Old files can have opacity-only stops (an "o"
   * without "c"); their opacity goes to the color stop at the same
   * position.
   */
  _deserializeFromBlob(blob: GradientBlob): void {
    this._scale = Object.hasOwn(blob, "s") ? (blob.s as number) : 1;
    this._fx = Object.hasOwn(blob, "fx") ? (blob.fx as number) : 0.5;
    this._fy = Object.hasOwn(blob, "fy") ? (blob.fy as number) : 0.5;
    this._transform = Object.hasOwn(blob, "t") ? Transform.deserialize(blob.t) : null;
    this._stops = [];
    let opacityStops: GradientStop[] | null = null;
    for (let i = 0; i < blob.x.length; ++i) {
      const saved = blob.x[i] as GradientStopBlob;
      const stop = { position: Math.min(1, Math.max(0, saved.p)) } as GradientStop;
      let hasOpacity = false;
      if (Object.hasOwn(saved, "c")) {
        stop.color = Pattern.deserialize(saved.c) as Color;
        if (Object.hasOwn(saved, "o")) {
          stop.opacity = saved.o as number;
          hasOpacity = true;
        } else {
          stop.opacity = 1;
        }
        this._stops.push(stop);
      }
      if (!hasOpacity && Object.hasOwn(saved, "o")) {
        stop.opacity = saved.o as number;
        if (!opacityStops) opacityStops = [];
        opacityStops.push(stop);
      }
    }
    if (opacityStops) {
      for (let i = 0; i < opacityStops.length; ++i) {
        const position = (opacityStops[i] as GradientStop).position;
        const opacity = (opacityStops[i] as GradientStop).opacity;
        for (let j = 0; j < this._stops.length; ++j) {
          const stop = this._stops[j] as GradientStop;
          if (GMath.isEqualEps(stop.position, position)) stop.opacity = opacity;
        }
      }
    }
  }

  override toString(): string {
    return "[Object GGradient]";
  }
}
