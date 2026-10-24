// Old: chunk.vendor.js module 439 (model/sketchelement).
import type { AsyncExecutor } from "../../../engine/core/async-executor.ts";
import { PaintCanvas } from "../../../engine/paint/paint-canvas.ts";
import { Element } from "../../../engine/scene/element.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { getClassFromName } from "./class-registry.ts";
import { sceneNode, type SceneNodeLike } from "./scene-node.ts";
import { SketchAngularGradient } from "./sketch-angular-gradient.ts";
import { SketchColor } from "./sketch-color.ts";
import type { SketchColorData, SketchFillData } from "./sketch-data.ts";
import { SketchLinearGradient } from "./sketch-linear-gradient.ts";
import { SketchNoisePattern } from "./sketch-noise-pattern.ts";
import type { SketchPattern } from "./sketch-pattern.ts";
import { SketchRadialGradient } from "./sketch-radial-gradient.ts";
import type { SketchShapeGroup } from "./sketch-shape-group.ts";
import { SketchShape } from "./sketch-shape.ts";
import { SketchTexturePattern } from "./sketch-texture-pattern.ts";

/** Sketch's fillType values. */
const FillType = {
  Color: 0,
  Gradient: 1,
  Image: 4,
  Noise: 5,
};

/**
 * Sketch's border position (0 center, 1 inside, 2 outside) as alignments,
 * read from each border; a border without one is Inside. The old importer
 * read the style's position, which Sketch never writes, so every border
 * was Inside ("Sketch borders always import as Inside" in BUGS-FIXED.md).
 */
const BORDER_ALIGNMENTS = [
  Stylable.BorderAlignment.Center,
  Stylable.BorderAlignment.Inside,
  Stylable.BorderAlignment.Outside,
];

/** Sketch's gradientType: 0 linear, 1 radial, 2 angular. */
const GRADIENTS = [SketchLinearGradient, SketchRadialGradient, SketchAngularGradient];

/**
 * A layer whose node has paint: borders and fills from the style (or the
 * background colour), and its frame as bounds and transform.
 */
export class SketchElement extends SketchShape {
  override parse(flag?: unknown, executor?: AsyncExecutor | null): void {
    if (!this._node) return;
    super.parse(flag, executor);
    const data = this._data;
    const node = this._node;
    if ((node.hasMixin(Stylable) && data.style) || data.hasBackgroundColor) {
      const style = data.style as NonNullable<typeof data.style>;
      if (style.borders)
        style.borders.forEach((border) => {
          const layer = sceneNode(new Stylable.BorderPaintLayer());
          layer.setProperty("_bw", border.thickness);
          layer.setProperty("_bml", style.miterLimit);
          const position = undefined !== border.position ? border.position : 1;
          layer.setProperty("_ba", BORDER_ALIGNMENTS[position] ?? Stylable.BorderAlignment.Inside);
          this._parsePaintLayer(border, layer);
          (node.getPaintLayers() as SceneNodeLike).appendChild(layer);
        });
      const addFill = (fill: SketchFillData): void => {
        const layer = sceneNode(new Stylable.FillPaintLayer());
        this._parsePaintLayer(fill, layer);
        (node.getPaintLayers() as SceneNodeLike).appendChild(layer);
      };
      if (style.fills) style.fills.forEach(addFill);
      if (data.hasBackgroundColor) {
        (
          node.getPaintLayers() as NonNullable<ReturnType<SceneNodeLike["getPaintLayers"]>>
        ).clearFillLayers();
        addFill({ color: data.backgroundColor, fillType: FillType.Color, isEnabled: true });
      }
      const ShapeGroup = getClassFromName<typeof SketchShapeGroup>("shapeGroup");
      // A hidden layer under a clipping shape group hides its paint instead.
      if (
        !this._data.isVisible &&
        this._parent &&
        ShapeGroup &&
        this._parent instanceof ShapeGroup &&
        this._parent.hasClippingMask()
      ) {
        const layers = this._node.getPaintLayers();
        if (layers)
          layers.getLayers().forEach((layer) => {
            layer.setProperty("_vs", false);
          });
      }
    }
  }

  /** Bounds and transform from the frame, unless the caller or the data says the node has them. */
  override _postParse(flag?: unknown): void {
    super._postParse(flag);
    if (this._node.hasMixin(Element.Transform) && !flag && !this._data.noTransform) {
      this.setBounds(this._getGeometryBBox());
      this.transform(this._getTransformation());
    }
  }

  _parsePaintLayer(fill: SketchFillData, layer: SceneNodeLike): void {
    let pattern: SketchPattern | undefined;
    layer.setProperty("_vs", fill.isEnabled);
    if (fill.contextSettings) {
      layer.setProperty(
        "_bl",
        undefined !== fill.contextSettings.blendMode
          ? SketchShape.BlendMode[fill.contextSettings.blendMode]
          : PaintCanvas.BlendMode.Normal,
      );
      layer.setProperty(
        "_op",
        undefined !== fill.contextSettings.opacity ? fill.contextSettings.opacity : 1,
      );
    }
    switch (fill.fillType) {
      case FillType.Color:
        pattern = new SketchColor(fill.color as SketchColorData, this._file);
        break;
      case FillType.Gradient: {
        const gradient = fill.gradient as NonNullable<SketchFillData["gradient"]>;
        const Gradient = GRADIENTS[gradient.gradientType];
        if (Gradient) pattern = new Gradient(gradient, this._file);
        else console.warn("Unsupported gradient type: " + gradient.gradientType);
        break;
      }
      case FillType.Image:
        pattern = new SketchTexturePattern(fill, this._file);
        break;
      case FillType.Noise:
        pattern = new SketchNoisePattern(fill, this._file);
        break;
      default:
        console.warn("Unsupported fill type: " + fill.fillType);
    }
    if (pattern) pattern.applyTo(layer);
  }
}
