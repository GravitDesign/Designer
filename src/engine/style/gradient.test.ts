import { describe, expect, it } from "vitest";
import { CMYKColor } from "../color/cmyk-color.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { Transform } from "../math/transform.ts";
import { Gradient, type GradientStop } from "./gradient.ts";
import { LinearGradient } from "./linear-gradient.ts";
import { Pattern } from "./pattern.ts";
import { RadialGradient } from "./radial-gradient.ts";

const stops = (): GradientStop[] => [
  { position: 0.8, color: new RGBColor([0, 0, 255]), opacity: 1 },
  { position: -0.5, color: new RGBColor([255, 0, 0]), opacity: 0.5 },
  { position: 0.3, color: new CMYKColor([0, 1, 0, 0]), opacity: 0.25 },
];

describe("Gradient", () => {
  it("clamps and sorts the stops, white to black by default", () => {
    const g = new Gradient(stops());
    expect(g.getStops().map((s) => s.position)).toEqual([0, 0.3, 0.8]);
    const plain = new Gradient();
    expect(plain.getStops().map((s) => [s.position, s.color, s.opacity])).toEqual([
      [0, RGBColor.WHITE, 1],
      [1, RGBColor.BLACK, 1],
    ]);
    expect(plain.getScale()).toBe(1);
    expect(plain.getTransform()).toBeNull();
  });

  it("averages the stops", () => {
    expect(new Gradient().getAverageColor()).toEqual([127.5, 127.5, 127.5, 1]);
  });

  it("writes only non-default values and always the stop opacity", () => {
    // A linear gradient's focus x defaults to 0, so it is written.
    expect(new LinearGradient().serialize()).toBe(
      '{"fx":0,"x":[{"p":0,"c":"C#[255,255,255]","o":1},{"p":1,"c":"C#[0,0,0]","o":1}]}',
    );
    const g = new LinearGradient(null, 2, 0.7, 0.3, 0.6, new Transform(1, 0, 0, 1, 5, 5));
    expect(g.serialize()).toBe(
      '{"s":2,"t":[1,0,0,1,5,5],"fx":0.3,"fy":0.6,' +
        '"x":[{"p":0,"c":"C#[255,255,255]","o":1},{"p":1,"c":"C#[0,0,0]","o":1}],"r":0.7}',
    );
    const back = Pattern.deserialize(Pattern.serialize(g)) as LinearGradient;
    expect(back.serialize()).toBe(g.serialize());
    expect(LinearGradient.equals(back, g)).toBe(true);
  });

  it("merges legacy opacity-only stops into the color stops", () => {
    const g = Pattern.deserialize(
      'L#{"x":[{"p":0,"c":"C#[255,0,0]"},{"p":1,"c":"C#[0,0,255]"},{"p":0,"o":0.2},{"p":1,"o":0.7},{"p":0.5,"o":0.1}]}',
    ) as LinearGradient;
    expect(g.getStops().map((s) => [s.position, s.opacity])).toEqual([
      [0, 0.2],
      [1, 0.7],
    ]);
  });

  it("compares transform, scale and focus unless told not to", () => {
    const a = new Gradient(null, 1, 0.5, 0.5, new Transform(2, 0, 0, 2, 0, 0));
    const b = new Gradient(null, 1, 0.5, 0.5, null);
    expect(Gradient.equals(a, b)).toBe(false);
    expect(Gradient.equals(a, b, true)).toBe(true);
    expect(Gradient.equals(null, null)).toBe(true);
    expect(() => Gradient.equals(a, null)).toThrow(TypeError);
    const c = new Gradient([{ position: 0, color: new RGBColor([1, 1, 1]), opacity: 1 }]);
    expect(Gradient.equals(c, b, true)).toBe(false);
  });

  it("writes CSS color stops", () => {
    const g = new Gradient(stops());
    expect(g.toScreenCSS()).toBe("rgba(255,0,0,0.5) 0%, rgba(255,0,255,0.25) 30%, #0000FF 80%");
    expect(g.toScreenCSS(0.5)).toBe(
      "rgba(255,0,0,0.25) 0%, rgba(255,0,255,0.125) 30%, rgba(0,0,255,0.5) 80%",
    );
  });
});

describe("LinearGradient", () => {
  it("defaults focus x to 0 and angle to 0", () => {
    const g = new LinearGradient();
    expect(g._fx).toBe(0);
    expect(g.getAngle()).toBe(0);
    expect(g.asCSSBackground()).toBe("linear-gradient(90deg, #FFFFFF 0%, #000000 100%)");
    expect(new LinearGradient(null, 1, Math.PI / 2).asCSSBackground()).toBe(
      "linear-gradient(180deg, #FFFFFF 0%, #000000 100%)",
    );
  });

  it("is never equal when the transform is ignored (old quirk)", () => {
    expect(LinearGradient.equals(new LinearGradient(), new LinearGradient())).toBe(true);
    expect(LinearGradient.equals(new LinearGradient(), new LinearGradient(), true)).toBe(false);
    expect(LinearGradient.equals(new LinearGradient(null, 1, 1), new LinearGradient())).toBe(false);
    expect(LinearGradient.equals(new LinearGradient(), new RadialGradient())).toBe(false);
  });

  it("clones stops, scale, angle, focus and transform", () => {
    const g = new LinearGradient(stops(), 2, 0.7, 0.3, 0.6, new Transform(1, 0, 0, 1, 5, 5));
    const copy = g.clone();
    expect(copy).not.toBe(g);
    expect(copy.getStops()).not.toBe(g.getStops());
    expect(copy.serialize()).toBe(g.serialize());
  });
});

describe("RadialGradient", () => {
  it("defaults the scale to 0.5 and the center to 0.5/0.5", () => {
    const g = new RadialGradient();
    expect(g.getScale()).toBe(0.5);
    expect(g.asCSSBackground()).toBe(
      "radial-gradient(ellipse at 50% 50%, #FFFFFF 0%, #000000 100%)",
    );
    expect(g.serialize()).toBe(
      '{"s":0.5,"x":[{"p":0,"c":"C#[255,255,255]","o":1},{"p":1,"c":"C#[0,0,0]","o":1}]}',
    );
  });

  it("BUG-002: keeps a moved center through save and load", () => {
    const moved = new RadialGradient(null, 0.8, 0.4, 0.6, 0.2, 0.9);
    const saved = Pattern.serialize(moved) as string;
    // Written exactly as the old app writes it, so old files stay compatible.
    expect(saved).toBe(
      'R#{"s":0.8,"fx":0.4,"fy":0.6,"x":[{"p":0,"c":"C#[255,255,255]","o":1},' +
        '{"p":1,"c":"C#[0,0,0]","o":1}],"_cx":0.2,"_cy":0.9}',
    );
    const back = Pattern.deserialize(saved) as RadialGradient;
    expect(back._cx).toBe(0.2);
    expect(back._cy).toBe(0.9);
    expect(back.asCSSBackground()).toContain("ellipse at 20% 90%");
    expect(Pattern.serialize(back)).toBe(saved);
    expect(RadialGradient.equals(back, moved)).toBe(true);
    expect(back.getScale()).toBe(0.8);
    // A file written by the old app (as the SVG, PDF and Sketch importers do).
    const imported = Pattern.deserialize(
      'R#{"x":[{"p":0,"c":"C#[0,0,0]"}],"_cx":0.25,"_cy":0.75}',
    ) as RadialGradient;
    expect(imported.asCSSBackground()).toContain("ellipse at 25% 75%");
    // The keys the old reader looked for still work.
    const fromCx = Pattern.deserialize(
      'R#{"x":[{"p":0,"c":"C#[0,0,0]"}],"cx":0.1,"cy":0.3}',
    ) as RadialGradient;
    expect(fromCx.asCSSBackground()).toContain("ellipse at 10% 30%");
    // Without a center it stays at 0.5/0.5.
    const centered = Pattern.deserialize('R#{"x":[]}') as RadialGradient;
    expect(centered.asCSSBackground()).toContain("ellipse at 50% 50%");
    // Without "s" a loaded radial gradient has scale 1, not 0.5.
    expect(centered.getScale()).toBe(1);
  });

  it("compares the center unless the transform is ignored", () => {
    const a = new RadialGradient(null, 0.5, 0.5, 0.5, 0.1, 0.1);
    expect(RadialGradient.equals(new RadialGradient(), new RadialGradient())).toBe(true);
    expect(RadialGradient.equals(a, new RadialGradient())).toBe(false);
    expect(RadialGradient.equals(a, new RadialGradient(), true)).toBe(true);
    expect(a.clone().asCSSBackground()).toBe(a.asCSSBackground());
  });
});
