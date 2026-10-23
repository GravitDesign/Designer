import { describe, expect, it } from "vitest";
import { Rect } from "../../../math/rect.ts";
import { Node } from "../../../scene/node.ts";
import { GLSwirlEffect } from "./gl-swirl-effect.ts";

describe("GLSwirlEffect", () => {
  it("keeps the old node name and defaults", () => {
    const effect = new GLSwirlEffect();
    expect(Node.getName(effect)).toBe("GGLSwirlEffect");
    expect(effect.$shp).toEqual({ centerX: 50, centerY: 50, radius: 50, angle: 0.5 });
    expect(effect.$sh).toBe("GGLSwirlShader");
  });

  it("pads nothing without a bounding box", () => {
    const effect = new GLSwirlEffect();
    expect(effect.getEffectPadding()).toEqual([0, 0, 0, 0]);
    expect(effect.getAbsoluteEffectPadding()).toEqual([0, 0, 0, 0]);
  });

  it("pads where the swirl circle leaves the box and remembers the box", () => {
    const effect = new GLSwirlEffect();
    // radius 0.005 * 90 * 200 = 90 around (20, 70) in a 200 x 100 box.
    effect.setProperty("shp", { centerX: 10, centerY: 70, radius: 90, angle: -2 });
    expect(effect.getEffectPadding(new Rect(0, 0, 200, 100))).toEqual([70, 60, 70, 60]);
    expect(effect.swirlBBox?.getWidth()).toBe(200);
    // The box stays for later calls without one.
    expect(effect.getEffectPadding()).toEqual([70, 60, 70, 60]);
    const reach = Math.abs(Math.sin(-2 / 2)) * 90;
    expect(effect.getAbsoluteEffectPadding()).toEqual([reach, reach, reach, reach]);
  });

  it("pads nothing when the circle stays inside", () => {
    const effect = new GLSwirlEffect();
    effect.setProperty("shp", { centerX: 50, centerY: 50, radius: 20, angle: 1 });
    expect(effect.getEffectPadding(new Rect(0, 0, 100, 100))).toEqual([0, 0, 0, 0]);
  });
});
