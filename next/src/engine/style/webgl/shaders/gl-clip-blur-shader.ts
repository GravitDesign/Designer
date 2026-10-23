// Old: chunk.vendor.js module 365 (the clipping blur shader, GGLClipBlurShader).
//
// The blur of GGLBlurEffect with "clip" on: like GLBlurShader, but only
// pixels above an alpha threshold blur, so the shape keeps its outline.
// Samples are jittered and the result dithered, then anti-aliased.
import { Shader } from "../../../paint/webgl/shader.ts";
import { radiusToSigma, type EffectShaderHost } from "./effect-shader-host.ts";

const MAX_PRECOMPILED_RADIUS = 128;
const RADIUS_STEP = 32;

const SOURCE_HEAD =
  "    varying highp vec2 texCoord;" +
  "    uniform float sigma;" +
  "    uniform vec2  blurMultiplyVec;" +
  "    uniform highp sampler2D texture;" +
  "    const float blurPixels = ";

const SOURCE_DECLARATIONS =
  ";" +
  "    const float THRESHOLD = 0.7;/*alpha threshold to start clipping*/" +
  "    const float pi = 3.14159265;" +
  "    uniform vec2 texSize;" +
  "    ";

const SOURCE_MAIN =
  "    void main() {" +
  "        vec3 incrementalGaussian;" +
  "        incrementalGaussian.x = 1.0 / (sqrt(2.0 * pi) * sigma);" +
  "        incrementalGaussian.y = exp(-0.5 / (sigma * sigma));" +
  "        incrementalGaussian.z = incrementalGaussian.y * incrementalGaussian.y;" +
  "        float rand = random(vec3(123.45,54.321,0.666), 0.0);" +
  "        float threshold = THRESHOLD/* + 0.1 * rand <= this sometimes removes some artifacts*/;" +
  "                vec4 avgValue = vec4(0.0, 0.0, 0.0, 0.0);" +
  "        float coefficientSum = 0.0;" +
  "                vec4 sample = texture2D(texture, texCoord.xy);" +
  "        if (sample.a < 1.0-threshold) {" +
  "            gl_FragColor = vec4(sample.rgb*sample.a, sample.a);" +
  "            return;" +
  "         }" +
  "        sample.rgb *= sample.a;" +
  "        avgValue += sample * incrementalGaussian.x;" +
  "        coefficientSum += incrementalGaussian.x;" +
  "        incrementalGaussian.xy *= incrementalGaussian.yz;" +
  "                for (float i = 1.0; i <= blurPixels; i++) {" +
  "            sample = texture2D(texture, texCoord.xy - (i + rand*0.5 - 0.25) * blurMultiplyVec);" +
  "            if (sample.a > threshold) {" +
  "                sample.rgb *= sample.a;" +
  "                avgValue += sample * incrementalGaussian.x;" +
  "                coefficientSum += incrementalGaussian.x;" +
  "                            }" +
  "            sample = texture2D(texture, texCoord.xy + (i + rand*0.5 - 0.25) * blurMultiplyVec);" +
  "            if (sample.a > threshold) {" +
  "                sample.rgb *= sample.a;" +
  "                avgValue += sample * incrementalGaussian.x;" +
  "                coefficientSum += incrementalGaussian.x;" +
  "                            }" +
  "            incrementalGaussian.xy *= incrementalGaussian.yz;" +
  "        }" +
  "        gl_FragColor = avgValue / coefficientSum;" +
  "        if (gl_FragColor.a == 0.0) {" +
  "            gl_FragColor.rgb = vec3(1.0,1.0,1.0);" +
  "        } else {" +
  "            gl_FragColor.rgb = (gl_FragColor.rgb+0.0001)/gl_FragColor.a + screenSpaceDither(texCoord*texSize);" +
  "        }" +
  "    }";

export type ClipBlurParameters = { radius: number };

export class GLClipBlurShader extends Shader {
  declare glEffect: EffectShaderHost;
  /** Programs for radii over 32: index i samples 32 * (i + 2) pixels. */
  declare higherBlurs: (Shader | null)[] | null;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, GLClipBlurShader.prototype._genBlur(RADIUS_STEP));
    this.higherBlurs = [];
    for (let pixels = 2 * RADIUS_STEP; pixels <= MAX_PRECOMPILED_RADIUS; pixels += RADIUS_STEP) {
      this.higherBlurs.push(null);
    }
    let index = 0;
    for (let pixels = 2 * RADIUS_STEP; pixels <= MAX_PRECOMPILED_RADIUS; pixels += RADIUS_STEP) {
      this.higherBlurs[index++] = new Shader(glEffect, null, this._genBlur(pixels));
    }
  }

  /** The fragment source sampling `pixels` texels to each side. */
  _genBlur(pixels: number): string {
    return (
      SOURCE_HEAD +
      pixels.toFixed(1) +
      SOURCE_DECLARATIONS +
      Shader.screenSpaceDither +
      "    " +
      Shader.randomShaderFunc +
      SOURCE_MAIN
    );
  }

  render(
    properties: ClipBlurParameters,
    scale: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const radius = properties.radius * scale;
    if (isNaN(radius) || 0 == radius) return;
    let shader: Shader;
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- the base program serves radii up to 32
    if (radius <= RADIUS_STEP) shader = this;
    else {
      const index = Math.max(0, Math.floor((radius - 1) / RADIUS_STEP) - 1);
      const blurs = this.higherBlurs as (Shader | null)[];
      shader =
        blurs[index] ||
        (blurs[index] = new Shader(this.glEffect, null, this._genBlur(RADIUS_STEP * (2 + index))));
    }
    const sigma = radiusToSigma(radius);
    shader.simpleShader({
      sigma,
      blurMultiplyVec: [1 / this.glEffect.width, 0],
      texSize: [width, height],
    });
    shader.simpleShader({
      sigma,
      blurMultiplyVec: [0, 1 / this.glEffect.height],
      texSize: [width, height],
    });
    if (radius > scale) this.fxaa(x, y, width, height);
  }
}

GLClipBlurShader.prototype.higherBlurs = null;
