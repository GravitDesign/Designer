import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { Transform } from "../math/transform.ts";
import { Node } from "../scene/node.ts";
import { Background } from "./background.ts";
import { getNoisePatternClass } from "./late-bound.ts";
import { NoisePattern } from "./noise-pattern.ts";
import { TexturePattern } from "./texture-pattern.ts";
import { GLNoiseEffect } from "./webgl/effects/gl-noise-effect.ts";

// GRectangle comes with a later cluster; this stand-in has what the noise
// pattern calls.
class FakeRectangle {
  transforms: Transform[] = [];
  effects: Node[] = [];
  layers: Node[] = [];
  transform(transform: Transform): void {
    this.transforms.push(transform);
  }
  getEffects() {
    return {
      appendChild: (node: Node) => this.effects.push(node),
      getFirstChild: () => this.effects[0] ?? null,
    };
  }
  getPaintLayers() {
    return {
      clearFillLayers: () => (this.layers = []),
      appendChild: (node: Node) => this.layers.push(node),
      insertChild: (node: Node) => this.layers.unshift(node),
      getFirstChild: () => this.layers[0] ?? null,
    };
  }
}

beforeAll(() => {
  Node._nameToNodeClassMap.set("rectangle", FakeRectangle as never);
});
afterAll(() => {
  Node._nameToNodeClassMap.delete("rectangle");
});

const node = (pattern: NoisePattern) => pattern._node as unknown as FakeRectangle;
const fill = (pattern: NoisePattern) =>
  (node(pattern).layers[0] as GLNoiseEffect | undefined)?.getProperty("_pt");
const shp = (pattern: NoisePattern) =>
  (node(pattern).effects[0] as GLNoiseEffect | undefined)?.getProperty("shp");

describe("NoisePattern", () => {
  it("is a stretched texture of a 5 x 5 noise rectangle", () => {
    const noise = new NoisePattern();
    expect(getNoisePatternClass()).toBe(NoisePattern);
    expect(noise).toBeInstanceOf(TexturePattern);
    expect(noise.getType()).toBe("original");
    expect(noise.getAmount()).toBe(1);
    expect(noise.getSizeMode()).toBe(TexturePattern.SizeMode.Percent);
    expect(node(noise).transforms).toEqual([new Transform().scaled(5, 5)]);
    expect(node(noise).effects[0]).toBeInstanceOf(GLNoiseEffect);
    expect(fill(noise)).toBeInstanceOf(Background);
    expect(shp(noise)).toEqual({ amount: 1, colored: false, transparency: true });
    expect(noise.isWebGL()).toBe(true);
    expect(noise.getAverageColor()).toEqual([128, 128, 128, 1]);
  });

  it("fills white for black and color noise, black for white noise", () => {
    const noise = new NoisePattern(0.3);
    noise.setType(NoisePattern.Type.Color);
    expect(fill(noise)).toBe(RGBColor.WHITE);
    expect(shp(noise)).toEqual({ amount: 0.3, colored: true, transparency: true });
    noise.setType(NoisePattern.Type.White);
    expect(fill(noise)).toBe(RGBColor.BLACK);
    expect(node(noise).layers).toHaveLength(1);
    noise.setType(NoisePattern.Type.Black);
    expect(fill(noise)).toBe(RGBColor.WHITE);
    expect(shp(noise)).toEqual({ amount: 0.3, colored: false, transparency: true });
  });

  it("compares amount and type on top of the texture settings", () => {
    const a = new NoisePattern();
    const b = new NoisePattern();
    // Each pattern has its own rectangle, which the texture comparison sees.
    expect(NoisePattern.equals(a, b)).toBe(false);
    b._node = a._node;
    expect(NoisePattern.equals(a, b)).toBe(true);
    b._amount = 0.5;
    expect(NoisePattern.equals(a, b)).toBe(false);
    expect(NoisePattern.equals(null, null)).toBe(true);
  });

  it("adds amount and type to the texture blob", () => {
    const noise = new NoisePattern(0.8);
    noise.setType(NoisePattern.Type.Color);
    // The rectangle (saved as "n") needs the real GRectangle.
    noise._node = null;
    const blob = noise._serializeToBlob({ save: true });
    expect(blob).toMatchObject({ amount: 0.8, type: "color", s: "percent", w: 100, h: 100 });
  });
});
