/**
 * A small DOM for the menu and toolbar tests in Vitest's node environment:
 * elements with an ordered class list and inline style (serialized like
 * the browser's attributes), children, simple selectors (".a.b", "tag",
 * ":scope > .a", "a > b" with those parts), bubbling events and a box
 * per element that tests set (`box`). getComputedStyle reports the inline
 * display and the box size, no padding or border.
 */

type Listener = (event: FakeEvent) => void;

interface ListenerEntry {
  listener: Listener;
  capture: boolean;
}

export interface FakeEventInit {
  button?: number;
  cancelable?: boolean;
  keyCode?: number;
  pageX?: number;
  pageY?: number;
  clientX?: number;
  clientY?: number;
  shiftKey?: boolean;
  bubbles?: boolean;
  target?: FakeElement;
}

export class FakeEvent {
  readonly type: string;
  button: number;
  cancelable: boolean;
  keyCode: number;
  which: number;
  pageX: number;
  pageY: number;
  clientX: number;
  clientY: number;
  shiftKey: boolean;
  bubbles: boolean;
  target: FakeElement | FakeDocument | null = null;
  currentTarget: FakeElement | FakeDocument | null = null;
  defaultPrevented = false;
  propagationStopped = false;
  immediateStopped = false;

  constructor(type: string, init: FakeEventInit = {}) {
    this.type = type;
    this.button = init.button ?? 0;
    this.cancelable = init.cancelable ?? true;
    this.keyCode = init.keyCode ?? 0;
    this.which = this.keyCode;
    this.pageX = init.pageX ?? 0;
    this.pageY = init.pageY ?? 0;
    this.clientX = init.clientX ?? this.pageX;
    this.clientY = init.clientY ?? this.pageY;
    this.shiftKey = init.shiftKey ?? false;
    this.bubbles = init.bubbles ?? true;
  }

  preventDefault(): void {
    if (this.cancelable) this.defaultPrevented = true;
  }

  stopPropagation(): void {
    this.propagationStopped = true;
  }

  stopImmediatePropagation(): void {
    this.propagationStopped = true;
    this.immediateStopped = true;
  }
}

class FakeClassList {
  constructor(private readonly _owner: FakeElement) {}

  private get _list(): string[] {
    return this._owner._classes;
  }

  get length(): number {
    return this._list.length;
  }

  add(...names: string[]): void {
    for (const name of names) if (!this._list.includes(name)) this._list.push(name);
  }

  remove(...names: string[]): void {
    for (const name of names) {
      const index = this._list.indexOf(name);
      if (index >= 0) this._list.splice(index, 1);
    }
  }

  contains(name: string): boolean {
    return this._list.includes(name);
  }

  toggle(name: string, force?: boolean): boolean {
    const on = force === undefined ? !this.contains(name) : force;
    if (on) this.add(name);
    else this.remove(name);
    return on;
  }

  [Symbol.iterator](): Iterator<string> {
    return this._list.slice()[Symbol.iterator]();
  }
}

class FakeStyle {
  /** Declarations in the order they were first set. */
  readonly _decls: [string, string][] = [];
  /** Whether a declaration was ever set: then the attribute exists (maybe empty). */
  _touched = false;

  setProperty(name: string, value: string): void {
    const index = this._decls.findIndex(([n]) => n === name);
    if (value === "" || value === null) {
      if (index >= 0) {
        this._decls.splice(index, 1);
        this._touched = true;
      }
      return;
    }
    this._touched = true;
    if (index >= 0) (this._decls[index] as [string, string])[1] = value;
    else this._decls.push([name, value]);
  }

  removeProperty(name: string): string {
    const value = this.getPropertyValue(name);
    this.setProperty(name, "");
    return value;
  }

  getPropertyValue(name: string): string {
    const found = this._decls.find(([n]) => n === name);
    return found ? found[1] : "";
  }

  get display(): string {
    return this.getPropertyValue("display");
  }

  set display(value: string) {
    this.setProperty("display", value);
  }

  get cssText(): string {
    return this._decls.map(([n, v]) => `${n}: ${v};`).join(" ");
  }
}

/** A selector part: tag and classes. */
interface Compound {
  tag: string | null;
  classes: string[];
}

function parseCompound(text: string): Compound {
  const parts = text.split(".");
  const tag = parts[0] ? (parts[0] as string).toLowerCase() : null;
  return { tag, classes: parts.slice(1).filter(Boolean) };
}

function matchesCompound(element: FakeElement, compound: Compound): boolean {
  if (compound.tag && compound.tag !== "*" && element.tagName.toLowerCase() !== compound.tag)
    return false;
  return compound.classes.every((c) => element.classList.contains(c));
}

export class FakeElement {
  readonly tagName: string;
  readonly nodeType = 1;
  readonly _classes: string[] = [];
  readonly classList: FakeClassList;
  readonly style = new FakeStyle();
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  private _text = "";
  private readonly _listeners = new Map<string, ListenerEntry[]>();
  /** The layout box tests give the element (client coordinates). */
  box = { left: 0, top: 0, width: 0, height: 0 };
  value = "";

  constructor(
    tagName: string,
    readonly ownerDocument: FakeDocument,
  ) {
    this.tagName = tagName.toUpperCase();
    this.classList = new FakeClassList(this);
  }

  get className(): string {
    return this._classes.join(" ");
  }

  set className(value: string) {
    this._classes.length = 0;
    for (const name of value.split(/\s+/)) if (name) this.classList.add(name);
  }

  setAttribute(name: string, value: string): void {
    if (name === "class") this.className = value;
    else this.attributes.set(name, String(value));
  }

  getAttribute(name: string): string | null {
    if (name === "class") return this._classes.length ? this.className : null;
    if (name === "style") return this.style._touched ? this.style.cssText : null;
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  get textContent(): string {
    return this._text + this.children.map((c) => c.textContent).join("");
  }

  set textContent(value: string) {
    for (const child of this.children.slice()) child.remove();
    this._text = value;
  }

  /** Only for text content, escaped like the browser serializes a text node. */
  get innerHTML(): string {
    if (this.children.length) throw new Error("the fake innerHTML only serializes text");
    return this._text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /** Doesn't parse: the markup is kept as the element's text. */
  set innerHTML(value: string) {
    this.textContent = value;
  }

  get firstElementChild(): FakeElement | null {
    return this.children[0] ?? null;
  }

  private _adopt(node: FakeElement | string): FakeElement | null {
    if (typeof node === "string") {
      this._text += node;
      return null;
    }
    node.remove();
    node.parentElement = this;
    return node;
  }

  append(...nodes: (FakeElement | string)[]): void {
    for (const node of nodes) {
      const adopted = this._adopt(node);
      if (adopted) this.children.push(adopted);
    }
  }

  appendChild(node: FakeElement): FakeElement {
    this.append(node);
    return node;
  }

  prepend(...nodes: FakeElement[]): void {
    for (const node of nodes.slice().reverse()) {
      const adopted = this._adopt(node);
      if (adopted) this.children.unshift(adopted);
    }
  }

  before(...nodes: FakeElement[]): void {
    const parent = this.parentElement;
    if (!parent) return;
    for (const node of nodes) {
      node.remove();
      node.parentElement = parent;
      parent.children.splice(parent.children.indexOf(this), 0, node);
    }
  }

  after(...nodes: FakeElement[]): void {
    const parent = this.parentElement;
    if (!parent) return;
    let index = parent.children.indexOf(this) + 1;
    for (const node of nodes) {
      node.remove();
      node.parentElement = parent;
      parent.children.splice(index++, 0, node);
    }
  }

  insertBefore(node: FakeElement, reference: FakeElement | null): FakeElement {
    if (reference) reference.before(node);
    else this.append(node);
    return node;
  }

  remove(): void {
    const parent = this.parentElement;
    if (!parent) return;
    parent.children.splice(parent.children.indexOf(this), 1);
    this.parentElement = null;
  }

  removeChild(node: FakeElement): FakeElement {
    node.remove();
    return node;
  }

  replaceChildren(...nodes: (FakeElement | string)[]): void {
    this.textContent = "";
    this.append(...nodes);
  }

  contains(node: FakeElement | null): boolean {
    for (let n = node; n; n = n.parentElement) if (n === this) return true;
    return false;
  }

  closest(selector: string): FakeElement | null {
    if (this.matches(selector)) return this;
    for (let n = this.parentElement; n; n = n.parentElement) if (n.matches(selector)) return n;
    return null;
  }

  matches(selector: string): boolean {
    return selector.split(",").some((one) => this._matchesChain(one.trim()));
  }

  private _matchesChain(selector: string): boolean {
    const parts = selector.split(/\s*>\s*/).map((p) => p.trim());
    let element: FakeElement | null = null;
    for (let i = parts.length - 1; i >= 0; --i) {
      const part = parts[i] as string;
      element = i === parts.length - 1 ? this : element;
      if (!element) return false;
      if (part === ":scope") return true;
      if (!matchesCompound(element, parseCompound(part))) return false;
      element = element.parentElement;
    }
    return true;
  }

  /** Descendants in document order. */
  _descendants(): FakeElement[] {
    const out: FakeElement[] = [];
    const walk = (el: FakeElement): void => {
      for (const child of el.children) {
        out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }

  querySelectorAll<T = FakeElement>(selector: string): T[] {
    const scoped = selector.trim().startsWith(":scope");
    const list = scoped ? this.children : this._descendants();
    const rest = scoped ? selector.trim().replace(/^:scope\s*>\s*/, "") : selector;
    if (scoped) return list.filter((el) => el.matches(rest)) as T[];
    return list.filter((el) => el.matches(rest)) as T[];
  }

  querySelector<T = FakeElement>(selector: string): T | null {
    return (this.querySelectorAll<T>(selector)[0] as T | undefined) ?? null;
  }

  addEventListener(
    type: string,
    listener: Listener,
    options?: boolean | { capture?: boolean },
  ): void {
    const capture = typeof options === "boolean" ? options : !!(options && options.capture);
    const list = this._listeners.get(type) ?? [];
    if (!list.some((e) => e.listener === listener && e.capture === capture))
      list.push({ listener, capture });
    this._listeners.set(type, list);
  }

  removeEventListener(
    type: string,
    listener: Listener,
    options?: boolean | { capture?: boolean },
  ): void {
    const capture = typeof options === "boolean" ? options : !!(options && options.capture);
    const list = this._listeners.get(type);
    if (!list) return;
    const index = list.findIndex((e) => e.listener === listener && e.capture === capture);
    if (index >= 0) list.splice(index, 1);
  }

  _fire(event: FakeEvent, capture: boolean): void {
    const list = (this._listeners.get(event.type) ?? []).filter((e) => e.capture === capture);
    event.currentTarget = this;
    for (const entry of list) {
      entry.listener(event);
      if (event.immediateStopped) break;
    }
  }

  listenerCount(type: string): number {
    return (this._listeners.get(type) ?? []).length;
  }

  dispatchEvent(event: FakeEvent): boolean {
    event.target = this;
    const path: FakeElement[] = [this];
    for (let n = this.parentElement; n; n = n.parentElement) path.push(n);
    const doc = this.ownerDocument;
    const attached = path[path.length - 1] === doc.documentElement;
    if (attached) doc._fire(event, true);
    for (let i = path.length - 1; i > 0 && !event.propagationStopped; --i)
      (path[i] as FakeElement)._fire(event, true);
    if (!event.propagationStopped) this._fire(event, true);
    if (!event.propagationStopped) this._fire(event, false);
    if (event.bubbles)
      for (let i = 1; i < path.length && !event.propagationStopped; ++i)
        (path[i] as FakeElement)._fire(event, false);
    if (attached && event.bubbles && !event.propagationStopped) doc._fire(event, false);
    return !event.defaultPrevented;
  }

  getBoundingClientRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
    x: number;
    y: number;
  } {
    const { left, top, width, height } = this.box;
    return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top };
  }

  get offsetWidth(): number {
    return this.box.width;
  }

  get offsetHeight(): number {
    return this.box.height;
  }

  get clientWidth(): number {
    return this.box.width;
  }

  get clientHeight(): number {
    return this.box.height;
  }

  focus(): void {
    this.ownerDocument.activeElement = this;
  }

  blur(): void {
    if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = null;
  }

  /** Text inputs: counts the select() calls. */
  selected = 0;
  select(): void {
    this.selected++;
  }
}

export class FakeDocument {
  readonly documentElement: FakeElement;
  readonly body: FakeElement;
  activeElement: FakeElement | null = null;
  private readonly _listeners = new Map<string, ListenerEntry[]>();

  constructor() {
    this.documentElement = new FakeElement("html", this);
    this.body = new FakeElement("body", this);
    this.documentElement.append(this.body);
    this.documentElement.box = { left: 0, top: 0, width: 1024, height: 768 };
  }

  createElement(tag: string): FakeElement {
    return new FakeElement(tag, this);
  }

  querySelectorAll<T = FakeElement>(selector: string): T[] {
    return [this.documentElement, ...this.documentElement._descendants()].filter((el) =>
      el.matches(selector),
    ) as T[];
  }

  querySelector<T = FakeElement>(selector: string): T | null {
    return (this.querySelectorAll<T>(selector)[0] as T | undefined) ?? null;
  }

  addEventListener(
    type: string,
    listener: Listener,
    options?: boolean | { capture?: boolean },
  ): void {
    const capture = typeof options === "boolean" ? options : !!(options && options.capture);
    const list = this._listeners.get(type) ?? [];
    list.push({ listener, capture });
    this._listeners.set(type, list);
  }

  removeEventListener(
    type: string,
    listener: Listener,
    options?: boolean | { capture?: boolean },
  ): void {
    const capture = typeof options === "boolean" ? options : !!(options && options.capture);
    const list = this._listeners.get(type);
    if (!list) return;
    const index = list.findIndex((e) => e.listener === listener && e.capture === capture);
    if (index >= 0) list.splice(index, 1);
  }

  listenerCount(type: string): number {
    return (this._listeners.get(type) ?? []).length;
  }

  _fire(event: FakeEvent, capture: boolean): void {
    const list = (this._listeners.get(event.type) ?? []).filter((e) => e.capture === capture);
    event.currentTarget = this;
    for (const entry of list) {
      entry.listener(event);
      if (event.immediateStopped) break;
    }
  }

  dispatchEvent(event: FakeEvent): boolean {
    event.target = this;
    this._fire(event, true);
    if (!event.propagationStopped) this._fire(event, false);
    return !event.defaultPrevented;
  }
}

/** What getComputedStyle reports for a fake element. */
function computedStyle(element: FakeElement): { getPropertyValue(name: string): string } {
  return {
    getPropertyValue(name: string): string {
      switch (name) {
        case "display": {
          for (let n: FakeElement | null = element; n; n = n.parentElement)
            if (n.style.display === "none") return "none";
          return element.style.display || "block";
        }
        case "width":
          return element.box.width + "px";
        case "height":
          return element.box.height + "px";
        case "box-sizing":
          return "content-box";
        default:
          return element.style.getPropertyValue(name) || "0px";
      }
    },
  };
}

export interface FakeDomHandle {
  document: FakeDocument;
  /** Restores the globals the fake replaced. */
  uninstall(): void;
}

/** Installs a fresh fake document and window on globalThis. */
export function installFakeDom(): FakeDomHandle {
  const g = globalThis as unknown as Record<string, unknown>;
  const saved = {
    document: g.document,
    window: g.window,
    getComputedStyle: g.getComputedStyle,
  };
  const doc = new FakeDocument();
  const win = {
    document: doc,
    pageXOffset: 0,
    pageYOffset: 0,
    getComputedStyle: computedStyle,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout,
    clearTimeout,
  };
  g.document = doc;
  g.window = win;
  g.getComputedStyle = computedStyle;
  return {
    document: doc,
    uninstall() {
      g.document = saved.document;
      g.window = saved.window;
      g.getComputedStyle = saved.getComputedStyle;
    },
  };
}

/** Dispatches a mouse-like event on an element. */
export function fire(element: unknown, type: string, init: FakeEventInit = {}): FakeEvent {
  const event = new FakeEvent(type, init);
  (element as FakeElement).dispatchEvent(event);
  return event;
}

/** The element as the fake it is. */
export function fake(element: unknown): FakeElement {
  return element as FakeElement;
}
