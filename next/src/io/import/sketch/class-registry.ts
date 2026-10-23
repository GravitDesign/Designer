// Old: chunk.vendor.js module 561 (sketchclasses: the name-to-class table).
/**
 * Finds the importer class for a layer's `_class` ("shapeGroup",
 * "symbolInstance", ...). The old module required every class through the
 * webpack context of the sketch folder (designer module 1400) and keyed it
 * by its file name minus "sketch", first letter lowercased; sketch-classes.ts
 * fills the table the same way. The importer classes look classes up here
 * at run time, as the old code did, which also keeps the modules free of
 * import cycles.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the table holds classes with different constructor signatures
type AnyClass = abstract new (...args: any[]) => unknown;

const nameToClass = new Map<string, AnyClass>();

/** Adds a class under the name its old file gave it ("model/item/sketchOval" -> "oval"). */
export function registerSketchClass(path: string, cls: AnyClass): void {
  const name = path.split("sketch")[1] as string;
  nameToClass.set(name.charAt(0).toLowerCase() + name.slice(1), cls);
}

/** The class for a layer's `_class`, or null (with a warning) for an unknown one. */
export function getClassFromName<T extends AnyClass = AnyClass>(name: unknown): T | null {
  const cls = (typeof name === "string" && nameToClass.get(name)) || null;
  if (!cls) console.warn("Unable to find class: " + String(name));
  return cls as T | null;
}
