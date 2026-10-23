import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RGBColor } from "../../color/rgb-color.ts";
import { Point } from "../../math/point.ts";
import { Canvas2DPaintCanvas, PaintCanvas } from "../../paint/paint-canvas.ts";
import { installFakeCanvas, logOf } from "../../paint/testing/fake-canvas.ts";
import { BlurEffect } from "./blur-effect.ts";
import { DropShadowEffect } from "./drop-shadow-effect.ts";
import { InnerShadowEffect } from "./inner-shadow-effect.ts";
import { LongShadowEffect } from "./long-shadow-effect.ts";
import { OverlayEffect } from "./overlay-effect.ts";
import { Rect } from "../../math/rect.ts";
import { Effects } from "../effects.ts";
import "../stylable.ts";
import { ColorGradingEffect } from "./color-grading-effect.ts";
import { ContactShadowEffect } from "./contact-shadow-effect.ts";
import { MirrorEffect } from "./mirror-effect.ts";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
  // PaintCanvas decides once whether CSS filters exist: here they do.
  (globalThis as unknown as { window: unknown }).window = {};
  Canvas2DPaintCanvas.hasFilters();
  delete (globalThis as unknown as { window?: unknown }).window;
});
afterAll(() => uninstall());

function plain(width = 40, height = 30): Canvas2DPaintCanvas {
  const canvas = new PaintCanvas(false, true);
  canvas.resize(width, height);
  canvas.prepare();
  canvas.setOffset(new Point(0, 0));
  return canvas;
}

function canvasId(canvas: Canvas2DPaintCanvas): string {
  return String((canvas._canvasContext.canvas as unknown as { id: number }).id);
}

/**
 * The drawing calls from now on, each with the composite operator and
 * alpha in effect, and the filter changes.
 */
function drawing(canvas: Canvas2DPaintCanvas): () => string[] {
  const start = logOf(canvas).length;
  return () => {
    const out: string[] = [];
    let operator = '"source-over"';
    let alpha = "1";
    for (const entry of logOf(canvas).slice(start)) {
      if (entry.startsWith("globalCompositeOperation=")) operator = entry.slice(25);
      else if (entry.startsWith("globalAlpha=")) alpha = entry.slice(12);
      else if (entry.startsWith("filter=")) out.push(entry);
      else if (/^(drawImage|fillRect)\(/.test(entry))
        out.push(entry + " " + operator + " " + alpha);
      else if (/^(getImageData|putImageData)\(/.test(entry)) out.push(entry);
    }
    return out;
  };
}

function withoutFilters(fn: () => void): void {
  Canvas2DPaintCanvas.disableFilters();
  try {
    fn();
  } finally {
    Canvas2DPaintCanvas.enableFilters();
  }
}

const BLUR_DIVISOR = Math.sqrt(2 * Math.log(255)) - 1;

describe("BlurEffect.render", () => {
  it("uses the CSS blur filter, scaled, and returns the canvas", () => {
    const canvas = plain();
    const blur = new BlurEffect();
    const log = drawing(canvas);
    expect(blur.render(canvas, null, null, 2)).toBe(canvas);
    expect(log()).toEqual([
      'filter="blur(' + String(10 / BLUR_DIVISOR) + 'px) "',
      "drawImage(canvas#" + canvasId(canvas) + ',0,0) "copy" 1',
      'filter="none"',
    ]);
  });

  it("falls back to StackBlur without filters, or when clipped (without WebGL)", () => {
    for (const clip of [false, true]) {
      const canvas = plain();
      const blur = new BlurEffect();
      blur.setProperty("b", clip);
      const log = drawing(canvas);
      if (clip) blur.render(canvas, null, null, 1);
      else withoutFilters(() => blur.render(canvas, null, null, 1));
      expect(log()).toEqual(["getImageData(0,0,40,30)", 'putImageData("40x30",0,0)']);
    }
  });

  it("does nothing with radius 0", () => {
    const canvas = plain();
    const blur = new BlurEffect();
    blur.setProperty("r", 0);
    const log = drawing(canvas);
    blur.render(canvas, null, null, 1);
    expect(log()).toEqual([]);
  });
});

describe("DropShadowEffect.render", () => {
  it("draws a color shadow with the CSS drop-shadow filter, scaled", () => {
    const source = plain();
    const target = plain();
    const shadow = new DropShadowEffect();
    shadow.setProperties(["x", "y", "r"], [3, -2, 4]);
    const log = drawing(target);
    shadow.render(source, target, null, 2);
    expect(log()).toEqual([
      'filter="drop-shadow(6px -4px ' + String(8 / BLUR_DIVISOR) + 'px rgba(0,0,0,0.65)) "',
      "drawImage(canvas#" + canvasId(source) + ',0,0) "copy" 1',
      'filter="none"',
    ]);
  });

  it("without filters fills, cuts to the offset content, blurs and cuts the content out", () => {
    const source = plain();
    const target = plain();
    const shadow = new DropShadowEffect();
    shadow.setProperties(["x", "y", "pat", "opc"], [3, -2, new RGBColor([255, 0, 0]), 0.4]);
    const log = drawing(target);
    withoutFilters(() => shadow.render(source, target, null, 2));
    const id = canvasId(source);
    expect(log()).toEqual([
      'fillRect(0,0,40,30) "source-over" 0.4',
      "drawImage(canvas#" + id + ',6,-4) "destination-in" 1',
      "getImageData(0,0,40,30)",
      'putImageData("40x30",0,0)',
      "drawImage(canvas#" + id + ',0,0) "destination-out" 1',
    ]);
    expect(shadow._blur?.$r).toBe(5);
  });

  it("draws nothing without opacity", () => {
    const source = plain();
    const target = plain();
    const shadow = new DropShadowEffect();
    shadow.setProperty("opc", 0);
    const log = drawing(target);
    shadow.render(source, target, null, 1);
    expect(log()).toEqual([]);
  });
});

describe("InnerShadowEffect.render", () => {
  it("cuts the offset content out of the fill, blurs without filters and keeps the inside", () => {
    const source = plain();
    const target = plain();
    const inner = new InnerShadowEffect();
    inner.setProperties(["x", "y"], [2, 1]);
    const log = drawing(target);
    inner.render(source, target, null, 1);
    const id = canvasId(source);
    expect(log()).toEqual([
      'fillRect(0,0,40,30) "source-over" 0.5',
      "drawImage(canvas#" + id + ',2,1) "destination-out" 1',
      "getImageData(0,0,40,30)",
      'putImageData("40x30",0,0)',
      "drawImage(canvas#" + id + ',0,0) "destination-in" 1',
    ]);
    expect(Canvas2DPaintCanvas.hasFilters()).toBe(true);
  });
});

describe("OverlayEffect.render", () => {
  it("paints the pattern over the content, or as its alpha with alm", () => {
    for (const [alm, operator] of [
      [false, "source-atop"],
      [true, "destination-in"],
    ] as const) {
      const canvas = plain();
      const overlay = new OverlayEffect();
      overlay.setProperties(["pat", "opc", "alm"], [new RGBColor([0, 255, 0]), 0.5, alm]);
      const log = drawing(canvas);
      overlay.render(canvas);
      expect(log()).toEqual(["fillRect(0,0,40,30) " + JSON.stringify(operator) + " 0.5"]);
    }
  });
});

describe("LongShadowEffect.render", () => {
  it("stamps the content along the angle with fading opacity, then colors the stamps", () => {
    const source = plain();
    const target = plain();
    const clones: Canvas2DPaintCanvas[] = [];
    const clone = target.clone.bind(target);
    target.clone = (copy, options) => {
      const made = clone(copy, options);
      clones.push(made);
      return made;
    };
    const shadow = new LongShadowEffect();
    // 3 long at angle 0 (to the right), 2 stamps per pixel.
    shadow.setProperties(["l", "a", "den"], [3, 0, 2]);
    const log = drawing(target);
    shadow.render(source, target, null, 1);
    expect(clones).toHaveLength(1);
    const id = canvasId(source);
    const stampLog = logOf(clones[0] as Canvas2DPaintCanvas);
    // At 1, 1.5, 2 and 2.5; drawCanvas puts them on whole pixels.
    expect(stampLog.filter((entry) => entry.startsWith("drawImage("))).toEqual([
      "drawImage(canvas#" + id + ",1,0)",
      "drawImage(canvas#" + id + ",1,0)",
      "drawImage(canvas#" + id + ",2,0)",
      "drawImage(canvas#" + id + ",2,0)",
    ]);
    // The first alpha write comes from cloning.
    expect(stampLog.filter((entry) => entry.startsWith("globalAlpha=")).slice(1)).toEqual([
      "globalAlpha=" + String(1 - 1 / 3),
      "globalAlpha=" + String(1 - 1.5 / 3),
      "globalAlpha=" + String(1 - 2 / 3),
      "globalAlpha=" + String(1 - 2.5 / 3),
    ]);
    expect(log()).toEqual([
      'fillRect(0,0,40,30) "source-over" 0.2',
      "drawImage(canvas#" + canvasId(clones[0] as Canvas2DPaintCanvas) + ',0,0) "destination-in" 1',
    ]);
  });
});

describe("MirrorEffect.render", () => {
  it("draws the content flipped below itself and fades it with the gradient", () => {
    const effects = new Effects();
    const mirror = new MirrorEffect();
    effects.appendChild(mirror);
    // A 20 high box: the reflection is 0.3 * 20 + 1 = 7 below it.
    mirror.getEffectPadding(new Rect(0, 0, 40, 20));
    const source = plain();
    const target = plain();
    const start = logOf(target).length;
    mirror.render(source, target, null, 1);
    expect(logOf(target).slice(start)).toEqual([
      // Flipped around y = 20 + 1, drawn 21 up.
      "setTransform(1,0,0,-1,0,21)",
      "globalAlpha=1",
      "drawImage(canvas#" + canvasId(source) + ",0,-21)",
      "setTransform(1,0,0,1,0,0)",
      "globalAlpha=1",
      "createLinearGradient(0.5,0,0.5000000000000001,1)",
      'addColorStop(0,"#FFFFFF")',
      'addColorStop(1,"rgba(255,255,255,0)")',
      // The 6 pixels of the reflection below the 1 pixel gap.
      "setTransform(40,0,0,6,0,21)",
      "globalAlpha=0.6",
      "fillStyle=[object Object]",
      'globalCompositeOperation="destination-in"',
      "fillRect(0,0,1,1)",
      "setTransform(1,0,0,1,0,0)",
    ]);
  });
});

describe("ContactShadowEffect.render", () => {
  it("draws the content squashed below the box, colors it with a radial fade and blurs it", () => {
    const effects = new Effects();
    const contact = new ContactShadowEffect();
    effects.appendChild(contact);
    contact.getEffectPadding(new Rect(0, 0, 40, 20));
    const source = plain();
    const target = plain();
    const root = plain();
    const start = logOf(target).length;
    contact.render(source, target, root, 1);
    const squash = Math.cos(((90 - 5) * Math.PI) / 180);
    const log = logOf(target).slice(start);
    expect(log.slice(0, 15)).toEqual([
      // 20 high box, 5 below it.
      "setTransform(1,0,0," + String(squash) + ",0,25)",
      "globalAlpha=0.75",
      "imageSmoothingEnabled=false",
      "drawImage(canvas#" + canvasId(source) + ",0,0)",
      "imageSmoothingEnabled=true",
      "setTransform(1,0,0,1,0,0)",
      "createRadialGradient(0.5,0.5,0,0.5,0.5,0.5)",
      'addColorStop(0,"#000000")',
      'addColorStop(1,"rgba(255,255,255,0)")',
      "setTransform(40,0,0," + String(20 * squash) + ",0,25)",
      "globalAlpha=1",
      "fillStyle=[object Object]",
      'globalCompositeOperation="source-in"',
      "fillRect(0,0,1,1)",
      "setTransform(1,0,0,1,0,0)",
    ]);
    expect(log.slice(15).some((entry) => entry.startsWith('filter="blur('))).toBe(true);
  });

  it("draws nothing before it knows the box", () => {
    const contact = new ContactShadowEffect();
    const target = plain();
    const start = logOf(target).length;
    contact.render(plain(), target, plain(), 1);
    expect(logOf(target).slice(start)).toEqual([]);
  });
});

describe("ColorGradingEffect.render", () => {
  it("runs the curves over the canvas pixels", () => {
    const canvas = plain(2, 2);
    const grading = new ColorGradingEffect();
    const log = drawing(canvas);
    grading.render(canvas);
    expect(log()).toEqual([]);
    grading.setProperty("cp", {
      rgb: [
        [0, 255],
        [255, 0],
      ],
      r: [
        [0, 0],
        [255, 255],
      ],
      g: [
        [0, 0],
        [255, 255],
      ],
      b: [
        [0, 0],
        [255, 255],
      ],
    });
    grading.render(canvas);
    expect(log()).toEqual(["getImageData(0,0,2,2)", 'putImageData("2x2",0,0)']);
  });
});
