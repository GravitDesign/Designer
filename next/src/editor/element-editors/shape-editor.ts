// Old: chunk.vendor.js module 128 (GShapeEditor).
/**
 * The editor of a shape: a new shape gets the scene's default style for
 * its class (initialSetup), a pattern dropped on it becomes its only fill
 * or border, and in detail mode a centre cross marks its centre.
 */
import { registerClass, getTypeId } from "../../engine/core/object.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import type { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Connector } from "../../engine/scene/connector.ts";
import { Image } from "../../engine/scene/image.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { Pattern } from "../../engine/style/pattern.ts";
import { PropertySet, PropertySetInfo } from "../../engine/style/stylable-sets.ts";
import { Text } from "../../engine/text/text.ts";
import { EditorOptions } from "../editor-options.ts";
import { BaseEditor, type EditorHost, type EditorPaintContext } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { ItemEditor, type EditedItem } from "./item-editor.ts";

/** A shape as the shape editor drives it. */
export type EditedShape = EditedItem & {
  getPaintLayers(): PaintLayers;
  getEffects(): (Node & { getFirstChild(): Node | null }) | null;
  getOrigHalfWidth(): number;
  getOrigHalfHeight(): number;
};

/** A style node (`style` in the scene's styles) as initialSetup reads it. */
interface StyleSource {
  getProperty(name: string): unknown;
  getPaintLayers(): PaintLayers | null;
  getEffects(): { getFirstChild(): Node | null } | null;
}

interface StylesHost {
  getStyles(): { querySingle(selector: string): StyleSource | null };
}

export class ShapeEditor<E extends EditedShape = EditedShape> extends ItemEditor<E> {
  static {
    registerClass(this, "GShapeEditor");
  }

  /**
   * Gives a new shape its style: `source` when it is a shape the new one
   * may copy (not an image, a connector only from a connector, text only
   * from text), else the scene's default style for the class. Copies the
   * style's geometry and visual properties, paint layers and effects.
   */
  override initialSetup(source?: unknown): void {
    let style: StyleSource | null = this.getDefaultStyle();
    if (!(
      !(source && source instanceof Shape) ||
      source instanceof Image ||
      (this.getElement() instanceof Connector && !(source instanceof Connector)) ||
      (!(this.getElement() instanceof Text) && source instanceof Text)
    )) {
      style = source as unknown as StyleSource;
    }
    if (style) {
      const element = this.getElement();
      const names: string[] = [];
      const values: unknown[] = [];
      const sets = (style.getProperty("ps") as string[] | null) || [PropertySet.Style];
      const groups = ["geometryProperties", "visualProperties"] as const;
      for (let i = 0; i < sets.length; i++) {
        const info = PropertySetInfo[sets[i] as string] as unknown as Record<
          string,
          Record<string, unknown> | undefined
        >;
        for (let j = 0; j < groups.length; j++) {
          const properties = info[groups[j] as string];
          if (properties) {
            for (const name in properties) {
              names.push(name);
              values.push(style.getProperty(name));
            }
          }
        }
      }
      element.setProperties(names, values);
      const layers = style.getPaintLayers();
      if (layers) {
        for (let layer = layers.getFirstChild(); layer; layer = layer.getNext()) {
          const copy =
            layer instanceof BorderPaintLayer ? new BorderPaintLayer() : new FillPaintLayer();
          copy.assignFrom(layer);
          element.getPaintLayers().appendChild(copy);
        }
      }
      const effects = style.getEffects();
      if (effects) {
        for (let effect = effects.getFirstChild(); effect; effect = effect.getNext()) {
          (element.getEffects() as unknown as { appendChild(node: Node): void }).appendChild(
            (effect as Node & { clone(): Node }).clone(),
          );
        }
      }
    }
  }

  /** A pattern dropped on the stroke replaces the borders, elsewhere the fills. */
  override acceptDrop(position: unknown, type: unknown, source: unknown, hit: unknown): boolean {
    if (ElementEditor.prototype.acceptDrop.call(this, position, type, source, hit)) return true;
    if (source instanceof Pattern && hit instanceof Shape.HitResult) {
      const editor = BaseEditor.getEditor(this.getElement().getScene()) as EditorHost;
      editor.beginTransaction();
      try {
        switch (hit.type) {
          case Shape.HitResult.Type.Stroke:
            this.getElement().getPaintLayers().clearBorderLayers();
            this.getElement().getPaintLayers().appendChild(new BorderPaintLayer(source));
            break;
          default:
            this.getElement().getPaintLayers().clearFillLayers();
            this.getElement().getPaintLayers().appendChild(new FillPaintLayer(source));
        }
      } finally {
        editor.commitTransaction(Locale.get(new LocaleKey("GShapeEditor", "action.drop-pattern")));
      }
      return true;
    }
    return false;
  }

  /** The scene's default style for the element's class, else for shapes. */
  getDefaultStyle(): StyleSource | null {
    const element = this.getElement();
    const typeId = getTypeId(element);
    const scene = element.getScene() as unknown as StylesHost | null;
    let style = scene ? scene.getStyles().querySingle('style[_sdf="' + typeId + '"]') : null;
    if (!style) {
      style = scene
        ? scene.getStyles().querySingle('style[_sdf="' + getTypeId(Shape) + '"]')
        : null;
    }
    return style;
  }

  _hasCenterCross(): boolean {
    return false;
  }

  override _postPaint(transform: Transform, context: EditorPaintContext): void {
    if (
      this.hasFlag(BaseEditor.Flag.Selected) &&
      this.hasFlag(BaseEditor.Flag.Detail) &&
      this._hasCenterCross() &&
      EditorOptions.centerCrossSize > 0
    ) {
      const element = this.getPaintElement();
      const own = element.getTransform();
      let matrix = own || new Transform(1, 0, 0, 1, 0, 0);
      matrix = transform ? matrix.multiplied(transform) : matrix;
      let center: Point | null = element.getCenter(false);
      if (center) {
        center = matrix.mapPoint(center);
        const minimum = 2 * EditorOptions.centerCrossSize;
        const values = matrix.getMatrix();
        // Only when the shape is more than twice the cross wide and high.
        if (
          Math.abs(values[0] as number) * element.getOrigHalfWidth() > minimum &&
          Math.abs(values[3] as number) * element.getOrigHalfHeight() > minimum
        ) {
          let x = Math.floor(center.getX()) + 0.5;
          let y = Math.floor(center.getY()) + 0.5;
          if (EditorOptions.outlineWidth % 2 != 0) {
            x += 0.5;
            y += 0.5;
          }
          const half = EditorOptions.centerCrossSize / 2;
          const canvas = context.canvas as NonNullable<EditorPaintContext["canvas"]>;
          canvas.strokeLine(
            x - half,
            y - half,
            x + half,
            y + half,
            EditorOptions.outlineWidth,
            context.selectionOutlineColor,
          );
          canvas.strokeLine(
            x + half,
            y - half,
            x - half,
            y + half,
            EditorOptions.outlineWidth,
            context.selectionOutlineColor,
          );
        }
      }
    }
    super._postPaint(transform, context);
  }

  /** The transform from the element to its preview. */
  override _getTransformFromPreview(): Transform | null {
    let transform: Transform | null = null;
    if (this._elementPreview) {
      const own = this._element.getTransform();
      const preview = this._elementPreview.getTransform();
      transform = own && !own.isIdentity() ? own.inverted() : null;
      if (preview && !preview.isIdentity()) {
        transform = transform ? transform.multiplied(preview) : preview;
      }
    }
    return transform;
  }

  override toString(): string {
    return "[Object GShapeEditor]";
  }
}
