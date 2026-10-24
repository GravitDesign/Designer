// Old: designer.browser.dev.js module 394 (GView).
/**
 * The base of everything the shell hosts in a sidebar, the footer or the
 * panels part: an event target with an id and a title. A view tells its
 * host to lay it out again with an UpdateEvent.
 */
import { Event } from "../../engine/core/event.ts";
import { EventTarget } from "../../engine/core/event-target.ts";
import { registerClass } from "../../engine/core/object.ts";

class UpdateEvent extends Event {
  static {
    registerClass(this, "GView.UpdateEvent");
  }

  override toString(): string {
    return "[Object GView.UpdateEvent]";
  }
}

export class View extends EventTarget {
  static {
    registerClass(this, "GView");
  }

  static readonly UpdateEvent = UpdateEvent;

  /** The one instance every view triggers (the old code shared it too). */
  static readonly UPDATE_EVENT = new UpdateEvent();

  getId(): string {
    throw new Error("Not Supported");
  }

  getTitle(): unknown {
    throw new Error("Not Supported");
  }

  isEnabled(): boolean {
    return true;
  }

  isVisible(): boolean {
    return true;
  }

  _fireUpdateEvent(): void {
    this.trigger(View.UPDATE_EVENT);
  }

  override toString(): string {
    return "[Object GView]";
  }
}
