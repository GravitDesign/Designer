// Old: chunk.vendor.js module 139 (GTexturePattern).
import { Event } from "../core/event.ts";
import { EventTargetMixin } from "../core/event-target.ts";
import { registerClass } from "../core/object.ts";
import { equals } from "../core/util.ts";
import { Rect } from "../math/rect.ts";
import { Transform, type TransformDecomposition } from "../math/transform.ts";
import { Bitmap } from "../paint/bitmap.ts";
import { registerTexturePattern } from "../paint/late-bound.ts";
import { Canvas2DPaintCanvas } from "../paint/paint-canvas.ts";
import { Node } from "../scene/node.ts";
import { Dictionary } from "./dictionary.ts";
import { getWorkspaceClass } from "./late-bound.ts";
import { Pattern } from "./pattern.ts";

/** What a texture pattern needs from the scene it is used in (GScene). */
export interface TextureScene {
  getDictionary(): Dictionary;
  getWorkspace(): {
    resolveUrl(url: string, callback: (resolved: string) => void, scene: unknown): void;
  };
  addDestroyable(destroyable: unknown): void;
}

/** What a texture pattern needs from the element it is made from. */
export interface TextureNode {
  clone(): TextureNode;
  transform(transform: Transform): void;
  getPaintBBox(): Rect;
  toBitmap(): Bitmap;
  getProperty(name: string): unknown;
  hasMixin(mixin: unknown): boolean;
  acceptChildren(visitor: (node: TextureNode) => unknown): void;
  _setWorkspace(workspace: unknown): void;
  _paintSharp?: boolean;
}

/** The image node class as getTexture uses it (GImage). */
interface ImageNodeClass {
  StatusEvent: abstract new (...args: never[]) => Event & { status: unknown };
  ImageStatus: { Loaded: unknown; Error: unknown };
}

/** The scene class as getTexture uses it (GScene). */
interface SceneNodeClass {
  new (workspace: unknown): {
    addEventListener(
      eventClass: unknown,
      listener: (event: Event & { status: unknown }) => void,
      target?: unknown,
    ): void;
    appendChild(node: TextureNode): void;
  };
}

/** What a texture pattern is made from. */
export type TextureSource = string | HTMLCanvasElement | TextureNode | null | undefined;

/** Triggered on the pattern when its image loaded or its texture changed. */
export class TextureUpdateEvent extends Event {
  static {
    // The old event was a plain function without GEvent and a type id.
    registerClass(this, "GTexturePattern.UpdateEvent");
  }

  texture: TexturePattern;

  constructor(texture: TexturePattern) {
    super();
    this.texture = texture;
  }
}

const PositionMode = {
  Auto: "auto",
  Top: "top",
  Left: "left",
  Center: "center",
  Right: "right",
  Bottom: "bottom",
} as const;

const RepeatMode = {
  Both: "repeat",
  Horizontal: "repeat-x",
  Vertical: "repeat-y",
  None: "no-repeat",
} as const;

const SizeMode = {
  Auto: "auto",
  Contain: "contain",
  Cover: "cover",
  Percent: "percent",
  Length: "length",
} as const;

const ScaleMode = {
  Fill: "fill",
  Fit: "fit",
  Stretch: "stretch",
  Tile: "tile",
} as const;

/** A saved texture pattern ("T#{...}"). */
export interface TexturePatternBlob {
  t?: number[];
  u: string | null;
  r: string;
  s: string;
  w: number | null;
  h: number | null;
  p: string;
  m: boolean;
  a: number;
  sm: string;
  ts: number;
  n?: string | null;
  surl?: string | null;
}

function isCanvas(value: unknown): value is HTMLCanvasElement {
  return "undefined" != typeof HTMLCanvasElement && value instanceof HTMLCanvasElement;
}

/**
 * An image (a url, a canvas or an element rendered to a bitmap) used as a
 * fill or border. Image urls go into the scene dictionary, so the pattern
 * stores "dictionary://<uuid>" and `_storedUrl` keeps the resolved url.
 */
export class TexturePattern extends EventTargetMixin(Pattern) {
  static {
    registerClass(this, "GTexturePattern");
    Pattern.register("T", this);
    registerTexturePattern(this);
  }

  static UpdateEvent = TextureUpdateEvent;
  static PositionMode = PositionMode;
  static RepeatMode = RepeatMode;
  static SizeMode = SizeMode;
  static ScaleMode = ScaleMode;

  /** The presets of the texture editor. */
  static ScaleSettings: Record<string, (texture: TexturePattern) => void> = {
    fill(texture) {
      texture.setRepeatMode(RepeatMode.None);
      texture.setSizeMode(SizeMode.Cover);
      texture.setPosition(PositionMode.Center);
    },
    fit(texture) {
      texture.setRepeatMode(RepeatMode.None);
      texture.setSizeMode(SizeMode.Contain);
      texture.setPosition(PositionMode.Center);
    },
    stretch(texture) {
      texture.setRepeatMode(RepeatMode.None);
      texture.setSizeMode(SizeMode.Percent);
      texture.setPosition(PositionMode.Center);
      texture.setWidth(100);
      texture.setHeight(100);
    },
    tile(texture) {
      texture.setRepeatMode(RepeatMode.Both);
      texture.setSizeMode(SizeMode.Auto);
      texture.setPosition(PositionMode.Auto);
    },
  };

  /**
   * Compares the settings, the transform and the source node. Two null
   * patterns are equal; one null pattern throws, as in the old code.
   */
  static equals(
    a: TexturePattern | null | undefined,
    b: TexturePattern | null | undefined,
  ): boolean {
    if (!a && a === b) return true;
    const left = a as TexturePattern;
    const right = b as TexturePattern;
    let same = true;
    (
      [
        "_url",
        "_repeatMode",
        "_sizeMode",
        "_width",
        "_height",
        "_position",
        "_mask",
        "_angle",
        "_scaleMode",
        "_tileSize",
      ] as const
    ).forEach((key) => {
      same = same && left[key] === right[key];
    });
    return !(
      !same ||
      ((left._transform || left._transform !== right._transform) &&
        !Transform.equals(left._transform, right._transform)) ||
      (left._node && left._node !== right._node)
    );
  }

  // Defaults live on the prototype (set below the class), as in the old
  // code; subclasses such as the noise pattern rely on that.
  declare texture: unknown;
  declare _transform: Transform | null | undefined;
  declare _url: string | null;
  declare _image: HTMLImageElement | HTMLCanvasElement | null;
  declare _node: TextureNode | null;
  declare _repeatMode: string;
  declare _sizeMode: string;
  declare _scaleMode: string;
  declare _width: number | null;
  declare _height: number | null;
  declare _position: string;
  declare _tileSize: number;
  declare _mask: boolean;
  declare _angle: number;
  declare _scaleX: number;
  declare _scaleY: number;
  declare _cloned: boolean;
  declare _scene: TextureScene | null;
  declare _storedUrl: string | null | undefined;
  declare _cachedBitmap: Bitmap | null;
  declare _invalidate: boolean;

  constructor(texture?: TextureSource, repeatMode?: string) {
    super();
    this._sizeMode = SizeMode.Auto;
    this._repeatMode = repeatMode || RepeatMode.None;
    this._angle = 0;
    this._tileSize = 1;
    this._mask = false;
    this._invalidate = false;
    this.setTexture(texture);
  }

  isReady(): boolean {
    return (
      !!this._node ||
      !(
        !this._image ||
        0 === (this._image as HTMLImageElement).naturalWidth ||
        0 === (this._image as HTMLImageElement).naturalHeight
      )
    );
  }

  setTexture(texture: TextureSource): void {
    if (this._url && this._scene && Dictionary.isDictionary(this._url)) {
      this._scene.getDictionary().removeEntry(this._url);
    }
    if (texture) {
      this._invalidate = true;
      // The old code handed the cached bitmap's recorded context to the
      // scene for destruction; bitmaps draw into plain canvases now.
      this._cachedBitmap = null;
      if ("string" == typeof texture) {
        if (!equals(texture, this._url)) {
          this._url = texture;
          this._node = null;
          this._initializeImage();
        }
      } else if (isCanvas(texture)) {
        this._node = null;
        this._url = null;
        this._initializeImage(texture);
      } else {
        this._url = null;
        this._image = null;
        this._node = texture.clone();
      }
    }
  }

  /**
   * The image to paint: the cached bitmap, the image, or the node rendered
   * at the current scale. A node with images renders once they loaded.
   */
  getTexture(): Bitmap | HTMLImageElement | HTMLCanvasElement | null {
    if (!this._invalidate && this._cachedBitmap) return this._cachedBitmap;
    if (this._image) return this._image;
    if (!this._node) return null;
    const scale = new Transform().scaled(this._scaleX, this._scaleY);
    const node = this._node.clone();
    node._paintSharp = false;
    node.transform(scale);
    const images: TextureNode[] = [];
    if ("image" === Node.getName(node)) images.push(node);
    if (node.hasMixin(Node.Container)) {
      node.acceptChildren((child) => {
        if ("image" === Node.getName(child)) images.push(child);
      });
    }
    if (images.length) {
      const imageClass = Node._nameToNodeClassMap.get("image") as unknown as ImageNodeClass;
      const sceneClass = Node._nameToNodeClassMap.get("scene") as unknown as SceneNodeClass;
      const WorkspaceClass = getWorkspaceClass();
      const workspace = new WorkspaceClass();
      const scene = new sceneClass(workspace);
      scene.addEventListener(
        imageClass.StatusEvent,
        (event) => {
          if (
            event.status === imageClass.ImageStatus.Loaded ||
            event.status === imageClass.ImageStatus.Error
          ) {
            images.pop();
            if (!images.length) {
              this._invalidate = false;
              this._cachedBitmap = node.toBitmap();
              this.requestInvalidation();
            }
          }
        },
        this,
      );
      node._setWorkspace(workspace);
      scene.appendChild(node);
      if (this._cachedBitmap) {
        const box = node.getPaintBBox();
        const bitmap = new Bitmap(box.getWidth(), box.getHeight());
        (bitmap.getHTMLElement().getContext("2d") as CanvasRenderingContext2D).drawImage(
          this._cachedBitmap.getHTMLElement(),
          0,
          0,
          bitmap.getWidth(),
          bitmap.getHeight(),
        );
        return bitmap;
      }
    } else {
      this._invalidate = false;
      this._cachedBitmap = node.toBitmap();
    }
    return this._cachedBitmap;
  }

  requestInvalidation(): void {
    this.trigger(new TextureUpdateEvent(this));
  }

  /**
   * Attaches the pattern to a scene. When the scene's dictionary doesn't
   * know the url (or knows a different image), the stored url is used; when
   * there is no image at all, a red and green chessboard tile shows instead.
   */
  setScene(scene: TextureScene | null): void {
    this._scene = scene;
    if (this._scene && this._url) {
      const value = this._scene.getDictionary().getValue(this._url);
      if (!value || (this._storedUrl && value !== this._storedUrl)) {
        this._url = this._storedUrl ?? null;
      }
      if (!this._url || !this._initializeImage()) {
        const chessboard = Canvas2DPaintCanvas.createChessboard(8, "#fcc", "#cfc");
        const bitmap = new Bitmap(chessboard);
        this._url = bitmap.toImageDataUrl(Bitmap.ImageType.PNG);
        TexturePattern.ScaleSettings["tile"]?.(this);
        this._initializeImage();
      }
    }
  }

  setTileSize(size: number): void {
    this._tileSize = size;
  }

  getTileSize(): number {
    return this._tileSize;
  }

  getAngle(): number {
    return this._angle;
  }

  setAngle(angle: number): void {
    this._angle = angle;
  }

  isMask(): boolean {
    return !!this._mask;
  }

  setMask(mask: boolean): void {
    this._mask = mask;
  }

  setPosition(position: string): void {
    this._position = position;
  }

  getPosition(): string {
    return this._position;
  }

  getTextureBBox(): Rect | null {
    if (this._image) return new Rect(0, 0, this._image.width, this._image.height);
    if (this._node) return this._node.getPaintBBox();
    return null;
  }

  setWidth(width: number | null): void {
    this._width = width;
  }

  getWidth(): number | null {
    return this._width;
  }

  setHeight(height: number | null): void {
    this._height = height;
  }

  getHeight(): number | null {
    return this._height;
  }

  setScaleMode(mode: string): void {
    this._scaleMode = mode;
  }

  getScaleMode(): string {
    return this._scaleMode;
  }

  setSizeMode(mode: string): void {
    this._sizeMode = mode;
  }

  getSizeMode(): string {
    return this._sizeMode || SizeMode.Auto;
  }

  setRepeatMode(mode: string): void {
    this._repeatMode = mode;
  }

  getRepeatMode(): string {
    return this._repeatMode;
  }

  getTransform(): Transform | null | undefined {
    return this._transform;
  }

  setTransform(transform: Transform | null | undefined): void {
    this._transform = transform;
  }

  override serialize(options?: { save?: boolean } | null): string {
    return JSON.stringify(this._serializeToBlob(options));
  }

  override deserialize(payload: string): void {
    const blob = JSON.parse(payload) as TexturePatternBlob | null;
    if (blob) this._deserializeFromBlob(blob);
  }

  /** The blob in the old key order; saving leaves out the resolved url. */
  _serializeToBlob(options?: { save?: boolean } | null): TexturePatternBlob {
    const blob = {} as TexturePatternBlob;
    if (this._transform) blob.t = Transform.serialize(this._transform);
    blob.u = this._url;
    blob.r = this._repeatMode;
    blob.s = this._sizeMode;
    blob.w = this._width;
    blob.h = this._height;
    blob.p = this._position;
    blob.m = this._mask;
    blob.a = this._angle;
    blob.sm = this._scaleMode;
    blob.ts = this._tileSize;
    if (this._node) blob.n = Node.serialize(this._node as unknown as Node);
    if (!(options && options.save)) blob.surl = this._storedUrl;
    return blob;
  }

  _deserializeFromBlob(blob: TexturePatternBlob): void {
    this._transform = Object.hasOwn(blob, "t") ? Transform.deserialize(blob.t) : null;
    this._url = blob.u;
    this._repeatMode = blob.r;
    this._sizeMode = blob.s || SizeMode.Auto;
    this._width = blob.w;
    this._height = blob.h;
    this._position = blob.p || PositionMode.Auto;
    this._mask = blob.m;
    this._angle = blob.a || 0;
    this._scaleMode = blob.sm || ScaleMode.Tile;
    this._tileSize = blob.ts || 1;
    if (blob.n) this._node = Node.deserialize(blob.n) as unknown as TextureNode;
    this._storedUrl = blob.surl;
    this._initializeImage();
  }

  /**
   * Starts loading the image (or takes the given canvas). Returns false
   * when there is nothing to load: no url, or a dictionary url without a
   * scene to look it up in.
   */
  _initializeImage(image?: HTMLCanvasElement): boolean {
    let loading = true;
    if (image) this._image = image;
    else if (this._url) {
      this._image = new Image();
      if (this._scene) {
        if (!Dictionary.isDictionary(this._url)) {
          const entry = this._scene.getDictionary().putValueIfAbsent(this._url);
          if (entry) this._url = entry.getUrl();
        }
        this._scene
          .getWorkspace()
          .resolveUrl(this._url, this._resolvedImage.bind(this), this._scene);
      } else if (Dictionary.isDictionary(this._url)) loading = false;
      else this._resolvedImage(this._url);
    } else loading = false;
    return loading;
  }

  _resolvedImage(url: string): void {
    this._storedUrl = url;
    const image = this._image as HTMLImageElement;
    if (!image || image.src !== url) {
      image.onload = this._updatedImage.bind(this);
      if (url && url.match(/^(http|https|\/\/)/)) image.crossOrigin = "Anonymous";
      else image.crossOrigin = null;
      image.src = url;
    }
  }

  _updatedImage(): void {
    if (
      this._image &&
      0 !== (this._image as HTMLImageElement).naturalWidth &&
      0 !== (this._image as HTMLImageElement).naturalHeight
    ) {
      this._invalidate = true;
      this._cachedBitmap = null;
      this.requestInvalidation();
    }
  }

  /**
   * The pattern transform for painting into `bounds` (in element space)
   * under `transform`: size mode, tile size, position and angle, with the
   * element's rotation and skew applied around the bounds' center.
   */
  createTextureTransform(
    bounds: Rect | null | undefined,
    transform: Transform,
    scale?: number,
  ): Transform {
    let result = new Transform();
    if (!bounds || bounds.isEmpty()) return result;
    const textureBox = this.getTextureBBox();
    if (!textureBox || textureBox.isEmpty()) return result;
    let mapped = transform.mapRect(bounds);
    if (!this._image && scale && scale > 1) result = result.scaled(1 / scale, 1 / scale);
    let width = textureBox.getWidth();
    let height = textureBox.getHeight();
    let scaleX = 1;
    let scaleY = 1;
    if (this.getScaleMode() == ScaleMode.Tile) scaleX = scaleY = this.getTileSize();
    switch (this.getSizeMode()) {
      case SizeMode.Contain:
        scaleX = scaleY = Math.min(
          mapped.getWidth() / textureBox.getWidth(),
          mapped.getHeight() / textureBox.getHeight(),
        );
        break;
      case SizeMode.Cover:
        scaleX = scaleY = Math.max(
          mapped.getWidth() / textureBox.getWidth(),
          mapped.getHeight() / textureBox.getHeight(),
        );
        break;
      case SizeMode.Percent:
        scaleX = (((this.getWidth() as number) / 100) * mapped.getWidth()) / textureBox.getWidth();
        scaleY =
          (((this.getHeight() as number) / 100) * mapped.getHeight()) / textureBox.getHeight();
        break;
      case SizeMode.Length:
        scaleX = (this.getWidth() as number) / textureBox.getWidth();
        scaleY = (this.getHeight() as number) / textureBox.getHeight();
    }
    // Snaps a scale to whole texture pixels unless that makes it zero.
    const snap = (value: number, size: number): number => {
      if (1 !== value) {
        const snapped = Math.round(value * size) / size;
        if (0 != snapped) return snapped;
      }
      return value;
    };
    scaleX = snap(scaleX, textureBox.getWidth());
    scaleY = snap(scaleY, textureBox.getHeight());
    if (scaleX && scaleY) {
      if (this._image) result = result.scaled(scaleX, scaleY);
      width *= scaleX;
      height *= scaleY;
    }
    scaleX = (scaleX || 1) * Math.max(1, scale || 1);
    scaleY = (scaleY || 1) * Math.max(1, scale || 1);
    if (scaleX !== this._scaleX || scaleY !== this._scaleY) this._invalidate = true;
    this._scaleX = scaleX;
    this._scaleY = scaleY;
    const decomposition = transform.decomposed() as TransformDecomposition;
    const rotation = this._getRotatedTransform(transform) || new Transform();
    if (!rotation.isIdentity()) {
      const back = (
        decomposition.translate.multiplied(rotation).decomposed() as TransformDecomposition
      ).translate
        .inverted()
        ?.getTranslation() as ReturnType<Transform["getTranslation"]>;
      const unrotate = rotation
        .multiplied(decomposition.translate)
        .translated(back.getX(), back.getY());
      mapped = transform.multiplied(unrotate.inverted() as Transform).mapRect(bounds);
    }
    switch (this.getPosition()) {
      case PositionMode.Auto:
        result = result.translated(mapped.getX(), mapped.getY());
        break;
      case PositionMode.Top:
        result = result.translated(
          mapped.getSide(Rect.Side.CENTER).getX() - width / 2,
          mapped.getY(),
        );
        break;
      case PositionMode.Left:
        result = result.translated(
          mapped.getX(),
          mapped.getSide(Rect.Side.CENTER).getY() - height / 2,
        );
        break;
      case PositionMode.Bottom:
        result = result.translated(
          mapped.getSide(Rect.Side.CENTER).getX() - width / 2,
          mapped.getSide(Rect.Side.BOTTOM_LEFT).getY() - height,
        );
        break;
      case PositionMode.Right:
        result = result.translated(
          mapped.getSide(Rect.Side.TOP_RIGHT).getX() - width,
          mapped.getSide(Rect.Side.CENTER).getY() - height / 2,
        );
        break;
      case PositionMode.Center:
        result = result.translated(
          mapped.getSide(Rect.Side.CENTER).getX() - width / 2,
          mapped.getSide(Rect.Side.CENTER).getY() - height / 2,
        );
    }
    const center = mapped.getSide(Rect.Side.CENTER);
    return result
      .translated(-center.getX(), -center.getY())
      .multiplied(rotation)
      .rotated(this.getAngle())
      .translated(center.getX(), center.getY())
      .multiplied(transform.inverted() as Transform);
  }

  /** A copy through serialize that shares the cached bitmap and the scene. */
  override clone(): TexturePattern {
    const payload = this.serialize();
    const copy = new TexturePattern();
    copy.deserialize(payload);
    copy._cachedBitmap = this._cachedBitmap;
    if (this._cachedBitmap) this._cloned = true;
    copy._invalidate = true;
    copy.setScene(this._scene);
    return copy;
  }

  override asCSSBackground(): string {
    let url: string | null | undefined = this._storedUrl || this._url;
    if (Dictionary.isDictionary(url)) url = "";
    if (this._node) {
      url =
        "image" === Node.getName(this._node)
          ? (this._node.getProperty("storedUrl") as string | null) || ""
          : this._node.toBitmap().toImageDataUrl(Bitmap.ImageType.PNG);
    }
    return 'url("' + String(url) + '")';
  }

  override getAverageColor(): number[] {
    return [128, 128, 128, 1];
  }

  getRawUrl(): string | null | undefined {
    return this._storedUrl;
  }

  getUrl(): string | null {
    return this._url;
  }

  _getRotatedTransform(transform: Transform): Transform {
    const decomposition = transform.decomposed() as TransformDecomposition;
    return decomposition.rotate.multiplied(decomposition.skew);
  }

  override toString(): string {
    return "[Object GTexturePattern]";
  }
}

const prototype = TexturePattern.prototype;
prototype.texture = null;
prototype._transform = undefined;
prototype._url = null;
prototype._image = null;
prototype._node = null;
prototype._repeatMode = RepeatMode.None;
prototype._sizeMode = SizeMode.Auto;
prototype._scaleMode = ScaleMode.Tile;
prototype._width = null;
prototype._height = null;
prototype._position = PositionMode.Auto;
prototype._tileSize = 1;
prototype._mask = false;
prototype._angle = 0;
prototype._scaleX = 1;
prototype._scaleY = 1;
prototype._cloned = false;
prototype._scene = null;
prototype._storedUrl = null;
prototype._cachedBitmap = null;
prototype._invalidate = false;
