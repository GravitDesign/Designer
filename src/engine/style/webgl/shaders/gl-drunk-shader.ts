// Old: chunk.vendor.js module 482 (GGLDrunkShader).
//
// Wobbles the image along a sine of its own coordinates. `globalCoord` is
// computed in the GLSL but not used.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const WARP_HEAD = "        uniform float strengthX;" + "        uniform float strengthY;" + "    ";

const WARP =
  "        vec2 globalCoord = (texCoord * tileSize + offset)/texSize;" +
  "        coord = vec2(coord.x + strengthX*sin(coord.x*3.141592), coord.y + strengthY*sin(coord.y*3.141592));" +
  "    ";

export type DrunkParameters = { strengthX: number; strengthY: number; radius: number };

export class GLDrunkShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, Shader.warpShader(WARP_HEAD, WARP));
  }

  render(
    properties: DrunkParameters,
    scale: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const tileWidth = this.glEffect.width;
    const tileHeight = this.glEffect.height;
    const radius = properties.radius * scale;
    const strengthX = radius * properties.strengthX;
    const strengthY = radius * properties.strengthY;
    this.simpleShader({
      strengthX,
      strengthY,
      texSize: [width, height],
      tileSize: [tileWidth, tileHeight],
      offset: [x, y],
    });
  }
}
