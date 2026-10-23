// Old: chunk.vendor.js module 1399.
//
// The canvas factory pdf.js uses for scratch canvases (groups, soft masks,
// patterns) during a PDF import: every canvas gets a canvas bridge of its
// own, so what pdf.js draws into it becomes scene nodes too.
import { CanvasHolder } from "../../export/canvas-holder.ts";

/** The graphics object the factory belongs to (set by the import's CanvasGraphics). */
interface FactoryOwner {
  ctx: { createContext(canvas: CanvasHolder): unknown };
}

export interface FactoryCanvas {
  canvas: CanvasHolder | null;
  context: unknown;
}

export class PdfCanvasFactory {
  gfx: FactoryOwner | null = null;

  create(width: number, height: number): FactoryCanvas {
    if (width <= 0 || height <= 0) throw new Error("invalid canvas size");
    const canvas = new CanvasHolder(width, height);
    return {
      canvas,
      context: (this.gfx as FactoryOwner).ctx.createContext(canvas),
    };
  }

  reset(canvasAndContext: FactoryCanvas, width: number, height: number): void {
    if (!canvasAndContext.canvas) throw new Error("canvas is not specified");
    if (width <= 0 || height <= 0) throw new Error("invalid canvas size");
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: FactoryCanvas): void {
    if (!canvasAndContext.canvas) throw new Error("canvas is not specified");
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}
