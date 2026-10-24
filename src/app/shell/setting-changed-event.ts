// Old: designer.browser.dev.js module 135 (GSettingChangedEvent).
/**
 * A setting changed (Designer.setSetting), or was restored at start
 * (`restoring`, one event per stored key from Designer.start).
 */
import { Event } from "../../engine/core/event.ts";
import { registerClass } from "../../engine/core/object.ts";

export class SettingChangedEvent extends Event {
  static {
    registerClass(this, "GSettingChangedEvent");
  }

  constructor(
    public key: string,
    public previousValue: unknown,
    public newValue: unknown,
    public restoring = false,
  ) {
    super();
  }

  override toString(): string {
    return "[Object GSettingChangedEvent]";
  }
}
