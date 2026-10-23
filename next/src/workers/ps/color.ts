// Old: public/pscolor.js (PSColor, webpack module 1369 of its own build).
//
// Colour handling of the PostScript interpreter: image sample decoding,
// colour space channel counts, CIEBasedABC → XYZ → RGB, PostScript
// functions (types 0, 2 and 3), tint transforms of Separation and DeviceN
// spaces, and _getGColor, which turns a colour space plus colour (or a
// shading/pattern dict) into the plain objects the page turns into Gravit
// colours, gradients and mesh images ({type: "rgb" | "cmyk" | "linear" |
// "radial" | "imageData", ...}). The shading part of _getGColor lives in
// color-shadings.ts.
//
// The objects posted to the page go through JSON, so their key order and
// number values are part of the output.
import { getPatternColor } from "./color-shadings.ts";
import type { PSCore } from "./core.ts";
import type { PSClasses, PSPlainRecord, PSValue } from "./objects.ts";

/** A colour as the page receives it. */
export interface SolidGColor {
  type: "rgb" | "cmyk";
  value: number[];
}

export interface GradientStop {
  opacity?: number;
  color: unknown;
  position: number;
}

export interface GradientGColor {
  type: "linear" | "radial";
  value: PSValue[];
  stops: GradientStop[];
  transform: number[];
}

export interface ImageDataGColor {
  type: "imageData";
  value: number[];
  colorSpace: string;
  meshType: number;
  width: number;
  height: number;
  transform: number[];
}

export type GColor = SolidGColor | GradientGColor | ImageDataGColor;

/** A type 0 (sampled) function. */
export interface SampledFunction {
  type: "samples";
  domain: number[];
  range: number[];
  order: PSValue;
  encode: number[] | null;
  decode: number[] | null;
  size: number[];
  samples: number[];
  bitsPerSample: number;
}

/**
 * A type 2 (exponential) function: with an input value it carries the
 * result, otherwise its end colours (false when the dict has none).
 */
export interface ExponentialFunction {
  type: "exp";
  C0?: number[] | false;
  C1?: number[] | false;
  domain: number[];
  range: number[] | false;
  result?: number[];
}

/** A type 3 (stitching) function. */
export interface StitchingFunction {
  type: "stitch";
  domain: number[];
  bounds: number[];
  encode: number[];
  stitches: (PSFunctionInfo | null)[];
}

export type PSFunctionInfo = SampledFunction | ExponentialFunction | StitchingFunction;

/** The blue the page gets when a colour can't be converted (after error "01"). */
export function failedColor(): SolidGColor {
  return { type: "rgb", value: [0, 0, 255] };
}

type Executable = { execute(core: PSCore): unknown };

// prettier-ignore
type ControlPointIndex =
  0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
  16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31;

/** Numbers read by index without checks (missing ones read as undefined, as before). */
export type Indexed = { readonly [K in ControlPointIndex]: number };

/** A data source read bit by bit: a file is read to its end first, anything else is indexed directly. */
export class ColorBitsReader {
  _dataSource: ArrayLike<number | null>;
  _dataIdx = 0;
  _dataBitsIdx = 0;

  constructor(source: PSValue, classes: PSClasses) {
    if (classes.isPSObject(source, "file")) {
      const bytes: (number | null)[] = [];
      this._dataSource = bytes;
      while (!source.isEOF()) bytes.push(source.getUint8());
    } else {
      // Sic: PS strings and arrays have no length, so they read as empty
      // (and never as EOF).
      this._dataSource = source as unknown as ArrayLike<number>;
    }
    this._dataIdx = 0;
    this._dataBitsIdx = 0;
  }

  rewindData(): void {
    this._dataIdx = 0;
    this._dataBitsIdx = 0;
  }

  isEOF(): boolean {
    return this._dataIdx >= this._dataSource.length;
  }

  /** The next `bits` bits MSB first, or null (and the end) when not enough are left. */
  readData(bits: number): number | null {
    const source = this._dataSource as ArrayLike<number>;
    const bytes = Math.ceil((bits + this._dataBitsIdx) / 8);
    if (this._dataIdx + bytes <= source.length) {
      let value = (source[this._dataIdx] as number) & (255 >> this._dataBitsIdx);
      if (bytes > 1) {
        for (let i = 1; i < bytes; ++i) {
          value <<= 8;
          value >>>= 0;
          value += source[this._dataIdx + i] as number;
        }
      }
      const rest = 8 * bytes - bits - this._dataBitsIdx;
      if (rest > 0) {
        value >>= rest;
        this._dataIdx += bytes - 1;
        this._dataBitsIdx = 8 - rest;
      } else {
        this._dataIdx += bytes;
        this._dataBitsIdx = 0;
      }
      return value;
    }
    this._dataIdx = source.length;
    this._dataBitsIdx = 0;
    return null;
  }
}

/** Value of a PS object (the old code read `.value` off anything). */
export function valueOf(object: unknown): unknown {
  return (object as { value?: unknown }).value;
}

/** A value used in arithmetic as JS sees it (a one-element array coerces to its number). */
export function asNumber(value: unknown): number {
  return value as number;
}

export class PSColor {
  static BitsReader = ColorBitsReader;

  readonly core: PSCore;
  imageColorCache: Record<number, number[]>;
  imageColorCacheHit: number;
  imageColorCacheFail: number;

  /** Number of colour components per colour space family. */
  readonly PSColorSpaceChannels: Record<string, number | ((space: PSValue[]) => number)> = {
    DeviceGray: 1,
    CIEBasedA: 1,
    Separation: 1,
    Pattern: 1,
    Indexed: 1,
    DeviceRGB: 3,
    CIEBasedABC: 3,
    CIEBasedDEF: 3,
    CIEBasedDEFG: 4,
    DeviceCMYK: 4,
    DeviceN: (space: PSValue[]) => (valueOf(space[1]) as PSValue[]).length,
  };

  readonly XYZToRGBMatrix = [
    3.241, -0.9692, 0.0556, -1.5374, 1.876, -0.204, -0.4986, 0.0416, 1.057,
  ];

  constructor(core: PSCore) {
    this.core = core;
    this.core.color = this;
    this.imageColorCache = {};
    this.imageColorCacheHit = 0;
    this.imageColorCacheFail = 0;
  }

  /** Maps raw samples through a Decode array (default [0 1 ...]) with `max` the largest sample. */
  imageColorDecode(samples: number[], decode: number[] | null | undefined, max?: number): number[] {
    let ranges = decode;
    if (!ranges) {
      ranges = [];
      for (let i = 0; i < samples.length; i++) {
        ranges[2 * i] = 0;
        ranges[2 * i + 1] = 1;
      }
    }
    const result: number[] = [];
    const largest = max || Math.round(Math.pow(2, 8) - 1);
    for (let i = 0; i < samples.length; ++i) {
      const low = ranges[2 * i] as number;
      result[i] = low + ((samples[i] as number) * ((ranges[2 * i + 1] as number) - low)) / largest;
    }
    return result;
  }

  /**
   * One image pixel to byte components of its colour space (RGB or CMYK).
   * CIEBasedABC results are cached by the raw samples. Sic: a cache hit
   * returns the unrounded RGB fractions the first conversion stored.
   */
  imageColorProcess(samples: number[], space: PSValue[], decode: unknown, max?: number): number[] {
    let result: number[] | null = null;
    const family = valueOf(space[0]);
    if (family == "CIEBasedABC") {
      const hash = this.pixelHash(samples);
      if (hash in this.imageColorCache) {
        this.imageColorCacheHit++;
        const cached = this.imageColorCache[hash] as number[];
        if (cached.length != 3) console.log("alyarma");
        return cached.slice();
      }
      this.imageColorCacheFail++;
      let ranges = decode;
      if (!(
        Object.prototype.toString.call(ranges) === "[object Array]" &&
        (ranges as unknown[]).length == 6
      ))
        ranges = [0, 1, 0, 1, 0, 1];
      const decoded = this.imageColorDecode(samples, ranges as number[], max);
      const rgb = this.CIEBasedABCToRGB(
        decoded[0] as number,
        decoded[1] as number,
        decoded[2] as number,
        valueOf(space[1]),
      );
      this.imageColorCache[hash] = rgb;
      result = [
        this.round_clamp_byte(255 * (rgb[0] as number)),
        this.round_clamp_byte(255 * (rgb[1] as number)),
        this.round_clamp_byte(255 * (rgb[2] as number)),
      ];
    } else if (family == "DeviceGray") {
      const decoded = this.imageColorDecode(samples, decode as number[] | null, max);
      // Sic: multiplies the one-element array, which coerces to its number.
      const gray = this.round_clamp_byte(255 * asNumber(decoded));
      result = [gray, gray, gray];
    } else if (family == "DeviceCMYK") {
      const decoded = this.imageColorDecode(samples, decode as number[] | null, max);
      result = [
        this.round_clamp_byte(255 * (decoded[0] as number)),
        this.round_clamp_byte(255 * (decoded[1] as number)),
        this.round_clamp_byte(255 * (decoded[2] as number)),
        this.round_clamp_byte(255 * (decoded[3] as number)),
      ];
    } else if (family == "DeviceRGB") {
      const decoded = this.imageColorDecode(samples, decode as number[] | null, max);
      result = [
        this.round_clamp_byte(255 * (decoded[0] as number)),
        this.round_clamp_byte(255 * (decoded[1] as number)),
        this.round_clamp_byte(255 * (decoded[2] as number)),
      ];
    } else if (family == "Separation" || family == "DeviceN") {
      const decoded = this.imageColorDecode(samples, decode as number[] | null, max);
      result = this._getGColor(space, decoded).value as number[];
    } else if (family == "Indexed") {
      if (this.core.classes.isPSObject(space[3], "string")) {
        // Sic: the base space is passed as its name's value, not as a
        // colour space array, and the lookup bytes are not scaled to 0..1.
        const base = valueOf(space[1]) as PSValue[];
        const channels = this.getColorChannelsCount(base);
        const lookup = space[3].value;
        const hival = space[2] as number;
        const components: number[] = [];
        const index = samples[0] as number;
        let offset = index <= hival ? index * channels : hival * channels;
        if (offset + channels > lookup.length) offset = lookup.length - channels;
        for (let i = 0; i < channels; ++i) components.push(lookup.charCodeAt(offset + i));
        result = this._getGColor(base, components).value as number[];
      } else {
        result = [255, 255, 255];
      }
    }
    return (result as number[]).slice();
  }

  round_clamp_byte(value: number): number {
    return Math.min(255, Math.max(0, Math.round(value)));
  }

  pixelHash(samples: number[]): number {
    let hash = 0;
    for (let i = 0; i < samples.length; i++) hash = (hash << 8) | (samples[i] as number);
    return hash;
  }

  getColorChannelsCount(space: PSValue[]): number {
    const count = this.PSColorSpaceChannels[valueOf(space[0]) as string];
    return typeof count == "function" ? count(space) : (count as number);
  }

  /** CIEBasedABC components to linear RGB fractions through the dict's Decode/Matrix entries. */
  CIEBasedABCToRGB(a: number, b: number, c: number, dict: unknown): number[] {
    const hasEntry = (key: string) => typeof dict == "object" && key in (dict as object);
    const entries = dict as PSPlainRecord;
    const rangeABC = hasEntry("RangeABC")
      ? (valueOf(entries.RangeABC) as number[])
      : [0, 1, 0, 1, 0, 1];
    const rangeLMN = hasEntry("RangeLMN")
      ? (valueOf(entries.RangeLMN) as number[])
      : [0, 1, 0, 1, 0, 1];
    let first: PSValue = a;
    let second: PSValue = b;
    let third: PSValue = c;
    if (hasEntry("DecodeABC")) {
      const procedures = valueOf(entries.DecodeABC) as Executable[];
      first = this.runProcedure(procedures[0], first);
      second = this.runProcedure(procedures[1], second);
      third = this.runProcedure(procedures[2], third);
    }
    let clamped = this.PSFunctionDomain([first, second, third] as number[], rangeABC);
    const ca = clamped[0] as number;
    const cb = clamped[1] as number;
    const cc = clamped[2] as number;
    let l: PSValue;
    let m: PSValue;
    let n: PSValue;
    if (hasEntry("MatrixABC")) {
      const matrix = valueOf(entries.MatrixABC) as number[];
      l = ca * (matrix[0] as number) + cb * (matrix[3] as number) + cc * (matrix[6] as number);
      m = ca * (matrix[1] as number) + cb * (matrix[4] as number) + cc * (matrix[7] as number);
      n = ca * (matrix[2] as number) + cb * (matrix[5] as number) + cc * (matrix[8] as number);
    } else {
      l = ca;
      m = cb;
      n = cc;
    }
    if (hasEntry("DecodeLMN")) {
      const procedures = valueOf(entries.DecodeLMN) as Executable[];
      l = this.runProcedure(procedures[0], l);
      m = this.runProcedure(procedures[1], m);
      n = this.runProcedure(procedures[2], n);
    }
    clamped = this.PSFunctionDomain([l, m, n] as number[], rangeLMN);
    const cl = clamped[0] as number;
    const cm = clamped[1] as number;
    const cn = clamped[2] as number;
    let x: number;
    let y: number;
    let z: number;
    if (hasEntry("MatrixLMN")) {
      const matrix = valueOf(entries.MatrixLMN) as number[];
      x = cl * (matrix[0] as number) + cm * (matrix[3] as number) + cn * (matrix[6] as number);
      y = cl * (matrix[1] as number) + cm * (matrix[4] as number) + cn * (matrix[7] as number);
      z = cl * (matrix[2] as number) + cm * (matrix[5] as number) + cn * (matrix[8] as number);
    } else {
      x = cl;
      y = cm;
      z = cn;
    }
    return this.XYZToRGB(x, y, z);
  }

  /** Pushes `value`, runs a procedure, pops its result. */
  private runProcedure(procedure: Executable | undefined, value: PSValue): PSValue {
    this.core.stack.push(value);
    (procedure as Executable).execute(this.core);
    return this.core.stack.pop();
  }

  XYZToRGB(x: number, y: number, z: number): number[] {
    const m = this.XYZToRGBMatrix as unknown as Indexed;
    return [
      x * m[0] + y * m[3] + z * m[6],
      x * m[1] + y * m[4] + z * m[7],
      x * m[2] + y * m[5] + z * m[8],
    ];
  }

  /**
   * Clamps values to [min, max] pairs. Sic: only when there are twice as
   * many values as bounds (the reverse of a Domain's shape), so it rarely
   * clamps anything.
   */
  PSFunctionDomain(values: number[], bounds: number[] | false | null | undefined): number[] {
    const result = values.slice();
    if (bounds && result.length == 2 * bounds.length) {
      for (let i = 0; i < result.length; i++) {
        if ((result[i] as number) > (bounds[2 * i + 1] as number))
          result[i] = bounds[2 * i + 1] as number;
        if ((result[i] as number) < (bounds[2 * i] as number)) result[i] = bounds[2 * i] as number;
      }
    }
    return result;
  }

  PSFunctionInterpolate(x: number, xMin: number, xMax: number, yMin: number, yMax: number): number {
    return Math.abs(xMax - xMin) <= 1e-10
      ? yMin
      : ((x - xMin) * (yMax - yMin)) / (xMax - xMin) + yMin;
  }

  /**
   * Reads a function dict into a PSFunctionInfo. Type 2 with an input
   * evaluates it; type 0 with an input gives null; other types give null.
   */
  PSFunction(functionObject: PSValue, input?: number[]): PSFunctionInfo | null {
    // `in` on the object's value, as before: a procedure (array) has no
    // FunctionType, and an operator's string value throws.
    const dict = valueOf(functionObject) as PSPlainRecord;
    if (!("FunctionType" in (dict as object))) return null;
    const domain = valueOf(dict.Domain) as number[];
    switch (dict.FunctionType) {
      case 0: {
        const range = valueOf(dict.Range) as number[];
        const outputs = range.length / 2;
        const data = valueOf(dict.DataSource) as string;
        const order = "Order" in dict ? dict.Order : 1;
        const bitsPerSample = dict.BitsPerSample as number;
        const size = valueOf(dict.Size) as number[];
        const samples: number[] = [];
        let count = size[0] as number;
        if (size.length > 1) for (let i = 1; i < size.length; ++i) count *= size[i] as number;
        count *= outputs;
        if (typeof data == "string" && count * bitsPerSample > 8 * data.length) return null;
        for (let i = 0; i < count; ++i) {
          const bit = i * bitsPerSample;
          const byte = Math.floor(bit / 8);
          const shift = bit % 8;
          const bytes = Math.ceil((bitsPerSample + shift) / 8);
          let sample = (data[byte] as string).charCodeAt(0) & (255 >> shift);
          if (bytes > 1) {
            for (let j = 1; j < bytes; ++j) {
              sample <<= 8;
              sample += (data[byte + j] as string).charCodeAt(0);
            }
          }
          if (bitsPerSample + shift < 8 * bytes) sample >>= 8 * bytes - bitsPerSample - shift;
          samples.push(sample);
        }
        const encode = "Encode" in dict ? (valueOf(dict.Encode) as number[]) : null;
        const decode = "Decode" in dict ? (valueOf(dict.Decode) as number[]) : null;
        return input
          ? null
          : {
              type: "samples",
              domain,
              range,
              order,
              encode,
              decode,
              size,
              samples,
              bitsPerSample,
            };
      }
      case 2: {
        let range: number[] | false = false;
        if ("Range" in dict) range = valueOf(dict.Range) as number[];
        let c0: number[] | false = false;
        if ("C0" in dict) c0 = valueOf(dict.C0) as number[];
        let c1: number[] | false = false;
        if ("C1" in dict) c1 = valueOf(dict.C1) as number[];
        let exponent: PSValue = false;
        if ("N" in dict) exponent = dict.N;
        if (input) {
          if (!c0) {
            c0 = [];
            for (let i = 0; i < input.length; i++) c0[i] = 0;
          }
          if (!c1) {
            c1 = [];
            for (let i = 0; i < input.length; i++) c1[i] = 1;
          }
          const clamped = this.PSFunctionDomain(input, domain);
          const result: number[] = [];
          for (let i = 0; i < clamped.length; ++i) {
            const start = c0[i] as number;
            // Sic: raises the whole input array (a one-element array
            // coerces to its number) to N.
            result[i] =
              start + Math.pow(asNumber(clamped), asNumber(exponent)) * ((c1[i] as number) - start);
          }
          return {
            type: "exp",
            domain,
            range,
            result: range ? this.PSFunctionDomain(result, range) : result,
          };
        }
        return { type: "exp", C0: c0, C1: c1, domain, range };
      }
      case 3: {
        const functions = valueOf(dict.Functions) as PSValue[];
        const count = functions.length;
        const stitches: (PSFunctionInfo | null)[] = [];
        for (let i = 0; i < count; ++i) stitches.push(this.PSFunction(functions[i]));
        return {
          type: "stitch",
          domain,
          bounds: valueOf(dict.Bounds) as number[],
          encode: valueOf(dict.Encode) as number[],
          stitches,
        };
      }
    }
    return null;
  }

  /** Maps a raw value 0..max to [low, high], snapping both ends. */
  _valueDecodeDomain(value: number, low: number, high: number, max: number): number {
    if (max <= 0) return value;
    if (Math.abs(max - value) <= 1e-6) return high;
    if (Math.abs(value) <= 1e-6) return low;
    return low + (value * (high - low)) / max;
  }

  /** A point of a tensor-product patch (16 control points) at (u, v). */
  _getTenzorPoint(uv: number[], points: number[], out: number[]): void {
    const [u, v] = uv as [number, number];
    const t = points as unknown as Indexed;
    const iu = 1 - u;
    const iu2 = iu * iu;
    const iv = 1 - v;
    const iv2 = iv * iv;
    const u2 = u * u;
    const v2 = v * v;
    const bu0 = iu2 * iu;
    const bu1 = 3 * u * iu2;
    const bu2 = 3 * u2 * iu;
    const bu3 = u2 * u;
    const bv0 = iv2 * iv;
    const bv1 = 3 * v * iv2;
    const bv2 = 3 * v2 * iv;
    const bv3 = v2 * v;
    out[0] =
      t[0] * bu0 * bv0 +
      t[2] * bu1 * bv0 +
      t[4] * bu2 * bv0 +
      t[6] * bu3 * bv0 +
      t[8] * bu3 * bv1 +
      t[10] * bu3 * bv2 +
      t[12] * bu3 * bv3 +
      t[14] * bu2 * bv3 +
      t[16] * bu1 * bv3 +
      t[18] * bu0 * bv3 +
      t[20] * bu0 * bv2 +
      t[22] * bu0 * bv1 +
      t[24] * bu1 * bv1 +
      t[26] * bu2 * bv1 +
      t[28] * bu2 * bv2 +
      t[30] * bu1 * bv2;
    out[1] =
      t[1] * bu0 * bv0 +
      t[3] * bu1 * bv0 +
      t[5] * bu2 * bv0 +
      t[7] * bu3 * bv0 +
      t[9] * bu3 * bv1 +
      t[11] * bu3 * bv2 +
      t[13] * bu3 * bv3 +
      t[15] * bu2 * bv3 +
      t[17] * bu1 * bv3 +
      t[19] * bu0 * bv3 +
      t[21] * bu0 * bv2 +
      t[23] * bu0 * bv1 +
      t[25] * bu1 * bv1 +
      t[27] * bu2 * bv1 +
      t[29] * bu2 * bv2 +
      t[31] * bu1 * bv2;
  }

  /** A point of a Coons patch (12 boundary control points) at (u, v). */
  _getCoonsPoint(uv: number[], points: number[], out: number[]): void {
    const [u, v] = uv as [number, number];
    const t = points as unknown as Indexed;
    const iu = 1 - u;
    const iu2 = iu * iu;
    const iv = 1 - v;
    const iv2 = iv * iv;
    const u2 = u * u;
    const v2 = v * v;
    const u3 = u2 * u;
    const iu3 = iu2 * iu;
    const v3 = v2 * v;
    const iv3 = iv2 * iv;
    const bottomX = iu3 * t[0] + 3 * iu2 * u * t[22] + 3 * iu * u2 * t[20] + u3 * t[18];
    const topX = iu3 * t[6] + 3 * iu2 * u * t[8] + 3 * iu * u2 * t[10] + u3 * t[12];
    const leftX = iv3 * t[0] + 3 * iv2 * v * t[2] + 3 * iv * v2 * t[4] + v3 * t[6];
    const rightX = iv3 * t[18] + 3 * iv2 * v * t[16] + 3 * iv * v2 * t[14] + v3 * t[12];
    const ruledVX = iv * bottomX + v * topX;
    const ruledUX = iu * leftX + u * rightX;
    const cornersX = iv * (iu * t[0] + u * t[18]) + v * (iu * t[6] + u * t[12]);
    out[0] = ruledVX + ruledUX - cornersX;
    const bottomY = iu3 * t[1] + 3 * iu2 * u * t[23] + 3 * iu * u2 * t[21] + u3 * t[19];
    const topY = iu3 * t[7] + 3 * iu2 * u * t[9] + 3 * iu * u2 * t[11] + u3 * t[13];
    const leftY = iv3 * t[1] + 3 * iv2 * v * t[3] + 3 * iv * v2 * t[5] + v3 * t[7];
    const rightY = iv3 * t[19] + 3 * iv2 * v * t[17] + 3 * iv * v2 * t[15] + v3 * t[13];
    const ruledVY = iv * bottomY + v * topY;
    const ruledUY = iu * leftY + u * rightY;
    const cornersY = iv * (iu * t[1] + u * t[19]) + v * (iu * t[7] + u * t[13]);
    out[1] = ruledVY + ruledUY - cornersY;
  }

  /** Bilinear colour of a Coons patch from its four corner colours (u runs to corner 3). */
  _interpolateColorBilinearCoons(uv: number[], colors: number[][]): number[] {
    return bilinear(uv, colors, 3, 1);
  }

  /** Bilinear colour of a tensor patch from its four corner colours (u runs to corner 1). */
  _interpolateColorBilinearTenzor(uv: number[], colors: number[][]): number[] {
    return bilinear(uv, colors, 1, 3);
  }

  _interpolateColorLinear(t: number, colors: number[][]): number[] {
    const result: number[] = [];
    const from = colors[0] as number[];
    const to = colors[1] as number[];
    for (let i = 0; i < from.length; ++i) {
      const start = from[i] as number;
      const delta = (to[i] as number) - (from[i] as number);
      result.push(Math.max(Math.min(start + delta * t, 1), 0));
    }
    return result;
  }

  /**
   * A point of a triangle at (u, v): v runs from the lowest to the highest
   * vertex, u across the triangle at that height. Writes the point to
   * `out` and returns its colour.
   */
  _getTriangularPoint(uv: number[], coords: number[], out: number[], colors: number[][]): number[] {
    const [u, v] = uv as [number, number];
    const c = coords as unknown as Indexed;
    type Vertex = { x: number; y: number; col: number[] };
    let sorted: Vertex[] =
      c[1] > c[3] || (c[1] == c[3] && c[0] > c[2])
        ? [
            { x: c[2], y: c[3], col: colors[1] as number[] },
            { x: c[0], y: c[1], col: colors[0] as number[] },
          ]
        : [
            { x: c[0], y: c[1], col: colors[0] as number[] },
            { x: c[2], y: c[3], col: colors[1] as number[] },
          ];
    const third: Vertex = { x: c[4], y: c[5], col: colors[2] as number[] };
    const [firstTwo0, firstTwo1] = sorted as [Vertex, Vertex];
    if (c[5] < firstTwo0.y || (c[5] == firstTwo0.y && c[4] <= firstTwo0.x))
      sorted = [third].concat(sorted);
    else if (c[5] < firstTwo1.y || (c[5] == firstTwo1.y && c[4] <= firstTwo1.x))
      sorted = [firstTwo0, third, firstTwo1];
    else sorted.push(third);
    const [lowest, middle, highest] = sorted as [Vertex, Vertex, Vertex];
    if (v <= 1e-10 && lowest.y < middle.y) {
      out[0] = lowest.x;
      out[1] = lowest.y;
      return lowest.col;
    }
    if (Math.abs(1 - v) <= 1e-10 && highest.y > middle.y) {
      out[0] = highest.x;
      out[1] = highest.y;
      return highest.col;
    }
    const y = lowest.y + v * (highest.y - lowest.y);
    out[1] = y;
    const longX = lowest.x + v * (highest.x - lowest.x);
    const longColor = this._interpolateColorLinear(v, [lowest.col, highest.col]);
    let color: number[];
    if (y <= middle.y) {
      if (Math.abs(middle.y - lowest.y) > 1e-10) {
        const s = (y - lowest.y) / (middle.y - lowest.y);
        const shortX = lowest.x + s * (middle.x - lowest.x);
        const shortColor = this._interpolateColorLinear(s, [lowest.col, middle.col]);
        // Sic: when the short edge is on the left, out[0] keeps its old value.
        if (longX <= shortX) {
          out[0] = longX + u * (shortX - longX);
          color = this._interpolateColorLinear(u, [longColor, shortColor]);
        } else color = this._interpolateColorLinear(u, [shortColor, longColor]);
      } else {
        out[0] =
          lowest.x < middle.x
            ? lowest.x + u * (middle.x - lowest.x)
            : middle.x + u * (lowest.x - middle.x);
        color = this._interpolateColorLinear(
          u,
          lowest.x < middle.x ? [lowest.col, middle.col] : [middle.col, lowest.col],
        );
      }
    } else if (Math.abs(highest.y - middle.y) > 1e-10) {
      const s = (y - middle.y) / (highest.y - middle.y);
      const shortX = middle.x + s * (highest.x - middle.x);
      const shortColor = this._interpolateColorLinear(s, [middle.col, highest.col]);
      if (longX <= shortX) {
        out[0] = longX + u * (shortX - longX);
        color = this._interpolateColorLinear(u, [longColor, shortColor]);
      } else color = this._interpolateColorLinear(u, [shortColor, longColor]);
    } else {
      out[0] =
        middle.x < highest.x
          ? middle.x + u * (highest.x - middle.x)
          : highest.x + u * (middle.x - highest.x);
      color = this._interpolateColorLinear(
        u,
        middle.x < highest.x ? [middle.col, highest.col] : [highest.col, middle.col],
      );
    }
    return color;
  }

  /** Colour between two painted cells of a row (horizontal) or column. */
  _apprColor(
    horizontal: boolean,
    from: number,
    to: number,
    row: number,
    column: number,
    colors: number[][][],
  ): number[] {
    const at = (r: number, c: number) => (colors[r] as number[][])[c] as number[];
    const span = to - from;
    if (span <= 1) return at(row, column);
    let t: number;
    let ends: number[][];
    if (horizontal) {
      t = (column - from) / span;
      ends = [at(row, from), at(row, to)];
    } else {
      t = (row - from) / span;
      ends = [at(from, column), at(to, column)];
    }
    return this._interpolateColorLinear(t, ends);
  }

  /** Fills an unpainted mesh cell from the nearest painted cells in its row and column. */
  _getApproximatedColor(
    row: number,
    column: number,
    colors: number[][][],
    painted: number[][],
  ): number[] {
    const at = (r: number, c: number) => (colors[r] as number[][])[c] as number[];
    const isPainted = (r: number, c: number) => (painted[r] as number[])[c];
    let above: number | null = null;
    let below: number | null = null;
    let left: number | null = null;
    let right: number | null = null;
    let color = at(row, column);
    for (let r = row - 1; r >= 0; --r) {
      if (isPainted(r, column)) {
        above = r;
        break;
      }
    }
    for (let r = row + 1; r < painted.length; ++r) {
      if (isPainted(r, column)) {
        below = r;
        break;
      }
    }
    for (let c = column - 1; c >= 0; --c) {
      if (isPainted(row, c)) {
        left = c;
        break;
      }
    }
    for (let c = column + 1; c < (painted[row] as number[]).length; ++c) {
      if (isPainted(row, c)) {
        right = c;
        break;
      }
    }
    if (above == null || below == null) {
      if (left == null || right == null) {
        let vertical: number | null = null;
        let horizontal: number | null = null;
        if (above != null) vertical = row - above;
        else if (below != null) vertical = below - row;
        if (left != null) horizontal = column - left;
        else if (right != null) horizontal = right - column;
        if (horizontal != null && vertical != null) {
          color =
            horizontal <= vertical
              ? left != null
                ? at(row, left)
                : at(row, right as number)
              : above != null
                ? at(above, column)
                : at(below as number, column);
        } else if (horizontal != null) {
          color = left != null ? at(row, left) : at(row, right as number);
        } else if (vertical != null) {
          color = above != null ? at(above, column) : at(below as number, column);
        }
      } else {
        color = this._apprColor(true, left, right, row, column, colors);
      }
    } else {
      const vertical = below - above;
      color =
        left != null && right != null && right - left <= vertical
          ? this._apprColor(true, left, right, row, column, colors)
          : this._apprColor(false, above, below, row, column, colors);
    }
    return color;
  }

  /**
   * Runs a tint transform: pushes the components, executes the procedure
   * and takes as many results as the alternate space has channels.
   */
  _getSeparationColorVal(space: PSValue[], procedure: PSValue, components: unknown): number[] {
    this.core.stack = this.core.stack.concat(components as PSValue);
    this.core.execstack.push(procedure);
    (procedure as unknown as Executable).execute(this.core);
    this.core.execstack.pop();
    const channels = this.getColorChannelsCount(space);
    const result = this.core.stack.slice(this.core.stack.length - channels);
    this.core.stack = this.core.stack.splice(0, this.core.stack.length - channels);
    return result as number[];
  }

  /**
   * The page colour of `color` in colour space `space` (an array whose
   * first element names the family). For Pattern, `color` is the shading
   * or pattern dict. Unsupported spaces give blue and error "01".
   */
  _getGColor(space: PSValue[], color: unknown): GColor {
    const family = valueOf(space[0]);
    const components = color as number[];
    if (family == "DeviceGray") {
      return {
        type: "rgb",
        value: [
          this.round_clamp_byte(255 * (components[0] as number)),
          this.round_clamp_byte(255 * (components[0] as number)),
          this.round_clamp_byte(255 * (components[0] as number)),
        ],
      };
    }
    if (family == "DeviceCMYK") {
      return {
        type: "cmyk",
        value: [
          this.round_clamp_byte(255 * (components[0] as number)),
          this.round_clamp_byte(255 * (components[1] as number)),
          this.round_clamp_byte(255 * (components[2] as number)),
          this.round_clamp_byte(255 * (components[3] as number)),
        ],
      };
    }
    if (family == "DeviceRGB") {
      return {
        type: "rgb",
        value: [
          this.round_clamp_byte(255 * (components[0] as number)),
          this.round_clamp_byte(255 * (components[1] as number)),
          this.round_clamp_byte(255 * (components[2] as number)),
        ],
      };
    }
    if (family == "Pattern") return getPatternColor(this, color);
    if (family == "CIEBasedABC") {
      const rgb = this.CIEBasedABCToRGB(
        components[0] as number,
        components[1] as number,
        components[2] as number,
        valueOf(space[1]),
      );
      // Sic: not clamped, unlike the other conversions.
      return {
        type: "rgb",
        value: [
          Math.round(255 * (rgb[0] as number)),
          Math.round(255 * (rgb[1] as number)),
          Math.round(255 * (rgb[2] as number)),
        ],
      };
    }
    if (family == "DeviceN" || family == "Separation") {
      const alternate = valueOf(space[2]);
      const alternateSpace = typeof alternate == "string" ? [space[2]] : (alternate as PSValue[]);
      const tint = this._getSeparationColorVal(alternateSpace, space[3], color);
      return this._getGColor(alternateSpace, tint);
    }
    this.core.toGravit("error", ["01"]);
    return failedColor();
  }

  /**
   * Reduces many gradient stops to the ones needed to stay within a
   * tolerance of the linear interpolation. Sic: the tolerance list gets an
   * entry per stop and channel while min/max are still growing, and
   * _interpolate only reads the first entries.
   */
  _optimizeStops(stops: GradientStop[]): GradientStop[] {
    if (stops.length > 2) {
      const tolerances: number[] = [];
      const channels = stopValues(stops[0]).length;
      for (let channel = 0; channel < channels; ++channel) {
        let low = stopValues(stops[0])[channel] as number;
        let high = low;
        for (let i = 1; i < stops.length; ++i) {
          const value = stopValues(stops[i])[channel] as number;
          if (value < low) low = value;
          if (value > high) high = value;
          tolerances.push(Math.min(Math.max(Math.abs(high - low) / 5, 4), 12));
        }
      }
      return this._interpolate(stops, 0, tolerances);
    }
    return stops;
  }

  /** Recursively keeps the stop that deviates most from the line between the ends. */
  _interpolate(stops: GradientStop[], depth: number, tolerances: number[]): GradientStop[] {
    if (stops.length <= 2 || depth > 62) return stops;
    const first = stops[0] as GradientStop;
    const last = stops[stops.length - 1] as GradientStop;
    const start = first.position;
    const end = last.position;
    if (Math.abs(end - start) <= 1e-4) return [first, last];
    let split = stops.length - 1;
    const firstValues = stopValues(first);
    for (let channel = 0; channel < firstValues.length; ++channel) {
      const startValue = firstValues[channel] as number;
      const slope = ((stopValues(last)[channel] as number) - startValue) / (end - start);
      const intercept = startValue - slope * start;
      let worst = tolerances[channel] as number;
      for (let i = 1; i < stops.length - 1; ++i) {
        const stop = stops[i] as GradientStop;
        const deviation = Math.abs(
          intercept + slope * stop.position - (stopValues(stop)[channel] as number),
        );
        if (deviation > worst || (deviation == worst && i < split)) {
          split = i;
          worst = deviation;
        }
      }
    }
    if (split < stops.length - 1) {
      const head = this._interpolate(stops.slice(0, split + 1), depth + 1, tolerances);
      const tail = this._interpolate(stops.slice(split), depth + 1, tolerances);
      return head.slice(0, head.length - 1).concat(tail);
    }
    return [first, last];
  }

  /** HSB (hue in degrees, saturation, brightness) to RGB bytes. */
  hsvToRGB(hsv: number[]): number[] {
    const [hue, saturation, value] = hsv as [number, number, number];
    const chroma = value * saturation;
    const sector = hue / 60;
    const x = chroma * (1 - Math.abs((sector % 2) - 1));
    const m = value - chroma;
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
      this.round_clamp_byte(255 * ((rgb[0] as number) + m)),
      this.round_clamp_byte(255 * ((rgb[1] as number) + m)),
      this.round_clamp_byte(255 * ((rgb[2] as number) + m)),
    ];
  }

  /** Naive CMYK to RGB fractions. Sic: blue is darkened by 0.1. */
  CMYKToRGB(cmyk: number[]): number[] {
    const [c, m, y, k] = cmyk as [number, number, number, number];
    const r = 1 - Math.min(1, c + k);
    const g = 1 - Math.min(1, m + k);
    let b = 1 - Math.min(1, y + k);
    b = b > 0.1 ? b - 0.1 : b;
    return [r, g, b];
  }
}

/** The component values of a stop's colour (a page colour object). */
function stopValues(stop: GradientStop | undefined): number[] {
  return ((stop as GradientStop).color as { value: number[] }).value;
}

/**
 * Bilinear interpolation of four corner colours, clamped to [0, 1]. Coons
 * and tensor patches number the corners differently: `uCorner` and
 * `vCorner` are the corners reached from corner 0 along u and along v.
 */
function bilinear(uv: number[], colors: number[][], uCorner: number, vCorner: number): number[] {
  const [u, v] = uv as [number, number];
  const result: number[] = [];
  const c0 = colors[0] as number[];
  const c1 = colors[1] as number[];
  const c2 = colors[2] as number[];
  const c3 = colors[3] as number[];
  const cu = colors[uCorner] as number[];
  const cv = colors[vCorner] as number[];
  for (let i = 0; i < c0.length; ++i) {
    const base = c0[i] as number;
    const du = (cu[i] as number) - (c0[i] as number);
    const dv = (cv[i] as number) - (c0[i] as number);
    const cross = (c0[i] as number) - (c1[i] as number) - (c3[i] as number) + (c2[i] as number);
    result.push(Math.max(Math.min(base + du * u + dv * v + cross * u * v, 1), 0));
  }
  return result;
}
