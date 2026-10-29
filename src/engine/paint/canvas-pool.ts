// Not in the old app. Style painting (opacity, blend modes, effects, separate
// style layers) used a new canvas for every element on every repaint and
// dropped it after one draw; making the canvas and its 2D context, and the
// garbage they leave, was a large part of each zoom frame. Released canvases
// wait here and are handed out again in place of new ones.
//
// A canvas handed out must be indistinguishable from a new one: the size
// asked for, the default drawing state (transform, save/restore stack,
// clip, filter, alpha, composite operator, smoothing, line and text
// settings, shadows, line dash, path) and transparent pixels. A canvas of
// the asked size is reset with context.reset(); one of another size gets
// the new size, and a size write resets the context the same way.

/** At most this many canvases wait in the pool. */
const MAX_CANVASES = 8;
/** At most this many pixels wait in the pool, about 32 MB. */
const MAX_PIXELS = 8 * 1024 * 1024;

interface PooledCanvas {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

const pooled: PooledCanvas[] = [];
/** The canvases in `pooled`, so one released twice is kept once. */
const waiting = new Set<HTMLCanvasElement>();
let pooledPixels = 0;

function pixelsOf(canvas: HTMLCanvasElement): number {
  return canvas.width * canvas.height;
}

/** Back to the state of a new context, with transparent pixels, at the same size. */
function resetContext(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void {
  if (typeof (context as { reset?: unknown }).reset == "function") context.reset();
  else {
    // Without reset() (Chromium before 99): a size write resets the context
    // and clears the pixels, even when the size stays the same.
    // eslint-disable-next-line no-self-assign -- the write is what resets
    canvas.width = canvas.width;
  }
}

/**
 * A released canvas of `width` x `height` with a fresh 2D context, or null
 * when the pool is empty. One of that size is preferred; otherwise the last
 * one released is resized.
 */
export function takeCanvas(width: number, height: number): PooledCanvas | null {
  if (!pooled.length) return null;
  let index = pooled.length - 1;
  for (let i = pooled.length - 1; i >= 0; i--) {
    const entry = pooled[i] as PooledCanvas;
    if (entry.canvas.width === width && entry.canvas.height === height) {
      index = i;
      break;
    }
  }
  const entry = pooled.splice(index, 1)[0] as PooledCanvas;
  waiting.delete(entry.canvas);
  pooledPixels -= pixelsOf(entry.canvas);
  const { canvas, context } = entry;
  if (canvas.width === width && canvas.height === height) resetContext(canvas, context);
  else {
    // Each size write resets the context and clears the pixels.
    canvas.width = width;
    canvas.height = height;
  }
  // A new canvas has no image-rendering style; clone() and
  // setRenderAlgorithm() set one.
  if (canvas.style.imageRendering) canvas.style.imageRendering = "";
  return entry;
}

/**
 * Gives a canvas back for reuse. The caller must not use the canvas, its
 * context or anything wrapping them afterwards. Canvases beyond the pool's
 * limits are left to the garbage collector.
 */
export function releaseCanvas(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void {
  if (waiting.has(canvas)) return;
  const pixels = pixelsOf(canvas);
  if (pooled.length >= MAX_CANVASES || pooledPixels + pixels > MAX_PIXELS) return;
  pooled.push({ canvas, context });
  waiting.add(canvas);
  pooledPixels += pixels;
}

/** Empties the pool. */
export function clearCanvasPool(): void {
  pooled.length = 0;
  waiting.clear();
  pooledPixels = 0;
}

/** How many canvases wait in the pool (for tests). */
export function pooledCanvasCount(): number {
  return pooled.length;
}
