// Old: chunk.vendor.js module 75 (GEventTarget).
/**
 * Listener lists per event class. The old GEventTarget was used both as a
 * base class and as a mixin (`inheritAndMix(X, GObject, [GEventTarget])`),
 * so both exist here with the same members:
 *
 *     class Workspace extends EventTarget { ... }          // as a base class
 *     class Node extends EventTargetMixin(GObject) { ... } // as a mixin
 *
 * `node.hasMixin(EventTarget)` is true for classes that used the mixin.
 *
 * Listeners are keyed by the event class's type id, so a listener for a
 * class only receives events whose class has exactly that id (subclasses
 * that are registered get their own id and their own listeners).
 *
 * The groups are kept in a Map, so they are visited in insertion order. The
 * old code used a plain object (integer keys ascending, then "null"). Only
 * removeAllEventListeners walks all groups and no listener runs there, so
 * the order isn't observable; don't start relying on it.
 *
 * The name shadows the DOM `EventTarget` in files that import it.
 */
import type { Event, EventClass } from "./event.ts";
import { defineMixin, getTypeId, registerClass, type AnyConstructor } from "./object.ts";

/** A listener as stored; `listener` is the bound function that is called. */
interface ListenerEntry {
  listener: (this: unknown, ...args: unknown[]) => void;
  sourceListener: unknown;
  target: unknown;
  registered: boolean;
  persistent: boolean | undefined;
}

interface ListenerGroup {
  eventClass: unknown;
  listeners: ListenerEntry[];
  /**
   * How many of `listeners` are bound to each target, so removing a
   * target's listener can stop after that target's last entry instead of
   * going through the whole list (the scene holds one per open editor of
   * some kinds).
   */
  targets: Map<unknown, number>;
}

/** Drops a removed entry from its group's target counts. */
function forgetTarget(group: ListenerGroup, entry: ListenerEntry): void {
  if (!entry.target) return;
  const count = group.targets.get(entry.target) as number;
  if (count > 1) group.targets.set(entry.target, count - 1);
  else group.targets.delete(entry.target);
}

/** The members of an event target, applied to any base class. */
function eventTargetMembers<TBase extends AnyConstructor>(Base: TBase) {
  abstract class EventTargetMembers extends Base {
    // Both fields are `declare`d: a field initializer would run after the
    // base class constructor and drop listeners it already added.

    /**
     * Listener groups by type id, created on the first listener. The old
     * code used a plain object, so `null` (an unregistered class) is a
     * valid key too.
     */
    declare _listeners: Map<number | null, ListenerGroup> | null | undefined;

    /** Old flag kept on every event target; false unless a user sets it. */
    declare temporaryReceiver: boolean;

    /**
     * Adds a listener for an event class.
     *
     * With `target` or `args`, the listener is bound to `target` (or to
     * itself when there's no target, as in the old code) and `args` are
     * passed before the event. `prepend` puts it before the existing
     * listeners; `persistent` keeps it through `removeAllEventListeners()`
     * without `force`.
     */
    addEventListener<E extends Event>(
      eventClass: EventClass<E> | number,
      listener: (event: E) => void,
      target?: object | null,
    ): void;
    addEventListener(
      eventClass: EventClass | number,
      listener: (...params: never[]) => void,
      target: object | null | undefined,
      args: readonly unknown[] | null | undefined,
      prepend?: boolean,
      persistent?: boolean,
    ): void;
    addEventListener(
      eventClass: EventClass | number,
      listener: (...params: never[]) => void,
      target?: object | null,
      args?: readonly unknown[] | null,
      prepend?: boolean,
      persistent?: boolean,
    ): void {
      const typeId = getTypeId(eventClass);
      if (!this._listeners) this._listeners = new Map();
      const source = listener;
      let call = listener as unknown as ListenerEntry["listener"];
      if (target || args) {
        const bound = args ? args.slice() : [];
        call = call.bind(target || call, ...bound);
      }
      let group = this._listeners.get(typeId);
      if (!group) {
        group = { eventClass, listeners: [], targets: new Map() };
        this._listeners.set(typeId, group);
      }
      const entry: ListenerEntry = {
        listener: call,
        sourceListener: source,
        target,
        registered: true,
        persistent,
      };
      if (prepend) group.listeners.unshift(entry);
      else group.listeners.push(entry);
      if (target) group.targets.set(target, (group.targets.get(target) || 0) + 1);
    }

    /**
     * Removes every registration of `listener` for the event class (only
     * those bound to `target` when one is given). Returns whether any was
     * removed.
     */
    removeEventListener(
      eventClass: EventClass | number,
      listener: unknown,
      target?: object | null,
    ): boolean {
      const typeId = getTypeId(eventClass);
      let removed = false;
      const group = this._listeners?.get(typeId);
      if (this._listeners && group) {
        const list = group.listeners;
        // With a target, entries of other targets can't match: stop after
        // the last entry of this one.
        let left = target ? group.targets.get(target) || 0 : list.length;
        for (let i = 0; i < list.length && left > 0; ++i) {
          const entry = list[i] as ListenerEntry;
          if (target) {
            if (entry.target !== target) continue;
            --left;
          }
          if (entry.sourceListener != listener) continue;
          entry.registered = false;
          forgetTarget(group, entry);
          // shift can drop the first entry without moving the rest.
          if (0 === i) list.shift();
          else list.splice(i, 1);
          removed = true;
          --i;
        }
        if (list.length == 0) this._listeners.delete(typeId);
      }
      return removed;
    }

    /**
     * Removes all listeners, except persistent ones unless `force` is set.
     */
    removeAllEventListeners(force?: boolean): void {
      if (!this._listeners) return;
      const keys = [...this._listeners.keys()];
      for (let i = keys.length - 1; i >= 0; i--) {
        const key = keys[i] as number | null;
        const group = this._listeners.get(key) as ListenerGroup;
        for (let j = group.listeners.length - 1; j >= 0; j--) {
          const entry = group.listeners[j] as ListenerEntry;
          if (!force && entry.persistent) continue;
          entry.registered = false;
          forgetTarget(group, entry);
          group.listeners.splice(j, 1);
        }
        if (group.listeners.length === 0) this._listeners.delete(key);
      }
    }

    /** Whether any listener is registered for the event class. */
    hasEventListeners(eventClass: EventClass | number): boolean {
      return !!this._listeners && this._listeners.has(getTypeId(eventClass));
    }

    /**
     * Calls the listeners for the event's class with `this` as the sender,
     * in order, over a copy of the list: listeners removed during the call
     * are skipped, listeners added during it wait for the next trigger.
     */
    trigger(event: Event): void {
      event.sender = this;
      if (!this._listeners) return;
      const group = this._listeners.get(getTypeId(event));
      if (!group) return;
      const list = group.listeners.slice();
      for (const entry of list) {
        if (!entry.registered) continue;
        if (event.isImmediatePropagationStopped) break;
        entry.listener.call(this, event);
      }
    }
  }
  EventTargetMembers.prototype.temporaryReceiver = false;
  return EventTargetMembers;
}

/** An object that triggers events; the old GEventTarget as a base class. */
export class EventTarget extends eventTargetMembers(Object) {
  static {
    registerClass(this, "GEventTarget");
  }
}

/** GEventTarget as a mixin: `class X extends EventTargetMixin(Base)`. */
export const EventTargetMixin = defineMixin(EventTarget, eventTargetMembers);

/** The instance shape shared by EventTarget and EventTargetMixin users. */
export type EventTargetLike = InstanceType<ReturnType<typeof eventTargetMembers>>;
