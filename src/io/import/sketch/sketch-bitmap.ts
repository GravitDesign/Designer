// Old: chunk.vendor.js module 1205 (model/item/sketchbitmap).
import type { Rect } from "../../../engine/math/rect.ts";
import type { Transform } from "../../../engine/math/transform.ts";
import { Image, type ImageStatusEvent } from "../../../engine/scene/image.ts";
import type { SketchFileReferenceData } from "./sketch-data.ts";
import { SketchElement } from "./sketch-element.ts";
import { SketchRect } from "./sketch-rect.ts";

/**
 * A bitmap layer: a GImage whose URL is the image file read from the zip
 * as a data URL. Its style, bounds and transform wait for the image to
 * load; transforms that arrive earlier are collected and applied then.
 */
export class SketchBitmap extends SketchElement {
  declare _clones: SketchBitmap[] | null;
  declare _deferredTransform: Transform | null | undefined;
  /** Its image loaded while the pages were being appended; handled after that (SketchFile._appending). */
  declare _loadPending: boolean;

  override parse(): void {
    const reference = this._getReference((this._data.image as SketchFileReferenceData)._ref);
    void reference.then((blob) => {
      const reader = new window.FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => {
        this._node.setProperty("url", reader.result);
        if (this._clones)
          this._clones.forEach((clone) => {
            clone._node.setProperty("url", reader.result);
          });
      };
      reader.onerror = () => this._settled();
    });
    // The image never gets a url: the import needn't wait for it. (The
    // promise above still rejects unhandled, as before.)
    void reference.catch(() => this._settled());
    this._node.__sketchNode__ = this;
    this._node.addEventListener(Image.StatusEvent, this._imageStatusEvent, this);
    this._file.bitmapLoading(this._node);
  }

  /** Tells the file that this bitmap and its clones won't load any more (see SketchFile.bitmapLoading). */
  _settled(): void {
    this._file.bitmapSettled(this._node);
    if (this._clones) this._clones.forEach((clone) => clone._file.bitmapSettled(clone._node));
  }

  override transform(transform: Transform | null | undefined): void {
    const combined = this._deferredTransform
      ? this._deferredTransform.multiplied(transform as Transform)
      : transform;
    if (this._loadPending || this._node.getStatus() !== Image.ImageStatus.Loaded)
      this._deferredTransform = combined;
    else {
      super.transform(combined);
      this._deferredTransform = null;
    }
  }

  override clone(): this {
    const copy = super.clone();
    copy._node.addEventListener(Image.StatusEvent, copy._imageStatusEvent, copy);
    // A clone made before the image data arrived gets its url with this
    // bitmap's (parse); one with a url reports its loading by status.
    if (this._file._loadingBitmaps.has(this._node) && !this._node.getProperty("url"))
      copy._file.bitmapLoading(copy._node);
    if (!this._clones) this._clones = [];
    this._clones.push(copy);
    return copy;
  }

  _imageStatusEvent(event: ImageStatusEvent): void {
    if (event.image === (this._node as unknown)) {
      if (event.status === Image.ImageStatus.Loaded) {
        // Not in the old app: an image that loads while the pages are
        // appended (at once, from an equal image's cached canvas) is
        // handled after the append, so its group's transform is collected
        // first, as when the old app's image loaded a frame later.
        if (this._file._appending) {
          this._loadPending = true;
          this._file._afterAppend.set(this._node, () => this._loaded());
        } else this._loaded();
      }
      if (event.status === Image.ImageStatus.Error || event.status === Image.ImageStatus.Loaded)
        this._node.removeEventListener(Image.StatusEvent, this._imageStatusEvent, this);
      // Not in the old app: what the import waits for before it calls back
      // (SketchFile.bitmapLoading). An image outside a scene is Delayed
      // and can't load until it is attached, so it isn't waited for.
      if (
        event.status === Image.ImageStatus.Resolving ||
        event.status === Image.ImageStatus.Loading
      )
        this._file.bitmapLoading(this._node);
      else this._file.bitmapSettled(this._node);
    }
  }

  /** The image loaded: the layer's style, then its bounds with the collected transform. */
  _loaded(): void {
    this._loadPending = false;
    SketchElement.prototype.parse.call(this, true);
    const box = this._node.getGeometryBBox();
    if (box) this.transform(SketchRect.getTransformation(box, this._getGeometryBBox() as Rect));
    else this.transform(this._deferredTransform);
  }

  override _getRelatedNodeClass(): new () => object {
    return Image;
  }
}

SketchBitmap.prototype._clones = null;
SketchBitmap.prototype._deferredTransform = null;
SketchBitmap.prototype._loadPending = false;
