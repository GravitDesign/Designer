// Old: chunk.vendor.js module 261 (getName of the translation library's
// own copy of the type system; the rest of that copy is dropped).

/**
 * The name the translation tables use for a class id. Callers pass the old
 * class name as a string ("GLength"), which is returned as is. For an
 * object its constructor is used, for a function its name.
 *
 * The old code read the name out of the function's source text, which in
 * the minified bundle gave one-letter names; nothing passes classes, so the
 * port uses Function.name instead.
 */
export function className(value: unknown): string {
  if (!value) return "<null>";
  let target: unknown = value;
  if (typeof target === "object") target = (target as { constructor?: unknown }).constructor;
  if (target && typeof target === "function") return target.name.trim() || "anonymous";
  return String(value);
}
