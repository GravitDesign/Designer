// Old: chunk.vendor.js module 326 (opentype.js path.js, unchanged).

import { BoundingBox } from "./bbox.ts";
import type { DrawingContext } from "./draw.ts";

export interface MoveToCommand {
  type: "M";
  x: number;
  y: number;
}

export interface LineToCommand {
  type: "L";
  x: number;
  y: number;
}

export interface CurveToCommand {
  type: "C";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x: number;
  y: number;
}

export interface QuadToCommand {
  type: "Q";
  x1: number;
  y1: number;
  x: number;
  y: number;
}

export interface CloseCommand {
  type: "Z";
}

export type PathCommand =
  MoveToCommand | LineToCommand | CurveToCommand | QuadToCommand | CloseCommand;

/** A bezier path made of SVG-like commands. */
export class Path {
  commands: PathCommand[] = [];
  fill: string | null = "black";
  stroke: string | null = null;
  strokeWidth = 1;
  /** Set by the glyph loaders (glyphset.ts); Glyph.getPath scales by it. */
  declare unitsPerEm?: number;

  moveTo(x: number, y: number): void {
    this.commands.push({ type: "M", x, y });
  }

  lineTo(x: number, y: number): void {
    this.commands.push({ type: "L", x, y });
  }

  /** Cubic curve with control points x1,y1 and x2,y2 to x,y. */
  curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void {
    this.commands.push({ type: "C", x1, y1, x2, y2, x, y });
  }

  bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void {
    this.curveTo(x1, y1, x2, y2, x, y);
  }

  /** Quadratic curve with control point x1,y1 to x,y. */
  quadTo(x1: number, y1: number, x: number, y: number): void {
    this.commands.push({ type: "Q", x1, y1, x, y });
  }

  quadraticCurveTo(x1: number, y1: number, x: number, y: number): void {
    this.quadTo(x1, y1, x, y);
  }

  close(): void {
    this.commands.push({ type: "Z" });
  }

  closePath(): void {
    this.close();
  }

  /** Appends another path's commands, a list of commands, or a bounding box as a closed rectangle. */
  extend(pathOrCommands: Path | PathCommand[] | BoundingBox): void {
    let commands: PathCommand[];
    if (pathOrCommands instanceof Path && pathOrCommands.commands) {
      commands = pathOrCommands.commands;
    } else if (pathOrCommands instanceof BoundingBox) {
      const box = pathOrCommands;
      this.moveTo(box.x1, box.y1);
      this.lineTo(box.x2, box.y1);
      this.lineTo(box.x2, box.y2);
      this.lineTo(box.x1, box.y2);
      this.close();
      return;
    } else {
      commands = pathOrCommands as PathCommand[];
    }
    Array.prototype.push.apply(this.commands, commands);
  }

  getBoundingBox(): BoundingBox {
    const box = new BoundingBox();

    let startX = 0;
    let startY = 0;
    let prevX = 0;
    let prevY = 0;
    for (let i = 0; i < this.commands.length; i++) {
      const cmd = this.commands[i] as PathCommand;
      switch (cmd.type) {
        case "M":
          box.addPoint(cmd.x, cmd.y);
          startX = prevX = cmd.x;
          startY = prevY = cmd.y;
          break;
        case "L":
          box.addPoint(cmd.x, cmd.y);
          prevX = cmd.x;
          prevY = cmd.y;
          break;
        case "Q":
          box.addQuad(prevX, prevY, cmd.x1, cmd.y1, cmd.x, cmd.y);
          prevX = cmd.x;
          prevY = cmd.y;
          break;
        case "C":
          box.addBezier(prevX, prevY, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
          prevX = cmd.x;
          prevY = cmd.y;
          break;
        case "Z":
          prevX = startX;
          prevY = startY;
          break;
        default:
          throw new Error("Unexpected path command " + (cmd as { type: string }).type);
      }
    }
    if (box.isEmpty()) {
      box.addPoint(0, 0);
    }
    return box;
  }

  draw(ctx: DrawingContext): void {
    ctx.beginPath();
    for (let i = 0; i < this.commands.length; i += 1) {
      const cmd = this.commands[i] as PathCommand;
      if (cmd.type === "M") {
        ctx.moveTo(cmd.x, cmd.y);
      } else if (cmd.type === "L") {
        ctx.lineTo(cmd.x, cmd.y);
      } else if (cmd.type === "C") {
        ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
      } else if (cmd.type === "Q") {
        ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
      } else if (cmd.type === "Z") {
        ctx.closePath();
      }
    }

    if (this.fill) {
      ctx.fillStyle = this.fill;
      ctx.fill();
    }

    if (this.stroke) {
      ctx.strokeStyle = this.stroke;
      ctx.lineWidth = this.strokeWidth;
      ctx.stroke();
    }
  }

  /** SVG path data, numbers rounded to decimalPlaces (default 2) unless whole. */
  toPathData(decimalPlaces?: number): string {
    const places = decimalPlaces !== undefined ? decimalPlaces : 2;

    function floatToString(v: number): string {
      if (Math.round(v) === v) {
        return "" + Math.round(v);
      }
      return v.toFixed(places);
    }

    function packValues(...values: number[]): string {
      let s = "";
      for (let i = 0; i < values.length; i += 1) {
        const v = values[i] as number;
        if (v >= 0 && i > 0) {
          s += " ";
        }
        s += floatToString(v);
      }
      return s;
    }

    let d = "";
    for (let i = 0; i < this.commands.length; i += 1) {
      const cmd = this.commands[i] as PathCommand;
      if (cmd.type === "M") {
        d += "M" + packValues(cmd.x, cmd.y);
      } else if (cmd.type === "L") {
        d += "L" + packValues(cmd.x, cmd.y);
      } else if (cmd.type === "C") {
        d += "C" + packValues(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
      } else if (cmd.type === "Q") {
        d += "Q" + packValues(cmd.x1, cmd.y1, cmd.x, cmd.y);
      } else if (cmd.type === "Z") {
        d += "Z";
      }
    }
    return d;
  }

  toSVG(decimalPlaces?: number): string {
    let svg = '<path d="';
    svg += this.toPathData(decimalPlaces);
    svg += '"';
    if (this.fill && this.fill !== "black") {
      // opentype.js also has a fill="none" branch for a null fill here, but
      // it can't be reached inside this check; a null fill writes nothing.
      svg += ' fill="' + this.fill + '"';
    }
    if (this.stroke) {
      svg += ' stroke="' + this.stroke + '" stroke-width="' + this.strokeWidth + '"';
    }
    svg += "/>";
    return svg;
  }

  toDOMElement(decimalPlaces?: number): SVGPathElement {
    const pathData = this.toPathData(decimalPlaces);
    const element = document.createElementNS("http://www.w3.org/2000/svg", "path");
    element.setAttribute("d", pathData);
    return element;
  }
}
