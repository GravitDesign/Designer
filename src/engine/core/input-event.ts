// Old: chunk.vendor.js module 505 (GInputEvent).
/** Base class of mouse and key events. */
import { Event } from "./event.ts";
import { registerClass } from "./object.ts";

export class InputEvent extends Event {
  static {
    registerClass(this, "GInputEvent");
  }

  override toString(): string {
    return "[Object GInputEvent(" + this._paramsToString() + ")]";
  }
}
