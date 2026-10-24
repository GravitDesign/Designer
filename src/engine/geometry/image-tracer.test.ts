import { describe, expect, it, vi } from "vitest";
import { getTypeId } from "../core/object.ts";
import { ImageTracer, type PaletteColor, type TracerImageData } from "./image-tracer.ts";

/** 10x10 black image with a red 4x6 rectangle at (3, 2). */
function redRectangle(): TracerImageData {
  const width = 10;
  const height = 10;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = x >= 3 && x < 7 && y >= 2 && y < 8 ? 255 : 0;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

const blackAndRed = (): PaletteColor[] => [
  { r: 0, g: 0, b: 0, a: 255 },
  { r: 255, g: 0, b: 0, a: 255 },
];

describe("ImageTracer", () => {
  it("draws from a seeded generator, the same for every new tracer", () => {
    const tracer = new ImageTracer();
    const values = [tracer.rand(), tracer.rand(), tracer.rand()];
    expect(values).toEqual([0.45231413352303207, 0.7940094328951091, 0.377391537418589]);
    expect(new ImageTracer().rand()).toBe(values[0]);
  });

  it("fills in missing options on the given object and keeps given ones", () => {
    const options = { numberofcolors: 4, pathomit: 0 };
    const checked = new ImageTracer().checkoptions(options);
    expect(checked).toBe(options);
    expect(checked.numberofcolors).toBe(4);
    expect(checked.pathomit).toBe(0);
    expect(checked.ltres).toBe(1);
    expect(checked.blurdelta).toBe(20);
    expect(new ImageTracer().checkoptions(null).colorsampling).toBe(true);
  });

  it("generates a gray ramp below 8 colors and an RGB cube above", () => {
    const tracer = new ImageTracer();
    expect(tracer.generatepalette(4).map((c) => c.r)).toEqual([0, 85, 170, 255]);
    const cube = tracer.generatepalette(9);
    expect(cube).toHaveLength(9);
    expect(cube.slice(0, 8).map((c) => [c.r, c.g, c.b])).toEqual([
      [0, 0, 0],
      [0, 0, 255],
      [0, 255, 0],
      [0, 255, 255],
      [255, 0, 0],
      [255, 0, 255],
      [255, 255, 0],
      [255, 255, 255],
    ]);
  });

  it("traces each color layer into line segments", () => {
    const trace = new ImageTracer().imagedataToTracedata(redRectangle(), { pal: blackAndRed() });
    expect(trace.width).toBe(10);
    expect(trace.height).toBe(10);
    expect(trace.layers).toEqual([
      [
        [
          { type: "L", x1: 0.5, y1: 0, x2: 10, y2: 0.5 },
          { type: "L", x1: 10, y1: 0.5, x2: 9.5, y2: 10 },
          { type: "L", x1: 9.5, y1: 10, x2: 0, y2: 9.5 },
          { type: "L", x1: 0, y1: 9.5, x2: 0.5, y2: 0 },
        ],
      ],
      [
        [
          { type: "L", x1: 3.5, y1: 2, x2: 7, y2: 2.5 },
          { type: "L", x1: 7, y1: 2.5, x2: 6.5, y2: 8 },
          { type: "L", x1: 6.5, y1: 8, x2: 3, y2: 7.5 },
          { type: "L", x1: 3, y1: 7.5, x2: 3.5, y2: 2 },
        ],
      ],
    ]);
  });

  it("drops paths with fewer points than pathomit", () => {
    // The rectangle's boundary has 20 points, the outer one 40.
    const trace = new ImageTracer().imagedataToTracedata(redRectangle(), {
      pal: blackAndRed(),
      pathomit: 40,
    });
    expect(trace.layers[0]).toHaveLength(1);
    expect(trace.layers[1]).toEqual([]);
  });

  it("fits a quadratic spline where a line is too far off", () => {
    const tracer = new ImageTracer();
    const path = [
      { x: 0, y: 0, linesegment: 0 },
      { x: 1, y: 1, linesegment: 0 },
      { x: 2, y: 1, linesegment: 0 },
      { x: 3, y: 0, linesegment: 0 },
      { x: 4, y: -5, linesegment: 0 },
    ];
    expect(tracer.fitseq(path, 0.1, 10, 0, 3)).toEqual([
      { type: "Q", x1: 0, y1: 0, x2: 1.5, y2: 2.25, x3: 3, y3: 0 },
    ]);
    expect(tracer.fitseq(path, 10, 10, 0, 3)).toEqual([{ type: "L", x1: 0, y1: 0, x2: 3, y2: 0 }]);
  });

  it("refines a given palette in place and returns that same array", () => {
    const pal: PaletteColor[] = [
      { r: 20, g: 10, b: 5, a: 250 },
      { r: 230, g: 30, b: 10, a: 240 },
    ];
    const trace = new ImageTracer().imagedataToTracedata(redRectangle(), { pal });
    expect(trace.palette).toBe(pal);
    // The quantization cycles move each color to the mean of its pixels.
    expect(pal).toEqual(blackAndRed());
  });

  it("reads the whole canvas in getImgdata", () => {
    const pixels = { width: 3, height: 2 };
    const getImageData = vi.fn(() => pixels);
    const canvas = { width: 3, height: 2, getContext: vi.fn(() => ({ getImageData })) };
    const result = new ImageTracer().getImgdata(canvas as unknown as HTMLCanvasElement);
    expect(result).toBe(pixels);
    expect(canvas.getContext).toHaveBeenCalledWith("2d");
    expect(getImageData).toHaveBeenCalledWith(0, 0, 3, 2);
  });

  it("keeps the old type id", () => {
    expect(getTypeId(ImageTracer)).toBe(225);
  });
});
