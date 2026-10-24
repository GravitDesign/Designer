// Old: chunk.vendor.js module 483 (GGLEdgeWorkShader, from glfx.js).
//
// Edge work: a horizontal pass that blurs the luminance at two widths,
// then a vertical pass that draws the difference of both as black and
// white.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const HEAD =
  "        uniform highp sampler2D texture;" +
  "        uniform vec2 delta;" +
  "        varying highp vec2 texCoord;" +
  "        ";

const FIRST_PASS_MAIN =
  "        void main() {" +
  "            vec2 color = vec2(0.0);" +
  "            vec2 total = vec2(0.0);" +
  "                        /* randomize the lookup values to hide the fixed number of samples */" +
  "            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);" +
  "                        for (float t = -30.0; t <= 30.0; t++) {" +
  "                float percent = (t + offset - 0.5) / 30.0;" +
  "                float weight = 1.0 - abs(percent);" +
  "                vec3 sample = texture2D(texture, texCoord + delta * percent).rgb;" +
  "                float average = (sample.r + sample.g + sample.b) / 3.0;" +
  "                color.x += average * weight;" +
  "                total.x += weight;" +
  "                if (abs(t) < 15.0) {" +
  "                    weight = weight * 2.0 - 1.0;" +
  "                    color.y += average * weight;" +
  "                    total.y += weight;" +
  "                }" +
  "            }" +
  "            gl_FragColor = vec4(color / total, 0.0, 1.0);" +
  "        }" +
  "    ";

const SECOND_PASS_MAIN =
  "        void main() {" +
  "            vec2 color = vec2(0.0);" +
  "            vec2 total = vec2(0.0);" +
  "                        /* randomize the lookup values to hide the fixed number of samples */" +
  "            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);" +
  "                        for (float t = -30.0; t <= 30.0; t++) {" +
  "                float percent = (t + offset - 0.5) / 30.0;" +
  "                float weight = 1.0 - abs(percent);" +
  "                vec2 sample = texture2D(texture, texCoord + delta * percent).xy;" +
  "                color.x += sample.x * weight;" +
  "                total.x += weight;" +
  "                if (abs(t) < 15.0) {" +
  "                    weight = weight * 2.0 - 1.0;" +
  "                    color.y += sample.y * weight;" +
  "                    total.y += weight;" +
  "                }" +
  "            }" +
  "            float c = clamp(10000.0 * (color.y / total.y - color.x / total.x) + 0.5, 0.0, 1.0);" +
  "            gl_FragColor = vec4(c, c, c, 1.0);" +
  "        }" +
  "    ";

export type EdgeWorkParameters = { radius: number };

export class GLEdgeWorkShader extends Shader {
  declare glEffect: EffectShaderHost;
  /** The vertical pass. */
  declare edgeWork2: Shader | null;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, HEAD + Shader.randomShaderFunc + FIRST_PASS_MAIN);
    this.edgeWork2 = new Shader(glEffect, null, HEAD + Shader.randomShaderFunc + SECOND_PASS_MAIN);
  }

  render(properties: EdgeWorkParameters, scale: number): void {
    const width = this.glEffect.width;
    const height = this.glEffect.height;
    const radius = properties.radius * scale;
    this.simpleShader({ delta: [radius / width, 0] });
    (this.edgeWork2 as Shader).simpleShader({ delta: [0, radius / height] });
  }

  override destroy(): void {
    if (this.edgeWork2) this.edgeWork2.destroy();
    super.destroy();
  }
}

GLEdgeWorkShader.prototype.edgeWork2 = null;
