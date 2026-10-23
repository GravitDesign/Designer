// Old: designer.browser.dev.js module 1156 (GMenuCloseEvent).
/** A menu was closed (detached from the page). Menus trigger the shared EVENT instance. */
import { Event } from "../../engine/core/event.ts";
import { registerClass } from "../../engine/core/object.ts";

export class MenuCloseEvent extends Event {
  static {
    registerClass(this, "GMenuCloseEvent");
  }

  static readonly EVENT: MenuCloseEvent = new MenuCloseEvent();

  override toString(): string {
    return "[Object GMenuCloseEvent]";
  }
}
