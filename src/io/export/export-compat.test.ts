// The raster decisions read the live property fields like the old code
// (module 1235 reads `e.$_sbl`, `e.$_bl`, `e.$_pt`), so a temporary value
// set during a live preview counts, not the committed one.
import { describe, expect, it } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Background } from "../../engine/style/background.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { ExportCompat } from "./export-compat.ts";

function filledRectangle(): { shape: Rectangle; layer: FillPaintLayer } {
  const shape = new Rectangle();
  const layer = new FillPaintLayer(new RGBColor([0, 0, 0]));
  shape.getPaintLayers()?.appendChild(layer);
  return { shape, layer };
}

describe("ExportCompat on temporary property values", () => {
  it("a temporary custom blend mode on the node makes it incompatible", () => {
    const { shape } = filledRectangle();
    expect(ExportCompat.hasCustomBlendMode(shape)).toBe(false);
    shape.setProperty("_sbl", "linear_burn", false, false, true);
    expect(ExportCompat.hasCustomBlendMode(shape)).toBe(true);
    expect(ExportCompat.isCompatible(shape)).toBe(false);
    shape.resetTemporaryProperty("_sbl");
    expect(ExportCompat.hasCustomBlendMode(shape)).toBe(false);
  });

  it("a temporary custom blend mode on a paint layer counts", () => {
    const { shape, layer } = filledRectangle();
    layer.setProperty("_bl", "vivid_light", false, false, true);
    expect(ExportCompat.hasCustomBlendMode(shape)).toBe(true);
  });

  it("a committed custom blend mode under a temporary normal one doesn't count", () => {
    const { shape } = filledRectangle();
    shape.setProperty("_sbl", "linear_burn");
    shape.setProperty("_sbl", "normal", false, false, true);
    expect(ExportCompat.hasCustomBlendMode(shape)).toBe(false);
  });

  it("a temporary background fill counts as unsupported and affected by the background", () => {
    const { shape, layer } = filledRectangle();
    expect(ExportCompat.hasUnsupportedPattern(shape)).toBe(false);
    layer.setProperty("_pt", new Background(), false, false, true);
    expect(ExportCompat.hasUnsupportedPattern(shape)).toBe(true);
    expect(ExportCompat.hasBackgroundFill(shape)).toBe(true);
    expect(ExportCompat.isAffectedByBackground(shape)).toBe(true);
  });
});
