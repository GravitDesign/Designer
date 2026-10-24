// Old: chunk.vendor.js module 167 (GKeyEvent).
/**
 * Key events of the scene views and tools: `KeyEvent.Down`,
 * `KeyEvent.Release` and `KeyEvent.Press`. `key` holds a Key.Constant
 * value or a character.
 */
import { InputEvent } from "./input-event.ts";
import { registerClass } from "./object.ts";

export class KeyEvent extends InputEvent {
  static {
    registerClass(this, "GKeyEvent");
  }

  declare static Down: typeof KeyDownEvent;
  declare static Release: typeof KeyReleaseEvent;
  declare static Press: typeof KeyPressEvent;

  key: number | string | null | undefined = null;
  keyUTF: string | null = null;
  timestamp = 0;
  /** Set by the view to the DOM event's methods. */
  preventDefault: (() => void) | null = null;
  stopPropagation: (() => void) | null = null;

  override toString(): string {
    return "[Object GKeyEvent(" + this._paramsToString() + ")]";
  }

  protected override _paramsToString(): string {
    return (
      "key=" +
      String(this.key) +
      (this.keyUTF ? " keyUTF:" + this.keyUTF : "") +
      (this.timestamp ? " timestamp:" + this.timestamp : "")
    );
  }
}

export class KeyDownEvent extends KeyEvent {
  static {
    registerClass(this, "GKeyEvent.Down");
  }

  override toString(): string {
    return "[Object GKeyEvent.Down(" + this._paramsToString() + ")]";
  }
}

export class KeyReleaseEvent extends KeyEvent {
  static {
    registerClass(this, "GKeyEvent.Release");
  }

  override toString(): string {
    return "[Object GKeyEvent.Release(" + this._paramsToString() + ")]";
  }
}

export class KeyPressEvent extends KeyEvent {
  static {
    registerClass(this, "GKeyEvent.Press");
  }

  override toString(): string {
    return "[Object GKeyEvent.Press(" + this._paramsToString() + ")]";
  }
}

KeyEvent.Down = KeyDownEvent;
KeyEvent.Release = KeyReleaseEvent;
KeyEvent.Press = KeyPressEvent;
