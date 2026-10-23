import { describe, expect, it } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { AngularGradient } from "./angular-gradient.ts";
import { Pattern } from "./pattern.ts";
import { GLAngularGradientShader } from "./webgl/shaders/gl-angular-gradient-shader.ts";

const stops = () => [
  { position: 0, color: new RGBColor([255, 0, 0]), opacity: 1 },
  { position: 1, color: new RGBColor([0, 0, 255]), opacity: 0.5 },
];

describe("AngularGradient", () => {
  it("starts at -PI with scale 0.5 and saves both", () => {
    const gradient = new AngularGradient();
    expect(gradient._a0).toBe(-Math.PI);
    expect(Pattern.serialize(gradient)).toBe(
      'A#{"s":0.5,"x":[{"p":0,"c":"C#[255,255,255]","o":1},{"p":1,"c":"C#[0,0,0]","o":1}],"a0":-3.141592653589793}',
    );
  });

  it("leaves out a start angle of 0 and loads a missing one as 0", () => {
    const gradient = new AngularGradient(stops(), 1, 0.5, 0.5, 0);
    const saved = Pattern.serialize(gradient) as string;
    expect(saved).not.toContain("a0");
    const loaded = Pattern.deserialize(saved) as AngularGradient;
    expect(loaded).toBeInstanceOf(AngularGradient);
    expect(loaded._a0).toBe(0);
    expect(loaded.getScale()).toBe(1);
  });

  it("squeezes the stops of an old end angle and adds a transparent tail", () => {
    const loaded = Pattern.deserialize(
      'A#{"x":[{"p":0,"c":"C#[255,0,0]"},{"p":1,"c":"C#[0,0,255]"}],"a0":0,"a1":3.141592653589793}',
    );
    expect(Pattern.serialize(loaded)).toBe(
      'A#{"x":[{"p":0,"c":"C#[255,0,0]","o":1},{"p":0.5,"c":"C#[0,0,255]","o":1},{"p":0.500001,"c":"C#[0,0,255]","o":0},{"p":1,"c":"C#[0,0,255]","o":0}]}',
    );
  });

  it("compares the start angle unless transforms are ignored", () => {
    const a = new AngularGradient(stops(), 1, 0.5, 0.5, 1);
    const b = new AngularGradient(stops(), 1, 0.5, 0.5, 2);
    expect(AngularGradient.equals(a, a.clone())).toBe(true);
    expect(AngularGradient.equals(a, b)).toBe(false);
    expect(AngularGradient.equals(a, b, true)).toBe(true);
    expect(AngularGradient.equals(a, {})).toBe(false);
  });

  it("is a WebGL pattern painted by the angular shader", () => {
    const gradient = new AngularGradient();
    expect(gradient.isWebGL()).toBe(true);
    expect(gradient.getShaderClass()).toBe(GLAngularGradientShader);
    expect(gradient.isAffectedByGLBug()).toBe(true);
    expect(gradient.toString()).toBe("[Object GAngularGradient]");
    // No WebGL in Node: nothing to paint.
    expect(gradient.getGradient(1, null)).toBe(null);
  });
});
