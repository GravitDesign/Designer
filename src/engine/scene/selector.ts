// Old: chunk.vendor.js module 507 (the node selector engine, no G name).
/**
 * CSS-like selectors over the node tree ("page > layer:active",
 * "rectangle.tag", "[name=Foo]", ":selected"), adapted by the old engine
 * from the Slick selector engine. Loading this module gives every node
 * `queryCount`, `queryAll`, `querySingle`, `matches` and `filtered`.
 *
 * Several old quirks are kept on purpose (QUESTIONS.md, "Selector engine
 * quirks"):
 * - `:first-child` (and `:first`) never matches: it asks `index(node, 0)`,
 *   which counts children from 1.
 * - `:nth-child(3)` matches the second child (the `a - 1` below), `:even`
 *   matches the 1st, 3rd, ... child and `:odd` the 2nd, 4th, ...
 * - "#id" asks the scene for `getById`, which GScene doesn't have, so it
 *   throws; a single ".tag" passes the tag text where a RegExp is expected,
 *   which throws once a node has tags (no node class has the Tag mixin).
 * - The "^" combinator calls "+" with its arguments shifted, which throws
 *   when the first child doesn't match and has a next sibling.
 * - In a list ("a, b") the later groups don't skip nodes an earlier group
 *   found, so a node can appear twice.
 */
import { hasMixin } from "../core/object.ts";
import { ElementFlag, isElement } from "./element-change.ts";
import { NodeFlag } from "./node-change.ts";
import { Identity, Tag, type IdentityNode } from "./node-identity.ts";
import { Properties, type PropertiesNode } from "./node-properties.ts";
import { Node } from "./node.ts";

declare module "./node.ts" {
  interface Node {
    /** Number of nodes `queryAll(selector)` finds. */
    queryCount(selector: string): number;
    /** Every node below this one that matches the selector, in document order. */
    queryAll(selector: string): Node[];
    /** The first node `queryAll` would find, or null. */
    querySingle(selector: string): Node | null;
    /** Whether this node matches the selector. */
    matches(selector: string): boolean;
    /** Whether this node passes `filter` (matches exactly one selector group). */
    filtered(selector: string): boolean;
  }
}

/** Per-query state shared by the matchers (cached sibling positions). */
interface MatchState {
  positions?: Record<number, number>;
}

/** A compiled test: node and query state. */
type Matcher = (node: Node, state?: MatchState) => unknown;

/** One condition: node, the condition's value, query state. */
type Condition = (node: Node, value: never, state?: MatchState) => unknown;

/** Decides whether a found node is new to the result (deduplication). */
type ResultFilter = (node: Node) => unknown;

interface PropertyCondition {
  name: string;
  operator: string | null;
  value: string | null;
  escaped?: string;
  pattern?: RegExp;
}

interface PseudoCondition {
  name: string;
  value: string | null;
}

/**
 * One compound selector of a group, with the combinator that leads to it.
 * `compute` adds the compiled fields (match, combine, search, ...).
 */
interface SelectorPart {
  ident: string[];
  tags: string[];
  properties: PropertyCondition[];
  pseudos: PseudoCondition[];
  combinator: string | null;
  first?: boolean;
  last?: boolean;
  id?: string;
  nodeName?: string;
  simple?: boolean;
  matchAux?: Matcher;
  match?: Matcher;
  combine?: Combinator;
  search?: (context: Node) => Node[];
}

type Combinator = (
  found: Node[],
  context: Node,
  part: SelectorPart,
  state: MatchState,
  filter: ResultFilter,
  simpleFirst?: boolean,
) => Node[];

/** What `:nth-child` and friends parse their argument into. */
interface NthSpec {
  a?: number;
  b?: number;
  special: string;
}

const cache: Record<string, Selector> = {};

/** The cached selector for a selector text (the old `s(text)`). */
function select(text: unknown): Selector {
  const trimmed = "string" == typeof text ? text.replace(/^\s+|\s+$/g, "") : "";
  return cache[trimmed] || (cache[trimmed] = new Selector(trimmed));
}

const alwaysTrue = (): boolean => true;

/**
 * Chains a condition onto a matcher. The old helper had a fourth "test
 * first" flag that no caller set; it is left out.
 */
function chain(previous: Matcher | null, condition: Condition, value?: unknown): Matcher {
  const test = condition as (node: Node, value: unknown, state?: MatchState) => unknown;
  return previous
    ? (node, state) => previous(node, state) && test(node, value, state)
    : (node, state) => test(node, value, state);
}

function newPart(combinator: string | null): SelectorPart {
  return { ident: [], tags: [], properties: [], pseudos: [], combinator };
}

let tokenizer: RegExp;

export class Selector {
  static combinators: Record<string, Combinator>;
  static pseudos: Record<string, Condition>;
  static propertyOperators: Record<
    string,
    (value: string, escaped: string, property: PropertyCondition) => string
  >;
  /** Throw on syntax errors instead of matching nothing (never set in the old app). */
  static verbose = false;

  /** The cached selector for a text. */
  static get(text: unknown): Selector {
    return select(text);
  }

  static parse(text: unknown, plain?: boolean): SelectorPart[] {
    return select(text).parse(plain);
  }

  static queryAll(text: unknown, context: Node, append?: Node[] | null): Node[] {
    return select(text).queryAll(context, append);
  }

  static querySingle(text: unknown, context: Node, append?: Node[] | null): Node | undefined {
    return select(text).querySingle(context, append);
  }

  static match(text: unknown, node: Node, root?: Node | null): boolean {
    return select(text).match(node, root);
  }

  static filter(text: unknown, nodes: readonly Node[]): Node[] {
    return select(text).filter(nodes);
  }

  static escapeRegExp(text: string): string {
    return text.replace(/[-.*+?^${}()|[\]/\\]/g, "\\$&");
  }

  /** Rebuilds the tokenizer from the combinators and property operators. */
  static recompile(): void {
    const combinators = [","];
    const operators = ["!"];
    for (const name in Selector.combinators) {
      if (" " != name)
        combinators[name.length > 1 ? "unshift" : "push"](Selector.escapeRegExp(name));
    }
    for (const name in Selector.propertyOperators) operators.push(name);
    tokenizer = new RegExp(
      "[\\w\\u00a1-\\uFFFF][\\w\\u00a1-\\uFFFF-]*|[#.](?:[\\w\\u00a1-\\uFFFF-]|\\\\:|\\\\.)+|[ \\t\\r\\n\\f](?=[\\w\\u00a1-\\uFFFF*#.[:])|[ \\t\\r\\n\\f]*(" +
        combinators.join("|") +
        ")[ \\t\\r\\n\\f]*|\\[([\\w\\u00a1-\\uFFFF-]+)[ \\t\\r\\n\\f]*(?:([" +
        operators.join("") +
        "]?=)[ \\t\\r\\n\\f]*(?:\"([^\"]*)\"|'([^']*)'|([^\\]]*)))?]|:([-\\w\\u00a1-\\uFFFF]+)(?:\\((?:\"([^\"]*)\"|'([^']*)'|([^)]*))\\))?|\\*|(.+)",
      "g",
    );
  }

  /**
   * The old engine copied array-likes with this fallback (its first choice
   * referred to a global that doesn't exist): an array comes back as is.
   */
  static toArray(list: ArrayLike<Node>): Node[] {
    if (list instanceof Array) return list;
    let length = list.length;
    const out = new Array<Node>(length);
    while (length--) out[length] = list[length] as Node;
    return out;
  }

  /** A number per node, kept on the node as `__slyUid` like the old engine did. */
  static getUid(node: Node): number {
    const carrier = node as unknown as { __slyUid?: number };
    return carrier.__slyUid || (carrier.__slyUid = nextUid++);
  }

  static parseNth(text: string): NthSpec | false {
    const cached = nthCache[text];
    if (cached) return cached;
    const match = text.match(/^([+-]?\d*)?([a-z]+)?([+-]?\d*)?$/);
    if (!match) return false;
    let step = parseInt(match[1] as string, 10);
    let offset = (parseInt(match[3] as string, 10) || 0) - 1;
    if ((step = isNaN(step) ? 1 : step)) {
      while (offset < 1) offset += step;
      while (offset >= step) offset -= step;
    }
    let spec: NthSpec;
    switch (match[2]) {
      case "n":
        spec = { a: step, b: offset, special: "n" };
        break;
      case "odd":
        spec = { a: 2, b: 0, special: "n" };
        break;
      case "even":
        spec = { a: 2, b: 1, special: "n" };
        break;
      case "first":
        spec = { a: 0, special: "index" };
        break;
      case "last":
        spec = { special: "last-child" };
        break;
      case "only":
        spec = { special: "only-child" };
        break;
      default:
        spec = { a: step ? step - 1 : offset, special: "index" };
    }
    return (nthCache[text] = spec);
  }

  declare text: string;
  declare plain?: SelectorPart[];
  declare parsed?: SelectorPart[];

  constructor(text: string) {
    this.text = text;
  }

  queryAll(context: Node, append?: Node[] | null): Node[] {
    if (!(context && context instanceof Node)) {
      throw new Error("Missing context or invalid context");
    }
    const initialSeen: Record<number, boolean> = {};
    const state: MatchState = {};
    let seen = initialSeen;
    const isNew: ResultFilter = (node) => {
      const uid = Selector.getUid(node);
      return seen[uid] ? null : (seen[uid] = true);
    };
    let result = append;
    if (result && result.length) {
      for (let i = 0, node; (node = result[i]); i++) isNew(node);
    }
    const parts = this.parse();
    if (!parts.length) return [];
    let found: Node[];
    let contexts: Node[] = [];
    for (let i = 0, part; (part = parts[i]); i++) {
      let filter = isNew;
      if (part.first) {
        if (!result) filter = alwaysTrue;
        if (part.combinator) contexts = [context];
      }
      if (part.last && result) {
        seen = initialSeen;
        found = result;
      } else {
        seen = {};
        found = [];
      }
      const combine = part.combine as Combinator;
      if (part.combinator) {
        for (let j = 0, count = contexts.length; j < count; j++) {
          found = combine.call(part, found, contexts[j] as Node, part, state, filter);
        }
      } else found = combine.call(part, found, context, part, state, filter, !found.length);
      if (part.last) {
        if (found.length) result = found;
      } else contexts = found;
    }
    return result || [];
  }

  querySingle(context: Node, append?: Node[] | null): Node | undefined {
    return this.queryAll(context, append)[0];
  }

  match(node: Node, root?: Node | null): boolean {
    if (1 == this.parse().length) return !!(this.parse()[0]?.match as Matcher)(node, {});
    if (!root) for (root = node; root.getParent();) root = root.getParent() as Node;
    const found = this.queryAll(root);
    for (let i = found.length; i--;) if (found[i] == node) return true;
    return false;
  }

  /** The nodes matching a group, once per matching group. */
  filter(nodes: readonly Node[]): Node[] {
    const out: Node[] = [];
    const parts = this.parse();
    for (let i = 0, node; (node = nodes[i]); i++) {
      for (let j = 0; j < parts.length; ++j) {
        if ((parts[j]?.match as Matcher)(node)) out.push(node);
      }
    }
    return out;
  }

  /** Tokenizes the text into parts; `plain` skips compiling them. Cached. */
  parse(plain?: boolean): SelectorPart[] {
    const key = plain ? "plain" : "parsed";
    const cached = this[key];
    if (cached) return cached;
    const text = this.text;
    const finish = plain ? (part: SelectorPart) => part : computePart;
    const parts: SelectorPart[] = [];
    let part = newPart(null);
    part.first = true;
    const next = (combinator: string | null) => {
      parts.push(finish(part));
      part = newPart(combinator);
    };
    let match: RegExpExecArray | null;
    let token = "";
    for (tokenizer.lastIndex = 0; (match = tokenizer.exec(text));) {
      if (match[11]) {
        if (Selector.verbose) {
          throw SyntaxError(
            'Syntax error, "' +
              token +
              '" unexpected at #' +
              tokenizer.lastIndex +
              ' in "' +
              text +
              '"',
          );
        }
        return (this[key] = []);
      }
      switch ((token = match[0]).charAt(0)) {
        case ".":
          part.tags.push(token.slice(1).replace(/\\/g, ""));
          break;
        case "#":
          part.id = token.slice(1).replace(/\\/g, "");
          break;
        case "[":
          part.properties.push({
            name: match[2] as string,
            operator: match[3] || null,
            value: match[4] || match[5] || match[6] || null,
          });
          break;
        case ":":
          part.pseudos.push({
            name: match[7] as string,
            value: match[8] || match[9] || match[10] || null,
          });
          break;
        default: {
          // A whitespace token is the descendant combinator.
          if (" \t\r\n\f".indexOf(token.charAt(0)) >= 0) match[1] = match[1] || " ";
          const combinator = match[1];
          if (combinator) {
            if ("," == combinator) {
              part.last = true;
              next(null);
              part.first = true;
              continue;
            }
            if (part.first && !part.ident.length) part.combinator = combinator;
            else next(combinator);
          } else if ("*" != token) part.nodeName = token;
        }
      }
      part.ident.push(token);
    }
    part.last = true;
    parts.push(finish(part));
    return (this[key] = parts);
  }
}

let nextUid = 1;
const nthCache: Record<string, NthSpec> = {};

const matchesId: Condition = (node: Node, id: string) =>
  !!node.hasMixin(Identity) && id === (node as IdentityNode).getId();

const matchesName: Condition = (node: Node, name: string) =>
  node.getNodeName().toUpperCase() == name.toUpperCase();

const tagPattern = (tag: string) =>
  new RegExp("(?:^|[ \\t\\r\\n\\f])" + tag + "(?:$|[ \\t\\r\\n\\f])");

const matchesTag: Condition = (node: Node, pattern: RegExp) => {
  if (hasMixin(node, Tag)) {
    const tags = (node as unknown as { getTags(): unknown }).getTags();
    return tags && pattern.test(tags as string);
  }
  return false;
};

function compileProperty(property: PropertyCondition): PropertyCondition {
  if (!property.operator || !property.value) return property;
  const operator = Selector.propertyOperators[property.operator];
  if (operator) {
    property.escaped = Selector.escapeRegExp(property.value);
    property.pattern = new RegExp(operator(property.value, property.escaped, property));
  }
  return property;
}

const matchesProperty: Condition = (node: Node, property: PropertyCondition) => {
  const value = node.hasMixin(Properties)
    ? (node as PropertiesNode).getProperty(property.name)
    : null;
  switch (property.operator) {
    case null:
      return value;
    case "=":
      return value == property.value;
    case "!=":
      return value != property.value;
  }
  // An operator without a pattern ("==") throws here, as before.
  return !(!value && property.value) && (property.pattern as RegExp).test(value as string);
};

/** Compiles a part: its first test (match), the remaining tests and how to find candidates. */
function computePart(part: SelectorPart): SelectorPart {
  let rest: Matcher | null = null;
  let first: Matcher | null = null;
  let search: ((context: Node) => Node[]) | undefined;
  let searchMatchesName = false;
  const name = part.nodeName;
  const id = part.id;
  const tags = part.tags;
  if (id) {
    searchMatchesName = true;
    first = chain(null, matchesId, id);
    search = (context) => {
      // GScene has no getById: this throws (see the header).
      const scene = (context as unknown as { _scene: { getById(id: string): Node | null } })._scene;
      const node = scene.getById(id);
      return !node || (name && !matchesName(node, name as never)) ? [] : [node];
    };
  }
  if (tags.length > 0) {
    if (search || 1 != tags.length) {
      for (let i = 0, tag; (tag = tags[i]); i++) rest = chain(rest, matchesTag, tagPattern(tag));
    } else {
      searchMatchesName = true;
      first = chain(first, matchesTag, tagPattern(tags[0] as string));
      search = (context) => {
        const out: Node[] = [];
        const nodes = context.getNodesByName(name || "*");
        for (let i = 0, node; (node = nodes[i]); i++) {
          // The tag text where a RegExp belongs (see the header).
          if (matchesTag(node, tags[0] as never)) out.push(node);
        }
        return out;
      };
    }
  }
  if (name) {
    if (search) {
      if (!searchMatchesName) rest = chain(rest, matchesName, name);
    } else {
      first = chain(first, matchesName, name);
      search = (context) => context.getNodesByName(name);
    }
  } else if (!search) search = (context) => context.getNodesByName("*");
  for (let i = 0, pseudo; (pseudo = part.pseudos[i]); i++) {
    if ("not" == pseudo.name) {
      const negated = select(pseudo.value);
      rest = chain(
        rest,
        ((node: Node, target: { match(node: Node): unknown }) => !target.match(node)) as Condition,
        1 == negated.parse().length ? (negated.parsed as SelectorPart[])[0] : negated,
      );
    } else {
      const condition = Selector.pseudos[pseudo.name];
      if (condition) rest = chain(rest, condition, pseudo.value);
    }
  }
  for (let i = 0, property; (property = part.properties[i]); i++) {
    rest = chain(rest, matchesProperty, compileProperty(property));
  }
  if ((part.simple = !rest)) part.matchAux = alwaysTrue;
  else {
    const remaining = rest;
    part.matchAux = remaining;
    // The old code chained the composite as a condition, so it got the
    // condition's (undefined) value as its state.
    first = chain(first, ((node: Node, value: unknown) =>
      remaining(node, value as MatchState | undefined)) as Condition);
  }
  part.match = first || alwaysTrue;
  part.combine = Selector.combinators[part.combinator || " "];
  part.search = search;
  return part;
}

Selector.combinators = {
  " ": (found, context, part, state, filter, simpleFirst) => {
    const candidates = (part.search as (context: Node) => Node[])(context);
    if (simpleFirst && part.simple) return Selector.toArray(candidates);
    const matchAux = part.matchAux as Matcher;
    for (let i = 0, node; (node = candidates[i]); i++) {
      if (filter(node) && matchAux(node, state)) found.push(node);
    }
    return found;
  },
  ">": (found, context, part, state, filter) => {
    const candidates = (part.search as (context: Node) => Node[])(context);
    for (let i = 0, node; (node = candidates[i]); i++) {
      if (node.getParent() == context && filter(node) && (part.matchAux as Matcher)(node, state)) {
        found.push(node);
      }
    }
    return found;
  },
  "+": (found, context, part, state, filter) => {
    let node: Node | null = context;
    while ((node = node.getNext())) {
      if (filter(node) && (part.match as Matcher)(node, state)) found.push(node);
      break;
    }
    return found;
  },
  "~": (found, context, part, state, filter) => {
    let node: Node | null = context;
    while ((node = node.getNext()) && filter(node)) {
      if ((part.match as Matcher)(node, state)) found.push(node);
    }
    return found;
  },
  "<": (found, context, part, state, filter) => {
    let node: Node | null = context;
    while ((node = node.getParent()) && !("scene" === Node.getName(node))) {
      if (filter(node) && (part.match as Matcher)(node, state)) found.push(node);
    }
    return found;
  },
  "^": (found, context, part, state, filter) => {
    const node = (context as unknown as { getFirstChild(): Node | null }).getFirstChild();
    if (node) {
      if (filter(node) && (part.match as Matcher)(node, state)) found.push(node);
      else {
        // Arguments shifted as in the old code: the node as the state and
        // the state as the filter.
        found = (Selector.combinators["+"] as Combinator)(
          found,
          node,
          part,
          node as unknown as MatchState,
          state as unknown as ResultFilter,
        );
      }
    }
    return found;
  },
  "++": (found, context, part, state, filter) => {
    let node: Node | null = context;
    while ((node = node.getNext())) {
      if (filter(node) && (part.match as Matcher)(node, state)) found.push(node);
    }
    return found;
  },
  "--": (found, context, part, state, filter) => {
    let node: Node | null = context;
    while ((node = node.getPrevious())) {
      if (filter(node) && (part.match as Matcher)(node, state)) found.push(node);
    }
    return found;
  },
};

const pseudos: Record<string, Condition> = {
  "first-child": (node: Node) => (pseudos.index as Condition)(node, 0 as never),
  "last-child": (node: Node) => null == node.getNext(),
  "only-child": (node: Node) => null == node.getPrevious() && null == node.getNext(),
  "nth-child": (node: Node, value: string | null, state?: MatchState) => {
    const nth = Selector.parseNth(value || "n");
    const special = nth === false ? undefined : nth.special;
    if ("n" != special) {
      // An unparsable argument looks up pseudos["undefined"] and throws.
      const condition = pseudos[String(special)] as Condition;
      return condition(node, (nth === false ? undefined : nth.a) as never, state);
    }
    const spec = nth as NthSpec;
    (state = state || {}).positions = state.positions || {};
    const positions = state.positions;
    const uid = Selector.getUid(node);
    if (!positions[uid]) {
      let position = 0;
      let previous: Node | null = node;
      while ((previous = previous.getPrevious())) {
        position++;
        const known = positions[Selector.getUid(previous)];
        if (null != known) {
          position = known + position;
          break;
        }
      }
      positions[uid] = position;
    }
    return (positions[uid] as number) % (spec.a as number) == spec.b;
  },
  empty: () => false,
  contains: () => false,
  // `position` may be the text of ":eq(2)"; the old loose comparisons
  // converted it to a number.
  index: (node: Node, position: number | string) => {
    const target = Number(position);
    let count = 1;
    let previous: Node | null = node;
    while ((previous = previous.getPrevious())) if (++count > target) return false;
    return count == target;
  },
  even: (node: Node, _value: unknown, state?: MatchState) =>
    (pseudos["nth-child"] as Condition)(node, "2n+1" as never, state),
  odd: (node: Node, _value: unknown, state?: MatchState) =>
    (pseudos["nth-child"] as Condition)(node, "2n" as never, state),
  has: (node: Node, selector: string) => Selector.querySingle(selector, node),
  active: (node: Node) => node.hasFlag(NodeFlag.Active),
  selected: (node: Node) => node.hasFlag(NodeFlag.Selected),
  hidden: (node: Node) => isElement(node) && node.hasFlag(ElementFlag.Hidden),
  visible: (node: Node) => isElement(node) && !node.hasFlag(ElementFlag.Hidden),
};
pseudos.first = pseudos["first-child"] as Condition;
pseudos.last = pseudos["last-child"] as Condition;
pseudos.nth = pseudos["nth-child"] as Condition;
pseudos.eq = pseudos.index as Condition;
Selector.pseudos = pseudos;

Selector.propertyOperators = {
  "*=": (_value, escaped) => escaped,
  "^=": (_value, escaped) => "^" + escaped,
  "$=": (value) => value + "$",
  "~=": (_value, escaped) => "(?:^|[ \\t\\r\\n\\f])" + escaped + "(?:$|[ \\t\\r\\n\\f])",
  "|=": (_value, escaped) => "(?:^|\\|)" + escaped + "(?:$|\\|)",
  "/=": (value) => value,
};

Selector.recompile();

const nodePrototype = Node.prototype;
nodePrototype.queryCount = function (this: Node, selector: string): number {
  const found = Selector.queryAll(selector, this);
  return found ? found.length : 0;
};
nodePrototype.queryAll = function (this: Node, selector: string): Node[] {
  return Selector.queryAll(selector, this);
};
nodePrototype.querySingle = function (this: Node, selector: string): Node | null {
  const found = Selector.querySingle(selector, this);
  return found || null;
};
nodePrototype.matches = function (this: Node, selector: string): boolean {
  return Selector.match(selector, this);
};
nodePrototype.filtered = function (this: Node, selector: string): boolean {
  return 1 === Selector.filter(selector, [this]).length;
};
