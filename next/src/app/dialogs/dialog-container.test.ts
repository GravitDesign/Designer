import { describe, expect, it } from "vitest";
import { placeOverlay, type OverlayGeometry } from "./dialog-container.ts";
import { formatError } from "./system-dialog.ts";

const OPTIONS = {
  side: false,
  sideClazz: "g-overlay-side",
  middle: false,
  offsetX: 0,
  offsetY: 0,
  bottomOffsetY: 0,
  customRight: null,
  rightClazz: null,
  bottomClazz: null,
  flipHorizontal: false,
};

/** A 100x50 overlay for a 40x20 target at (200, 100) in a 1000x800 window. */
function at(changes: Partial<OverlayGeometry> = {}): OverlayGeometry {
  return {
    viewWidth: 1000,
    viewHeight: 800,
    width: 100,
    height: 50,
    top: 100,
    left: 200,
    targetWidth: 40,
    targetHeight: 20,
    isPoint: false,
    ...changes,
  };
}

describe("overlay placement (UI-DIALOG-002)", () => {
  it("opens below the target's left edge", () => {
    expect(placeOverlay(at(), OPTIONS)).toEqual({ x: 200, y: 120, classes: [] });
  });

  it("centres on the target with middle", () => {
    expect(placeOverlay(at(), { ...OPTIONS, middle: true, offsetX: -13 }).x).toBe(207);
  });

  it("flips left and up where it doesn't fit, with the flip classes", () => {
    const placed = placeOverlay(at({ left: 950, top: 770 }), {
      ...OPTIONS,
      rightClazz: "from-right",
      bottomClazz: "from-bottom",
      bottomOffsetY: 6,
    });
    expect(placed).toEqual({ x: 890, y: 714, classes: ["from-right", "from-bottom"] });
  });

  it("goes beside the target with side", () => {
    expect(placeOverlay(at(), { ...OPTIONS, side: true, offsetY: -6 })).toEqual({
      x: 240,
      y: 94,
      classes: ["g-overlay-side"],
    });
    expect(placeOverlay(at({ left: 900 }), { ...OPTIONS, side: true }).classes).toEqual([
      "g-overlay-side",
      "g-overlay-left-side",
    ]);
  });

  it("places at a point without a target size, and never off the top left", () => {
    expect(placeOverlay(at({ isPoint: true, left: 10, top: 10 }), OPTIONS)).toEqual({
      x: 10,
      y: 10,
      classes: [],
    });
    expect(placeOverlay(at({ left: -50, top: -100 }), OPTIONS)).toEqual({
      x: 0,
      y: 0,
      classes: [],
    });
  });

  it("measures from the right with customRight", () => {
    expect(placeOverlay(at(), { ...OPTIONS, customRight: 10 }).x).toBe(770);
  });
});

describe("formatError (UI-DIALOG-003)", () => {
  it("takes a string, a message or the errors list", () => {
    expect(formatError("x")).toBe("x");
    expect(formatError(new Error("boom"))).toBe("boom");
    expect(
      formatError({
        errors: [
          ["a", "first"],
          ["b", "second"],
        ],
      }),
    ).toBe("first<br>second");
    const other = { code: 1 };
    expect(formatError(other)).toBe(other);
  });
});
