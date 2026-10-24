// Old: chunk.vendor.js module 477 (GGLBulgePinchShader, from glfx.js).
//
// Bulges (strength > 0) or pinches (< 0) a circle around a center given
// in percent of the whole image.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const WARP_HEAD =
  "        uniform highp float radius;" +
  "        uniform highp float strength;" +
  "        uniform highp vec2 center;" +
  "    ";

const WARP =
  "        coord -= center;" +
  "        highp float distance = length(coord);" +
  "        if (distance < radius) {" +
  "            highp float percent = distance / radius;" +
  "            if (strength > 0.0) {" +
  "                coord *= mix(1.0, smoothstep(0.0, radius / distance, percent), strength * 0.75);" +
  "            } else {" +
  "                coord *= mix(1.0, pow(percent, 1.0 + strength * 0.75) * radius / distance, 1.0 - percent);" +
  "            }" +
  "        }" +
  "        coord += center;" +
  "    ";

export type BulgePinchParameters = {
  centerX: number;
  centerY: number;
  radius: number;
  strength: number;
};

export class GLBulgePinchShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, Shader.warpShader(WARP_HEAD, WARP));
  }

  render(
    properties: BulgePinchParameters,
    scale: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const centerX = 0.01 * properties.centerX * width;
    const centerY = 0.01 * properties.centerY * height;
    const radius = 0.01 * properties.radius * Math.max(width, height);
    const strength = properties.strength;
    this.simpleShader({
      radius,
      strength: Shader.clamp(-1, strength, 1),
      center: [centerX, centerY],
      texSize: [width, height],
      tileSize: [this.glEffect.width, this.glEffect.height],
      offset: [x, y],
    });
  }
}
