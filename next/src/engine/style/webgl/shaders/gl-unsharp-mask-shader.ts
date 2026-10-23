// Old: chunk.vendor.js module 500 (GGLUnsharpMaskShader, from glfx.js).
//
// Blurs the working texture, keeping a copy of the original in the extra
// texture, and pushes the original away from the blurred version.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";
import { GLBlurShader } from "./gl-blur-shader.ts";

const FRAGMENT_SOURCE =
  "        uniform highp sampler2D blurredTexture;" +
  "        uniform highp sampler2D originalTexture;" +
  "        uniform float strength;" +
  "        uniform float threshold;" +
  "        varying highp vec2 texCoord;" +
  "        void main() {" +
  "            vec4 blurred = texture2D(blurredTexture, texCoord);" +
  "            vec4 original = texture2D(originalTexture, texCoord);" +
  "            gl_FragColor = mix(blurred, original, 1.0 + strength);" +
  "        }" +
  "    ";

export type UnsharpMaskParameters = { radius: number; strength: number };

export class GLUnsharpMaskShader extends Shader {
  declare glEffect: EffectShaderHost;
  declare blur: GLBlurShader;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, FRAGMENT_SOURCE);
    this.blur = new GLBlurShader(this.glEffect);
  }

  render(properties: UnsharpMaskParameters, scale: number): void {
    const host = this.glEffect;
    host.extraTexture.ensureFormat(host.texture);
    host.texture.use();
    host.extraTexture.drawTo(() => {
      Shader.getDefaultShader().drawRect(void 0, void 0, void 0, void 0, [
        0,
        0,
        host.extraTexture.width,
        host.extraTexture.height,
      ]);
    });
    host.extraTexture.use(1);
    this.blur.render({ radius: properties.radius }, scale);
    this.textures({ originalTexture: 1 });
    this.simpleShader({ strength: properties.strength });
    host.extraTexture.unuse(1);
  }

  override destroy(): void {
    if (this.blur) this.blur.destroy();
    super.destroy();
  }
}
