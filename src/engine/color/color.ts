// Old: chunk.vendor.js module 68 (GColor).
import { registerClass } from "../core/object.ts";
import { numToHexSixDigitsString } from "../core/util.ts";
import { Pattern } from "../style/pattern.ts";
import type { IccHeader, IccTable } from "./icc-header.ts";
import { IccProfile } from "./icc-profile.ts";

/** Rounds and clamps to a byte. */
function toByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

/** sRGB gamma companding (linear → sRGB). */
function compandSRGB(value: number): number {
  return value < 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
}

/** Inverse sRGB companding (sRGB → linear). */
function linearizeSRGB(value: number): number {
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

/** The CIE Lab f(t) function. */
function labF(value: number): number {
  return value > 216 / 24389 ? Math.pow(value, 1 / 3) : ((24389 / 27) * value + 16) / 116;
}

/** Linear sRGB (D65) → XYZ, Bradford-adapted to D50, row major. */
const RGB_TO_XYZ_D50 = [
  0.4360747, 0.3850649, 0.1430804, 0.2225045, 0.7168786, 0.0606169, 0.0139322, 0.0971045, 0.7141733,
];

/** XYZ (D50) → linear sRGB (D65), row major. */
const XYZ_D50_TO_RGB = [
  3.1338561, -1.6168667, -0.4906146, -0.9787684, 1.9161415, 0.033454, 0.0719453, -0.2289914,
  1.4052427,
];

/**
 * Base of all colors. The value is an array whose meaning depends on the
 * subclass ([r, g, b] 0-255, [c, m, y, k] 0-1, [h, s, v]); it is saved as
 * its JSON text.
 *
 * The statics hold the color conversions. CMYK ↔ RGB goes through the ICC
 * profile once `setCMYKProfile` has loaded it (asynchronously); before
 * that, and with `noProfile`, they use the naive formulas, so the same
 * CMYK value shows a different RGB before and after the profile arrives.
 */
export class Color extends Pattern {
  static {
    registerClass(this, "GColor");
  }

  static ColorModes = { RGB: "RGB", HSB: "HSB", CMYK: "CMYK" } as const;

  static IccProfileNames: Record<string, string> = {
    USWebCoatedSWOPv2: "USWebCoatedSWOP.icc",
  };

  /** Loaded profiles by name. */
  static IccProfiles: Record<string, IccHeader> = {};

  static D50 = [0.9642, 1, 0.82491];

  static currentCMYKProfile: IccHeader | null = null;

  static iccReader: IccProfile | null = null;

  /**
   * Makes a known profile the current CMYK profile, loading it from
   * `baseUrl` (default "assets/data/icc/") the first time. `done` runs
   * once the request has finished, whether or not the profile was usable.
   *
   * The old code read file:// locations through Node's fs (the old
   * Electron shell loaded the app from disk); the new app is always served
   * over HTTP, so every location is fetched.
   */
  static setCMYKProfile(name: string, baseUrl?: string, done?: () => void): void {
    if (!(name in Color.IccProfileNames)) return;
    if (name in Color.IccProfiles) {
      Color.currentCMYKProfile = Color.IccProfiles[name] as IccHeader;
      if (done) done();
      return;
    }
    const readProfile = (buffer: ArrayBuffer) => {
      if (!Color.iccReader) Color.iccReader = new IccProfile();
      Color.iccReader.read(buffer, (profile) => {
        if (profile) {
          Color.IccProfiles[name] = profile;
          Color.currentCMYKProfile = profile;
        }
      });
    };
    const url = (baseUrl || "assets/data/icc/") + Color.IccProfileNames[name];
    void fetch(url)
      .then(async (response) => {
        if (response.status == 200) {
          const buffer = await response.arrayBuffer();
          if (buffer) readProfile(buffer);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (done) done();
      });
  }

  static rgbToHSV(rgb: number[]): number[] {
    const r = (rgb[0] as number) / 255;
    const g = (rgb[1] as number) / 255;
    const b = (rgb[2] as number) / 255;
    const min = Math.min(r, Math.min(g, b));
    const max = Math.max(r, Math.max(g, b));
    if (min === max) return [0, 0, min];
    const delta = r === min ? g - b : b === min ? r - g : b - r;
    const sector = r === min ? 3 : b === min ? 1 : 5;
    return [
      Math.min(360, Math.max(0, Math.round(60 * (sector - delta / (max - min))))),
      (max - min) / max,
      max,
    ];
  }

  static hsvToCMYK(hsv: number[]): number[] {
    return Color.rgbToCMYK(Color.hsvToRGB(hsv));
  }

  static cmykToHSV(cmyk: number[]): number[] {
    return Color.rgbToHSV(Color.cmykToRGB(cmyk));
  }

  static hsvToRGB(hsv: number[]): number[] {
    const chroma = (hsv[2] as number) * (hsv[1] as number);
    const sector = (hsv[0] as number) / 60;
    const x = chroma * (1 - Math.abs((sector % 2) - 1));
    const m = (hsv[2] as number) - chroma;
    const rgb =
      sector < 1
        ? [chroma, x, 0]
        : sector < 2
          ? [x, chroma, 0]
          : sector < 3
            ? [0, chroma, x]
            : sector < 4
              ? [0, x, chroma]
              : sector < 5
                ? [x, 0, chroma]
                : sector <= 6
                  ? [chroma, 0, x]
                  : [0, 0, 0];
    return [
      toByte(255 * ((rgb[0] as number) + m)),
      toByte(255 * ((rgb[1] as number) + m)),
      toByte(255 * ((rgb[2] as number) + m)),
    ];
  }

  /**
   * CMYK (0-1) → RGB (0-255). With a profile: the CMYK bytes run through
   * the AToB1 input curves, a 4D interpolation in the colour lookup grid
   * and the output curves to Lab, then Lab → XYZ → sRGB.
   */
  static cmykToRGB(cmyk: number[], noProfile?: boolean): number[] {
    let k = 4 === cmyk.length ? (cmyk[3] as number) : 0;
    let c = (cmyk[0] as number) * (1 - k) + k;
    let m = (cmyk[1] as number) * (1 - k) + k;
    let y = (cmyk[2] as number) * (1 - k) + k;
    const naive = [toByte(255 * (1 - c)), toByte(255 * (1 - m)), toByte(255 * (1 - y))];
    const profile = Color.currentCMYKProfile;
    if (noProfile || !profile) return naive;

    c = toByte(255 * (cmyk[0] as number));
    m = toByte(255 * (cmyk[1] as number));
    y = toByte(255 * (cmyk[2] as number));
    k = 4 === cmyk.length ? toByte(255 * (cmyk[3] as number)) : 0;
    const range = profile.AtoB1normalizationRange as number;
    c = Color._mapChannel(c, 0, 4, 255, profile.AtoB1InputChange, range);
    m = Color._mapChannel(m, 1, 4, 255, profile.AtoB1InputChange, range);
    y = Color._mapChannel(y, 2, 4, 255, profile.AtoB1InputChange, range);
    k = Color._mapChannel(k, 3, 4, 255, profile.AtoB1InputChange, range);

    // Find the grid cell of each channel. The cells cover 0-255 in steps
    // of ceil(255 / (points - 1)); a value on a cell border belongs to the
    // later cell.
    const gridPoints = profile.AtoB1CLUTNumPts as number;
    const clut = profile.AtoB1CLUT as IccTable;
    const step = Math.ceil(255 / (gridPoints - 1));
    const cells: [number, number][] = [];
    let cellC = 0;
    let cellM = 0;
    let cellY = 0;
    let cellK = 0;
    for (let start = 0, cell = 0; start < 256; start += step, ++cell) {
      let end = start + step;
      end = end < 255 ? end : 255;
      cells.push([start, end]);
      if (c >= start && c <= end) cellC = cell;
      if (m >= start && m <= end) cellM = cell;
      if (y >= start && y <= end) cellY = cell;
      if (k >= start && k <= end) cellK = cell;
    }
    const boundsC = cells[cellC] as [number, number];
    const boundsM = cells[cellM] as [number, number];
    const boundsY = cells[cellY] as [number, number];
    const boundsK = cells[cellK] as [number, number];
    const volume =
      (boundsC[1] - boundsC[0]) *
      (boundsM[1] - boundsM[0]) *
      (boundsY[1] - boundsY[0]) *
      (boundsK[1] - boundsK[0]);
    if (!volume) return naive;

    // Multilinear interpolation over the 16 corners of the 4D cell: each
    // corner is weighted by the volume of the opposite sub-box.
    let lightness = 0;
    let labA = 0;
    let labB = 0;
    for (let corner = 0; corner < 16; ++corner) {
      const offsetC = (8 & corner) >> 3;
      const offsetM = (4 & corner) >> 2;
      const offsetY = (2 & corner) >> 1;
      const offsetK = 1 & corner;
      const oppositeC = 8 & corner ? 0 : 1;
      const oppositeM = 4 & corner ? 0 : 1;
      const oppositeY = 2 & corner ? 0 : 1;
      const oppositeK = 1 & corner ? 0 : 1;
      const weight =
        ((oppositeC > 0 ? boundsC[oppositeC] - c : c - boundsC[oppositeC]) *
          (oppositeM > 0 ? boundsM[oppositeM] - m : m - boundsM[oppositeM]) *
          (oppositeY > 0 ? boundsY[oppositeY] - y : y - boundsY[oppositeY]) *
          (oppositeK > 0 ? boundsK[oppositeK] - k : k - boundsK[oppositeK])) /
        volume;
      const index =
        gridPoints *
          (gridPoints * (gridPoints * (cellC + offsetC) + (cellM + offsetM)) + (cellY + offsetY)) +
        cellK +
        offsetK;
      const entry = [clut[3 * index], clut[3 * index + 1], clut[3 * index + 2]] as number[];
      lightness += weight * (entry[0] as number);
      labA += weight * (entry[1] as number);
      labB += weight * (entry[2] as number);
    }
    lightness = Color._mapChannel(lightness, 0, 3, range, profile.AtoB1OutputChange, range);
    labA = Color._mapChannel(labA, 1, 3, range, profile.AtoB1OutputChange, range);
    labB = Color._mapChannel(labB, 2, 3, range, profile.AtoB1OutputChange, range);
    lightness = (100 * lightness) / range;
    if (255 != range) {
      const half = Math.ceil(range / 2);
      labA -= half;
      labA = labA < 0 ? (labA / half) * 128 : (labA / (half - 1)) * 127;
      labB -= half;
      labB = labB < 0 ? (labB / half) * 128 : (labB / (half - 1)) * 127;
    } else {
      labA -= 128;
      labB -= 128;
    }

    // Lab → XYZ (D50).
    const fy = (lightness + 16) / 116;
    const fz = fy - labB / 200;
    const fx = labA / 500 + fy;
    let xr = fx * fx * fx;
    let yr = fy * fy * fy;
    let zr = fz * fz * fz;
    if (xr <= 216 / 24389) xr = (116 * fx - 16) / (24389 / 27);
    if (zr <= 216 / 24389) zr = (116 * fz - 16) / (24389 / 27);
    // Quirk: this should be lightness / (24389 / 27); the old code divides
    // by 255 and multiplies by 100 first.
    if (yr <= 216 / 24389) yr = ((lightness / 255) * 100) / (24389 / 27);
    xr *= Color.D50[0] as number;
    yr *= Color.D50[1] as number;
    zr *= Color.D50[2] as number;

    const M = XYZ_D50_TO_RGB as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    let r = M[0] * xr + M[1] * yr + M[2] * zr;
    let g = M[3] * xr + M[4] * yr + M[5] * zr;
    let b = M[6] * xr + M[7] * yr + M[8] * zr;
    r = compandSRGB(r);
    g = compandSRGB(g);
    b = compandSRGB(b);
    return [toByte(255 * r), toByte(255 * g), toByte(255 * b)];
  }

  /**
   * RGB (0-255) → CMYK (0-1). With a profile: sRGB → XYZ → Lab, then the
   * BToA1 input curves, a 3D interpolation in the colour lookup grid and
   * the output curves.
   */
  static rgbToCMYK(rgb: number[], noProfile?: boolean): number[] {
    let c = 1 - (rgb[0] ? (rgb[0] as number) / 255 : 0);
    let m = 1 - (rgb[1] ? (rgb[1] as number) / 255 : 0);
    let y = 1 - (rgb[2] ? (rgb[2] as number) / 255 : 0);
    let k = Math.min(y, Math.min(m, Math.min(c, 1)));
    const cc = c - k;
    const mm = m - k;
    const yy = y - k;
    const rest = 1 - k;
    const naive = [
      Math.min(1, Math.max(0, cc && rest ? cc / rest : 0)),
      Math.min(1, Math.max(0, mm && rest ? mm / rest : 0)),
      Math.min(1, Math.max(0, yy && rest ? yy / rest : 0)),
      Math.min(1, Math.max(0, k)),
    ];
    const profile = Color.currentCMYKProfile;
    if (noProfile || !profile) return naive;

    // sRGB → XYZ (D50) → Lab.
    const lr = linearizeSRGB(rgb[0] ? (rgb[0] as number) / 255 : 0);
    const lg = linearizeSRGB(rgb[1] ? (rgb[1] as number) / 255 : 0);
    const lb = linearizeSRGB(rgb[2] ? (rgb[2] as number) / 255 : 0);
    const M = RGB_TO_XYZ_D50 as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    let x = M[0] * lr + M[1] * lg + M[2] * lb;
    let yv = M[3] * lr + M[4] * lg + M[5] * lb;
    let z = M[6] * lr + M[7] * lg + M[8] * lb;
    x /= Color.D50[0] as number;
    yv /= Color.D50[1] as number;
    z /= Color.D50[2] as number;
    const fx = labF(x);
    const fy = labF(yv);
    let lightness = 116 * fy - 16;
    let labA = 500 * (fx - fy);
    let labB = 200 * (fy - labF(z));

    const range = profile.BtoA1normalizationRange as number;
    lightness = (lightness * range) / 100;
    if (255 != range) {
      const half = Math.ceil(range / 2);
      labA = labA < 0 ? (labA / 128) * half : (labA / 127) * (half - 1);
      labB = labB < 0 ? (labB / 128) * half : (labB / 127) * (half - 1);
      labA += half;
      labB += half;
    } else {
      labA += 128;
      labB += 128;
    }
    lightness = Color._mapChannel(lightness, 0, 3, range, profile.BtoA1InputChange, range);
    labA = Color._mapChannel(labA, 1, 3, range, profile.BtoA1InputChange, range);
    labB = Color._mapChannel(labB, 2, 3, range, profile.BtoA1InputChange, range);

    const gridPoints = profile.BtoA1CLUTNumPts as number;
    const clut = profile.BtoA1CLUT as IccTable;
    const step = Math.ceil(255 / (gridPoints - 1));
    const cells: [number, number][] = [];
    let cellL = 0;
    let cellA = 0;
    let cellB = 0;
    for (let start = 0, cell = 0; start < 256; start += step, ++cell) {
      let end = start + step;
      end = end < 255 ? end : 255;
      cells.push([start, end]);
      if (lightness >= start && lightness <= end) cellL = cell;
      // Quirk: the upper bound tests the naive magenta (0-1) instead of a,
      // so a's cell is the last one starting at or below a.
      if (labA >= start && m <= end) cellA = cell;
      if (labB >= start && labB <= end) cellB = cell;
    }
    const boundsL = cells[cellL] as [number, number];
    const boundsA = cells[cellA] as [number, number];
    const boundsB = cells[cellB] as [number, number];
    const volume =
      (boundsL[1] - boundsL[0]) * (boundsA[1] - boundsA[0]) * (boundsB[1] - boundsB[0]);
    if (!volume) return naive;

    c = 0;
    m = 0;
    y = 0;
    k = 0;
    for (let corner = 0; corner < 8; ++corner) {
      const offsetL = (4 & corner) >> 2;
      const offsetA = (2 & corner) >> 1;
      const offsetB = 1 & corner;
      const oppositeA = 2 & corner ? 0 : 1;
      const oppositeB = 1 & corner ? 0 : 1;
      const oppositeL = 4 & corner ? 0 : 1;
      const weight =
        ((oppositeL > 0 ? boundsL[oppositeL] - lightness : lightness - boundsL[oppositeL]) *
          (oppositeA > 0 ? boundsA[oppositeA] - labA : labA - boundsA[oppositeA]) *
          (oppositeB > 0 ? boundsB[oppositeB] - labB : labB - boundsB[oppositeB])) /
        volume;
      const index =
        gridPoints * (gridPoints * (cellL + offsetL) + (cellA + offsetA)) + cellB + offsetB;
      const entry = [
        clut[4 * index],
        clut[4 * index + 1],
        clut[4 * index + 2],
        clut[4 * index + 3],
      ] as number[];
      c += weight * (entry[0] as number);
      m += weight * (entry[1] as number);
      y += weight * (entry[2] as number);
      k += weight * (entry[3] as number);
    }
    c = Color._mapChannel(c, 0, 4, 255, profile.BtoA1OutputChange, range);
    m = Color._mapChannel(m, 1, 4, 255, profile.BtoA1OutputChange, range);
    y = Color._mapChannel(y, 2, 4, 255, profile.BtoA1OutputChange, range);
    k = Color._mapChannel(k, 3, 4, 255, profile.BtoA1OutputChange, range);
    if (!(isFinite(c) && isFinite(m) && isFinite(y) && isFinite(k))) console.log("BOMB");
    return [c / 255, m / 255, y / 255, k / 255];
  }

  static rgbToHtmlHex(rgb: number[]): string {
    const value = ((rgb[0] as number) << 16) | ((rgb[1] as number) << 8) | (rgb[2] as number);
    return "#" + numToHexSixDigitsString(value);
  }

  /** "#RRGGBB", or "rgba(r,g,b,a)" for an opacity other than 1. */
  static rgbToCSS(rgb: number[], opacity?: number): string {
    return "number" == typeof opacity && 1 !== opacity
      ? "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + opacity + ")"
      : Color.rgbToHtmlHex(rgb);
  }

  /**
   * Runs one channel of `channelCount` through a piecewise linear curve.
   * `table` holds the curves of all channels one after the other, in
   * `tableRange` units; `value` is in `valueRange` units and is scaled in
   * and out of the table's range. Without a table the value passes through.
   */
  static _mapChannel(
    value: number,
    channel: number,
    channelCount: number,
    valueRange: number,
    table: IccTable | null,
    tableRange: number,
  ): number {
    let result = value;
    if (table && table.length >= 2) {
      const entries = Math.floor(table.length / channelCount);
      const first = channel * entries;
      if (valueRange != tableRange) result = (value / valueRange) * tableRange;
      const step = Math.ceil(tableRange / (entries - 1));
      let segment = Math.floor(result / step);
      let start = segment * step;
      if (start == result && 0 != result) {
        segment -= 1;
        start -= step;
      }
      let end = start + step;
      end = end < tableRange ? end : tableRange;
      const t = (result - start) / (end - start || 1);
      const low = table[first + segment] as number;
      result = low + t * ((table[first + segment + 1] as number) - low);
      if (valueRange != tableRange) result = (result / tableRange) * valueRange;
    }
    return result;
  }

  _value: number[] | null;

  constructor(value?: unknown) {
    super();
    this._value = value && value instanceof Array ? (value.slice() as number[]) : null;
  }

  getValue(): number[] | null {
    return this._value;
  }

  override serialize(): string {
    return this._value ? JSON.stringify(this._value) : "";
  }

  override deserialize(blob: string): void {
    if (blob) this._value = JSON.parse(blob) as number[];
  }

  toHumanString(): string {
    throw new Error("Not Supported.");
  }

  /** The color as [r, g, b] (0-255) for the screen. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- CMYK colors take noProfile
  toScreen(noProfile?: boolean): number[] {
    throw new Error("Not Supported.");
  }

  toScreenCSS(opacity?: number, noProfile?: boolean): string {
    return Color.rgbToCSS(this.toScreen(noProfile), opacity);
  }

  override getAverageColor(): number[] {
    return this.toScreen().concat([1]);
  }

  override asCSSBackground(opacity?: number): string {
    const css = this.toScreenCSS(opacity);
    return "linear-gradient(" + css + ", " + css + ")";
  }

  override clone(): Color {
    throw new Error("Not Supported");
  }

  override toString(): string {
    return "[Object GColor]";
  }
}
