// Old: chunk.vendor.js module 497 (GGLTiltShiftShader, from glfx.js).
//
// Blurs more the farther a pixel is from the line through start and end,
// in two passes (along the line and across it). When the whole image is
// in one tile, the texture is mirrored first depending on the line's
// direction and mirrored back afterwards.
import { Shader } from "../../../paint/webgl/shader.ts";
import type { EffectShaderHost } from "./effect-shader-host.ts";

const SOURCE_HEAD =
  "        uniform highp sampler2D texture;" +
  "        uniform float blurRadius;" +
  "        uniform float gradientRadius;" +
  "        uniform float swap;" +
  "        uniform vec2 start;" +
  "        uniform vec2 end;" +
  "        uniform vec2 delta;" +
  "        uniform vec2 texSize;" +
  "        varying highp vec2 texCoord;" +
  "        uniform vec2 tileSize;" +
  "        uniform vec2 offset;" +
  "        ";

const SOURCE_MAIN =
  "        void main() {" +
  "            vec4 color = vec4(0.0);" +
  "            float total = 0.0;" +
  "                        /* randomize the lookup values to hide the fixed number of samples */" +
  "            float off = random(vec3(12.9898, 78.233, -151.7182), 0.0);" +
  "                        vec2 normal = normalize(vec2(start.y - end.y, end.x - start.x));" +
  "            /*the following lines turns around pixels depending on delta, so when start is before end, then blur direction is swapped*/" +
  "            /*vec2 sgn = sign(vec2((1.0 + swap) * delta.x - (1.0 - swap) * delta.y, (1.0 + swap) * delta.y + (1.0 - swap) * delta.x));*/" +
  "            /*vec2 asgn = abs(sgn); /*this is for checking if sgn = 0*/" +
  "            /*vec2 newCoord = ((1.0 - sgn) * asgn * (1.0 - texCoord) + (1.0 + sgn) * asgn * (texCoord))/2.0 + (1.0 - asgn) * texCoord;*/" +
  "            vec2 newCoord = texCoord;" +
  "             /*end of direcional formula*/" +
  "            float radius = smoothstep(0.0, 1.0, abs(dot(newCoord * texSize - start, normal)) / gradientRadius) * blurRadius;" +
  "            for (float t = -30.0; t <= 30.0; t++) {" +
  "                float percent = (t + off - 0.5) / 30.0;" +
  "                float weight = 1.0 - abs(percent);" +
  "                vec4 sample = texture2D(texture, toLocal(newCoord + delta / texSize * percent * radius));" +
  "                                /* switch to pre-multiplied alpha to correctly blur transparent images */" +
  "                sample.rgb *= sample.a;" +
  "                                color += sample * weight;" +
  "                total += weight;" +
  "            }" +
  "                        gl_FragColor = color / total;" +
  "                        /* switch back from pre-multiplied alpha */" +
  "            gl_FragColor.rgb /= gl_FragColor.a + 0.00001;" +
  "        }" +
  "    ";

const MIRROR_X_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        varying highp vec2 texCoord;" +
  "        void main() {" +
  "            gl_FragColor = texture2D(texture, vec2(1.0 - texCoord.x, texCoord.y));" +
  "        }" +
  "        ";

const MIRROR_Y_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        varying highp vec2 texCoord;" +
  "        void main() {" +
  "            gl_FragColor = texture2D(texture, vec2(texCoord.x, 1.0 - texCoord.y));" +
  "        }" +
  "        ";

const MIRROR_XY_SOURCE =
  "        uniform highp sampler2D texture;" +
  "        varying highp vec2 texCoord;" +
  "        void main() {" +
  "            gl_FragColor = texture2D(texture, 1.0 - texCoord);" +
  "        }" +
  "        ";

export type TiltShiftParameters = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  blurRadius: number;
  gradientRadius: number;
};

export class GLTiltShiftShader extends Shader {
  declare glEffect: EffectShaderHost;
  declare _revxShader: Shader | null;
  declare _revyShader: Shader | null;
  declare _revxyShader: Shader | null;

  constructor(glEffect: EffectShaderHost) {
    super(
      glEffect,
      Shader.tilingAwareVertexSource,
      SOURCE_HEAD + Shader.randomShaderFunc + "        " + Shader.TOLOCAL + SOURCE_MAIN,
    );
    this._revxShader = new Shader(glEffect, null, MIRROR_X_SOURCE);
    this._revyShader = new Shader(glEffect, null, MIRROR_Y_SOURCE);
    this._revxyShader = new Shader(glEffect, null, MIRROR_XY_SOURCE);
  }

  render(
    properties: TiltShiftParameters,
    scale: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    let startX = properties.startX;
    let startY = properties.startY;
    let endX = properties.endX;
    let endY = properties.endY;
    const blurRadius = properties.blurRadius * scale;
    let gradientRadius = properties.gradientRadius * scale;
    const tileWidth = this.glEffect.width;
    const tileHeight = this.glEffect.height;
    startX = width * startX * 0.01;
    endX = width * endX * 0.01;
    if (startX == endX) endX++;
    startY = height * startY * 0.01;
    endY = height * endY * 0.01;
    if (startY == endY) endY++;
    gradientRadius = Math.max(width, height) * gradientRadius * 0.01;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const texture = this.glEffect.texture;
    // Only for a single tile. With dx < 0 and dy >= 0 the old code picks
    // the vertical mirror (and the horizontal one for the opposite case).
    let mirror: Shader | null | undefined;
    if (!(width && height && width > tileWidth && height > tileHeight)) {
      mirror =
        dx < 0 ? (dy < 0 ? this._revxyShader : this._revyShader) : dy < 0 ? this._revxShader : null;
    }
    if (mirror) {
      mirror.simpleShader(
        { texSize: [width, height], tileSize: [tileWidth, tileHeight], offset: [x, y] },
        texture,
        texture,
      );
    }
    this.simpleShader(
      {
        blurRadius,
        gradientRadius,
        start: [startX, startY],
        end: [endX, endY],
        delta: [dx / length, dy / length],
        texSize: [width, height],
        tileSize: [tileWidth, tileHeight],
        offset: [x, y],
        swap: 1,
      },
      texture,
      texture,
    );
    this.simpleShader(
      {
        blurRadius,
        gradientRadius,
        start: [startX, startY],
        end: [endX, endY],
        delta: [-dy / length, dx / length],
        texSize: [width, height],
        tileSize: [tileWidth, tileHeight],
        offset: [x, y],
        swap: -1,
      },
      texture,
      texture,
    );
    if (mirror) mirror.simpleShader(null as unknown as Record<string, never>, texture, texture);
  }
}

GLTiltShiftShader.prototype._revxShader = null;
GLTiltShiftShader.prototype._revyShader = null;
GLTiltShiftShader.prototype._revxyShader = null;
