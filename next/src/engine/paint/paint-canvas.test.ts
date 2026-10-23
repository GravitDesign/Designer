import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { Vertex } from "../geometry/vertex.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { LinearGradient } from "../style/linear-gradient.ts";
import { RadialGradient } from "../style/radial-gradient.ts";
import type { Canvas2DPaintCanvas } from "./paint-canvas.ts";
import { PaintCanvas } from "./paint-canvas.ts";
import { RecorderStateContext } from "./recorder-state-context.ts";
import { RenderScheduler } from "./render-scheduler.ts";
import type { FakeCanvas } from "./testing/fake-canvas.ts";
import { installFakeCanvas, logOf, type FakeContext2D } from "./testing/fake-canvas.ts";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());

function plain(width = 64, height = 64): Canvas2DPaintCanvas {
  const canvas = new PaintCanvas(false, true);
  canvas.resize(width, height);
  return canvas;
}

/** The log from now on. */
function since(canvas: Canvas2DPaintCanvas): () => string[] {
  const start = logOf(canvas).length;
  return () => logOf(canvas).slice(start);
}

describe("PaintCanvas statics", () => {
  it("merges the WebGL blend modes into BlendMode after the CSS ones", () => {
    const modes = Object.values(PaintCanvas.BlendMode);
    expect(modes.slice(0, 2)).toEqual(["normal", "multiply"]);
    expect(modes.slice(16)).toEqual(Object.values(PaintCanvas.WebGLBlendMode));
    expect(modes).toHaveLength(28);
  });

  it("draws a chessboard with colorB on the diagonal", () => {
    const board = PaintCanvas.createChessboard(8, "#ffffff", "#cdcdcd") as unknown as FakeCanvas;
    expect([board.width, board.height]).toEqual([16, 16]);
    const log = (board.getContext("2d") as FakeContext2D).log;
    expect(log).toEqual([
      'fillStyle="#ffffff"',
      "fillRect(0,0,16,16)",
      'fillStyle="#cdcdcd"',
      "fillRect(0,0,8,8)",
      "fillRect(8,8,8,8)",
    ]);
  });
});

describe("prepare and finish", () => {
  it("clips to the areas clamped to the canvas and clears them", () => {
    const canvas = plain(200, 120);
    const log = since(canvas);
    canvas.prepare([new Rect(10, 10, 50, 40), new Rect(100, 20, 300, 300)]);
    expect(log()).toEqual([
      "save()",
      "setTransform(1,0,0,1,0,0)",
      "beginPath()",
      "moveTo(10,10)",
      "lineTo(60,10)",
      "lineTo(60,50)",
      "lineTo(10,50)",
      "lineTo(10,10)",
      "clearRect(10,10,50,40)",
      "moveTo(100,20)",
      "lineTo(200,20)",
      "lineTo(200,120)",
      "lineTo(100,120)",
      "lineTo(100,20)",
      "clearRect(100,20,100,100)",
      "clip()",
    ]);
    expect(canvas.isClipped()).toBe(true);
    canvas.finish();
    expect(log().slice(-1)).toEqual(["restore()"]);
    expect(canvas.getAreas()).toBeNull();
  });

  it("clears everything without areas and is not clipped by one covering area", () => {
    const canvas = plain(80, 60);
    const log = since(canvas);
    canvas.prepare();
    expect(log()).toEqual(["save()", "setTransform(1,0,0,1,0,0)", "clearRect(0,0,80,60)"]);
    canvas.finish();
    canvas.prepare([new Rect(0, 0, 80, 60)]);
    expect(canvas.isClipped()).toBe(false);
  });
});

describe("geometry helpers", () => {
  // The values the old app recorded (corpus/matrix/canvas-geometry).
  const setUp = () => {
    const canvas = plain(200, 120);
    canvas.prepare();
    canvas.setScale(1.5);
    canvas.setOrigin(new Point(7.3, -4.6));
    canvas.setOffset(new Point(3, 2));
    return canvas;
  };

  it("maps and clamps paint extents", () => {
    const canvas = setUp();
    const rect = new Rect(-20.25, 10.5, 90.7, 200.1);
    expect(canvas.getPaintExtents(rect).toString()).toBe(
      new Rect(0, 20.35, 98.37500000000001, 99.65).toString(),
    );
    expect(canvas.getPaintExtents(rect, true).toString()).toBe(
      new Rect(-37.675, 20.35, 136.05, 300.15).toString(),
    );
    expect(canvas.getPaintExtents(new Rect(10, 10, 20, 20), false, [4, 5, 6, 7]).toString()).toBe(
      new Rect(7.7, 19.6, 30.000000000000004, 30).toString(),
    );
    expect(canvas.getFinalExtents(canvas.getPaintExtents(rect)).toString()).toBe(
      new Rect(7.299999999999999, 15.75, 98.37500000000001, 99.65).toString(),
    );
  });

  it("corrects sub-pixel offsets and scaled boxes", () => {
    const canvas = setUp();
    const translate = canvas.getTranslateCorrection(new Point(10.37, -3.71), new Point(2.5, 0.25));
    expect([translate.getX(), translate.getY()]).toEqual([
      0.13000000000000078, 0.040000000000000036,
    ]);
    const up = canvas.getScaleBoxCorrection(10.3, 4.6, 33.3, 21.7, 1.5, true);
    expect([up.getX(), up.getY(), up.getWidth(), up.getHeight()]).toEqual([
      10.666666666666666, 4.666666666666666, 32.666666666666664, 21.333333333333336,
    ]);
    const down = canvas.getScaleBoxCorrection(10.3, 4.6, 33.3, 21.7, 0.5, false);
    expect([down.getX(), down.getY(), down.getWidth(), down.getHeight()]).toEqual([10, 4, 32, 20]);
  });

  it("folds scale and origin into the transform unless raw", () => {
    const canvas = setUp();
    expect(canvas.getTransform().toString()).toBe(
      "[Object GTransform(sx=1.5, shy=0, shx=0, sy=1.5, tx=-7.3, ty=4.6)]",
    );
    expect(canvas.getTransform(true).isIdentity()).toBe(true);
  });

  it("counts mask levels and resets on a negative value", () => {
    const canvas = plain();
    canvas.setMasked(true);
    canvas.setMasked(1);
    canvas.setMasked(false);
    expect(canvas.isMasked()).toBe(true);
    canvas.setMasked(-1);
    expect(canvas.isMasked()).toBe(false);
  });
});

describe("drawing calls", () => {
  let canvas: Canvas2DPaintCanvas;
  beforeEach(() => {
    canvas = plain();
    canvas.prepare();
  });

  it("fillRect sets alpha and style, the blender the operator, then fills", () => {
    const log = since(canvas);
    canvas.fillRect(8, 8, 48, 48, new RGBColor([220, 30, 30]), 0.5, "multiply");
    expect(log()).toEqual([
      "globalAlpha=0.5",
      'fillStyle="#DC1E1E"',
      'globalCompositeOperation="multiply"',
      "fillRect(8,8,48,48)",
    ]);
  });

  it("strokeLine dashes with twice the width and undoes the dash", () => {
    const log = since(canvas);
    canvas.strokeLine(4, 60, 60, 4, 4, new RGBColor([0, 150, 0]), true, 0.8);
    expect(log()).toEqual([
      "globalAlpha=0.8",
      'strokeStyle="#009600"',
      "lineWidth=4",
      "setLineDash([8])",
      "beginPath()",
      "moveTo(4,60)",
      "lineTo(60,4)",
      "stroke()",
      "setLineDash([])",
    ]);
  });

  it("strokeVertices applies the defaults", () => {
    canvas.putVertices([new Point(0, 0), new Point(10, 0)], false);
    const log = since(canvas);
    canvas.strokeVertices("#123456");
    expect(log()).toEqual([
      'strokeStyle="#123456"',
      "lineWidth=1",
      'lineCap="butt"',
      'lineJoin="miter"',
      "miterLimit=10",
      "globalAlpha=1",
      "stroke()",
    ]);
  });

  it("putVertices reads curves at the canvas scale and closes when asked", () => {
    const source = new VertexContainer();
    source.addVertex(Vertex.Command.Move, 0, 0);
    source.addVertex(Vertex.Command.Curve2, 30, 0);
    source.addVertex(Vertex.Command.Curve2, 10, 5);
    source.addVertex(Vertex.Command.Curve2, 20, 5);
    source.addVertex(Vertex.Command.Curve, 30, 30);
    source.addVertex(Vertex.Command.Curve, 40, 10);
    const log = since(canvas);
    expect(canvas.putVertices(source, true)).toBe(true);
    expect(log()).toEqual([
      "beginPath()",
      "moveTo(0,0)",
      "bezierCurveTo(10,5,20,5,30,0)",
      "quadraticCurveTo(40,10,30,30)",
      "closePath()",
    ]);
    expect(canvas.putVertices([], true)).toBeUndefined();
  });

  it("clipVertices saves and clips with the fill rule", () => {
    const log = since(canvas);
    canvas.clipVertices(true);
    canvas.resetClip();
    expect(log()).toEqual(["save()", 'clip("evenodd")', "restore()"]);
  });

  it("drawCanvas snaps a sub-canvas to its offset and restores smoothing", () => {
    const child = plain(20, 10);
    child.prepare();
    child.setOffset(new Point(5, 7));
    const log = since(canvas);
    canvas.drawCanvas(child, 2, 3, 0.75, "destination-out");
    expect(log()).toEqual([
      "imageSmoothingEnabled=false",
      "setTransform(1,0,0,1,0,0)",
      "globalAlpha=0.75",
      'globalCompositeOperation="destination-out"',
      "drawImage(canvas#" + (child._canvasContext.canvas as unknown as FakeCanvas).id + ",7,10)",
      "setTransform(1,0,0,1,0,0)",
      "imageSmoothingEnabled=true",
    ]);
  });

  it("putAuxilliaryText uses the UI defaults", () => {
    const log = since(canvas);
    canvas.putAuxilliaryText("Ag", 4, 30);
    expect(log()).toEqual([
      "globalAlpha=1",
      'fillStyle="#000000"',
      'textAlign="start"',
      'font="10px Verdana"',
      'textBaseline="bottom"',
      'fillText("Ag",4,30)',
    ]);
  });
});

describe("setFilter", () => {
  it("writes all filters in insertion order and converts the values", () => {
    const canvas = plain();
    // Filters only apply where the context has a filter property.
    (globalThis as unknown as { window: unknown }).window = {};
    try {
      canvas.setFilter("blur", 4);
      canvas.setFilter("sepia", [1]);
      canvas.setFilter("hue-rotate", Math.PI / 2);
      canvas.setFilter("drop-shadow", [4, 6, 3, new RGBColor([0, 0, 160]), 0.8]);
      const blur = 4 / (Math.sqrt(2 * Math.log(255)) - 1);
      const shadowBlur = 3 / (Math.sqrt(2 * Math.log(255)) - 1);
      expect(canvas._canvasContext.filter).toBe(
        "blur(" +
          String(blur) +
          "px) sepia(100%) hue-rotate(90deg) drop-shadow(4px 6px " +
          String(shadowBlur) +
          "px rgba(0,0,160,0.8)) ",
      );
      canvas.setFilter("blur", null);
      canvas.setFilter("sepia", null);
      canvas.setFilter("hue-rotate", null);
      canvas.setFilter("drop-shadow", null);
      expect(canvas._canvasContext.filter).toBe("none");
      expect(() => canvas.setFilter("blur", "4px")).toThrow(ReferenceError);
    } finally {
      delete (globalThis as unknown as { window?: unknown }).window;
    }
  });
});

describe("hitTest", () => {
  it("reports the nearest pixel with the old location arithmetic", () => {
    const canvas = plain();
    canvas.setOffset(new Point(0, 0));
    canvas.prepare();
    canvas.fillRect(20, 20, 20, 10, "#0ac81e");
    canvas.finish();
    const inside = canvas.hitTest(new Point(25, 25), 0);
    expect(inside && Array.from(inside.data.pixel)).toEqual([10, 200, 30, 255]);
    expect(inside && [inside.data.location.getX(), inside.data.location.getY()]).toEqual([25, 25]);
    const near = canvas.hitTest(new Point(18, 24), 3);
    // x drops the tolerance, y comes from a fractional row (old behaviour).
    expect(near && [near.data.location.getX(), near.data.location.getY()]).toEqual([
      23, 23.714285714285715,
    ]);
    expect(near && near.element).toBe(canvas);
    expect(canvas.hitTest(new Point(5, 5), 2)).toBeNull();
  });
});

describe("createPatternPaint", () => {
  const stops = [
    { position: 0, color: new RGBColor([255, 0, 0]), opacity: 1 },
    { position: 1.5, color: new RGBColor([0, 0, 255]), opacity: 0.5 },
  ];

  it("builds a linear gradient in unit space with the rect transform", () => {
    const canvas = plain();
    const log = since(canvas);
    const box = new Rect(8, 8, 48, 48);
    const result = canvas.createPatternPaint(new LinearGradient(stops, 1, 0), box);
    expect(log()).toEqual([
      "createLinearGradient(0,0.5,1,0.5)",
      'addColorStop(0,"#FF0000")',
      'addColorStop(1,"rgba(0,0,255,0.5)")',
    ]);
    expect(result?.transform?.toString()).toBe(
      Transform.getNativeRectTransformation(box).toString(),
    );
  });

  it("builds a radial gradient from focus to center", () => {
    const canvas = plain();
    const log = since(canvas);
    canvas.createPatternPaint(
      new RadialGradient(stops, 0.7, 0.3, 0.2, 0.5, 0.6),
      null,
      new Transform(2, 0, 0, 2, 0, 0),
    );
    expect(log()[0]).toBe("createRadialGradient(0.3,0.2,0,0.5,0.6,0.7)");
  });

  it("passes colors through and rejects unknown patterns", () => {
    const canvas = plain();
    const color = new RGBColor([1, 2, 3]);
    expect(canvas.createPatternPaint(color)).toEqual({ paint: color, transform: null });
    expect(() => canvas.createPatternPaint({ toString: () => "x" } as never)).toThrow(
      "Unknown pattern.",
    );
  });
});

describe("clone", () => {
  it("copies size, state and pixels outside a render phase", () => {
    const original = plain(32, 16);
    original.prepare();
    original.fillRect(0, 0, 8, 8, "#ff0000");
    original.finish();
    const copy = original.clone();
    expect([copy.getWidth(), copy.getHeight()]).toEqual([32, 16]);
    const log = logOf(copy);
    expect(log).toContain('globalCompositeOperation="copy"');
    expect(log.some((entry) => entry.startsWith("drawImage(canvas#"))).toBe(true);
    // shadowOffsetX is never copied (the old code misspelt it).
    expect(log.some((entry) => entry.startsWith("shadowOffsetX="))).toBe(false);
  });
});

describe("recorded canvases", () => {
  it("are made on request and during a render phase", () => {
    const forced = new PaintCanvas(true);
    expect(forced.getRendererContext()).toBeInstanceOf(RecorderStateContext);
    expect(new PaintCanvas().getRendererContext()).toBeNull();
    RenderScheduler.begin();
    try {
      expect(new PaintCanvas().getRendererContext()).toBeInstanceOf(RecorderStateContext);
    } finally {
      RenderScheduler.finish();
    }
  });

  it("never change imageSmoothingQuality through setImageSmoothingQuality", () => {
    const canvas = new PaintCanvas(true);
    const log = logOf(canvas);
    const before = log.length;
    canvas.setImageSmoothingQuality(PaintCanvas.SmoothingQuality.Low);
    canvas.setRenderAlgorithm(PaintCanvas.RenderAlgorithm.Pixelated);
    expect(log.slice(before)).toEqual([]);
    expect(canvas._canvasContext.imageSmoothingQuality).toBe("high");
  });
});
