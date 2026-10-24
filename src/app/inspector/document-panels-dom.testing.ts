/**
 * The fake DOM setup of the page, scene, slice and symbol panel tests (and
 * the export dialog's):
 * the shared fake DOM (menus/testing/fake-dom.testing.ts) plus what these
 * panels query and walk: attribute selectors, descendant and child
 * combinators, :first-child, :checked, :disabled and :not(...),
 * nodeName, the parentNode, nextSibling and previousElementSibling
 * links, the element classes paint-dom's isInput checks, an innerHTML
 * setter that keeps the text and a one-element insertAdjacentHTML.
 */
import {
  FakeElement,
  FakeEvent,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";

const TAGS: Record<string, string> = {
  HTMLInputElement: "INPUT",
  HTMLSelectElement: "SELECT",
  HTMLTextAreaElement: "TEXTAREA",
  HTMLButtonElement: "BUTTON",
  HTMLOptionElement: "OPTION",
};
const g = globalThis as unknown as Record<string, unknown>;

/** The elements :disabled matches: form controls with a disabled attribute. */
const DISABLEABLE = ["INPUT", "SELECT", "TEXTAREA", "BUTTON", "OPTGROUP", "OPTION", "FIELDSET"];

function isDisabled(element: FakeElement): boolean {
  return DISABLEABLE.includes(element.tagName) && element.getAttribute("disabled") !== null;
}

/** One compound selector: tag, classes, attributes and the pseudo classes above. */
function matchCompound(element: FakeElement, compound: string): boolean {
  const re =
    /^([a-z*]+)|\.([\w-]+)|\[([\w-]+)(?:(\^?=)"?([^"\]]*)"?)?\]|:not\(([^)]*)\)|:(first-child|last-child|checked|disabled)/gi;
  let rest = compound;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while (rest.length && (m = re.exec(rest)) && m.index === 0) {
    const [all, tag, cls, attr, op, value, not, pseudo] = m;
    if (tag && tag !== "*" && element.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    if (cls && !element.classList.contains(cls)) return false;
    if (attr) {
      const actual = element.getAttribute(attr);
      if (actual === null) return false;
      if (op === "=" && actual !== value) return false;
      if (op === "^=" && !actual.startsWith(value as string)) return false;
    }
    if (not !== undefined && matchCompound(element, not)) return false;
    if (pseudo === "checked" && !(element as unknown as { checked?: boolean }).checked)
      return false;
    if (pseudo === "disabled" && !isDisabled(element)) return false;
    if (pseudo === "first-child" || pseudo === "last-child") {
      const siblings = element.parentElement ? element.parentElement.children : [element];
      const index = siblings.indexOf(element);
      if (pseudo === "first-child" && index !== 0) return false;
      if (pseudo === "last-child" && index !== siblings.length - 1) return false;
    }
    rest = rest.slice(all.length);
    re.lastIndex = 0;
  }
  return rest.length === 0;
}

/** `parts` alternate compound, combinator (">" or " "), compound, ... */
function matchChain(element: FakeElement | null, parts: string[]): boolean {
  if (!element) return false;
  const last = parts[parts.length - 1] as string;
  if (last === ":scope") return true;
  if (!matchCompound(element, last)) return false;
  if (parts.length === 1) return true;
  const combinator = parts[parts.length - 2];
  const before = parts.slice(0, -2);
  if (combinator === ">") return matchChain(element.parentElement, before);
  for (let n = element.parentElement; n; n = n.parentElement)
    if (matchChain(n, before)) return true;
  return false;
}

function matches(this: FakeElement, selector: string): boolean {
  return selector.split(",").some((one) => {
    const parts = one
      .trim()
      .split(/\s*(>)\s*|\s+/)
      .map((part) => (part === undefined ? " " : part))
      .filter((part) => part !== "");
    return matchChain(this, parts);
  });
}

export interface DocumentPanelsDom {
  dom: FakeDomHandle;
  /** A new fake element. */
  make(tag: string, attributes?: Record<string, string>): FakeElement;
  uninstall(): void;
}

/** Installs the fake DOM with the selector and link support; call uninstall() after the test. */
export function installDocumentPanelsDom(): DocumentPanelsDom {
  const dom = installFakeDom();
  const proto = FakeElement.prototype as unknown as Record<string, unknown>;
  const savedMatches = FakeElement.prototype.matches;
  FakeElement.prototype.matches = matches;
  Object.defineProperty(proto, "parentNode", {
    configurable: true,
    get(this: FakeElement) {
      return this.parentElement;
    },
  });
  Object.defineProperty(proto, "nodeName", {
    configurable: true,
    get(this: FakeElement) {
      return this.tagName;
    },
  });
  Object.defineProperty(proto, "previousElementSibling", {
    configurable: true,
    get(this: FakeElement) {
      const siblings = this.parentElement ? this.parentElement.children : [];
      return siblings[siblings.indexOf(this) - 1] ?? null;
    },
  });
  Object.defineProperty(proto, "nextSibling", {
    configurable: true,
    get(this: FakeElement) {
      const siblings = this.parentElement ? this.parentElement.children : [];
      return siblings[siblings.indexOf(this) + 1] ?? null;
    },
  });
  // Panels put locale texts in with innerHTML; plain text here (no markup in them).
  const innerHtml = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", {
    configurable: true,
    get: innerHtml?.get,
    set(this: FakeElement, value: string) {
      this.textContent = String(value)
        .replace(/<[^>]*>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
    },
  });
  // insertAdjacentHTML("beforeend", '<tag a="b">text</tag>'): one element.
  Object.defineProperty(proto, "insertAdjacentHTML", {
    configurable: true,
    value(this: FakeElement, position: string, html: string) {
      const m = /^<(\w+)((?:\s+[\w-]+="[^"]*")*)>([^<]*)<\/\w+>$/.exec(html.trim());
      if (position !== "beforeend" || !m) throw new Error("fake insertAdjacentHTML: " + html);
      const element = this.ownerDocument.createElement(m[1] as string);
      for (const a of (m[2] as string).matchAll(/([\w-]+)="([^"]*)"/g))
        element.setAttribute(a[1] as string, a[2] as string);
      element.textContent = m[3] as string;
      this.appendChild(element);
    },
  });
  const savedClasses: Record<string, unknown> = {};
  for (const [name, tag] of Object.entries(TAGS)) {
    savedClasses[name] = g[name];
    g[name] = {
      [Symbol.hasInstance]: (value: unknown) => (value as FakeElement | null)?.tagName === tag,
    };
  }
  const savedEvent = g.Event;
  // Panels build native events (new Event("change")); the fake elements take fake ones.
  g.Event = FakeEvent;
  return {
    dom,
    make(tag: string, attributes: Record<string, string> = {}) {
      const element = dom.document.createElement(tag);
      for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
      return element;
    },
    uninstall() {
      FakeElement.prototype.matches = savedMatches;
      delete proto.parentNode;
      delete proto.nextSibling;
      delete proto.nodeName;
      delete proto.previousElementSibling;
      delete proto.insertAdjacentHTML;
      if (innerHtml) Object.defineProperty(proto, "innerHTML", innerHtml);
      for (const name of Object.keys(TAGS)) g[name] = savedClasses[name];
      g.Event = savedEvent;
      dom.uninstall();
    },
  };
}
