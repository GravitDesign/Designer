import { describe, expect, it } from "vitest";
import { InputBoxValue, resolveInputBoxOptions, type InputBoxOptions } from "./input-box.ts";

/** A scene with a unit and a fixed number of decimals. */
function scene(unit: string | null, decimals = 2) {
  return () => ({
    getProperty: (name: string) => (name === "ut" ? unit : null),
    getOptimalDecimalsCount: () => decimals,
  });
}

function box(
  options: InputBoxOptions = {},
  unit: string | null = "px",
  decimals = 2,
): InputBoxValue {
  return new InputBoxValue(resolveInputBoxOptions(options), scene(unit, decimals));
}

describe("InputBox value (UI-FIELD-159)", () => {
  it("evaluates nothing on read but falls back to 0 for text that isn't a number", () => {
    const b = box();
    expect(b.read("12")).toBe("12");
    expect(b.read("abc")).toBe("0");
    expect(b.read("")).toBe("0");
    expect(box({ allowEmptyValue: true }).read("")).toBe("");
  });

  it("strips the postfix unless it is the scene's unit", () => {
    expect(box({ postfix: "%" }).read("50%")).toBe("50");
    expect(box({ postfix: "%" }).display("50")).toBe("50%");
    expect(box({ postfix: "px" }, "px").display("50")).toBe("50");
    expect(box({ postfix: "mm" }, "px").display("50")).toBe("50mm");
  });

  it("clamps to minValue and maxValue, and replaces non-numbers by the minimum", () => {
    const b = box({ minValue: 0, maxValue: 100 });
    expect(b.display("150")).toBe("100");
    expect(b.display("-5")).toBe("0");
    expect(b.display("abc")).toBe("0");
    expect(box({ maxValue: 100 }).display("abc")).toBe("100");
  });

  it("writes a comma as a decimal point and 0 for empty values", () => {
    expect(box().display("1,5")).toBe("1.5");
    expect(box().display("")).toBe("0");
    expect(box().display(0)).toBe("0");
    expect(box({ allowEmptyValue: true }).display("")).toBe("");
  });

  it("shows the replacement text for the replaced value", () => {
    expect(box({ replace: { oldValue: "0", newValue: "Auto" } }).display("0")).toBe("Auto");
  });
});

describe("InputBox steps (UI-FIELD-159)", () => {
  it("steps by 1, 10 with shift and 0.1 with alt", () => {
    const b = box();
    expect(b.increment("5", false, false, false)).toBe("6");
    expect(b.increment("5", false, false, true)).toBe("4");
    expect(b.increment("5", true, false, false)).toBe("15");
    expect(b.increment("5", false, true, false)).toBe("5.1");
  });

  it("doesn't take the slow step in a percent box", () => {
    expect(box({ postfix: "%" }).increment("5%", false, true, false)).toBe("6");
  });

  it("steps a tenth in inch and centimetre scenes for unit boxes", () => {
    expect(box({ postfix: "in" }, "in").increment("1", false, false, false)).toBe("1.1");
    expect(box({}, "cm").increment("1", false, false, false)).toBe("1.1");
    // A box with another postfix steps normally.
    expect(box({ postfix: "%" }, "cm").increment("1", false, false, false)).toBe("2");
  });

  it("ignores fixedIncrement, as the old plugin did", () => {
    expect(box({ fixedIncrement: true }, "cm").increment("1", false, false, false)).toBe("1.1");
  });

  it("takes whole steps when the scene shows no decimals", () => {
    expect(box({}, "px", 0).increment("5", false, true, false)).toBe("6");
  });

  it("gives nothing for a box without a number", () => {
    expect(box({ allowEmptyValue: true }).increment("", false, false, false)).toBeNull();
  });
});

describe("InputBox scrubbing (UI-FIELD-173)", () => {
  it("moves by the pixels dragged, scaled by the modifiers", () => {
    const b = box();
    expect(b.scrub(10, false, false, 3)).toEqual({ value: 13, text: "13" });
    expect(b.scrub(10, true, false, 3)).toEqual({ value: 40, text: "40" });
    expect(b.scrub(10, false, true, 3)).toEqual({ value: 10.3, text: "10.3" });
    expect(b.scrub(10, false, false, -2)).toEqual({ value: 8, text: "8" });
  });

  it("takes at least one whole step per move without decimals, even down or still", () => {
    const b = box({}, "px", 0);
    expect(b.scrub(10, false, false, 0)).toEqual({ value: 11, text: "11" });
    expect(b.scrub(10, false, false, -3)).toEqual({ value: 11, text: "11" });
  });

  it("stops when the base isn't a number", () => {
    expect(box().scrub(undefined, false, false, 3)).toBeNull();
    expect(box().scrub(Number.NaN, false, false, 3)).toBeNull();
  });
});

describe("InputBox and the touch handler", () => {
  it("tells DocumentTouchTarget which elements are input boxes", async () => {
    const { DocumentTouchTarget } = await import("../../editor/touch/document-touch-target.ts");
    const { InputBox } = await import("./input-box.ts");
    // Node has no DOM; a bare Element class is enough for the instanceof check.
    const g = globalThis as { Element?: unknown };
    const saved = g.Element;
    class FakeElement {
      readonly fake = true;
    }
    g.Element = FakeElement;
    try {
      const box = new FakeElement();
      const other = new FakeElement();
      new InputBox(box as unknown as HTMLInputElement, { created: true });
      expect(DocumentTouchTarget.isInputBox(box as unknown as EventTarget)).toBe(true);
      expect(DocumentTouchTarget.isInputBox(other as unknown as EventTarget)).toBe(false);
    } finally {
      g.Element = saved;
    }
  });
});
