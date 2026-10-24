import { describe, expect, it } from "vitest";
import { getTypeId } from "../core/object.ts";
import { Length } from "./length.ts";

describe("Length", () => {
  it("converts through points at 72 dpi", () => {
    const inch = new Length(1, Length.Unit.IN);
    expect(inch.toPoint()).toBe(72);
    expect(inch.toUnit(Length.Unit.MM)).toBe(25.4);
    expect(new Length(1, "pt").toUnit("mm")).toBe(0.35277777777777775);
    expect(new Length(1, "pt").convert("cc").getValue()).toBe(0.07819248888947729);
    expect(new Length(5).getUnit()).toBe("px");
    expect(new Length(3, "xx").toPoint()).toBeNaN();
  });

  it("keeps the old toString suffix bug", () => {
    expect(new Length(5, "mm").toString()).toBe("5undefined");
    expect(new Length(1.23456, "pt").toString(1)).toBe("1.2undefined");
  });

  it("parses lengths with units, decimal commas and fallbacks", () => {
    const parse = (s: string | null, unit?: string) => {
      const l = Length.parseLength(s, unit);
      return l ? [l.getValue(), l.getUnit()] : l;
    };
    expect(parse("10 pt")).toEqual([10, "pt"]);
    expect(parse(" 12.5 MM ")).toEqual([12.5, "mm"]);
    expect(parse("12,5mm")).toEqual([12.5, "mm"]);
    expect(parse("1m")).toEqual([1, "m"]);
    expect(parse("1km")).toEqual([1, "px"]);
    expect(parse("10", "mm")).toEqual([10, "mm"]);
    expect(parse("+4px")).toEqual([4, "px"]);
    expect(parse("abc")).toEqual([NaN, "px"]);
    expect(parse("   ")).toBeNull();
    expect(parse(null)).toBeNull();
  });

  it("evaluates equations in the target unit", () => {
    const value = (s: string, unit?: string) => Length.parseEquation(s, unit)?.getValue() ?? null;
    expect(value("1 + 2 * 3")).toBe(7);
    expect(value("(1 + 2) * 3")).toBe(9);
    expect(value("--5")).toBe(5);
    expect(value("1in + 1mm", "mm")).toBe(26.4);
    expect(value("10 / 0")).toBe(Infinity);
    expect(value("sqrt(16) + abs(-3)")).toBe(7);
    expect(value("x = 5")).toBe(5);
    expect(value("pi")).toBe(Math.PI);
  });

  it("returns null for anything that doesn't evaluate", () => {
    for (const bad of ["", "1 +", "(1", "1 2", "unknown", "foo(1)", "ln(2)", "100%", "1e"]) {
      expect(Length.parseEquation(bad)).toBeNull();
    }
    expect(Length.parseEquationValue("2cm * 2")).toBe(113.38582677165354);
    expect(Length.parseEquation("2cm * 2", "mm")?.getValue()).toBe(39.99999999999999);
  });

  it("keeps the old type id", () => {
    expect(getTypeId(new Length(1))).toBe(25);
  });
});
