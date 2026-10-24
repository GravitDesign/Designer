// Old: designer.browser.dev.js module 1304 (GSelectByPaintLayerAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Node } from "../../../engine/scene/node.ts";
import type { Effects } from "../../../engine/style/effects.ts";
import type { PaintLayers } from "../../../engine/style/paint-layers.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { SelectByAction } from "./select-by-action.ts";

/** A node with the style mixin, as the Select Same actions read it. */
export interface StylableLike {
  getPaintLayers(): PaintLayers | null;
  getEffects(): Effects | null;
}

const Type = {
  Fill: "fill",
  Border: "border",
  FillAndBorder: "fill_border",
} as const;

type PaintLayerType = (typeof Type)[keyof typeof Type];

/** Select Same > Fill, Border, or Fill and Border: the patterns of the visible layers. */
export class SelectByPaintLayerAction extends SelectByAction {
  static ID = "edit.select-by-paintlayer";
  static Type = Type;

  static getId(type: string): string {
    return "".concat(SelectByPaintLayerAction.ID, ".").concat(type);
  }

  static getTitle(type: string): LocaleKey {
    return new LocaleKey("GSelectByPaintLayerAction", "title.".concat(type));
  }

  private readonly _type: PaintLayerType;

  constructor(type: PaintLayerType) {
    super(SelectByPaintLayerAction.getId(type), SelectByPaintLayerAction.getTitle(type));
    this._type = type;
  }

  override getGroup(): string {
    return "edit/select-by-paintlayer";
  }

  protected override _getValue(node: Node): unknown {
    switch (this._type) {
      case Type.Fill:
        return this._getFillPatterns(node);
      case Type.Border:
        return this._getBorderPatterns(node);
      case Type.FillAndBorder: {
        const fills = this._getFillPatterns(node);
        const borders = this._getBorderPatterns(node);
        return fills === SelectByAction.EmptyValue || borders === SelectByAction.EmptyValue
          ? SelectByAction.EmptyValue
          : { fills, borders };
      }
      default:
        return SelectByAction.EmptyValue;
    }
  }

  private _getFillPatterns(node: Node): unknown {
    if (node.hasMixin(Stylable)) {
      const layers = (node as unknown as StylableLike).getPaintLayers();
      const fills = layers && layers.getFillLayers(true);
      if (fills && fills.length > 0) return fills.map((layer) => layer.getProperty("_pt"));
    }
    return SelectByAction.EmptyValue;
  }

  private _getBorderPatterns(node: Node): unknown {
    if (node.hasMixin(Stylable)) {
      const layers = (node as unknown as StylableLike).getPaintLayers();
      const borders = layers && layers.getBorderLayers(true);
      if (borders && borders.length) return borders.map((layer) => layer.getProperty("_pt"));
    }
    return SelectByAction.EmptyValue;
  }

  override toString(): string {
    return "[Object GSelectByPaintLayerAction]";
  }
}
