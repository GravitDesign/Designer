import { describe, expect, it } from "vitest";
// Registers the shapes (NoisePattern draws a rectangle).
import "../../engine/scene/rectangle.ts";
import { AngularGradient } from "../../engine/style/angular-gradient.ts";
import { Background } from "../../engine/style/background.ts";
import { NoisePattern } from "../../engine/style/noise-pattern.ts";
import { TexturePattern } from "../../engine/style/texture-pattern.ts";
import { featureLabel, featureLines } from "./pattern-type-menu.ts";
import { SwatchesChangedEvent } from "./swatches-changed-event.ts";

describe("unsupported-features dialog text (UI-DIALOG-046)", () => {
  it("names noise before texture (noise is a texture)", () => {
    expect(featureLabel(new NoisePattern())).toBe("Noise");
    expect(featureLabel(new TexturePattern())).toBe("Texture Fill");
    expect(featureLabel(new Background())).toBe("Background Fill");
    expect(featureLabel(new AngularGradient())).toBe("Angular Gradient");
    expect(featureLabel({})).toBe("");
  });

  it("lists one line per feature and drops repeated element blocks", () => {
    const lines = featureLines([
      { name: "Box", features: [new NoisePattern(), new Background()] },
      { name: "Box", features: [new NoisePattern(), new Background()] },
      { name: "Star", features: [new AngularGradient()] },
    ]);
    expect(lines).toBe("• Noise [Box]<br>• Background Fill [Box]<br>• Angular Gradient [Star]");
  });
});

describe("SwatchesChangedEvent (UI-SWATCH-007)", () => {
  it("carries the scope", () => {
    const event = new SwatchesChangedEvent("document-linear-gradient");
    expect(event.scope).toBe("document-linear-gradient");
    expect(String(event)).toBe("[Object GSwatchesChangedEvent]");
  });
});
