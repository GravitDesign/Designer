import { describe, expect, it } from "vitest";
import { Transform } from "../../../engine/math/transform.ts";
import recorded from "./__fixtures__/svg-values.recorded.json" with { type: "json" };
import {
  aspectRatio,
  parseFont,
  SvgBounds,
  SvgPoint,
  SvgProperty,
  SvgTransform,
  ViewPort,
  type PropertyContext,
  type PropertyValue,
  type SceneContext,
} from "./svg-values.ts";

/** What the old recorder did: catch and keep only the error's class. */
function attempt(fn: () => unknown): unknown {
  try {
    return fn();
  } catch (error) {
    return "<" + (error as Error).name + ">";
  }
}

function context(): PropertyContext {
  const viewPort = new ViewPort();
  viewPort.SetCurrent(200, 100);
  return { ViewPort: viewPort, Definitions: {} };
}

describe("SvgTransform", () => {
  it("applies transform lists like the old importer (outputs recorded from the old app)", () => {
    recorded.inputs.TRANSFORMS.forEach((text, i) => {
      const result = attempt(() => {
        const scene: SceneContext = { transform: new Transform(1, 0, 0, 1, 3, 4) };
        new SvgTransform(context(), text).apply(scene);
        return scene.transform.getMatrix();
      });
      expect(result, text).toEqual(recorded.outputs.transforms[i]);
    });
  });

  it("applies matrix() on the other side than translate()", () => {
    // translate() goes before the current transform, matrix() after it.
    const scene: SceneContext = { transform: new Transform(2, 0, 0, 2, 0, 0) };
    new SvgTransform(context(), "matrix(1 0 0 1 10 0)").apply(scene);
    expect(scene.transform.getMatrix()).toEqual([2, 0, 0, 2, 10, 0]);
    const translated: SceneContext = { transform: new Transform(2, 0, 0, 2, 0, 0) };
    new SvgTransform(context(), "translate(10 0)").apply(translated);
    expect(translated.transform.getMatrix()).toEqual([2, 0, 0, 2, 20, 0]);
  });
});

describe("aspectRatio", () => {
  it("fits view boxes like the old importer (outputs recorded from the old app)", () => {
    (recorded.inputs.ASPECTS as unknown[][]).forEach((a, i) => {
      const scene: SceneContext = { transform: new Transform(2, 0, 0, 2, 1, 1) };
      aspectRatio(
        context(),
        scene,
        a[0] as string,
        a[1] as number,
        a[2] as number,
        a[3] as number,
        a[4] as number,
        a[5] as number | null | undefined,
        a[6] as number | null | undefined,
        (a[7] ?? "") as PropertyValue,
        (a[8] ?? "") as PropertyValue,
      );
      expect(scene.transform.getMatrix(), JSON.stringify(a)).toEqual(recorded.outputs.aspects[i]);
    });
  });
});

describe("parseFont", () => {
  it("splits font shorthands like canvg's svg.Font.Parse", () => {
    recorded.inputs.FONTS.forEach((text, i) => {
      expect({ ...parseFont(text) }, text).toEqual(recorded.outputs.fonts[i]);
    });
  });
});

describe("SvgProperty", () => {
  it("converts lengths at 72 DPI against the view port (outputs recorded from the old app)", () => {
    (recorded.inputs.LENGTHS as unknown[][]).forEach((l, i) => {
      const result = attempt(() => {
        const property = new SvgProperty(context(), "x", l[0] as PropertyValue);
        return [
          property.toPixels(l[1] as string | undefined, l[2] as boolean | undefined),
          property.numValue(),
          property.getUnits(),
          property.hasValue(),
        ];
      });
      // JSON turned the recorded NaN into null.
      expect(JSON.parse(JSON.stringify(result)), JSON.stringify(l)).toEqual(
        recorded.outputs.lengths[i],
      );
    });
  });

  it("finds definitions by url(#id) or plain id", () => {
    const target = { name: "target" };
    const ctx = { ...context(), Definitions: { a: target } as Record<string, unknown> };
    expect(new SvgProperty(ctx, "fill", "url(#a)").getDefinition()).toBe(target);
    expect(new SvgProperty(ctx, "fill", "url('#a')").getDefinition()).toBe(target);
    expect(new SvgProperty(ctx, "fill", "a").getDefinition()).toBe(target);
    expect(new SvgProperty(ctx, "fill", "url(#b)").getDefinition()).toBeUndefined();
  });

  it("puts stop-opacity into the color as rgba", () => {
    const color = new SvgProperty(context(), "stop-color", "#ff0");
    const opacity = new SvgProperty(context(), "stop-opacity", "0.5");
    expect(color.addOpacity(opacity).value).toBe("rgba(255, 255, 0, 0.5)");
    expect(color.addOpacity(new SvgProperty(context(), "o", "")).value).toBe("#ff0");
  });
});

describe("SvgBounds", () => {
  it("moves the bottom edge to the x of a lower point (old quirk)", () => {
    const bounds = new SvgBounds();
    bounds.expand(new SvgPoint(5, 10));
    bounds.expand(new SvgPoint(2, 40));
    expect([bounds.x(), bounds.y(), bounds.width(), bounds.height()]).toEqual([2, 10, 3, -8]);
  });
});
