// Old: designer.browser.dev.js module 1652 (GSwapPaintLayersAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Ellipse } from "../../../engine/scene/ellipse.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Path } from "../../../engine/scene/path.ts";
import { Shape } from "../../../engine/scene/shape.ts";
import { BorderPaintLayer } from "../../../engine/style/border-paint-layer.ts";
import { FillPaintLayer } from "../../../engine/style/fill-paint-layer.ts";
import type { PaintLayer } from "../../../engine/style/paint-layer.ts";
import type { PaintLayers } from "../../../engine/style/paint-layers.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { Text } from "../../../engine/text/text.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { gDesigner } from "../host.ts";

const Type = { Fill: "fill", Border: "border" } as const;
type LayerType = (typeof Type)[keyof typeof Type];

/** The properties a swapped layer keeps: pattern, opacity, visibility, blend mode. */
const SWAPPED_PROPERTIES = ["_pt", "_op", "_vs", "_bl"];

/**
 * Shift+X (shortcut only): fills become borders and borders fills, keeping
 * pattern, opacity, visibility and blend mode. The new borders get the
 * alignment that suits the shape (outside for text, inside for closed
 * shapes, centred for arcs and open paths). Borders come first in the new
 * layer list.
 */
export class SwapPaintLayersAction extends Action {
  static ID = "modify.swap-paint-layers";
  static TITLE = new LocaleKey("GSwapPaintLayersAction", "title");
  static Type = Type;

  override getId(): string {
    return SwapPaintLayersAction.ID;
  }

  override getTitle(): LocaleKey {
    return SwapPaintLayersAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY;
  }

  override isVisible(): boolean {
    return false;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.X];
  }

  override isEnabled(): boolean {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument && designerDocument.getEditor();
    const selection = editor && (editor.getSelection() as Node[] | null);
    return !!(selection && selection.find((node) => node.hasMixin(Stylable)));
  }

  override execute(): void {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument && designerDocument.getEditor();
    const selection = editor && (editor.getSelection() as Node[] | null);
    if (selection && editor) {
      editor.beginTransaction();
      try {
        selection.forEach((node) => {
          if (node.hasMixin(Stylable)) {
            const layers = (
              node as unknown as { getPaintLayers(): PaintLayers | null }
            ).getPaintLayers();
            if (layers) {
              const borders = this._createPaintLayers(Type.Border, layers);
              const fills = this._createPaintLayers(Type.Fill, layers);
              borders.forEach((border) => {
                this._setBorderAlignment(node, border);
              });
              layers.clearLayers();
              (borders as PaintLayer[]).concat(fills).forEach((layer) => {
                layers.appendChild(layer);
              });
            }
          }
        });
      } finally {
        editor.commitTransaction(Locale.get(this.getTitle()) as string);
      }
    }
  }

  /** New layers of `type` made from the layers of the other type. */
  private _createPaintLayers(type: LayerType, layers: PaintLayers): PaintLayer[] {
    switch (type) {
      case Type.Fill:
        return layers.getBorderLayers().map((layer) => {
          const values = layer.getProperties(SWAPPED_PROPERTIES) as ConstructorParameters<
            typeof FillPaintLayer
          >;
          return new FillPaintLayer(...values);
        });
      case Type.Border:
        return layers.getFillLayers().map((layer) => {
          const values = layer.getProperties(SWAPPED_PROPERTIES) as ConstructorParameters<
            typeof BorderPaintLayer
          >;
          return new BorderPaintLayer(...values);
        });
      default:
        throw Error("Not specified type given");
    }
  }

  private _setBorderAlignment(node: Node, border: PaintLayer): void {
    if (node instanceof Text) border.setProperty("_ba", Stylable.BorderAlignment.Outside);
    else if (node instanceof Shape) {
      if (node instanceof Ellipse && node.$etp === Ellipse.Type.Arc) {
        border.setProperty("_ba", Stylable.BorderAlignment.Center);
      } else border.setProperty("_ba", Stylable.BorderAlignment.Inside);
    } else if (node instanceof Path && !node.$closed) {
      border.setProperty("_ba", Stylable.BorderAlignment.Center);
    }
  }

  override toString(): string {
    return "[Object GSwapPaintLayersAction]";
  }
}
