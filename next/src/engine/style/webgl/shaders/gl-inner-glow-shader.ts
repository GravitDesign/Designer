// Old: chunk.vendor.js module 488 (GGLInnerGlowShader).
//
// Paints the transparent surroundings in the glow color, blurs that into
// the extra texture and lays it over the opaque part of the content.
import { Shader } from "../../../paint/webgl/shader.ts";
import { radiusToSigma, type EffectShaderHost } from "./effect-shader-host.ts";
import { GLBlurShader } from "./gl-blur-shader.ts";

const MERGE_SOURCE =
  "        varying highp vec2 texCoord;" +
  "        uniform highp sampler2D texture0;" +
  "        uniform highp sampler2D texture1;" +
  "        uniform float glow_intensity;" +
  "        void main(){" +
  "            vec4 glow = texture2D(texture1, texCoord);" +
  "            vec4 base = texture2D(texture0, texCoord);" +
  "            if (base.a > 0.1) {" +
  "                glow *= glow_intensity;" +
  "                gl_FragColor = vec4(base.rgb*(1.0-glow.a) + glow.rgb*glow.a,base.a);" +
  "            } else {" +
  "                gl_FragColor = base;" +
  "            }" +
  "        }" +
  "    ";

const COLORIZE_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        uniform vec3 color;" +
  "        varying highp vec2 texCoord;" +
  "        void main(){" +
  "            vec4 c = texture2D(texture, texCoord);" +
  "            if (c.a < 1.0) {" +
  "                gl_FragColor = vec4(color,1.0);" +
  "            } else {" +
  "                gl_FragColor = vec4(1.0,1.0,1.0,0.0);" +
  "            }" +
  "        }" +
  "        ";

export type InnerGlowParameters = {
  radius: number;
  intensity: number;
  /** 0-255 RGB. */
  color: number[];
  opacity: { type: string; value: number };
};

export class GLInnerGlowShader extends Shader {
  declare glEffect: EffectShaderHost;
  colorize: Shader | null;
  blur: GLBlurShader | null;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, MERGE_SOURCE);
    this.textures({ texture1: 1 });
    this.colorize = new Shader(glEffect, null, COLORIZE_SOURCE);
    this.blur = new GLBlurShader(glEffect);
  }

  render(properties: InnerGlowParameters, scale: number): void {
    const color = properties.color.slice();
    (color[0] as number) /= 255;
    (color[1] as number) /= 255;
    (color[2] as number) /= 255;
    const host = this.glEffect;
    host.extraTexture.ensureFormat(host.texture);
    (this.colorize as Shader).simpleShader({ color }, host.texture, host.extraTexture);
    const radius = properties.radius * scale;
    const blur = this.blur as GLBlurShader;
    blur.simpleShader(
      { sigma: radiusToSigma(radius), blurMultiplyVec: [1 / host.width, 0] },
      host.extraTexture,
      host.extraTexture,
    );
    blur.simpleShader(
      { sigma: radiusToSigma(radius), blurMultiplyVec: [0, 1 / host.height] },
      host.extraTexture,
      host.extraTexture,
    );
    host.extraTexture.use(1);
    this.simpleShader({ glow_intensity: properties.intensity });
  }

  override destroy(): void {
    if (this.colorize) this.colorize.destroy();
    if (this.blur) this.blur.destroy();
    super.destroy();
  }
}
