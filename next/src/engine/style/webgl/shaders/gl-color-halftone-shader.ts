// Old: chunk.vendor.js module 479 (GGLColorHalftoneShader, from glfx.js).
//
// CMYK halftone: one dot screen per ink, each at its own angle. Tiling
// aware, so the pattern lines up across tiles.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const FRAGMENT_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        uniform vec2 center;" +
  "        uniform float angle;" +
  "        uniform float scale;" +
  "        uniform vec2 texSize;" +
  "        varying highp vec2 texCoord;" +
  "        varying vec2 localTexCoord;" +
  "                float pattern(float angle) {" +
  "            float s = sin(angle), c = cos(angle);" +
  "            vec2 tex = texCoord * texSize - center;" +
  "            vec2 point = vec2(" +
  "                c * tex.x - s * tex.y," +
  "                s * tex.x + c * tex.y" +
  "            ) * scale;" +
  "            return (sin(point.x) * sin(point.y)) * 4.0;" +
  "        }" +
  "                void main() {" +
  "            vec4 color = texture2D(texture, localTexCoord);" +
  "            vec3 cmy = 1.0 - color.rgb;" +
  "            float k = min(cmy.x, min(cmy.y, cmy.z));" +
  "            cmy = (cmy - k) / (1.0 - k);" +
  "            cmy = clamp(cmy * 10.0 - 3.0 + vec3(pattern(angle + 0.26179), pattern(angle + 1.30899), pattern(angle)), 0.0, 1.0);" +
  "            k = clamp(k * 10.0 - 5.0 + pattern(angle + 0.78539), 0.0, 1.0);" +
  "            gl_FragColor = vec4(1.0 - cmy - k, color.a);" +
  "        }" +
  "    ";

export type ColorHalftoneParameters = {
  centerX: number;
  centerY: number;
  angle: number;
  size: number;
};

export class GLColorHalftoneShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, Shader.tilingAwareVertexSource, FRAGMENT_SOURCE);
  }

  render(
    properties: ColorHalftoneParameters,
    scale: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const centerX = 0.01 * properties.centerX * width;
    const centerY = 0.01 * properties.centerY * height;
    const angle = properties.angle;
    const size = scale * properties.size;
    this.simpleShader({
      center: [centerX, centerY],
      angle,
      scale: Math.PI / size,
      texSize: [width, height],
      tileSize: [this.glEffect.width, this.glEffect.height],
      offset: [x, y],
    });
  }
}
