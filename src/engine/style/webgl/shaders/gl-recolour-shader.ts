// Old: chunk.vendor.js module 492 (GGLRecolourShader).
//
// Gives every pixel except pure white the same hue and scales the
// saturation.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const FRAGMENT_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        uniform float hue;" +
  "        uniform float saturation;" +
  "        varying highp vec2 texCoord;" +
  "        vec3 rgb2hsv(vec3 c)" +
  "        {" +
  "            vec4 K = vec4(0.0, -0.33333333, 0.66666666, -1.0);" +
  "            vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));" +
  "            vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));" +
  "                        float d = q.x - min(q.w, q.y);" +
  "            float e = 1.0e-10;" +
  "            return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);" +
  "        }" +
  "                vec3 hsv2rgb(vec3 c)" +
  "        {" +
  "            vec4 K = vec4(1.0, 0.66666666, 0.33333333, 3.0);" +
  "            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);" +
  "            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);" +
  "        }" +
  "                void main() {" +
  "            vec4 color = texture2D(texture, texCoord);" +
  "            vec3 hsv = rgb2hsv(color.rgb);" +
  "            if (color.rgb != vec3(1.0, 1.0, 1.0)) {" +
  "                hsv.x = hue;" +
  "            }" +
  "            hsv.y = hsv.y * saturation;" +
  "            gl_FragColor = vec4(hsv2rgb(hsv), color.w);" +
  "        }" +
  "    ";

export type RecolourParameters = { hue: number; saturation: number };

export class GLRecolourShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, FRAGMENT_SOURCE);
  }

  render(properties: RecolourParameters): void {
    this.simpleShader({
      hue: Shader.clamp(-1, properties.hue, 1),
      saturation: Shader.clamp(-1, properties.saturation, 1),
    });
  }
}
