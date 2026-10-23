// Old: chunk.vendor.js module 892.
import type { TranslationEvent } from "./translation-event.ts";

type EventClass<E extends TranslationEvent> = abstract new (...args: never[]) => E;
type Listener<E extends TranslationEvent> = (event: E) => void;

interface Registration {
  listener: (event: TranslationEvent) => void;
  sourceListener: unknown;
  target: unknown;
  registered: boolean;
}

/**
 * Event target of the translation library. Listeners are registered per
 * event class and only get events of exactly that class, not subclasses.
 */
export class TranslationEventTarget {
  temporaryReceiver = false;
  private _listeners: Map<unknown, Registration[]> | null = null;

  /**
   * Registers a listener. With a target or extra arguments the listener is
   * bound to the target (or to itself when there is none) with the extra
   * arguments in front of the event. `prepend` puts it before the others.
   */
  addEventListener<E extends TranslationEvent>(
    eventClass: EventClass<E>,
    listener: Listener<E>,
    target?: unknown,
    args?: readonly unknown[] | null,
    prepend?: boolean,
  ): void {
    if (!this._listeners) this._listeners = new Map();
    const sourceListener = listener;
    let call = listener as (event: TranslationEvent) => void;
    if (target || args) {
      const bound = args ? args.slice() : [];
      call = (listener as (...rest: unknown[]) => void).bind(target || listener, ...bound);
    }
    let listeners = this._listeners.get(eventClass);
    if (!listeners) {
      listeners = [];
      this._listeners.set(eventClass, listeners);
    }
    const registration: Registration = { listener: call, sourceListener, target, registered: true };
    if (prepend) listeners.unshift(registration);
    else listeners.push(registration);
  }

  /** Removes every registration of the listener (only those for `target`, if given). */
  removeEventListener<E extends TranslationEvent>(
    eventClass: EventClass<E>,
    listener: Listener<E>,
    target?: unknown,
  ): boolean {
    let removed = false;
    const listeners = this._listeners?.get(eventClass);
    if (this._listeners && listeners) {
      for (let index = 0; index < listeners.length; ++index) {
        const registration = listeners[index] as Registration;
        if (registration.sourceListener != listener || (target && registration.target !== target)) {
          continue;
        }
        registration.registered = false;
        listeners.splice(index, 1);
        removed = true;
        --index;
      }
      if (listeners.length == 0) this._listeners.delete(eventClass);
    }
    return removed;
  }

  hasEventListeners(eventClass: EventClass<TranslationEvent>): boolean {
    return !!this._listeners && this._listeners.has(eventClass);
  }

  trigger(event: TranslationEvent): void {
    event.sender = this;
    const listeners = this._listeners?.get(event.constructor);
    if (!listeners) return;
    // A copy, so listeners can add or remove listeners while it runs.
    for (const registration of listeners.slice()) {
      if (!registration.registered) continue;
      if (event.isImmediatePropagationStopped) break;
      registration.listener.call(this, event);
    }
  }
}
