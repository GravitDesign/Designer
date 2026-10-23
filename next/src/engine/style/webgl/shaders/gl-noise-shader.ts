// Old: chunk.vendor.js module 490 (GGLNoiseShader).
//
// Random noise: gray offsets scaled by `amount`, or random hues when
// `colored`; with `transparency` the noise is opaque and `amount` becomes
// the alpha instead (what GNoisePattern uses).
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const FRAGMENT_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        uniform float amount;" +
  "        uniform float colored;" +
  "        uniform float transparency;" +
  "        varying highp vec2 texCoord;" +
  "        vec3 hsv2rgb_smooth(in vec3 c) {" +
  "            vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);" +
  "            rgb = rgb*rgb*(3.0-2.0*rgb);" +
  "            return c.z * mix( vec3(1.0), rgb, c.y);" +
  "        }" +
  "        float rand(vec2 co) {" +
  "            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);" +
  "        }" +
  "        void main() {" +
  "            vec4 color = texture2D(texture, texCoord);" +
  "            float _rand = rand(texCoord);" +
  "            float alpha = 1.0;" +
  "            if (colored == 1.0){" +
  "                color.rgb = hsv2rgb_smooth(vec3(_rand, 1.0, 1.0)).xyz;" +
  "            } else {" +
  "                float diff = _rand - 0.5;" +
  "                if (transparency != 1.0){" +
  "                    diff *= amount;" +
  "                }" +
  "                color.r += diff;" +
  "                color.g += diff;" +
  "                color.b += diff;" +
  "            }" +
  "            if (transparency == 1.0){" +
  "                alpha = amount;" +
  "            }" +
  "            gl_FragColor = vec4(color.rgb, color.a * alpha);" +
  "        }" +
  "    ";

export type NoiseParameters = { amount: number; colored?: boolean; transparency?: boolean };

export class GLNoiseShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, FRAGMENT_SOURCE);
  }

  render(properties: NoiseParameters): void {
    this.simpleShader({
      amount: Shader.clamp(0, properties.amount, 1),
      colored: properties.colored ? 1 : 0,
      transparency: properties.transparency ? 1 : 0,
    });
  }
}
