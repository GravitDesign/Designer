// Old: designer.browser.dev.js module 807 (GSidebars.SidebarEvent).
/** A sidebar was activated or deactivated, or an inspector child was added or removed. */
import { Event } from "../../engine/core/event.ts";
import { registerClass } from "../../engine/core/object.ts";

const Type = {
  Deactivated: 10,
  Activated: 11,
  ChildAdded: 12,
  ChildRemoved: 14,
} as const;

export type SidebarEventType = (typeof Type)[keyof typeof Type];

export class SidebarEvent<S = unknown> extends Event {
  static {
    registerClass(this, "GSidebars.SidebarEvent");
  }

  static readonly Type = Type;

  constructor(
    public type: SidebarEventType,
    public sidebar: S,
  ) {
    super();
  }

  override toString(): string {
    return "[Object GSidebars.SidebarEvent]";
  }
}
