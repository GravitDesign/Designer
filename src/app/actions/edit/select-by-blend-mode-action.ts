// Old: designer.browser.dev.js module 1307 (GSelectByBlendModeAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Node } from "../../../engine/scene/node.ts";
import { props } from "../host.ts";
import { SelectByAction } from "./select-by-action.ts";

/** Select Same > Blend Mode: the element blend mode (_sbl). */
export class SelectByBlendModeAction extends SelectByAction {
  static ID = "edit.select-by-blend-mode";
  static TITLE = new LocaleKey("GSelectByBlendModeAction", "title");

  constructor() {
    super(SelectByBlendModeAction.ID, SelectByBlendModeAction.TITLE);
  }

  override getGroup(): string {
    return "edit/select-by-style";
  }

  protected override _getValue(node: Node): unknown {
    return node.hasMixin(Node.Properties)
      ? props(node).getProperty("_sbl")
      : SelectByAction.EmptyValue;
  }

  override toString(): string {
    return "[Object GSelectByBlendModeAction]";
  }
}
