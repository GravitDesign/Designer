// Paint canvas cases whose results were recorded once from the old
// GPaintCanvas (chunk.vendor.js module 14) running on the fake canvas, see
// paint-canvas-cases.json. The cases only use members the old and the new
// classes share, so the same code drives both; the recording script lives
// outside the repo.
import type { PaintCanvas as PaintCanvasClass } from "../paint-canvas.ts";
import type { Point as PointClass } from "../../math/point.ts";
import type { Rect as RectClass } from "../../math/rect.ts";
import type { Transform as TransformClass } from "../../math/transform.ts";
import { FakeCanvas, FakeImage, type FakeContext2D } from "./fake-canvas.ts";

/** The classes a case needs: the new ones in the test, the old ones when recording. */
export interface PaintLib {
  PaintCanvas: typeof PaintCanvasClass;
  Rect: typeof RectClass;
  Point: typeof PointClass;
  Transform: typeof TransformClass;
}

type Canvas = InstanceType<typeof PaintCanvasClass>;

const box = (rect: RectClass | null) =>
  rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;

/** The log of the canvas behind a plain paint canvas, with canvas ids numbered by first use. */
function normalizedLog(log: string[], ids: Map<string, number>): string[] {
  return log.map((entry) =>
    entry.replace(/canvas#(\d+)/g, (_match, id: string) => {
      if (!ids.has(id)) ids.set(id, ids.size + 1);
      return "canvas@" + String(ids.get(id));
    }),
  );
}

function logOfPlain(canvas: Canvas): string[] {
  const real = canvas._canvasContext.canvas as unknown as FakeCanvas;
  return (real.getContext("2d") as FakeContext2D).log;
}

function plain(lib: PaintLib, width: number, height: number): Canvas {
  const canvas = new lib.PaintCanvas(false, true);
  canvas.resize(width, height);
  return canvas;
}

export const PAINT_CANVAS_CASES: Record<string, (lib: PaintLib) => unknown> = {
  createCanvasClipPadding(lib) {
    const source = plain(lib, 300, 200);
    source.prepare([new lib.Rect(10, 20, 50, 40), new lib.Rect(120, 30, 60, 70)]);
    source.setOrigin(new lib.Point(5, 7));
    source.setScale(2);
    const made = source.createCanvas(new lib.Rect(20, 10, 80, 60), true, 4);
    return {
      size: [made.getWidth(), made.getHeight()],
      areas: (made.getAreas() || []).map(box),
      origin: [made.getOrigin()?.getX(), made.getOrigin()?.getY()],
      offset: [made.getOffset()?.getX(), made.getOffset()?.getY()],
      scale: made.getScale(),
    };
  },

  createCanvasClipPaddingArray(lib) {
    const source = plain(lib, 300, 200);
    source.prepare([new lib.Rect(10, 20, 50, 40), new lib.Rect(120, 30, 60, 70)]);
    const made = source.createCanvas(new lib.Rect(0, 0, 100, 100), true, [1, 2, 3, 4]);
    const unclipped = source.createCanvas(new lib.Rect(0, 0, 100, 100), false, 3);
    const noPadding = source.createCanvas(new lib.Rect(0, 0, 100, 100), true);
    return {
      areas: (made.getAreas() || []).map(box),
      unclipped: unclipped.getAreas(),
      unclippedSize: [unclipped.getWidth(), unclipped.getHeight()],
      noPadding: (noPadding.getAreas() || []).map(box),
    };
  },

  createTexture(lib) {
    const canvas = plain(lib, 20, 20);
    canvas.prepare();
    const incomplete = new FakeImage();
    incomplete.complete = false;
    incomplete.naturalWidth = 10;
    const complete = new FakeImage();
    complete.naturalWidth = 10;
    const noWidth = new FakeImage();
    const narrow = new FakeCanvas();
    narrow.width = 0;
    narrow.height = 5;
    const fine = new FakeCanvas();
    fine.width = 4;
    fine.height = 4;
    const real = canvas._canvasContext as unknown as FakeContext2D;
    const kind = (pattern: unknown) => (pattern ? "pattern" : String(pattern));
    const results: Record<string, unknown> = {
      none: kind(canvas.createTexture(null)),
      incompleteImage: kind(canvas.createTexture(incomplete as never)),
      completeImage: kind(canvas.createTexture(complete as never)),
      imageWithoutWidth: kind(canvas.createTexture(noWidth as never)),
      zeroWidthCanvas: kind(canvas.createTexture(narrow as never)),
      canvas: kind(canvas.createTexture(fine as never, "repeat-x")),
    };
    const warnings: unknown[] = [];
    const warn = console.warn;
    const createPattern = real.createPattern;
    real.createPattern = () => {
      throw new DOMException("broken", "InvalidStateError");
    };
    console.warn = (...args: unknown[]) => warnings.push(args);
    try {
      results.throwingCanvas = kind(canvas.createTexture(fine as never));
      try {
        results.throwingImage = kind(canvas.createTexture(complete as never));
      } catch (error) {
        results.throwingImage = "throws " + String(error);
      }
    } finally {
      real.createPattern = createPattern;
      console.warn = warn;
    }
    results.warnings = warnings;
    results.log = normalizedLog(logOfPlain(canvas), new Map());
    return results;
  },

  setRenderAlgorithm(lib) {
    const results: unknown[] = [];
    for (const algorithm of [0, 1, 2, 7]) {
      const canvas = plain(lib, 4, 4);
      canvas.setRenderAlgorithm(algorithm);
      results.push(canvas._canvasContext.canvas.style.imageRendering);
    }
    const recorded = new lib.PaintCanvas(true);
    recorded.setRenderAlgorithm(0);
    results.push(
      (recorded._canvasContext as unknown as { imageRendering: unknown }).imageRendering,
    );
    return results;
  },

  measureText(lib) {
    const canvas = plain(lib, 4, 4);
    canvas.measureText("a", 12);
    canvas.measureText("b", 12.6);
    canvas.measureText("c", "bold 9px Arial");
    canvas.measureText("d");
    canvas.measureText("e", 0);
    return normalizedLog(logOfPlain(canvas), new Map());
  },

  drawSmoothImageRotated(lib) {
    const canvas = plain(lib, 200, 200);
    canvas.prepare();
    canvas.setOrigin(new lib.Point(3, 4));
    canvas.setScale(0.2);
    canvas.setTransform(new lib.Transform().rotated(0.5).translated(10, 20));
    const image = new FakeCanvas();
    image.width = 400;
    image.height = 300;
    const ids = new Map<string, number>();
    const before = logOfPlain(canvas).length;
    const drawn = canvas._drawSmoothImage(image as never, 5, 6, 400, 300);
    return { drawn, log: normalizedLog(logOfPlain(canvas).slice(before), ids) };
  },

  drawSmoothImageSkewed(lib) {
    const canvas = plain(lib, 200, 200);
    canvas.prepare();
    canvas.setScale(0.3);
    canvas.setTransform(new lib.Transform(1, 0.2, 0.4, 1, 7, 9));
    const image = new FakeCanvas();
    image.width = 100;
    image.height = 120;
    const before = logOfPlain(canvas).length;
    const drawn = canvas._drawSmoothImage(image as never, 0, 0, 100, 120);
    const upscaled = plain(lib, 50, 50);
    upscaled.prepare();
    upscaled.setScale(2);
    const notDrawn = upscaled._drawSmoothImage(image as never, 0, 0, 100, 120);
    const oneStep = plain(lib, 50, 50);
    oneStep.prepare();
    oneStep.setScale(0.75);
    const beforeOne = logOfPlain(oneStep).length;
    const oneStepDrawn = oneStep._drawSmoothImage(image as never, 1, 2, 100, 120);
    return {
      drawn,
      log: normalizedLog(logOfPlain(canvas).slice(before), new Map()),
      notDrawn,
      oneStepDrawn,
      oneStepLog: normalizedLog(logOfPlain(oneStep).slice(beforeOne), new Map()),
    };
  },

  convertImage(lib) {
    const canvas = plain(lib, 4, 4);
    try {
      canvas._convertImage({} as never);
      return "no throw";
    } catch (error) {
      return String(error);
    }
  },
};
