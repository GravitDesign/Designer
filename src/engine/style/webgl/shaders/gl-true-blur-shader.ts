// Old: chunk.vendor.js module 499 (GGLTrueBlurShader).
//
// A one-pass blur over jittered samples around each pixel.
import { Shader } from "../../../paint/webgl/shader.ts";
import { radiusToSigma, type EffectShaderHost } from "./effect-shader-host.ts";

const SOURCE_HEAD =
  "        uniform highp sampler2D texture;" +
  "        uniform float sigma;" +
  "        uniform float radius;" +
  "        uniform vec2 delta;" +
  "        uniform vec2 dimensions;" +
  "        varying highp vec2 texCoord;" +
  "        const float numSamples = 30.0;" +
  "        const float step       = 1.0/numSamples;" +
  "        const float pi = 3.14159265;" +
  "        ";

const SOURCE_MAIN =
  "        void main() {" +
  "            vec4 color = vec4(0.0);" +
  "            float total = 0.0;" +
  "            float r2    = 2.0*sigma*sigma;" +
  "            float pir2  = 1.0/(sqrt(2.0*pi)*sigma);" +
  "                        for (float i = -1.0; i <= 1.0; i+=step) {" +
  "                /*float offsetx = (random(vec3(12.9898, 78.233, 151.7182), 0.0+i)-0.5)/numSamples;*/" +
  "                for (float j = -1.0; j <= 1.0; j+=step) {" +
  "                    /*float offsety = (random(vec3(12.9898, 78.233, 151.7182), 0.4321+j)-0.5)/numSamples;*/" +
  "                    /*vec2 pos = vec2(radius*offsetx,radius*offsety)/dimensions;*/" +
  "                    vec2 pos = delta * vec2(i,j);" +
  "                    float d2 = pos.x*pos.x+pos.y*pos.y;" +
  "                    float w = exp(-d2/r2)*pir2;" +
  "                    vec4 sample = texture2D(texture, texCoord + pos);" +
  "                    sample.rgb *= sample.a;" +
  "                    color += sample * w;" +
  "                    total += w;" +
  "                }" +
  "            }" +
  "            gl_FragColor = color / total;" +
  "            if (gl_FragColor.a == 0.0) {" +
  "                gl_FragColor.rgb = vec3(1.0,1.0,1.0);" +
  "            } else {" +
  "                gl_FragColor.rgb = (gl_FragColor.rgb+0.0001)/gl_FragColor.a;" +
  "            }" +
  "        }" +
  "    ";

export type TrueBlurParameters = { radius: number };

export class GLTrueBlurShader extends Shader {
  declare glEffect: EffectShaderHost;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, SOURCE_HEAD + Shader.randomShaderFunc + SOURCE_MAIN);
  }

  render(properties: TrueBlurParameters, scale: number): void {
    const radius = properties.radius * scale;
    if (isNaN(radius) || 0 == radius) return;
    const width = this.glEffect.width;
    const height = this.glEffect.height;
    this.simpleShader({
      sigma: radiusToSigma(radius),
      dimensions: [width, height],
      delta: [radius / width, radius / height],
    });
  }
}
