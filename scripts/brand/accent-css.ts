/**
 * The accent part of the GravitDesign Next look: a stylesheet that, loaded
 * after one of the old theme stylesheets, turns the old pink accent
 * (#d72e63 and its lighter and darker shades) into the brand magenta
 * (#E3136B) everywhere, and leaves everything else exactly as it was.
 *
 * It restates rules of the old stylesheet with the colours mapped. A rule
 * restated later wins over the old one with the same selector, but it
 * also wins over old rules that came after the original with the same
 * specificity, which the original lost to. So the output restates not
 * only the declarations with an accent colour but also, for the same
 * property family (all border-* for border, all background-* for
 * background, ...), every later declaration whose selector has the same
 * specificity and importance as one already restated, until nothing new
 * is added. Then for every element the restated winner is the old winner
 * with its colours mapped, as if the old stylesheet had been edited in
 * place (accent-css.test.ts checks that on examples).
 */

/** One declaration: `prop: value [!important]`. */
export interface Declaration {
  prop: string;
  value: string;
  important: boolean;
}

/** A style rule, with the at-rule preludes (@media ...) it sits in. */
export interface StyleRule {
  kind: "rule";
  selector: string;
  declarations: Declaration[];
  context: string[];
}

/** An at-rule block kept as text (@keyframes, @font-face). */
export interface AtBlock {
  kind: "block";
  prelude: string;
  body: string;
  context: string[];
}

export type CssItem = StyleRule | AtBlock;

/** At-rules whose content is a list of rules, parsed like the top level. */
const GROUPING_AT_RULES = /^@(media|supports|document|-moz-document|layer)\b/i;

class Scanner {
  i = 0;
  readonly text: string;
  constructor(text: string) {
    this.text = text;
  }

  /** Skips whitespace and comments. */
  skip(): void {
    for (;;) {
      while (this.i < this.text.length && /\s/.test(this.text[this.i] as string)) this.i++;
      if (this.text.startsWith("/*", this.i)) {
        const end = this.text.indexOf("*/", this.i + 2);
        this.i = end < 0 ? this.text.length : end + 2;
      } else return;
    }
  }

  /**
   * Reads up to (not including) the first of `stops` at nesting depth 0,
   * outside strings, comments and parentheses. Comments are dropped.
   */
  readUntil(stops: string): string {
    let out = "";
    let depth = 0;
    while (this.i < this.text.length) {
      const c = this.text[this.i] as string;
      if (c === '"' || c === "'") {
        const start = this.i++;
        while (this.i < this.text.length && this.text[this.i] !== c) {
          if (this.text[this.i] === "\\") this.i++;
          this.i++;
        }
        this.i++;
        out += this.text.slice(start, this.i);
        continue;
      }
      if (this.text.startsWith("/*", this.i)) {
        const end = this.text.indexOf("*/", this.i + 2);
        this.i = end < 0 ? this.text.length : end + 2;
        continue;
      }
      if (depth === 0 && stops.includes(c)) return out;
      if (c === "(") depth++;
      else if (c === ")") depth--;
      out += c;
      this.i++;
    }
    return out;
  }

  /** The text of a {...} block starting at the "{", braces balanced; leaves i after "}". */
  readBlock(): string {
    const start = ++this.i;
    let depth = 1;
    while (this.i < this.text.length && depth > 0) {
      this.readUntil("{}");
      const c = this.text[this.i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      this.i++;
    }
    return this.text.slice(start, this.i - 1);
  }
}

function parseDeclarations(body: string): Declaration[] {
  const scanner = new Scanner(body);
  const out: Declaration[] = [];
  while (scanner.i < body.length) {
    scanner.skip();
    const text = scanner.readUntil(";").trim();
    scanner.i++;
    const colon = text.indexOf(":");
    if (colon <= 0) continue;
    const prop = text.slice(0, colon).trim().toLowerCase();
    let value = text.slice(colon + 1).trim();
    const important = /!\s*important\s*$/i.test(value);
    if (important) value = value.replace(/\s*!\s*important\s*$/i, "");
    out.push({ prop, value, important });
  }
  return out;
}

function parseList(scanner: Scanner, context: string[], out: CssItem[]): void {
  for (;;) {
    scanner.skip();
    if (scanner.i >= scanner.text.length) return;
    if (scanner.text[scanner.i] === "}") {
      scanner.i++;
      return;
    }
    const prelude = scanner.readUntil("{;}").trim();
    const c = scanner.text[scanner.i];
    if (c === ";" || c === "}" || c === undefined) {
      // A statement at-rule (@charset, @import) or a stray token.
      if (c === ";") scanner.i++;
      continue;
    }
    if (prelude.startsWith("@")) {
      if (GROUPING_AT_RULES.test(prelude)) {
        scanner.i++;
        parseList(scanner, [...context, prelude], out);
      } else {
        out.push({ kind: "block", prelude, body: scanner.readBlock(), context });
      }
      continue;
    }
    out.push({
      kind: "rule",
      selector: prelude,
      declarations: parseDeclarations(scanner.readBlock()),
      context,
    });
  }
}

/** The rules and at-rule blocks of a stylesheet, in order. */
export function parseCss(text: string): CssItem[] {
  const out: CssItem[] = [];
  parseList(new Scanner(text), [], out);
  return out;
}

// ---------------------------------------------------------------------------
// Colours

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** The brand magenta and the old accent it replaces. */
export const BRAND_MAGENTA: Rgb = { r: 0xe3, g: 0x13, b: 0x6b };
export const OLD_ACCENT: Rgb = { r: 0xd7, g: 0x2e, b: 0x63 };

function toHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === R) h = (G - B) / d + (G < B ? 6 : 0);
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  return { h: h * 60, s, l };
}

function fromHsl(h: number, s: number, l: number): Rgb {
  const k = (n: number): number => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return { r: f(0), g: f(8), b: f(4) };
}

/**
 * The old accent family: pinks and raspberry reds from hue 325 to 352
 * with some saturation, light tints and dark shades included. Plain reds
 * (errors, the red of an illustration) and greys are not accents.
 */
export function isAccent(color: Rgb): boolean {
  const { h, s, l } = toHsl(color);
  return h >= 325 && h <= 352 && s >= 0.3 && l >= 0.08 && l <= 0.97;
}

/**
 * An accent colour moved onto the brand magenta: the magenta's hue, the
 * saturation scaled and the lightness shifted by what separates the old
 * accent from the magenta, so lighter and darker shades stay lighter and
 * darker by the same step. The old accent itself becomes the magenta.
 */
export function mapAccent(color: Rgb): Rgb {
  if (color.r === OLD_ACCENT.r && color.g === OLD_ACCENT.g && color.b === OLD_ACCENT.b)
    return { ...BRAND_MAGENTA };
  const from = toHsl(OLD_ACCENT);
  const to = toHsl(BRAND_MAGENTA);
  const { s, l } = toHsl(color);
  const clamp = (v: number): number => Math.max(0, Math.min(1, v));
  return fromHsl(to.h, clamp((s * to.s) / from.s), clamp(l + to.l - from.l));
}

const hex2 = (n: number): string => n.toString(16).padStart(2, "0").toUpperCase();

function parseHex(digits: string): { rgb: Rgb; alpha: string | null } | null {
  let d = digits;
  if (d.length === 3 || d.length === 4) d = [...d].map((c) => c + c).join("");
  if (d.length !== 6 && d.length !== 8) return null;
  const n = (at: number): number => parseInt(d.slice(at, at + 2), 16);
  return { rgb: { r: n(0), g: n(2), b: n(4) }, alpha: d.length === 8 ? d.slice(6) : null };
}

/**
 * The value with every accent colour mapped (#rgb, #rrggbb, #rrggbbaa,
 * rgb() and rgba(), and %23-escaped hex inside data URIs). The second
 * result says whether anything changed.
 */
export function mapValue(value: string): { value: string; changed: boolean } {
  let changed = false;
  let out = value.replace(
    /(#|%23)([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z_-])/g,
    (match, mark: string, digits: string) => {
      const parsed = parseHex(digits);
      if (!parsed || !isAccent(parsed.rgb)) return match;
      changed = true;
      const { r, g, b } = mapAccent(parsed.rgb);
      return mark + hex2(r) + hex2(g) + hex2(b) + (parsed.alpha ? parsed.alpha.toUpperCase() : "");
    },
  );
  out = out.replace(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+%?)\s*)?\)/gi,
    (match, r: string, g: string, b: string, a: string | undefined) => {
      const rgb = { r: Number(r), g: Number(g), b: Number(b) };
      if (!isAccent(rgb)) return match;
      changed = true;
      const m = mapAccent(rgb);
      return a === undefined ? `rgb(${m.r}, ${m.g}, ${m.b})` : `rgba(${m.r}, ${m.g}, ${m.b}, ${a})`;
    },
  );
  return { value: out, changed };
}

// ---------------------------------------------------------------------------
// Cascade

/**
 * The property family a declaration competes in: a shorthand and its
 * longhands (border, border-top, border-top-color, ...) override each
 * other by order, so they are restated together.
 */
export function family(prop: string): string {
  const p = prop.replace(/^-(webkit|moz|ms|o)-/, "");
  for (const root of ["border", "background", "outline", "text-decoration", "column-rule"])
    if (p === root || p.startsWith(root + "-")) return root;
  return p;
}

/** Splits a selector list at top-level commas. */
export function splitSelectors(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  let quote: string | null = null;
  for (const c of list) {
    if (quote) {
      current += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += c;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

const LEGACY_PSEUDO_ELEMENTS = new Set(["before", "after", "first-line", "first-letter"]);

/** Selectors Level 4 specificity as [ids, classes, types], packed into one number. */
export function specificity(selector: string): number {
  let a = 0;
  let b = 0;
  let c = 0;
  let i = 0;
  const s = selector;
  const ident = (): string => {
    const m = /^-?(?:[_a-zA-Z]|\P{ASCII}|\\.)(?:[-\w]|\P{ASCII}|\\.)*/u.exec(s.slice(i));
    const name = m ? m[0] : "";
    i += name.length;
    return name;
  };
  const args = (): string => {
    // At "(": the balanced argument text.
    let depth = 0;
    const start = i + 1;
    for (; i < s.length; i++) {
      if (s[i] === "(") depth++;
      else if (s[i] === ")" && --depth === 0) break;
    }
    i++;
    return s.slice(start, i - 1);
  };
  const add = (n: number): void => {
    a += Math.floor(n / 1e6);
    b += Math.floor(n / 1e3) % 1e3;
    c += n % 1e3;
  };
  while (i < s.length) {
    const ch = s[i] as string;
    if (ch === "#") {
      i++;
      ident();
      a++;
    } else if (ch === ".") {
      i++;
      ident();
      b++;
    } else if (ch === "[") {
      while (i < s.length && s[i] !== "]") i++;
      i++;
      b++;
    } else if (ch === ":") {
      const element = s[i + 1] === ":";
      i += element ? 2 : 1;
      const name = ident().toLowerCase();
      const hasArgs = s[i] === "(";
      const inner = hasArgs ? args() : "";
      if (element || LEGACY_PSEUDO_ELEMENTS.has(name)) c++;
      else if (name === "where") {
        // adds nothing
      } else if (["not", "is", "matches", "-webkit-any", "-moz-any", "has"].includes(name)) {
        add(Math.max(0, ...splitSelectors(inner).map(specificity)));
      } else if ((name === "nth-child" || name === "nth-last-child") && / of /.test(inner)) {
        b++;
        add(Math.max(0, ...splitSelectors(inner.split(/ of /)[1] as string).map(specificity)));
      } else b++;
    } else if (/[a-zA-Z_\\]/.test(ch) || ch === "-" || ch.charCodeAt(0) > 127) {
      ident();
      c++;
    } else if (ch === "*") {
      i++;
    } else if (ch === "|") {
      // namespace separator
      i++;
    } else i++;
  }
  return a * 1e6 + b * 1e3 + c;
}

/**
 * What the last compound selector says for certain about the element it
 * matches: its tag, id, pseudo-element and exact attribute values. Two
 * selectors whose subjects contradict each other (div and span, ::before
 * and no pseudo-element, [type="radio"] and [type="checkbox"]) never
 * style the same box, so they don't compete in the cascade.
 */
export interface Subject {
  type: string | null;
  id: string | null;
  pseudoElement: string | null;
  attributes: Map<string, string>;
}

/** The last compound selector of a complex selector. */
function lastCompound(selector: string): string {
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i] as string;
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (depth === 0 && (c === ">" || c === "+" || c === "~" || /\s/.test(c))) start = i + 1;
  }
  return selector.slice(start).trim();
}

export function subjectOf(selector: string): Subject {
  const compound = lastCompound(selector);
  const subject: Subject = { type: null, id: null, pseudoElement: null, attributes: new Map() };
  const type = /^[a-zA-Z][\w-]*/.exec(compound);
  if (type) subject.type = type[0].toLowerCase();
  // Only the parts outside :not(...) and other functional pseudo-classes.
  let outside = "";
  let depth = 0;
  for (const c of compound) {
    if (c === "(") depth++;
    if (depth === 0) outside += c;
    if (c === ")") depth--;
  }
  const id = /#((?:[-\w]|\\.)+)/.exec(outside);
  if (id) subject.id = id[1] as string;
  const pseudo =
    /::?(before|after|first-line|first-letter|placeholder|selection|marker|backdrop|-webkit-[\w-]+|-moz-[\w-]+|-ms-[\w-]+)(?![\w-])/i.exec(
      outside,
    );
  if (
    pseudo &&
    (outside.includes("::") || LEGACY_PSEUDO_ELEMENTS.has((pseudo[1] as string).toLowerCase()))
  )
    subject.pseudoElement = (pseudo[1] as string).toLowerCase();
  for (const m of outside.matchAll(/\[\s*([-\w]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([-\w]+))\s*\]/g))
    subject.attributes.set((m[1] as string).toLowerCase(), m[2] ?? m[3] ?? m[4] ?? "");
  return subject;
}

/** False when the two subjects can never be the same box. */
export function mayCoincide(a: Subject, b: Subject): boolean {
  if (a.pseudoElement !== b.pseudoElement) return false;
  if (a.type && b.type && a.type !== b.type) return false;
  if (a.id && b.id && a.id !== b.id) return false;
  for (const [name, value] of a.attributes) {
    const other = b.attributes.get(name);
    if (other !== undefined && other !== value) return false;
  }
  return true;
}

/** The text of one item, as it goes into the output. */
function itemText(item: CssItem, declarations?: readonly Declaration[]): string {
  let body: string;
  if (item.kind === "block") body = `${item.prelude} {${item.body}}`;
  else {
    const decls = (declarations ?? item.declarations)
      .map((d) => `  ${d.prop}: ${d.value}${d.important ? " !important" : ""};`)
      .join("\n");
    body = `${item.selector} {\n${decls}\n}`;
  }
  for (const prelude of [...item.context].reverse()) body = `${prelude} {\n${body}\n}`;
  return body;
}

export interface AccentCss {
  css: string;
  /** Declarations with a mapped colour. */
  mapped: number;
  /** Declarations restated unchanged to keep the cascade. */
  restated: number;
  /** Mapped colour pairs, old → new, with how often each occurred. */
  colors: Map<string, number>;
}

/**
 * Relative url(...) references moved by `prefix`: the restated rules live
 * in another folder than the old stylesheet, and a relative URL resolves
 * against the stylesheet that holds it.
 */
export function rebaseUrls(value: string, prefix: string): string {
  if (!prefix) return value;
  return value.replace(
    // Not data:, other schemes, absolute paths or fragments (also the
    // %23-escaped ones inside SVG data URIs).
    /url\(\s*(["']?)(?![a-z][a-z0-9+.-]*:|\/|#|%23)([^"')]+)\1\s*\)/gi,
    (_match, quote: string, url: string) => `url(${quote}${prefix}${url}${quote})`,
  );
}

export interface AccentOptions {
  /** Comment put at the top. */
  header?: string;
  /**
   * Selectors that can never match an element in the new app (classes
   * only dropped features used); they are left out.
   */
  dead?: RegExp;
  /** Put before relative URLs (rebaseUrls), e.g. "../" for a stylesheet one folder down. */
  urlPrefix?: string;
}

/** The accent stylesheet for one old theme stylesheet. */
export function accentCss(oldCss: string, options: AccentOptions = {}): AccentCss {
  const { header = "", dead, urlPrefix = "" } = options;
  const items = parseCss(oldCss).flatMap((item): CssItem[] => {
    if (item.kind !== "rule" || !dead) return [item];
    const live = splitSelectors(item.selector).filter((selector) => !dead.test(selector));
    if (live.length === 0) return [];
    return [{ ...item, selector: live.join(",\n") }];
  });
  // Flat list of declarations in cascade order.
  interface Entry {
    item: number;
    decl: number;
    family: string;
    important: boolean;
    selectors: { spec: number; subject: Subject }[];
  }
  const entries: Entry[] = [];
  const entryAt = new Map<string, Entry>();
  items.forEach((item, index) => {
    if (item.kind !== "rule") return;
    const selectors = splitSelectors(item.selector).map((selector) => ({
      spec: specificity(selector),
      subject: subjectOf(selector),
    }));
    item.declarations.forEach((d, decl) => {
      const entry = {
        item: index,
        decl,
        family: family(d.prop),
        important: d.important,
        selectors,
      };
      entries.push(entry);
      entryAt.set(index + ":" + decl, entry);
    });
  });
  const keep = new Set<Entry>();
  const colors = new Map<string, number>();
  let mapped = 0;
  const mappedValue = new Map<Entry, string>();
  for (const entry of entries) {
    const d = (items[entry.item] as StyleRule).declarations[entry.decl] as Declaration;
    const result = mapValue(d.value);
    if (result.changed) {
      keep.add(entry);
      mappedValue.set(entry, result.value);
      mapped++;
      for (const m of d.value.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)) {
        const after = mapValue(m[0]);
        if (after.changed) {
          const key = `${m[0].toLowerCase()} -> ${after.value}`;
          colors.set(key, (colors.get(key) ?? 0) + 1);
        }
      }
    }
  }
  // Closure: a later declaration in the same family and importance with a
  // selector of the same specificity as a kept one's, which may style the
  // same box, could have beaten it, so it is restated too.
  const byFamily = new Map<string, Entry[]>();
  for (const entry of entries) {
    const list = byFamily.get(entry.family) ?? [];
    list.push(entry);
    byFamily.set(entry.family, list);
  }
  for (const list of byFamily.values()) {
    const kept = { true: new Map<number, Subject[]>(), false: new Map<number, Subject[]>() };
    for (const entry of list) {
      const seen = kept[entry.important ? "true" : "false"];
      if (
        !keep.has(entry) &&
        entry.selectors.some(({ spec, subject }) =>
          (seen.get(spec) ?? []).some((other) => mayCoincide(subject, other)),
        )
      )
        keep.add(entry);
      if (keep.has(entry))
        for (const { spec, subject } of entry.selectors) {
          const subjects = seen.get(spec) ?? [];
          subjects.push(subject);
          seen.set(spec, subjects);
        }
    }
  }
  // Keyframes with an accent colour are restated whole (the last
  // @keyframes of a name wins); @font-face never has colours.
  const parts: string[] = [];
  let restated = 0;
  items.forEach((item, index) => {
    if (item.kind === "block") {
      if (/keyframes/i.test(item.prelude)) {
        const result = mapValue(item.body);
        if (result.changed)
          parts.push(itemText({ ...item, body: rebaseUrls(result.value, urlPrefix) }));
      }
      return;
    }
    const decls: Declaration[] = [];
    item.declarations.forEach((d, decl) => {
      const entry = entryAt.get(index + ":" + decl) as Entry;
      if (!keep.has(entry)) return;
      const value = mappedValue.get(entry);
      if (value === undefined) restated++;
      decls.push({ ...d, value: rebaseUrls(value ?? d.value, urlPrefix) });
    });
    if (decls.length > 0) parts.push(itemText(item, decls));
  });
  return { css: header + parts.join("\n") + "\n", mapped, restated, colors };
}
