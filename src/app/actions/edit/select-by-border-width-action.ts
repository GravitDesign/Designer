// Old: designer.browser.dev.js module 1305 (GSelectByBorderWidthAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { SelectByAction } from "./select-by-action.ts";
import type { StylableLike } from "./select-by-paint-layer-action.ts";

/** Select Same > Border Width: the widths of the visible borders, in order. */
export class SelectByBorderWidthAction extends SelectByAction {
  static ID = "edit.select-by-border-width";
  static TITLE = new LocaleKey("GSelectByBorderWidthAction", "title");

  constructor() {
    super(SelectByBorderWidthAction.ID, SelectByBorderWidthAction.TITLE);
  }

  override getGroup(): string {
    return "edit/select-by-style";
  }

  protected override _getValue(node: Node): unknown {
    if (node.hasMixin(Stylable)) {
      const layers = (node as unknown as StylableLike).getPaintLayers();
      const borders = layers && layers.getBorderLayers(true);
      if (borders && borders.length > 0) return borders.map((layer) => layer.getProperty("_bw"));
    }
    return SelectByAction.EmptyValue;
  }

  override toString(): string {
    return "[Object GSelectByBorderWidthAction]";
  }
}
