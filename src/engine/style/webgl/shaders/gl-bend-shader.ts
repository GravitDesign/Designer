// Old: chunk.vendor.js module 474 (GGLBendShader).
//
// Bends the image along a sine: x moves with the global y and y with the
// global x.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const WARP_HEAD = "        uniform float strengthX;" + "        uniform float strengthY;" + "    ";

const WARP =
  "        vec2 globalCoord = (texCoord * tileSize + offset)/texSize;" +
  "        coord = vec2(coord.x + strengthX*sin(globalCoord.y*3.141592), coord.y + strengthY*sin(globalCoord.x*3.141592));" +
  "    ";

export type BendParameters = { strengthX: number; strengthY: number; radius: number };

export class GLBendShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, Shader.warpShader(WARP_HEAD, WARP));
  }

  render(
    properties: BendParameters,
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
