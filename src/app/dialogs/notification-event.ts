// Old: designer.browser.dev.js module 1321 (GNotificationEvent).
/**
 * A notification for the footer's notification panel, triggered on the
 * designer by Designer.addNotification.
 */
import { Event } from "../../engine/core/event.ts";
import { registerClass } from "../../engine/core/object.ts";
import type { NotificationBuilder } from "./notification.ts";

/** What a notification can carry; the panel reads the fields below. */
export interface NotificationData {
  message?: string | Node;
  popup?: boolean;
  /** The sign-up promo of the dropped cloud; never set in the local app. */
  anonymous?: boolean;
  /** The old default object spelled it "annonymous"; kept, nothing reads it. */
  annonymous?: boolean;
  custom?: boolean;
  class?: string;
  enter?: string;
  exit?: string;
  timeout?: number;
  content?: Node | string;
  closeCallback?: (() => void) | null;
  document?: unknown;
  [key: string]: unknown;
}

export class NotificationEvent extends Event {
  static {
    registerClass(this, "GNotificationEvent");
  }

  notification: NotificationData;
  builder: NotificationBuilder | undefined;

  constructor(notification?: NotificationData | null, builder?: NotificationBuilder) {
    super();
    this.notification = Object.assign({ popup: false, annonymous: false }, notification || {});
    this.builder = builder;
  }

  override toString(): string {
    return "GEvent [GNotificationEvent]";
  }
}
