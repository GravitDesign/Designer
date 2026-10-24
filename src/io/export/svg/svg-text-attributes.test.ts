import { describe, expect, it } from "vitest";
import { Transform } from "../../../engine/math/transform.ts";
import { SvgTextWord, type FontReference, type WordInit } from "./svg-text-attributes.ts";

const font: FontReference = {
  fontFamily: "Open Sans",
  fontWeight: 400,
  fontSize: 12,
  fontStyle: "normal",
};

function word(extra: Partial<WordInit> = {}): SvgTextWord {
  return new SvgTextWord({
    text: "a",
    mode: 0,
    origin: new Transform(),
    fontReference: font,
    ...extra,
  });
}

describe("SvgTextWord (old chunk.vendor.js 257550, GUtil.extend(this, init))", () => {
  it("keeps undefined init values instead of the prototype defaults", () => {
    const w = word({ lineWidth: undefined, charSpacing: undefined, textLigatures: undefined });
    expect(Object.prototype.hasOwnProperty.call(w, "lineWidth")).toBe(true);
    expect(w.lineWidth).toBeUndefined();
    expect(w.charSpacing).toBeUndefined();
    expect(w.textLigatures).toBeUndefined();
    // Fields not passed at all read the prototype defaults.
    expect(w.wordSpacing).toBe(0);
    expect(w.textFractions).toBe(false);
  });

  it("does not merge a word with an undefined line width into one with the default", () => {
    const a = word();
    const b = word({ lineWidth: undefined });
    expect(a.merge(b)).toBe(false);
    expect(a.text).toBe("a");
    const c = word({ lineWidth: undefined });
    expect(b.merge(c)).toBe(true);
    expect(b.text).toBe("aa");
  });
});
