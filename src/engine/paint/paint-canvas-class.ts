// The paint canvas class for the WebGL modules. They need it at run time
// (instanceof, new canvases), but importing paint-canvas.ts from them would
// close an import cycle through the blender, whose classes extend theirs.
// paint-canvas.ts registers itself when it loads.
import type { Canvas2DPaintCanvas } from "./paint-canvas.ts";

let paintCanvasClass: typeof Canvas2DPaintCanvas | null = null;

export function registerPaintCanvasClass(cls: typeof Canvas2DPaintCanvas): void {
  paintCanvasClass = cls;
}

export function getPaintCanvasClass(): typeof Canvas2DPaintCanvas {
  if (!paintCanvasClass) throw new Error("paint-canvas.ts is not loaded");
  return paintCanvasClass;
}

/** Whether `value` is a paint canvas (false while paint-canvas.ts isn't loaded). */
export function isPaintCanvas(value: unknown): value is Canvas2DPaintCanvas {
  return !!paintCanvasClass && value instanceof paintCanvasClass;
}
