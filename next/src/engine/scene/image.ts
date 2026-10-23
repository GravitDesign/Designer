// Old: chunk.vendor.js module 95 (GImage).
/**
 * The image, node "image": a rectangle (so corner radii and styles apply)
 * that paints a bitmap. `url` is usually a "dictionary://" url into the
 * scene's image dictionary; the bitmap is resolved through the workspace
 * and loaded asynchronously, reported by StatusEvent (ImageStatus).
 * `itrf` maps the bitmap's pixel box to the page, `trf` the frame; they
 * move together unless `dblMode` (the image is cropped by its frame and
 * transformed separately). JPEGs are checked for CMYK and converted
 * through the USWebCoatedSWOP profile (ConvertStatusEvent).
 *
 * Until the bitmap is there, the image paints a grey box of `iw` x `ih`
 * (100 x 100 without them).
 */
import { Color } from "../color/color.ts";
import { JpegDecoder } from "../color/jpeg-decoder.ts";
import { JpegDecoderFactory } from "../color/jpeg-decoder-factory.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { Event } from "../core/event.ts";
import { Locale } from "../core/locale/locale.ts";
import { registerClass } from "../core/object.ts";
import { Platform } from "../core/platform.ts";
import { equals } from "../core/util.ts";
import { GMath } from "../math/math.ts";
import type { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import type { Destroyable } from "../paint/destroyable.ts";
import { ElementData } from "../paint/element-data.ts";
import { Canvas2DPaintCanvas, type PaintCanvas, type PaintImage } from "../paint/paint-canvas.ts";
import type { PaintContext } from "../paint/paint-context.ts";
import { RenderScheduler } from "../paint/render-scheduler.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { Dictionary, type DictionaryEntry } from "../style/dictionary.ts";
import type { Effect } from "../style/effect.ts";
import type { FillPaintLayer } from "../style/fill-paint-layer.ts";
import type { StylePaintContext } from "../style/element-stylable.ts";
import { ElementChange } from "./element-change.ts";
import type { Element } from "./element.ts";
import { MINIMAL_DIMENTION, Transform as TransformMixin } from "./element-transform.ts";
import { NodeChange } from "./node-change.ts";
import type { ContainerNode } from "./node-container.ts";
import type { PropertiesChangeArgs } from "./node-properties.ts";
import { Node, registerNodeClass, type NodeWorkspace } from "./node.ts";
import { PathBase } from "./path-base.ts";
import { Rectangle } from "./rectangle.ts";
import { SceneNodeChange, type SceneHooks } from "./scene-node.ts";
import type { ShapePaintContext } from "./shape.ts";

/** The scene's image dictionary as an image uses it (GSceneDictionary). */
export interface ImageDictionary extends Dictionary {
  setCachedCanvas(entry: DictionaryEntry, canvas: unknown): boolean;
}

/** What an image needs from GScene (engine-scene-document). */
export interface ImageScene extends SceneHooks {
  getDictionary(): ImageDictionary;
  addDestroyable(destroyable: Destroyable): void;
}

/** What an image needs from GWorkspace (engine-scene-document). */
export interface ImageWorkspace extends NodeWorkspace {
  resolveUrl(url: string, callback: (resolved: string) => void, scene: unknown): void;
}

const MetaProperties = {
  iw: null,
  ih: null,
  tmpUrl: null,
  storedUrl: null,
};

const GeometryProperties = {
  px: 0,
  py: 0,
  pw: null,
  ph: null,
  itrf: null,
};

const VisualProperties = {
  url: null,
  dblMode: false,
  ipfc: true,
};

const ImageType = {
  PNG: "png",
  JPEG: "jpeg",
  GIF: "gif",
  BMP: "bmp",
} as const;

/** The first bytes of each type. */
const BOM: Record<string, number[]> = {
  png: [137, 80, 78, 71, 13, 10, 26, 10],
  jpeg: [255, 216, 255],
  gif: [71, 73, 70, 56],
  bmp: [66, 77],
};

const ImageStatus = {
  Loaded: 0,
  Resolving: 1,
  Loading: 2,
  Delayed: 3,
  Error: 10,
} as const;

const ConvertStatus = {
  None: -1,
  Checking: 0,
  Converting: 1,
  Converted: 2,
  Failed: 3,
} as const;

/** Where the CMYK profile is loaded from. */
const ICC_BASE_URL = "assets/data/icc/";

/** The image changed its load status. */
export class ImageStatusEvent extends Event {
  static {
    registerClass(this, "GImage.StatusEvent");
  }

  declare image: Image | null;
  declare status: number | null;

  constructor(image: Image, status: number | null) {
    super();
    this.image = image;
    this.status = status;
  }

  override toString(): string {
    return "[Event GImage.StatusEvent]";
  }
}
ImageStatusEvent.prototype.image = null;
ImageStatusEvent.prototype.status = null;

/** The CMYK check or conversion of a JPEG moved on. */
export class ImageConvertStatusEvent extends Event {
  static {
    registerClass(this, "GImage.ConvertStatusEvent");
  }

  declare image: Image | null;
  declare status: number | null;

  constructor(image: Image, status: number) {
    super();
    this.image = image;
    this.status = status;
  }

  override toString(): string {
    return "[Event GImage.ConvertStatusEvent]";
  }
}
ImageConvertStatusEvent.prototype.image = null;
ImageConvertStatusEvent.prototype.status = null;

function isCanvasElement(value: unknown): value is HTMLCanvasElement {
  return "undefined" != typeof HTMLCanvasElement && value instanceof HTMLCanvasElement;
}

function isOffscreenCanvas(value: unknown): value is OffscreenCanvas {
  return "undefined" != typeof OffscreenCanvas && value instanceof OffscreenCanvas;
}

/** A bitmap source with a size, as `_initImageCanvas` takes it. */
type ImageSource = HTMLImageElement | HTMLCanvasElement | OffscreenCanvas;

/** The canvas the old renderer handed out, with the bitmap it should replay. */
type RenderedCanvas = HTMLCanvasElement & { $renderedBitmapSource?: OffscreenCanvas };

export class Image extends Rectangle implements Destroyable {
  static {
    registerNodeClass(this, "image", "GImage");
  }

  static options = { renderBox: true };
  static override MetaProperties: Readonly<Record<string, unknown>> = MetaProperties;
  static override GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static override VisualProperties: Readonly<Record<string, unknown>> = VisualProperties;
  static Type = ImageType;
  static _BOM = BOM;
  static ImageStatus = ImageStatus;
  static ConvertStatus = ConvertStatus;
  static NO_IMAGE_WIDTH = 100;
  static NO_IMAGE_HEIGHT = 100;
  static NO_IMAGE_BACKGROUND = new RGBColor([240, 240, 240]);
  static NO_IMAGE_ERROR_STROKE = new RGBColor([255, 0, 0]);
  static StatusEvent = ImageStatusEvent;
  static ConvertStatusEvent = ImageConvertStatusEvent;

  declare $iw: number | null;
  declare $ih: number | null;
  declare $tmpUrl: string | null;
  declare $storedUrl: string | null;
  declare $px: number;
  declare $py: number;
  declare $pw: number | null;
  declare $ph: number | null;
  declare $itrf: Transform | null;
  declare $url: string | null;
  declare $dblMode: boolean;
  declare $ipfc: boolean;

  declare _status: number | null;
  declare _convertStatus: number;
  declare _type: string | null | undefined;
  /** The loading (or, after `_initImageCanvas` decided so, the painted) image element. */
  declare _image: HTMLImageElement | HTMLCanvasElement | OffscreenCanvas | null;
  declare _imageCanvas: HTMLCanvasElement | null;
  declare _imageCanvasOffscreen: HTMLCanvasElement | null;
  declare _vertexIterator: number;
  /** Set while the url is being rewritten, so the url change doesn't reload. */
  declare _updatingUrl: boolean;

  constructor() {
    super();
    this._convertStatus = ConvertStatus.None;
    this._paintSharp = false;
    this._setDefaultProperties(MetaProperties, VisualProperties, GeometryProperties);
    this.setProperty("csc", true);
    this._updateImage();
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GImage", "name", this.getNodeName()) as string;
  }

  getStatus(): number | null {
    return this._status;
  }

  getConvertStatus(): number {
    return this._convertStatus;
  }

  getImage(): HTMLImageElement | HTMLCanvasElement | OffscreenCanvas | null {
    return this._image;
  }

  getType(): string | null | undefined {
    return this._type;
  }

  isJPEG(): boolean {
    return !!this._type && this._type === ImageType.JPEG;
  }

  /**
   * The bitmap as a canvas. Without a canvas yet, a new one is drawn from
   * the image element each call (and not kept).
   */
  getImageCanvas(): HTMLCanvasElement | null {
    if (!this._imageCanvas && this._image) {
      const image = this._image as HTMLImageElement;
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      (canvas.getContext("2d") as CanvasRenderingContext2D).drawImage(image, 0, 0);
      return canvas;
    }
    return this._imageCanvas;
  }

  override validateInsertion(parent: ContainerNode, reference?: Node | null): boolean {
    return (
      "imagegrid.images" === Node.getName(parent) || super.validateInsertion(parent, reference)
    );
  }

  /**
   * The frame; before the bitmap is loaded, the placeholder box (the crop
   * box or the stored size) mapped by `trf`. In double mode it also covers
   * the transformed bitmap.
   */
  override _calculateGeometryBBox(includeInvisible?: unknown): Rect | null {
    let bbox: Rect | null;
    if (this._status === ImageStatus.Loaded) {
      bbox = super._calculateGeometryBBox(includeInvisible);
    } else {
      const box = new Rect(
        this.$px,
        this.$py,
        this.$pw ? this.$pw : this.getWidth(),
        this.$ph ? this.$ph : this.getHeight(),
      );
      bbox = this.$trf ? this.$trf.mapRect(box) : box;
    }
    if (this.$dblMode) {
      let imageBox = new Rect(0, 0, this.getWidth(), this.getHeight());
      if (this.$itrf) imageBox = this.$itrf.mapRect(imageBox);
      if (imageBox && bbox) bbox = bbox.united(imageBox);
    }
    return bbox;
  }

  getImageTransform(): Transform | null {
    return this.$itrf;
  }

  setImageTransform(
    transform: Transform | null,
    force?: boolean | null,
    temporary?: boolean | null,
  ): void {
    this.setProperties(["itrf"], [transform], false, force, temporary);
  }

  /** In double mode, transforms only the bitmap. */
  transformImage(transform: Transform | null): void {
    if (this.$dblMode && transform && !transform.isIdentity()) {
      this.setProperties(["itrf"], [this.$itrf ? this.$itrf.multiplied(transform) : transform]);
    }
  }

  /** In double mode, transforms only the bitmap, `transform` in its own coordinates. */
  preTransformImage(transform: Transform | null): void {
    if (this.$dblMode && transform && !transform.isIdentity()) {
      this.setProperties(["itrf"], [this.$itrf ? transform.multiplied(this.$itrf) : transform]);
    }
  }

  /**
   * Moves frame and bitmap together; in double mode only the frame (as a
   * rectangle does).
   */
  override transform(
    transform: Transform,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void {
    if (this.$dblMode) {
      super.transform(transform, force);
    } else if (transform && !transform.isIdentity()) {
      this._layoutTransform = transform;
      this._relayoutNow = !this._relayout;
      this._relayout = true;
      this.transformStyledCorners(this, transform);
      this.setProperties(
        ["trf", "itrf"],
        [
          this.$trf ? this.$trf.multiplied(transform) : transform,
          this.$itrf ? this.$itrf.multiplied(transform) : transform,
        ],
      );
      // GElement.Transform's own transform: children only (an image has none).
      if (this.isTransformChildren(transform, force)) {
        this._transformChildren(transform, force, exceptions);
      }
      if (this._relayoutNow) {
        this._layoutAnchorContents(null, null, this._layoutTransform);
        this._layoutTransform = null;
      }
    }
  }

  override assignPreTransformFrom(transform: Transform, source: Element): void {
    if (source instanceof Image) {
      const frame = source.getTransform() || new Transform();
      const image = source.getImageTransform() || new Transform();
      this.setProperties(
        ["trf", "itrf"],
        [transform.multiplied(frame), transform.multiplied(image)],
      );
    } else {
      // GElement.Transform's version, which rectangles don't override.
      let matrix =
        (source.hasMixin(TransformMixin) &&
          (source as unknown as { getTransform(): Transform | null }).getTransform()) ||
        new Transform();
      matrix = transform.multiplied(matrix);
      this.setTransform(matrix);
    }
  }

  override preTransform(
    transform: Transform,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void {
    if (this.$dblMode) {
      super.preTransform(transform, false);
    } else if (transform && !transform.isIdentity()) {
      const local =
        this.$trf && this.$trf.invertible()
          ? (this.$trf.inverted() as Transform).multiplied(transform.multiplied(this.$trf))
          : transform;
      this.transformStyledCorners(this, local);
      this._layoutTransform = local;
      this._relayoutNow = !this._relayout;
      this._relayout = true;
      this.setProperties(
        ["trf", "itrf"],
        [
          this.$trf ? transform.multiplied(this.$trf) : transform,
          this.$itrf ? this.$itrf.multiplied(local) : local,
        ],
      );
      // GElement.Transform's own preTransform: children only (an image has none).
      if (this.isTransformChildren(transform, force)) {
        const own = this.getProperty("trf") as Transform | null;
        const mapped =
          own && own.invertible()
            ? (own.inverted() as Transform).multiplied(transform).multiplied(own)
            : transform;
        this._transformChildren(mapped, force, exceptions);
      }
      if (this._relayoutNow) {
        this._layoutAnchorContents(null, null, this._layoutTransform);
        this._layoutTransform = null;
        this._relayoutNow = false;
      }
    }
  }

  /** Scales frame and bitmap together to the box (nothing in double mode). */
  override setBounds(x: number, y: number, width: number, height: number): void {
    if (this.$dblMode) return;
    const targetWidth = width > MINIMAL_DIMENTION ? width : MINIMAL_DIMENTION;
    const targetHeight = height > MINIMAL_DIMENTION ? height : MINIMAL_DIMENTION;
    const bbox = this.getGeometryBBox() as Rect;
    const bboxWidth = bbox.getWidth();
    const bboxHeight = bbox.getHeight();
    const scaleX = bboxWidth > 0 ? targetWidth / bboxWidth : 0;
    const scaleY = bboxHeight > 0 ? targetHeight / bboxHeight : 0;
    const delta = new Transform()
      .translated(-bbox.getX(), -bbox.getY())
      .scaled(scaleX, scaleY)
      .translated(x, y);
    if (!delta.isIdentity()) {
      this.setProperties(
        ["trf", "itrf"],
        [
          this.$trf ? this.$trf.multiplied(delta) : delta,
          this.$itrf ? this.$itrf.multiplied(delta) : delta,
        ],
      );
    }
  }

  override setTransform(transform: Transform | null): void {
    this.setProperties(["trf", "itrf"], [transform, transform]);
  }

  /**
   * A hit on a non-transparent pixel near the location (the nearest one
   * within the tolerance) or on the shape. Without `itrf` the inverse below
   * fails, so such an image can't be hit (kept).
   */
  override _detailHitTest(
    location: Point,
    transform?: Transform | null,
    tolerance?: number,
    force?: unknown,
  ): ElementData<Element, unknown> | null {
    let pixel: ArrayLike<number> | null = null;
    if (this._imageCanvas) {
      let matrix = new Transform();
      if (this.$itrf) matrix = matrix.multiplied(this.$itrf);
      if (transform) matrix = matrix.multiplied(transform);
      const local = (matrix.inverted() as Transform).mapPoint(location);
      const x = local.getX();
      const y = local.getY();
      if (!isFinite(x) || !isFinite(y)) return null;
      const radius = Math.floor(
        (tolerance as number) + 0.5 * (transform as Transform).getScaleFactor(),
      );
      tolerance = radius;
      const size = 1 + 2 * radius;
      const imageData = (
        this._imageCanvas.getContext("2d") as CanvasRenderingContext2D
      ).getImageData(x - radius, y - radius, size, size);
      const data: ArrayLike<number> = imageData ? imageData.data : [0, 0, 0];
      let best = Number.MAX_VALUE;
      let bestIndex = NaN;
      for (let i = 3; i < data.length; i += 4) {
        if (0 !== data[i]) {
          const column = (i >> 2) % size;
          // Not floored: the row is fractional, as in the old code.
          const row = (i >> 2) / size;
          const distance = (radius - column) * (radius - column) + (radius - row) * (radius - row);
          if (distance < best) {
            best = distance;
            bestIndex = i;
          }
        }
      }
      if (Math.sqrt(best) > radius) return null;
      pixel = Array.prototype.slice.call(data, bestIndex - 3, bestIndex + 1) as number[];
    } else if (this._status === ImageStatus.Loaded && this._image) {
      pixel = [0, 0, 0, 255];
    }
    const result = super._detailHitTest(
      location,
      transform,
      tolerance,
      this.$dblMode || pixel || force,
    );
    return pixel && (result || this.$dblMode)
      ? new ElementData<Element, unknown>(this, { pixel })
      : result;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      const storeArgs = args as StoreChangeArgs;
      // dblMode is never saved (true maps to false, the default).
      this.storeProperties(
        storeArgs.blob,
        VisualProperties,
        (name, value) => ("dblMode" !== name || !value) && value,
      );
      this.storeProperties(storeArgs.blob, MetaProperties, (name, value) =>
        ("tmpUrl" !== name && "storedUrl" !== name) || !storeArgs.options.save ? value : null,
      );
      this.storeProperties(storeArgs.blob, GeometryProperties, (name, value) =>
        "itrf" === name && value ? Transform.serialize(value as Transform) : value,
      );
      if (this.$ipfc) storeArgs.blob["ipfc"] = true;
    } else if (change == NodeChange.BeforePropertiesChange) {
      if ((args as PropertiesChangeArgs).properties.indexOf("url") >= 0 && this._scene) {
        this._imageScene().getDictionary().removeEntry(this.$url);
      }
    } else if (change == NodeChange.AfterPropertiesChange) {
      const properties = (args as PropertiesChangeArgs).properties;
      if (properties.indexOf("tmpUrl") >= 0) this._updateTemporaryImage();
      if (properties.indexOf("url") >= 0 && !this._updatingUrl) {
        this._updatingUrl = true;
        this.$storedUrl = null;
        this._updateUrl();
        this._updateImage();
        this._updatingUrl = false;
      }
      if (
        properties.indexOf("px") >= 0 ||
        properties.indexOf("py") >= 0 ||
        properties.indexOf("pw") >= 0 ||
        properties.indexOf("ph") >= 0
      ) {
        this._updateImageRect(
          this.$px,
          this.$py,
          this.$pw ? this.$pw : this.getWidth(),
          this.$ph ? this.$ph : this.getHeight(),
        );
      }
    } else if (
      change === SceneNodeChange.SceneAttached ||
      change === NodeChange.WorkspaceAttached
    ) {
      this._updatingUrl = true;
      this._updateUrl();
      if (this._scene) this._imageScene().addDestroyable(this);
      if (this._workspace && this._scene && this._status === ImageStatus.Delayed)
        this._updateImage();
      this._updatingUrl = false;
    }
    super._handleChange(change, args);
    this._handleGeometryChangeForProperties(change, args, GeometryProperties);
    this._handleGeometryChangeForProperties(change, args, VisualProperties);
    if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, VisualProperties);
      this.restoreProperties(blob, GeometryProperties, (name, value) =>
        "itrf" === name && value ? Transform.deserialize(value as number[]) : value,
      );
      this.restoreProperties(blob, MetaProperties);
      this.setProperty("csc", true);
      // Files from before `ipfc` paint the image over the fills, and their
      // bitmap followed `trf`.
      if (!Object.prototype.hasOwnProperty.call(blob, "ipfc")) this.setProperty("ipfc", false);
      if (this.$trf && !this.$itrf && !this.$pw && !this.$ph)
        this.setProperties(["itrf"], [this.$trf]);
      this._updatingUrl = true;
      this._updateUrl();
      this._updateImage();
      this._updatingUrl = false;
    }
  }

  _imageScene(): ImageScene {
    return this._scene as ImageScene;
  }

  /**
   * Moves the url into the scene's dictionary: a plain url gets an entry
   * (or reuses the one with that value) and `url` becomes its dictionary
   * url; `storedUrl` keeps the resolved value so a missing entry can be
   * recreated.
   */
  _updateUrl(): void {
    if (!this._scene) return;
    const dictionary = this._imageScene().getDictionary();
    let value = dictionary.getValue(this.$url) as string | null;
    if (this.$storedUrl) {
      if (value) {
        if (value !== this.$storedUrl) {
          if (Dictionary.isDictionary(value)) this.$storedUrl = value;
          else value = this.$storedUrl;
        }
      } else this.$url = this.$storedUrl;
    } else this.$storedUrl = value;
    if (!Dictionary.isDictionary(this.$url)) {
      const url = this.$url;
      if (dictionary.getEntries().some((entry) => entry.value === url)) return;
      const entry = dictionary.putValueIfAbsent(url);
      if (entry) {
        if (null === value) {
          if (this._status !== ImageStatus.Loaded || this._imageCanvas) {
            this._imageCanvas = null;
            this._imageCanvasOffscreen = null;
          } else {
            this._image = null;
            this._imageCanvasOffscreen = null;
          }
        }
        this.setProperty("url", entry.getUrl());
      }
    }
  }

  /** With `ipfc` the bitmap goes under the fills, else over them. */
  override _paintFillLayers(
    context: ShapePaintContext,
    separate: boolean,
    fills: FillPaintLayer[],
  ): void {
    const outline = (context.configuration as unknown as OutlineConfiguration).isOutline(context);
    if (this.$ipfc && !outline) this._paintImageCanvas(context, context.canvas, null, null);
    for (let i = 0; i < fills.length; i++)
      this._paintFill(context, separate, fills[i] as FillPaintLayer);
    if (!this.$ipfc && !outline) this._paintImageCanvas(context, context.canvas, null, null);
  }

  /**
   * A loaded image without fills, borders or effects is composited
   * directly instead of through a separate style canvas.
   */
  override _paintStyleSeparate(
    context: StylePaintContext,
    bbox: Rect,
    layers: string[] | null,
    effects: (Effect[] | null)[] | null,
    effectCanvas: PaintCanvas | null,
    hasEffects: boolean,
  ): void {
    if (
      this._status !== ImageStatus.Loaded ||
      (!this._imageCanvas && !this._image) ||
      this.hasStyleFill() ||
      this.hasStyleBorder() ||
      hasEffects
    ) {
      // The old call dropped the effects flag (undefined, so false); kept.
      super._paintStyleSeparate(context, bbox, layers, effects, effectCanvas, false);
    } else {
      this._paintCompositedWithBackground(context.canvas, (canvas, opacity, composite) => {
        this._paintImageCanvas(context as ShapePaintContext, canvas, opacity, composite);
      });
    }
  }

  /**
   * The bitmap to draw: for a multithreaded canvas a copy the worker
   * renderer can use, else the canvas or image element.
   */
  _getProperImageCanvas(context: PaintContext | StylePaintContext): PaintImage {
    const canvas = context.canvas as PaintCanvas & { parent?: unknown };
    if (RenderScheduler.isMultiThreaded(canvas.parent)) {
      if (this._imageCanvasOffscreen) return this._imageCanvasOffscreen;
      if (this._imageCanvas && RenderScheduler.isMultiThreaded(this._imageCanvas)) {
        this._imageCanvasOffscreen = this._imageCanvas;
        return this._imageCanvas;
      }
      const source = (this._imageCanvas || this._image) as CanvasImageSource;
      let width: number;
      let height: number;
      if (this._imageCanvas) {
        width = this._imageCanvas.width;
        height = this._imageCanvas.height;
      } else {
        width = (this._image as HTMLImageElement).naturalWidth;
        height = (this._image as HTMLImageElement).naturalHeight;
      }
      const offscreen = new OffscreenCanvas(width, height);
      const offscreenContext = offscreen.getContext("2d") as OffscreenCanvasRenderingContext2D;
      offscreenContext.globalCompositeOperation = "copy";
      offscreenContext.drawImage(source, 0, 0);
      const renderer = RenderScheduler.getRenderer(true, "2d", undefined, true, true);
      const rendered = renderer.canvas as RenderedCanvas;
      this._imageCanvasOffscreen = rendered;
      rendered.$renderedBitmapSource = offscreen;
      rendered.width = width;
      rendered.height = height;
      return this._imageCanvasOffscreen;
    }
    return (this._imageCanvas || this._image) as PaintImage;
  }

  /**
   * Paints the bitmap clipped to the shape (directly with a clip where the
   * shape is a plain rectangle, else masked through a temporary canvas);
   * in double mode a half-transparent copy of the whole bitmap goes on
   * top. Without a bitmap it paints the placeholder box, crossed out on
   * error.
   */
  _paintImageCanvas(
    context: ShapePaintContext | StylePaintContext,
    canvas: PaintCanvas,
    opacity: number | null,
    composite: string | null,
  ): void {
    const paintContext = context as ShapePaintContext;
    if (this._imageCanvas || (this._status === ImageStatus.Loaded && this._image)) {
      let clipped = false;
      let previous: PaintCanvas | null = null;
      if (
        canvas.hasClip() &&
        (this.$dblMode ||
          (this.$uf && (this.$tl_ct !== PathBase.CornerType.Rounded || 0 === this.$tl_sx)))
      ) {
        canvas.putVertices(this);
        canvas.clipVertices();
        clipped = true;
      } else {
        previous = paintContext.pushCanvas(
          paintContext.canvas.createCanvas(
            this.getGeometryBBox(paintContext.isIncludingInvisible()) as Rect,
          ),
        );
      }
      let saved = paintContext.canvas.getTransform(true);
      if (this.$itrf) paintContext.canvas.setTransform(saved.preMultiplied(this.$itrf));
      paintContext.canvas.drawImage(
        this._getProperImageCanvas(paintContext),
        0,
        0,
        false,
        opacity,
        composite,
      );
      paintContext.canvas.setTransform(saved);
      if (clipped) canvas.resetClip();
      else {
        if (void 0 !== paintContext.canvas.putVertices(this)) {
          paintContext.canvas.fillVertices(
            RGBColor.BLACK,
            1,
            Canvas2DPaintCanvas.CompositeOperator.DestinationIn,
          );
          (previous as PaintCanvas).drawCanvas(paintContext.canvas);
        }
        paintContext.canvas.finish();
        paintContext.popCanvas();
      }
      if (this.$dblMode) {
        saved = canvas.getTransform(true);
        if (this.$itrf) canvas.setTransform(saved.preMultiplied(this.$itrf));
        canvas.drawImage(
          (this._imageCanvas || this._image) as PaintImage,
          0,
          0,
          false,
          opacity ? opacity / 2 : 0.5,
          composite,
        );
        canvas.setTransform(saved);
      }
    } else if (Image.options.renderBox) {
      const saved = canvas.getTransform(true);
      if (this.$trf) canvas.setTransform(saved.preMultiplied(this.$trf));
      canvas.fillRect(
        this.$px,
        this.$py,
        this.$pw ? this.$pw : this.getWidth(),
        this.$ph ? this.$ph : this.getHeight(),
        Image.NO_IMAGE_BACKGROUND,
      );
      if (this._status === ImageStatus.Error) {
        canvas.strokeLine(
          this.$px,
          this.$py,
          this.$pw ? this.$pw : this.getWidth(),
          this.$ph ? this.$ph : this.getHeight(),
          2,
          Image.NO_IMAGE_ERROR_STROKE,
        );
        canvas.strokeLine(
          this.$pw ? this.$pw : this.getWidth(),
          this.$py,
          this.$px,
          this.$ph ? this.$ph : this.getHeight(),
          2,
          Image.NO_IMAGE_ERROR_STROKE,
        );
      }
      canvas.setTransform(saved);
    }
  }

  isReady(): boolean | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas | null {
    return (this._image || this._imageCanvas) && this._status === ImageStatus.Loaded;
  }

  /** The bitmap's width once loaded, else `iw` or 100. */
  getWidth(): number {
    if (this._status === ImageStatus.Loaded && (this._image || this._imageCanvas)) {
      return this._imageCanvas
        ? this._imageCanvas.width
        : (this._image as HTMLImageElement).naturalWidth;
    }
    return this.$iw ? this.$iw : Image.NO_IMAGE_WIDTH;
  }

  /** The bitmap's height once loaded, else `ih` or 100. */
  getHeight(): number {
    if (this._status === ImageStatus.Loaded && (this._image || this._imageCanvas)) {
      return this._imageCanvas
        ? this._imageCanvas.height
        : (this._image as HTMLImageElement).naturalHeight;
    }
    return this.$ih ? this.$ih : Image.NO_IMAGE_HEIGHT;
  }

  /** Shows `tmpUrl` (a preview, e.g. while uploading) until the real bitmap is loaded. */
  _updateTemporaryImage(): void {
    if (this.$tmpUrl && this._status !== ImageStatus.Loaded) {
      const image = new globalThis.Image();
      image.width = this.getWidth();
      image.height = this.getHeight();
      if (this.$tmpUrl && this.$tmpUrl.match(/^(http|https|\/\/)/)) image.crossOrigin = "Anonymous";
      else image.crossOrigin = null;
      image.onload = () => {
        if (
          this._status !== ImageStatus.Loaded &&
          0 !== image.naturalWidth &&
          0 !== image.naturalHeight
        ) {
          this._notifyChange(ElementChange.PrepareGeometryUpdate);
          this._initImageCanvas(image);
          this._updateImageRect(0, 0, image.naturalWidth, image.naturalHeight);
          this._notifyChange(ElementChange.FinishGeometryUpdate);
        }
      };
      image.src = this.$tmpUrl;
    }
  }

  /** Resolves `url` through the workspace, or waits (Delayed) until there is a scene. */
  _updateImage(): void {
    this._sourceBBox = null;
    if (this._workspace && this._scene && this.$url) {
      this._setStatus(ImageStatus.Resolving);
      (this._workspace as ImageWorkspace).resolveUrl(
        this.$url,
        this._resolvedImage.bind(this),
        this.getScene(),
      );
    } else this._setStatus(ImageStatus.Delayed);
  }

  /** Reloads a data url bitmap. */
  forceImageUpdate(): void {
    if (this.$url && 0 === this.$url.indexOf("data:")) {
      this._setStatus(ImageStatus.Resolving);
      this._resolvedImage(this.$url);
    }
  }

  override getSelfCanvasUsedArea(): Rect {
    let area = new Rect(0, 0, this.getWidth(), this.getHeight());
    if (this.$itrf) area = this.$itrf.mapRect(area);
    return area;
  }

  /** The type of the bytes from their first bytes, or undefined. */
  _getType(bytes: ArrayLike<number> | ArrayBuffer): string | undefined {
    const view = new Uint8ClampedArray(bytes as ArrayLike<number>);
    const types = Object.keys(ImageType).map(
      (key) => ImageType[key as keyof typeof ImageType] as string,
    );
    for (let i = 0; i < types.length; i++) {
      const bom = BOM[types[i] as string] as number[];
      const head = Array.from(view.slice(0, bom.length));
      if (equals(head, bom)) return types[i];
    }
    return undefined;
  }

  /**
   * The workspace resolved `url`: use the dictionary's decoded canvas when
   * there is one, else load the url. A data url is typed from its first
   * bytes; any other url is fetched once to read them and then loaded as
   * an image.
   */
  _resolvedImage(url: string): void {
    const entry = this._getDictImageEntry();
    if (entry && entry.cachedCanvas) {
      this._updatedImage(entry.cachedCanvas);
    } else if (url) {
      // Image elements have no `url`, so this never matches (kept).
      if (this._image && (this._image as unknown as { url?: string }).url === url) {
        this._updatedImage();
        return;
      }
      const dataPrefix = /^data:.{0,255};base64,/i.exec(url);
      if (dataPrefix && url.length > Platform.maxImgDataUrlLength) {
        this._setStatus(ImageStatus.Error);
        return;
      }
      this.$storedUrl = url;
      this._setStatus(ImageStatus.Loading);
      if (dataPrefix) {
        let base64 = url.substring((dataPrefix.pop() as string).length);
        let longest = 0;
        for (const key in BOM) longest = Math.max((BOM[key] as number[]).length, longest);
        base64 = base64.substr(0, Math.min(2 * longest, base64.length));
        let binary: string;
        try {
          binary = globalThis.atob(base64);
        } catch {
          this._setStatus(ImageStatus.Error);
          return;
        }
        let codes: Uint16Array;
        try {
          codes = new Uint16Array(new ArrayBuffer(2 * binary.length));
          for (let i = 0, n = binary.length; i < n; i++) codes[i] = binary.charCodeAt(i);
        } catch {
          this._setStatus(ImageStatus.Error);
          return;
        }
        this._type = this._getType(codes);
        this._initImage();
        (this._image as HTMLImageElement).src = url;
      } else {
        this._initImage();
        if (url && url.match(/^(http|https|\/\/)/))
          (this._image as HTMLImageElement).crossOrigin = "Anonymous";
        if (0 === url.indexOf("file://") && -1 !== url.indexOf("\\")) {
          let path = url.substr("file://".length).replace(/\\/g, "/");
          if (0 !== path.indexOf("/")) path = "/" + path;
          url = "file://" + path;
        }
        const request = new XMLHttpRequest();
        request.responseType = "arraybuffer";
        request.open("GET", url, true);
        request.onreadystatechange = (event) => {
          if (request.readyState == request.DONE) {
            const response = (event.target as XMLHttpRequest).response as ArrayBuffer;
            this._type = this._getType(response);
            (this._image as HTMLImageElement).src = url;
          }
        };
        request.send();
      }
    } else this._setStatus(ImageStatus.Error);
  }

  /**
   * The bitmap arrived (an image element's load or error, or a cached
   * canvas). Sizes the image to it (`iw`, `ih`, and `pw`, `ph` unless
   * cropped), builds `itrf` for a crop without one, checks a JPEG for
   * CMYK and reports Loaded; a bitmap of size 0 or over the platform
   * limits is an Error.
   */
  _updatedImage(source?: unknown): void {
    let width: number;
    let height: number;
    let canvas: HTMLCanvasElement | OffscreenCanvas | HTMLImageElement | null = null;
    if (isCanvasElement(source) || isOffscreenCanvas(source)) {
      width = source.width;
      height = source.height;
      canvas = source;
    } else {
      const entry = this._getDictImageEntry();
      if (entry && entry.cachedCanvas) {
        canvas = entry.cachedCanvas as HTMLCanvasElement;
        width = canvas.width;
        height = canvas.height;
      } else {
        width = (this._image as HTMLImageElement).naturalWidth;
        height = (this._image as HTMLImageElement).naturalHeight;
      }
    }
    if (canvas && (canvas === this._imageCanvas || canvas === this._image)) return;
    this._notifyChange(ElementChange.PrepareGeometryUpdate);
    if (
      0 !== width &&
      0 !== height &&
      width <= Platform.absoluteMaxImgLinearDimension &&
      height <= Platform.absoluteMaxImgLinearDimension &&
      width * height <= Platform.absoluteMaxImgAreaDots
    ) {
      this.setProperties(
        ["ih", "iw", "pw", "ph"],
        [height, width, this.$pw ? this.$pw : width, this.$ph ? this.$ph : height],
      );
      this._initImageCanvas((canvas || this._image) as ImageSource);
      if (
        this.$pw &&
        this.$ph &&
        !this.$itrf &&
        (!GMath.isEqualEps(this.$pw, width) ||
          !GMath.isEqualEps(this.$ph, height) ||
          !GMath.isEqualEps(this.$px, 0) ||
          !GMath.isEqualEps(this.$py, 0))
      ) {
        const cropWidth = this.$pw > MINIMAL_DIMENTION ? this.$pw : MINIMAL_DIMENTION;
        const cropHeight = this.$ph > MINIMAL_DIMENTION ? this.$ph : MINIMAL_DIMENTION;
        const scaleX = width > 0 ? cropWidth / width : 0;
        const scaleY = height > 0 ? cropHeight / height : 0;
        const imageTransform = new Transform()
          .scaled(scaleX, scaleY)
          .translated(this.$px, this.$py);
        if (!imageTransform.isIdentity()) this.setProperties(["itrf"], [imageTransform]);
      }
      this._updateImageRect(this.$px, this.$py, this.$pw, this.$ph);
      if (!canvas) this._checkColorProfile((this._image as HTMLImageElement).src);
      this._setStatus(ImageStatus.Loaded);
      if (this._imageCanvas) this.destroyImage();
    } else {
      this._setStatus(ImageStatus.Error);
      this.destroyImage();
    }
    this._notifyChange(ElementChange.FinishGeometryUpdate);
  }

  /**
   * Redraws a CMYK JPEG's canvas from the decoder's converted pixels once
   * the profile is loaded. A JPEG the decoder can't read throws here.
   */
  _checkColorProfile(url: string): void {
    if (this._type === ImageType.JPEG && this._imageCanvas) {
      const putPixels = (pixels: Uint8Array | null) => {
        const imageCanvas = this._imageCanvas as HTMLCanvasElement;
        const context = imageCanvas.getContext("2d") as CanvasRenderingContext2D;
        const imageData = context.createImageData(imageCanvas.width, imageCanvas.height);
        imageData.data.set(pixels as Uint8Array, 0);
        context.putImageData(imageData, 0, 0);
        this._requestInvalidation();
      };
      this._setConvertStatus(ConvertStatus.Checking);
      const decoder = JpegDecoderFactory.getDecoder(url);
      if (decoder && decoder.getColorSpace() === JpegDecoder.ColorSpace.CMYK) {
        this._setConvertStatus(ConvertStatus.Converting);
        Color.setCMYKProfile("USWebCoatedSWOPv2", ICC_BASE_URL, () => {
          try {
            putPixels(JpegDecoderFactory.decodeCMYK(decoder));
            this._setConvertStatus(ConvertStatus.Converted);
          } catch {
            this._setConvertStatus(ConvertStatus.Failed);
          }
        });
      } else this._setConvertStatus(ConvertStatus.None);
    }
  }

  _setStatus(status: number): void {
    if (status !== this._status) {
      this._status = status;
      if (this._canEventBeSent(ImageStatusEvent)) {
        this._sendEvent(new ImageStatusEvent(this, this._status));
      }
    }
  }

  _setConvertStatus(status: number): void {
    if (status !== this._convertStatus) {
      this._convertStatus = status;
      if (this._canEventBeSent(ImageConvertStatusEvent)) {
        this._sendEvent(new ImageConvertStatusEvent(this, this._convertStatus));
      }
    }
  }

  /** Drops the loading image element. */
  destroyImage(): void {
    if (this._image) {
      const image = this._image as HTMLImageElement;
      image.onload = null;
      image.onabort = null;
      image.onerror = null;
      image.src = "";
      this._image = null;
    }
  }

  destroy(): void {
    this.destroyImage();
    this.$storedUrl = null;
    this.$tmpUrl = null;
    if (this._imageCanvasOffscreen) {
      // The old call went to the renderer's destroy, which the port has no
      // counterpart for: worker canvases are not ported.
      this._imageCanvasOffscreen = null;
    }
    this._imageCanvas = null;
  }

  _initImage(): void {
    this.destroyImage();
    const image = new globalThis.Image();
    this._image = image;
    const loaded = () => {
      this._updatedImage();
    };
    image.onload = loaded;
    image.onerror = loaded;
    image.onabort = loaded;
  }

  _getDictImageEntry(): DictionaryEntry | null | undefined {
    if (this._scene && this.$url) {
      const dictionary = this._imageScene().getDictionary();
      if (dictionary) return dictionary.getEntry(this.$url);
    }
    return null;
  }

  /**
   * Makes `source` the painted canvas: a canvas is used as is; an image
   * is drawn into this image's canvas, which becomes the dictionary
   * entry's cached canvas. When the budget is exceeded, the image element
   * itself is painted (and cached) instead.
   */
  _initImageCanvas(source: ImageSource): void {
    if (isCanvasElement(source)) {
      if (source === this._imageCanvas) return;
      this._imageCanvas = source;
      this._imageCanvasOffscreen = null;
    } else {
      if (!this._imageCanvas) this._imageCanvas = document.createElement("canvas");
      this._imageCanvas.width = source.width;
      this._imageCanvas.height = source.height;
      const entry = this._getDictImageEntry();
      if (entry) {
        if (
          "undefined" != typeof HTMLImageElement &&
          entry.cachedCanvas instanceof HTMLImageElement &&
          !RenderScheduler.usingOffscreenCanvas()
        ) {
          this._imageCanvas = null;
          this._imageCanvasOffscreen = null;
          this._image = entry.cachedCanvas;
          this._resetFxCacheAndState();
          return;
        }
        const dictionary = this._imageScene().getDictionary();
        if (!dictionary.setCachedCanvas(entry, this._imageCanvas)) {
          dictionary.setCachedCanvas(entry, source);
          this._imageCanvas = null;
          this._imageCanvasOffscreen = null;
          this._image = source;
          this._resetFxCacheAndState();
          return;
        }
      }
      (this._imageCanvas.getContext("2d") as CanvasRenderingContext2D).drawImage(
        source,
        0,
        0,
        source.width,
        source.height,
      );
    }
    this._resetFxCacheAndState();
  }

  /** The rectangle's box is the crop box, in bitmap pixels. */
  _updateImageRect(x: number, y: number, width: number | null, height: number | null): void {
    this._x = x;
    this._y = y;
    this._w = width as number;
    this._h = height as number;
    if (!this.isRecordedTransaction()) this._invalidatePath();
  }

  /** Scales the image down (never up) to fit into `box`. */
  toFit(box: Rect): void {
    let width = this.getWidth();
    let height = this.getHeight();
    if (width && height) {
      const scale = this.getTransform() ? (this.getTransform() as Transform).getScaleFactor() : 1;
      height *= scale;
      width *= scale;
      if (width > box.getWidth() || height > box.getHeight()) {
        const fit = Math.min(box.getWidth() / width, box.getHeight() / height);
        this.transform(new Transform().scaled(fit, fit));
      }
    }
  }

  override assignFrom(other: Node): void {
    if (other instanceof Image) {
      this.transferProperties(other, [GeometryProperties, VisualProperties, MetaProperties]);
    }
    super.assignFrom(other);
  }

  override toString(): string {
    return "[GImage]";
  }
}

/** The paint configuration's outline test, as the fill code calls it. */
interface OutlineConfiguration {
  isOutline(context: unknown): boolean;
}

const imagePrototype = Image.prototype;
imagePrototype._status = null;
imagePrototype._convertStatus = ConvertStatus.None;
imagePrototype._type = null;
imagePrototype._image = null;
imagePrototype._imageCanvas = null;
imagePrototype._imageCanvasOffscreen = null;
imagePrototype._vertexIterator = 0;
imagePrototype._updatingUrl = false;
