// Old: chunk.vendor.js module 315 (GGLBendBlurShader).
//
// The curved shadow's blur: the first pass bends the image along a sine
// and blurs it horizontally, the second blurs it vertically. The blur grows
// with the distance from the middle (or from the sides for a negative
// bend), and `krycie` (Polish for "coverage") sets how opaque it stays.
import { Shader } from "../../../paint/webgl/shader.ts";
import { radiusToSigma, type EffectShaderHost } from "./effect-shader-host.ts";

const BEND_AND_BLUR_HEAD =
  "    varying highp vec2 texCoord;" +
  "    varying vec2 localTexCoord;" +
  "    uniform float sigma;" +
  "    uniform float sigma2;" +
  "    uniform float bend;" +
  "    uniform float krycie;" +
  "    uniform vec2  blurMultiplyVec;" +
  "    uniform highp sampler2D texture;" +
  "    uniform float padding;" +
  "    uniform vec2 tileSize;" +
  "    uniform vec2 offset;" +
  "    uniform vec2 texSize;" +
  "    const float blurPixels = ";

const DECLARATIONS_TAIL = ";" + "    const float pi = 3.14159265;\n";

const BEND_AND_BLUR_MAIN =
  "\n" +
  "    void main() {" +
  "        float sbend = sign(bend);" +
  "        vec2 coord = texCoord + vec2(0.0, -bend*max(0.0,sbend) + sbend*bend*sin((texCoord.x-padding)/(1.0-2.0*padding)*pi));" +
  "        float distCoeff = smoothstep(0.0,0.5,max(-sbend,0.0)*min(abs(coord.x),abs(coord.x-1.0)) + max(sbend,0.0)*abs(coord.x-0.5));" +
  "        float newSigma = sigma2 + sigma*distCoeff;" +
  "        vec3 incrementalGaussian;" +
  "        incrementalGaussian.x = 1.0 / (sqrt(2.0 * pi) * newSigma);" +
  "        incrementalGaussian.y = exp(-0.5 / (newSigma * newSigma));" +
  "        incrementalGaussian.z = incrementalGaussian.y * incrementalGaussian.y;" +
  "                vec4 avgValue = vec4(0.0, 0.0, 0.0, 0.0);" +
  "        float coefficientSum = 0.0;" +
  "                vec4 sample = texture2D(texture, toLocal(coord.xy));" +
  "        sample.rgb *= sample.a;" +
  "        avgValue += sample * incrementalGaussian.x;" +
  "        coefficientSum += incrementalGaussian.x;" +
  "        incrementalGaussian.xy *= incrementalGaussian.yz;" +
  "                for (float i = 1.0; i <= blurPixels; i++) {" +
  "            sample = texture2D(texture, toLocal(coord.xy - i * blurMultiplyVec));" +
  "            sample.rgb *= sample.a;" +
  "            avgValue += sample * incrementalGaussian.x;" +
  "            sample = texture2D(texture, toLocal(coord.xy + i * blurMultiplyVec));" +
  "            sample.rgb *= sample.a;" +
  "            avgValue += sample * incrementalGaussian.x;" +
  "            coefficientSum += 2.0 * incrementalGaussian.x;" +
  "            incrementalGaussian.xy *= incrementalGaussian.yz;" +
  "        }" +
  "        gl_FragColor = avgValue / coefficientSum;" +
  "        gl_FragColor.a = distCoeff*(1.0-krycie)*gl_FragColor.a + krycie*gl_FragColor.a;" +
  "        if (gl_FragColor.a == 0.0) {" +
  "            gl_FragColor.rgb = vec3(1.0,1.0,1.0);" +
  "        } else {" +
  "            gl_FragColor.rgb = (gl_FragColor.rgb+0.0001)/gl_FragColor.a;" +
  "        }" +
  "    }";

const BLUR_FINISH_HEAD =
  "    varying highp vec2 texCoord;" +
  "    varying vec2 localTexCoord;" +
  "    uniform float sigma;" +
  "    uniform float sigma2;" +
  "    uniform float bend;" +
  "    uniform float krycie;" +
  "    uniform vec2  blurMultiplyVec;" +
  "    uniform highp sampler2D texture;" +
  "    uniform vec2 tileSize;" +
  "    uniform vec2 offset;" +
  "    uniform vec2 texSize;" +
  "    const float blurPixels = ";

const BLUR_FINISH_MAIN =
  "\n" +
  "    void main() {" +
  "        vec3 incrementalGaussian;" +
  "        float sbend = sign(bend);" +
  "        float distCoeff = smoothstep(0.0,0.5,max(-sbend,0.0)*min(abs(texCoord.x),abs(texCoord.x-1.0)) + max(sbend,0.0)*abs(texCoord.x-0.5));" +
  "        float newSigma = sigma2 + sigma*distCoeff;" +
  "        incrementalGaussian.x = 1.0 / (sqrt(2.0 * pi) * newSigma);" +
  "        incrementalGaussian.y = exp(-0.5 / (newSigma * newSigma));" +
  "        incrementalGaussian.z = incrementalGaussian.y * incrementalGaussian.y;" +
  "                vec4 avgValue = vec4(0.0, 0.0, 0.0, 0.0);" +
  "        float coefficientSum = 0.0;" +
  "                vec4 sample = texture2D(texture, localTexCoord.xy);" +
  "        sample.rgb *= sample.a;" +
  "        avgValue += sample * incrementalGaussian.x;" +
  "        coefficientSum += incrementalGaussian.x;" +
  "        incrementalGaussian.xy *= incrementalGaussian.yz;" +
  "                for (float i = 1.0; i <= blurPixels; i++) {" +
  "            sample = texture2D(texture, toLocal(texCoord.xy - i * blurMultiplyVec));" +
  "            sample.rgb *= sample.a;" +
  "            avgValue += sample * incrementalGaussian.x;" +
  "            sample = texture2D(texture, toLocal(texCoord.xy + i * blurMultiplyVec));" +
  "            sample.rgb *= sample.a;" +
  "            avgValue += sample * incrementalGaussian.x;" +
  "            coefficientSum += 2.0 * incrementalGaussian.x;" +
  "            incrementalGaussian.xy *= incrementalGaussian.yz;" +
  "        }" +
  "        gl_FragColor = avgValue / coefficientSum;" +
  "        gl_FragColor.a = distCoeff*distCoeff*(1.0-krycie)*gl_FragColor.a + krycie*gl_FragColor.a;" +
  "        if (gl_FragColor.a == 0.0) {" +
  "            gl_FragColor.rgb = vec3(1.0,1.0,1.0);" +
  "        } else {" +
  "            gl_FragColor.rgb = (gl_FragColor.rgb+0.0001)/gl_FragColor.a;" +
  "        }" +
  "    }";

export type BendBlurParameters = { radius: number; softness: number; bend: number; cov: number };

export class GLBendBlurShader extends Shader {
  static MAX_BLUR = 80;
  static MAX_BLUR2 = 40;
  static RADIUS_TO_BLUR = 2;

  declare glEffect: EffectShaderHost;
  declare _bendAndBlurSrc: string;
  declare _blurFinish: string;
  _bendAndBlur: Shader;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, Shader.tilingAwareVertexSource, GLBendBlurShader.prototype._blurFinish);
    this._bendAndBlur = new Shader(glEffect, Shader.tilingAwareVertexSource, this._bendAndBlurSrc);
  }

  render(
    properties: BendBlurParameters,
    scale: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const tileWidth = this.glEffect.width;
    const tileHeight = this.glEffect.height;
    const radius = properties.radius * scale;
    let softness = properties.softness;
    if (softness <= 0) softness = 0.001;
    const bend = properties.bend * scale;
    const blur = softness * GLBendBlurShader.MAX_BLUR2 * scale;
    const baseBlur = softness * radius;
    const padding = blur + baseBlur + radius * GLBendBlurShader.RADIUS_TO_BLUR;
    const texture = this.glEffect.texture;
    this._bendAndBlur.simpleShader(
      {
        sigma: this._radiusToSigma(blur),
        sigma2: this._radiusToSigma(baseBlur),
        blurMultiplyVec: [1 / width, 0],
        bend: bend / height,
        krycie: properties.cov,
        padding: padding / width,
        tileSize: [tileWidth, tileHeight],
        texSize: [width, height],
        offset: [x, y],
      },
      texture,
      texture,
    );
    this.simpleShader(
      {
        sigma: this._radiusToSigma(blur),
        sigma2: this._radiusToSigma(baseBlur),
        bend: bend / height,
        krycie: properties.cov,
        blurMultiplyVec: [0, 1 / height],
        tileSize: [tileWidth, tileHeight],
        texSize: [width, height],
        offset: [x, y],
      },
      texture,
      texture,
    );
  }

  _radiusToSigma(radius: number): number {
    return radiusToSigma(radius);
  }
}

GLBendBlurShader.prototype._bendAndBlurSrc =
  BEND_AND_BLUR_HEAD +
  GLBendBlurShader.MAX_BLUR.toFixed(1) +
  DECLARATIONS_TAIL +
  Shader.TOLOCAL +
  BEND_AND_BLUR_MAIN;

GLBendBlurShader.prototype._blurFinish =
  BLUR_FINISH_HEAD +
  GLBendBlurShader.MAX_BLUR.toFixed(1) +
  DECLARATIONS_TAIL +
  Shader.TOLOCAL +
  BLUR_FINISH_MAIN;
