// Old: chunk.vendor.js module 228 (GPaintContext).
import type { Color } from "../color/color.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { GObject, registerClass } from "../core/object.ts";
import type { Destroyable } from "./destroyable.ts";
import type { DirtyMatcher } from "./dirty-list.ts";
import type { PaintConfiguration } from "./paint-configuration.ts";
import type { PaintCanvas } from "./paint-canvas.ts";

/**
 * Everything a paint pass hands down to the elements: the configuration,
 * the canvas painted into (with a stack for sub-canvases of effects and
 * blends), the dirty areas and the editor's outline colors.
 */
export class PaintContext extends GObject implements Destroyable {
  static {
    registerClass(this, "GPaintContext");
  }

  declare configuration: PaintConfiguration | null;
  declare canvas: PaintCanvas | null;
  canvasStack: PaintCanvas[] | null;
  declare dirtyMatcher: DirtyMatcher | null;
  outlineColors: Color[] | null;
  declare selectionOutlineColor: Color;
  declare selectionShapeOutlineColor: Color;
  declare computedBackgroundColor: Color | null;
  declare selectionSecondOutlineColor: Color;
  declare selectionThirdOutlineColor: Color;
  declare highlightOutlineColor: Color;
  declare knifeOutlineColor: Color;
  declare transformBoxOutlineColor: Color;
  declare annotationColor: Color;
  declare sliceColor: Color;
  declare labelColor: Color;

  constructor() {
    super();
    this.outlineColors = [];
    this.canvasStack = [];
  }

  isOutline(): boolean {
    return !!this.outlineColors && this.outlineColors.length > 0;
  }

  getOutlineColor(): Color {
    return this.outlineColors && this.outlineColors.length > 0
      ? (this.outlineColors[this.outlineColors.length - 1] as Color)
      : RGBColor.BLACK;
  }

  getRootCanvas(): PaintCanvas | null {
    const stack = this.canvasStack as PaintCanvas[];
    return stack.length > 0 ? (stack[0] as PaintCanvas) : this.canvas;
  }

  /** Paints into `canvas` from now on; returns the canvas painted into before. */
  pushCanvas(canvas: PaintCanvas): PaintCanvas | null {
    const previous = this.canvas;
    // The old code pushed the current canvas even when it was null.
    (this.canvasStack as (PaintCanvas | null)[]).push(this.canvas);
    this.canvas = canvas;
    return previous;
  }

  popCanvas(): void {
    const stack = this.canvasStack as PaintCanvas[];
    if (stack.length <= 0) throw new Error("Invalid call, stack length is zero.");
    this.canvas = stack.pop() as PaintCanvas;
  }

  isIncludingInvisible(): boolean {
    return false;
  }

  override toString(): string {
    return "[Object GPaintContext]";
  }

  destroy(): void {
    const stack = this.canvasStack as PaintCanvas[];
    while (stack.length) {
      (stack.pop() as PaintCanvas).destroy();
    }
    this.canvas = null;
    this.canvasStack = null;
    this.configuration = null;
  }
}

const selectionOutlineColor = new RGBColor([40, 128, 230]);

Object.assign(PaintContext.prototype, {
  configuration: null,
  canvas: null,
  dirtyMatcher: null,
  selectionOutlineColor,
  selectionShapeOutlineColor: selectionOutlineColor,
  computedBackgroundColor: null,
  selectionSecondOutlineColor: new RGBColor([255, 0, 170]),
  selectionThirdOutlineColor: new RGBColor([132, 102, 176]),
  highlightOutlineColor: new RGBColor([197, 17, 98]),
  knifeOutlineColor: new RGBColor([227, 0, 97]),
  transformBoxOutlineColor: new RGBColor([23, 104, 196]),
  annotationColor: new RGBColor([235, 100, 60]),
  sliceColor: new RGBColor([0, 255, 168]),
  labelColor: new RGBColor([0, 0, 0]),
});
