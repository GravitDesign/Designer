/**
 * A small DOM for the color cluster's tests in Vitest's node environment:
 * elements with classes, attributes, inline styles, children, simple
 * selectors (tag, #id, .class, [attr], [attr="v"], descendant and ">"
 * combinators, :scope), bubbling events, and a document and window with
 * listeners. Layout is fake: every element measures `rect` (0 by default).
 */
import { vi } from "vitest";

type Listener = (event: Event) => void;

class FakeStyle {
  private readonly _values = new Map<string, string>();
  constructor(private readonly _owner: FakeElement) {}

  setProperty(name: string, value: string): void {
    if (value === "" || value === null) this._values.delete(name);
    else this._values.set(name, String(value).trim());
    this._owner._syncStyle(this.cssText);
  }

  getPropertyValue(name: string): string {
    return this._values.get(name) ?? "";
  }

  removeProperty(name: string): void {
    this._values.delete(name);
    this._owner._syncStyle(this.cssText);
  }

  get cssText(): string {
    return [...this._values].map(([k, v]) => `${k}: ${v};`).join(" ");
  }

  set cssText(text: string) {
    this._values.clear();
    for (const part of text.split(";")) {
      const [k, ...rest] = part.split(":");
      if (k && k.trim() && rest.length) this._values.set(k.trim(), rest.join(":").trim());
    }
    this._owner._syncStyle(this.cssText);
  }

  get display(): string {
    return this.getPropertyValue("display");
  }

  set display(value: string) {
    this.setProperty("display", value);
  }

  get position(): string {
    return this.getPropertyValue("position");
  }

  set position(value: string) {
    this.setProperty("position", value);
  }
}

class FakeClassList {
  constructor(private readonly _owner: FakeElement) {}
  private get _list(): string[] {
    const value = this._owner.getAttribute("class");
    return value ? value.split(/\s+/).filter(Boolean) : [];
  }
  private _set(list: string[]): void {
    this._owner.setAttribute("class", list.join(" "));
  }
  add(...names: string[]): void {
    const list = this._list;
    for (const name of names) if (!list.includes(name)) list.push(name);
    this._set(list);
  }
  remove(...names: string[]): void {
    this._set(this._list.filter((name) => !names.includes(name)));
  }
  contains(name: string): boolean {
    return this._list.includes(name);
  }
  toggle(name: string, state?: boolean): boolean {
    const on = state === undefined ? !this.contains(name) : state;
    if (on) this.add(name);
    else this.remove(name);
    return on;
  }
  get length(): number {
    return this._list.length;
  }
  [Symbol.iterator](): Iterator<string> {
    return this._list[Symbol.iterator]();
  }
}

export class FakeNode {
  parentNode: FakeElement | null = null;
  readonly childNodes: FakeNode[] = [];
  nodeType = 3;
  nodeName = "#text";
  constructor(public data = "") {}
  get textContent(): string {
    return this.data;
  }
}

/** Every created element, for queries on the document. */
let root: FakeElement;

export class FakeElement extends FakeNode {
  readonly tagName: string;
  override nodeType = 1;
  private readonly _attributes = new Map<string, string>();
  readonly style = new FakeStyle(this);
  readonly classList = new FakeClassList(this);
  private readonly _listeners = new Map<string, { fn: Listener; capture: boolean }[]>();
  /** What getBoundingClientRect, offsetWidth and the computed width give. */
  rect = { left: 0, top: 0, width: 0, height: 0 };
  value = "";
  checked = false;
  disabled = false;
  selected = false;
  draggable = false;
  width = 300;
  height = 150;
  selectionStart = 0;
  selectionEnd = 0;
  private _innerHTML = "";

  constructor(tag: string) {
    super();
    this.tagName = tag.toUpperCase();
    this.nodeName = this.tagName;
  }

  get ownerDocument(): unknown {
    return globalThis.document;
  }

  _syncStyle(text: string): void {
    this._attributes.set("style", text);
  }

  get className(): string {
    return this.getAttribute("class") ?? "";
  }
  set className(value: string) {
    this.setAttribute("class", value);
  }
  get id(): string {
    return this.getAttribute("id") ?? "";
  }

  setAttribute(name: string, value: string): void {
    if (name === "style") this.style.cssText = String(value);
    // The attribute keeps the text as it was set, as in a browser.
    this._attributes.set(name, String(value));
  }
  getAttribute(name: string): string | null {
    return this._attributes.has(name) ? (this._attributes.get(name) as string) : null;
  }
  hasAttribute(name: string): boolean {
    return this._attributes.has(name);
  }
  removeAttribute(name: string): void {
    this._attributes.delete(name);
  }
  getAttributeNames(): string[] {
    return [...this._attributes.keys()];
  }

  get children(): FakeElement[] {
    return this.childNodes.filter((n): n is FakeElement => n instanceof FakeElement);
  }
  get parentElement(): FakeElement | null {
    return this.parentNode;
  }
  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null;
  }
  get nextElementSibling(): FakeElement | null {
    const parent = this.parentNode;
    if (!parent) return null;
    const siblings = parent.children;
    return siblings[siblings.indexOf(this) + 1] ?? null;
  }
  get previousElementSibling(): FakeElement | null {
    const parent = this.parentNode;
    if (!parent) return null;
    const siblings = parent.children;
    return siblings[siblings.indexOf(this) - 1] ?? null;
  }
  get isConnected(): boolean {
    if (this === root) return true;
    for (let node = this.parentNode; node; node = node.parentNode) if (node === root) return true;
    return false;
  }
  get selectedOptions(): FakeElement[] {
    return this.children.filter((option) => option.selected);
  }
  get options(): FakeElement[] {
    return this.children;
  }

  appendChild<T extends FakeNode>(child: T): T {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }
  append(...children: (FakeNode | string)[]): void {
    for (const child of children)
      this.appendChild(typeof child === "string" ? new FakeNode(child) : child);
  }
  prepend(...children: FakeNode[]): void {
    for (const child of children.reverse()) {
      if (child.parentNode) child.parentNode.removeChild(child);
      child.parentNode = this;
      this.childNodes.unshift(child);
    }
  }
  insertBefore<T extends FakeNode>(child: T, before: FakeNode | null): T {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    const index = before ? this.childNodes.indexOf(before) : -1;
    if (index < 0) this.childNodes.push(child);
    else this.childNodes.splice(index, 0, child);
    return child;
  }
  after(node: FakeNode): void {
    const parent = this.parentNode;
    if (!parent) return;
    const next = parent.childNodes[parent.childNodes.indexOf(this) + 1] ?? null;
    parent.insertBefore(node, next);
  }
  removeChild<T extends FakeNode>(child: T): T {
    const index = this.childNodes.indexOf(child);
    if (index >= 0) this.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  }
  remove(): void {
    if (this.parentNode) this.parentNode.removeChild(this);
  }
  replaceChildren(...children: FakeNode[]): void {
    for (const child of [...this.childNodes]) this.removeChild(child);
    for (const child of children) this.appendChild(child);
  }

  override get textContent(): string {
    return this.childNodes.map((n) => n.textContent).join("");
  }
  override set textContent(value: string) {
    this.replaceChildren();
    if (value) this.appendChild(new FakeNode(value));
  }
  get innerHTML(): string {
    return this._innerHTML;
  }
  set innerHTML(value: string) {
    this._innerHTML = value;
    this.replaceChildren();
    if (value) this.appendChild(new FakeNode(value.replace(/<br>/g, "\n").replace(/&nbsp;/g, " ")));
  }

  getBoundingClientRect() {
    return {
      ...this.rect,
      right: this.rect.left + this.rect.width,
      bottom: this.rect.top + this.rect.height,
    };
  }
  getClientRects(): unknown[] {
    return this.isConnected ? [this.rect] : [];
  }
  get offsetWidth(): number {
    return this.rect.width;
  }
  get offsetHeight(): number {
    return this.rect.height;
  }
  getContext(): null {
    return null;
  }
  click(): void {
    this.dispatchEvent(new FakeEvent("click", { bubbles: true }));
  }
  focus(): void {}
  select(): void {}

  matches(selector: string): boolean {
    return selector.split(",").some((part) => matchComplex(this, part.trim(), null));
  }
  closest(selector: string): FakeElement | null {
    if (this.matches(selector)) return this;
    for (let node = this.parentNode; node; node = node.parentNode)
      if (node.matches(selector)) return node;
    return null;
  }
  querySelectorAll(selector: string): FakeElement[] {
    const out: FakeElement[] = [];
    const visit = (element: FakeElement) => {
      for (const child of element.children) {
        if (selector.split(",").some((part) => matchComplex(child, part.trim(), this)))
          out.push(child);
        visit(child);
      }
    };
    visit(this);
    return out;
  }
  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  addEventListener(type: string, fn: Listener, options?: boolean | { capture?: boolean }): void {
    const capture = typeof options === "boolean" ? options : !!(options && options.capture);
    const list = this._listeners.get(type) ?? [];
    if (!list.some((l) => l.fn === fn && l.capture === capture)) list.push({ fn, capture });
    this._listeners.set(type, list);
  }
  removeEventListener(type: string, fn: Listener, options?: boolean | { capture?: boolean }): void {
    const capture = typeof options === "boolean" ? options : !!(options && options.capture);
    const list = this._listeners.get(type) ?? [];
    this._listeners.set(
      type,
      list.filter((l) => !(l.fn === fn && l.capture === capture)),
    );
  }
  listenerCount(type: string): number {
    return (this._listeners.get(type) ?? []).length;
  }
  _fire(event: FakeEvent, capture: boolean | null): void {
    for (const listener of [...(this._listeners.get(event.type) ?? [])]) {
      if (capture !== null && listener.capture !== capture) continue;
      if (event._stoppedImmediate) return;
      listener.fn.call(this, event as unknown as Event);
    }
  }
  dispatchEvent(event: FakeEvent): boolean {
    event.target = this;
    const path: FakeElement[] = [];
    for (let node = this.parentNode; node; node = node.parentNode) path.push(node);
    for (const node of [...path].reverse()) {
      if (event._stopped) break;
      node._fire(event, true);
    }
    if (!event._stopped) this._fire(event, null);
    if (event.bubbles)
      for (const node of path) {
        if (event._stopped) break;
        node._fire(event, false);
      }
    return !event.defaultPrevented;
  }
}

/** Matches "a b > c" from the right; `scope` stands for ":scope". */
function matchComplex(element: FakeElement, selector: string, scope: FakeElement | null): boolean {
  const tokens = selector
    .replace(/\s*>\s*/g, " > ")
    .split(/\s+/)
    .filter(Boolean);
  const match = (el: FakeElement | null, index: number): boolean => {
    if (!el) return false;
    const token = tokens[index] as string;
    if (!matchCompound(el, token, scope)) return false;
    if (index === 0) return true;
    if (tokens[index - 1] === ">") return match(el.parentNode, index - 2);
    for (let parent = el.parentNode; parent; parent = parent.parentNode)
      if (match(parent, index - 1)) return true;
    return false;
  };
  return match(element, tokens.length - 1);
}

function matchCompound(el: FakeElement, token: string, scope: FakeElement | null): boolean {
  if (token === ":scope") return el === scope;
  const parts = token.match(/(^[a-zA-Z*]+)|(#[\w-]+)|(\.[\w-]+)|(\[[^\]]+\])|(:[\w-]+)/g) ?? [];
  for (const part of parts) {
    if (part[0] === ".") {
      if (!el.classList.contains(part.slice(1))) return false;
    } else if (part[0] === "#") {
      if (el.id !== part.slice(1)) return false;
    } else if (part[0] === "[") {
      const m = /^\[([\w-]+)(?:(!?=)"?([^"\]]*)"?)?\]$/.exec(part);
      if (!m) return false;
      const value = el.getAttribute(m[1] as string);
      if (m[2] === "=" && value !== m[3]) return false;
      if (m[2] === "!=" && value === m[3]) return false;
      if (!m[2] && value === null) return false;
    } else if (part[0] === ":") {
      if (part === ":first-child" && el.parentNode && el.parentNode.children[0] !== el)
        return false;
    } else if (part !== "*" && el.tagName.toLowerCase() !== part.toLowerCase()) return false;
  }
  return true;
}

export class FakeEvent {
  target: FakeElement | null = null;
  defaultPrevented = false;
  _stopped = false;
  _stoppedImmediate = false;
  readonly bubbles: boolean;
  readonly cancelable: boolean;
  readonly detail: unknown;
  isTrusted = false;
  button = 0;
  pageX = 0;
  pageY = 0;
  clientX = 0;
  clientY = 0;
  keyCode = 0;
  [extra: string]: unknown;
  constructor(
    public readonly type: string,
    init: { bubbles?: boolean; cancelable?: boolean; detail?: unknown; [k: string]: unknown } = {},
  ) {
    this.bubbles = !!init.bubbles;
    this.cancelable = init.cancelable !== false;
    this.detail = init.detail;
    for (const key of Object.keys(init))
      if (!["bubbles", "cancelable", "detail"].includes(key)) this[key] = init[key];
  }
  preventDefault(): void {
    this.defaultPrevented = true;
  }
  stopPropagation(): void {
    this._stopped = true;
  }
  stopImmediatePropagation(): void {
    this._stopped = true;
    this._stoppedImmediate = true;
  }
}

/** Installs document, window, getComputedStyle and the event classes; returns the body. */
export function installFakeDom(): { body: FakeElement; html: FakeElement } {
  const html = new FakeElement("html");
  const body = new FakeElement("body");
  html.appendChild(body);
  root = html;
  const documentObject = Object.assign(new FakeElement("#document"), {
    documentElement: Object.assign(html, { clientWidth: 1600, clientHeight: 1000 }),
    body,
    createElement: (tag: string) => new FakeElement(tag),
    createTextNode: (text: string) => new FakeNode(text),
    defaultView: null as unknown,
    activeElement: null,
    getElementById: null as unknown as (id: string) => FakeElement | null,
  });
  // Queries on the document search from <html>.
  documentObject.querySelectorAll = (selector: string) => {
    const all = html.querySelectorAll(selector);
    return html.matches(selector) ? [html, ...all] : all;
  };
  documentObject.querySelector = (selector: string) =>
    documentObject.querySelectorAll(selector)[0] ?? null;
  documentObject.getElementById = (id: string) => html.querySelector("#" + id);
  documentObject.addEventListener = html.addEventListener.bind(html);
  documentObject.removeEventListener = html.removeEventListener.bind(html);
  documentObject.dispatchEvent = html.dispatchEvent.bind(html);
  const windowObject = Object.assign(new FakeElement("#window"), {
    pageXOffset: 0,
    pageYOffset: 0,
    alert: vi.fn(),
  });
  documentObject.defaultView = windowObject;
  vi.stubGlobal("document", documentObject);
  vi.stubGlobal("window", windowObject);
  vi.stubGlobal("getComputedStyle", (element: FakeElement) => ({
    getPropertyValue: (name: string) => {
      if (name === "width") return element.rect.width + "px";
      if (name === "height") return element.rect.height + "px";
      if (name === "left") return element.style.getPropertyValue("left") || "0px";
      return element.style.getPropertyValue(name);
    },
    get display() {
      return element.style.getPropertyValue("display");
    },
    get position() {
      return element.style.getPropertyValue("position") || "static";
    },
    overflow: "",
    overflowX: "",
    overflowY: "",
  }));
  vi.stubGlobal("Event", FakeEvent);
  vi.stubGlobal("CustomEvent", FakeEvent);
  vi.stubGlobal("MouseEvent", FakeEvent);
  vi.stubGlobal("HTMLElement", FakeElement);
  vi.stubGlobal("Element", FakeElement);
  vi.stubGlobal("HTMLInputElement", FakeElement);
  vi.stubGlobal("HTMLSelectElement", FakeElement);
  vi.stubGlobal("HTMLTextAreaElement", FakeElement);
  vi.stubGlobal("HTMLButtonElement", FakeElement);
  vi.stubGlobal("HTMLOptionElement", FakeElement);
  return { body, html };
}

/** A bubbling event of `type` dispatched on `element`, with extra fields. */
export function fire(
  element: unknown,
  type: string,
  init: Record<string, unknown> = {},
): FakeEvent {
  const event = new FakeEvent(type, { bubbles: true, cancelable: true, ...init });
  (element as FakeElement).dispatchEvent(event);
  return event;
}
