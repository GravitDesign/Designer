// Expected values worked out from the old GGridGuide.paint (chunk.vendor.js
// module 740, lines 101028-101300), which the port follows line by line.
import { describe, expect, it } from "vitest";
import type { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { GridGuide } from "./grid-guide.ts";

type Call = [string, ...unknown[]];

/** A canvas that records the calls the grid makes. Copies record into the same log. */
class RecordingCanvas {
  calls: Call[];
  name: string;
  copies = 0;
  vertices: Point[] = [];

  constructor(name: string, calls: Call[] = []) {
    this.name = name;
    this.calls = calls;
  }

  createCanvas(area: Rect): RecordingCanvas {
    const copy = new RecordingCanvas(`copy${this.copies++}`, this.calls);
    this.calls.push(["createCanvas", area.getX(), area.getY(), area.getWidth(), area.getHeight()]);
    return copy;
  }

  drawCanvas(source: RecordingCanvas, x: number, y: number): void {
    this.calls.push(["drawCanvas", `${source.name}->${this.name}`, x, y]);
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(["clearRect", x, y, width, height]);
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(["fillRect", x, y, width, height]);
  }

  putVertices(vertices: Point[]): void {
    this.vertices = vertices;
  }

  strokeVertices(): void {
    const [from, to] = this.vertices as [Point, Point];
    this.calls.push(["stroke", from.getX(), from.getY(), to.getX(), to.getY()]);
  }
}

function gridGuide(properties: Record<string, unknown>): GridGuide {
  const scene = { getProperty: (name: string) => properties[name] } as unknown as Scene;
  return new GridGuide({ _scene: scene, isMultiPageEnabled: () => false });
}

function paint(
  guide: GridGuide,
  transform: Transform,
  dirty: Rect[],
  gridVisible = true,
): RecordingCanvas {
  const canvas = new RecordingCanvas("main");
  guide.paint(transform, {
    canvas,
    configuration: { multiPageView: false, gridVisible },
    dirtyMatcher: { getDirtyRectangles: () => dirty },
  } as unknown as PaintContext);
  return canvas;
}

const calls = (canvas: RecordingCanvas, name: string): Call[] =>
  canvas.calls.filter((call) => call[0] === name);

describe("GridGuide paint", () => {
  it("paints nothing without a grid mode or with the grid hidden", () => {
    const identity = new Transform();
    const area = [new Rect(0, 0, 50, 50)];
    expect(paint(gridGuide({ gm: null, gx: 10, gy: 10 }), identity, area).calls).toEqual([]);
    expect(paint(gridGuide({ gm: "box", gx: 10, gy: 10 }), identity, area, false).calls).toEqual(
      [],
    );
  });

  it("multiplies cells smaller than MIN_CELL_SPACE view pixels", () => {
    const guide = gridGuide({});
    // 25 px cells at zoom 1 stay, 3 px become 3 * (1 + 3) = 12.
    expect(guide._limitGridSize(25, 1)).toBe(25);
    expect(guide._limitGridSize(3, 1)).toBe(12);
    // 9.6 rounds to 10, which is not below the minimum.
    expect(guide._limitGridSize(9.6, 1)).toBe(9.6);
    // Zoom 0.1 has a scale factor of 0.10000000000000002, so 5 px cells
    // are 0.5000000000000001 px and the multiplier is 1 + floor(19.99...) = 20.
    const scale = new Transform(0.1, 0, 0, 0.1, 0, 0).getScaleFactor();
    expect(guide._limitGridSize(5, scale)).toBe(10.000000000000002);
  });

  it("paints zoomed-out boxed cells at the multiplied spacing", () => {
    const canvas = paint(
      gridGuide({ gm: "box", gx: 5, gy: 5, gaw: 20, gah: 10 }),
      new Transform(0.1, 0, 0, 0.1, 0, 0),
      [new Rect(0, 0, 1000, 500)],
    );
    // One dirty area: nothing is copied or cleared.
    expect(calls(canvas, "createCanvas")).toEqual([]);
    expect(calls(canvas, "clearRect")).toEqual([]);
    expect(canvas.calls).toEqual([
      ...[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((x) => ["fillRect", x, 0, 1, 50]),
      ...[0, 10, 20, 30, 40].map((y) => ["fillRect", 0, y, 100, 1]),
    ]);
  });

  it("restores a copy before painting each further boxed dirty area", () => {
    const canvas = paint(
      gridGuide({ gm: "box", gx: 10, gy: 10, gaw: 20, gah: 10 }),
      new Transform(),
      [new Rect(0, 0, 30, 30), new Rect(52, 47, 20, 20)],
    );
    expect(canvas.calls).toEqual([
      // The second area is copied from the grid origin (50, 50) on.
      ["createCanvas", 50, 50, 22, 17],
      ["drawCanvas", "main->copy0", 0, 0],
      // The first area is painted directly.
      ["fillRect", 0, 0, 1, 30],
      ["fillRect", 10, 0, 1, 30],
      ["fillRect", 20, 0, 1, 30],
      ["fillRect", 0, 0, 30, 1],
      ["fillRect", 0, 10, 30, 1],
      ["fillRect", 0, 20, 30, 1],
      // The second is cleared, gets its copy back, then its grid.
      ["clearRect", 50, 50, 22, 17],
      ["drawCanvas", "copy0->main", 0, 0],
      ["fillRect", 50, 47, 1, 20],
      ["fillRect", 60, 47, 1, 20],
      ["fillRect", 70, 47, 1, 20],
      ["fillRect", 52, 50, 20, 1],
      ["fillRect", 52, 60, 20, 1],
    ]);
  });

  it("merges axonometric dirty areas and paints rows when the first angle is flat", () => {
    const canvas = paint(
      gridGuide({ gm: "axo", gx: 10, gy: 10, gaw: 20, gah: 10, ga1: 0, ga2: -Math.PI / 4 }),
      new Transform(),
      [new Rect(0, 0, 20, 10), new Rect(20, 10, 20, 10)],
    );
    const strokes = calls(canvas, "stroke");
    expect(canvas.calls.slice(0, canvas.calls.length - strokes.length)).toEqual([
      // One copy of the united area (0, 0, 40, 20), cleared and restored.
      ["createCanvas", 0, 0, 40, 20],
      ["drawCanvas", "main->copy0", 0, 0],
      ["clearRect", 0, 0, 40, 20],
      ["drawCanvas", "copy0->main", 0, 0],
      ["fillRect", 0, 0, 1, 20],
      ["fillRect", 20, 0, 1, 20],
      // Rows, because tan(-ga1) is 0.
      ["fillRect", 0, 0, 40, 1],
      ["fillRect", 0, 10, 40, 1],
    ]);
    // The second angle (slope 1) walks up from the bottom edge.
    const expected = [
      [0, 20, 0, 20],
      [0, 10, 10, 20],
      [0, 0, 20, 20],
      [10, 0, 30, 20],
      [20, 0, 40, 20],
      [30, 0, 40, 10],
    ];
    expect(strokes.length).toBe(expected.length);
    strokes.forEach((call, i) => {
      (expected[i] as number[]).forEach((value, k) => {
        expect(call[k + 1] as number).toBeCloseTo(value, 9);
      });
    });
  });

  it("paints both slanted line sets and no rows when neither angle is flat", () => {
    const canvas = paint(
      gridGuide({
        gm: "axo",
        gx: 10,
        gy: 10,
        gaw: 20,
        gah: 10,
        ga1: Math.PI / 4,
        ga2: -Math.PI / 4,
      }),
      new Transform(),
      [new Rect(0, 0, 40, 20)],
    );
    // Only the two columns are filled.
    expect(calls(canvas, "fillRect")).toEqual([
      ["fillRect", 0, 0, 1, 20],
      ["fillRect", 20, 0, 1, 20],
    ]);
    // First angle (slope -1) walks down from the top, then the second.
    const expected = [
      [0, 0, 0, 0],
      [0, 10, 10, 0],
      [0, 20, 20, 0],
      [10, 20, 30, 0],
      [20, 20, 40, 0],
      [30, 20, 40, 10],
      [0, 20, 0, 20],
      [0, 10, 10, 20],
      [0, 0, 20, 20],
      [10, 0, 30, 20],
      [20, 0, 40, 20],
      [30, 0, 40, 10],
    ];
    const strokes = calls(canvas, "stroke");
    expect(strokes.length).toBe(expected.length);
    strokes.forEach((call, i) => {
      (expected[i] as number[]).forEach((value, k) => {
        expect(call[k + 1] as number).toBeCloseTo(value, 9);
      });
    });
  });
});
