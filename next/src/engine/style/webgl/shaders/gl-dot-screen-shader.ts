// Old: chunk.vendor.js module 481 (GGLDotScreenShader, from glfx.js).
//
// Black and white dot screen. Not tiling aware: the center and size are
// taken from the tile, not the whole image.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const FRAGMENT_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        uniform vec2 center;" +
  "        uniform float angle;" +
  "        uniform float scale;" +
  "        uniform vec2 texSize;" +
  "        varying highp vec2 texCoord;" +
  "                float pattern() {" +
  "            float s = sin(angle), c = cos(angle);" +
  "            vec2 tex = texCoord * texSize - center;" +
  "            vec2 point = vec2(" +
  "                c * tex.x - s * tex.y," +
  "                s * tex.x + c * tex.y" +
  "            ) * scale;" +
  "            return (sin(point.x) * sin(point.y)) * 4.0;" +
  "        }" +
  "                void main() {" +
  "            vec4 color = texture2D(texture, texCoord);" +
  "            float average = (color.r + color.g + color.b) / 3.0;" +
  "            gl_FragColor = vec4(vec3(average * 10.0 - 5.0 + pattern()), color.a);" +
  "        }" +
  "    ";

export type DotScreenParameters = {
  centerX: number;
  centerY: number;
  angle: number;
  size: number;
};

export class GLDotScreenShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, FRAGMENT_SOURCE);
  }

  render(properties: DotScreenParameters, scale: number): void {
    const width = this.glEffect.width;
    const height = this.glEffect.height;
    const centerX = 0.01 * properties.centerX * width;
    const centerY = 0.01 * properties.centerY * height;
    const angle = properties.angle;
    const size = scale * properties.size;
    this.simpleShader({
      center: [centerX, centerY],
      angle,
      scale: Math.PI / size,
      texSize: [width, height],
    });
  }
}
