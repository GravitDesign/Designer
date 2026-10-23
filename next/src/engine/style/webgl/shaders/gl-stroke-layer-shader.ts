// Old: chunk.vendor.js module 495 (GGLStrokeLayerShader).
//
// A stroke around the content's alpha: the alpha is grown one pixel per
// pass (`width` passes) in the stroke color, outside the shape, inside it
// (on the inverted alpha) or half each way for the center placement, and
// merged with the content.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { GLTexture } from "../../../paint/webgl/gl-context.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const OUTER_MERGE_SOURCE =
  "        varying highp vec2 texCoord;" +
  "        uniform highp sampler2D texture0;" +
  "        uniform highp sampler2D texture1;" +
  "        uniform float opacity;" +
  "        void main(){" +
  "            vec4 base = texture2D(texture0, texCoord);" +
  "            vec4 stroke = texture2D(texture1, texCoord);" +
  "            stroke.a = clamp(stroke.a,0.0,opacity);" +
  "            gl_FragColor = base.a * base.rgba + (1.0-base.a) * stroke.rgba;" +
  "        }" +
  "    ";

/** Grows the alpha by one pixel in all eight directions (diagonals weighted by shapeCoeff). */
const STROKIFY_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        uniform vec3 color;" +
  "        varying highp vec2 texCoord;" +
  "        uniform float width;" +
  "        uniform float height;" +
  "        uniform float softness;" +
  "        uniform float shapeCoeff;" +
  "        void main(){" +
  "            float alpha = 0.0;" +
  "            alpha += texture2D(texture, texCoord + vec2( -width, height)).a;" +
  "            alpha += texture2D(texture, texCoord + vec2( width, height)).a;" +
  "            alpha += texture2D(texture, texCoord + vec2( width, -height)).a;" +
  "            alpha += texture2D(texture, texCoord + vec2( -width, -height)).a;" +
  "            /*if shapeCoeff is 1.0/sqrt(2) -> rounded corners */" +
  "            alpha *= shapeCoeff;" +
  "            alpha += texture2D(texture, texCoord + vec2( 0.0, height)).a;" +
  "            alpha += texture2D(texture, texCoord + vec2( -width, 0.0)).a;" +
  "            alpha += texture2D(texture, texCoord + vec2( width, 0.0)).a;" +
  "            alpha += texture2D(texture, texCoord + vec2( 0.0, -height)).a;" +
  "            gl_FragColor = vec4(color,alpha*softness);" +
  "        }" +
  "        ";

const INNER_MERGE_SOURCE =
  "        varying highp vec2 texCoord;" +
  "        uniform highp sampler2D texture0;" +
  "        uniform highp sampler2D texture1;" +
  "        uniform float opacity;" +
  "        void main(){" +
  "            vec4 base = texture2D(texture0, texCoord);" +
  "            vec4 stroke = texture2D(texture1, texCoord);" +
  "            if (base.a > 0.1) {" +
  "                stroke.a = clamp(stroke.a,0.0,opacity);" +
  "                gl_FragColor = vec4(base.rgb*(1.0-stroke.a) + stroke.rgb*stroke.a,base.a);" +
  "            } else {" +
  "                gl_FragColor = base;" +
  "            }" +
  "        }" +
  "        ";

const INNER_MERGE_CENTER_SOURCE =
  "        varying highp vec2 texCoord;" +
  "        uniform highp sampler2D texture0;" +
  "        uniform highp sampler2D texture1;" +
  "        uniform float opacity;" +
  "        void main(){" +
  "            vec4 base = texture2D(texture0, texCoord);" +
  "            vec4 stroke = texture2D(texture1, texCoord);" +
  "            if (base.a > 0.0) {/*if 0.1 then opaque shapes and strokelayers have black artifacts*/" +
  "                stroke.a = clamp(stroke.a,0.0,opacity);" +
  "                gl_FragColor = vec4(base.rgb*(1.0-stroke.a) + stroke.rgb*stroke.a,max(stroke.a,base.a));" +
  "            } else {" +
  "                gl_FragColor = base;" +
  "            }" +
  "        }" +
  "        ";

const INVERT_ALPHA_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        varying highp vec2 texCoord;" +
  "        void main(){" +
  "            vec4 c = texture2D(texture, texCoord);" +
  "            c.a = 1.0-c.a;" +
  "            gl_FragColor = c;" +
  "        }" +
  "        ";

/** Grows the alpha in the four axis directions only (the "ellyptical" option). */
const STROKIFY_RECT_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        uniform vec3 color;" +
  "        varying highp vec2 texCoord;" +
  "        uniform float width;" +
  "        uniform float height;" +
  "        uniform float softness;" +
  "        uniform float shapeCoeff;" +
  "        void main(){" +
  "            float alpha = 0.0;" +
  "            alpha += texture2D(texture, texCoord + vec2( 0.0, width)).a;" +
  "            alpha += texture2D(texture, texCoord + vec2( 0.0, -width)).a;" +
  "            alpha *= shapeCoeff;" +
  "            alpha += texture2D(texture, texCoord + vec2( -width, 0.0)).a;" +
  "            alpha += texture2D(texture, texCoord + vec2( width, 0.0)).a;" +
  "            gl_FragColor = vec4(color,alpha*softness);" +
  "        }" +
  "        ";

export type StrokeLayerParameters = {
  width: number;
  softness: number;
  shape: number;
  /** 0-255 RGB. */
  color: number[];
  opacity: { type: string; value: number };
  ellyptical: boolean;
  placement: { type: string; value: number };
};

export class GLStrokeLayerShader extends Shader {
  static INSIDE = 1;
  static OUTSIDE = 0;
  static CENTER = 2;

  declare glEffect: EffectShaderHost;
  strokify: Shader | null;
  innerMerge: Shader | null;
  innerMergeCenter: Shader | null;
  invertAlpha: Shader | null;
  strokifyRect: Shader | null;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, null, OUTER_MERGE_SOURCE);
    this.textures({ texture1: 1 });
    this.strokify = new Shader(glEffect, null, STROKIFY_SOURCE);
    this.innerMerge = new Shader(glEffect, null, INNER_MERGE_SOURCE);
    this.innerMerge.textures({ texture1: 1 });
    this.innerMergeCenter = new Shader(glEffect, null, INNER_MERGE_CENTER_SOURCE);
    this.innerMergeCenter.textures({ texture1: 1 });
    this.invertAlpha = new Shader(glEffect, null, INVERT_ALPHA_SOURCE);
    this.strokifyRect = new Shader(glEffect, null, STROKIFY_RECT_SOURCE);
  }

  render(properties: StrokeLayerParameters, scale: number): void {
    const color = properties.color.slice();
    (color[0] as number) /= 255;
    (color[1] as number) /= 255;
    (color[2] as number) /= 255;
    const host = this.glEffect;
    host.extraTexture.ensureFormat(host.texture);
    let passes = properties.width * scale;
    const shape = properties.shape;
    const placement = 0 | properties.placement.value;
    const ellyptical = properties.ellyptical;
    const softness = properties.softness;
    if (placement === GLStrokeLayerShader.CENTER) passes >>= 1;
    const grow = (from: GLTexture, to: GLTexture): void => {
      const shader = (ellyptical ? this.strokifyRect : this.strokify) as Shader;
      const uniforms = () => ({
        color,
        width: 1 / this.glEffect.width,
        height: 1 / this.glEffect.height,
        softness,
        shapeCoeff: shape,
      });
      shader.simpleShader(uniforms(), from, to);
      for (let i = 0; i < passes; i++) shader.simpleShader(uniforms(), to, to);
    };
    if (placement === GLStrokeLayerShader.CENTER || placement === GLStrokeLayerShader.INSIDE) {
      (this.invertAlpha as Shader).simpleShader(
        null as unknown as Record<string, never>,
        host.texture,
        host.extraTexture,
      );
      grow(host.extraTexture, host.extraTexture);
      host.extraTexture.use(1);
      if (placement === GLStrokeLayerShader.CENTER) {
        (this.innerMergeCenter as Shader).simpleShader({ opacity: properties.opacity.value });
      } else {
        (this.innerMerge as Shader).simpleShader({ opacity: properties.opacity.value });
      }
    }
    if (placement === GLStrokeLayerShader.OUTSIDE || placement === GLStrokeLayerShader.CENTER) {
      host.extraTexture.use(0);
      grow(host.texture, host.extraTexture);
      host.extraTexture.use(1);
      this.simpleShader({ opacity: properties.opacity.value });
    }
  }

  /** Leaves innerMergeCenter alive, as the old code did. */
  override destroy(): void {
    if (this.strokify) this.strokify.destroy();
    if (this.strokifyRect) this.strokifyRect.destroy();
    if (this.invertAlpha) this.invertAlpha.destroy();
    if (this.innerMerge) this.innerMerge.destroy();
    super.destroy();
  }
}
