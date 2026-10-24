import { Bitmap } from "../../engine/paint/bitmap.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { PaintContext } from "../../engine/paint/paint-context.ts";
import { RendererConfig } from "../../engine/paint/renderer-config.ts";
import { ScenePaintConfiguration } from "../../engine/paint/scene-paint-configuration.ts";

// Only the names the old G barrel had (vendor module 1).
export const enginePaint = {
  GScenePaintConfiguration: ScenePaintConfiguration,
  GBitmap: Bitmap,
  GPaintCanvas: PaintCanvas,
  GPaintContext: PaintContext,
  GRendererConfig: RendererConfig,
};
