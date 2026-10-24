import { PNG } from "pngjs";

/**
 * Checks that a removed-feature `.fixed` file (REMOVED.md, DROP-NNN)
 * differs from the old app's output only in the removed part.
 *
 * JSON and DOM outputs: the rules of the entry describe the removal as an
 * edit of the old output (drop the nodes of the removed element, drop a
 * licence class, drop an action id). `applyRemoval` makes that edit, and
 * the `.fixed` file must equal its result exactly, so any other
 * difference shows up.
 *
 * PNG outputs: `checkPngRemoval` compares the shots pixel for pixel,
 * except inside the rectangles where the removed element was (or where
 * the layout revealed what was covered), and with a region compared at an
 * offset where the removal moved it (the inspector moving up by the
 * 32 px of the dropped comments tab row).
 */

/** Matches a DOM snapshot node (parity/scenarios/ui/lib.ts DomNode) or any JSON object. */
export interface NodeMatch {
  tag?: string;
  /** Every one of these classes. */
  cls?: string | string[];
  /** These attributes with exactly these values. */
  attrs?: Record<string, string>;
  text?: string;
  /** The node's parent node matches this. */
  parent?: NodeMatch;
  /** One of the node's children matches this (a menu item by its caption). */
  child?: NodeMatch;
  /** The node has no text and no children (a badge). */
  empty?: true;
}

export type RemovalRule = RuleScope &
  /**
   * Remove a class token from every `cls` (DOM snapshot, the key goes when
   * it empties) and `classes` (menu trees) array.
   */
  (
    | { dropClass: string }
    /** Remove every array element that is a node matching this, with its subtree. */
    | { dropNode: NodeMatch }
    /** Remove every array element equal to this value (strings, numbers). */
    | { dropValue: string | number | boolean }
    /** Remove every array element that is an object whose `key` equals one of `values`. */
    | { dropWhere: { key: string; values: (string | number | boolean | null)[] } }
    /** Set `key` to `to` wherever an object has `key` equal to `from`. */
    | { replace: { key: string; from: unknown; to: unknown } }
    /** Remove an attribute (with this value, if given) from the nodes matching `node`. */
    | { dropAttr: { node: NodeMatch; attr: string; value?: string } }
    /**
     * Add `by` to a pixel length in the inline style of the nodes matching
     * `node` (an overlay placed below an inspector field that moved up).
     */
    | { moveStyle: { node: NodeMatch; property: string; by: number } }
  );

export interface RuleScope {
  /** Only for the scenarios whose id starts with one of these. */
  only?: string[];
}

/** The rules that apply to a scenario. */
export function rulesFor(id: string, rules: readonly RemovalRule[]): RemovalRule[] {
  return rules.filter((r) => !r.only || r.only.some((prefix) => id.startsWith(prefix)));
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A PNG removal. Pixels in `free` rectangles may differ (the removed
 * element, or what its removal revealed). Pixels in a `moved` region of
 * the new shot equal the old shot at the same place plus (dx, dy). All
 * other pixels are identical. Coordinates are in the new shot; `free`
 * wins over `moved`.
 */
export interface PngRemoval {
  free?: Rect[];
  moved?: (Rect & { dx?: number; dy?: number })[];
  /**
   * The shot is the union box of the surface, which shrinks by the
   * removed element (a menu without one item): the new shot is
   * `height` pixels high instead of the old height. Every pixel of the
   * new shot is still checked against the old one.
   */
  height?: number;
}

function classesOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((c): c is string => typeof c === "string");
  return [];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function matchesNode(value: unknown, match: NodeMatch, parent?: unknown): boolean {
  if (!isObject(value)) return false;
  if (match.parent !== undefined && !matchesNode(parent, match.parent)) return false;
  if (match.tag !== undefined && value.tag !== match.tag) return false;
  if (match.cls !== undefined) {
    const have = classesOf(value.cls);
    const want = typeof match.cls === "string" ? [match.cls] : match.cls;
    if (!want.every((c) => have.includes(c))) return false;
  }
  if (match.attrs !== undefined) {
    const attrs = isObject(value.attrs) ? value.attrs : {};
    for (const [k, v] of Object.entries(match.attrs)) if (attrs[k] !== v) return false;
  }
  if (match.text !== undefined && value.text !== match.text) return false;
  if (match.empty && (value.text !== undefined || value.children !== undefined)) return false;
  if (match.child !== undefined) {
    const children = Array.isArray(value.children) ? (value.children as unknown[]) : [];
    const child = match.child;
    if (!children.some((c) => matchesNode(c, child, value))) return false;
  }
  return true;
}

function dropsElement(value: unknown, rules: readonly RemovalRule[], parent: unknown): boolean {
  for (const rule of rules) {
    if ("dropNode" in rule && matchesNode(value, rule.dropNode, parent)) return true;
    if ("dropValue" in rule && value === rule.dropValue) return true;
    if ("dropWhere" in rule && isObject(value)) {
      const v = value[rule.dropWhere.key];
      if (rule.dropWhere.values.some((x) => Object.is(x, v))) return true;
    }
  }
  return false;
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The node's attributes after the dropAttr and moveStyle rules. */
function editAttrs(
  node: Record<string, unknown>,
  attrs: Record<string, unknown>,
  rules: readonly RemovalRule[],
  parent: unknown,
): Record<string, unknown> {
  let out: Record<string, unknown> = { ...attrs };
  for (const rule of rules) {
    if ("dropAttr" in rule && matchesNode(node, rule.dropAttr.node, parent)) {
      const { attr, value } = rule.dropAttr;
      if (attr in out && (value === undefined || out[attr] === value)) {
        out = Object.fromEntries(Object.entries(out).filter(([key]) => key !== attr));
      }
    }
    if ("moveStyle" in rule && matchesNode(node, rule.moveStyle.node, parent)) {
      const style = out.style;
      if (typeof style !== "string") continue;
      const { property, by } = rule.moveStyle;
      if (!/^[a-z-]+$/.test(property)) throw new Error(`moveStyle: bad property ${property}`);
      const re = new RegExp(`(^|; )(${property}: )(-?\\d+(?:\\.\\d+)?)px`);
      out.style = style.replace(re, (_m, start: string, name: string, n: string) => {
        return `${start}${name}${Number(n) + by}px`;
      });
    }
  }
  return out;
}

/** The old output with the removal applied: what the new app must produce. */
export function applyRemoval(
  value: unknown,
  rules: readonly RemovalRule[],
  parent?: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((v) => !dropsElement(v, rules, parent))
      .map((v) => applyRemoval(v, rules, parent));
  }
  if (!isObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (key === "attrs" && isObject(v)) {
      const attrs = editAttrs(value, v, rules, parent);
      if (Object.keys(attrs).length > 0) out[key] = attrs;
      continue;
    }
    let next: unknown = v;
    for (const rule of rules) {
      if ("replace" in rule && key === rule.replace.key && sameValue(next, rule.replace.from)) {
        next = rule.replace.to;
      }
    }
    if ((key === "cls" || key === "classes") && Array.isArray(next)) {
      const dropped = rules.flatMap((r) => ("dropClass" in r ? [r.dropClass] : []));
      const cls = (next as unknown[]).filter((c) => !dropped.includes(c as string));
      // DOM snapshots leave out an empty class list; other outputs keep [].
      if (cls.length === 0 && key === "cls") continue;
      out[key] = cls;
      continue;
    }
    // Arrays below a node (its children) have the node as their parent.
    const edited = applyRemoval(next, rules, Array.isArray(next) ? value : parent);
    // DOM snapshots leave out an empty child list.
    if (key === "children" && Array.isArray(next) && next.length > 0) {
      if ((edited as unknown[]).length === 0) continue;
    }
    out[key] = edited;
  }
  return out;
}

/** The stored form of a JSON output (runner.ts storeOutput). */
export function storedJson(value: unknown): string {
  return JSON.stringify(value, null, 1) + "\n";
}

/**
 * Why `fixed` is not exactly the old output minus the removal, or null
 * when it is. Also fails when the rules change nothing.
 */
export function checkJsonRemoval(
  oldText: string,
  fixedText: string,
  rules: readonly RemovalRule[],
): string | null {
  const old = JSON.parse(oldText) as unknown;
  const expected = storedJson(applyRemoval(old, rules));
  if (expected === storedJson(old)) return "the rules remove nothing from the old output";
  if (expected !== fixedText) {
    const e = expected.split("\n");
    const f = fixedText.split("\n");
    const line = e.findIndex((l, i) => l !== f[i]);
    return (
      `.fixed is not the old output minus the removal; first difference at line ${line + 1}: ` +
      `expected ${JSON.stringify(e[line])}, got ${JSON.stringify(f[line])}`
    );
  }
  return null;
}

function inside(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

/**
 * Why the new shot differs from the old one outside the removal, or null
 * when every pixel outside `free` matches (at the offset inside `moved`).
 */
export function checkPngRemoval(
  oldPng: Buffer,
  fixedPng: Buffer,
  removal: PngRemoval,
): string | null {
  const o = PNG.sync.read(oldPng);
  const f = PNG.sync.read(fixedPng);
  if (o.width !== f.width || (removal.height ?? o.height) !== f.height) {
    return `sizes differ: old ${o.width}x${o.height}, fixed ${f.width}x${f.height}`;
  }
  let bad = 0;
  let first = "";
  let differs = false;
  for (let y = 0; y < f.height; y++) {
    for (let x = 0; x < f.width; x++) {
      const i = (y * f.width + x) * 4;
      const same0 =
        y < o.height &&
        o.data[i] === f.data[i] &&
        o.data[i + 1] === f.data[i + 1] &&
        o.data[i + 2] === f.data[i + 2] &&
        o.data[i + 3] === f.data[i + 3];
      if (!same0) differs = true;
      if ((removal.free ?? []).some((r) => inside(r, x, y))) continue;
      const move = (removal.moved ?? []).find((r) => inside(r, x, y));
      const sx = x + (move?.dx ?? 0);
      const sy = y + (move?.dy ?? 0);
      let same = false;
      if (sx >= 0 && sy >= 0 && sx < o.width && sy < o.height) {
        const j = (sy * o.width + sx) * 4;
        same =
          o.data[j] === f.data[i] &&
          o.data[j + 1] === f.data[i + 1] &&
          o.data[j + 2] === f.data[i + 2] &&
          o.data[j + 3] === f.data[i + 3];
      }
      if (!same) {
        if (bad === 0) first = `${x},${y}`;
        bad++;
      }
    }
  }
  if (!differs) return "the shots are identical";
  if (bad > 0) return `${bad} pixels differ outside the removal (first at ${first})`;
  return null;
}
