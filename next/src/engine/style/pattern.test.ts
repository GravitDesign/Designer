import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXPECTED_ROOT } from "../../../parity/support/env.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { Pattern } from "./pattern.ts";

class Unregistered extends Pattern {}

describe("Pattern", () => {
  it("serializes registered classes as id#payload", () => {
    expect(Pattern.serialize(new RGBColor([1, 2, 3]))).toBe("C#[1,2,3]");
    expect(Pattern.serialize(null)).toBeNull();
    expect(() => Pattern.serialize(new Unregistered())).toThrow("Unregistered Pattern Class.");
  });

  it("creates the class registered under the id", () => {
    expect(Pattern.deserialize("C#[1,2,3]")).toBeInstanceOf(RGBColor);
    expect(() => Pattern.deserialize("Z#[1]")).toThrow("Unregistered Pattern Class.");
    // No id before the '#': nothing.
    expect(Pattern.deserialize("#[1]")).toBeNull();
    expect(Pattern.deserialize("garbage")).toBeNull();
    expect(Pattern.deserialize("")).toBeNull();
  });

  it("draws the old chessboard behind CSS backgrounds", () => {
    const recorded = JSON.parse(
      fs.readFileSync(path.join(EXPECTED_ROOT, "engine-model/colors/patterns.json"), "utf8"),
    ) as { chessboard: string };
    expect(Pattern.asCSSBackground()).toBe(recorded.chessboard);
    expect(Pattern.asCSSBackground(new RGBColor([255, 0, 0]), 0.5)).toBe(
      "linear-gradient(rgba(255,0,0,0.5), rgba(255,0,0,0.5))," + recorded.chessboard,
    );
    expect(Pattern.asCSSBackground(new RGBColor([255, 0, 0]), "x")).toBe(
      "linear-gradient(#FF0000, #FF0000)," + recorded.chessboard,
    );
  });

  it("has the base defaults", () => {
    const base = new Pattern();
    expect(base.serialize()).toBe("");
    expect(base.getAverageColor()).toBeNull();
    expect(base.isWebGL()).toBe(false);
    expect(() => base.clone()).toThrow("Not Supported");
    expect(() => base.asCSSBackground()).toThrow("Not Supported");
    expect(Pattern.MIME_TYPE).toBe("application/gravit+pattern");
  });
});
