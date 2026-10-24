// Old: chunk.vendor.js module 794 (model/sketchshape).
import type { AsyncExecutor } from "../../../engine/core/async-executor.ts";
import { Event } from "../../../engine/core/event.ts";
import { registerClass } from "../../../engine/core/object.ts";
import { PaintCanvas } from "../../../engine/paint/paint-canvas.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { getClassFromName } from "./class-registry.ts";
import { SketchBlurEffect } from "./effects/sketch-blur-effect.ts";
import { SketchColorAdjustEffect } from "./effects/sketch-color-adjust-effect.ts";
import type { SketchEffect } from "./effects/sketch-effect.ts";
import { SketchDropShadowEffect } from "./effects/sketch-drop-shadow-effect.ts";
import { SketchInnerShadowEffect } from "./effects/sketch-inner-shadow-effect.ts";
import type { SketchShapeGroup } from "./sketch-shape-group.ts";
import { SketchNode } from "./sketch-node.ts";

const Process = {
  AfterParse: 2,
  ParentAttached: 3,
};

/** Sent to the file after a shape is parsed and after it is appended (drives the progress). */
export class SketchProcessEvent extends Event {
  static {
    registerClass(this, "GSketchShape.ProcessEvent");
  }

  type: number | null;
  source: SketchShape | null;

  constructor(type: number, source: SketchShape) {
    super();
    this.type = type;
    this.source = source;
  }
}

/**
 * A layer with a scene node that takes the layer's visibility, lock,
 * name, blend mode, opacity and effects.
 */
export class SketchShape extends SketchNode {
  static Process = Process;
  static ProcessEvent = SketchProcessEvent;

  /** Sketch's blend mode numbers. */
  static BlendMode: string[] = [
    PaintCanvas.BlendMode.Normal,
    PaintCanvas.BlendMode.Darken,
    PaintCanvas.BlendMode.Multiply,
    PaintCanvas.BlendMode.ColorBurn,
    PaintCanvas.BlendMode.Lighten,
    PaintCanvas.BlendMode.Screen,
    PaintCanvas.BlendMode.ColorDodge,
    PaintCanvas.BlendMode.Overlay,
    PaintCanvas.BlendMode.SoftLight,
    PaintCanvas.BlendMode.HardLight,
    PaintCanvas.BlendMode.Difference,
    PaintCanvas.BlendMode.Exclusion,
    PaintCanvas.BlendMode.Hue,
    PaintCanvas.BlendMode.Saturation,
    PaintCanvas.BlendMode.Color,
    PaintCanvas.BlendMode.Luminosity,
  ];

  override parse(flag?: unknown, executor?: AsyncExecutor | null): void {
    if (!this._node) return;
    super.parse(flag, executor);
    const ShapeGroup = getClassFromName<typeof SketchShapeGroup>("shapeGroup");
    // Layers under a clipping shape group keep the node's visibility.
    if (!(
      this._parent &&
      ShapeGroup &&
      this._parent instanceof ShapeGroup &&
      this._parent.hasClippingMask()
    ))
      this._node.setProperty("vis", this._data.isVisible);
    this._node.setProperty("lkt", this._data.isLocked);
    this._node.setProperty("name", this._data.name);
    const style = this._data.style;
    if (style) {
      if (this._node.hasMixin(Stylable) && style.contextSettings) {
        this._node.setProperty(
          "_sbl",
          undefined !== style.contextSettings.blendMode
            ? SketchShape.BlendMode[style.contextSettings.blendMode]
            : PaintCanvas.BlendMode.Normal,
        );
        this._node.setProperty(
          "_stop",
          undefined !== style.contextSettings.opacity ? style.contextSettings.opacity : 1,
        );
      }
      // Each effect is parsed before it is applied; the old importer never
      // called parse(), so only a background blur's fill layer arrived
      // ("Sketch layer effects are dropped" in BUGS-FIXED.md).
      const apply = (effect: SketchEffect): void => {
        effect.parse();
        effect.applyTo(this._node);
      };
      if (style.colorControls) apply(new SketchColorAdjustEffect(style.colorControls));
      if (style.blur) apply(new SketchBlurEffect(style.blur));
      if (style.innerShadows)
        style.innerShadows.forEach((shadow) => {
          apply(new SketchInnerShadowEffect(shadow));
        });
      if (style.shadows)
        style.shadows.forEach((shadow) => {
          apply(new SketchDropShadowEffect(shadow));
        });
    }
    this._sendEvent(new SketchProcessEvent(Process.AfterParse, this));
  }

  override _postAppendTo(): void {
    super._postAppendTo();
    this._sendEvent(new SketchProcessEvent(Process.ParentAttached, this));
  }

  _sendEvent(event: SketchProcessEvent): void {
    const eventClass = event.constructor as typeof SketchProcessEvent;
    if (
      this._file &&
      this._file.canEventBeSent(eventClass) &&
      this._file.hasEventListeners(eventClass)
    )
      this._file.trigger(event);
  }
}
