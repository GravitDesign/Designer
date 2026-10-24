// Old: chunk.vendor.js module 485 (GGLHexagonalShader, from glfx.js).
//
// Pixelates into hexagons of `scale` percent of the smaller side, around a
// center given in percent. Tiling aware: coordinates are in the full image.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const SOURCE_HEAD =
  "        uniform highp sampler2D texture;" +
  "        uniform vec2 center;" +
  "        uniform float scale;" +
  "        uniform vec2 texSize;" +
  "        uniform vec2 tileSize;" +
  "        uniform vec2 offset;" +
  "        varying highp vec2 texCoord;";

const SOURCE_MAIN =
  "void main() {" +
  "            vec2 tex = (texCoord * texSize - center) / scale;" +
  "            tex.y /= 0.866025404;" +
  "            tex.x -= tex.y * 0.5;" +
  "                        vec2 a;" +
  "            if (tex.x + tex.y - floor(tex.x) - floor(tex.y) < 1.0) a = vec2(floor(tex.x), floor(tex.y));" +
  "            else a = vec2(ceil(tex.x), ceil(tex.y));" +
  "            vec2 b = vec2(ceil(tex.x), floor(tex.y));" +
  "            vec2 c = vec2(floor(tex.x), ceil(tex.y));" +
  "                        vec3 TEX = vec3(tex.x, tex.y, 1.0 - tex.x - tex.y);" +
  "            vec3 A = vec3(a.x, a.y, 1.0 - a.x - a.y);" +
  "            vec3 B = vec3(b.x, b.y, 1.0 - b.x - b.y);" +
  "            vec3 C = vec3(c.x, c.y, 1.0 - c.x - c.y);" +
  "                        float alen = length(TEX - A);" +
  "            float blen = length(TEX - B);" +
  "            float clen = length(TEX - C);" +
  "                        vec2 choice;" +
  "            if (alen < blen) {" +
  "                if (alen < clen) choice = a;" +
  "                else choice = c;" +
  "            } else {" +
  "                if (blen < clen) choice = b;" +
  "                else choice = c;" +
  "            }" +
  "                        choice.x += choice.y * 0.5;" +
  "            choice.y *= 0.866025404;" +
  "            choice *= scale / texSize;" +
  "            gl_FragColor = texture2D(texture, toLocal(choice + center / texSize));" +
  "        }" +
  "    ";

export type HexagonalParameters = { centerX: number; centerY: number; scale: number };

export class GLHexagonalShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, Shader.tilingAwareVertexSource, SOURCE_HEAD + Shader.TOLOCAL + SOURCE_MAIN);
  }

  render(
    properties: HexagonalParameters,
    scale: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const tileWidth = this.glEffect.width;
    const tileHeight = this.glEffect.height;
    const centerX = 0.01 * width * properties.centerX;
    const centerY = 0.01 * height * properties.centerY;
    const size = 0.01 * Math.min(width, height) * Math.max(properties.scale, 0);
    this.simpleShader({
      center: [centerX, centerY],
      scale: size,
      texSize: [width, height],
      tileSize: [tileWidth, tileHeight],
      offset: [x, y],
    });
  }
}
