// Old: designer.browser.dev.js module 1308 (GSelectByShapeAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { SelectByAction } from "./select-by-action.ts";

/** Select Same > Shape: the node name (rectangle, ellipse, path, ...). */
export class SelectByShapeAction extends SelectByAction {
  static ID = "edit.select-by-shape";
  static TITLE = new LocaleKey("GSelectByShapeAction", "title");

  constructor() {
    super(SelectByShapeAction.ID, SelectByShapeAction.TITLE);
  }

  override getGroup(): string {
    return "edit/select-by-style";
  }

  protected override _getValue(node: Node): unknown {
    return node.getNodeName();
  }

  override toString(): string {
    return "[Object GSelectByShapeAction]";
  }
}
