// Old: chunk.vendor.js module 493 (GGLSepiaShader, from glfx.js).
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const FRAGMENT_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        uniform float amount;" +
  "        varying highp vec2 texCoord;" +
  "        void main() {" +
  "            vec4 color = texture2D(texture, texCoord);" +
  "            float r = color.r;" +
  "            float g = color.g;" +
  "            float b = color.b;" +
  "                        color.r = min(1.0, (r * (1.0 - (0.607 * amount))) + (g * (0.769 * amount)) + (b * (0.189 * amount)));" +
  "            color.g = min(1.0, (r * 0.349 * amount) + (g * (1.0 - (0.314 * amount))) + (b * 0.168 * amount));" +
  "            color.b = min(1.0, (r * 0.272 * amount) + (g * 0.534 * amount) + (b * (1.0 - (0.869 * amount))));" +
  "                        gl_FragColor = color;" +
  "        }" +
  "    ";

export type SepiaParameters = { amount: number };

export class GLSepiaShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, FRAGMENT_SOURCE);
  }

  render(properties: SepiaParameters): void {
    this.simpleShader({ amount: Shader.clamp(0, properties.amount, 1) });
  }
}
