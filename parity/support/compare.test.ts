import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { comparePng, diffJson } from "./compare.ts";

function solidPng(width: number, height: number, rgba: [number, number, number, number]): PNG {
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = rgba[0];
    png.data[i + 1] = rgba[1];
    png.data[i + 2] = rgba[2];
    png.data[i + 3] = rgba[3];
  }
  return png;
}

describe("diffJson", () => {
  it("finds no difference in equal values", () => {
    expect(diffJson({ a: [1, 2, { b: "x" }] }, { a: [1, 2, { b: "x" }] })).toEqual([]);
  });

  it("reports the smallest number difference", () => {
    expect(diffJson({ a: 0.1 + 0.2 }, { a: 0.3 })).toEqual([
      { path: "$.a", expected: 0.30000000000000004, actual: 0.3 },
    ]);
  });

  it("tells 0 from -0", () => {
    expect(diffJson([0], [-0])).toHaveLength(1);
  });

  it("reports missing and extra keys", () => {
    const d = diffJson({ a: 1, b: 2 }, { a: 1, c: 3 });
    expect(d.map((x) => x.path).sort()).toEqual(["$.b", "$.c"]);
  });

  it("reports a different key order", () => {
    expect(diffJson({ a: 1, b: 2 }, { b: 2, a: 1 })).toEqual([
      { path: "${key order}", expected: ["a", "b"], actual: ["b", "a"] },
    ]);
  });

  it("reports array length and type changes", () => {
    expect(diffJson([1, 2], [1])).toEqual([{ path: "$.length", expected: 2, actual: 1 }]);
    expect(diffJson({ a: [1] }, { a: { 0: 1 } })).toEqual([
      { path: "$.a", expected: "array(1)", actual: "object" },
    ]);
  });
});

describe("comparePng", () => {
  it("finds no difference in identical images", () => {
    const a = PNG.sync.write(solidPng(4, 3, [10, 20, 30, 255]));
    const b = PNG.sync.write(solidPng(4, 3, [10, 20, 30, 255]));
    expect(comparePng(a, b).differentPixels).toBe(0);
  });

  it("counts a one-unit change in one channel of one pixel", () => {
    const a = solidPng(4, 3, [10, 20, 30, 255]);
    const b = solidPng(4, 3, [10, 20, 30, 255]);
    b.data[4 * 5 + 2] = 31;
    const result = comparePng(PNG.sync.write(a), PNG.sync.write(b));
    expect(result.differentPixels).toBe(1);
    expect(result.diffPng).toBeDefined();
  });

  it("counts an alpha-only change", () => {
    const a = solidPng(2, 2, [0, 0, 0, 255]);
    const b = solidPng(2, 2, [0, 0, 0, 255]);
    b.data[3] = 254;
    expect(comparePng(PNG.sync.write(a), PNG.sync.write(b)).differentPixels).toBe(1);
  });

  it("fails on a size difference", () => {
    const result = comparePng(
      PNG.sync.write(solidPng(2, 2, [0, 0, 0, 255])),
      PNG.sync.write(solidPng(3, 2, [0, 0, 0, 255])),
    );
    expect(result.sizeMatches).toBe(false);
    expect(result.differentPixels).toBeGreaterThan(0);
  });
});
