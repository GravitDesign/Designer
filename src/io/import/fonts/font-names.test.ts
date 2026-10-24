import { afterEach, describe, expect, it } from "vitest";
import { Transform } from "../../../engine/math/transform.ts";
import { FontNameHelpers, TransformHelpers, WordHelpers } from "./font-style-names.ts";
import { contains, getList, setList, updateList } from "./google-font-names.ts";

const original = getList();

afterEach(() => {
  setList(original);
});

describe("Google font names", () => {
  it("finds families ignoring case and answers with the list's spelling", () => {
    expect(contains("open sans")).toBe("Open Sans");
    expect(contains("ABEEZEE")).toBe("ABeeZee");
    expect(contains("Helvetica")).toBeNull();
  });

  it("replaces the list with a copy", () => {
    const families = ["Parity Sans"];
    updateList(families);
    families.push("Other");
    expect(contains("parity sans")).toBe("Parity Sans");
    expect(contains("Other")).toBeNull();
    expect(contains("Open Sans")).toBeNull();
    updateList(null);
    expect(getList()).toEqual([]);
  });
});

describe("font name helpers", () => {
  it("reads the weight from the first weight name in the font name", () => {
    expect(FontNameHelpers.getWeight("OpenSans-ExtraBold")).toBe(800);
    expect(FontNameHelpers.getWeight("Foo SemiBold Italic")).toBe(600);
    // ExtraLight is tried before Light.
    expect(FontNameHelpers.getWeight("Foo-ExtraLight")).toBe(200);
    expect(FontNameHelpers.getWeight("Helvetica-Bold")).toBe(700);
    expect(FontNameHelpers.getWeight("Times-Roman")).toBe(400);
    // "Bolder" contains "Bold", which matches first.
    expect(FontNameHelpers.getWeight("Bolder")).toBe(700);
  });

  it("reads italic styles", () => {
    expect(FontNameHelpers.getStyle("Arial-BoldItalic")).toBe("I");
    expect(FontNameHelpers.getStyle("Courier-Oblique")).toBe("N");
  });

  it("compares transforms without their translation", () => {
    const a = new Transform(2, 0, 0, 2, 10, 20);
    expect(TransformHelpers.sameTransformation(a, new Transform(2, 0, 0, 2, 0, 0))).toBe(true);
    expect(TransformHelpers.sameTransformation(a, new Transform(2, 0, 0, 3, 10, 20))).toBe(false);
  });

  it("compares word formatting with extra and ignored keys", () => {
    const a = {
      fontWeight: 400,
      fontStyle: "normal",
      fontColor: 1,
      fontFamily: "A",
      fontSize: 12,
      x: 1,
    };
    const b = { ...a, x: 2 };
    expect(WordHelpers.sameFormatting(a, b)).toBe(true);
    expect(WordHelpers.sameFormatting(a, b, ["x"])).toBe(false);
    expect(WordHelpers.sameFormatting(a, { ...a, fontSize: 13 }, null, ["fontSize"])).toBe(true);
  });
});
