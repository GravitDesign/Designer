import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXPECTED_ROOT } from "../../../parity/support/env.ts";
import { getTypeId } from "../core/object.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { getTexturePatternClass } from "../paint/late-bound.ts";
import { Pattern } from "./pattern.ts";
import { TexturePattern } from "./texture-pattern.ts";

interface TextureState {
  serialized: string;
  repeat: string;
  size: string;
  scale: string;
  position: string;
  width: number | null;
  height: number | null;
  angle: number;
  tileSize: number;
  mask: boolean;
  url: string | null;
}

const recorded = JSON.parse(
  fs.readFileSync(path.join(EXPECTED_ROOT, "engine-model/colors/patterns.json"), "utf8"),
) as Record<string, TextureState> & {
  textureRoundTrip: string;
  textureEquals: boolean[];
  textureCSS: string;
};

function state(texture: TexturePattern): Omit<TextureState, "transform"> {
  return {
    serialized: Pattern.serialize(texture) as string,
    repeat: texture.getRepeatMode(),
    size: texture.getSizeMode(),
    scale: texture.getScaleMode(),
    position: texture.getPosition(),
    width: texture.getWidth(),
    height: texture.getHeight(),
    angle: texture.getAngle(),
    tileSize: texture.getTileSize(),
    mask: texture.isMask(),
    url: texture.getRawUrl() ?? null,
  };
}

function withoutTransform(value: TextureState): Omit<TextureState, "transform"> {
  const copy = { ...value } as Record<string, unknown>;
  delete copy["transform"];
  return copy as Omit<TextureState, "transform">;
}

describe("TexturePattern", () => {
  it("registers as T with the old type id and for the paint code", () => {
    expect(getTypeId(TexturePattern)).toBe(66);
    expect(getTexturePatternClass()).toBe(TexturePattern);
    expect(
      Pattern.deserialize((recorded["textureDefault"] as TextureState).serialized),
    ).toBeInstanceOf(TexturePattern);
  });

  it("has the old defaults and presets", () => {
    const texture = new TexturePattern();
    expect(state(texture)).toEqual(withoutTransform(recorded["textureDefault"] as TextureState));
    expect(texture.getTransform()).toBeUndefined();
    for (const preset of Object.keys(TexturePattern.ScaleSettings)) {
      const t = new TexturePattern();
      (TexturePattern.ScaleSettings[preset] as (texture: TexturePattern) => void)(t);
      expect(state(t)).toEqual(withoutTransform(recorded["preset-" + preset] as TextureState));
    }
  });

  it("serializes every setting and round-trips", () => {
    const t = new TexturePattern();
    t.setRepeatMode(TexturePattern.RepeatMode.Horizontal);
    t.setSizeMode(TexturePattern.SizeMode.Length);
    t.setPosition(TexturePattern.PositionMode.Right);
    t.setWidth(40);
    t.setHeight(30);
    t.setAngle(0.5);
    t.setTileSize(12);
    t.setMask(true);
    t.setTransform(new Transform(2, 0, 0, 2, 1, 1));
    expect(state(t)).toEqual(withoutTransform(recorded["textureSet"] as TextureState));
    const copy = Pattern.deserialize(Pattern.serialize(t)) as TexturePattern;
    expect(Pattern.serialize(copy)).toBe(recorded.textureRoundTrip);
    expect([
      TexturePattern.equals(t, copy),
      TexturePattern.equals(t, new TexturePattern()),
    ]).toEqual(recorded.textureEquals);
    expect(t.asCSSBackground()).toBe(recorded.textureCSS);
    // Saving leaves the resolved url out.
    expect(t.serialize({ save: true })).not.toContain("surl");
  });

  it("compares transforms and treats two nulls as equal", () => {
    const a = new TexturePattern();
    const b = new TexturePattern();
    expect(TexturePattern.equals(a, b)).toBe(true);
    a.setTransform(new Transform(1, 0, 0, 1, 3, 0));
    expect(TexturePattern.equals(a, b)).toBe(false);
    b.setTransform(new Transform(1, 0, 0, 1, 3, 0));
    expect(TexturePattern.equals(a, b)).toBe(true);
    expect(TexturePattern.equals(null, null)).toBe(true);
  });

  it("restores missing fields with the defaults", () => {
    const t = new TexturePattern();
    t.deserialize('{"u":null,"r":"repeat"}');
    expect(t.getSizeMode()).toBe("auto");
    expect(t.getPosition()).toBe("auto");
    expect(t.getScaleMode()).toBe("tile");
    expect(t.getTileSize()).toBe(1);
    expect(t.getAngle()).toBe(0);
    expect(t.getTransform()).toBeNull();
  });

  it("returns the identity transform without bounds or texture", () => {
    const t = new TexturePattern();
    expect(t.createTextureTransform(null, new Transform()).isIdentity()).toBe(true);
    expect(t.createTextureTransform(new Rect(0, 0, 10, 10), new Transform()).isIdentity()).toBe(
      true,
    );
  });

  it("positions and scales a texture box in the bounds", () => {
    const t = new TexturePattern();
    // A stand-in node with a 10 x 5 paint box (no image: scales go into _scaleX/_scaleY).
    t._node = { getPaintBBox: () => new Rect(0, 0, 10, 5) } as never;
    t.setSizeMode(TexturePattern.SizeMode.Contain);
    t.setPosition(TexturePattern.PositionMode.Center);
    const result = t.createTextureTransform(new Rect(0, 0, 40, 40), new Transform());
    // Contain: scale 4 → the box is 40 x 20, centered vertically.
    expect(t._scaleX).toBe(4);
    expect(t._scaleY).toBe(4);
    expect(result.getMatrix()).toEqual([1, 0, 0, 1, 0, 10]);
    t.setPosition(TexturePattern.PositionMode.Bottom);
    expect(t.createTextureTransform(new Rect(0, 0, 40, 40), new Transform()).getMatrix()).toEqual([
      1, 0, 0, 1, 0, 20,
    ]);
  });

  it("averages to grey", () => {
    expect(new TexturePattern().getAverageColor()).toEqual([128, 128, 128, 1]);
    expect(new TexturePattern().toString()).toBe("[Object GTexturePattern]");
  });
});
