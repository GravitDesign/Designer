// Old: chunk.vendor.js module 0 (GObject).
/**
 * The type system: type ids, class registration and mixins.
 *
 * The old engine built classes with `GObject.inherit(Sub, Parent)` and
 * `GObject.inheritAndMix(Sub, Parent, [MixinA, MixinB])`. Every `inherit`
 * gave the new class a number from a global counter (`__gtype_id__`), and
 * mixing copied the mixin's prototype members onto the class and recorded
 * the mixin's id so that `obj.hasMixin(MixinA)` works. Type ids key the
 * event listener tables and some of them are saved in documents (`_sdf`).
 *
 * Here classes are ES classes and the ids are kept in a table of the old
 * numbers (type-ids.ts):
 *
 * - `registerClass(Class, "GOldName")` gives a class its old type id (or a
 *   fresh one above every old id when the old class had none in the table).
 *   Call it in a static block. Every class that is used as an event type,
 *   an `instanceof`-free type check or is saved by id must be registered;
 *   an unregistered subclass shares the id of its nearest registered
 *   ancestor, the way an instance's `__gtype_id__` came from its prototype.
 * - `defineMixin(identity, body)` turns a TypeScript mixin factory
 *   (`(Base) => class extends Base {...}`) into a registered mixin. Every
 *   class the factory produces records the mixin's id, and `hasMixin`
 *   checks that record, also through the prototype chain, which covers what
 *   `inherit` did by copying the parent's `__gmixins__`. Mixins applied
 *   inside a mixin body are recorded too, like the old copying of a mixin's
 *   own `__gmixins__`.
 * - `getTypeId` and `getName` keep the old lookup rules.
 *
 * README.md in this folder has a short guide with examples.
 */
import { lookupOldTypeId } from "./type-ids.ts";

/**
 * Any class, abstract or not. Construct signatures with `any[]` are what
 * TypeScript requires of mixin bases (TS2545), so the same shape is used
 * for every class argument here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeScript requires any[] rest parameters for mixin constructors (TS2545)
export type AnyConstructor<T = object> = abstract new (...args: any[]) => T;

/** A concrete class. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeScript requires any[] rest parameters for mixin constructors (TS2545)
export type Constructor<T = object> = new (...args: any[]) => T;

/** Own on a registered class's prototype, inherited by its instances. */
const TYPE_ID = Symbol("gravit.typeId");
/** Own on a registered mixin factory. */
const MIXIN_ID = Symbol("gravit.mixinId");
/** Own on a prototype: the mixin ids applied at that level. */
const MIXINS = Symbol("gravit.mixins");

/**
 * Ids for classes the old table doesn't list. They start above every old
 * id, so they never collide with a number a document could contain.
 */
export const FIRST_FRESH_TYPE_ID = 1000;
let nextFreshTypeId = FIRST_FRESH_TYPE_ID;

interface Registration {
  id: number;
  oldName: string;
}

const registrations = new Map<object, Registration>();
const classesByOldName = new Map<string, object>();
/**
 * Mixin sets merged along the prototype chain, filled on first use and
 * dropped whenever a mixin id is added anywhere (the old code had no cache,
 * so a late markMixins must still show up in hasMixin).
 */
let mergedMixins = new WeakMap<object, ReadonlySet<number>>();

interface TypeIdCarrier {
  [TYPE_ID]?: number;
  [MIXIN_ID]?: number;
  [MIXINS]?: Set<number>;
}

function claim(token: object, oldName: string, id: number | undefined): number {
  if (registrations.has(token)) {
    throw new Error(`${oldName} is registered twice`);
  }
  const previous = classesByOldName.get(oldName);
  if (previous) {
    throw new Error(`The old name ${oldName} is already taken`);
  }
  const typeId = id ?? lookupOldTypeId(oldName) ?? nextFreshTypeId++;
  registrations.set(token, { id: typeId, oldName });
  classesByOldName.set(oldName, token);
  return typeId;
}

export interface RegisterOptions {
  /**
   * An explicit id. Only for classes that kept a number outside the shared
   * counter (the translation library had its own copy of GObject).
   */
  id?: number;
}

/**
 * Gives a class its type id. `oldName` is the old G path of the class
 * ("GRectangle", "GNode.BeforeInsertEvent"); its number comes from the old
 * table. Call it once per class, from a static block:
 *
 *     class Drag extends MouseEvent {
 *       static { registerClass(this, "GMouseEvent.Drag"); }
 *     }
 */
export function registerClass(
  cls: AnyConstructor,
  oldName: string,
  options: RegisterOptions = {},
): number {
  const id = claim(cls, oldName, options.id);
  Object.defineProperty(cls.prototype, TYPE_ID, { value: id, enumerable: false });
  return id;
}

/** The class registered under an old name, if any. */
export function getRegisteredClass(oldName: string): object | null {
  return classesByOldName.get(oldName) ?? null;
}

/** The old name a class or mixin was registered under, if any. */
export function getOldName(token: unknown): string | null {
  if ((typeof token !== "function" && typeof token !== "object") || token === null) return null;
  return registrations.get(token)?.oldName ?? null;
}

/**
 * The type id of a class, a mixin, an instance or a number.
 *
 * Old rules: a number is returned as is; a class only has an id when it was
 * registered itself (an unregistered subclass gives null); an instance has
 * the id of its nearest registered class.
 */
export function getTypeId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "function") {
    const carrier = value as unknown as TypeIdCarrier & { prototype?: unknown };
    if (Object.hasOwn(carrier, MIXIN_ID)) return carrier[MIXIN_ID] ?? null;
    const proto = carrier.prototype;
    if (typeof proto === "object" && proto !== null && Object.hasOwn(proto, TYPE_ID)) {
      return (proto as TypeIdCarrier)[TYPE_ID] ?? null;
    }
    return null;
  }
  if (typeof value === "object" && value !== null) {
    const id = (value as TypeIdCarrier)[TYPE_ID];
    return typeof id === "number" ? id : null;
  }
  return null;
}

/**
 * The type id a class or mixin registered itself, or null. Unlike
 * `getTypeId` this never falls back to a number or an instance.
 */
export function getOwnTypeId(token: unknown): number | null {
  if (typeof token !== "function") return null;
  return getTypeId(token);
}

/**
 * The name of a class or of an instance's class.
 *
 * The old version parsed the function source (`function Name(`), which in
 * the minified bundle gave one-letter names; the registered old name is the
 * readable equivalent, the JavaScript class name the fallback.
 */
export function getName(value: unknown): string {
  if (!value) return "<null>";
  let target: unknown = value;
  if (typeof target === "object") target = (target as { constructor?: unknown }).constructor;
  if (typeof target === "function") {
    const name = getOldName(target) ?? (target as { name?: string }).name;
    return name ? name : "anonymous";
  }
  return String(target);
}

/** The mixin ids a prototype records itself; callers add to it, so the cache goes. */
function ownMixins(proto: object): Set<number> {
  mergedMixins = new WeakMap();
  const carrier = proto as TypeIdCarrier;
  if (!Object.hasOwn(carrier, MIXINS)) {
    Object.defineProperty(carrier, MIXINS, { value: new Set<number>(), enumerable: false });
  }
  return carrier[MIXINS] as Set<number>;
}

function collectMixins(proto: object): ReadonlySet<number> {
  const cached = mergedMixins.get(proto);
  if (cached) return cached;
  const all = new Set<number>();
  for (let p: object | null = proto; p !== null && p !== Object.prototype;) {
    const own = Object.hasOwn(p, MIXINS) ? (p as TypeIdCarrier)[MIXINS] : undefined;
    if (own) for (const id of own) all.add(id);
    p = Object.getPrototypeOf(p) as object | null;
  }
  mergedMixins.set(proto, all);
  return all;
}

/**
 * Records mixin ids on a class without a factory, for the rare old case of
 * a class mixed into another one as a whole (GVertexSource, GAnnotation):
 * port the members with a factory where possible and use this only where
 * the class itself is the identity.
 */
export function markMixins(cls: AnyConstructor, mixins: readonly unknown[]): void {
  const own = ownMixins(cls.prototype as object);
  for (const mixin of mixins) {
    const id = getTypeId(mixin);
    if (id === null) throw new Error(`${getName(mixin)} is not a registered mixin`);
    own.add(id);
  }
}

/** A mixin factory with a type id. Call it with a base class. */
export type Mixin<F> = F & { readonly [MIXIN_ID]: number };

/**
 * Turns a mixin factory into a registered mixin.
 *
 * `identity` is either the old name of the mixin ("GNode.Properties") or a
 * registered class that doubles as the mixin (GEventTarget is both a class
 * and a mixin in the old engine; `hasMixin(EventTarget)` must work for
 * classes that mixed it in).
 *
 *     export const Tag = defineMixin("GNode.Tag",
 *       <TBase extends AnyConstructor<Node>>(Base: TBase) => {
 *         abstract class TagMixin extends Base { ... }
 *         return TagMixin;
 *       });
 *     class Layer extends Tag(Node) { ... }
 */
export function defineMixin<F extends (base: never) => AnyConstructor>(
  identity: string | AnyConstructor,
  body: F,
): Mixin<F> {
  const apply = (base: never): AnyConstructor => {
    const mixed = body(base);
    if (mixed === (base as unknown)) throw new Error("A mixin body must return a new class");
    ownMixins(mixed.prototype as object).add(id);
    return mixed;
  };
  let id: number;
  if (typeof identity === "string") {
    id = claim(apply, identity, undefined);
  } else {
    const classId = getOwnTypeId(identity);
    if (classId === null) throw new Error(`${getName(identity)} must be registered first`);
    id = classId;
  }
  Object.defineProperty(apply, MIXIN_ID, { value: id, enumerable: false });
  return apply as unknown as Mixin<F>;
}

/** Whether `obj` (an instance or a prototype) carries the mixin. */
export function hasMixin(obj: unknown, mixin: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  const id = getTypeId(mixin);
  if (id === null) return false;
  // Start at the prototype for instances, so the cache is per class.
  const start = Object.hasOwn(obj, MIXINS) ? obj : (Object.getPrototypeOf(obj) as object | null);
  return start !== null && collectMixins(start).has(id);
}

/**
 * The root of the old class tree (`GObject`). The G prefix stays because
 * `Object` would shadow the global. Classes that extended GObject extend
 * this one; it only adds `hasMixin` and the old `toString`.
 */
export class GObject {
  static {
    registerClass(this, "GObject");
  }

  static getTypeId = getTypeId;
  static getName = getName;

  hasMixin(mixin: unknown): boolean {
    return hasMixin(this, mixin);
  }

  toString(): string {
    return "[Object " + getName(this) + "]";
  }
}
