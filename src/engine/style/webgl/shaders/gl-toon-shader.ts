// Old: chunk.vendor.js module 498 (GGLToonShader, from GPUImage).
//
// Sobel edges drawn black plus colour quantization. The old render step
// sets "textlHeight" (sic), which the program doesn't have, so the texel
// height uniform stays 0; kept for parity.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const FRAGMENT_SOURCE =
  "        precision highp float;" +
  "         varying highp vec2 texCoord;" +
  "         varying vec2 leftTextureCoordinate;" +
  "         varying vec2 rightTextureCoordinate;" +
  "         varying vec2 topTextureCoordinate;" +
  "         varying vec2 topLeftTextureCoordinate;" +
  "         varying vec2 topRightTextureCoordinate;" +
  "         varying vec2 bottomTextureCoordinate;" +
  "         varying vec2 bottomLeftTextureCoordinate;" +
  "         varying vec2 bottomRightTextureCoordinate;" +
  "         uniform highp sampler2D texture;" +
  "         uniform highp float threshold;" +
  "         uniform highp float quantizationLevels;" +
  "         const highp vec3 W = vec3(0.2125, 0.7154, 0.0721);" +
  "         void main()" +
  "         {" +
  "             vec4 textureColor = texture2D(texture, texCoord);" +
  "             float bottomLeftIntensity = texture2D(texture, bottomLeftTextureCoordinate).r;" +
  "             float topRightIntensity = texture2D(texture, topRightTextureCoordinate).r;" +
  "             float topLeftIntensity = texture2D(texture, topLeftTextureCoordinate).r;" +
  "             float bottomRightIntensity = texture2D(texture, bottomRightTextureCoordinate).r;" +
  "             float leftIntensity = texture2D(texture, leftTextureCoordinate).r;" +
  "             float rightIntensity = texture2D(texture, rightTextureCoordinate).r;" +
  "             float bottomIntensity = texture2D(texture, bottomTextureCoordinate).r;" +
  "             float topIntensity = texture2D(texture, topTextureCoordinate).r;" +
  "             float h = -topLeftIntensity - 2.0 * topIntensity - topRightIntensity + bottomLeftIntensity + 2.0 * bottomIntensity + bottomRightIntensity;" +
  "             float v = -bottomLeftIntensity - 2.0 * leftIntensity - topLeftIntensity + bottomRightIntensity + 2.0 * rightIntensity + topRightIntensity;" +
  "             float mag = length(vec2(h, v));" +
  "             vec3 posterizedImageColor = floor((textureColor.rgb * quantizationLevels) + 0.5) / quantizationLevels;" +
  "             float thresholdTest = 1.0 - step(threshold, mag);" +
  "             gl_FragColor = vec4(posterizedImageColor * thresholdTest, textureColor.a);" +
  "         }" +
  "    ";

export type ToonParameters = { threshold: number; quantization: number };

export class GLToonShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, Shader.sobelVertexShader, FRAGMENT_SOURCE);
  }

  render(properties: ToonParameters): void {
    this.simpleShader({
      texelWidth: 1 / this.glEffect.width,
      textlHeight: 1 / this.glEffect.height,
      threshold: properties.threshold,
      quantizationLevels: properties.quantization,
    });
  }
}
