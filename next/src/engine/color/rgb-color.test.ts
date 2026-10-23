import { describe, expect, it } from "vitest";
import { Pattern } from "../style/pattern.ts";
import { CMYKColor } from "./cmyk-color.ts";
import { HSVColor } from "./hsv-color.ts";
import { RGBColor } from "./rgb-color.ts";
import oldValues from "./test-data/old-color-values.json" with { type: "json" };

describe("RGBColor.parseCSSColor", () => {
  it("parses like the old engine", () => {
    const pairs = oldValues.css as [string, number[] | null][];
    expect(pairs.length).toBeGreaterThan(20);
    expect(pairs.map(([css]) => RGBColor.parseCSSColor(css))).toEqual(pairs.map(([, v]) => v));
  });

  it("keeps the old quirks", () => {
    // rgb() and hsl() without alpha report 100.
    expect(RGBColor.parseCSSColor("rgb(1,2,3)")).toEqual([1, 2, 3, 100]);
    // The yellowgreen entry has no alpha.
    expect(RGBColor.parseCSSColor("yellowgreen")).toEqual([154, 205, 50]);
    // Bare hex digits are accepted.
    expect(RGBColor.parseCSSColor("0f0")).toEqual([0, 255, 0, 1]);
    // Object.prototype names hit the table lookup and throw.
    expect(() => RGBColor.parseCSSColor("constructor")).toThrow(TypeError);
  });

  it("returns copies of the table entries", () => {
    const red = RGBColor.parseCSSColor("red") as number[];
    red[0] = 0;
    expect(RGBColor.parseCSSColor("red")).toEqual([255, 0, 0, 1]);
  });

  it("builds colors from CSS", () => {
    expect(RGBColor.fromCSSColor("hsla(240,100%,25%,0.2)")?.getValue()).toEqual([0, 0, 128]);
    expect(RGBColor.fromCSSColor("notacolor")).toBeNull();
    // parseInt stops at the first non-hex digit: "#bogus" reads as 0xb.
    expect(RGBColor.fromCSSColor("bogus")?.getValue()).toEqual([0, 0, 11]);
  });
});

describe("RGBColor", () => {
  it("rounds and clamps its channels", () => {
    expect(new RGBColor([300, -20, 12.7]).getValue()).toEqual([255, 0, 13]);
    expect(new RGBColor().getValue()).toEqual([0, 0, 0]);
    expect(RGBColor.WHITE.getValue()).toEqual([255, 255, 255]);
    expect(RGBColor.RED.getValue()).toEqual([255, 0, 0]);
  });

  it("finds the closest CSS name like the old engine", () => {
    const pairs = oldValues.closest as [number[], string][];
    expect(pairs.map(([v]) => new RGBColor(v).getClosestCSSName())).toEqual(
      pairs.map(([, name]) => name),
    );
  });

  it("compares by class family and value", () => {
    expect(RGBColor.equals(new RGBColor([1, 2, 3]), new RGBColor([1, 2, 3]))).toBe(true);
    expect(RGBColor.equals(new RGBColor([1, 2, 3]), new RGBColor([1, 2, 4]))).toBe(false);
    // HSV colors are RGB colors for equals.
    expect(RGBColor.equals(new HSVColor([1, 2, 3]), new RGBColor([1, 2, 3]))).toBe(true);
    expect(RGBColor.equals(new CMYKColor([1, 2, 3]), new RGBColor([1, 2, 3]))).toBe(false);
    expect(RGBColor.equals(null, null)).toBe(false);
  });

  it("mixes, blends and measures values", () => {
    expect(RGBColor.mix([0, 0, 0, 1], [255, 255, 255, 0.5])).toEqual([128, 128, 128, 1]);
    expect(RGBColor.mix([10, 20, 30, 0.5], [200, 100, 0, 0.5])).toEqual([137, 73, 10, 0.75]);
    expect(RGBColor.mix(undefined, [1, 2, 3, 1])).toEqual([1, 2, 3, 1]);
    expect(RGBColor.mix([1, 2, 3, 1], undefined)).toEqual([1, 2, 3, 1]);
    expect(RGBColor.blend([0, 0, 0], [100, 200, 50], 0.25)).toEqual([25, 50, 12.5]);
    expect(RGBColor.closeEnough([0, 0, 0], [3, 4, 0], 5)).toBe(true);
    expect(RGBColor.closeEnough([0, 0, 0], [3, 4, 0.1], 5)).toBe(false);
  });

  it("serializes through the pattern registry as C", () => {
    const color = new RGBColor([7, 8, 9]);
    expect(Pattern.serialize(color)).toBe("C#[7,8,9]");
    const back = Pattern.deserialize("C#[7,8,9]");
    expect(back).toBeInstanceOf(RGBColor);
    expect((back as RGBColor).getValue()).toEqual([7, 8, 9]);
    expect(color.toHumanString()).toBe("rgb 7,8,9");
    expect(color.toScreenCSS()).toBe("#070809");
    expect(color.toScreenCSS(0.5)).toBe("rgba(7,8,9,0.5)");
    expect(color.asCSSBackground(0.25)).toBe("linear-gradient(rgba(7,8,9,0.25), rgba(7,8,9,0.25))");
    expect(color.getAverageColor()).toEqual([7, 8, 9, 1]);
    expect(color.clone()).not.toBe(color);
    expect(color.clone().getValue()).toEqual([7, 8, 9]);
    expect(String(color)).toBe("[Object GRGBColor]");
  });
});

describe("CMYKColor and HSVColor", () => {
  it("keeps CMYK values unclamped with a [1,1,1,1] default", () => {
    expect(new CMYKColor().getValue()).toEqual([1, 1, 1, 1]);
    const color = new CMYKColor([0.1, 0.2, 0.3, 0.4]);
    expect(color.toHumanString()).toBe("cmyk 10%,20%,30%,40%");
    expect(Pattern.serialize(color)).toBe("Y#[0.1,0.2,0.3,0.4]");
    expect(color.toScreen()).toEqual([138, 122, 107]);
    expect(CMYKColor.equals(color, color.clone())).toBe(true);
    expect(CMYKColor.equals(color, new CMYKColor())).toBe(false);
    expect(String(color)).toBe("[Object GCMYKColor]");
  });

  it("stores HSV values as given and shows them as RGB", () => {
    const color = new HSVColor([200, 0.5, 0.25]);
    expect(color.getValue()).toEqual([200, 0.5, 0.25]);
    expect(new HSVColor().getValue()).toEqual([0, 0, 0]);
    expect(color.toScreen()).toEqual([32, 53, 64]);
    expect(color.toHumanString()).toBe("hsv 200,0.5,0.25");
    expect(Pattern.serialize(color)).toBe("H#[200,0.5,0.25]");
    expect(color).toBeInstanceOf(RGBColor);
    expect(color.clone()).toBeInstanceOf(HSVColor);
    expect(String(color)).toBe("[Object GHSVColor]");
  });
});
