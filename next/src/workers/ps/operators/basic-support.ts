// Helpers for the systemdict operators: the old code ran in sloppy mode on
// untyped values, these keep its runtime behaviour in strict TypeScript.
import type { PSCore } from "../core.ts";
import type { PSValue } from "../objects.ts";

/** Something the old code called `.execute(core)` on without checking. */
interface Executable {
  execute(core: PSCore): unknown;
}

/**
 * `value.execute(core)` as the old code wrote it: throws a TypeError when the
 * value has no execute method, like the old call did.
 */
export function executeValue(value: PSValue, core: PSCore): void {
  (value as unknown as Executable).execute(core);
}

/**
 * Property assignment as sloppy mode did it: ignored on primitives other
 * than null and undefined (which throw in both modes).
 */
export function sloppySet(target: PSValue, key: string, value: unknown): void {
  if (target === null || target === undefined) {
    (target as unknown as Record<string, unknown>)[key] = value;
    return;
  }
  if (typeof target != "object" && typeof target != "function") return;
  (target as unknown as Record<string, unknown>)[key] = value;
}

/** Reads `.value` of whatever is on the stack, like the untyped old code. */
export function valueOf(value: PSValue): unknown {
  return (value as unknown as { value: unknown }).value;
}

/** The value of a PostScript composite or simple object used as a string. */
export function stringOf(value: PSValue): string {
  return valueOf(value) as string;
}

/** Old code referenced an undeclared `myname` here, which throws. */
export function undeclaredMyname(): never {
  throw new ReferenceError("myname is not defined");
}
