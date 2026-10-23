// Old: chunk.vendor.js module 383 (base of the icon handles: rotate,
// preserve aspect ratio, skew).
import type { Color } from "../../engine/color/color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import type { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { Image } from "../../engine/scene/image.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "./editor-annotation.ts";

/** The handle options an icon handle reads from EditorOptions.annotationHandles. */
export interface IconAnnotationOptions {
  type: string;
  size: number;
  inverted?: boolean;
  outlineWidth?: number | null;
  shadowColor?: string | null;
  outsideStroke?: boolean;
  iconSize?: number | { width: number; height: number };
  iconDynamicColor?: boolean;
}

/** A handle that can show an icon (loaded from a URL) on top. */
export abstract class IconAnnotation {
  _icon: Image | null = null;
  _iconVisible = false;

  abstract getAnnotationOptions(): IconAnnotationOptions;

  /** The handle's box, grown by the annotation pick distance. */
  getAnnotationBBox(
    transform: Transform | null | undefined,
    center: Point | null | undefined,
    withPaintMargin?: boolean,
  ): Rect {
    return EditorAnnotation.getAnnotationBBox(
      transform,
      center,
      this.getAnnotationOptions().size,
      withPaintMargin,
    ).expanded(
      EditorOptions.annotPickDistance,
      EditorOptions.annotPickDistance,
      EditorOptions.annotPickDistance,
      EditorOptions.annotPickDistance,
    );
  }

  getAnnotHalfWidth(): number {
    return this.getAnnotationOptions().size / 2;
  }

  /**
   * Paints the handle, then its icon (rotated by -`angle` around its
   * centre), tinted with the outline colour when the options ask for a
   * dynamic colour.
   */
  paintAnnotation(
    context: PaintContext,
    transform: Transform | null | undefined,
    center: Point | null,
    angle?: number | null,
    color?: Color | null,
  ): void {
    const options = this.getAnnotationOptions();
    EditorAnnotation.paintAnnotation(
      context,
      transform,
      center,
      options.type,
      options.inverted,
      options.size,
      color || context.selectionOutlineColor,
      RGBColor.WHITE,
      options.outlineWidth,
      options.shadowColor,
      options.outsideStroke,
    );
    if (!this.isIconVisible()) return;
    const icon = this._icon as Image;
    let image: HTMLCanvasElement | PaintCanvas | null = icon.getImageCanvas();
    if (!image) return;
    let point = center as Point;
    if (transform) point = transform.mapPoint(point);
    const canvas = context.canvas as PaintCanvas;
    const canvasTransform = canvas.getTransform(true);
    let iconTransform = new Transform();
    const bbox = icon.getGeometryBBox() as Rect;
    const iconCenter = bbox.getSide(Rect.Side.CENTER);
    const x = Math.floor(point.getX() - iconCenter.getX());
    const y = Math.floor(point.getY() - iconCenter.getY());
    let tinted: PaintCanvas | undefined;
    if (angle) {
      iconTransform = new Transform()
        .translated(-iconCenter.getX(), -iconCenter.getY())
        .rotated(-angle)
        .translated(iconCenter.getX(), iconCenter.getY());
    }
    if (options.iconDynamicColor) {
      tinted = canvas.createCanvas(bbox);
      tinted.fillCanvas(color || context.selectionOutlineColor, 1);
      tinted.drawImage(
        image,
        0,
        0,
        true,
        1,
        PaintCanvas.CompositeOperator.DestinationIn,
        true,
        bbox.getWidth(),
        bbox.getHeight(),
      );
      image = tinted;
    }
    iconTransform = iconTransform.translated(x, y);
    canvas.setTransform(canvasTransform.preMultiplied(iconTransform));
    canvas.drawImage(image, 0, 0, false, 1, null, false, bbox.getWidth(), bbox.getHeight());
    canvas.setTransform(canvasTransform);
    if (tinted) tinted.destroy();
  }

  /** Loads the icon from `url` (as a PNG data URL); null removes it. */
  setIcon(url: string | null | undefined): void {
    if (!url) {
      this._icon = null;
      return;
    }
    const request = new XMLHttpRequest();
    request.addEventListener("load", () => {
      if (200 == request.status && request.response) {
        const blob = new Blob([request.response as BlobPart], { type: "image/png" });
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = (event.target as FileReader).result;
          this._icon = new Image();
          this._icon.addEventListener(Image.StatusEvent, this._statusEvent, this);
          this._icon.setProperty("url", dataUrl);
          this._icon.forceImageUpdate();
        };
        reader.readAsDataURL(blob);
      }
    });
    request.responseType = "blob";
    request.open("GET", url, true);
    request.send(null);
  }

  getIcon(): Image | null {
    return this._icon;
  }

  setIconVisible(visible: boolean): void {
    if (this._iconVisible !== visible) {
      this._iconVisible = visible;
      if (this._iconVisible) this._updateBounds();
    }
  }

  isIconVisible(): boolean {
    return this._iconVisible && !!this._icon;
  }

  _statusEvent(event: InstanceType<typeof Image.StatusEvent>): void {
    if (
      event.status !== Image.ImageStatus.Loading &&
      event.status !== Image.ImageStatus.Resolving
    ) {
      if (event.status === Image.ImageStatus.Loaded) this._updateBounds();
      (this._icon as Image).removeEventListener(Image.StatusEvent, this._statusEvent, this);
    }
  }

  _updateBounds(): void {
    if (!this._icon) return;
    const iconSize = this.getAnnotationOptions().iconSize;
    let width = iconSize as number;
    let height = iconSize as number;
    if ("object" == typeof iconSize) {
      width = iconSize.width;
      height = iconSize.height;
    }
    this._icon.setBounds(0, 0, width, height);
  }
}
