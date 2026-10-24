// Old: chunk.vendor.js module 475 (GGLBloomShader).
//
// Bloom: the bright parts (over a threshold) go into the extra texture,
// are blurred there and then blended back over the saturation-adjusted
// image.
import { Shader } from "../../../paint/webgl/shader.ts";
import { radiusToSigma, type EffectShaderHost } from "./effect-shader-host.ts";
import { GLBlurShader } from "./gl-blur-shader.ts";

const MERGE_SOURCE =
  "        varying highp vec2 texCoord;" +
  "        uniform highp sampler2D texture0;" +
  "        uniform highp sampler2D texture1;" +
  "        uniform float bloom_intensity;" +
  "        uniform float base_intensity;" +
  "        uniform float bloom_saturation;" +
  "        uniform float base_saturation;" +
  "        vec4 adjustSaturation(vec4 color, float saturation){" +
  "            float grey = dot(color.rgb, vec3(0.3, 0.59, 0.11));" +
  "            return vec4(mix(grey, color.r, saturation),mix(grey, color.g, saturation),mix(grey, color.b, saturation),color.a);" +
  "        }" +
  "        void main(){" +
  "            vec4 bloom = texture2D(texture1, texCoord);" +
  "            vec4 base = texture2D(texture0, texCoord);" +
  "            bloom = adjustSaturation(bloom, bloom_saturation);" +
  "            bloom.rgb *= bloom_intensity;" +
  "            base = adjustSaturation(base, base_saturation);" +
  "            base.rgb *= base_intensity;" +
  "            base *= (1.0 - clamp(bloom,0.0,1.0));" +
  "            gl_FragColor = base + bloom;" +
  "        }" +
  "    ";

const BRIGHTNESS_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        varying highp vec2 texCoord;" +
  "        uniform float bloom_threshold;" +
  "        uniform float bloom_ithreshold;" +
  "        void main(){" +
  "            vec4 c = texture2D(texture, texCoord);" +
  "            gl_FragColor = vec4(c.rgb*bloom_ithreshold - bloom_threshold,c.a);" +
  "        }" +
  "        ";

export type BloomParameters = {
  bloomIntensity: number;
  baseIntensity: number;
  bloomSaturation: number;
  baseSaturation: number;
  blurRadius: number;
  bloomThreshold: number;
};

export class GLBloomShader extends Shader {
  declare glEffect: EffectShaderHost;
  /** Keeps what is brighter than the threshold, rescaled to 0-1. */
  declare brightness: Shader | null;
  declare blur: GLBlurShader | null;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, MERGE_SOURCE);
    this.textures({ texture1: 1 });
    this.brightness = new Shader(glEffect, null, BRIGHTNESS_SOURCE);
    this.blur = new GLBlurShader(glEffect);
  }

  render(properties: BloomParameters, scale: number): void {
    const host = this.glEffect;
    host.extraTexture.ensureFormat(host.texture);
    (this.brightness as Shader).simpleShader(
      {
        bloom_threshold: properties.bloomThreshold / (1 - properties.bloomThreshold),
        bloom_ithreshold: 1 / (1 - properties.bloomThreshold),
      },
      host.texture,
      host.extraTexture,
    );
    const radius = properties.blurRadius * scale;
    const blur = this.blur as GLBlurShader;
    // The blur's own program only (32 px), whatever the radius.
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
    this.simpleShader({
      bloom_intensity: properties.bloomIntensity,
      base_intensity: properties.baseIntensity,
      bloom_saturation: properties.bloomSaturation,
      base_saturation: properties.baseSaturation,
    });
  }

  override destroy(): void {
    if (this.brightness) this.brightness.destroy();
    if (this.blur) this.blur.destroy();
    super.destroy();
  }
}

GLBloomShader.prototype.brightness = null;
GLBloomShader.prototype.blur = null;
