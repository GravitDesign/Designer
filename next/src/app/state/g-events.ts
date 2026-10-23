/**
 * React hooks over the engine's event targets (the old G events), so a
 * component can follow an editor, scene, document or controller without
 * a store. docs/rewrite/UI.md, section 4.
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { Event, EventClass } from "../../engine/core/event.ts";
import type { EventTargetLike } from "../../engine/core/event-target.ts";

/** Anything with the engine's addEventListener / removeEventListener. */
export type GEventSource = Pick<EventTargetLike, "addEventListener" | "removeEventListener">;

/**
 * Subscribes `onEvent` to every event class on `target`; returns the
 * unsubscribe function. Plain helper for controllers and the hooks.
 */
export function subscribeGEvents(
  target: GEventSource | null | undefined,
  events: readonly EventClass[],
  onEvent: (event: Event) => void,
): () => void {
  if (!target) return () => {};
  const listener = (event: Event): void => onEvent(event);
  for (const eventClass of events) target.addEventListener(eventClass, listener);
  return () => {
    for (const eventClass of events) target.removeEventListener(eventClass, listener);
  };
}

/**
 * Calls `handler` for every `eventClass` event of `target` while the
 * component is mounted. The latest handler is used without resubscribing.
 */
export function useGEvent<E extends Event>(
  target: GEventSource | null | undefined,
  eventClass: EventClass<E>,
  handler: (event: E) => void,
): void {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(
    () => subscribeGEvents(target, [eventClass], (event) => latest.current(event as E)),
    [target, eventClass],
  );
}

interface SnapshotCache<T> {
  target: unknown;
  version: number;
  deps: readonly unknown[];
  value: T;
}

function sameDeps(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
}

/**
 * A value computed from `target` that is recomputed only after one of
 * `events` fired on it, or when `target` or one of `deps` changed.
 * `getSnapshot` may build a new object each time; the hook caches it.
 */
export function useGSnapshot<T>(
  target: GEventSource | null | undefined,
  events: readonly EventClass[],
  getSnapshot: () => T,
  deps: readonly unknown[] = [],
): T {
  const cache = useRef<SnapshotCache<T> | null>(null);
  const version = useRef(0);
  // The event list is compared by its members, so an inline array is fine.
  const eventList = useRef(events);
  const eventsKey = events.map((e) => e.name).join("|");
  useEffect(() => {
    eventList.current = events;
  });
  const subscribe = useCallback(
    (onChange: () => void) =>
      subscribeGEvents(target, eventList.current, () => {
        version.current++;
        onChange();
      }),
    // eventsKey stands for the event list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target, eventsKey],
  );
  const read = (): T => {
    const current = cache.current;
    if (
      current &&
      current.target === target &&
      current.version === version.current &&
      sameDeps(current.deps, deps)
    ) {
      return current.value;
    }
    const value = getSnapshot();
    cache.current = { target, version: version.current, deps, value };
    return value;
  };
  return useSyncExternalStore(subscribe, read, read);
}
