// Old: chunk.vendor.js module 893 (GRulerWidget).
/**
 * The horizontal and vertical rulers of a scene view and the unit box in
 * their corner. A ruler paints its ticks and labels on a canvas in the
 * scene's unit (`ut`), at the view's offset and scale; a mouse marker shows
 * the pointer position. The unit box shows the unit's name.
 */
import { GMath } from "../../engine/math/math.ts";
import { Length } from "../../engine/math/length.ts";
import { registerClass } from "../../engine/core/object.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { AfterPropertiesChangeEvent } from "../../engine/scene/node-events.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { Widget } from "./widget.ts";

const Orientation = {
  Horizontal: 0,
  Vertical: 1,
} as const;

type OrientationValue = (typeof Orientation)[keyof typeof Orientation];

/** Thickness of a ruler in CSS pixels. */
const RULER_SIZE = 19;

/** The view configuration fields the unit box reads. */
interface UnitRulerConfiguration {
  rulerLeftFill: boolean;
}

export class RulerWidget extends Widget {
  static {
    registerClass(this, "GRulerWidget");
  }

  static Orientation = Orientation;

  _scene: Scene;
  _orientation: OrientationValue | null = null;
  _canvas: HTMLCanvasElement | null = null;
  _context: CanvasRenderingContext2D | null = null;
  _mouseMarker: HTMLDivElement | null = null;
  _offset = 0;
  _scale = 1;
  _isUnitRuler: boolean | undefined;
  _verticalWidth: number | null = null;

  /**
   * A ruler with `orientation`, or with `isUnitRuler` the unit box, which
   * takes the view's configuration.
   */
  constructor(
    orientation: OrientationValue | null,
    scene: Scene,
    container?: HTMLElement | null,
    isUnitRuler?: boolean,
    configuration?: UnitRulerConfiguration,
  ) {
    super(container);
    this._scene = scene;
    this._isUnitRuler = isUnitRuler;
    this._scene.addEventListener(
      AfterPropertiesChangeEvent,
      this._afterPropertiesChangeEvent,
      this,
    );
    const orientationClass =
      orientation === Orientation.Vertical
        ? "vertical"
        : orientation === Orientation.Horizontal
          ? "horizontal"
          : "";
    this._htmlElement.style.position = "absolute";
    this._htmlElement.style.color = "black";
    this._htmlElement.className = "g-ruler-widget " + orientationClass;
    if (isUnitRuler) {
      this._createUnitRuler(configuration as UnitRulerConfiguration);
      this._updateUnitRuler(configuration);
    } else {
      this._orientation = orientation || Orientation.Horizontal;
      const canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.left = "0px";
      canvas.style.top = "0px";
      canvas.style.imageRendering = "pixelated";
      if ("pixelated" !== canvas.style.imageRendering)
        canvas.style.imageRendering = "nearest-neighbor";
      this._canvas = canvas;
      this._context = canvas.getContext("2d");
      this._htmlElement.appendChild(canvas);
      const marker = document.createElement("div");
      marker.style.position = "absolute";
      marker.className = "mouse-marker";
      marker.style.background = "black";
      if (this._orientation === Orientation.Horizontal) {
        marker.style.top = "0px";
        marker.style.height = "19px";
        marker.style.width = "1px";
        marker.style.left = "-1px";
      } else {
        marker.style.left = "0px";
        marker.style.width = "19px";
        marker.style.height = "1px";
        marker.style.top = "-1px";
      }
      this._mouseMarker = marker;
      this._htmlElement.appendChild(marker);
    }
  }

  /** Moves the mouse marker to `position` CSS pixels along the ruler. */
  setMousePosition(position: number): void {
    const marker = this._mouseMarker as HTMLDivElement;
    if (this._orientation === Orientation.Horizontal) marker.style.left = position + "px";
    else marker.style.top = position + "px";
  }

  /** Repaints for the view's offset (device pixels) and scale, when either changed. */
  updateView(offset: number, scale: number): void {
    if (offset !== this._offset || scale !== this._scale) {
      this._offset = offset;
      this._scale = scale;
      this._paint();
    }
  }

  release(): void {
    this._scene.removeEventListener(
      AfterPropertiesChangeEvent,
      this._afterPropertiesChangeEvent,
      this,
    );
  }

  override getHeight(): number {
    return this._orientation === Orientation.Horizontal ? RULER_SIZE : super.getHeight();
  }

  override getWidth(): number {
    return this._orientation === Orientation.Vertical
      ? this._verticalWidth
        ? this._verticalWidth
        : RULER_SIZE
      : super.getWidth();
  }

  /**
   * The horizontal ruler's canvas is as wide as the screen, so it never
   * needs a resize while the view grows; the unit box only takes the width.
   */
  override resize(width: number, height: number): void {
    if (this._isUnitRuler) this._htmlElement.style.width = width + "px";
    else if (width !== this.getWidth() || height !== this.getHeight()) {
      super.resize(width, height);
      const dpi = PaintCanvas.getScreenDPI();
      if (this._orientation == Orientation.Horizontal) width = window.screen.availWidth;
      const canvas = this._canvas as HTMLCanvasElement;
      canvas.width = width * dpi;
      canvas.height = height * dpi;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      if (this._orientation === Orientation.Vertical) this._verticalWidth = width;
      this._paint();
    }
  }

  _paint(): void {
    if (!this.isDisplayed()) return;
    const dpi = PaintCanvas.getScreenDPI();
    const width = this.getWidth() * dpi;
    const height = this.getHeight() * dpi;
    const context = this._context as CanvasRenderingContext2D;
    const color = window.getComputedStyle(this._htmlElement, null).getPropertyValue("color");
    context.clearRect(0, 0, width, height);
    context.fillStyle = color;
    context.strokeStyle = color;
    context.lineWidth = 1;
    const fontSize = 9 * dpi;
    context.font = fontSize + "px Verdana";
    context.save();
    if (this._orientation === Orientation.Vertical) {
      context.translate(width, 0);
      context.rotate((Math.PI / 180) * 90);
    }
    context.beginPath();
    let tickTop: number;
    const longTickTop = fontSize;
    const shortTickTop = (19 * dpi) / 1.5;
    const length = this._orientation === Orientation.Vertical ? height : width;
    const inverseScale = 1 / this._scale;
    const unitInPoints = new Length(1, this._scene.getProperty("ut") as string).toPoint();
    let fraction = 1;
    let decimals = 0;
    let fractional = false;
    // Distance between labels in units: about 50 screen pixels.
    let labelStep = (50 * inverseScale) / unitInPoints;
    if (unitInPoints > 1) {
      while (0 == Math.round(labelStep) && fraction < 10 * unitInPoints) {
        fraction *= 10;
        decimals += 1;
        labelStep *= 10;
        fractional = true;
      }
    }
    let tickStep: number;
    if ((labelStep = Math.round(labelStep)) <= 1) {
      labelStep = 1;
      tickStep = 0.1;
    } else if (labelStep > 1 && labelStep <= 2) {
      labelStep = 2;
      tickStep = 0.2;
    } else if (labelStep > 2 && labelStep <= 5) {
      labelStep = 5;
      tickStep = 0.5;
    } else if (labelStep > 5 && labelStep <= 10) {
      labelStep = 10;
      tickStep = 1;
    } else if (labelStep > 10 && labelStep % 10 != 0) {
      labelStep = 10 * (tickStep = Math.round(labelStep / 10));
    } else tickStep = Math.round(labelStep / 10);
    if (fractional) {
      labelStep /= fraction;
      tickStep /= fraction;
    }
    const start = (-this._offset * inverseScale) / unitInPoints;
    const firstTick = Math.ceil(start / tickStep) * tickStep;
    const firstLabel = Math.ceil(start / labelStep) * labelStep;
    const end = ((length - this._offset) * inverseScale) / unitInPoints;
    let label: string;
    for (let value = firstTick, counter = -9; value < end; value += tickStep, ++counter) {
      const position = Math.round((value / inverseScale) * unitInPoints) + this._offset;
      if (GMath.isEqualEps(value, firstLabel, 0.01 / fraction)) counter = Math.floor(10 * dpi);
      if (counter % Math.floor(10 * dpi) == 0) {
        label = String(GMath.round(value, false, fractional ? decimals : 0));
        tickTop = longTickTop;
      } else {
        label = "";
        tickTop = shortTickTop;
      }
      context.moveTo(position + 0.5, 19.5 * dpi);
      context.lineTo(position + 0.5, tickTop + 0.5);
      const labelWidth = context.measureText(label).width;
      context.fillText(label, Math.ceil(position - labelWidth / 2), fontSize - dpi);
    }
    context.stroke();
    context.restore();
  }

  _afterPropertiesChangeEvent(event: AfterPropertiesChangeEvent): void {
    if (
      !event.temporary &&
      event.node === this._scene &&
      (event.properties as string[]).indexOf("ut") >= 0
    ) {
      if (this._isUnitRuler) this._updateUnitRuler();
      else this._paint();
    }
  }

  _createUnitRuler(configuration: UnitRulerConfiguration): void {
    this._htmlElement.style.width = "19px";
    this._htmlElement.style.height = "19px";
    this._htmlElement.style.display = "flex";
    this._htmlElement.style.justifyContent = configuration.rulerLeftFill ? "flex-end" : "center";
  }

  /**
   * Shows the unit's name. The configuration is only read when the label
   * is first made, which happens in the constructor; later calls pass none.
   */
  _updateUnitRuler(configuration?: UnitRulerConfiguration): void {
    if (!this._htmlElement.firstChild) {
      const span = document.createElement("span");
      span.style.font = "9px Verdana";
      span.style.alignSelf = "center";
      if ((configuration as UnitRulerConfiguration).rulerLeftFill) span.style.marginRight = "5px";
      span.style.color = window.getComputedStyle(this._htmlElement, null).getPropertyValue("color");
      this._htmlElement.appendChild(span);
    }
    (this._htmlElement.firstChild as HTMLElement).innerHTML = this._scene.getProperty(
      "ut",
    ) as string;
  }

  override toString(): string {
    return "[Object GRulerWidget]";
  }
}
