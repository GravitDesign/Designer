// Old: chunk.vendor.js module 503 (GGLWarpShader).
//
// A fixed sine warp without parameters. No effect names it; it is only
// reachable through the shader table.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const FRAGMENT_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        varying highp vec2 texCoord;" +
  "        void main() {" +
  "            vec2 uv = texCoord;" +
  "            vec4 color = texture2D(texture,vec2(uv.x,-uv.y+0.5*sin(uv.x*4.0)));" +
  "            gl_FragColor = color;" +
  "        }" +
  "    ";

export class GLWarpShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, FRAGMENT_SOURCE);
  }

  render(): void {
    this.simpleShader({});
  }
}
