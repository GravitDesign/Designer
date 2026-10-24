import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXPECTED_ROOT } from "../../../parity/support/env.ts";
import { CMYKColor } from "../color/cmyk-color.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { getTypeId, hasMixin } from "../core/object.ts";
import { Node, registerNodeClass } from "../scene/node.ts";
import { Container } from "../scene/node-container.ts";
import { Store } from "../scene/node-store.ts";
import { SceneNode } from "../scene/scene-node.ts";
import type { NodeBlob } from "../serialize/blob.ts";
import { FillPaintLayer } from "./fill-paint-layer.ts";
import { Pattern } from "./pattern.ts";
import { Stylable } from "./stylable.ts";
import { Style } from "./style.ts";
import { Swatch } from "./swatch.ts";
import { Swatches } from "./swatches.ts";
import { TexturePattern } from "./texture-pattern.ts";

/** Stands in for GStyles and GScene, which only check names. */
class TestStyles extends Store(Container(SceneNode)) {
  static {
    registerNodeClass(this, "styles", "GTestStyles");
  }
}

const recordedSets = JSON.parse(
  fs.readFileSync(path.join(EXPECTED_ROOT, "engine-model/styles/property-sets.json"), "utf8"),
) as Record<string, unknown>;

const recordedSwatches = JSON.parse(
  fs.readFileSync(path.join(EXPECTED_ROOT, "engine-model/styles/swatches.json"), "utf8"),
) as { swatches: { $: NodeBlob[] }; isCMYK: boolean[] };

function withoutIds(blob: NodeBlob): NodeBlob {
  return JSON.parse(JSON.stringify(blob).replace(/"@id":"[^"]*",?/g, "")) as NodeBlob;
}

describe("Style", () => {
  it("has the old type id, sets and defaults", () => {
    expect(getTypeId(Style)).toBe(134);
    const style = new Style();
    expect(hasMixin(style, Stylable)).toBe(true);
    expect({
      sets: style.getStylePropertySets(),
      paintLayers: !!style.getPaintLayers(),
      effects: !!style.getEffects(),
    }).toEqual(recordedSets["GStyle"]);
    style.setProperty("ps", ["S", "FL"]);
    expect(style.getStylePropertySets()).toEqual(recordedSets["styleWithSubset"]);
    expect(style.getProperty("defaultStyle")).toBe(true);
    // Every new style starts with the same ps array (old default sharing).
    expect(new Style().getProperty("ps")).toBe(new Style().getProperty("ps"));
    expect(style.toString()).toBe("[Mixin GStyle]");
  });

  it("stores its meta and text properties", () => {
    const style = new Style();
    style.setProperties(["name", "_tfi", "_fc"], ["Brand", 30, new RGBColor([1, 2, 3])]);
    const blob = Node.store(style) as NodeBlob;
    expect(blob["name"]).toBe("Brand");
    expect(blob["_tfi"]).toBe(30);
    expect(blob["_fc"]).toBe("C#[1,2,3]");
    expect("ps" in blob).toBe(false);
    expect(typeof blob["#"]).toBe("undefined");
    style.getReferenceId();
    const json = Node.serialize(style) as string;
    const restored = Node.deserialize(json) as Style;
    expect(Node.serialize(restored)).toBe(json);
    expect(restored.getReferenceId()).toBe(style.getReferenceId());
    expect(RGBColor.equals(restored.getProperty("_fc"), new RGBColor([1, 2, 3]))).toBe(true);
  });

  it("only goes into the styles container", () => {
    expect(new Style().validateInsertion(new TestStyles())).toBe(true);
    expect(new Style().validateInsertion(new Swatches())).toBe(false);
  });

  it("pushes an assigned style to the linked nodes but the source", () => {
    const style = new Style();
    const pushed: unknown[] = [];
    const linked = {
      hasMixin: (mixin: unknown) => mixin === Stylable,
      assignStyleFrom: (source: unknown, block: unknown) => pushed.push([source, block]),
    };
    const source = new Style();
    source.getPaintLayers()?.appendChild(new FillPaintLayer(new RGBColor([9, 9, 9])));
    style._scene = {
      visitLinks: (_reference: unknown, visit: (node: unknown) => void) => {
        visit(linked);
        visit(source);
      },
    } as never;
    style.assignStyleFrom(source);
    expect(style.getPaintLayers()?.getChildren().length).toBe(1);
    expect(pushed).toEqual([[style, true]]);
  });
});

describe("Swatch", () => {
  it("stores pattern and opacity like the old swatches", () => {
    expect(getTypeId(Swatch)).toBe(190);
    expect(getTypeId(Swatches)).toBe(199);
    const swatches = new Swatches();
    const make = (pattern: Pattern | null, name: string, opacity?: number): Swatch => {
      const swatch = new Swatch();
      swatch.setProperties(["_pt", "name"], [pattern, name]);
      if (opacity !== undefined) swatch.setProperty("_op", opacity);
      swatches.appendChild(swatch);
      return swatch;
    };
    const all = [
      make(new RGBColor([255, 0, 0]), "Red"),
      make(new CMYKColor([0, 0, 1, 0]), "Yellow", 0.5),
      make(
        Pattern.deserialize(
          'R#{"x":[{"p":0,"c":"C#[0,0,0]","o":1},{"p":1,"c":"C#[255,255,255]","o":1}]}',
        ),
        "Radial",
      ),
      make(new TexturePattern(), "Texture"),
    ];
    const blob = withoutIds(Node.store(swatches) as NodeBlob);
    expect(blob).toEqual(withoutIds(recordedSwatches.swatches as unknown as NodeBlob));
    expect(all.map((swatch) => swatch.isCMYK())).toEqual(recordedSwatches.isCMYK);
    const restored = Node.deserialize(Node.serialize(swatches)) as Swatches;
    expect(Node.serialize(restored)).toBe(Node.serialize(swatches));
  });

  it("only goes into swatches, and swatches into the scene", () => {
    expect(new Swatch().validateInsertion(new Swatches())).toBe(true);
    expect(new Swatch().validateInsertion(new TestStyles())).toBe(false);
    expect(new Swatches().validateInsertion(new Swatches())).toBe(false);
  });

  it("compares textures by their settings only", () => {
    const a = new Swatch(new TexturePattern());
    const b = new Swatch(new TexturePattern());
    expect(Swatch.equals(a, b)).toBe(true);
    (b.$_pt as TexturePattern).setAngle(1);
    expect(Swatch.equals(a, b)).toBe(false);
    expect(
      Swatch.equals(new Swatch(new RGBColor([1, 1, 1])), new Swatch(new RGBColor([1, 1, 1]))),
    ).toBe(true);
    expect(
      Swatch.equals(new Swatch(new RGBColor([1, 1, 1]), 0.5), new Swatch(new RGBColor([1, 1, 1]))),
    ).toBe(false);
  });
});
