// Old: designer.browser.dev.js module 1499 (GMenuActivateEvent).
/** An item of a menu was activated; the menu triggers it with the item. */
import { Event } from "../../engine/core/event.ts";
import { registerClass } from "../../engine/core/object.ts";
import type { MenuItem } from "./menu-item.ts";

export class MenuActivateEvent extends Event {
  static {
    registerClass(this, "GMenuActivateEvent");
  }

  /** The old module also created a shared instance (without an item); nothing triggered it. */
  static readonly EVENT: MenuActivateEvent = new MenuActivateEvent(null);

  constructor(public item: MenuItem | null) {
    super();
  }

  override toString(): string {
    return "[Object GMenuActivateEvent]";
  }
}
