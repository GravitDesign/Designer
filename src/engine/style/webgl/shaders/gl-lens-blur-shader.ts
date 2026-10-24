// Old: chunk.vendor.js module 489 (GGLLensBlurShader, from glfx.js).
//
// A hexagonal bokeh blur: the image is raised to a power (brightness), blurred
// along three directions 120 degrees apart in three passes, and brought back.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const POWER_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        uniform float power;" +
  "        varying highp vec2 texCoord;" +
  "        void main() {" +
  "            vec4 color = texture2D(texture, texCoord);" +
  "            color = pow(color, vec4(power));" +
  "            gl_FragColor = vec4(color);" +
  "        }" +
  "    ";

const SAMPLE_HEAD =
  "        uniform highp sampler2D texture0;" +
  "        uniform highp sampler2D texture1;" +
  "        uniform vec2 delta0;" +
  "        uniform vec2 delta1;" +
  "        uniform float power;" +
  "        varying highp vec2 texCoord;" +
  "        ";

const SAMPLE_FUNCTION =
  "        vec4 sample(vec2 delta) {" +
  "            /* randomize the lookup values to hide the fixed number of samples */" +
  "            float offset = random(vec3(delta, 151.7182), 0.0);" +
  "                        vec4 color = vec4(0.0);" +
  "            float total = 0.0;" +
  "            for (float t = 0.0; t <= 30.0; t++) {" +
  "                float percent = (t + offset) / 30.0;" +
  "                color += texture2D(texture0, texCoord + delta * percent);" +
  "                total += 1.0;" +
  "            }" +
  "            return color / total;" +
  "        }" +
  "    ";

const MAIN_ONE_DIRECTION =
  "        void main() {" + "            gl_FragColor = sample(delta0);" + "        }" + "    ";

const MAIN_TWO_DIRECTIONS =
  "        void main() {" +
  "            gl_FragColor = (sample(delta0) + sample(delta1)) * 0.5;" +
  "        }" +
  "    ";

const MAIN_FINISH =
  "        void main() {" +
  "            vec4 color = (sample(delta0) + 2.0 * texture2D(texture1, texCoord)) / 3.0;" +
  "            gl_FragColor = pow(color, vec4(power));" +
  "        }" +
  "    ";

export type LensBlurParameters = { radius: number; brightness: number; angle: number };

export class GLLensBlurShader extends Shader {
  declare glEffect: EffectShaderHost;
  /** Never created; destroy() still releases it if set. */
  declare lensBlurPrePass: Shader | null;
  declare lensBlur0: Shader | null;
  declare lensBlur1: Shader | null;
  declare lensBlur2: Shader | null;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, POWER_SOURCE);
    const common = SAMPLE_HEAD + Shader.randomShaderFunc + SAMPLE_FUNCTION;
    this.lensBlur0 = new Shader(glEffect, null, common + MAIN_ONE_DIRECTION);
    this.lensBlur1 = new Shader(glEffect, null, common + MAIN_TWO_DIRECTIONS);
    this.lensBlur2 = new Shader(glEffect, null, common + MAIN_FINISH).textures({ texture1: 1 });
  }

  render(properties: LensBlurParameters, scale: number): void {
    const radius = properties.radius * scale;
    const brightness = properties.brightness;
    const angle = properties.angle;
    const directions: number[][] = [];
    for (let i = 0; i < 3; i++) {
      const direction = angle + (i * Math.PI * 2) / 3;
      directions.push([
        (radius * Math.sin(direction)) / this.glEffect.width,
        (radius * Math.cos(direction)) / this.glEffect.height,
      ]);
    }
    const power = Math.pow(10, Shader.clamp(-1, brightness, 1));
    const host = this.glEffect;
    this.simpleShader({ power });
    host.extraTexture.ensureFormat(host.texture);
    (this.lensBlur0 as Shader).simpleShader(
      { delta0: directions[0] as number[] },
      host.texture,
      host.extraTexture,
    );
    (this.lensBlur1 as Shader).simpleShader(
      { delta0: directions[1] as number[], delta1: directions[2] as number[] },
      host.extraTexture,
      host.extraTexture,
    );
    (this.lensBlur0 as Shader).simpleShader({ delta0: directions[1] as number[] });
    host.extraTexture.use(1);
    (this.lensBlur2 as Shader).simpleShader({
      power: 1 / power,
      delta0: directions[2] as number[],
    });
  }

  override destroy(): void {
    if (this.lensBlurPrePass) this.lensBlurPrePass.destroy();
    if (this.lensBlur0) this.lensBlur0.destroy();
    if (this.lensBlur1) this.lensBlur1.destroy();
    if (this.lensBlur2) this.lensBlur2.destroy();
    super.destroy();
  }
}

GLLensBlurShader.prototype.lensBlurPrePass = null;
GLLensBlurShader.prototype.lensBlur0 = null;
GLLensBlurShader.prototype.lensBlur1 = null;
GLLensBlurShader.prototype.lensBlur2 = null;
