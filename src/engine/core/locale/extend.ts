// Old: chunk.vendor.js module 632 (helpers of the translation library).

type Bag = Record<string, unknown>;

/**
 * Copies the own properties of every source into the target and returns
 * the target (a new object when it is null). With `deep` set, object
 * values are copied one level: `extend({}, value)`, which itself is
 * shallow, and null becomes `{}`. Falsy sources are skipped.
 */
export function extend(deep: boolean, target?: Bag | null, ...sources: unknown[]): Bag;
export function extend(target?: Bag | null, ...sources: unknown[]): Bag;
export function extend(...args: unknown[]): Bag {
  let deep = false;
  let target: Bag;
  let first = 1;
  if (typeof args[0] === "boolean") {
    deep = args[0];
    target = (args[1] as Bag | null | undefined) || {};
    first = 2;
  } else {
    target = (args[0] as Bag | null | undefined) || {};
  }
  for (let index = first; index < args.length; index++) {
    const source = args[index] as Bag | null | undefined;
    if (!source) continue;
    for (const name in source) {
      if (!Object.prototype.hasOwnProperty.call(source, name)) continue;
      const value = source[name];
      target[name] = deep && typeof value === "object" ? extend({}, value) : value;
    }
  }
  return target;
}

/**
 * The ISO 639-1 code for a BCP 47 tag: the first two letters in lower
 * case, except pt-BR, zh-CN and zh-TW, which are returned unchanged.
 */
export function bcp47ToISO6391(tag: string): string {
  return ["pt-BR", "zh-CN", "zh-TW"].includes(tag) ? tag : tag.slice(0, 2).toLowerCase();
}

/** Splits an array into chunks of `size` items. */
export function arrayChunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  const length = items.length;
  for (let start = 0; start < length; start += size) chunks.push(items.slice(start, start + size));
  return chunks;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
