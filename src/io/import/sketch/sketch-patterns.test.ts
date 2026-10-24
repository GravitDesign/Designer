import { describe, expect, it } from "vitest";
import { Node } from "../../../engine/scene/node.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import recorded from "./__fixtures__/old-outputs.json" with { type: "json" };
import { sceneNode } from "./scene-node.ts";
import { SketchAngularGradient } from "./sketch-angular-gradient.ts";
import { SketchColor } from "./sketch-color.ts";
import type { SketchColorData, SketchGradientData } from "./sketch-data.ts";
import { SketchLinearGradient } from "./sketch-linear-gradient.ts";
import type { SketchPattern } from "./sketch-pattern.ts";
import { SketchRadialGradient } from "./sketch-radial-gradient.ts";
import { SketchText } from "./sketch-text.ts";

const c = (red: number, green: number, blue: number, alpha: number): SketchColorData => ({
  red,
  green,
  blue,
  alpha,
});
const stops = [
  { position: 0, color: c(1, 0, 0, 1) },
  { position: 0.3, color: c(0, 1, 0, 0.5) },
  { position: 1, color: c(0, 0, 1, 1) },
];
const gradient = (data: Partial<SketchGradientData>) => ({ stops, ...data }) as SketchGradientData;

const CASES: Record<string, () => SketchPattern> = {
  "linear-down": () => new SketchLinearGradient(gradient({ from: "{0.5, 0}", to: "{0.5, 1}" })),
  "linear-diag": () => new SketchLinearGradient(gradient({ from: "{0, 0}", to: "{1, 1}" })),
  "linear-left": () => new SketchLinearGradient(gradient({ from: "{1, 0.5}", to: "{0, 0.5}" })),
  "linear-point": () =>
    new SketchLinearGradient(gradient({ from: "{0.5, 0.5}", to: "{0.5, 0.5}" })),
  "radial-ellipse": () =>
    new SketchRadialGradient(gradient({ from: "{0.5, 0.5}", to: "{0.5, 1}", elipseLength: 0.5 })),
  "radial-round": () =>
    new SketchRadialGradient(gradient({ from: "{0.3, 0.3}", to: "{1, 0.3}", elipseLength: 1 })),
  "radial-zero": () =>
    new SketchRadialGradient(gradient({ from: "{0.5, 0.5}", to: "{0.8, 0.9}", elipseLength: 0 })),
  "radial-none": () => new SketchRadialGradient(gradient({ from: "{0.2, 0.6}", to: "{0.9, 0.1}" })),
  "radial-vertical": () =>
    new SketchRadialGradient(gradient({ from: "{0.5, 0.2}", to: "{0.5, 0.9}", elipseLength: 2 })),
  angular: () =>
    new SketchAngularGradient(
      gradient({
        stops: [
          { position: 0.8, color: c(0, 0, 1, 1) },
          { position: 0, color: c(1, 0, 0, 1) },
          { position: 0.3, color: c(0, 1, 0, 1) },
          { position: 1, color: c(0, 0, 0, 1) },
        ],
      }),
    ),
  color: () => new SketchColor(c(0.86, 0.16, 0.161, 0.4)),
};

describe("Sketch paints", () => {
  for (const [name, make] of Object.entries(CASES)) {
    it(`sets the ${name} paint like the old importer`, () => {
      const layer = new Stylable.FillPaintLayer();
      make().applyTo(sceneNode(layer));
      const json = (Node.serialize(layer) as string).replace(/"@id":"[^"]+",?/, "");
      expect(json).toBe((recorded.gradients as Record<string, { ok?: string }>)[name]?.ok);
    });
  }
});

/** Names the old importer read differently, with the fixed reading. */
const FIXED_QUERIES: Record<string, Partial<ReturnType<typeof SketchText.composeQuery>>> = {
  // The old importer took "Regular" for italic (BUG-106).
  "OpenSans-Regular": { fontStyle: "N" },
};

describe("SketchText.composeQuery", () => {
  for (const [name, query] of Object.entries(recorded.composeQuery)) {
    const fixed = FIXED_QUERIES[name];
    it(`reads ${JSON.stringify(name)} ${fixed ? "upright (BUG-106)" : "like the old importer"}`, () => {
      expect(SketchText.composeQuery(name)).toEqual({ ...query, ...fixed });
    });
  }

  it.each([
    ["Lato-Regular", "N"],
    ["Lato-RegularItalic", "I"],
    ["Lato-Oblique", "I"],
    ["Lato-Italic", "I"],
  ])("reads the style of %s as %s (BUG-106)", (name, style) => {
    expect(SketchText.composeQuery(name).fontStyle).toBe(style);
  });
});
