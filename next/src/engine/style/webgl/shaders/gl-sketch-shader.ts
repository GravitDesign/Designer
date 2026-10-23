// Old: chunk.vendor.js module 494 (GGLSketchShader).
//
// A Sobel edge detection (from GPUImage) drawn as dark lines on white.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const FRAGMENT_SOURCE =
  "        precision mediump float;" +
  "         varying highp vec2 texCoord;" +
  "         varying vec2 leftTextureCoordinate;" +
  "         varying vec2 rightTextureCoordinate;" +
  "         varying vec2 topTextureCoordinate;" +
  "         varying vec2 topLeftTextureCoordinate;" +
  "         varying vec2 topRightTextureCoordinate;" +
  "         varying vec2 bottomTextureCoordinate;" +
  "         varying vec2 bottomLeftTextureCoordinate;" +
  "         varying vec2 bottomRightTextureCoordinate;" +
  "         uniform float edgeStrength;" +
  "         uniform highp sampler2D texture;" +
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
  "             float mag = 1.0 - (length(vec2(h, v)) * edgeStrength);" +
  "             gl_FragColor = vec4(vec3(mag), textureColor.a);" +
  "         }" +
  "    ";

export type SketchParameters = { strength: number };

export class GLSketchShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, Shader.sobelVertexShader, FRAGMENT_SOURCE);
  }

  render(properties: SketchParameters): void {
    this.simpleShader({
      texelWidth: 1 / this.glEffect.width,
      // Misspelled in the old code, so the vertex shader's texelHeight
      // uniform is never set (it stays 0).
      textlHeight: 1 / this.glEffect.height,
      edgeStrength: properties.strength,
    });
  }
}
