// Old: designer.browser.dev.js module 106 (GElementAction).
import { Action } from "./action.ts";
import { gDesigner } from "./host.ts";

/** The annotations sidebar's id (GAnnotationsSidebar.ID, module 198 SidebarsIds). */
export const ANNOTATIONS_SIDEBAR_ID = "annotations";

/**
 * An action on elements: disabled while the annotations sidebar is the
 * active right sidebar (review mode edits annotations, not the design).
 */
export class ElementAction extends Action {
  override isEnabled(): boolean {
    return gDesigner().getRightSidebars().getActiveSidebar() !== ANNOTATIONS_SIDEBAR_ID;
  }

  override toString(): string {
    return "[Object GElementAction]";
  }
}
