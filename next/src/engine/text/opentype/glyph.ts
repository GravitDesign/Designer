// Old: chunk.vendor.js module 712 (opentype.js glyph.js, unchanged).

import * as check from "./check.ts";
import * as draw from "./draw.ts";
import type { DrawingContext } from "./draw.ts";
import type { Font, RenderOptions } from "./font.ts";
import type { HintingTrueType } from "./hintingtt.ts";
import { Path } from "./path.ts";
import type { PathCommand } from "./path.ts";

/** A TrueType outline point (glyf table, hinting). */
export interface GlyphPoint {
  x: number;
  y: number;
  onCurve: boolean;
  lastPointOfContour: boolean;
}

/** One part of a composite TrueType glyph. */
export interface GlyphComponent {
  glyphIndex: number;
  xScale: number;
  scale01: number;
  scale10: number;
  yScale: number;
  dx: number;
  dy: number;
  /** Positioned by matching a point of the glyph so far with a point of the component. */
  matchedPoints?: [number, number];
}

/** Builds the path on first access (see glyphset.ts). */
export type PathLoader = () => Path;

export interface GlyphOptions {
  index?: number;
  name?: string | null;
  unicode?: number;
  unicodes?: number[];
  xMin?: number;
  yMin?: number;
  xMax?: number;
  yMax?: number;
  advanceWidth?: number;
  path?: Path | PathLoader;
  /** Passed by the loaders; the glyph doesn't keep it. */
  font?: Font;
}

export interface GlyphMetrics {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  leftSideBearing: number | undefined;
  rightSideBearing?: number;
}

/**
 * A glyph: one mark of the font, usually one character. Its path is loaded
 * lazily the first time it is read.
 */
export class Glyph {
  declare index: number;
  declare name: string | null;
  declare unicode: number | undefined;
  declare unicodes: number[];
  // Only set when given (or, for TrueType glyphs, read from the outline);
  // opentype.js leaves them out to save memory.
  declare xMin?: number;
  declare yMin?: number;
  declare xMax?: number;
  declare yMax?: number;
  declare advanceWidth?: number;
  declare leftSideBearing?: number;

  // Set by the glyf parser (tables/glyf.ts).
  declare numberOfContours?: number;
  declare _xMin?: number;
  declare _yMin?: number;
  declare _xMax?: number;
  declare _yMax?: number;
  declare endPointIndices?: number[];
  declare instructionLength?: number;
  declare instructions?: number[];
  declare points?: GlyphPoint[];
  declare isComposite?: boolean;
  declare components?: GlyphComponent[];

  declare private _pathSource: Path | PathLoader;

  constructor(options: GlyphOptions) {
    this.bindConstructorValues(options);
  }

  bindConstructorValues(options: GlyphOptions): void {
    this.index = options.index || 0;
    this.name = options.name || null;
    this.unicode = options.unicode || undefined;
    // Precedence as in opentype.js: (unicodes || unicode !== undefined) ? [unicode] : [],
    // so a given unicodes list is replaced by [unicode].
    this.unicodes =
      options.unicodes || options.unicode !== undefined ? [options.unicode as number] : [];
    if (options.xMin) this.xMin = options.xMin;
    if (options.yMin) this.yMin = options.yMin;
    if (options.xMax) this.xMax = options.xMax;
    if (options.yMax) this.yMax = options.yMax;
    if (options.advanceWidth) this.advanceWidth = options.advanceWidth;
    // Not enumerable, like the old own "path" accessor.
    Object.defineProperty(this, "_pathSource", {
      value: options.path || new Path(),
      writable: true,
      configurable: true,
      enumerable: false,
    });
  }

  /** The outline in font units. A loader function is run once, on first access. */
  get path(): Path {
    if (typeof this._pathSource === "function") {
      this._pathSource = this._pathSource();
    }
    return this._pathSource;
  }

  set path(value: Path | PathLoader) {
    this._pathSource = value;
  }

  addUnicode(unicode: number): void {
    if (this.unicodes.length === 0) {
      this.unicode = unicode;
    }
    this.unicodes.push(unicode);
  }

  getBoundingBox(): ReturnType<Path["getBoundingBox"]> {
    return this.path.getBoundingBox();
  }

  /**
   * The outline at x,y (baseline) scaled to fontSize, y pointing down. With
   * options.hinting and a TrueType font the hinted outline is used and x,y
   * are rounded.
   */
  getPath(x?: number, y?: number, fontSize?: number, options?: RenderOptions, font?: Font): Path {
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    let commands: PathCommand[];
    let hPoints: ReturnType<HintingTrueType["exec"]>;
    if (!options) options = {};
    let xScale = options.xScale;
    let yScale = options.yScale;

    const hinting = options.hinting && font ? font.hinting : undefined;
    if (hinting) {
      // The hinting engine scales the points itself; undefined means it failed.
      hPoints = this.path && hinting.exec(this, fontSize);
    }

    if (hPoints && hinting) {
      commands = hinting.getCommands(hPoints);
      x = Math.round(x);
      y = Math.round(y);
      xScale = yScale = 1;
    } else {
      commands = this.path.commands;
      const scale = (1 / (this.path.unitsPerEm as number)) * fontSize;
      if (xScale === undefined) xScale = scale;
      if (yScale === undefined) yScale = scale;
    }

    const sx = xScale;
    const sy = yScale as number;
    const p = new Path();
    for (let i = 0; i < commands.length; i += 1) {
      const cmd = commands[i] as PathCommand;
      if (cmd.type === "M") {
        p.moveTo(x + cmd.x * sx, y + -cmd.y * sy);
      } else if (cmd.type === "L") {
        p.lineTo(x + cmd.x * sx, y + -cmd.y * sy);
      } else if (cmd.type === "Q") {
        p.quadraticCurveTo(x + cmd.x1 * sx, y + -cmd.y1 * sy, x + cmd.x * sx, y + -cmd.y * sy);
      } else if (cmd.type === "C") {
        p.curveTo(
          x + cmd.x1 * sx,
          y + -cmd.y1 * sy,
          x + cmd.x2 * sx,
          y + -cmd.y2 * sy,
          x + cmd.x * sx,
          y + -cmd.y * sy,
        );
      } else if (cmd.type === "Z") {
        p.closePath();
      }
    }
    return p;
  }

  /** The TrueType points split into contours. */
  getContours(): GlyphPoint[][] {
    if (this.points === undefined) {
      return [];
    }
    const contours: GlyphPoint[][] = [];
    let currentContour: GlyphPoint[] = [];
    for (let i = 0; i < this.points.length; i += 1) {
      const pt = this.points[i] as GlyphPoint;
      currentContour.push(pt);
      if (pt.lastPointOfContour) {
        contours.push(currentContour);
        currentContour = [];
      }
    }
    check.argument(
      currentContour.length === 0,
      "There are still points left in the current contour.",
    );
    return contours;
  }

  /** Extents of all path points (control points included) and the side bearings. */
  getMetrics(): GlyphMetrics {
    const commands = this.path.commands;
    const xCoords: number[] = [];
    const yCoords: number[] = [];
    for (let i = 0; i < commands.length; i += 1) {
      const cmd = commands[i] as PathCommand;
      if (cmd.type !== "Z") {
        xCoords.push(cmd.x);
        yCoords.push(cmd.y);
      }
      if (cmd.type === "Q" || cmd.type === "C") {
        xCoords.push(cmd.x1);
        yCoords.push(cmd.y1);
      }
      if (cmd.type === "C") {
        xCoords.push(cmd.x2);
        yCoords.push(cmd.y2);
      }
    }

    const metrics: GlyphMetrics = {
      xMin: Math.min.apply(null, xCoords),
      yMin: Math.min.apply(null, yCoords),
      xMax: Math.max.apply(null, xCoords),
      yMax: Math.max.apply(null, yCoords),
      leftSideBearing: this.leftSideBearing,
    };
    if (!isFinite(metrics.xMin)) metrics.xMin = 0;
    if (!isFinite(metrics.xMax)) metrics.xMax = this.advanceWidth as number;
    if (!isFinite(metrics.yMin)) metrics.yMin = 0;
    if (!isFinite(metrics.yMax)) metrics.yMax = 0;
    metrics.rightSideBearing =
      (this.advanceWidth as number) -
      (metrics.leftSideBearing as number) -
      (metrics.xMax - metrics.xMin);
    return metrics;
  }

  draw(
    ctx: DrawingContext,
    x?: number,
    y?: number,
    fontSize?: number,
    options?: RenderOptions,
  ): void {
    this.getPath(x, y, fontSize, options).draw(ctx);
  }

  /** Draws the on-curve points blue and the control points red. */
  drawPoints(ctx: DrawingContext, x?: number, y?: number, fontSize?: number): void {
    const context = ctx;
    function drawCircles(l: { x: number; y: number }[], x: number, y: number, scale: number): void {
      const PI_SQ = Math.PI * 2;
      context.beginPath();
      for (let j = 0; j < l.length; j += 1) {
        const pt = l[j] as { x: number; y: number };
        context.moveTo(x + pt.x * scale, y + pt.y * scale);
        context.arc(x + pt.x * scale, y + pt.y * scale, 2, 0, PI_SQ, false);
      }
      context.closePath();
      context.fill();
    }

    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 24;
    const scale = (1 / (this.path.unitsPerEm as number)) * fontSize;

    const blueCircles: { x: number; y: number }[] = [];
    const redCircles: { x: number; y: number }[] = [];
    const path = this.path;
    for (let i = 0; i < path.commands.length; i += 1) {
      const cmd = path.commands[i] as PathCommand;
      if ("x" in cmd && cmd.x !== undefined) {
        blueCircles.push({ x: cmd.x, y: -cmd.y });
      }
      if ("x1" in cmd && cmd.x1 !== undefined) {
        redCircles.push({ x: cmd.x1, y: -cmd.y1 });
      }
      if ("x2" in cmd && cmd.x2 !== undefined) {
        redCircles.push({ x: cmd.x2, y: -cmd.y2 });
      }
    }

    context.fillStyle = "blue";
    drawCircles(blueCircles, x, y, scale);
    context.fillStyle = "red";
    drawCircles(redCircles, x, y, scale);
  }

  /** Draws the origin, the bounding box and the advance width as lines. */
  drawMetrics(ctx: DrawingContext, x?: number, y?: number, fontSize?: number): void {
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 24;
    const scale = (1 / (this.path.unitsPerEm as number)) * fontSize;
    ctx.lineWidth = 1;

    ctx.strokeStyle = "black";
    draw.line(ctx, x, -10000, x, 10000);
    draw.line(ctx, -10000, y, 10000, y);

    const xMin = this.xMin || 0;
    const yMin = this.yMin || 0;
    const xMax = this.xMax || 0;
    const yMax = this.yMax || 0;
    const advanceWidth = this.advanceWidth || 0;

    ctx.strokeStyle = "blue";
    draw.line(ctx, x + xMin * scale, -10000, x + xMin * scale, 10000);
    draw.line(ctx, x + xMax * scale, -10000, x + xMax * scale, 10000);
    draw.line(ctx, -10000, y + -yMin * scale, 10000, y + -yMin * scale);
    draw.line(ctx, -10000, y + -yMax * scale, 10000, y + -yMax * scale);

    ctx.strokeStyle = "green";
    draw.line(ctx, x + advanceWidth * scale, -10000, x + advanceWidth * scale, 10000);
  }
}
