// Old: chunk.vendor.js module 744 (GLabelGuide).
import type { Color } from "../../engine/color/color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { registerClass } from "../../engine/core/object.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { Guide, GuideVisual, guidePaintContext } from "./guide.ts";

/** Anything with a screen CSS color (a Color, or the scene's label color pattern). */
interface ScreenColor {
  toScreenCSS(): string;
}

/** A label to paint: text, view position of its box's top-left, box width, color. */
export class LabelItem {
  _position: Point;
  _label: string;
  _color: ScreenColor | null;
  _isScaleLabel: boolean;
  _width: number;

  constructor(
    position: Point,
    width: number,
    label: string,
    color?: ScreenColor | null,
    isScaleLabel?: boolean,
  ) {
    this._position = position;
    this._label = label;
    this._color = color || null;
    this._isScaleLabel = !!isScaleLabel;
    this._width = width;
  }

  getLabel(): string {
    return this._label;
  }

  getPosition(): Point {
    return this._position;
  }

  getColor(): ScreenColor | null {
    return this._color;
  }

  isScaleLabel(): boolean {
    return this._isScaleLabel;
  }

  getWidth(): number {
    return this._width;
  }
}

/**
 * The base of the guides that paint labels above boxes (page names,
 * symbol names). Labels that aren't scaled are cut to the box width with
 * an ellipsis. Not a Map guide: it never snaps.
 */
export class LabelGuide extends GuideVisual(Guide) {
  static {
    registerClass(this, "GLabelGuide");
  }

  static SCALE = true;
  static GATHER_ALL = false;
  static LabelItem = LabelItem;

  override getId(): string {
    throw new Error("GLabelGuide::getId virtual");
  }

  override paint(transform: Transform, paintContext: PaintContext): void {
    const context = guidePaintContext(paintContext);
    const labels = this._gatherLabels(transform, context);
    if (!labels) return;
    const scene = this._scene;
    const defaultColor: ScreenColor =
      (scene.$lbc as ScreenColor | null) ||
      (context.labelColor as Color | undefined) ||
      RGBColor.BLACK;
    const canvas = context.canvas;
    labels.forEach((item) => {
      if (!item.getLabel()) return;
      let factor = item.isScaleLabel() ? transform.getScaleFactor() : 1;
      factor *= PaintCanvas.getScreenDPI();
      const size = scene.$lbs * factor;
      const padding = scene.$lbp * factor;
      let text = item.getLabel();
      const position = item.getPosition();
      const color = item.getColor() || defaultColor;
      if (!item.isScaleLabel()) {
        const room = item.getWidth() - padding;
        let width = canvas.measureText(text, size).width;
        const ellipsis = canvas.measureText("…", size).width;
        if (width > room) {
          for (let length = text.length; width >= room - ellipsis && length-- > 0;) {
            text = text.substring(0, length);
            width = canvas.measureText(text, size).width;
          }
          text += "…";
        }
      }
      canvas.putAuxilliaryText(
        text,
        position.getX(),
        position.getY() - padding,
        size + "px Verdana",
        "bottom",
        "start",
        0.8,
        color.toScreenCSS(),
      );
    });
  }

  map(): null {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden by the label guides
  _gatherLabels(transform: Transform, context: PaintContext): LabelItem[] | null {
    throw new Error("Default label guides not supported");
  }

  override toString(): string {
    return "[Object GLabelGuide]";
  }
}
