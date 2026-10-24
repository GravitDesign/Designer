// Old: designer.browser.dev.js module 1309 (GSelectByEffectAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { SelectByAction } from "./select-by-action.ts";
import type { StylableLike } from "./select-by-paint-layer-action.ts";

/** Select Same > Effects: the list of effects (compared deeply). */
export class SelectByEffectAction extends SelectByAction {
  static ID = "edit.select-by-effect";
  static TITLE = new LocaleKey("GSelectByEffectAction", "title");

  constructor() {
    super(SelectByEffectAction.ID, SelectByEffectAction.TITLE);
  }

  override getGroup(): string {
    return "edit/select-by-style";
  }

  protected override _getValue(node: Node): unknown {
    if (!node.hasMixin(Stylable)) return SelectByAction.EmptyValue;
    const effects = (node as unknown as StylableLike).getEffects();
    return effects ? effects.getChildren() : [];
  }

  override toString(): string {
    return "[Object GSelectByEffectAction]";
  }
}
