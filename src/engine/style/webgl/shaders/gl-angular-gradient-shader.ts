// Old: chunk.vendor.js module 364 (GGLAngularGradientShader).
//
// Paints an angular (conic) gradient. GLSL has no loops over uniform
// arrays, so the source unrolls one `if` per stop interval; the number of
// stops it can take is 16 divided by the screen DPI (at least one). Each
// fragment finds the interval its angle falls in and mixes the two colors.
import { Canvas2DPaintCanvas } from "../../../paint/paint-canvas.ts";
import type { GLTexture } from "../../../paint/webgl/gl-context.ts";
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

/** One gradient stop as the shader takes it: color channels 0-255. */
export interface AngularGradientStop {
  position: number;
  color: { getValue(): number[] };
  opacity: number;
}

export type AngularGradientParameters = {
  /** Center, 0-1 of the box. */
  cx: number;
  cy: number;
  /** Start and end angle (the end is unused). */
  a0: number;
  a1: number;
  stops: AngularGradientStop[];
  opacity: number;
};

const DECLARATIONS_HEAD =
  "        uniform highp sampler2D tex;\n" + "        const int MAX_ANGLES = ";

const MAIN =
  "];\n" +
  "        uniform float opacity;\n" +
  "        uniform int numAngles;\n" +
  "        uniform float gOffset;\n" +
  "        uniform vec2 texSize;\n" +
  "        varying highp vec2 texCoord;\n" +
  "        varying vec2 localTexCoord;\n" +
  "        const float PI = 3.14159265;\n" +
  "        const float PI2 = PI * 2.0;\n" +
  "        void main()\n" +
  "        {\n" +
  "            vec4 inputColor = texture2D(tex, localTexCoord);\n" +
  "            inputColor.a = 0.0;\n" +
  "            vec2 p = vec2(centerPoint)-texCoord;\n" +
  "            float aliasFactor = 0.0;\n" +
  "            float angle = atan(p.y, p.x) + PI + gOffset;\n" +
  "            float startAngle;\n" +
  "            float endAngle;\n" +
  "            vec4 startColor;\n" +
  "            vec4 endColor;\n" +
  "            int numAnglesM1 = numAngles - 1;\n" +
  "            if (angle < angles[0]) {\n" +
  "                angle += PI2;\n" +
  "            }\n";

const TAIL =
  "        float aOffset = abs((angle - startAngle) / (endAngle - startAngle));\n" +
  "        vec4 color = mix(startColor, endColor, aOffset);\n" +
  "        /* Multiply by the transparency of the source pixel */\n" +
  "        /* vec3 output = color.rgb * src.a;*/\n" +
  "        gl_FragColor.rgb = (inputColor.rgb*(1.0-opacity) + color.rgb*opacity)+screenSpaceDither(texCoord*texSize);\n" +
  "        gl_FragColor.a = inputColor.a*(1.0-opacity) + color.a*opacity;\n" +
  "        }" +
  "        ";

export class GLAngularGradientShader extends Shader {
  static MAX_ANGLES = 16;
  static ANTIALIAS_ANGLE = 1;
  /** Fade the start (LEFT) or the end (RIGHT) into the input; both off. */
  static LEFT = false;
  static RIGHT = false;

  declare glEffect: EffectShaderHost;
  declare additionalGradient: unknown;

  constructor(glEffect: EffectShaderHost) {
    super(glEffect, Shader.tilingAwareVertexSource, GLAngularGradientShader.generateSource());
  }

  /** The fragment source for the current screen DPI. */
  static generateSource(): string {
    const S = GLAngularGradientShader;
    const interval = (index: number, last: boolean): string => {
      let source = "if (angle >= angles[" + index + "] && angle < angles[" + (index + 1) + "]) {\n";
      if (S.RIGHT) {
        source +=
          "if (angles[" +
          (index + 1) +
          "] == " +
          S.LAST_ANGLE.toFixed(1) +
          ") {\n                    startAngle = angles[" +
          index +
          "];\n                    aliasFactor = -clamp(0.0,1.0," +
          S.ANTIALIAS_ANGLE.toFixed(1) +
          "*length(p));\n                    endAngle = angle;/*+ add trivial antialias*/\n                    startColor = colors[" +
          index +
          "];\n                    endColor = inputColor;\n                } else {\n";
      }
      source +=
        "startAngle = angles[" +
        index +
        "];\n                startColor = colors[" +
        index +
        "];\n                endAngle = angles[" +
        (index + 1) +
        "];\n                endColor = colors[" +
        (index + 1) +
        "];\n";
      if (S.RIGHT) source += "}\n";
      source += "}" + (last ? " " : " else ");
      return source;
    };
    const count = Math.max(1, Math.floor(S.MAX_ANGLES / Canvas2DPaintCanvas.getScreenDPI()));
    let source =
      Shader.screenSpaceDither +
      DECLARATIONS_HEAD +
      count +
      ";\n        uniform vec2 centerPoint;\n        uniform float angles[" +
      count +
      "];\n        uniform vec4 colors[" +
      count +
      MAIN;
    if (S.LEFT) {
      source +=
        "if (angle < angles[1]) {\n                aliasFactor = clamp(0.0,angles[1]," +
        S.ANTIALIAS_ANGLE.toFixed(1) +
        "*(p.x/p.y));\n                startAngle = angle;/*-aliasFactor;*/\n                startColor = inputColor;\n                endAngle = angles[1];\n                endColor = colors[1];\n            } else \n";
    } else source += interval(0, 0 == count - 2);
    for (let i = 1; i < count - 1; i++) source += interval(i, i === count - 2);
    source += TAIL;
    return source;
  }

  /**
   * The old code read an undefined LAST_ANGLE when RIGHT was on ("undefined"
   * has no toFixed); RIGHT is off, so this is never reached.
   */
  static LAST_ANGLE: number = void 0 as unknown as number;

  /** Sorts `properties.stops` in place, as the old code did. */
  render(
    properties: AngularGradientParameters,
    scale: number,
    x: number,
    y: number,
    width: number,
    height: number,
    texture?: GLTexture | null,
    swapWith?: GLTexture | null,
  ): void {
    void scale;
    let angles: number[] = [];
    let colors: number[][] = [];
    const stops = properties.stops;
    const start = properties.a0 + Math.PI;
    stops.sort((a, b) => a.position - b.position);
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i] as AngularGradientStop;
      angles.push(stop.position);
      colors.push(stop.color.getValue().concat([255 * stop.opacity]));
    }
    angles = angles.map((position) => start + 2 * Math.PI * position);
    angles = [start].concat(angles).concat(start + 2 * Math.PI + 1e-9);
    const last = colors[colors.length - 1] as number[];
    colors = [colors[0] as number[]].concat(colors).concat([last]);
    // Channel by channel: [[r...], [g...], [b...], [a...]] in 0-1.
    const channels = (colors[0] as number[]).map((_value, channel) =>
      colors.map((color) => (color[channel] as number) / 255),
    );
    const uniforms = {
      centerPoint: [properties.cx, properties.cy],
      numAngles_int_: angles.length,
      opacity: properties.opacity,
      angles: [angles],
      colors: channels,
      gOffset: 0,
      texSize: [width, height],
      tileSize: [this.glEffect.width, this.glEffect.height],
      offset: [x, y],
    };
    this.simpleShader(uniforms, texture, swapWith);
    if ((angles[0] as number) % Math.PI > 1e-4) this.fxaa(x, y, width, height, true);
  }
}

GLAngularGradientShader.prototype.additionalGradient = null;
