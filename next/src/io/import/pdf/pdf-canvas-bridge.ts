// Old: chunk.vendor.js module 1394.
//
// The "canvas context" pdf.js renders a page into during a PDF import. It
// implements the parts of CanvasRenderingContext2D pdf.js's CanvasGraphics
// calls, but instead of painting it builds scene nodes under a root node:
// paths become GPaths (filled, stroked, clipping), characters are
// collected per text object and become GTexts (text-merge.ts), images and
// scratch canvases become GImages or are moved over as nodes.
//
// pdf.js adds its own transform tracking to the context
// (addContextCurrentTransform wraps save, restore, transform, ...), and
// assigns the style properties (fillStyle, lineWidth, ...) directly; the
// bridge reads them when it paints. Methods pdf.js would call but the
// bridge lacks throw, as before, so the bridge has exactly the old
// methods.
//
// Dropped: createBitmap, applyLayer and isSingleVertexSource, which
// nothing called.
import { extend, uuid } from "../../../engine/core/util.ts";
import { CMYKColor } from "../../../engine/color/cmyk-color.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { VertexCommand } from "../../../engine/geometry/vertex.ts";
import { VertexContainer } from "../../../engine/geometry/vertex-container.ts";
import { PathUtil } from "../../../engine/geometry/path-util.ts";
import { GMath } from "../../../engine/math/math.ts";
import { Point } from "../../../engine/math/point.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Bitmap } from "../../../engine/paint/bitmap.ts";
import { PaintCanvas } from "../../../engine/paint/paint-canvas.ts";
import { Group } from "../../../engine/scene/group.ts";
import { Image as GImage } from "../../../engine/scene/image.ts";
import { Node } from "../../../engine/scene/node.ts";
import { sceneNode, type SceneNodeLike } from "../scene-node.ts";
import { Rectangle } from "../../../engine/scene/rectangle.ts";
import { BorderPaintLayer } from "../../../engine/style/border-paint-layer.ts";
import { FillPaintLayer } from "../../../engine/style/fill-paint-layer.ts";
import { LinearGradient } from "../../../engine/style/linear-gradient.ts";
import { Pattern } from "../../../engine/style/pattern.ts";
import { RadialGradient } from "../../../engine/style/radial-gradient.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { TexturePattern } from "../../../engine/style/texture-pattern.ts";
import { Font } from "../../../engine/text/fonts/font.ts";
import type { FontManager } from "../../../engine/text/fonts/font-manager.ts";
import type { OpenTypeFont } from "../../../engine/text/fonts/open-type-font.ts";
import { TLCore } from "../../../engine/text/gtl/tl-core.ts";
import { TLUtil } from "../../../engine/text/gtl/tl-util.ts";
import { openTypeMeasure } from "../../../engine/text/gtl/measure.ts";
import { Text } from "../../../engine/text/text.ts";
import { CanvasHolder } from "../../export/canvas-holder.ts";
import { FontNameHelpers } from "../fonts/font-style-names.ts";
import { contains as googleFontName } from "../fonts/google-font-names.ts";
import { EmbeddedFont } from "./embedded-font.ts";
import type { PdfCanvasState, PdfFont } from "./pdfjs.ts";
import { TextMerger, type MergedText, type Word } from "./text-merge.ts";

/** The no-break space (old module 195 NBSP). */
const NBSP = String.fromCharCode(160);

/** How a character was painted. */
const FILL = 0;
const STROKE = 1;
/** pdf.js TextRenderingMode.FILL_STROKE and its mask. */
const FILL_STROKE = 2;
const FILL_STROKE_MASK = 3;

/** The graphics object that renders into the bridge (the import's CanvasGraphics). */
interface BridgeGraphics {
  current: PdfCanvasState;
}

/** A node the bridge paints: anything with paint layers. */
type PaintableNode = SceneNodeLike;

/** What _getCurrentFont caches per pdf.js font. */
interface ResolvedFont extends PdfFont {
  otf?: Font;
}

/** The context state save() keeps (the old Properties list). */
const SAVED_PROPERTIES = [
  "strokeStyle",
  "fillStyle",
  "globalAlpha",
  "lineWidth",
  "lineCap",
  "lineJoin",
  "miterLimit",
  "shadowOffsetX",
  "shadowOffsetY",
  "shadowBlur",
  "shadowColor",
  "globalCompositeOperation",
  "font",
  "textAlign",
  "textBaseline",
  "_transform",
  "_clipping",
  "_currentClip",
] as const;

/** One saved context state; restore writes back every key it holds. */
class SavedState {
  [key: string]: unknown;

  save(context: PdfCanvasBridge): this {
    const source = context as unknown as Record<string, unknown>;
    for (const key of SAVED_PROPERTIES) this[key] = source[key];
    return this;
  }

  restore(context: PdfCanvasBridge): this {
    const target = context as unknown as Record<string, unknown>;
    for (const key of Object.keys(this)) target[key] = this[key];
    return this;
  }
}

/** The path being built, as vertices in page coordinates. */
class PathBuilder {
  _transform: Transform | null = null;
  _vertices: VertexContainer;

  constructor(transform: Transform) {
    // The old constructor also took a vertex source; nothing passed one.
    if (transform instanceof Transform) this._transform = transform;
    this._vertices = new VertexContainer(null);
  }

  updateTransform(transform: Transform): void {
    this._transform = transform;
  }

  lineTo(x: number, y: number): void {
    this._vertices.addVertex(VertexCommand.Line, x, y, this._transform);
  }

  moveTo(x: number, y: number): void {
    this._vertices.addVertex(VertexCommand.Move, x, y, this._transform);
  }

  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    this._vertices.addVertex(VertexCommand.Curve2, x, y, this._transform);
    this._vertices.addVertex(VertexCommand.Curve2, c1x, c1y, this._transform);
    this._vertices.addVertex(VertexCommand.Curve2, c2x, c2y, this._transform);
  }

  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    this._vertices.addVertex(VertexCommand.Curve, x, y, this._transform);
    this._vertices.addVertex(VertexCommand.Curve, cx, cy, this._transform);
  }

  closePath(): void {
    (this._vertices.addVertex as (command: number) => void)(VertexCommand.Close);
  }

  /** Sic: the rectangle's subpath is left open. */
  rect(x: number, y: number, width: number, height: number): void {
    this.moveTo(x, y);
    this.lineTo(x + width, y);
    this.lineTo(x + width, y + height);
    this.lineTo(x, y + height);
  }

  toGPath(): Node | null {
    if (this._vertices.getCount())
      return PathUtil.createPathFromVertexSource(this._vertices) as Node | null;
    return null;
  }
}

/** A canvas gradient pdf.js created; it becomes a Gravit gradient once the painted node's box is known. */
export class PdfGradient {
  _stops: { position: number; color: RGBColor | null; opacity: number }[];
  _x0: number;
  _y0: number;
  _x1: number;
  _y1: number;
  _matrix: unknown;

  constructor(
    stops: { position: number; color: RGBColor | null; opacity: number }[],
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    matrix: unknown,
  ) {
    this._stops = stops;
    this._x0 = x0;
    this._y0 = y0;
    this._x1 = x1;
    this._y1 = y1;
    this._matrix = matrix;
  }

  addColorStop(position: number, color: string): void {
    this._stops.push({ position, color: RGBColor.fromCSSColor(color), opacity: 1 });
  }

  /** The gradient relative to `bbox`, with the end points mapped by `transform` first. */
  createGPattern(transform: Transform | null, bbox: Rect | null): Pattern | null {
    let start = new Point(this._x0, this._y0);
    let end = new Point(this._x1, this._y1);
    if (transform) {
      start = transform.mapPoint(start);
      end = transform.mapPoint(end);
    }
    const toUnit = bbox && Transform.getNativeRectTransformation(bbox).inverted();
    type Stops = ConstructorParameters<typeof LinearGradient>[0];
    const stops = this._stops as unknown as Stops;
    if (!toUnit)
      return this instanceof LinearPdfGradient
        ? new LinearGradient(stops)
        : this instanceof RadialPdfGradient
          ? new RadialGradient(stops)
          : null;
    start = toUnit.mapPoint(start);
    end = toUnit.mapPoint(end);
    let pattern: Pattern | null = null;
    if (this instanceof LinearPdfGradient) {
      const dx = end.getX() - start.getX();
      const dy = end.getY() - start.getY();
      let angle = GMath.normalizeAngleRadians(-Math.atan2(dy, dx));
      if (angle > Math.PI) angle -= GMath.PI2;
      angle = -angle;
      let scale = (0 !== dx ? dx : dy) / Math.cos(angle);
      if (scale < Number.MIN_VALUE || scale > Number.MAX_VALUE) scale = 1;
      pattern = new LinearGradient(stops, scale, angle, start.getX(), start.getY());
    } else if (this instanceof RadialPdfGradient) {
      pattern = new RadialGradient(stops);
    }
    return pattern;
  }
}

// Marks gradients the bridge still has to convert (checked with `in`).
(PdfGradient.prototype as unknown as Record<string, unknown>).__pdfimportgradtype__ = null;

export class LinearPdfGradient extends PdfGradient {}

export class RadialPdfGradient extends PdfGradient {}

type FillStyle = string | PdfGradient | Pattern | null | undefined;

export class PdfCanvasBridge {
  static Gradient = PdfGradient;

  static VertexSource = {
    equals(a: { getGeometryBBox(): Rect | null }, b: { getGeometryBBox(): Rect | null }): boolean {
      return Rect.equals(a.getGeometryBBox(), b.getGeometryBBox());
    },
  };

  /** Set by the import's CanvasGraphics constructor. */
  gfx: BridgeGraphics | null = null;
  canvas: CanvasHolder;
  _stackState: SavedState[];
  _root: SceneNodeLike;
  _transform: Transform;
  _clipping: SceneNodeLike;
  _path: PathBuilder | Rectangle | null;
  _dashArray: number[];
  _fontManager: FontManager;
  _words: Word[];
  _fontCache: Map<string, ResolvedFont>;
  _missingFonts: string[];
  _currentClip: SceneNodeLike | null = null;
  _embeddedFonts: Font[];
  _bitmap: Bitmap | null = null;

  // Assigned by pdf.js.
  declare strokeStyle: FillStyle;
  declare fillStyle: FillStyle;
  declare globalAlpha: number;
  declare lineWidth: number;
  declare lineCap: string;
  declare lineJoin: string;
  declare miterLimit: number;
  declare globalCompositeOperation: string;
  declare font: string;

  constructor(root: unknown, canvas: CanvasHolder, fontManager: FontManager) {
    this.canvas = canvas;
    (canvas as unknown as { context: unknown }).context = this;
    this._stackState = [];
    this._root = sceneNode(root);
    this._clipping = this._root;
    this._dashArray = [];
    this._transform = new Transform();
    this._path = null;
    this._fontManager = fontManager;
    this._words = [];
    this._fontCache = new Map();
    this._missingFonts = [];
    this._embeddedFonts = [];
    if (this._fontManager) {
      try {
        new TLCore().initialize(0, 0, this._fontManager);
      } catch {
        console.log("WARN: Could not load GTLCore");
      }
    }
  }

  /** A bridge for a scratch canvas, rendering into a new group. */
  createContext(canvas: CanvasHolder): PdfCanvasBridge {
    const context = new PdfCanvasBridge(new Group(), canvas, this._fontManager);
    context.gfx = this.gfx;
    return context;
  }

  getImageData(...args: [number, number, number, number]): ImageData {
    const ctx = this._getBitmap().getHTMLElement().getContext("2d") as CanvasRenderingContext2D;
    return ctx.getImageData(...args);
  }

  createImageData(...args: [number, number]): ImageData {
    const ctx = this._getBitmap().getHTMLElement().getContext("2d") as CanvasRenderingContext2D;
    return ctx.createImageData(...args);
  }

  putImageData(...args: [ImageData, number, number]): void {
    const ctx = this._getBitmap().getHTMLElement().getContext("2d") as CanvasRenderingContext2D;
    ctx.putImageData(...args);
  }

  /** The nodes so far, rasterized into this bridge's canvas (once). */
  _getBitmap(): Bitmap {
    if (!this._bitmap) {
      const canvas = this.canvas.getHTMLElement();
      const rendered = this._root.toBitmap() as Bitmap | null;
      if (rendered) {
        const element = rendered.getHTMLElement();
        if (!(element.width > 0 && element.height > 0)) return new Bitmap(canvas);
        (canvas.getContext("2d") as CanvasRenderingContext2D).drawImage(element, 0, 0);
      }
      this._bitmap = new Bitmap(canvas);
    }
    return this._bitmap;
  }

  /** The bitmap as a trimmed PNG data URL, flipped vertically with `flip`. */
  toImage(flip?: boolean): string {
    let bitmap = this._bitmap as Bitmap;
    if (flip) {
      const source = (this._bitmap as Bitmap).getHTMLElement();
      const canvas = document.createElement("canvas");
      canvas.width = source.width;
      canvas.height = source.height;
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      ctx.setTransform(1, 0, 0, -1, 0, 0);
      ctx.drawImage(source, 0, -canvas.height);
      bitmap = new Bitmap(canvas);
    }
    bitmap.trim();
    return bitmap.toImageDataUrl(Bitmap.ImageType.PNG);
  }

  /** A texture of a scratch canvas: its bitmap when it was rasterized, else its nodes. */
  createPattern(image: unknown, repetition: string): TexturePattern | null {
    if (image instanceof CanvasHolder) {
      const context = (image as unknown as { context: PdfCanvasBridge }).context;
      if (context._bitmap) {
        const url = context.toImage(true);
        if (url) {
          const texture = new TexturePattern(url as never, repetition);
          if (repetition === TexturePattern.RepeatMode.None)
            TexturePattern.ScaleSettings.fit?.(texture);
          return texture;
        }
      }
      return new TexturePattern(context._root as never, repetition);
    }
    return null;
  }

  getMissingFonts(): string[] {
    return this._missingFonts;
  }

  getEmbeddedFonts(): Font[] {
    return this._embeddedFonts;
  }

  updateTransform(transform: Transform): void {
    this._transform = transform;
    if (this._path) (this._path as PathBuilder).updateTransform(transform);
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.updateTransform(new Transform(a, b, c, d, e, f));
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.updateTransform(this._transform.preMultiplied(new Transform(a, b, c, d, e, f)));
  }

  translate(x: number, y: number): void {
    this.updateTransform(this._transform.preMultiplied(new Transform().translated(x, y)));
  }

  scale(x: number, y: number): void {
    this.updateTransform(this._transform.preMultiplied(new Transform().scaled(x, y)));
  }

  /** Sic: rotates after the current transform instead of before it. */
  rotate(angle: number): void {
    this.updateTransform(this._transform.rotated(angle));
  }

  createLinearGradient(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    matrix?: unknown,
  ): PdfGradient {
    return new LinearPdfGradient([], x0, y0, x1, y1, matrix);
  }

  /** Sic: the radii are ignored. */
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
    matrix?: unknown,
  ): PdfGradient {
    void r0;
    void r1;
    return new RadialPdfGradient([], x0, y0, x1, y1, matrix);
  }

  /** The current path becomes the clip: later nodes go inside it. Equal consecutive clips collapse. */
  clip(): void {
    if (this._consumePath()) {
      const last = this._clipping.getLastChild() as SceneNodeLike;
      const previous = last.getPrevious();
      let clip = last;
      if (previous && PdfCanvasBridge.VertexSource.equals(last, previous)) {
        this._clipping.removeChild(last);
        clip = previous;
      }
      this._clipping = clip;
      this._currentClip = clip;
    }
  }

  rect(x: number, y: number, width: number, height: number): void {
    this._getCurrentPath().rect(x, y, width, height);
  }

  measureText(text: string): { width: number } {
    // The old code called the meter with `new`, which gives an empty object for a null result.
    const metrics: unknown = openTypeMeasure(text, "font:" + this._getFont());
    const width =
      metrics !== null && typeof metrics == "object"
        ? (metrics as { width?: number }).width
        : undefined;
    return { width: width || 0 };
  }

  /** The current font as a CSS font string. */
  _getFont(): string {
    const font = this._getCurrentFont().otf as Font;
    const parts: (string | number)[] = [];
    parts.push(font.getStyle() === Font.Style.Normal ? "normal" : "italic");
    parts.push(font.getWeight());
    const current = (this.gfx as BridgeGraphics).current;
    parts.push(current.fontSize / current.fontSizeScale + "px");
    parts.push(font.getFamily());
    return parts.join(" ");
  }

  strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    if (!this._isDisplayedCharacter(text)) return;
    if (
      ((this.gfx as BridgeGraphics).current.textRenderingMode & FILL_STROKE_MASK) ===
      FILL_STROKE
    ) {
      // Fill and stroke: the character was just filled; add the border to it.
      const border = this._getPattern(this.strokeStyle || "rgb(0,0,0)");
      const word = this._words.slice(-1).pop() as Word;
      word.borderColor = border;
      word.borderWidth = this.lineWidth;
    } else {
      this._putChar(text, x, y, maxWidth, STROKE);
    }
  }

  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    this._putChar(text, x, y, maxWidth, FILL);
  }

  /** Records one character as a word for the text merger. */
  _putChar(text: string, x: number, y: number, width: number | undefined, mode: number): void {
    if (!this._isDisplayedCharacter(text)) return;
    const current = (this.gfx as BridgeGraphics).current;
    const size = current.fontSize / current.fontSizeScale;
    const ascent = current.font.ascent ? current.font.ascent * size : size;
    let descent = 0;
    if (current.font.ascent) descent = (current.font.descent as number) * size;
    let spaceWidth = 0;
    if (current.font.fontMatrix) {
      const sample = " -1iI";
      const scale = (current.font.fontMatrix[0] as number) * size;
      let glyphWidth: number | undefined;
      for (let i = 0; i < sample.length && !spaceWidth; i++) {
        const fontChar = current.font.toFontChar[sample.charCodeAt(i)] as unknown as number;
        glyphWidth = (current.font.widths as number[])[fontChar];
        spaceWidth = glyphWidth
          ? glyphWidth * scale + current.charSpacing * current.fontDirection
          : this.measureText(sample.charAt(i)).width;
      }
      if (!spaceWidth) {
        console.warn("space width not found, using mean length");
        const sorted = (current.font.widths || [0]).map((w) => w | 0).sort((a, b) => a - b);
        glyphWidth = sorted[Math.floor(sorted.length / 2)];
        spaceWidth = (glyphWidth as number) * scale + current.charSpacing * current.fontDirection;
      }
    }
    const word = extend({}, TLUtil.parseFont(this._getFont())) as Word;
    word.text = TLUtil.deCRLFify(text);
    word.ascent = ascent;
    word.descent = descent;
    word.width = width || this.measureText(text).width;
    word.fontName = current.font.name;
    word.fontSizeScale = current.fontSizeScale;
    word.wordSpacing = current.wordSpacing;
    word.charSpacing = current.charSpacing;
    word.x = x;
    word.y = y;
    word.transform = this._transform;
    word.spaceWidth = spaceWidth;
    if (Math.round(1e5 * this._transform.getScaleFactor()) / 1e5 !== word.fontSizeScale)
      word.width *= 1 / word.fontSizeScale;
    word.startPoint = this._transform
      .preMultiplied(new Transform().translated(x, y))
      .getTranslation();
    word.endPoint = this._transform
      .preMultiplied(new Transform().translated(x + word.width, y))
      .getTranslation();
    const font = this._getCurrentFont();
    const otf = font.otf as Font;
    word.fontFamily = otf.getFamily();
    word.fontStyle = otf.getStyle() === Font.Style.Normal ? "normal" : "italic";
    word.fontWeight = otf.getWeight();
    if (mode === FILL) {
      word.fontColor = this._getPattern(this.fillStyle || "rgb(0,0,0)");
    } else {
      delete word.fontColor;
      word.borderColor = this._getPattern(this.strokeStyle || "rgb(0,0,0)");
      word.borderWidth = this.lineWidth;
    }
    // A character drawn again at the same place (fill, then stroke) replaces the first.
    const last = this._words.slice(-1).pop();
    if (last && Point.equals(last.startPoint, word.startPoint)) this._words.pop();
    this._words.push(word);
  }

  /** Control characters of supported fonts are not drawn. */
  _isDisplayedCharacter(text: string): boolean {
    if (this._getCurrentFont().supported && text.length === 1 && (text.charCodeAt(0) & 255) <= 31)
      return false;
    return true;
  }

  beginText(): void {
    this._consumePath();
  }

  /** The characters of the text object become texts, merged into the last text where they continue it. */
  endText(): void {
    const merger = new TextMerger();
    for (const block of merger.createTexts(this._words)) {
      const text = block.toGText();
      if (!text) continue;
      const last = this._clipping.getLastChild();
      if (last instanceof Text && merger.mergeTexts(last as unknown as MergedText, text)) continue;
      this._clipping.appendChild(sceneNode(text));
    }
  }

  drawImage(
    image: unknown,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void {
    let source = image;
    let scratch: HTMLCanvasElement;
    if (source instanceof HTMLImageElement) {
      scratch = document.createElement("canvas");
      scratch.width = dw;
      scratch.height = dh;
      (scratch.getContext("2d") as CanvasRenderingContext2D).drawImage(source, 0, 0, dw, dh);
      source = scratch;
    }
    if (source instanceof HTMLCanvasElement) {
      let canvas: HTMLCanvasElement = source;
      let transform = this._transform
        .preMultiplied(new Transform().scaled(sw / dw, sh / dh))
        .preMultiplied(new Transform().translated(dx, dy));
      // Images above 100 million pixels are scaled down.
      let factor = 1e8 / (canvas.width * canvas.height);
      if (factor < 1) {
        factor = Math.sqrt(factor);
        scratch = document.createElement("canvas");
        scratch.width = canvas.width * factor;
        scratch.height = canvas.height * factor;
        (scratch.getContext("2d") as CanvasRenderingContext2D).drawImage(
          canvas,
          0,
          0,
          canvas.width,
          canvas.height,
          0,
          0,
          scratch.width,
          scratch.height,
        );
        canvas = scratch;
        transform = transform.preMultiplied(new Transform().scaled(1 / factor, 1 / factor));
      }
      const node = new GImage() as GImage & { __imageCanvas__?: HTMLCanvasElement };
      node.__imageCanvas__ = canvas;
      node.setTransform(transform);
      node.setProperty("url", canvas.toDataURL());
      const blendMode = this._getCurrentBlendMode();
      if (blendMode) node.setProperty("_sbl", blendMode);
      // An image that fills its own fresh clip replaces the clip.
      if (this._clipping === this._currentClip && 0 === this._clipping.getChildren().length) {
        const width = dw || sw;
        const height = dh || sh;
        const box = transform.mapRect(new Rect(dx || sx, (dy || sy) + height, width, height));
        if (Rect.equals(box, this._clipping.getGeometryBBox())) {
          const parent = this._clipping.getParent() as SceneNodeLike;
          parent.removeChild(this._clipping);
          this._currentClip = null;
          this._clipping = parent;
        }
      }
      this._clipping.appendChild(sceneNode(node));
    } else if (source instanceof CanvasHolder) {
      const context = (source as unknown as { context: PdfCanvasBridge }).context;
      if (context._bitmap) {
        const box = context._root.getGeometryBBox();
        const offset = box
          ? (Transform.getNativeRectTransformation(box).decomposed() as { translate: Transform })
              .translate
          : new Transform();
        const transform = this._transform.multiplied(offset);
        const node = new GImage();
        node.transform(transform);
        node.setProperty("_bvs", false);
        node.setProperty("_fvs", false);
        node.setProperty("url", context.toImage());
        this._clipping.appendChild(sceneNode(node));
      } else {
        // The scratch canvas's nodes move over.
        for (let child = context._root.getFirstChild(); child;) {
          context._root.removeChild(child);
          if (child instanceof GImage && sw && sh)
            child.transform(
              new Transform()
                .multiplied(new Transform().scaled(sw / dw, sh / dh))
                .multiplied(new Transform().translated(dx, dy)),
            );
          const blendMode = this._getCurrentBlendMode();
          if (blendMode) child.setProperty("_sbl", blendMode);
          if (this.globalAlpha) child.setProperty("_stop", this.globalAlpha);
          child.transform(this._transform);
          this._clipping.appendChild(child);
          child = context._root.getFirstChild();
        }
      }
    } else {
      console.log("WARN: Unsupported image: " + source);
    }
  }

  beginPath(): void {
    this._consumePath();
  }

  setLineDash(dash: number[]): void {
    this._dashArray = dash;
  }

  getLineDash(): number[] {
    return this._dashArray;
  }

  moveTo(x: number, y: number): void {
    this._getCurrentPath().moveTo(x, y);
  }

  lineTo(x: number, y: number): void {
    this._getCurrentPath().lineTo(x, y);
  }

  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    this._getCurrentPath().bezierCurveTo(c1x, c1y, c2x, c2y, x, y);
  }

  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    this._getCurrentPath().quadraticCurveTo(cx, cy, x, y);
  }

  closePath(): void {
    this._getCurrentPath().closePath();
  }

  /** Strokes the current path (or `node`) with the stroke style. */
  stroke(node?: PaintableNode): void {
    if (this._consumePath() || node) {
      const target = (node || this._clipping.getLastChild()) as PaintableNode;
      target.setProperty("_stop", this.globalAlpha || 1);
      const layer = new BorderPaintLayer();
      const scale = this._transform.getScaleFactor();
      layer.setProperty("_bw", this.lineWidth * scale);
      layer.setProperty(
        "_bds",
        this._dashArray.map((value) => value * scale),
      );
      layer.setProperty("_blc", this.lineCap);
      layer.setProperty("_bl", this.globalCompositeOperation || "normal");
      let style = this.strokeStyle;
      if (this.lineWidth) style = style || "rgb(0,0,0)";
      let pattern: unknown = this._getPattern(style);
      if (pattern instanceof PdfGradient)
        pattern = pattern.createGPattern(this._transform, target.getGeometryBBox());
      if (pattern instanceof Pattern) layer.setProperty("_pt", pattern);
      (target.getPaintLayers() as { appendChild(layer: unknown): void }).appendChild(layer);
    }
  }

  /** Fills the current path (or `node`) with the fill style. */
  fill(rule?: unknown, node?: PaintableNode): void {
    if (this._consumePath() || node) {
      const target = (node || this._clipping.getLastChild()) as PaintableNode;
      target.setProperty("evenodd", "evenodd" === rule);
      target.setProperty("_sfop", this.globalAlpha || 1);
      let pattern: unknown = this._getPattern(this.fillStyle);
      if (pattern instanceof PdfGradient)
        pattern = pattern.createGPattern(this._transform, target.getGeometryBBox());
      if (pattern instanceof Pattern && target.hasMixin(Stylable)) {
        const layers = target.getPaintLayers();
        if (layers) layers.appendChild(new FillPaintLayer(pattern));
      }
    }
  }

  /** A filled rectangle node, for normal compositing only. */
  fillRect(x: number, y: number, width: number, height: number): void {
    if (
      !this.globalCompositeOperation ||
      this.globalCompositeOperation === PaintCanvas.CompositeOperator.SourceOver
    ) {
      const box = this._transform.mapRect(new Rect(x, y, width, height));
      const rectangle = new Rectangle();
      this._path = rectangle;
      rectangle.setBounds(box.getX(), box.getY(), box.getWidth(), box.getHeight());
      this.fill();
    }
  }

  clearRect(): void {}

  save(): void {
    this._stackState.push(new SavedState().save(this));
  }

  restore(): void {
    (this._stackState.pop() as SavedState).restore(this);
  }

  /** The blend mode equal to globalCompositeOperation, if any. */
  _getCurrentBlendMode(): string | undefined {
    let mode: string | undefined;
    if (this.globalCompositeOperation) {
      const modes = PaintCanvas.BlendMode as Record<string, string>;
      for (const key of Object.keys(modes)) {
        if (modes[key] === this.globalCompositeOperation) mode = modes[key];
      }
    }
    return mode;
  }

  _getCurrentPath(): PathBuilder {
    if (!this._path) this._path = new PathBuilder(this._transform);
    return this._path as PathBuilder;
  }

  /** Appends the current path to the clip node; returns whether there was one. */
  _consumePath(): boolean {
    const path = this._path;
    this._path = null;
    if (path) {
      const node = path instanceof Node ? path : path.toGPath();
      if (node) {
        this._clipping.appendChild(sceneNode(node));
        return true;
      }
    }
    return false;
  }

  /** A CSS color (rgb or cmyk) as a color; gradients and patterns pass through. */
  _getPattern(style: unknown): unknown {
    if (typeof style == "string") {
      if (0 == style.indexOf("cmyk")) {
        const values = (style.match(/\d+(\.\d+)?/g) as RegExpMatchArray).map(
          (value) => Number(value) / 100,
        );
        return new CMYKColor(values);
      }
      return RGBColor.fromCSSColor(style);
    }
    return style;
  }

  /**
   * The Gravit font for pdf.js's current font: an embedded font file is
   * parsed; a family in the Google font list is taken from the font
   * manager, any other becomes an embedded font (and counts as missing).
   * Fonts without data count as missing. Without a font, Open Sans.
   */
  _getCurrentFont(): ResolvedFont {
    const current = (this.gfx as BridgeGraphics).current;
    let font = this._fontCache.get(current.font.loadedName) as ResolvedFont | undefined;
    // Sic: on a cache hit the substitute below gets no style and weight
    // (the old variables were only set on a miss).
    let weight: number = undefined as unknown as number;
    let style: string = undefined as unknown as string;
    if (!font) {
      let family: string;
      weight = FontNameHelpers.getWeight(current.font.name);
      style = FontNameHelpers.getStyle(current.font.name);
      font = current.font as ResolvedFont;
      if (font.data) {
        try {
          let embedded: EmbeddedFont | null = new EmbeddedFont(
            null as unknown as string,
            null as unknown as string,
            null as unknown as number,
            font.data.buffer as ArrayBuffer,
          );
          if (embedded) {
            const names = embedded._openTypeFont.names as Record<
              string,
              { en: string } | undefined
            >;
            family = names.fontFamily
              ? names.fontFamily.en
              : (names.postScriptName as { en: string }).en;
            style = FontNameHelpers.getStyle((names.fontSubfamily as { en: string }).en);
            weight = FontNameHelpers.getWeight((names.fontSubfamily as { en: string }).en);
            let known = googleFontName(family);
            if (!known) {
              let fullName = (names.fullName as { en: string }).en.toLowerCase();
              // Module 1204's order (ExtraLight, ExtraBold, SemiBold, Thin, ...),
              // so "extrabold" goes before "bold" can leave "extra" behind.
              for (const weightName of FontNameHelpers.Weight) {
                const lower = weightName.toLowerCase();
                if (fullName.indexOf(lower) !== -1) fullName = fullName.replace(lower, "");
              }
              fullName = fullName.trim();
              known = googleFontName(fullName);
              if (known) {
                family = known;
                weight = FontNameHelpers.getWeight((names.fullName as { en: string }).en);
              }
            }
            if (known) {
              font.otf = this._fontManager.getFont(family, style, weight) as Font;
              font.supported = true;
            } else {
              let name = names.postScriptName
                ? names.postScriptName.en
                : (names.fullName as { en: string }).en;
              const editable = embedded as unknown as {
                _family: string;
                _weight: number;
                _style: string;
              };
              editable._family = name;
              editable._weight = weight;
              editable._style = style;
              font.otf = embedded;
              const openType = embedded._openTypeFont;
              if (!openType.charToGlyphIndex(NBSP)) {
                const space = openType.charToGlyphIndex(" ");
                if (space)
                  (
                    openType.encoding as unknown as {
                      cmap: { glyphIndexMap: Record<number, number> };
                    }
                  ).cmap.glyphIndexMap[NBSP.charCodeAt(0)] = space;
              }
              // The same font file already registered: reuse it. Fonts of the
              // same family, style and weight with other data get a suffix.
              const registered = embedded;
              const sameName = this._fontManager
                .getFonts()
                .filter(
                  (f) =>
                    0 === f.getFamily().indexOf(registered.getFamily()) &&
                    f.getStyle() === registered.getStyle() &&
                    f.getWeight() === registered.getWeight(),
                );
              const bytes = [].slice.call(new Uint8Array(registered._buffer as ArrayBuffer));
              for (const candidate of sameName) {
                const candidateBytes = [].slice.call(
                  new Uint8Array((candidate as OpenTypeFont)._buffer as ArrayBuffer),
                );
                if (utilEqualsArrays(candidateBytes, bytes)) {
                  embedded = null;
                  font.otf = candidate;
                  break;
                }
                editable._family = editable._family + "_" + uuid(3);
                name = editable._family;
              }
              if (embedded) {
                this._embeddedFonts.push(embedded);
                this._fontManager.getFonts().push(embedded);
              }
              this._missingFonts.push(name);
            }
          } else {
            console.log("WARN: Unsupported font: " + current.font.name);
          }
        } catch {
          console.log("WARN: Could not load font: " + current.font.name);
        }
      } else {
        this._missingFonts.push(current.font.name);
      }
      this._fontCache.set(current.font.loadedName, font);
    }
    if (!font.otf) {
      font.otf = this._fontManager.getFont("Open Sans", style, weight) as Font;
      font.substituteFont = true;
    }
    return font;
  }
}

/** GUtil.equals on two byte lists (element by element). */
function utilEqualsArrays(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
