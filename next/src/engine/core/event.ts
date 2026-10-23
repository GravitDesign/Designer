// Old: chunk.vendor.js module 72 (GEvent).
/**
 * Base class of every engine event. An event class is its own event type:
 * listeners are registered per class (by type id, see object.ts), so every
 * event subclass must call `registerClass` in a static block, or it shares
 * the listeners of its parent class.
 *
 *     export class AfterFooEvent extends Event {
 *       static { registerClass(this, "GFoo.AfterFooEvent"); }
 *       constructor(public readonly foo: Foo) { super(); }
 *     }
 *
 * The name shadows the DOM `Event` in files that import it; use
 * `globalThis.Event` there for the DOM one.
 */
import { GObject, registerClass, type AnyConstructor } from "./object.ts";

export class Event extends GObject {
  static {
    registerClass(this, "GEvent");
  }

  /** The event target that triggered the event; set by `trigger`. */
  sender: object | null = null;

  /**
   * Stops the remaining listeners of the current `trigger` call. The old
   * class had no default (undefined); it was only ever set by the code
   * that triggered or handled the event.
   */
  isImmediatePropagationStopped?: boolean;

  /** The parameters for `toString` in subclasses. */
  protected _paramsToString(): string {
    return "";
  }
}

/** An event class, as passed to addEventListener. */
export type EventClass<E extends Event = Event> = AnyConstructor<E>;
