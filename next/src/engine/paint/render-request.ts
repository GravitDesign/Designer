// Old: chunk.vendor.js module 937.
import type { Point } from "../math/point.ts";
import type { Rect } from "../math/rect.ts";
import type { Transform } from "../math/transform.ts";
import type { PaintContext } from "./paint-context.ts";

/** What a scene needs to be painted into the tile canvases. */
export interface PaintableScene {
  paint(context: PaintContext, screen: Rect | null | undefined): void;
}

/** The callback of a render: the canvas to show, whether it is final, whether something was skipped. */
export type RenderResultCallback = (
  canvas: HTMLCanvasElement | null,
  finished: boolean,
  skipped: boolean,
) => void;

/** One queued paintAndRender call of the tile renderer. */
export class RenderRequest {
  scene: PaintableScene | null = null;
  paintContext: PaintContext | null = null;
  viewTransform: Transform | null = null;
  origin: Point | null = null;
  scale = 0;
  screen: Rect | null = null;
  panRepaint: boolean | null = null;
  callback: RenderResultCallback | null = null;
}
