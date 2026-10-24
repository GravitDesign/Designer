// Old: chunk.vendor.js module 496 (GGLSwirlShader, from glfx.js).
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const UNIFORMS =
  "        uniform float radius;" +
  "        uniform float angle;" +
  "        uniform vec2 center;" +
  "    ";

const WARP =
  "        coord -= center;" +
  "        float distance = length(coord);" +
  "        if (distance < radius) {" +
  "            float percent = (radius - distance) / radius;" +
  "            float theta = percent * percent * angle;" +
  "            float s = sin(theta);" +
  "            float c = cos(theta);" +
  "            coord = vec2(" +
  "                coord.x * c - coord.y * s," +
  "                coord.x * s + coord.y * c" +
  "            );" +
  "        }" +
  "        coord += center;" +
  "    ";

export type SwirlParameters = { centerX: number; centerY: number; radius: number; angle: number };

export class GLSwirlShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, Shader.warpShader(UNIFORMS, WARP));
  }

  /** The radius is relative to the effect's bounding box when it has one, else to the full size. */
  render(
    properties: SwirlParameters,
    scale: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const tileWidth = this.glEffect.width;
    const tileHeight = this.glEffect.height;
    const bbox = this.glEffect.swirlBBox;
    const radius = bbox
      ? 0.005 * properties.radius * Math.max(bbox.getWidth(), bbox.getHeight())
      : 0.005 * properties.radius * Math.max(width, height);
    const centerX = 0.01 * properties.centerX * width;
    const centerY = 0.01 * properties.centerY * height;
    this.simpleShader({
      radius,
      center: [centerX, centerY],
      angle: properties.angle,
      texSize: [width, height],
      tileSize: [tileWidth, tileHeight],
      offset: [x, y],
    });
  }
}
