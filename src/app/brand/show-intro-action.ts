/**
 * Help > About GravitDesign Next: opens the introduction again
 * (intro-dialog.ts). Registered only in the "next" look (brand-actions.ts),
 * so the classic menus stay as they were.
 */
import { Action } from "../actions/action.ts";
import { Category } from "../actions/category.ts";
import { brandString } from "./brand-strings.ts";
import { IntroDialog } from "./intro-dialog.ts";

export class ShowIntroAction extends Action {
  static ID = "help.about-next";

  override getId(): string {
    return ShowIntroAction.ID;
  }

  override getTitle(): string {
    return brandString("menu.about");
  }

  override getCategory(): Category {
    return Category.CATEGORY_HELP;
  }

  /** The group of Help > Show Welcome Screen, so it sits right after it. */
  override getGroup(): string {
    return "help";
  }

  override isEnabled(): boolean {
    return IntroDialog.current() === null;
  }

  override execute(): void {
    IntroDialog.show();
  }

  override toString(): string {
    return "[Object ShowIntroAction]";
  }
}
