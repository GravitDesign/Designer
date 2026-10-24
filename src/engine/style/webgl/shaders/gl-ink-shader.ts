// Old: chunk.vendor.js module 487 (GGLInkShader, from glfx.js).
//
// Darkens edges: the difference of a 5 x 5 and a small cross average,
// weighted by strength to the fifth power.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const FRAGMENT_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        uniform float strength;" +
  "        uniform vec2 texSize;" +
  "        varying highp vec2 texCoord;" +
  "        void main() {" +
  "            vec2 dx = vec2(1.0 / texSize.x, 0.0);" +
  "            vec2 dy = vec2(0.0, 1.0 / texSize.y);" +
  "            vec4 color = texture2D(texture, texCoord);" +
  "            float bigTotal = 0.0;" +
  "            float smallTotal = 0.0;" +
  "            vec3 bigAverage = vec3(0.0);" +
  "            vec3 smallAverage = vec3(0.0);" +
  "            for (float x = -2.0; x <= 2.0; x += 1.0) {" +
  "                for (float y = -2.0; y <= 2.0; y += 1.0) {" +
  "                    vec3 sample = texture2D(texture, texCoord + dx * x + dy * y).rgb;" +
  "                    bigAverage += sample;" +
  "                    bigTotal += 1.0;" +
  "                    if (abs(x) + abs(y) < 2.0) {" +
  "                        smallAverage += sample;" +
  "                        smallTotal += 1.0;" +
  "                    }" +
  "                }" +
  "            }" +
  "            vec3 edge = max(vec3(0.0), bigAverage / bigTotal - smallAverage / smallTotal);" +
  "            gl_FragColor = vec4(color.rgb - dot(edge, edge) * strength * 100000.0, color.a);" +
  "        }" +
  "    ";

export type InkParameters = { strength: number };

export class GLInkShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, FRAGMENT_SOURCE);
  }

  render(properties: InkParameters): void {
    const width = this.glEffect.width;
    const height = this.glEffect.height;
    const strength = properties.strength;
    this.simpleShader({
      strength: strength * strength * strength * strength * strength,
      texSize: [width, height],
    });
  }
}
