import { getOwnTypeId } from "../../engine/core/object.ts";

/**
 * The static member names the old GObject.inherit gave a class: the
 * parent's (copied when the class was created, so they come first) and
 * then its own. ES classes inherit statics through the prototype chain
 * instead, so the old order is rebuilt here.
 */
function oldStaticKeys(value: object): string[] {
  const keys: string[] = [];
  const parent = Object.getPrototypeOf(value) as unknown;
  if (typeof parent === "function" && parent !== Function.prototype) {
    for (const key of oldStaticKeys(parent)) {
      if (key === "constructor" || key === "toString" || key === "__gmixins__") continue;
      if (key.charAt(0) === "_") continue;
      keys.push(key);
    }
  }
  for (const key of Object.keys(value)) if (!keys.includes(key)) keys.push(key);
  return keys;
}

/**
 * The type id of every class reachable from G, keyed by G path, walked the
 * way parity/support/old-harness.js walks the old namespace (sorted
 * top-level names, capitalized members, depth 2, first path wins).
 */
function typeIds(): Record<string, number> {
  const G = window.__parity?.G ?? {};
  const out: Record<string, number> = {};
  const seen = new Set<unknown>();
  const visit = (value: unknown, name: string, depth: number): void => {
    if (typeof value !== "function" || seen.has(value) || depth > 2) return;
    seen.add(value);
    const id = getOwnTypeId(value);
    if (id !== null) out[name] = id;
    for (const key of oldStaticKeys(value)) {
      if (/^[A-Z]/.test(key)) {
        visit((value as unknown as Record<string, unknown>)[key], `${name}.${key}`, depth + 1);
      }
    }
  };
  for (const key of Object.keys(G).sort()) visit(G[key], key, 0);
  return out;
}

export const typeIdHooks = { typeIds };
