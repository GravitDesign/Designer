// Old: chunk.vendor.js module 504 (GGLZoomBlurShader, from glfx.js).
//
// Blurs along rays from a center given in percent of the whole image.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const SOURCE_HEAD =
  "        uniform highp sampler2D texture;" +
  "        uniform vec2 center;" +
  "        uniform float strength;" +
  "        uniform vec2 texSize;" +
  "        varying highp vec2 texCoord;" +
  "        uniform vec2 tileSize;" +
  "        uniform vec2 offset;" +
  "        ";

const SOURCE_SEPARATOR = "        ";

const SOURCE_MAIN =
  "        void main() {" +
  "            vec4 color = vec4(0.0);" +
  "            float total = 0.0;" +
  "            vec2 toCenter = center - texCoord * texSize;" +
  "                        /* randomize the lookup values to hide the fixed number of samples */" +
  "            float off = random(vec3(12.9898, 78.233, 151.7182), 0.0);" +
  "                        for (float t = 0.0; t <= 40.0; t++) {" +
  "                float percent = (t + off) / 40.0;" +
  "                float weight = 4.0 * (percent - percent * percent);" +
  "                vec4 sample = texture2D(texture, toLocal(texCoord + toCenter * percent * strength / texSize));" +
  "                                /* switch to pre-multiplied alpha to correctly blur transparent images */" +
  "                sample.rgb *= sample.a;" +
  "                                color += sample * weight;" +
  "                total += weight;" +
  "            }" +
  "                        gl_FragColor = color / total;" +
  "                        /* switch back from pre-multiplied alpha */" +
  "            gl_FragColor.rgb /= gl_FragColor.a + 0.00001;" +
  "        }" +
  "    ";

export type ZoomBlurParameters = { centerX: number; centerY: number; strength: number };

export class GLZoomBlurShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(
      glEffect,
      Shader.tilingAwareVertexSource,
      SOURCE_HEAD + Shader.randomShaderFunc + SOURCE_SEPARATOR + Shader.TOLOCAL + SOURCE_MAIN,
    );
  }

  render(
    properties: ZoomBlurParameters,
    scale: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const tileWidth = this.glEffect.width;
    const tileHeight = this.glEffect.height;
    const centerX = properties.centerX * width * 0.01;
    const centerY = properties.centerY * height * 0.01;
    this.simpleShader({
      center: [centerX, centerY],
      strength: properties.strength,
      texSize: [width, height],
      tileSize: [tileWidth, tileHeight],
      offset: [x, y],
    });
  }
}
