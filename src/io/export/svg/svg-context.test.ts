import { describe, expect, it, vi } from "vitest";
import { SvgContext } from "./svg-context.ts";

describe("SvgContext.drawImage (old chunk.vendor.js 257223-257242)", () => {
  it("throws a TypeError for a null image, as the old `e._canvasContext` read did", () => {
    expect(() => new SvgContext(null, {}).drawImage(null, 0, 0)).toThrow(TypeError);
  });

  it("ignores an image without a canvas context", () => {
    const context = new SvgContext(null, {});
    context.drawImage({}, 0, 0);
    expect(context._svgs).toEqual([]);
  });

  it("logs and records nothing for a canvas that isn't an SVG canvas", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const context = new SvgContext(null, {});
    context.drawImage({ _canvasContext: {} }, 0, 0);
    expect(error).toHaveBeenCalledWith(
      "GSVGContext:drawImage does not accept type [object Object]",
    );
    expect(context._svgs).toEqual([]);
    error.mockRestore();
  });
});
