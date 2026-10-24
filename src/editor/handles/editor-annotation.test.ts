// Handle images of GEditorAnnotation against the old app: the canvas log
// of every handle image (and of the outsideStroke mask), where it is
// blitted, and the cache. Expected values: __fixtures__/old-annotation-paint.json,
// recorded from chunk.vendor.js module 81.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Color } from "../../engine/color/color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import {
  type FakeCanvas,
  type FakeContext2D,
  installFakeCanvas,
} from "../../engine/paint/testing/fake-canvas.ts";
import { EditorAnnotation } from "./editor-annotation.ts";

type ColorName = "white" | "blue" | null;
type CaseArgs = [
  string,
  number,
  ColorName,
  ColorName,
  number | null,
  string | null,
  boolean,
  boolean,
];

interface Recorded {
  editorAnnotation: {
    args: CaseArgs;
    draws: [number, number, number, number, boolean][];
    logs: string[][];
    createdOnSecondCall: number;
  }[];
}

const here = dirname(fileURLToPath(import.meta.url));
const recorded = JSON.parse(
  readFileSync(resolve(here, "__fixtures__/old-annotation-paint.json"), "utf8"),
) as Recorded;

const blue = new RGBColor([40, 128, 230]);
const color = (name: ColorName): Color | null =>
  name === "white" ? RGBColor.WHITE : name === "blue" ? blue : null;

/** Canvases made through document.createElement since the last reset. */
let created: FakeCanvas[] = [];
let uninstall: () => void;
beforeEach(() => {
  uninstall = installFakeCanvas();
  const fakeDocument = (
    globalThis as unknown as { document: { createElement(tag: string): unknown } }
  ).document;
  const createElement = fakeDocument.createElement.bind(fakeDocument);
  fakeDocument.createElement = (tag: string) => {
    const element = createElement(tag) as FakeCanvas;
    created.push(element);
    return element;
  };
  created = [];
});
afterEach(() => uninstall());

const logOfCanvas = (canvas: FakeCanvas): string[] =>
  (canvas.getContext("2d") as FakeContext2D).log.map((entry) =>
    entry.replace(/canvas#\d+/g, "canvas"),
  );

/** A paint context whose canvas records the blits. */
function blitRecorder(): { context: PaintContext; draws: unknown[][] } {
  const draws: unknown[][] = [];
  const context = {
    canvas: {
      drawImage: (image: FakeCanvas, x: number, y: number, flag: boolean) =>
        draws.push([image.width, image.height, x, y, flag]),
    },
  } as unknown as PaintContext;
  return { context, draws };
}

describe("EditorAnnotation.paintAnnotation", () => {
  // The handle cache is module-wide, and each recorded case has its own
  // key, so every case below draws a new image on its first call.
  it.each(recorded.editorAnnotation.map((entry) => [entry.args.slice(0, 7).join(" "), entry]))(
    "paints %s like the old app",
    (_label, entry) => {
      const [type, size, outline, fill, outlineWidth, shadow, outsideStroke, inverted] = entry.args;
      const { context, draws } = blitRecorder();
      EditorAnnotation.paintAnnotation(
        context,
        new Transform(1, 0, 0, 1, 3.6, -2.2),
        new Point(100.4, 50.9),
        type,
        inverted,
        size,
        color(outline),
        color(fill),
        outlineWidth,
        shadow,
        outsideStroke,
      );
      expect(created.map(logOfCanvas)).toEqual(entry.logs);
      created = [];
      // The same look again comes from the cache.
      EditorAnnotation.paintAnnotation(
        context,
        null,
        new Point(10, 10),
        type,
        inverted,
        size,
        color(outline),
        color(fill),
        outlineWidth,
        shadow,
        outsideStroke,
      );
      expect(created).toHaveLength(entry.createdOnSecondCall);
      expect(draws).toEqual(entry.draws);
    },
  );

  it("grows a white-outlined circle by 2 pixels, not a rect or an outsideStroke circle", () => {
    const width = (type: string, outsideStroke: boolean, size: number) => {
      const { context, draws } = blitRecorder();
      EditorAnnotation.paintAnnotation(
        context,
        null,
        new Point(0, 0),
        type,
        false,
        size,
        RGBColor.WHITE,
        blue,
        null,
        null,
        outsideStroke,
      );
      return (draws[0] as number[])[0];
    };
    // Sizes not used by the recorded cases, so these images are new.
    expect(width("rect", false, 16)).toBe(16 + 2 + 8);
    expect(width("circle", false, 16)).toBe(16 + 2 + 8 + 2);
    expect(width("circle", true, 16)).toBe(16 + 2 + 8);
  });

  it("hands out the cached canvas for an identical second call", () => {
    const images: unknown[] = [];
    const context = {
      canvas: { drawImage: (image: unknown) => images.push(image) },
    } as unknown as PaintContext;
    const paint = () =>
      EditorAnnotation.paintAnnotation(
        context,
        null,
        new Point(0, 0),
        "circle",
        false,
        17,
        RGBColor.WHITE,
        blue,
        null,
        null,
        false,
      );
    paint();
    paint();
    expect(created).toHaveLength(1);
    expect(images[0]).toBe(created[0]);
    expect(images[1]).toBe(created[0]);
  });
});
