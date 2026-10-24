// Old: chunk.vendor.js module 561 (sketchclasses) with designer module 1400,
// the webpack context that resolved its file names to modules.
import { SketchBlurEffect } from "./effects/sketch-blur-effect.ts";
import { SketchColorAdjustEffect } from "./effects/sketch-color-adjust-effect.ts";
import { SketchDropShadowEffect } from "./effects/sketch-drop-shadow-effect.ts";
import { SketchEffect } from "./effects/sketch-effect.ts";
import { SketchInnerShadowEffect } from "./effects/sketch-inner-shadow-effect.ts";
import { registerSketchClass } from "./class-registry.ts";
import { SketchAngularGradient } from "./sketch-angular-gradient.ts";
import { SketchArtboard } from "./sketch-artboard.ts";
import { SketchBase } from "./sketch-base.ts";
import { SketchBitmap } from "./sketch-bitmap.ts";
import { SketchColor } from "./sketch-color.ts";
import { SketchDocument } from "./sketch-document.ts";
import { SketchElement } from "./sketch-element.ts";
import { SketchGradient } from "./sketch-gradient.ts";
import { SketchGroup } from "./sketch-group.ts";
import { SketchLinearGradient } from "./sketch-linear-gradient.ts";
import { SketchNode } from "./sketch-node.ts";
import { SketchNoisePattern } from "./sketch-noise-pattern.ts";
import { SketchOval } from "./sketch-oval.ts";
import { SketchPage } from "./sketch-page.ts";
import { SketchPattern } from "./sketch-pattern.ts";
import { SketchPolygon } from "./sketch-polygon.ts";
import { SketchRadialGradient } from "./sketch-radial-gradient.ts";
import { SketchRectangle } from "./sketch-rectangle.ts";
import { SketchShape } from "./sketch-shape.ts";
import { SketchShapeGroup } from "./sketch-shape-group.ts";
import { SketchShapePath } from "./sketch-shape-path.ts";
import { SketchStar } from "./sketch-star.ts";
import { SketchSymbolInstance } from "./sketch-symbol-instance.ts";
import { SketchSymbolMaster } from "./sketch-symbol-master.ts";
import { SketchText } from "./sketch-text.ts";
import { SketchTexturePattern } from "./sketch-texture-pattern.ts";
import { SketchTriangle } from "./sketch-triangle.ts";

/**
 * Every class of the old sketch folder under its file path, in the old
 * order. A layer's `_class` is looked up by the name after "sketch", so
 * this also accepts layer classes like "color" or "effect" that Sketch
 * never writes.
 */
const CLASSES: [string, abstract new (...args: never[]) => unknown][] = [
  ["sketchDocument", SketchDocument],
  ["effects/sketchBlurEffect", SketchBlurEffect],
  ["effects/sketchColorAdjustEffect", SketchColorAdjustEffect],
  ["effects/sketchDropShadowEffect", SketchDropShadowEffect],
  ["effects/sketchEffect", SketchEffect],
  ["effects/sketchInnerShadowEffect", SketchInnerShadowEffect],
  ["model/sketchBase", SketchBase],
  ["model/sketchElement", SketchElement],
  ["model/sketchGroup", SketchGroup],
  ["model/sketchNode", SketchNode],
  ["model/sketchShape", SketchShape],
  ["model/sketchShapeGroup", SketchShapeGroup],
  ["model/sketchSymbolInstance", SketchSymbolInstance],
  ["model/sketchSymbolMaster", SketchSymbolMaster],
  ["model/item/sketchArtboard", SketchArtboard],
  ["model/item/sketchBitmap", SketchBitmap],
  ["model/item/sketchOval", SketchOval],
  ["model/item/sketchPage", SketchPage],
  ["model/item/sketchPolygon", SketchPolygon],
  ["model/item/sketchRectangle", SketchRectangle],
  ["model/item/sketchShapePath", SketchShapePath],
  ["model/item/sketchStar", SketchStar],
  ["model/item/sketchText", SketchText],
  ["model/item/sketchTriangle", SketchTriangle],
  ["pattern/sketchAngularGradient", SketchAngularGradient],
  ["pattern/sketchColor", SketchColor],
  ["pattern/sketchGradient", SketchGradient],
  ["pattern/sketchLinearGradient", SketchLinearGradient],
  ["pattern/sketchNoisePattern", SketchNoisePattern],
  ["pattern/sketchPattern", SketchPattern],
  ["pattern/sketchRadialGradient", SketchRadialGradient],
  ["pattern/sketchTexturePattern", SketchTexturePattern],
];

for (const [path, cls] of CLASSES) registerSketchClass(path, cls);
