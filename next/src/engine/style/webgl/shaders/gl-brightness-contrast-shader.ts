// Old: chunk.vendor.js module 476 (GGLBrightnessContrastShader, from glfx.js).
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const FRAGMENT_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        uniform float brightness;" +
  "        uniform float contrast;" +
  "        varying highp vec2 texCoord;" +
  "        void main() {" +
  "            vec4 color = texture2D(texture, texCoord);" +
  "            color.rgb += brightness;" +
  "            if (contrast > 0.0) {" +
  "                color.rgb = (color.rgb - 0.5) / (1.0 - contrast) + 0.5;" +
  "            } else {" +
  "                color.rgb = (color.rgb - 0.5) * (1.0 + contrast) + 0.5;" +
  "            }" +
  "            gl_FragColor = color;" +
  "        }" +
  "    ";

export type BrightnessContrastParameters = { brightness: number; contrast: number };

export class GLBrightnessContrastShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, FRAGMENT_SOURCE);
  }

  render(properties: BrightnessContrastParameters): void {
    this.simpleShader({
      brightness: Shader.clamp(-1, properties.brightness, 1),
      contrast: Shader.clamp(-1, properties.contrast, 1),
    });
  }
}
