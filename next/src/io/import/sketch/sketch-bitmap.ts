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

  override parse(): void {
    void this._getReference((this._data.image as SketchFileReferenceData)._ref).then((blob) => {
      const reader = new window.FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => {
        this._node.setProperty("url", reader.result);
        if (this._clones)
          this._clones.forEach((clone) => {
            clone._node.setProperty("url", reader.result);
          });
      };
    });
    this._node.__sketchNode__ = this;
    this._node.addEventListener(Image.StatusEvent, this._imageStatusEvent, this);
  }

  override transform(transform: Transform | null | undefined): void {
    const combined = this._deferredTransform
      ? this._deferredTransform.multiplied(transform as Transform)
      : transform;
    if (this._node.getStatus() !== Image.ImageStatus.Loaded) this._deferredTransform = combined;
    else {
      super.transform(combined);
      this._deferredTransform = null;
    }
  }

  override clone(): this {
    const copy = super.clone();
    copy._node.addEventListener(Image.StatusEvent, copy._imageStatusEvent, copy);
    if (!this._clones) this._clones = [];
    this._clones.push(copy);
    return copy;
  }

  _imageStatusEvent(event: ImageStatusEvent): void {
    if (event.image === (this._node as unknown)) {
      if (event.status === Image.ImageStatus.Loaded) {
        SketchElement.prototype.parse.call(this, true);
        const box = this._node.getGeometryBBox();
        if (box) this.transform(SketchRect.getTransformation(box, this._getGeometryBBox() as Rect));
        else this.transform(this._deferredTransform);
      }
      if (event.status === Image.ImageStatus.Error || event.status === Image.ImageStatus.Loaded)
        this._node.removeEventListener(Image.StatusEvent, this._imageStatusEvent, this);
    }
  }

  override _getRelatedNodeClass(): new () => object {
    return Image;
  }
}

SketchBitmap.prototype._clones = null;
SketchBitmap.prototype._deferredTransform = null;
