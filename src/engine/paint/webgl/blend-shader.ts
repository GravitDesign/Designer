// Old: chunk.vendor.js module 346.
//
// The shader for the blend modes Canvas 2D doesn't have. It blends the
// host's working texture (the backdrop) with a source texture and leaves
// the result in the working texture; one compiled program per mode.
import type { Rect } from "../../math/rect.ts";
import { GLContext, type GLTexture } from "./gl-context.ts";
import { Shader, type ShaderHost } from "./shader.ts";

/** The blend functions, in the order of BlendModes. */
export const BLENDERS = [
  "return (src + dst) - 1.0;\n",
  "return src + dst;\n",
  "return vec3((src.x <= 0.5) ? (1.0 - (1.0 - dst.x) / (2.0 * src.x)) : (dst.x / (2.0 * (1.0 - src.x))),\n                (src.y <= 0.5) ? (1.0 - (1.0 - dst.y) / (2.0 * src.y)) : (dst.y / (2.0 * (1.0 - src.y))),\n                (src.z <= 0.5) ? (1.0 - (1.0 - dst.z) / (2.0 * src.z)) : (dst.z / (2.0 * (1.0 - src.z))));\n",
  "return 2.0 * src + dst - 1.0;\n",
  "return vec3((src.x > 0.5) ? max(dst.x, 2.0 * (src.x - 0.5)) : min(dst.x, 2.0 * src.x),\n                (src.x > 0.5) ? max(dst.y, 2.0 * (src.y - 0.5)) : min(dst.y, 2.0 * src.y),\n                (src.z > 0.5) ? max(dst.z, 2.0 * (src.z - 0.5)) : min(dst.z, 2.0 * src.z));\n",
  "return vec3((src.x == 0.0) ? ((dst.x == 0.0) ? 0.0 : 1.0) : min(1.0, (dst.x / src.x)),\n                 (src.y == 0.0) ? ((dst.y == 0.0) ? 0.0 : 1.0) : min(1.0, (dst.y / src.y)),\n                 (src.z == 0.0) ? ((dst.z == 0.0) ? 0.0 : 1.0) : min(1.0, (dst.z / src.z)));\n",
  "return vec3(min(1.0, src.x + dst.x),\n                 min(1.0, src.y + dst.y),\n                 min(1.0, src.z + dst.z));\n",
  "return vec3(max(0.0, dst.x - src.x),\n                 max(0.0, dst.y - src.y),\n                 max(0.0, dst.z - src.z));\n",
  "return vec3(((src.x <= 0.5) ? (1.0 - (1.0 - dst.x) / (2.0 * src.x)) : (dst.x / (2.0 * (1.0 - src.x)))) < 0.5 ? 0.0 : 1.0,\n                 ((src.y <= 0.5) ? (1.0 - (1.0 - dst.y) / (2.0 * src.y)) : (dst.y / (2.0 * (1.0 - src.y)))) < 0.5 ? 0.0 : 1.0,\n                 ((src.z <= 0.5) ? (1.0 - (1.0 - dst.z) / (2.0 * src.z)) : (dst.z / (2.0 * (1.0 - src.z)))) < 0.5 ? 0.0 : 1.0);\n",
  "return vec3(sqrt((src.x*src.x+dst.x*dst.x)/2.0),\n                 sqrt((src.y*src.y+dst.y*dst.y)/2.0),\n                 sqrt((src.z*src.z+dst.z*dst.z)/2.0));\n",
  "return vec3(min(1.0,2.0/(1.0/src.x + 1.0/dst.x)),\n                 min(1.0,2.0/(1.0/src.y + 1.0/dst.y)),\n                 min(1.0,2.0/(1.0/src.z + 1.0/dst.z)));\n",
  "return vec3(sin(1.57079632679*(src.x+dst.x)),\n                 sin(1.57079632679*(src.y+dst.y)),\n                 sin(1.57079632679*(src.z+dst.z)));\n",
];

const SOURCE_HEAD = "        vec3 blend (vec3 src, vec3 dst)\n            {\n";

const SOURCE_TAIL =
  "        }\n        \n        uniform highp sampler2D texture0;\n        uniform highp sampler2D texture1;\n        uniform float opacity;\n        varying highp vec2 texCoord;\n        void main()\n        {\n            vec4 dst = texture2D(texture0, texCoord);\n            vec4 src = texture2D(texture1, texCoord);\n            vec3 color = dst.rgb * (1.0 - src.a) + clamp(blend(dst.rgb, src.rgb), 0.0, 1.0) * src.a;\n            gl_FragColor.rgb = color;\n            gl_FragColor.a = dst.a * (1.0 - src.a) + src.a;\n            \n        }\n";

/** What render() blends. */
export interface BlendParameters {
  /** A canvas (uploaded for this call) or a texture. */
  source: HTMLCanvasElement | GLTexture;
  blendMode: string;
  opacity: number;
  /** The part of the source canvas to upload. */
  area?: Rect | null;
  /** Where to draw in the working texture (x, y, width, height); the whole texture without. */
  dimensions?: { x: number; y: number; width: number; height: number } | null;
  [uniform: string]: unknown;
}

export class BlendShader extends Shader {
  static BlendModes = [
    "linear_burn",
    "linear_dodge",
    "vivid_light",
    "linear_light",
    "pin_light",
    "divide",
    "add",
    "subtract",
    "hardmix",
    "power",
    "harmonic",
    "sin",
  ];

  static Blenders = BLENDERS;

  /** Programs by blend mode. */
  shaders: Record<string, Shader>;

  // The old constructor didn't call the base one, so this shader has no
  // program of its own; only the per-mode shaders have one.
  constructor(glEffect: ShaderHost) {
    super(glEffect, null, null, true);
    this.shaders = [] as unknown as Record<string, Shader>;
  }

  getShaderSource(mode: string): string {
    let source = SOURCE_HEAD;
    source += BlendShader.Blenders[BlendShader.BlendModes.indexOf(mode)];
    source += SOURCE_TAIL;
    return source;
  }

  /** Blends `parameters.source` over the working texture with `parameters.blendMode`; other modes do nothing. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature passed a scale
  render(parameters: BlendParameters, scale?: number): void {
    const source = parameters.source;
    const mode = parameters.blendMode;
    if (BlendShader.BlendModes.indexOf(mode) < 0) return;
    let shader: Shader;
    if (Object.prototype.hasOwnProperty.call(this.shaders, mode))
      shader = this.shaders[mode] as Shader;
    else {
      this.shaders[mode] = shader = new Shader(this.glEffect, null, this.getShaderSource(mode));
      shader.textures({ texture1: 1 });
    }
    let texture: GLTexture;
    let uploaded = false;
    if (source instanceof HTMLCanvasElement) {
      const area = parameters.area;
      texture = (
        area
          ? GLContext.createTexture(
              source,
              area.getX(),
              area.getY(),
              area.getWidth(),
              area.getHeight(),
            )
          : GLContext.createTexture(source)
      ) as GLTexture;
      uploaded = true;
    } else texture = source;
    shader.glEffect.texture.use(0);
    texture.use(1);
    const width = shader.glEffect.spareTexture.width;
    const height = shader.glEffect.spareTexture.height;
    shader.glEffect.spareTexture.drawTo(() => {
      if (parameters.dimensions) {
        const box = parameters.dimensions;
        shader
          .uniforms(parameters)
          .drawRect(box.x, box.y, box.x + box.width, box.y + box.height, [0, 0, width, height]);
      } else {
        shader.uniforms(parameters).drawRect(void 0, void 0, void 0, void 0, [0, 0, width, height]);
      }
    });
    shader.glEffect.spareTexture.swapWith(shader.glEffect.texture);
    if (uploaded) texture.destroy();
  }

  override destroy(): void {}
}
