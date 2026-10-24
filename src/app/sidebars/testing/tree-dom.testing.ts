/**
 * A small DOM for the sidebar tests in Vitest's node environment: enough
 * of Element for the virtual tree and the panels (child nodes, classes,
 * attributes, inline styles, events, simple selectors, scroll and box
 * sizes). getComputedStyle reports the inline style, plus a height per
 * class that a test sets (the row heights the stylesheets give).
 */

type Listener = (event: TestEvent) => void;

export class TestEvent {
  readonly type: string;
  bubbles: boolean;
  cancelable: boolean;
  target: TestNode | null = null;
  currentTarget: TestNode | null = null;
  defaultPrevented = false;
  propagationStopped = false;
  isTrusted = false;
  clientX = 0;
  clientY = 0;
  pageX = 0;
  pageY = 0;
  layerX = 0;
  layerY = 0;
  altKey = false;
  shiftKey = false;
  dataTransfer: { setData(type: string, value: string): void; types: string[] } | null = null;
  detail: unknown = null;

  constructor(
    type: string,
    init: Partial<TestEvent> & { bubbles?: boolean; cancelable?: boolean } = {},
  ) {
    this.type = type;
    this.bubbles = init.bubbles ?? true;
    this.cancelable = init.cancelable ?? true;
    Object.assign(this, init);
  }

  preventDefault(): void {
    this.defaultPrevented = true;
  }

  stopPropagation(): void {
    this.propagationStopped = true;
  }
}

class TestClassList {
  constructor(private readonly owner: TestElement) {}

  private get names(): string[] {
    const value = this.owner.getAttribute("class");
    return value ? value.split(/\s+/).filter(Boolean) : [];
  }

  private set names(names: string[]) {
    this.owner.setAttribute("class", names.join(" "));
  }

  get length(): number {
    return this.names.length;
  }

  add(...names: string[]): void {
    const list = this.names;
    for (const name of names) if (!list.includes(name)) list.push(name);
    this.names = list;
  }

  remove(...names: string[]): void {
    if (!this.owner.hasAttribute("class")) return;
    this.names = this.names.filter((name) => !names.includes(name));
  }

  contains(name: string): boolean {
    return this.names.includes(name);
  }

  toggle(name: string, force?: boolean): boolean {
    const has = this.contains(name);
    const want = force === undefined ? !has : force;
    if (want && !has) this.add(name);
    if (!want && has) this.remove(name);
    return want;
  }

  [Symbol.iterator](): Iterator<string> {
    return this.names[Symbol.iterator]();
  }
}

/** Inline style: properties in the order they were first set, like the browser's. */
class TestStyle {
  [key: string]: unknown;

  constructor() {
    return new Proxy(this, {
      set: (target, name, value) => {
        if (typeof name !== "string") return false;
        const props = TestStyle.props(target);
        const css = name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
        if (value === "" || value == null) props.delete(css);
        else props.set(css, String(value));
        return true;
      },
      get: (target, name) => {
        if (name === "setProperty")
          return (prop: string, value: string) => {
            const props = TestStyle.props(target);
            if (value === "") props.delete(prop);
            else props.set(prop, value);
          };
        if (name === "removeProperty")
          return (prop: string) => TestStyle.props(target).delete(prop);
        if (name === "getPropertyValue")
          return (prop: string) => TestStyle.props(target).get(prop) ?? "";
        if (name === "cssText")
          return [...TestStyle.props(target)].map(([k, v]) => `${k}: ${v};`).join(" ");
        if (typeof name !== "string") return undefined;
        const css = name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
        return TestStyle.props(target).get(css) ?? "";
      },
    });
  }

  static readonly store = new WeakMap<object, Map<string, string>>();

  static props(target: object): Map<string, string> {
    let map = TestStyle.store.get(target);
    if (!map) {
      map = new Map();
      TestStyle.store.set(target, map);
    }
    return map;
  }
}

export class TestNode {
  parentNode: TestElement | TestFragment | null = null;
  childNodes: TestNode[] = [];
  private readonly listeners = new Map<string, { fn: Listener; capture: boolean }[]>();

  self(): TestNode {
    return this;
  }

  get parentElement(): TestElement | null {
    return this.parentNode instanceof TestElement ? this.parentNode : null;
  }

  get firstChild(): TestNode | null {
    return this.childNodes[0] ?? null;
  }

  get children(): TestElement[] {
    return this.childNodes.filter((child): child is TestElement => child instanceof TestElement);
  }

  get firstElementChild(): TestElement | null {
    return this.children[0] ?? null;
  }

  get nextElementSibling(): TestElement | null {
    const siblings = this.parentNode ? this.parentNode.children : [];
    const index = siblings.indexOf(this as unknown as TestElement);
    return index >= 0 ? (siblings[index + 1] ?? null) : null;
  }

  after(...nodes: TestNode[]): void {
    const parent = this.parentNode;
    if (!parent) return;
    let reference: TestNode | null = this.childAfter();
    for (const node of nodes) {
      parent.insertBefore(node, reference);
      reference = node.childAfter();
    }
  }

  /** The next child node of the parent (any node type). */
  childAfter(): TestNode | null {
    const siblings = this.parentNode ? this.parentNode.childNodes : [];
    return siblings[siblings.indexOf(this) + 1] ?? null;
  }

  appendChild<T extends TestNode>(node: T): T {
    if (node instanceof TestFragment) {
      for (const child of [...node.childNodes]) this.appendChild(child);
      return node;
    }
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this as unknown as TestElement;
    this.childNodes.push(node);
    return node;
  }

  insertBefore<T extends TestNode>(node: T, reference: TestNode | null): T {
    if (!reference) return this.appendChild(node);
    if (node.parentNode) node.parentNode.removeChild(node);
    const index = this.childNodes.indexOf(reference);
    if (index < 0) throw new Error("reference is not a child");
    node.parentNode = this as unknown as TestElement;
    this.childNodes.splice(index, 0, node);
    return node;
  }

  removeChild<T extends TestNode>(node: T): T {
    const index = this.childNodes.indexOf(node);
    if (index < 0) throw new Error("not a child");
    this.childNodes.splice(index, 1);
    node.parentNode = null;
    return node;
  }

  remove(): void {
    if (this.parentNode) this.parentNode.removeChild(this);
  }

  addEventListener(type: string, fn: Listener, capture?: boolean | { capture?: boolean }): void {
    const list = this.listeners.get(type) ?? [];
    list.push({ fn, capture: typeof capture === "object" ? !!capture.capture : !!capture });
    this.listeners.set(type, list);
  }

  removeEventListener(type: string, fn: Listener): void {
    const list = this.listeners.get(type);
    if (list)
      this.listeners.set(
        type,
        list.filter((entry) => entry.fn !== fn),
      );
  }

  listenerCount(type: string): number {
    return (this.listeners.get(type) ?? []).length;
  }

  dispatchEvent(event: TestEvent): boolean {
    event.target = this;
    const path: TestNode[] = [];
    for (let node: TestNode | null = this.self(); node; node = node.parentNode) path.push(node);
    if (
      testDocument &&
      path[path.length - 1] instanceof TestElement &&
      testDocument.body.contains(this as unknown as TestElement)
    )
      path.push(testDocument);
    for (const node of path) {
      event.currentTarget = node;
      for (const entry of [...(node.listeners.get(event.type) ?? [])]) entry.fn.call(node, event);
      if (event.propagationStopped || !event.bubbles) break;
    }
    return !event.defaultPrevented;
  }
}

export class TestFragment extends TestNode {}

export class TestText extends TestNode {
  constructor(public data: string) {
    super();
  }
}

/** The height getComputedStyle gives elements with one of these classes. */
export const classHeights: Record<string, number> = {};

export class TestElement extends TestNode {
  readonly tagName: string;
  private readonly attributes = new Map<string, string>();
  readonly style = new TestStyle() as unknown as CSSStyleDeclaration & Record<string, string>;
  readonly classList = new TestClassList(this);
  scrollTop = 0;
  scrollLeft = 0;
  /** The box tests give the element (offset and client sizes). */
  box = { x: 0, y: 0, width: 0, height: 0 };
  value = "";
  checked = false;
  disabled = false;
  focused = false;
  type = "";

  constructor(tag: string) {
    super();
    this.tagName = tag.toUpperCase();
  }

  get id(): string {
    return this.getAttribute("id") ?? "";
  }

  set id(value: string) {
    this.setAttribute("id", value);
  }

  get className(): string {
    return this.getAttribute("class") ?? "";
  }

  set className(value: string) {
    this.setAttribute("class", value);
  }

  setAttribute(name: string, value: unknown): void {
    this.attributes.set(name, String(value));
    if (name === "type") this.type = String(value);
  }

  getAttribute(name: string): string | null {
    if (name === "style") return this.style.cssText || (this.attributes.has("style") ? "" : null);
    return this.attributes.has(name) ? (this.attributes.get(name) as string) : null;
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  getAttributeNames(): string[] {
    return [...this.attributes.keys()];
  }

  get textContent(): string {
    return this.childNodes
      .map((child) => (child instanceof TestText ? child.data : (child as TestElement).textContent))
      .join("");
  }

  set textContent(value: string) {
    for (const child of [...this.childNodes]) this.removeChild(child);
    if (value) this.appendChild(new TestText(value));
  }

  /** Only text and the entity arrows the tree writes. */
  /** Markup is not parsed; the entities the panels use are decoded, as a browser would. */
  set innerHTML(value: string) {
    this.textContent = value
      .replace("&#9660;", "▼")
      .replace("&#9658;", "►")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  }

  get innerHTML(): string {
    return this.textContent;
  }

  get offsetHeight(): number {
    return this.box.height;
  }

  get offsetWidth(): number {
    return this.box.width;
  }

  get clientHeight(): number {
    return this.box.height;
  }

  get clientWidth(): number {
    return this.box.width;
  }

  get scrollWidth(): number {
    return this.box.width;
  }

  get scrollHeight(): number {
    return parseInt(this.style.height || "0", 10) || 0;
  }

  get offsetParent(): TestElement | null {
    return null;
  }

  get offsetTop(): number {
    return 0;
  }

  get offsetLeft(): number {
    return 0;
  }

  getBoundingClientRect(): { x: number; y: number; width: number; height: number } {
    return { ...this.box };
  }

  selfElement(): TestElement {
    return this;
  }

  getClientRects(): unknown[] {
    return [];
  }

  contains(node: TestNode | null): boolean {
    for (let current = node; current; current = current.parentNode)
      if (current === this) return true;
    return false;
  }

  focus(): void {
    this.focused = true;
  }

  select(): void {}

  matches(selector: string): boolean {
    return selector.split(",").some((part) => matchesOne(this, part.trim()));
  }

  closest(selector: string): TestElement | null {
    for (let node: TestElement | null = this.selfElement(); node; node = node.parentElement)
      if (node.matches(selector)) return node;
    return null;
  }

  querySelectorAll(selector: string): TestElement[] {
    const out: TestElement[] = [];
    const scoped = selector.startsWith(":scope >");
    const rest = scoped ? selector.slice(":scope >".length).trim() : selector;
    const walk = (node: TestElement): void => {
      for (const child of node.children) {
        if (child.matches(rest)) out.push(child);
        if (!scoped) walk(child);
      }
    };
    walk(this);
    return out;
  }

  querySelector<T = TestElement>(selector: string): T | null {
    return (this.querySelectorAll(selector)[0] as unknown as T) ?? null;
  }
}

/** One compound selector: tag, #id, .classes, [attr] or [attr=value], :checked. */
function matchesOne(element: TestElement, selector: string): boolean {
  const pattern =
    /([a-zA-Z]+)|#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:=["']?([^\]"']*)["']?)?\]|:(checked)/g;
  let match: RegExpExecArray | null;
  let consumed = 0;
  while ((match = pattern.exec(selector))) {
    consumed += match[0].length;
    if (match[1] && element.tagName !== match[1].toUpperCase()) return false;
    if (match[2] && element.id !== match[2]) return false;
    if (match[3] && !element.classList.contains(match[3])) return false;
    if (match[4]) {
      const value = element.getAttribute(match[4]);
      if (value === null) return false;
      if (match[5] !== undefined && value !== match[5]) return false;
    }
    if (match[6] && !element.checked) return false;
  }
  return consumed === selector.length && consumed > 0;
}

export class TestDocument extends TestNode {
  readonly body = new TestElement("body");

  createElement(tag: string): TestElement {
    return new TestElement(tag);
  }

  createDocumentFragment(): TestFragment {
    return new TestFragment();
  }

  querySelectorAll(selector: string): TestElement[] {
    return this.body.querySelectorAll(selector);
  }
}

let testDocument: TestDocument | null = null;

/** Installs the DOM globals; returns the document and a function that removes them. */
export function installTreeDom(): { document: TestDocument; uninstall(): void } {
  const doc = new TestDocument();
  testDocument = doc;
  const globals = globalThis as unknown as Record<string, unknown>;
  const saved = {
    document: globals.document,
    getComputedStyle: globals.getComputedStyle,
    HTMLElement: globals.HTMLElement,
    HTMLDivElement: globals.HTMLDivElement,
    MouseEvent: globals.MouseEvent,
    CustomEvent: globals.CustomEvent,
    Event: globals.Event,
    Element: globals.Element,
  };
  globals.document = doc;
  globals.HTMLElement = TestElement;
  globals.HTMLDivElement = TestElement;
  globals.MouseEvent = TestEvent;
  globals.CustomEvent = TestEvent;
  globals.Event = TestEvent;
  globals.Element = TestElement;
  globals.getComputedStyle = (element: TestElement) => {
    let height = element.style.height;
    if (!height)
      for (const name of element.classList)
        if (classHeights[name] !== undefined) height = classHeights[name] + "px";
    return {
      height: height || "auto",
      display: element.style.display || "block",
      getPropertyValue: (name: string) => (name === "height" ? height : ""),
    };
  };
  return {
    document: doc,
    uninstall() {
      testDocument = null;
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) Reflect.deleteProperty(globals, key);
        else globals[key] = value;
      }
    },
  };
}

/** The element as the test DOM's element (for the test-only members). */
export function testElement(element: unknown): TestElement {
  return element as TestElement;
}

/** Dispatches an event of the type on the element. */
export function fireEvent(
  element: unknown,
  type: string,
  init: Partial<TestEvent> = {},
): TestEvent {
  const event = new TestEvent(type, init);
  (element as TestElement).dispatchEvent(event);
  return event;
}
