// Old: chunk.vendor.js module 501 (GGLVibranceShader, from glfx.js).
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const FRAGMENT_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        uniform float amount;" +
  "        varying highp vec2 texCoord;" +
  "        void main() {" +
  "            vec4 color = texture2D(texture, texCoord);" +
  "            float average = (color.r + color.g + color.b) / 3.0;" +
  "            float mx = max(color.r, max(color.g, color.b));" +
  "            float amt = (mx - average) * (-amount * 3.0);" +
  "            color.rgb = mix(color.rgb, vec3(mx), amt);" +
  "            gl_FragColor = color;" +
  "        }" +
  "    ";

export type VibranceParameters = { amount: number };

export class GLVibranceShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, FRAGMENT_SOURCE);
  }

  /** An amount of 0 leaves the texture as it is. */
  render(properties: VibranceParameters): void {
    if (properties.amount) {
      this.simpleShader({ amount: Shader.clamp(-1, properties.amount, 1) });
    }
  }
}
