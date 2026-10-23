import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Platform } from "../../engine/core/platform.ts";
import { Rect } from "../../engine/math/rect.ts";
import type { Bitmap } from "../../engine/paint/bitmap.ts";
import { BitmapExport, type BitmapExportNode } from "./bitmap-export.ts";
import recorded from "./bitmap-export.old-outputs.json" with { type: "json" };

/** undefined is recorded as "<undef>" in the fixture's inputs. */
const input = <T>(value: T | "<undef>"): T | undefined => (value === "<undef>" ? undefined : value);

interface FakeNode extends BitmapExportNode {
  calls: unknown[][];
}

function fakeNode(x: number, y: number, w: number, h: number, kids: FakeNode[] = []): FakeNode {
  const node: FakeNode = {
    calls: [],
    _getBitmapPaintArea: () => new Rect(x, y, w, h),
    getSelfCanvasUsedArea: () => new Rect(x, y, w, h),
    accept(visitor) {
      visitor(node);
      for (const kid of kids) kid.accept(visitor);
      return true;
    },
    toBitmap(...args: unknown[]) {
      node.calls.push(args);
      return "bitmap" as unknown as Bitmap;
    },
  };
  return node;
}

// The old platform values of Chromium, which the recording used.
let saved: [number, number];
beforeEach(() => {
  saved = [Platform.absoluteMaxImgLinearDimension, Platform.absoluteMaxImgAreaDots];
  Platform.absoluteMaxImgLinearDimension = 32767;
  Platform.absoluteMaxImgAreaDots = 268435455;
});
afterEach(() => {
  [Platform.absoluteMaxImgLinearDimension, Platform.absoluteMaxImgAreaDots] = saved;
});

describe("BitmapExport.convertSizeToScale", () => {
  it("matches the old parser for every recorded spec, size and dpi", () => {
    const mismatches: unknown[] = [];
    for (const row of recorded.sizes) {
      const [w, h, spec, dpi, withOut, x, y, out] = row as [
        number,
        number,
        string | null,
        number | "<undef>",
        boolean,
        number,
        number,
        number | null,
      ];
      const dpiOut = withOut ? [0] : undefined;
      const scale = BitmapExport.convertSizeToScale(
        w,
        h,
        input(spec as string | "<undef>"),
        input(dpi),
        dpiOut,
      );
      const got = [scale.getX(), scale.getY(), dpiOut ? dpiOut[0] : null];
      if (JSON.stringify(got) !== JSON.stringify([x, y, out])) mismatches.push({ row, got });
    }
    expect(mismatches).toEqual([]);
    expect(recorded.sizes.length).toBeGreaterThan(600);
  });

  it("parses the dialog's size menu", () => {
    const scale = (spec: string, dpiOut?: number[]) => {
      const p = BitmapExport.convertSizeToScale(320, 200, spec, 72, dpiOut);
      return [p.getX(), p.getY()];
    };
    expect(scale("2x")).toEqual([2, 2]);
    expect(scale("512w")).toEqual([1.6, 1.6]);
    expect(scale("100h")).toEqual([0.5, 0.5]);
    expect(scale("160x400")).toEqual([0.5, 2]);
    expect(scale("144dpi")).toEqual([2, 2]);
    const out = [0];
    expect(scale("144dpi", out)).toEqual([1, 1]);
    expect(out[0]).toBe(144);
    expect(scale("1.50x")).toEqual([1, 1]);
  });
});

describe("BitmapExport areas", () => {
  it("matches the old paint and self areas", () => {
    for (const a of recorded.areas) {
      const [x, y, w, h] = a.rect as [number, number, number, number];
      const node = fakeNode(x, y, w, h);
      const dpi = input(a.dpi as number | "<undef>");
      const paint = BitmapExport.getBitmapPaintArea(node, a.spec, dpi);
      const self = BitmapExport.getNodeSelfBitmapUsedArea(node, a.spec, dpi);
      expect([paint.getX(), paint.getY(), paint.getWidth(), paint.getHeight()]).toEqual(a.paint);
      expect([self.getX(), self.getY(), self.getWidth(), self.getHeight()]).toEqual(a.self);
    }
  });

  it("takes the largest canvas width and height of the subtree", () => {
    const node = fakeNode(0, 0, 10, 10, [
      fakeNode(0, 0, 500, 3),
      fakeNode(5, 5, 4, 900, [fakeNode(0, 0, 700, 1)]),
    ]);
    const r = BitmapExport.getMaxCanvasUsedArea(node);
    expect([r.getX(), r.getY(), r.getWidth(), r.getHeight()]).toEqual(recorded.maxUsed);
  });

  it("reports the platform's canvas limits", () => {
    expect(BitmapExport.getMaximumCanvasSize()).toEqual(recorded.maximum);
  });
});

describe("BitmapExport.export", () => {
  it("calls toBitmap like the old exporter, shrinking by 0.9 steps to fit", () => {
    for (const c of recorded.exportCalls) {
      const node = fakeNode(0, 0, c.w, c.h, [fakeNode(0, 0, c.w * 1.5, c.h / 2)]);
      const result = BitmapExport.export(
        node,
        c.spec,
        "BG" as never,
        c.cfg as Record<string, unknown> | null,
        input(c.dpi as number | "<undef>"),
        input(c.bgo as number | "<undef>"),
        c.clamp,
        undefined,
      );
      expect(result).toBe(c.result);
      expect(JSON.parse(JSON.stringify(node.calls))).toEqual(c.calls);
    }
  });

  it("can't be instantiated", () => {
    expect(() => new BitmapExport()).toThrow("This class cannot be instantiated");
  });
});
