// Old: chunk.vendor.js module 502 (GGLVignetteShader, from glfx.js).
//
// Darkens the corners of the whole image (tiling aware), dithered.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const FRAGMENT_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        uniform float size;" +
  "        uniform float amount;" +
  "        varying highp vec2 texCoord;" +
  "        uniform vec2 texSize;" +
  "        varying vec2 localTexCoord;" +
  "        void main() {" +
  "            vec4 color = texture2D(texture, localTexCoord);" +
  "                        float dist = distance(texCoord, vec2(0.5, 0.5));" +
  "            color.rgb *= smoothstep(0.8, size * 0.799, dist * (amount + size));" +
  "            color.rgb += screenSpaceDither(texCoord*texSize);" +
  "                        gl_FragColor = color;" +
  "        }" +
  "    ";

export type VignetteParameters = { size: number; amount: number };

export class GLVignetteShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, Shader.tilingAwareVertexSource, Shader.screenSpaceDither + FRAGMENT_SOURCE);
  }

  /** An amount of 0 leaves the texture as it is. */
  render(
    properties: VignetteParameters,
    scale: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    if (properties.amount) {
      this.simpleShader({
        size: Shader.clamp(0, properties.size, 1),
        amount: Shader.clamp(0, properties.amount, 1),
        offset: [x, y],
        tileSize: [this.glEffect.width, this.glEffect.height],
        texSize: [width, height],
      });
    }
  }
}
