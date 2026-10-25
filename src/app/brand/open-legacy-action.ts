/**
 * Help > Open the Old Gravit Designer: opens legacy.gravitdesign.com, where
 * the old app still runs. Registered only in the "next" look
 * (brand-actions.ts), like Help > About GravitDesign Next.
 */
import { Action } from "../actions/action.ts";
import { Category } from "../actions/category.ts";
import { gContainer } from "../actions/host.ts";
import { brandString } from "./brand-strings.ts";
import { LEGACY_URL } from "./branding.ts";

export class OpenLegacyAction extends Action {
  static ID = "help.open-legacy";

  override getId(): string {
    return OpenLegacyAction.ID;
  }

  override getTitle(): string {
    return brandString("menu.legacy");
  }

  override getCategory(): Category {
    return Category.CATEGORY_HELP;
  }

  /** Right after Help > About GravitDesign Next. */
  override getGroup(): string {
    return "help";
  }

  override isEnabled(): boolean {
    return true;
  }

  override execute(): void {
    gContainer().openExternalLink(null, LEGACY_URL);
  }

  override toString(): string {
    return "[Object OpenLegacyAction]";
  }
}
