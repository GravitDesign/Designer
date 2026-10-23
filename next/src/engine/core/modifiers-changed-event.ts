// Old: chunk.vendor.js module 150 (GModifiersChangedEvent).
/**
 * Triggered by Platform when a modifier changes. `changed` says which
 * ones changed; the current state is in `Platform.modifiers`.
 */
import { Event } from "./event.ts";
import { Modifiers } from "./modifiers.ts";
import { registerClass } from "./object.ts";

export class ModifiersChangedEvent extends Event {
  static {
    registerClass(this, "GModifiersChangedEvent");
  }

  changed = new Modifiers();

  override toString(): string {
    return "[Object GModifiersChangedEvent]";
  }
}
