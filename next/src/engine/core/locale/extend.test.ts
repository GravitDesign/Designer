import { describe, expect, it } from "vitest";
import { arrayChunk, bcp47ToISO6391, extend } from "./extend.ts";

describe("extend", () => {
  it("copies own properties into the target, later sources winning", () => {
    const target = { a: 1 };
    const result = extend(target, { b: 2 }, null, { a: 3 });
    expect(result).toBe(target);
    expect(result).toEqual({ a: 3, b: 2 });
  });

  it("makes a new object for a null target", () => {
    expect(extend(null, { a: 1 })).toEqual({ a: 1 });
  });

  it("copies object values one level deep with the deep flag", () => {
    const inner = { x: { y: 1 } };
    const shallow = extend({}, { inner });
    expect(shallow.inner).toBe(inner);
    const deep = extend(true, {}, { inner, none: null });
    expect(deep.inner).not.toBe(inner);
    expect(deep.inner).toEqual(inner);
    // Only one level: the nested object is shared.
    expect((deep.inner as typeof inner).x).toBe(inner.x);
    expect(deep.none).toEqual({});
  });
});

describe("bcp47ToISO6391", () => {
  it("keeps pt-BR, zh-CN and zh-TW and shortens everything else", () => {
    expect(bcp47ToISO6391("pt-BR")).toBe("pt-BR");
    expect(bcp47ToISO6391("zh-TW")).toBe("zh-TW");
    expect(bcp47ToISO6391("DE-de")).toBe("de");
    expect(bcp47ToISO6391("en-US")).toBe("en");
  });
});

describe("arrayChunk", () => {
  it("splits into chunks with a shorter last one", () => {
    expect(arrayChunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(arrayChunk([], 3)).toEqual([]);
  });
});
