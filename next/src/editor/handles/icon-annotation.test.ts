// The icon handles (rotate, preserve aspect ratio, skew): icon painting
// against the old app (__fixtures__/old-annotation-paint.json, recorded
// from chunk.vendor.js module 383), the icon bounds, the status listener
// and the setIcon load race.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Color } from "../../engine/color/color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { type FakeCanvas, installFakeCanvas } from "../../engine/paint/testing/fake-canvas.ts";
import { Image, ImageStatusEvent } from "../../engine/scene/image.ts";
import { IconAnnotation, type IconAnnotationOptions } from "./icon-annotation.ts";

interface Recorded {
  icon: {
    case: { angle: number | null; dynamic: boolean; color: string | null; trf: number[] | null };
    log: unknown[][];
  }[];
}

const here = dirname(fileURLToPath(import.meta.url));
const recorded = JSON.parse(
  readFileSync(resolve(here, "__fixtures__/old-annotation-paint.json"), "utf8"),
) as Recorded;

class TestIconAnnotation extends IconAnnotation {
  options: IconAnnotationOptions = {
    type: "circle",
    size: 20,
    outlineWidth: 2,
    shadowColor: "transparent",
    outsideStroke: true,
    iconSize: 16,
  };

  getAnnotationOptions(): IconAnnotationOptions {
    return this.options;
  }
}

let uninstall: () => void;
beforeEach(() => {
  uninstall = installFakeCanvas();
});
afterEach(() => {
  uninstall();
  vi.restoreAllMocks();
});

/**
 * A paint context whose canvas logs the calls the icon paint makes, in the
 * form the old-app recording uses.
 */
function recordingContext(iconCanvas: object): { context: PaintContext; log: unknown[][] } {
  const log: unknown[][] = [];
  const tinted = {
    fillCanvas: (fill: Color, opacity: number) =>
      log.push(["tinted.fillCanvas", fill.toScreenCSS(), opacity]),
    drawImage: (image: unknown, ...rest: unknown[]) =>
      log.push(["tinted.drawImage", name(image), ...rest]),
    destroy: () => log.push(["tinted.destroy"]),
  };
  const name = (image: unknown): string =>
    image === iconCanvas
      ? "icon"
      : image === tinted
        ? "tinted"
        : "handle" + String((image as FakeCanvas).width);
  const canvas = {
    getTransform: (flag: boolean) => {
      log.push(["getTransform", flag]);
      return new Transform(1, 0, 0, 1, 3, 4);
    },
    setTransform: (transform: Transform) => log.push(["setTransform", transform.getMatrix()]),
    drawImage: (image: unknown, ...rest: unknown[]) =>
      log.push(["drawImage", name(image), ...rest]),
    createCanvas: (bbox: Rect) => {
      log.push(["createCanvas", bbox.getX(), bbox.getY(), bbox.getWidth(), bbox.getHeight()]);
      return tinted;
    },
  };
  const context = {
    canvas,
    selectionOutlineColor: new RGBColor([255, 0, 0]),
  } as unknown as PaintContext;
  return { context, log };
}

/** A stand-in for the loaded icon image with a 16 x 12 geometry box. */
function fakeIcon(imageCanvas: object | null): Image {
  return {
    getImageCanvas: () => imageCanvas,
    getGeometryBBox: () => new Rect(0, 0, 16, 12),
  } as unknown as Image;
}

describe("IconAnnotation.paintAnnotation", () => {
  it.each(recorded.icon.map((entry) => [JSON.stringify(entry.case), entry]))(
    "paints the handle and the icon for %s like the old app",
    (_label, entry) => {
      const annotation = new TestIconAnnotation();
      annotation.options.iconDynamicColor = entry.case.dynamic;
      const iconCanvas = { name: "icon canvas" };
      annotation._icon = fakeIcon(iconCanvas);
      annotation._iconVisible = true;
      const { context, log } = recordingContext(iconCanvas);
      const matrix = entry.case.trf;
      annotation.paintAnnotation(
        context,
        matrix
          ? new Transform(...(matrix as [number, number, number, number, number, number]))
          : null,
        new Point(100.7, 50.2),
        entry.case.angle,
        entry.case.color === "blue" ? new RGBColor([40, 128, 230]) : null,
      );
      expect(log).toEqual(entry.log);
    },
  );

  it("paints only the handle while the icon is hidden, missing or has no canvas", () => {
    const annotation = new TestIconAnnotation();
    const { context, log } = recordingContext({});
    annotation._icon = fakeIcon({});
    annotation.paintAnnotation(context, null, new Point(100.7, 50.2));
    annotation._iconVisible = true;
    annotation._icon = null;
    annotation.paintAnnotation(context, null, new Point(100.7, 50.2));
    // An icon that failed to load keeps no canvas but stays "visible".
    annotation._icon = fakeIcon(null);
    expect(annotation.isIconVisible()).toBe(true);
    annotation.paintAnnotation(context, null, new Point(100.7, 50.2));
    expect(log).toEqual([
      ["drawImage", "handle30", 85, 35, true],
      ["drawImage", "handle30", 85, 35, true],
      ["drawImage", "handle30", 85, 35, true],
    ]);
  });
});

/** A stand-in icon that records setBounds and listener removal. */
function boundsIcon(): { icon: Image; calls: unknown[][] } {
  const calls: unknown[][] = [];
  const icon = {
    setBounds: (...args: unknown[]) => calls.push(["setBounds", ...args]),
    removeEventListener: (...args: unknown[]) => calls.push(["removeEventListener", ...args]),
  } as unknown as Image;
  return { icon, calls };
}

describe("IconAnnotation icon bounds and status", () => {
  it("sizes the icon from a number or a {width, height} iconSize", () => {
    const annotation = new TestIconAnnotation();
    annotation._updateBounds();
    const { icon, calls } = boundsIcon();
    annotation._icon = icon;
    annotation._updateBounds();
    annotation.options.iconSize = { width: 20, height: 10 };
    annotation._updateBounds();
    expect(calls).toEqual([
      ["setBounds", 0, 0, 16, 16],
      ["setBounds", 0, 0, 20, 10],
    ]);
  });

  it("updates the bounds when the icon is shown, not when hidden", () => {
    const annotation = new TestIconAnnotation();
    const { icon, calls } = boundsIcon();
    annotation._icon = icon;
    annotation.setIconVisible(true);
    annotation.setIconVisible(true);
    annotation.setIconVisible(false);
    expect(calls).toEqual([["setBounds", 0, 0, 16, 16]]);
  });

  it("stops listening once the icon loaded (with bounds) or failed (without)", () => {
    const annotation = new TestIconAnnotation();
    const { icon, calls } = boundsIcon();
    annotation._icon = icon;
    const status = (value: number) => annotation._statusEvent(new ImageStatusEvent(icon, value));
    status(Image.ImageStatus.Resolving);
    status(Image.ImageStatus.Loading);
    expect(calls).toEqual([]);
    status(Image.ImageStatus.Loaded);
    expect(calls).toEqual([
      ["setBounds", 0, 0, 16, 16],
      ["removeEventListener", Image.StatusEvent, annotation._statusEvent, annotation],
    ]);
    calls.length = 0;
    status(Image.ImageStatus.Error);
    expect(calls).toEqual([
      ["removeEventListener", Image.StatusEvent, annotation._statusEvent, annotation],
    ]);
  });
});

/** XMLHttpRequest and FileReader stand-ins whose loads finish when a test says so. */
function installFakeLoaders(): { finish(url: string): void; uninstall(): void } {
  const requests: { url: string; finish(): void }[] = [];
  class FakeRequest {
    status = 0;
    response: unknown = null;
    responseType = "";
    private url = "";
    private listeners: (() => void)[] = [];
    addEventListener(type: string, listener: () => void): void {
      if (type === "load") this.listeners.push(listener);
    }
    open(_method: string, url: string): void {
      this.url = url;
    }
    send(): void {
      requests.push({
        url: this.url,
        finish: () => {
          this.status = 200;
          this.response = new Uint8Array([1, 2, 3]);
          for (const listener of this.listeners) listener();
        },
      });
    }
  }
  class FakeReader {
    onload: ((event: { target: { result: string } }) => void) | null = null;
    readAsDataURL(): void {
      // Synchronous, so a request's finish() runs the whole load.
      this.onload?.({ target: { result: "data:image/png;base64,AQID" } });
    }
  }
  const globals = globalThis as unknown as Record<string, unknown>;
  const saved = [globals.XMLHttpRequest, globals.FileReader];
  globals.XMLHttpRequest = FakeRequest;
  globals.FileReader = FakeReader;
  // The data URL would start a real image decode; the race is about which
  // Image the annotation holds, so the decode is skipped.
  vi.spyOn(Image.prototype, "forceImageUpdate").mockImplementation(() => {});
  return {
    finish(url) {
      const index = requests.findIndex((request) => request.url === url);
      const [request] = requests.splice(index, 1);
      request?.finish();
    },
    uninstall() {
      globals.XMLHttpRequest = saved[0];
      globals.FileReader = saved[1];
    },
  };
}

describe("IconAnnotation.setIcon", () => {
  // See "Icon handle setIcon load race" in QUESTIONS.md.
  let loaders: ReturnType<typeof installFakeLoaders>;
  beforeEach(() => {
    loaders = installFakeLoaders();
  });
  afterEach(() => loaders.uninstall());

  it("loads the URL into a new Image listening for its status", () => {
    const annotation = new TestIconAnnotation();
    annotation.setIcon("a.png");
    expect(annotation.getIcon()).toBeNull();
    loaders.finish("a.png");
    const icon = annotation.getIcon() as Image;
    expect(icon).toBeInstanceOf(Image);
    expect(icon.getProperty("url")).toBe("data:image/png;base64,AQID");
    expect(icon.hasEventListeners(Image.StatusEvent)).toBe(true);
    icon.trigger(new ImageStatusEvent(icon, Image.ImageStatus.Loaded));
    expect(icon.hasEventListeners(Image.StatusEvent)).toBe(false);
    annotation.setIcon(null);
    expect(annotation.getIcon()).toBeNull();
  });

  it("keeps the load that finishes last, and the other image's status unhooks the wrong one", () => {
    const annotation = new TestIconAnnotation();
    annotation.setIcon("first.png");
    annotation.setIcon("second.png");
    loaders.finish("second.png");
    const second = annotation.getIcon() as Image;
    loaders.finish("first.png");
    const first = annotation.getIcon() as Image;
    // The older request wins because it finished later.
    expect(first).not.toBe(second);
    second.trigger(new ImageStatusEvent(second, Image.ImageStatus.Loaded));
    // The second image's event removed the first image's listener.
    expect(second.hasEventListeners(Image.StatusEvent)).toBe(true);
    expect(first.hasEventListeners(Image.StatusEvent)).toBe(false);
  });

  it("overwrites a setIcon(null) made during a load, and a later status then throws", () => {
    const annotation = new TestIconAnnotation();
    annotation.setIcon("a.png");
    annotation.setIcon(null);
    loaders.finish("a.png");
    expect(annotation.getIcon()).toBeInstanceOf(Image);

    annotation.setIcon("b.png");
    loaders.finish("b.png");
    const icon = annotation.getIcon() as Image;
    annotation.setIcon(null);
    expect(() => icon.trigger(new ImageStatusEvent(icon, Image.ImageStatus.Loaded))).toThrow(
      TypeError,
    );
  });
});
