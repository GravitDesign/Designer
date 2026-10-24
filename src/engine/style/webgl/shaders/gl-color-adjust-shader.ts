// Old: chunk.vendor.js module 478 (GGLColorAdjustShader).
//
// Brightness, contrast, hue and saturation in one pass (the glfx.js
// brightness/contrast and hue/saturation filters combined).
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const FRAGMENT_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        uniform float brightness;" +
  "        uniform float contrast;" +
  "        uniform float hue;" +
  "        uniform float saturation;" +
  "        varying highp vec2 texCoord;" +
  "        void main() {" +
  "            vec4 color = texture2D(texture, texCoord);" +
  "            color.rgb += brightness;" +
  "            if (contrast > 0.0) {" +
  "                color.rgb = (color.rgb - 0.5) / (1.0 - contrast) + 0.5;" +
  "            } else {" +
  "                color.rgb = (color.rgb - 0.5) * (1.0 + contrast) + 0.5;" +
  "            }" +
  "            color.rgb = clamp(color.rgb, 0.0, 1.0);" +
  "            /* hue adjustment, wolfram alpha: RotationTransform[angle, {1, 1, 1}][{x, y, z}] */" +
  "            float angle = hue * 3.14159265;" +
  "            float s = sin(angle), c = cos(angle);" +
  "            vec3 weights = (vec3(2.0 * c, -sqrt(3.0) * s - c, sqrt(3.0) * s - c) + 1.0) / 3.0;" +
  "            float len = length(color.rgb);" +
  "            color.rgb = vec3(" +
  "                dot(color.rgb, weights.xyz)," +
  "                dot(color.rgb, weights.zxy)," +
  "                dot(color.rgb, weights.yzx)" +
  "            );" +
  "                        /* saturation adjustment */" +
  "            float average = (color.r + color.g + color.b) / 3.0;" +
  "            if (saturation > 0.0) {" +
  "                color.rgb += (average - color.rgb) * (1.0 - 1.0 / (1.001 - saturation));" +
  "            } else {" +
  "                color.rgb += (average - color.rgb) * (-saturation);" +
  "            }" +
  "                        gl_FragColor = color;" +
  "        }" +
  "    ";

export type ColorAdjustParameters = {
  brightness: number;
  contrast: number;
  hue: number;
  saturation: number;
};

export class GLColorAdjustShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, FRAGMENT_SOURCE);
  }

  render(properties: ColorAdjustParameters): void {
    this.simpleShader({
      hue: Shader.clamp(-1, properties.hue, 1),
      saturation: Shader.clamp(-1, properties.saturation, 1),
      brightness: Shader.clamp(-1, properties.brightness, 1),
      contrast: Shader.clamp(-1, properties.contrast, 1),
    });
  }
}
