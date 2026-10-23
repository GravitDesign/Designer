import { describe, expect, it } from "vitest";
import { getTypeId } from "../../core/object.ts";
import type { PaintCanvas } from "../../paint/paint-canvas.ts";
import { Node, registerNodeClass } from "../../scene/node.ts";
import { Effect, type EffectPadding, type EffectTypeValue } from "../effect.ts";
import "../stylable.ts";
import { MultiEffect } from "./multi-effect.ts";

const calls: string[] = [];

class TestAEffect extends Effect {
  static {
    registerNodeClass(this, "TestAEffect", "TestAEffect");
  }
  static override GeometryProperties: Record<string, unknown> = { shp: { amount: 1 } };
  declare $shp: { amount: number };
  native = true;
  static equals(a: unknown, b: unknown): boolean {
    return a instanceof TestAEffect && b instanceof TestAEffect && a.arePropertiesEqual(b, ["shp"]);
  }
  constructor() {
    super();
    this._setDefaultProperties(TestAEffect.GeometryProperties);
  }
  override getEffectType(): EffectTypeValue {
    return Effect.Type.Filter;
  }
  override getEffectPadding(): EffectPadding {
    return 3;
  }
  override canApplyNativeEffect(): boolean {
    return this.native;
  }
  override applyNativeEffect(): void {
    calls.push("apply A");
  }
  override removeNativeEffect(): void {
    calls.push("remove A");
  }
  override render(): void {
    calls.push("render A");
  }
}

class TestBEffect extends Effect {
  static {
    registerNodeClass(this, "TestBEffect", "TestBEffect");
  }
  static VisualProperties: Record<string, unknown> = { col: 2 };
  declare $col: number;
  type: EffectTypeValue = Effect.Type.Filter;
  static equals(a: unknown, b: unknown): boolean {
    return a instanceof TestBEffect && b instanceof TestBEffect && a.arePropertiesEqual(b, ["col"]);
  }
  constructor() {
    super();
    this._setDefaultProperties(TestBEffect.VisualProperties);
  }
  override getEffectType(): EffectTypeValue {
    return this.type;
  }
  override getEffectPadding(): EffectPadding {
    return [1, 5, 2, 4];
  }
  override canApplyNativeEffect(): boolean {
    return true;
  }
  override applyNativeEffect(): void {
    calls.push("apply B");
  }
  override removeNativeEffect(): void {
    calls.push("remove B");
  }
  override render(): void {
    calls.push("render B");
  }
}

class TestMultiEffect extends MultiEffect {
  static {
    registerNodeClass(this, "testMultiEffect", "TestMultiEffect");
  }
}

class UnregisteredMultiEffect extends MultiEffect {
  static {
    registerNodeClass(this, "unregisteredMultiEffect", "UnregisteredMultiEffect");
  }
}

MultiEffect.register(TestMultiEffect, [TestAEffect, TestBEffect]);

describe("MultiEffect", () => {
  it("keeps the old type id", () => {
    expect(getTypeId(MultiEffect)).toBe(256);
  });

  it("register prefixes the effects' properties with their node names", () => {
    const tables = TestMultiEffect as unknown as {
      GeometryProperties: Record<string, unknown>;
      VisualProperties: Record<string, unknown>;
      __FX: unknown[];
    };
    // TestBEffect has Effect's GeometryProperties (vs, ly) through inheritance,
    // as the old static copying gave it.
    expect(Object.keys(tables.GeometryProperties)).toEqual([
      "fxP",
      "fxN",
      "TestAEffect&shp",
      "TestBEffect&vs",
      "TestBEffect&ly",
    ]);
    expect(tables.VisualProperties).toEqual({ "TestBEffect&col": 2 });
    expect(tables.__FX).toEqual([TestAEffect, TestBEffect]);
    // MultiEffect's own table stays as it was.
    expect(MultiEffect.GeometryProperties).toEqual({ fxP: null, fxN: null });
  });

  it("stores fxP and fxN as {} (the deep copy of the defaults turned null into {})", () => {
    // The old app saved GAdjustMultiEffect as {"@":"adjustMultiEffect","fxP":{},"fxN":{}}.
    const multi = new TestMultiEffect();
    expect(JSON.parse(Node.serialize(multi) as string)).toEqual({
      "@": "testMultiEffect",
      fxP: {},
      fxN: {},
    });
  });

  it("hands prefixed property changes to the effect", () => {
    const multi = new TestMultiEffect();
    multi.setProperties(["TestAEffect&shp", "TestBEffect&col"], [{ amount: 7 }, 9]);
    const [a, b] = multi.getFXArray() as [TestAEffect, TestBEffect];
    expect(a.$shp).toEqual({ amount: 7 });
    expect(b.$col).toBe(9);
    expect(multi.getProperty("TestAEffect&shp")).toEqual({ amount: 7 });
  });

  it("pads by the largest padding per side, returned as [left, right, top, bottom]", () => {
    const multi = new TestMultiEffect();
    // Maxima: left 3, top 5, right 3, bottom 4.
    expect(multi.getEffectPadding()).toEqual([3, 3, 5, 4]);
  });

  it("has its effects' type when they agree, Multi otherwise", () => {
    const multi = new TestMultiEffect();
    expect(multi.getEffectType()).toBe(Effect.Type.Filter);
    (multi.getFXArray()[1] as TestBEffect).type = Effect.Type.PostEffect;
    expect(multi.getEffectType()).toBe(Effect.Type.Multi);
  });

  it("renders natively in one copy only when every effect can", () => {
    const multi = new TestMultiEffect();
    const drawn: unknown[] = [];
    const canvas = {
      drawCanvas: (...args: unknown[]) => drawn.push(args),
    } as unknown as PaintCanvas;
    calls.length = 0;
    multi.render(canvas, null, null, 1);
    expect(calls).toEqual(["apply A", "apply B", "remove A", "remove B"]);
    expect(drawn).toEqual([[canvas, 0, 0, 1, "copy"]]);
    calls.length = 0;
    drawn.length = 0;
    (multi.getFXArray()[0] as TestAEffect).native = false;
    multi.render(canvas, null, null, 1);
    expect(calls).toEqual(["render A", "render B"]);
    expect(drawn).toEqual([]);
  });

  it("equals compares the effects one by one", () => {
    const a = new TestMultiEffect();
    const b = new TestMultiEffect();
    expect(MultiEffect.equals(a, b)).toBe(true);
    b.setProperty("TestBEffect&col", 3);
    expect(MultiEffect.equals(a, b)).toBe(false);
  });
  it("an unregistered subclass sees MultiEffect's tables through static inheritance", () => {
    // The old GObject.inherit didn't copy `_`-prefixed statics, so __FX was
    // undefined there; ES classes resolve it to MultiEffect's null (see
    // questions-draft "Subclasses now inherit the _-prefixed static tables").
    const tables = UnregisteredMultiEffect as unknown as {
      GeometryProperties: unknown;
      __FX: unknown;
    };
    expect(Object.hasOwn(UnregisteredMultiEffect, "__FX")).toBe(false);
    expect(tables.__FX).toBeNull();
    expect(tables.GeometryProperties).toBe(MultiEffect.GeometryProperties);
  });

  it("can't be made without effects", () => {
    expect(() => new UnregisteredMultiEffect()).toThrow(
      "Current multieffect has no subeffects defined",
    );
  });

  // Last: the failed register leaves MultiEffect's tables replaced, as in the old code.
  it("can't register MultiEffect itself", () => {
    const saved = MultiEffect.GeometryProperties;
    try {
      expect(() => MultiEffect.register(MultiEffect, [TestAEffect])).toThrow(
        "Multi effect cannot be instantiated",
      );
      expect(MultiEffect.__FX).toEqual([TestAEffect]);
    } finally {
      MultiEffect.GeometryProperties = saved;
      MultiEffect.__FX = null;
    }
  });
});
