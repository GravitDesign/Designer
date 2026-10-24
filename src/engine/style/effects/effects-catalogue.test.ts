import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXPECTED_ROOT } from "../../../../parity/support/env.ts";
import { getTypeId } from "../../core/object.ts";
import { Rect } from "../../math/rect.ts";
import { Node } from "../../scene/node.ts";
import type { Effect } from "../effect.ts";
import { Effects } from "../effects.ts";
import { Pattern } from "../pattern.ts";
import "../stylable.ts";
import { BlurEffect } from "./blur-effect.ts";
import { ColorGradingEffect } from "./color-grading-effect.ts";
import { ContactShadowEffect } from "./contact-shadow-effect.ts";
import { DropShadowEffect } from "./drop-shadow-effect.ts";
import { InnerShadowEffect } from "./inner-shadow-effect.ts";
import { LongShadowEffect } from "./long-shadow-effect.ts";
import { MirrorEffect } from "./mirror-effect.ts";
import { OverlayEffect } from "./overlay-effect.ts";

// What the old app recorded for every effect class
// (parity/scenarios/engine-model/styles.spec.ts, effects-catalogue).
const recorded = JSON.parse(
  fs.readFileSync(path.join(EXPECTED_ROOT, "engine-model/styles/effects-catalogue.json"), "utf8"),
) as Record<string, Record<string, unknown>>;

// The values the scenario sets (effects-data.ts), decoded.
const VALUES: Record<string, Record<string, unknown>> = {
  GBlurEffect: { r: 20, b: true },
  GDropShadowEffect: { r: 12, x: 6, y: -8, pat: "pattern:C#[255,0,0]", opc: 0.3 },
  GInnerShadowEffect: { r: 9, x: -3, y: 4, pat: "pattern:C#[0,0,255]", opc: 0.8 },
  GOverlayEffect: { pat: "pattern:C#[0,255,0]", opc: 0.5, alm: true },
  GMirrorEffect: { rfh: 0.6, pad: 10, opc: 0.2 },
  GColorGradingEffect: {
    cp: {
      a: [
        [0, 0],
        [128, 200],
        [255, 255],
      ],
      r: null,
    },
  },
  GContactShadowEffect: { r: 30, a: 20, o: 10, opc: 0.4 },
  GLongShadowEffect: { l: 120, a: 0.5, opc: 0.6, den: 2, fdm: false },
};

const CLASSES: Record<string, new () => Effect> = {
  GBlurEffect: BlurEffect,
  GDropShadowEffect: DropShadowEffect,
  GInnerShadowEffect: InnerShadowEffect,
  GOverlayEffect: OverlayEffect,
  GMirrorEffect: MirrorEffect,
  GColorGradingEffect: ColorGradingEffect,
  GContactShadowEffect: ContactShadowEffect,
  GLongShadowEffect: LongShadowEffect,
};

function attempt(fn: () => unknown): unknown {
  try {
    return fn();
  } catch {
    return "<throws>";
  }
}

function decode(value: unknown): unknown {
  return typeof value === "string" && value.startsWith("pattern:")
    ? Pattern.deserialize(value.slice(8))
    : value;
}

describe("canvas effects catalogue", () => {
  it("keeps the old type ids", () => {
    expect(getTypeId(BlurEffect)).toBe(160);
    expect(getTypeId(DropShadowEffect)).toBe(161);
    expect(getTypeId(InnerShadowEffect)).toBe(229);
    expect(getTypeId(ColorGradingEffect)).toBe(233);
    expect(getTypeId(OverlayEffect)).toBe(241);
    expect(getTypeId(MirrorEffect)).toBe(259);
    expect(getTypeId(ContactShadowEffect)).toBe(260);
    expect(getTypeId(LongShadowEffect)).toBe(264);
  });

  for (const [name, cls] of Object.entries(CLASSES)) {
    it(`${name} has the old defaults, flags, padding and blobs`, () => {
      const expected = recorded[name] as Record<string, unknown>;
      const fx = new cls();
      expect(Node.getName(fx)).toBe(expected.name);
      expect(fx.getEffectType()).toBe(expected.type);
      expect(fx.isSingleton()).toBe(expected.singleton);
      expect(fx.isOverlayEffect()).toBe(expected.overlay);
      expect(attempt(() => fx.isAffectedByChildren())).toEqual(expected.affectedByChildren);
      expect(fx.isAffectedByContents()).toBe(expected.affectedByContents);
      expect(attempt(() => fx.getEffectPadding())).toEqual(expected.defaultPadding);
      expect(JSON.parse(Node.serialize(fx) as string)).toEqual(expected.defaultBlob);
      const values = VALUES[name] as Record<string, unknown>;
      fx.setProperties(Object.keys(values), Object.values(values).map(decode));
      const json = Node.serialize(fx) as string;
      expect(JSON.parse(json)).toEqual(expected.blob);
      // Without a GL context a clipped blur pads by -1; the recording had WebGL (0).
      if (name !== "GBlurEffect") {
        expect(attempt(() => fx.getEffectPadding())).toEqual(expected.padding);
      }
      expect(Node.serialize(Node.deserialize(json) as Node)).toBe(json);
    });
  }

  it("a clipped blur without WebGL shrinks the box by one", () => {
    const blur = new BlurEffect();
    blur.setProperty("b", true);
    expect(blur._glblur).toBeNull();
    expect(blur.getEffectPadding()).toBe(-1);
    expect(blur.getAbsoluteEffectPadding()).toBe(5);
  });

  it("the inner shadow reaches parents with its radius past the offset", () => {
    const inner = new InnerShadowEffect();
    inner.setProperties(["r", "x", "y"], [9, -3, 12]);
    expect(inner.getAbsoluteEffectPadding()).toEqual([6, 21, 12, 0]);
  });

  it("the mirror pads below the box it last saw and stops at itself", () => {
    const effects = new Effects();
    const shadow = new DropShadowEffect();
    const mirror = new MirrorEffect();
    effects.appendChild(mirror);
    effects.appendChild(shadow);
    const box = new Rect(0, 0, 50, 100);
    expect(mirror.getEffectPadding(box)).toEqual([0, -31, 0, 31]);
    // The drop shadow comes before the mirror (pre effects go first), so it counts.
    expect(mirror._theirsPadding).toEqual([7, 7, 7, 7]);
    expect(mirror.getEffectPadding()).toEqual([0, -31, 0, 31]);
  });

  it("the contact shadow keeps the box grown by the other effects, once (BUG-019)", () => {
    const effects = new Effects();
    const contact = new ContactShadowEffect();
    const shadow = new DropShadowEffect();
    shadow.setProperty("y", 4);
    effects.appendChild(shadow);
    effects.appendChild(contact);
    const padding = contact.getEffectPadding(new Rect(0, 0, 100, 60)) as number[];
    // The shadow pads [7, 3, 7, 11]; the bottom is kept.
    expect(contact._padding).toBe(11);
    // The box grows by the shadow's padding to 74 high, squashed by cos(85 deg).
    const squashed = 74 * Math.cos(((90 - 5) * Math.PI) / 180);
    expect(padding[1]).toBeCloseTo(5 - squashed - 5, 10);
    expect(padding[3]).toBeCloseTo(5 + squashed + 5, 10);
    // A later call (the overlay paint calls it on every paint) keeps the
    // same box; the old code grew it again, to 88 high.
    const again = contact.getEffectPadding() as number[];
    expect(again[3]).toBeCloseTo(padding[3] as number, 10);
    expect(again).toEqual(padding);
    expect((contact.getEffectPadding() as number[])[1]).toBeCloseTo(padding[1] as number, 10);
  });
});
