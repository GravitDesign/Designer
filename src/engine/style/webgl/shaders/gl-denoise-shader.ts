// Old: chunk.vendor.js module 480 (GGLDenoiseShader, from glfx.js).
//
// A 9 x 9 bilateral-style smoothing, run twice.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const FRAGMENT_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        uniform float exponent;" +
  "        uniform float strength;" +
  "        uniform vec2 texSize;" +
  "        varying highp vec2 texCoord;" +
  "        void main() {" +
  "            vec4 center = texture2D(texture, texCoord);" +
  "            vec4 color = vec4(0.0);" +
  "            float total = 0.0;" +
  "            for (float x = -4.0; x <= 4.0; x += 1.0) {" +
  "                for (float y = -4.0; y <= 4.0; y += 1.0) {" +
  "                    vec4 sample = texture2D(texture, texCoord + vec2(x, y) / texSize);" +
  "                    float weight = 1.0 - abs(dot(sample.rgb - center.rgb, vec3(0.25)));" +
  "                    weight = pow(weight, exponent);" +
  "                    color += sample * weight;" +
  "                    total += weight;" +
  "                }" +
  "            }" +
  "            gl_FragColor = color / total;" +
  "        }" +
  "    ";

export type DenoiseParameters = { exponent: number };

export class GLDenoiseShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, FRAGMENT_SOURCE);
  }

  render(properties: DenoiseParameters): void {
    const width = this.glEffect.width;
    const height = this.glEffect.height;
    const exponent = properties.exponent;
    this.simpleShader({ exponent: Math.max(0, exponent), texSize: [width, height] });
    this.simpleShader({ exponent: Math.max(0, exponent), texSize: [width, height] });
  }
}
