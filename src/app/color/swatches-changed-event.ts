// Old: designer.browser.dev.js module 1151 (GSwatchesChangedEvent).
/**
 * The designer triggers this after setSwatches changed the swatches of a
 * scope ("global", "document-linear-gradient", ...). The open color
 * chooser listens to it while its swatches palette shows.
 */
import { Event } from "../../engine/core/event.ts";
import { registerClass } from "../../engine/core/object.ts";

export class SwatchesChangedEvent extends Event {
  static {
    registerClass(this, "GSwatchesChangedEvent");
  }

  scope: string | null = null;

  constructor(scope: string) {
    super();
    this.scope = scope;
  }

  override toString(): string {
    return "[Object GSwatchesChangedEvent]";
  }
}
