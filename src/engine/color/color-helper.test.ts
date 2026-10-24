import { describe, expect, it } from "vitest";
import { CMYKColor } from "./cmyk-color.ts";
import { Color } from "./color.ts";
import { ColorHelper } from "./color-helper.ts";
import { HSVColor } from "./hsv-color.ts";
import { RGBColor } from "./rgb-color.ts";

const M = Color.ColorModes;

describe("ColorHelper.convertColor", () => {
  it("converts RGB and HSV colors to CMYK", () => {
    const cmyk = ColorHelper.convertColor(new RGBColor([255, 0, 0]), M.CMYK);
    expect(cmyk).toBeInstanceOf(CMYKColor);
    expect((cmyk as CMYKColor).getValue()).toEqual([0, 1, 1, 0]);
    const fromHsv = ColorHelper.convertColor(new HSVColor([120, 1, 1]), M.CMYK);
    expect((fromHsv as CMYKColor).getValue()).toEqual([1, 0, 1, 0]);
  });

  it("converts to HSV, also an HSV color again", () => {
    const hsv = new HSVColor([90, 0.5, 0.5]);
    const again = ColorHelper.convertColor(hsv, M.HSB);
    expect(again).not.toBe(hsv);
    expect((again as HSVColor).getValue()).toEqual([90, 0.5, 0.5019607843137255]);
    const fromCmyk = ColorHelper.convertColor(new CMYKColor([0, 0, 0, 0]), M.HSB);
    expect((fromCmyk as HSVColor).getValue()).toEqual([0, 0, 1]);
  });

  it("converts CMYK and HSV to RGB for any other mode", () => {
    const rgb = ColorHelper.convertColor(new CMYKColor([0, 0, 0, 1]), M.RGB);
    expect(rgb).toBeInstanceOf(RGBColor);
    expect(rgb).not.toBeInstanceOf(HSVColor);
    expect((rgb as RGBColor).getValue()).toEqual([0, 0, 0]);
    const plain = new RGBColor([1, 2, 3]);
    expect(ColorHelper.convertColor(plain, M.RGB)).toBe(plain);
    const cmyk = new CMYKColor();
    expect(ColorHelper.convertColor(cmyk, M.CMYK)).toBe(cmyk);
    expect(ColorHelper.convertColor("not a color", M.CMYK)).toBe("not a color");
  });
});
