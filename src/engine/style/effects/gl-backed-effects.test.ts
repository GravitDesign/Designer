import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EXPECTED_ROOT } from "../../../../parity/support/env.ts";
import { getTypeId } from "../../core/object.ts";
import { Node, registerNodeClass } from "../../scene/node.ts";
import { Effect, type EffectPadding, type EffectTypeValue } from "../effect.ts";
import "../stylable.ts";
import { GLColorAdjustEffect } from "../webgl/effects/gl-color-adjust-effect.ts";
import { AdjustMultiEffect } from "./adjust-multi-effect.ts";
import { ColorAdjustMultiEffect } from "./color-adjust-multi-effect.ts";
import { CurvedShadowEffect } from "./curved-shadow-effect.ts";

// A stand-in for GGLBendBlurEffect, which the curved shadow looks up by
// node name: just the property table and what the curved shadow calls.

const rendered: string[] = [];

function glEffect(
  nodeName: string,
  shp: Record<string, unknown>,
  padding: (shp: Record<string, number>) => EffectPadding = () => 0,
) {
  class FakeGLEffect extends Effect {
    static {
      registerNodeClass(this, nodeName, nodeName);
    }
    static override GeometryProperties: Record<string, unknown> = { shp, sh: nodeName };
    static equals(a: unknown, b: unknown): boolean {
      return (
        a instanceof FakeGLEffect && b instanceof FakeGLEffect && a.arePropertiesEqual(b, ["shp"])
      );
    }
    declare $shp: Record<string, number>;
    constructor() {
      super();
      this._setDefaultProperties(FakeGLEffect.GeometryProperties);
    }
    override getEffectType(): EffectTypeValue {
      return Effect.Type.Filter;
    }
    override getEffectPadding(): EffectPadding {
      return padding(this.$shp);
    }
    override render(): void {
      rendered.push(nodeName + " " + JSON.stringify(this.$shp));
    }
  }
  return FakeGLEffect;
}

const FakeBendBlurEffect = glEffect(
  "GGLBendBlurEffect",
  { radius: 50, softness: 1, bend: 50, cov: 0.8 },
  (shp) => [shp.radius as number, shp.softness as number, shp.bend as number, 0],
);

const recorded = JSON.parse(
  fs.readFileSync(path.join(EXPECTED_ROOT, "engine-model/styles/effects-catalogue.json"), "utf8"),
) as Record<string, { defaultBlob: unknown; blob: unknown; type: number }>;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ColorAdjustMultiEffect", () => {
  it("keeps the old type id and node name", () => {
    expect(getTypeId(ColorAdjustMultiEffect)).toBe(257);
    expect(Node.getName(new ColorAdjustMultiEffect())).toBe("colorAdjustMultiEffect");
  });

  it("stores its effects' parameters, as the old app did", () => {
    const fx = new ColorAdjustMultiEffect();
    const expected = recorded.GColorAdjustMultiEffect as { defaultBlob: unknown; blob: unknown };
    expect(JSON.parse(Node.serialize(fx) as string)).toEqual(expected.defaultBlob);
    fx.setProperties(
      ["GGLBrightnessContrastEffect&shp", "GGLHueSaturationEffect&shp"],
      [
        { brightness: 0.2, contrast: -0.3 },
        { hue: 0.5, saturation: 0.1 },
      ],
    );
    const json = Node.serialize(fx) as string;
    expect(JSON.parse(json)).toEqual(expected.blob);
    expect(Node.serialize(Node.deserialize(json) as Node)).toBe(json);
  });

  it("renders all four values with one color adjust effect", () => {
    const fx = new ColorAdjustMultiEffect();
    expect(fx._colorAdjust).toBeInstanceOf(GLColorAdjustEffect);
    vi.spyOn(GLColorAdjustEffect.prototype, "render").mockImplementation(function (
      this: GLColorAdjustEffect,
    ) {
      rendered.push(Node.getName(this) + " " + JSON.stringify(this.$shp));
    });
    fx.setProperty("GGLHueSaturationEffect&shp", { hue: 0.5, saturation: 0.1 });
    fx.setProperty("GGLBrightnessContrastEffect&shp", { brightness: 0.2, contrast: -0.3 });
    rendered.length = 0;
    fx.render(null as never, null, null, 1);
    expect(rendered).toEqual([
      'GGLColorAdjustEffect {"brightness":0.2,"contrast":-0.3,"hue":0.5,"saturation":0.1}',
    ]);
    // The two edited effects got their values too.
    expect((fx.getFXArray()[1] as unknown as { $shp: unknown }).$shp).toEqual({
      hue: 0.5,
      saturation: 0.1,
    });
    // Clearing one resets its two values to 0.
    fx.setProperty("GGLHueSaturationEffect&shp", null);
    rendered.length = 0;
    fx.render(null as never, null, null, 1);
    expect(rendered).toEqual([
      'GGLColorAdjustEffect {"brightness":0.2,"contrast":-0.3,"hue":0,"saturation":0}',
    ]);
  });
});

describe("AdjustMultiEffect", () => {
  it("has dot screen, sepia and blur, and stores fxP and fxN as the old app did", () => {
    expect(getTypeId(AdjustMultiEffect)).toBe(258);
    const fx = new AdjustMultiEffect();
    expect(fx.getFXArray().map((effect) => Node.getName(effect))).toEqual([
      "GGLDotScreenEffect",
      "GGLSepiaEffect",
      "GGLBlurEffect",
    ]);
    const expected = recorded.GAdjustMultiEffect as { defaultBlob: unknown };
    expect(JSON.parse(Node.serialize(fx) as string)).toEqual(expected.defaultBlob);
  });

  // BUG-004: the old app stored only fxP and fxN, so changed settings came
  // back as the defaults after save and load.
  it("stores the changed effect settings and restores them into the effects", () => {
    const fx = new AdjustMultiEffect();
    fx.setProperties(
      ["GGLSepiaEffect&shp", "GGLBlurEffect&shp"],
      [{ amount: 0.9 }, { radius: 12, clip: true }],
    );
    const json = Node.serialize(fx) as string;
    expect(JSON.parse(json)).toEqual({
      "@": "adjustMultiEffect",
      fxP: {},
      fxN: {},
      "GGLSepiaEffect&shp": { amount: 0.9 },
      "GGLBlurEffect&shp": { radius: 12, clip: true },
    });
    const restored = Node.deserialize(json) as AdjustMultiEffect;
    expect(restored.getProperty("GGLSepiaEffect&shp")).toEqual({ amount: 0.9 });
    const [dots, sepia, blur] = restored.getFXArray() as unknown as { $shp: unknown }[];
    expect(dots?.$shp).toEqual({ centerX: 50, centerY: 50, angle: 0, size: 10 });
    expect(sepia?.$shp).toEqual({ amount: 0.9 });
    expect(blur?.$shp).toEqual({ radius: 12, clip: true });
    expect(restored.getEffectPadding()).toEqual([0, 0, 0, 0]);
    expect(Node.serialize(restored)).toBe(json);
  });

  it("opens the old app's blob with the default settings", () => {
    const restored = Node.deserialize(
      JSON.stringify({ "@": "adjustMultiEffect", fxP: {}, fxN: {} }),
    ) as AdjustMultiEffect;
    const sepia = restored.getFXArray()[1] as unknown as { $shp: unknown };
    expect(sepia.$shp).toEqual({ amount: 0.5 });
    expect(restored.getEffectPadding()).toEqual([5, 5, 5, 5]);
  });
});

describe("CurvedShadowEffect", () => {
  it("passes its properties to the bend blur for the padding", () => {
    expect(getTypeId(CurvedShadowEffect)).toBe(263);
    const fx = new CurvedShadowEffect();
    expect(fx._bend).toBeInstanceOf(FakeBendBlurEffect);
    fx.setProperties(["s", "b", "l"], [2, 20, 15]);
    // radius = l, softness = s, bend = b.
    expect(fx.getEffectPadding()).toEqual([15, 2, 20, 0]);
    expect((fx._bend as unknown as { $shp: unknown }).$shp).toEqual({
      radius: 15,
      softness: 2,
      bend: 20,
      cov: 0.8,
    });
    const expected = recorded.GCurvedShadowEffect as { defaultBlob: unknown; blob: unknown };
    const fresh = new CurvedShadowEffect();
    expect(JSON.parse(Node.serialize(fresh) as string)).toEqual(expected.defaultBlob);
  });
});
