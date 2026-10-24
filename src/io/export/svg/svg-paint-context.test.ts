import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installFakeCanvas } from "../../../engine/paint/testing/fake-canvas.ts";
import { AngularGradient } from "../../../engine/style/angular-gradient.ts";
import { SvgContext, type SvgContextStyle, type SvgPaintStyle } from "./svg-context.ts";
import { SVG_NAMESPACE, SvgDocument } from "./svg-dom.ts";
import { SvgPaintContext } from "./svg-paint-context.ts";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());

/** getSvgStyle for one recorded style. */
function styleOf(recorded: Partial<SvgContextStyle>): () => unknown {
  const context = new SvgContext(null, {});
  const paint = new SvgPaintContext(context);
  context._svgStyles.push(recorded as SvgContextStyle);
  const defs = new SvgDocument().createElementNS(SVG_NAMESPACE, "defs");
  return () => paint.getSvgStyle(0, defs);
}

describe("SvgPaintContext.getSvgStyle with a gradient that has no SVG form", () => {
  // Old chunk.vendor.js 244691 (`o.strokeStyle.asSVG(a, 1)`) and 244697
  // (`o.fillStyle.asSVG(a, 1)`): only the linear and the radial gradient
  // had asSVG, so an angular one threw Chrome's TypeError naming the
  // expression it was read from.
  it("names the fill style for a fill", () => {
    expect(
      styleOf({ _isStroke: false, fillStyle: new AngularGradient() as unknown as SvgPaintStyle }),
    ).toThrow(new TypeError("o.fillStyle.asSVG is not a function"));
  });

  it("names the stroke style for a border", () => {
    expect(
      styleOf({
        _isStroke: true,
        strokeStyle: new AngularGradient() as unknown as SvgPaintStyle,
        lineWidth: 1,
      }),
    ).toThrow(new TypeError("o.strokeStyle.asSVG is not a function"));
  });
});
