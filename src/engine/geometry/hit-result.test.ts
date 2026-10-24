import { describe, expect, it } from "vitest";
import { HitResult } from "./hit-result.ts";

describe("HitResult", () => {
  it("starts with every field null and no own properties", () => {
    const r = new HitResult();
    expect([r.segment, r.x, r.y, r.slope, r.outline]).toEqual([null, null, null, null, null]);
    expect(Object.keys(r)).toEqual([]);
  });

  it("gets own properties only for the fields a hit test sets", () => {
    const r = new HitResult();
    r.segment = 2;
    r.x = 1.5;
    expect(Object.keys(r)).toEqual(["segment", "x"]);
  });
});
