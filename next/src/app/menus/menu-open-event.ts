// Old: designer.browser.dev.js module 804 (GMenuOpenEvent).
/** A menu was opened (appended to the page). Menus trigger the shared EVENT instance. */
import { Event } from "../../engine/core/event.ts";
import { registerClass } from "../../engine/core/object.ts";

export class MenuOpenEvent extends Event {
  static {
    registerClass(this, "GMenuOpenEvent");
  }

  static readonly EVENT: MenuOpenEvent = new MenuOpenEvent();

  override toString(): string {
    return "[Object GMenuOpenEvent]";
  }
}
