// Old: chunk.vendor.js module 484 (GGLFishEyeShader).
//
// Fish eye (strength > 0) or its inverse (< 0) around the center of the
// whole image. Tiling aware.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const HEAD =
  "        uniform highp sampler2D texture;\n" +
  "        uniform float strength;\n" +
  "        uniform vec2 texSize;\n" +
  "        varying highp vec2 texCoord;\n" +
  "        uniform vec2 tileSize;\n" +
  "        uniform vec2 offset;\n" +
  "        varying vec2 localTexCoord;\n";

const MAIN =
  "        void main() {\n" +
  "            vec4 color = texture2D(texture, localTexCoord);\n" +
  "                        vec2 p = texCoord.xy;\n" +
  "            vec2 m = vec2(0.5, 0.5);\n" +
  "            vec2 d = p - m;\n" +
  "            float prop = texSize.x/texSize.y;\n" +
  "            float r = sqrt(dot(d, d));\n" +
  "                        float power = ( 2.0 * 3.141592 / (2.0 * sqrt(dot(m, m))) ) * strength;\n" +
  "            float bind;\n" +
  "            if (power > 0.0) bind = sqrt(dot(m, m));//stick to corners\n" +
  "            else {if (prop < 1.0) bind = m.x; else bind = m.y;}\n" +
  "            vec2 uv;\n" +
  "            if (power > 0.0)\n" +
  "                uv = m + normalize(d) * tan(r * power) * bind / tan( bind * power);\n" +
  "            else if (power < 0.0)\n" +
  "                uv = m + normalize(d) * atan(r * -power * 10.0) * bind / atan(-power * bind * 10.0);\n" +
  "            else uv = p;" +
  "            gl_FragColor = texture2D(texture, toLocal(uv));\n" +
  "        }\n" +
  "    ";

export type FisheyeParameters = { strength: number };

export class GLFisheyeShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, Shader.tilingAwareVertexSource, HEAD + Shader.TOLOCAL + MAIN);
  }

  render(
    properties: FisheyeParameters,
    scale: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const strength = properties.strength / 200;
    this.simpleShader({
      strength: Shader.clamp(-0.5, strength, 0.5),
      texSize: [width, height],
      tileSize: [this.glEffect.width, this.glEffect.height],
      offset: [x, y],
    });
  }
}
