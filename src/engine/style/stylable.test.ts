import { describe, expect, it } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { getTypeId, hasMixin } from "../core/object.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { Node, registerNodeClass } from "../scene/node.ts";
import { Properties } from "../scene/node-properties.ts";
import { Store } from "../scene/node-store.ts";
import { SceneNode } from "../scene/scene-node.ts";
import type { NodeBlob } from "../serialize/blob.ts";
import { BorderPaintLayer } from "./border-paint-layer.ts";
import { Effect, type EffectPadding, type EffectTypeValue } from "./effect.ts";
import type { Effects } from "./effects.ts";
import { FillPaintLayer } from "./fill-paint-layer.ts";
import { Stylable } from "./stylable.ts";
import { Style } from "./style.ts";

/** A minimal stylable node, the way elements and styles wire the mixin in. */
class TestStylable extends Stylable(Store(Properties(SceneNode))) {
  static {
    registerNodeClass(this, "testStylable", "GTestStylable");
  }

  calls: string[] = [];

  constructor() {
    super();
    this._setStyleDefaultProperties();
  }

  override _handleChange(change: number, args?: unknown): void {
    this._handleStyleChange(change, args);
    super._handleChange(change, args);
  }

  override _stylePrepareGeometryChange(source?: unknown): void {
    this.calls?.push("prepare:" + String(source instanceof Node ? Node.getName(source) : source));
  }

  override _styleFinishGeometryChange(source?: unknown): void {
    this.calls?.push("finish:" + String(source instanceof Node ? Node.getName(source) : source));
  }

  override _styleRepaint(source?: unknown): void {
    this.calls?.push("repaint:" + String(source instanceof Node ? Node.getName(source) : source));
  }
}

/** An effect with a fixed type and padding. */
class TestEffect extends Effect {
  static {
    registerNodeClass(this, "testEffect", "GTestEffect");
  }

  constructor(
    readonly type: EffectTypeValue = Effect.Type.Filter,
    readonly padding: EffectPadding = null,
  ) {
    super();
  }

  override getEffectType(): EffectTypeValue {
    return this.type;
  }

  override getEffectPadding(): EffectPadding {
    return this.padding;
  }
}

function names(node: { getChildren(): Node[] } | null): string[] {
  return (node ? node.getChildren() : []).map((child) => Node.getName(child));
}

describe("Stylable", () => {
  it("keeps the old mixin id and statics", () => {
    expect(getTypeId(Stylable)).toBe(74);
    expect(getTypeId(Stylable.Effect)).toBe(81);
    expect(getTypeId(Stylable.Effects)).toBe(80);
    expect(hasMixin(new TestStylable(), Stylable)).toBe(true);
    expect(Stylable.PropertySet.FillPaintLayers).toBe("FL");
    expect(Stylable.AllVisualProperties).toMatchObject({ _sbl: "normal", _fc: null });
    expect(Stylable.AllGeometryProperties).toMatchObject({ _tfi: 20, _plh: 1 });
  });

  it("creates its containers on first use with the stored ids", () => {
    const node = new TestStylable();
    const layId = node._layId;
    expect(layId).toBeTruthy();
    const layers = node.getPaintLayers();
    expect(layers).toBe(node.getPaintLayers());
    expect(layers?.getMultireferenceId()).toBe(layId);
    expect(layers?.getParent()).toBe(node);
    expect(node.getEffects()?.getMultireferenceId()).toBe(node._effId);
  });

  it("stores only container ids while empty, the containers once filled", () => {
    const node = new TestStylable();
    let blob = Node.store(node) as NodeBlob;
    expect(blob["_layId"]).toBe(node._layId);
    expect(blob["_effId"]).toBe(node._effId);
    expect("_layers" in blob).toBe(false);
    node.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([1, 2, 3])));
    node.setProperty("_stop", 0.5);
    blob = Node.store(node) as NodeBlob;
    expect(blob["_stop"]).toBe(0.5);
    expect((blob["_layers"] as NodeBlob)["@"]).toBe("paintLayers");
    expect("_layId" in blob).toBe(false);
    const json = Node.serialize(node) as string;
    const restored = Node.deserialize(json) as TestStylable;
    expect(Node.serialize(restored)).toBe(json);
    expect(restored.getPaintLayers()?.getParent()).toBe(restored);
    expect(names(restored.getPaintLayers())).toEqual(["fillPaintLayer"]);
  });

  it("reports style property changes as geometry or repaint", () => {
    const node = new TestStylable();
    node.calls = [];
    node.setProperty("_stop", 0.3);
    expect(node.calls).toEqual(["repaint:undefined"]);
    node.calls = [];
    node.getPaintLayers()?.appendChild(new FillPaintLayer());
    expect(node.calls).toEqual(["prepare:fillPaintLayer", "finish:fillPaintLayer"]);
    node.calls = [];
    (node.getPaintLayers()?.getFirstChild() as FillPaintLayer).setProperty("_op", 0.5);
    expect(node.calls).toEqual(["repaint:fillPaintLayer"]);
    node.calls = [];
    (node.getPaintLayers()?.getFirstChild() as FillPaintLayer).setProperty("_px", new Transform());
    expect(node.calls).toEqual(["prepare:fillPaintLayer", "finish:fillPaintLayer"]);
  });

  it("names its style layers with the old index test", () => {
    expect(new TestStylable().getStyleLayers()).toEqual(["F", "B"]);
    const style = new Style();
    style.setProperty("ps", ["FL"]);
    // FL at index 0 counts as missing, the missing BL (-1) as present.
    expect(style.getStyleLayers()).toEqual(["B"]);
    style.setProperty("ps", ["S"]);
    expect(style.getStyleLayers()).toEqual(["F", "B"]);
  });

  it("measures the border padding by alignment", () => {
    const node = new TestStylable();
    const border = new BorderPaintLayer();
    border.setProperty("_bw", 6);
    expect(node.getStyleBorderPadding(border)).toBe(3);
    border.setProperty("_ba", "O");
    expect(node.getStyleBorderPadding(border)).toBe(6);
    border.setProperty("_ba", "I");
    expect(node.getStyleBorderPadding(border)).toBe(0);
  });

  it("assigns the shared sets from another stylable", () => {
    const source = new TestStylable();
    source.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([10, 20, 30])));
    source.getPaintLayers()?.appendChild(new BorderPaintLayer(new RGBColor([0, 0, 0])));
    source.getEffects()?.appendChild(new TestEffect());
    source.setProperties(["_stop", "_sdf"], [0.5, 7]);
    const target = new TestStylable();
    target.getPaintLayers()?.appendChild(new BorderPaintLayer(new RGBColor([9, 9, 9])));
    target.assignStyleFrom(source);
    expect(names(target.getPaintLayers())).toEqual(["fillPaintLayer", "borderPaintLayer"]);
    expect(target.getPaintLayers()?.getFirstChild()).not.toBe(
      source.getPaintLayers()?.getFirstChild(),
    );
    expect(names(target.getEffects())).toEqual(["testEffect"]);
    expect(target.getProperty("_stop")).toBe(0.5);
    expect(target.getProperty("_sdf")).toBeNull();

    // A style limited to fills only replaces the fills.
    const fillsOnly = new Style();
    fillsOnly.setProperty("ps", ["FL"]);
    fillsOnly.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([1, 1, 1])));
    const other = new TestStylable();
    other.getPaintLayers()?.appendChild(new BorderPaintLayer(new RGBColor([5, 5, 5])));
    other.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([2, 2, 2])));
    other.assignStyleFrom(fillsOnly);
    expect(names(other.getPaintLayers())).toEqual(["borderPaintLayer", "fillPaintLayer"]);
    expect(
      RGBColor.equals(
        (other.getPaintLayers()?.getLastChild() as FillPaintLayer).$_pt,
        new RGBColor([1, 1, 1]),
      ),
    ).toBe(true);
  });

  it("compares with a style by its sets", () => {
    const node = new TestStylable();
    const style = new Style();
    expect(node.equalsStyle(null)).toBe(true);
    expect(node.equalsStyle(style)).toBe(true);
    style.setProperty("_stop", 0.4);
    expect(node.equalsStyle(style)).toBe(false);
    node.setProperty("_stop", 0.4);
    expect(node.equalsStyle(style)).toBe(true);
    // Layers compare with their class equals (by value).
    style.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([1, 1, 1])));
    node.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([1, 1, 1])));
    expect(node.equalsStyle(style)).toBe(true);
    (node.getPaintLayers()?.getFirstChild() as FillPaintLayer).setProperty("_op", 0.5);
    expect(node.equalsStyle(style)).toBe(false);
  });
});

describe("Effects", () => {
  it("keeps pre effects in front", () => {
    const node = new TestStylable();
    const effects = node.getEffects() as Effects;
    const filter = new TestEffect(Effect.Type.Filter);
    const post = new TestEffect(Effect.Type.PostEffect);
    const pre = new TestEffect(Effect.Type.PreEffect);
    effects.appendChild(filter);
    effects.appendChild(post);
    // Without a pre effect yet, it goes before the first post effect.
    effects.appendChild(pre);
    expect(effects.getChildren()).toEqual([filter, pre, post]);
    // Later ones go right after the last pre effect.
    const pre2 = new TestEffect(Effect.Type.PreEffect);
    effects.appendChild(pre2);
    expect(effects.getChildren()).toEqual([filter, pre, pre2, post]);
    const pre3 = new TestEffect(Effect.Type.PreEffect);
    effects.insertChild(pre3, filter);
    expect(effects.getChildren()).toEqual([pre3, filter, pre, pre2, post]);
  });

  it("groups effects per layer: pre, filters, post", () => {
    const effects = new TestStylable().getEffects() as Effects;
    const post = new TestEffect(Effect.Type.PostEffect);
    const filter = new TestEffect(Effect.Type.Filter);
    const fill = new TestEffect(Effect.Type.Filter);
    fill.setProperty("ly", "F");
    const hidden = new TestEffect(Effect.Type.Filter);
    hidden.setProperty("vs", false);
    effects.appendChild(post);
    effects.appendChild(filter);
    effects.appendChild(fill);
    effects.appendChild(hidden);
    expect(effects.getEffectsForLayer(null)).toEqual([filter, hidden, post]);
    expect(effects.getEffectsForLayer(null, true)).toEqual([filter, post]);
    expect(effects.getEffectsForLayer("F")).toEqual([fill]);
    expect(effects.getEffectsForLayer("B")).toBeNull();
    expect(effects.getLayersEffects(["F", "B"], true)).toEqual([[fill], null, [filter, post]]);
  });

  it("adds filter padding on top of the largest overlay padding", () => {
    const effects = new TestStylable().getEffects() as Effects;
    expect(effects.getEffectsPadding()).toBeNull();
    effects.appendChild(new TestEffect(Effect.Type.PreEffect, [1, 2, 3, 4]));
    effects.appendChild(new TestEffect(Effect.Type.PostEffect, 3));
    expect(effects.getEffectsPadding()).toEqual([3, 3, 3, 4]);
    // In order pre, filter, post: the pre padding, plus the filter, plus the post.
    effects.appendChild(new TestEffect(Effect.Type.Filter, 10));
    expect(effects.getEffectsPadding()).toEqual([14, 15, 16, 17]);
    expect(effects.getEffectsBBox(new Rect(0, 0, 10, 10)).getX()).toBe(-14);
  });

  it("tells the owner about inserts and removes", () => {
    const node = new TestStylable();
    const effects = node.getEffects() as Effects;
    node.calls = [];
    const effect = new TestEffect();
    effects.appendChild(effect);
    effects.removeChild(effect);
    expect(node.calls).toEqual([
      "prepare:testEffect",
      "finish:testEffect",
      "prepare:testEffect",
      "finish:testEffect",
    ]);
    expect(effect.validateInsertion(effects)).toBe(true);
    expect(effect.validateInsertion(new FillPaintLayer())).toBe(false);
  });

  it("measures absolute padding and children", () => {
    expect(new TestEffect(Effect.Type.Filter, [-2, 5, 1, 0]).getAbsoluteEffectPadding()).toBe(5);
    expect(new TestEffect(Effect.Type.Filter, -3).getAbsoluteEffectPadding()).toBe(0);
    expect(new TestEffect(Effect.Type.Filter, null).isAffectedByChildren()).toBe(false);
    expect(new TestEffect(Effect.Type.Filter, 4).isAffectedByChildren()).toBe(4);
    expect(new TestEffect(Effect.Type.Filter, [0, 0, 0, 0]).isAffectedByChildren()).toBe(false);
    expect(() => new Effect().getEffectType()).toThrow("Not Supported.");
  });
});
