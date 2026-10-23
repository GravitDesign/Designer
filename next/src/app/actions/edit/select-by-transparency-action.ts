// Old: designer.browser.dev.js module 1306 (GSelectByTransparencyAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Node } from "../../../engine/scene/node.ts";
import { props } from "../host.ts";
import { SelectByAction } from "./select-by-action.ts";

/** Select Same > Opacity: the element opacity (_stop). */
export class SelectByTransparencyAction extends SelectByAction {
  static ID = "edit.select-by-transparency";
  static TITLE = new LocaleKey("GSelectByTransparencyAction", "title");

  constructor() {
    super(SelectByTransparencyAction.ID, SelectByTransparencyAction.TITLE);
  }

  override getGroup(): string {
    return "edit/select-by-style";
  }

  protected override _getValue(node: Node): unknown {
    return node.hasMixin(Node.Properties)
      ? props(node).getProperty("_stop")
      : SelectByAction.EmptyValue;
  }

  override toString(): string {
    return "[Object GSelectByTransparencyAction]";
  }
}
