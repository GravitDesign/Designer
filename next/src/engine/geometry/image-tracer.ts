// Old: chunk.vendor.js module 1003 (GImageTracer).
//
// A fork of imagetracerjs 1.1 by András Jankovics (public domain). The
// Gravit changes kept here: a seeded random generator (rand, _m_w/_m_z)
// instead of Math.random, so the same image always traces the same way;
// tracepath2, which fits cubic curves with GVertexFitter; and no SVG
// output (the caller builds paths from the trace data).
import { GObject, registerClass } from "../core/object.ts";
import { Point } from "../math/point.ts";
import { VertexFitter } from "./vertex-fitter.ts";

/** What the tracer reads: ImageData or anything shaped like it. */
export interface TracerImageData {
  width: number;
  height: number;
  data: ArrayLike<number>;
}

export interface PaletteColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Tracing options; checkoptions fills in the missing ones. */
export interface TracerOptions {
  /** Error threshold for straight lines (squared distance). */
  ltres?: number;
  /** Error threshold for quadratic splines (squared distance). */
  qtres?: number;
  /** Paths with fewer points are dropped (0 counts as the default 8). */
  pathomit?: number;
  /** Sample the palette from the image (true) or generate it (false). */
  colorsampling?: boolean;
  numberofcolors?: number;
  /** Colors used by fewer pixels than this ratio are re-randomized. */
  mincolorratio?: number;
  colorquantcycles?: number;
  /** A fixed palette instead of sampling or generating one. */
  pal?: PaletteColor[];
  blurradius?: number;
  blurdelta?: number;
  // Accepted and defaulted for compatibility; tracing doesn't use them.
  scale?: number;
  simplifytolerance?: number;
  roundcoords?: number;
  lcpr?: number;
  qcpr?: number;
  desc?: boolean;
  viewbox?: boolean;
}

type CheckedOptions = Required<Omit<TracerOptions, "pal">> & Pick<TracerOptions, "pal">;

/** Palette indexes per pixel, with a one pixel border of -1. */
export interface IndexedImage {
  array: number[][];
  palette: PaletteColor[];
}

/** A boundary point of a path: pixel corner and edge node type. */
export interface ScanPoint {
  x: number;
  y: number;
  t: number;
}

/** A point between two boundary points and the direction to the next one. */
export interface InternodePoint {
  x: number;
  y: number;
  linesegment: number;
}

export type TraceSegment =
  | { type: "L"; x1: number; y1: number; x2: number; y2: number }
  | { type: "Q"; x1: number; y1: number; x2: number; y2: number; x3: number; y3: number };

export interface CurveSegment {
  type: "C";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx1: number;
  cy1: number;
  cx2: number;
  cy2: number;
}

export interface TraceData {
  /** Per palette color, the paths as lists of segments. */
  layers: TraceSegment[][][];
  palette: PaletteColor[];
  width: number;
  height: number;
}

interface ColorSum {
  r: number;
  g: number;
  b: number;
  a: number;
  n: number;
}

const INT32 = 4294967295;

const DEFAULT_OPTIONS: [keyof TracerOptions, number | boolean][] = [
  ["ltres", 1],
  ["qtres", 1],
  ["pathomit", 8],
  ["colorsampling", true],
  ["numberofcolors", 16],
  ["mincolorratio", 0.02],
  ["colorquantcycles", 3],
  ["scale", 1],
  ["simplifytolerance", 0],
  ["roundcoords", 1],
  ["lcpr", 0],
  ["qcpr", 0],
  ["desc", true],
  ["viewbox", false],
  ["blurradius", 0],
  ["blurdelta", 20],
];

/**
 * Traces a bitmap into vector paths (Image > Vectorize): quantizes the
 * colors, splits the image into one layer per color, scans the edges of
 * each layer into paths and fits lines and quadratic splines to them.
 */
export class ImageTracer extends GObject {
  static {
    registerClass(this, "GImageTracer");
  }

  // Seeds of the multiply-with-carry generator.
  _m_w = 123456789;
  _m_z = 987654321;

  /** Gaussian kernels for blur radius 1 to 5. */
  gks: number[][] = [
    [0.27901, 0.44198, 0.27901],
    [0.135336, 0.228569, 0.272192, 0.228569, 0.135336],
    [0.086776, 0.136394, 0.178908, 0.195843, 0.178908, 0.136394, 0.086776],
    [0.063327, 0.093095, 0.122589, 0.144599, 0.152781, 0.144599, 0.122589, 0.093095, 0.063327],
    [
      0.049692, 0.069304, 0.089767, 0.107988, 0.120651, 0.125194, 0.120651, 0.107988, 0.089767,
      0.069304, 0.049692,
    ],
  ];

  imagedataToTracedata(image: TracerImageData, options?: TracerOptions | null): TraceData {
    const checked = this.checkoptions(options);
    const indexed = this.colorquantization(image, checked);
    const layers = this.layering(indexed);
    const paths = this.batchpathscan(layers, checked.pathomit);
    const internodes = this.batchinternodes(paths);
    return {
      layers: this.batchtracelayers(internodes, checked.ltres, checked.qtres),
      palette: indexed.palette,
      width: image.width,
      height: image.height,
    };
  }

  /** Fills in the missing options, on the given object. */
  checkoptions(options?: TracerOptions | null): CheckedOptions {
    const result = (options || {}) as Record<string, unknown>;
    for (const [key, value] of DEFAULT_OPTIONS) {
      if (!Object.prototype.hasOwnProperty.call(result, key)) result[key] = value;
    }
    return result as unknown as CheckedOptions;
  }

  /** The next number in [0, 1) from the seeded generator. */
  rand(): number {
    this._m_z = (36969 * (65535 & this._m_z) + (this._m_z >> 16)) & INT32;
    this._m_w = (18e3 * (65535 & this._m_w) + (this._m_w >> 16)) & INT32;
    const value = ((this._m_z << 16) + this._m_w) & INT32;
    return value / 4294967296 + 0.5;
  }

  /**
   * Maps every pixel to its nearest palette color, refining the palette
   * to the mean of its pixels in each cycle.
   */
  colorquantization(image: TracerImageData, options: CheckedOptions): IndexedImage {
    const array: number[][] = [];
    const sums: ColorSum[] = [];
    const pixelCount = image.width * image.height;
    for (let y = 0; y < image.height + 2; y++) {
      const row: number[] = (array[y] = []);
      for (let x = 0; x < image.width + 2; x++) row[x] = -1;
    }
    const palette = options.pal
      ? options.pal
      : options.colorsampling
        ? this.samplepalette(options.numberofcolors, image)
        : this.generatepalette(options.numberofcolors);
    if (options.blurradius > 0) image = this.blur(image, options.blurradius, options.blurdelta);
    for (let cycle = 0; cycle < options.colorquantcycles; cycle++) {
      if (cycle > 0) {
        for (let k = 0; k < palette.length; k++) {
          const color = palette[k] as PaletteColor;
          const sum = sums[k] as ColorSum;
          if (sum.n > 0) {
            color.r = Math.floor(sum.r / sum.n);
            color.g = Math.floor(sum.g / sum.n);
            color.b = Math.floor(sum.b / sum.n);
            color.a = Math.floor(sum.a / sum.n);
          }
          if (sum.n / pixelCount < options.mincolorratio && cycle < options.colorquantcycles - 1) {
            color.r = Math.floor(255 * this.rand());
            color.g = Math.floor(255 * this.rand());
            color.b = Math.floor(255 * this.rand());
            color.a = Math.floor(255 * this.rand());
          }
        }
      }
      for (let k = 0; k < palette.length; k++) sums[k] = { r: 0, g: 0, b: 0, a: 0, n: 0 };
      const data = image.data;
      for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
          const i = 4 * (y * image.width + x);
          let best = 1024;
          let bestIndex = 0;
          for (let k = 0; k < palette.length; k++) {
            const color = palette[k] as PaletteColor;
            const distance =
              Math.abs(color.r - (data[i] as number)) +
              Math.abs(color.g - (data[i + 1] as number)) +
              Math.abs(color.b - (data[i + 2] as number)) +
              4 * Math.abs(color.a - (data[i + 3] as number));
            if (distance < best) {
              best = distance;
              bestIndex = k;
            }
          }
          const sum = sums[bestIndex] as ColorSum;
          sum.r += data[i] as number;
          sum.g += data[i + 1] as number;
          sum.b += data[i + 2] as number;
          sum.a += data[i + 3] as number;
          sum.n++;
          (array[y + 1] as number[])[x + 1] = bestIndex;
        }
      }
    }
    return { array, palette };
  }

  /** `count` colors of random pixels. */
  samplepalette(count: number, image: TracerImageData): PaletteColor[] {
    const palette: PaletteColor[] = [];
    for (let k = 0; k < count; k++) {
      const i = 4 * Math.floor((this.rand() * image.data.length) / 4);
      palette[k] = {
        r: image.data[i] as number,
        g: image.data[i + 1] as number,
        b: image.data[i + 2] as number,
        a: image.data[i + 3] as number,
      };
    }
    return palette;
  }

  /** A gray ramp for fewer than 8 colors, else an RGB cube plus random colors. */
  generatepalette(count: number): PaletteColor[] {
    const palette: PaletteColor[] = [];
    if (count < 8) {
      const step = Math.floor(255 / (count - 1));
      for (let k = 0; k < count; k++)
        palette.push({ r: k * step, g: k * step, b: k * step, a: 255 });
    } else {
      const side = Math.floor(Math.pow(count, 1 / 3));
      const step = Math.floor(255 / (side - 1));
      const rest = count - side * side * side;
      for (let r = 0; r < side; r++)
        for (let g = 0; g < side; g++)
          for (let b = 0; b < side; b++)
            palette.push({ r: r * step, g: g * step, b: b * step, a: 255 });
      for (let k = 0; k < rest; k++)
        palette.push({
          r: Math.floor(255 * this.rand()),
          g: Math.floor(255 * this.rand()),
          b: Math.floor(255 * this.rand()),
          a: Math.floor(255 * this.rand()),
        });
    }
    return palette;
  }

  /**
   * One layer per palette color, each a grid one larger than the indexed
   * image with the edge node type (0-15, from the four pixels around the
   * node) where that color has edges.
   */
  layering(indexed: IndexedImage): number[][][] {
    const layers: number[][][] = [];
    const rows = indexed.array.length;
    const columns = (indexed.array[0] as number[]).length;
    for (let k = 0; k < indexed.palette.length; k++) {
      const layer: number[][] = (layers[k] = []);
      for (let y = 0; y < rows; y++) {
        const row: number[] = (layer[y] = []);
        for (let x = 0; x < columns; x++) row[x] = 0;
      }
    }
    const at = (y: number, x: number): number | undefined => (indexed.array[y] as number[])[x];
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < columns - 1; x++) {
        const value = at(y, x) as number;
        const n1 = y > 0 && x > 0 && at(y - 1, x - 1) === value ? 1 : 0;
        const n2 = y > 0 && at(y - 1, x) === value ? 1 : 0;
        const n3 = y > 0 && x < columns - 1 && at(y - 1, x + 1) === value ? 1 : 0;
        const n4 = x > 0 && at(y, x - 1) === value ? 1 : 0;
        const n5 = x < columns - 1 && at(y, x + 1) === value ? 1 : 0;
        const n6 = y < rows - 1 && x > 0 && at(y + 1, x - 1) === value ? 1 : 0;
        const n7 = y < rows - 1 && at(y + 1, x) === value ? 1 : 0;
        const n8 = y < rows - 1 && x < columns - 1 && at(y + 1, x + 1) === value ? 1 : 0;
        const layer = layers[value] as number[][];
        (layer[y + 1] as number[])[x + 1] = 1 + 2 * n5 + 4 * n8 + 8 * n7;
        if (!n4) (layer[y + 1] as number[])[x] = 2 + 4 * n7 + 8 * n6;
        if (!n2) (layer[y] as number[])[x + 1] = 0 + 2 * n3 + 4 * n5 + 8;
        if (!n1) (layer[y] as number[])[x] = 0 + 2 * n2 + 4 + 8 * n4;
      }
    }
    return layers;
  }

  /**
   * Walks the edges of a layer into closed paths of boundary points
   * (clearing the walked nodes). Holes and paths with fewer than
   * `pathomit` points (default 8) are dropped.
   */
  pathscan(layer: number[][], pathomit?: number): ScanPoint[][] {
    pathomit = pathomit || 8;
    const paths: ScanPoint[][] = [];
    let pathIndex = 0;
    let pointIndex: number;
    let px: number;
    let py: number;
    const width = (layer[0] as number[]).length;
    const height = layer.length;
    let dir = 0;
    let finished: boolean;
    // Kept from the previous path for node types that don't set it.
    let holePath = false;
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const start = (layer[j] as number[])[i];
        if (0 === start || 15 === start) continue;
        px = i;
        py = j;
        paths[pathIndex] = [];
        finished = false;
        pointIndex = 0;
        const node = (layer[py] as number[])[px];
        if (1 === node) dir = 0;
        if (2 === node) dir = 3;
        if (3 === node) dir = 0;
        if (4 === node) {
          dir = 1;
          holePath = false;
        }
        if (5 === node) dir = 0;
        if (6 === node) dir = 3;
        if (7 === node) {
          dir = 0;
          holePath = true;
        }
        if (8 === node) dir = 0;
        if (9 === node) dir = 3;
        if (10 === node) dir = 3;
        if (11 === node) {
          dir = 1;
          holePath = true;
        }
        if (12 === node) dir = 0;
        if (13 === node) {
          dir = 3;
          holePath = true;
        }
        if (14 === node) {
          dir = 0;
          holePath = true;
        }
        while (!finished) {
          const row = layer[py] as number[];
          const path = paths[pathIndex] as ScanPoint[];
          path[pointIndex] = { x: px - 1, y: py - 1, t: row[px] as number };
          const deadEnd = (): void => {
            finished = true;
            paths.pop();
          };
          switch (row[px]) {
            case 1:
              row[px] = 0;
              if (0 === dir) {
                py--;
                dir = 1;
              } else if (3 === dir) {
                px--;
                dir = 2;
              } else deadEnd();
              break;
            case 2:
              row[px] = 0;
              if (3 === dir) {
                px++;
                dir = 0;
              } else if (2 === dir) {
                py--;
                dir = 1;
              } else deadEnd();
              break;
            case 3:
              row[px] = 0;
              if (0 === dir) px++;
              else if (2 === dir) px--;
              else deadEnd();
              break;
            case 4:
              row[px] = 0;
              if (1 === dir) {
                px++;
                dir = 0;
              } else if (2 === dir) {
                py++;
                dir = 3;
              } else deadEnd();
              break;
            case 5:
              if (0 === dir) {
                row[px] = 13;
                py++;
                dir = 3;
              } else if (1 === dir) {
                row[px] = 13;
                px--;
                dir = 2;
              } else if (2 === dir) {
                row[px] = 7;
                py--;
                dir = 1;
              } else if (3 === dir) {
                row[px] = 7;
                px++;
                dir = 0;
              }
              break;
            case 6:
              row[px] = 0;
              if (1 === dir) py--;
              else if (3 === dir) py++;
              else deadEnd();
              break;
            case 7:
            case 8:
              row[px] = 0;
              if (0 === dir) {
                py++;
                dir = 3;
              } else if (1 === dir) {
                px--;
                dir = 2;
              } else deadEnd();
              break;
            case 9:
              row[px] = 0;
              if (1 === dir) py--;
              else if (3 === dir) py++;
              else deadEnd();
              break;
            case 10:
              if (0 === dir) {
                row[px] = 11;
                py--;
                dir = 1;
              } else if (1 === dir) {
                row[px] = 14;
                px++;
                dir = 0;
              } else if (2 === dir) {
                row[px] = 14;
                py++;
                dir = 3;
              } else if (3 === dir) {
                row[px] = 11;
                px--;
                dir = 2;
              }
              break;
            case 11:
              row[px] = 0;
              if (1 === dir) {
                px++;
                dir = 0;
              } else if (2 === dir) {
                py++;
                dir = 3;
              } else deadEnd();
              break;
            case 12:
              row[px] = 0;
              if (0 === dir) px++;
              else if (2 === dir) px--;
              else deadEnd();
              break;
            case 13:
              row[px] = 0;
              if (2 === dir) {
                py--;
                dir = 1;
              } else if (3 === dir) {
                px++;
                dir = 0;
              } else deadEnd();
              break;
            case 14:
              row[px] = 0;
              if (0 === dir) {
                py--;
                dir = 1;
              } else if (3 === dir) {
                px--;
                dir = 2;
              } else deadEnd();
              break;
          }
          // Back at the start: the path is closed. (After a dead end the
          // path is gone and this throws, as it did in the old code.)
          const first = (paths[pathIndex] as ScanPoint[])[0] as ScanPoint;
          if (px - 1 === first.x && py - 1 === first.y) {
            finished = true;
            if (holePath || (paths[pathIndex] as ScanPoint[]).length < pathomit) paths.pop();
            else pathIndex++;
          }
          pointIndex++;
        }
      }
    }
    return paths;
  }

  batchpathscan(layers: number[][][], pathomit?: number): ScanPoint[][][] {
    const result: ScanPoint[][][] = [];
    for (let k = 0; k < layers.length; k++)
      result[k] = this.pathscan(layers[k] as number[][], pathomit);
    return result;
  }

  /**
   * The midpoints between consecutive boundary points, each with the
   * direction (0-8: E, SE, S, SW, W, NW, N, NE, none) to the next one.
   */
  internodes(paths: ScanPoint[][]): InternodePoint[][] {
    const result: InternodePoint[][] = [];
    for (let p = 0; p < paths.length; p++) {
      const path = paths[p] as ScanPoint[];
      const out: InternodePoint[] = (result[p] = []);
      const length = path.length;
      for (let i = 0; i < length; i++) {
        const point = path[i] as ScanPoint;
        const next = path[(i + 1) % length] as ScanPoint;
        const afterNext = path[(i + 2) % length] as ScanPoint;
        const x = (point.x + next.x) / 2;
        const y = (point.y + next.y) / 2;
        const nextX = (next.x + afterNext.x) / 2;
        const nextY = (next.y + afterNext.y) / 2;
        let linesegment: number;
        if (x < nextX) linesegment = y < nextY ? 1 : y > nextY ? 7 : 0;
        else if (x > nextX) linesegment = y < nextY ? 3 : y > nextY ? 5 : 4;
        else linesegment = y < nextY ? 2 : y > nextY ? 6 : 8;
        out[i] = { x, y, linesegment };
      }
    }
    return result;
  }

  batchinternodes(layers: ScanPoint[][][]): InternodePoint[][][] {
    const result: InternodePoint[][][] = [];
    for (let k = 0; k < layers.length; k++) result[k] = this.internodes(layers[k] as ScanPoint[][]);
    return result;
  }

  /**
   * Splits a path into runs of at most two directions and fits lines or
   * quadratic splines to each run.
   */
  tracepath(path: InternodePoint[], ltres: number, qtres: number): TraceSegment[] {
    let segments: TraceSegment[] = [];
    let start = 0;
    while (start < path.length) {
      const direction = (path[start] as InternodePoint).linesegment;
      let otherDirection = -1;
      let end = start + 1;
      while (
        ((path[end] as InternodePoint).linesegment === direction ||
          (path[end] as InternodePoint).linesegment === otherDirection ||
          -1 === otherDirection) &&
        end < path.length - 1
      ) {
        const segment = (path[end] as InternodePoint).linesegment;
        if (segment !== direction && -1 === otherDirection) otherDirection = segment;
        end++;
      }
      if (end === path.length - 1) end = 0;
      segments = segments.concat(this.fitseq(path, ltres, qtres, start, end));
      start = end > 0 ? end : path.length;
    }
    return segments;
  }

  /** Gravit's variant of tracepath: fits cubic curves to each run with GVertexFitter. */
  tracepath2(path: InternodePoint[]): CurveSegment[] {
    const segments: CurveSegment[] = [];
    const fitter = new VertexFitter(0.5);
    let start = 0;
    while (start < path.length) {
      const direction = (path[start] as InternodePoint).linesegment;
      let otherDirection = -1;
      let end = start + 1;
      while (
        ((path[end] as InternodePoint).linesegment === direction ||
          (path[end] as InternodePoint).linesegment === otherDirection ||
          -1 === otherDirection) &&
        end < path.length - 1
      ) {
        const segment = (path[end] as InternodePoint).linesegment;
        if (segment !== direction && -1 === otherDirection) otherDirection = segment;
        end++;
      }
      if (end === path.length - 1) end = 0;
      const points: Point[] = [];
      for (let i = start; i < end; i++) {
        const point = path[i] as InternodePoint;
        points.push(new Point(point.x, point.y));
      }
      if (points.length > 1) {
        let leftTangent: Point | undefined;
        if (segments.length) {
          const last = segments[segments.length - 1] as CurveSegment;
          leftTangent = new Point(last.cx2 - last.x2, last.cy2 - last.y2);
        }
        const rightTangent = fitter._computeRightTangent(points, points.length - 1);
        const curves = fitter.fitCurve(
          points,
          points.length,
          leftTangent,
          rightTangent,
        ) as Point[][];
        for (let i = 0; i < curves.length; i++) {
          const curve = curves[i] as Point[];
          const [p0, p1, p2, p3] = curve as [Point, Point, Point, Point];
          segments.push({
            type: "C",
            x1: p0.getX(),
            y1: p0.getY(),
            x2: p3.getX(),
            y2: p3.getY(),
            cx1: p1.getX(),
            cy1: p1.getY(),
            cx2: p2.getX(),
            cy2: p2.getY(),
          });
        }
      }
      start = end > 0 ? end : path.length;
    }
    return segments;
  }

  /**
   * Fits the points from `start` to `end` with one line, else one
   * quadratic spline, else splits at the worst point and recurses.
   */
  fitseq(
    path: InternodePoint[],
    ltres: number,
    qtres: number,
    start: number,
    end: number,
  ): TraceSegment[] {
    if (end > path.length || end < 0) return [];
    const at = (i: number): InternodePoint => path[i] as InternodePoint;
    let x: number;
    let y: number;
    let error: number;
    let worst = start;
    let worstError = 0;
    let fits = true;
    let span = end - start;
    if (span < 0) span += path.length;
    const vx = (at(end).x - at(start).x) / span;
    const vy = (at(end).y - at(start).y) / span;
    let i = (start + 1) % path.length;
    while (i != end) {
      let offset = i - start;
      if (offset < 0) offset += path.length;
      x = at(start).x + vx * offset;
      y = at(start).y + vy * offset;
      error = (at(i).x - x) * (at(i).x - x) + (at(i).y - y) * (at(i).y - y);
      if (error > ltres) fits = false;
      if (error > worstError) {
        worst = i;
        worstError = error;
      }
      i = (i + 1) % path.length;
    }
    if (fits)
      return [{ type: "L", x1: at(start).x, y1: at(start).y, x2: at(end).x, y2: at(end).y }];
    const splitAt = worst;
    fits = true;
    worstError = 0;
    let t = (splitAt - start) / span;
    let t1 = (1 - t) * (1 - t);
    let t2 = 2 * (1 - t) * t;
    let t3 = t * t;
    const cpx = (t1 * at(start).x + t3 * at(end).x - at(splitAt).x) / -t2;
    const cpy = (t1 * at(start).y + t3 * at(end).y - at(splitAt).y) / -t2;
    // Unlike the line check, this loop starts at start + 1 without wrapping.
    for (i = start + 1; i != end;) {
      t2 = 2 * (1 - (t = (i - start) / span)) * t;
      t3 = t * t;
      x = (t1 = (1 - t) * (1 - t)) * at(start).x + t2 * cpx + t3 * at(end).x;
      y = t1 * at(start).y + t2 * cpy + t3 * at(end).y;
      error = (at(i).x - x) * (at(i).x - x) + (at(i).y - y) * (at(i).y - y);
      if (error > qtres) fits = false;
      if (error > worstError) {
        worst = i;
        worstError = error;
      }
      i = (i + 1) % path.length;
    }
    if (fits)
      return [
        {
          type: "Q",
          x1: at(start).x,
          y1: at(start).y,
          x2: cpx,
          y2: cpy,
          x3: at(end).x,
          y3: at(end).y,
        },
      ];
    const middle = Math.floor((splitAt + worst) / 2);
    const head = this.fitseq(path, ltres, qtres, start, middle);
    return head.concat(this.fitseq(path, ltres, qtres, middle, end));
  }

  batchtracepaths(paths: InternodePoint[][], ltres: number, qtres: number): TraceSegment[][] {
    const result: TraceSegment[][] = [];
    for (let p = 0; p < paths.length; p++)
      result.push(this.tracepath(paths[p] as InternodePoint[], ltres, qtres));
    return result;
  }

  batchtracelayers(layers: InternodePoint[][][], ltres: number, qtres: number): TraceSegment[][][] {
    const result: TraceSegment[][][] = [];
    for (let k = 0; k < layers.length; k++)
      result[k] = this.batchtracepaths(layers[k] as InternodePoint[][], ltres, qtres);
    return result;
  }

  /**
   * Selective gaussian blur: blurs horizontally, then vertically, then
   * restores pixels that changed by more than `delta`. Needs a DOM
   * canvas, and real ImageData (createImageData copies its size).
   */
  blur(image: TracerImageData, radius: number, delta: number): TracerImageData {
    let r: number;
    let g: number;
    let b: number;
    let a: number;
    let weight: number;
    let i: number;
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d") as CanvasRenderingContext2D;
    const blurred = context.createImageData(image as ImageData);
    if ((radius = Math.floor(radius)) < 1) return image;
    if (radius > 5) radius = 5;
    if ((delta = Math.abs(delta)) > 1024) delta = 1024;
    const kernel = this.gks[radius - 1] as number[];
    const source = image.data;
    const out = blurred.data;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        r = 0;
        g = 0;
        b = 0;
        a = 0;
        weight = 0;
        // x + k > 0 skips column 0 too: the old edge handling.
        for (let k = -radius; k < radius + 1; k++) {
          if (x + k > 0 && x + k < image.width) {
            const w = kernel[k + radius] as number;
            i = 4 * (y * image.width + x + k);
            r += (source[i] as number) * w;
            g += (source[i + 1] as number) * w;
            b += (source[i + 2] as number) * w;
            a += (source[i + 3] as number) * w;
            weight += w;
          }
        }
        i = 4 * (y * image.width + x);
        out[i] = Math.floor(r / weight);
        out[i + 1] = Math.floor(g / weight);
        out[i + 2] = Math.floor(b / weight);
        out[i + 3] = Math.floor(a / weight);
      }
    }
    const horizontal = new Uint8ClampedArray(out);
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        r = 0;
        g = 0;
        b = 0;
        a = 0;
        weight = 0;
        for (let k = -radius; k < radius + 1; k++) {
          if (y + k > 0 && y + k < image.height) {
            const w = kernel[k + radius] as number;
            i = 4 * ((y + k) * image.width + x);
            r += (horizontal[i] as number) * w;
            g += (horizontal[i + 1] as number) * w;
            b += (horizontal[i + 2] as number) * w;
            a += (horizontal[i + 3] as number) * w;
            weight += w;
          }
        }
        i = 4 * (y * image.width + x);
        out[i] = Math.floor(r / weight);
        out[i + 1] = Math.floor(g / weight);
        out[i + 2] = Math.floor(b / weight);
        out[i + 3] = Math.floor(a / weight);
      }
    }
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        i = 4 * (y * image.width + x);
        if (
          Math.abs((out[i] as number) - (source[i] as number)) +
            Math.abs((out[i + 1] as number) - (source[i + 1] as number)) +
            Math.abs((out[i + 2] as number) - (source[i + 2] as number)) +
            Math.abs((out[i + 3] as number) - (source[i + 3] as number)) >
          delta
        ) {
          out[i] = source[i] as number;
          out[i + 1] = source[i + 1] as number;
          out[i + 2] = source[i + 2] as number;
          out[i + 3] = source[i + 3] as number;
        }
      }
    }
    return blurred;
  }

  /** Loads an image URL and hands a canvas with it to `callback`. */
  loadImage(url: string, callback: (canvas: HTMLCanvasElement) => void): void {
    const image = new Image();
    image.src = url;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      (canvas.getContext("2d") as CanvasRenderingContext2D).drawImage(image, 0, 0);
      callback(canvas);
    };
  }

  getImgdata(canvas: HTMLCanvasElement): ImageData {
    return (canvas.getContext("2d") as CanvasRenderingContext2D).getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }
}
