// Old: designer.browser.dev.js module 1667 (the notification content builder).
/**
 * Content for the notification panel built on demand, with a way to close
 * the notification from inside the content.
 */
import { Event } from "../../engine/core/event.ts";
import { EventTarget } from "../../engine/core/event-target.ts";
import { registerClass } from "../../engine/core/object.ts";

class NotificationBuilderEvent extends Event {
  static {
    registerClass(this, "GNotificationBuilder.Event");
  }

  static readonly Type = { Close: 0 } as const;

  constructor(public type: number) {
    super();
  }
}

export class NotificationBuilder extends EventTarget {
  static readonly Event = NotificationBuilderEvent;

  constructor(
    private readonly _builder: () => Node | string | Promise<Node | string>,
    private readonly _onClose?: () => void,
  ) {
    super();
  }

  build(): Node | string | Promise<Node | string> {
    return this._builder();
  }

  close(): void {
    if (this.hasEventListeners(NotificationBuilder.Event))
      this.trigger(new NotificationBuilder.Event(NotificationBuilder.Event.Type.Close));
    if (this._onClose) this._onClose();
  }
}
