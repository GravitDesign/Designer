import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXPECTED_ROOT } from "../../../parity/support/env.ts";
import { CMYKColor } from "../color/cmyk-color.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { getTypeId } from "../core/object.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { Transform } from "../math/transform.ts";
import { Node } from "../scene/node.ts";
import { NodeChange } from "../scene/node-change.ts";
import type { NodeBlob } from "../serialize/blob.ts";
import { BorderPaintLayer } from "./border-paint-layer.ts";
import { FillPaintLayer } from "./fill-paint-layer.ts";
import { PaintLayer } from "./paint-layer.ts";
import { PaintLayers } from "./paint-layers.ts";
import { Pattern } from "./pattern.ts";
import "./stylable.ts";
import { TexturePattern } from "./texture-pattern.ts";

const recorded = JSON.parse(
  fs.readFileSync(
    path.join(EXPECTED_ROOT, "engine-model/styles/paint-layers-document.json"),
    "utf8",
  ),
) as { blob: { _layers: { $: NodeBlob[] } } };

/** A stored layer without its random id. */
function blobOf(node: Node): NodeBlob {
  const blob = Node.store(node) as NodeBlob;
  delete blob["@id"];
  return blob;
}

function recordedLayer(index: number): NodeBlob {
  const blob = { ...(recorded.blob._layers.$[index] as NodeBlob) };
  delete blob["@id"];
  return blob;
}

function set(node: PaintLayer, values: Record<string, unknown>): void {
  node.setProperties(Object.keys(values), Object.values(values));
}

describe("paint layers", () => {
  it("have no refs property, like the old layers and their container", () => {
    for (const layer of [new FillPaintLayer(), new BorderPaintLayer()]) {
      expect(layer.hasProperty("refs")).toBe(false);
      expect(layer.getProperty("refs", false, "default")).toBe("default");
    }
    expect(Object.hasOwn(new PaintLayers(), "$refs")).toBe(false);
  });

  it("keep the old type ids and node names", () => {
    expect(getTypeId(PaintLayer)).toBe(75);
    expect(getTypeId(FillPaintLayer)).toBe(77);
    expect(getTypeId(BorderPaintLayer)).toBe(78);
    expect(getTypeId(PaintLayers)).toBe(79);
    expect(Node.getName(new FillPaintLayer())).toBe("fillPaintLayer");
    expect(Node.getName(new BorderPaintLayer())).toBe("borderPaintLayer");
    expect(Node.getName(new PaintLayers())).toBe("paintLayers");
  });

  it("store only the values that differ from the defaults, in the old order", () => {
    const fill = new FillPaintLayer(new RGBColor([255, 0, 0]));
    expect(blobOf(fill)).toEqual(recordedLayer(0));
    const gradient = new FillPaintLayer(
      Pattern.deserialize(
        'L#{"x":[{"p":0,"c":"C#[0,0,0]","o":1},{"p":1,"c":"C#[255,255,255]","o":0.5}],"r":0.5}',
      ),
    );
    set(gradient, { _op: 0.5, _bl: "multiply", _vs: false, _px: new Transform(1, 0, 0, 1, 5, 5) });
    expect(JSON.stringify(blobOf(gradient))).toBe(JSON.stringify(recordedLayer(1)));
    const cmyk = new FillPaintLayer(new CMYKColor([0, 1, 0.5, 0.1]));
    set(cmyk, { _bl: "color" });
    expect(blobOf(cmyk)).toEqual(recordedLayer(2));
    const border = new BorderPaintLayer(new RGBColor([0, 0, 255]));
    set(border, {
      _bw: 7,
      _ba: "O",
      _blc: "round",
      _blj: "bevel",
      _bml: 6,
      _bds: [4, 2, 1],
      _bs: true,
      _op: 0.8,
    });
    expect(JSON.stringify(blobOf(border))).toBe(JSON.stringify(recordedLayer(3)));
  });

  it("round-trip through restore", () => {
    const border = new BorderPaintLayer(new RGBColor([0, 255, 0]));
    set(border, { _bw: 2, _ba: "I", _btms: 0.5, _bhmo: true, _bhmi: 0 });
    const json = Node.serialize(border) as string;
    const restored = Node.deserialize(json) as BorderPaintLayer;
    expect(restored).toBeInstanceOf(BorderPaintLayer);
    expect(Node.serialize(restored)).toBe(json);
    expect(restored.getProperty("_pt")).toBeInstanceOf(RGBColor);
  });

  it("read the legacy fill and border keys", () => {
    const fill = Node.restore({
      "@": "fillPaintLayer",
      _fpt: "C#[1,2,3]",
      _fop: 0.5,
    }) as FillPaintLayer;
    expect(Pattern.serialize(fill.$_pt)).toBe("C#[1,2,3]");
    expect(fill.$_op).toBe(0.5);
    const border = Node.restore({
      "@": "borderPaintLayer",
      _bpt: "C#[4,5,6]",
      _bmo: true,
      _bmi: false,
      _bhm: [1, 0, 0, 2, 3, 3],
    }) as BorderPaintLayer;
    expect(Pattern.serialize(border.$_pt)).toBe("C#[4,5,6]");
    expect(border.getProperties(["_bhmo", "_btmo", "_bhmi", "_btmi"])).toEqual([true, true, 0, 0]);
    expect(border.getProperty("_bhm")).toBeInstanceOf(VertexContainer);
    const booleans = Node.restore({ "@": "borderPaintLayer", _btmi: true }) as BorderPaintLayer;
    expect(booleans.getProperty("_btmi")).toBe(1);
  });

  it("know when they paint something", () => {
    const fill = new FillPaintLayer(new RGBColor([1, 1, 1]));
    expect(fill.hasStyle()).toBe(true);
    fill.setProperty("_op", 0);
    expect(fill.hasStyle()).toBe(false);
    expect(new FillPaintLayer().hasStyle()).toBe(false);
    const border = new BorderPaintLayer(new RGBColor([1, 1, 1]));
    expect(border.hasStyle()).toBe(true);
    border.setProperty("_bw", 0);
    expect(border.hasStyle()).toBe(false);
  });

  it("separate color-blended fills and texture masks", () => {
    const fill = new FillPaintLayer(new RGBColor([1, 1, 1]), 1, true, "color");
    expect(fill.isSeparateLayer()).toBe(true);
    expect(new BorderPaintLayer(null, 1, true, "color").isSeparateLayer()).toBe(false);
    const texture = new TexturePattern();
    expect(new FillPaintLayer(texture).isMask()).toBe(false);
    texture.setMask(true);
    expect(new FillPaintLayer(texture).isMask()).toBe(true);
  });

  it("keep WebGL blend modes even without WebGL (old key test)", () => {
    const layer = new FillPaintLayer(null, 1, true, "linear_burn");
    expect(layer.getBlendingForContext({ configuration: { noWebGL: true } })).toBe("linear_burn");
    expect(new FillPaintLayer().getBlendingForContext({ configuration: {} })).toBeNull();
  });

  it("compare by their paint properties", () => {
    const a = new FillPaintLayer(new RGBColor([1, 2, 3]));
    const b = new FillPaintLayer(new RGBColor([1, 2, 3]));
    expect(FillPaintLayer.equals(a, b)).toBe(true);
    b.setProperty("_vs", false);
    expect(FillPaintLayer.equals(a, b)).toBe(true);
    b.setProperty("_op", 0.5);
    expect(FillPaintLayer.equals(a, b)).toBe(false);
    const c = new BorderPaintLayer(new RGBColor([1, 2, 3]));
    const d = new BorderPaintLayer(new RGBColor([1, 2, 3]));
    expect(BorderPaintLayer.equals(c, d)).toBe(true);
    d.setProperty("_bw", 3);
    expect(BorderPaintLayer.equals(c, d)).toBe(false);
  });

  it("only go into a paint layers container", () => {
    const layers = new PaintLayers();
    expect(new FillPaintLayer().validateInsertion(layers)).toBe(true);
    expect(new FillPaintLayer().validateInsertion(new FillPaintLayer())).toBe(false);
  });
});

describe("PaintLayers", () => {
  function make(): PaintLayers {
    const layers = new PaintLayers();
    layers.appendChild(new FillPaintLayer(new RGBColor([1, 1, 1])));
    layers.appendChild(new FillPaintLayer());
    layers.appendChild(new BorderPaintLayer(new RGBColor([3, 3, 3])));
    return layers;
  }

  it("filters layers by kind and style", () => {
    const layers = make();
    expect(layers.getLayers().length).toBe(3);
    expect(layers.getFillLayers().length).toBe(2);
    expect(layers.getFillLayers(true).length).toBe(1);
    expect(layers.getBorderLayers().length).toBe(1);
    expect(layers.hasStyleFill()).toBe(true);
    expect(layers.hasStyleBorder()).toBe(true);
  });

  it("clears layers by kind", () => {
    const layers = make();
    layers.clearBorderLayers();
    expect(layers.getChildren().map((n) => Node.getName(n))).toEqual([
      "fillPaintLayer",
      "fillPaintLayer",
    ]);
    layers.clearFillLayers();
    expect(layers.getChildren()).toEqual([]);
    const again = make();
    again.clearLayers();
    expect(again.getChildren()).toEqual([]);
  });

  it("detects mask layers that need mask painting", () => {
    const mask = (): TexturePattern => {
      const t = new TexturePattern();
      t.setMask(true);
      return t;
    };
    const normalUnderMask = new PaintLayers();
    normalUnderMask.appendChild(new FillPaintLayer(new RGBColor([1, 1, 1])));
    normalUnderMask.appendChild(new FillPaintLayer(mask()));
    expect(normalUnderMask.hasFillMaskLayers()).toBe(false);
    const maskUnderNormal = new PaintLayers();
    maskUnderNormal.appendChild(new FillPaintLayer(mask()));
    maskUnderNormal.appendChild(new FillPaintLayer(new RGBColor([1, 1, 1])));
    expect(maskUnderNormal.hasFillMaskLayers()).toBe(true);
    const twoMasks = new PaintLayers();
    twoMasks.appendChild(new FillPaintLayer(mask()));
    twoMasks.appendChild(new FillPaintLayer(mask()));
    expect(twoMasks.hasFillMaskLayers()).toBe(true);
  });

  it("detects separate fills", () => {
    const layers = make();
    expect(layers.hasSeparateFillLayer()).toBe(false);
    (layers.getFirstChild() as FillPaintLayer).setProperty("_bl", "color");
    expect(layers.hasSeparateFillLayer()).toBe(true);
  });

  it("turns legacy flat style keys into layers", () => {
    const layers = new PaintLayers();
    layers._notifyChange(NodeChange.Restore, {
      blob: { _fpt: "C#[9,9,9]", _bw: 4, _bpt: "C#[1,1,1]" },
    });
    expect(layers.getChildren().map((n) => Node.getName(n))).toEqual([
      "fillPaintLayer",
      "borderPaintLayer",
    ]);
    expect(Pattern.serialize((layers.getFillLayers()[0] as FillPaintLayer).$_pt)).toBe("C#[9,9,9]");
    expect((layers.getBorderLayers()[0] as BorderPaintLayer).$_bw).toBe(4);
  });
});
