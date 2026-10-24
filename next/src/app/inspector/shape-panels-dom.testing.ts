/**
 * The fake DOM setup of the shape panel tests (ellipse, rectangle,
 * polygon, path, boolean operations, image, corner type picker): the
 * shared fake DOM (menus/testing/fake-dom.testing.ts) plus the selectors
 * the panels query (attributes, descendant and child combinators,
 * :checked), the element classes, native CustomEvent dispatch on fake
 * elements, a designer stub that records statistics, and a document
 * over a real scene whose editor logs its transactions.
 */
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import type { Document } from "../document/document.ts";
import {
  FakeElement,
  FakeEvent,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "../shell/designer.ts";
import { setDesigner } from "../shell/globals.ts";

const TAGS: Record<string, string> = {
  HTMLInputElement: "INPUT",
  HTMLSelectElement: "SELECT",
  HTMLTextAreaElement: "TEXTAREA",
  HTMLButtonElement: "BUTTON",
  Element: "*",
  HTMLElement: "*",
};
const g = globalThis as unknown as Record<string, unknown>;

/** One compound selector: tag, classes, attributes, :first-child, :last-child, :checked. */
function matchCompound(element: FakeElement, compound: string): boolean {
  const re =
    /^([a-z*]+)|\.([\w-]+)|\[([\w-]+)(?:(\^?=)"?([^"\]]*)"?)?\]|:(first-child|last-child|checked)/gi;
  let rest = compound;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while (rest.length && (m = re.exec(rest)) && m.index === 0) {
    const [all, tag, cls, attr, op, value, pseudo] = m;
    if (tag && tag !== "*" && element.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    if (cls && !element.classList.contains(cls)) return false;
    if (attr) {
      const actual = element.getAttribute(attr);
      if (actual === null) return false;
      if (op === "=" && actual !== value) return false;
      if (op === "^=" && !actual.startsWith(value as string)) return false;
    }
    if (pseudo === "checked" && !(element as unknown as { checked?: boolean }).checked)
      return false;
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

/** A native Event (the picker's CustomEvent) as the fake event the fake elements dispatch. */
function dispatchEvent(
  original: (event: FakeEvent) => boolean,
): (this: FakeElement, event: FakeEvent | Event) => boolean {
  return function (this: FakeElement, event: FakeEvent | Event): boolean {
    if (event instanceof FakeEvent) return original.call(this, event);
    const fake = new FakeEvent(event.type, { bubbles: event.bubbles });
    (fake as unknown as { detail: unknown }).detail = (event as CustomEvent).detail;
    return original.call(this, fake);
  };
}

export interface Transactions {
  /** "begin", "commit <title>", "hide", "reset-hide" in order. */
  log: string[];
}

export interface ShapeTestDom {
  dom: FakeDomHandle;
  /** The statistics calls: name and value. */
  stats: unknown[][];
  uninstall(): void;
}

/** Installs the fake DOM and a designer stub; call uninstall() after the test. */
export function installShapeTestDom(designer: Record<string, unknown> = {}): ShapeTestDom {
  const dom = installFakeDom();
  const savedMatches = FakeElement.prototype.matches;
  const savedDispatch = FakeElement.prototype.dispatchEvent;
  const savedRemove = FakeElement.prototype.removeAttribute;
  // removeAttribute("class") empties the class list, as in the browser.
  FakeElement.prototype.removeAttribute = function (this: FakeElement, name: string): void {
    if (name === "class") this._classes.length = 0;
    else savedRemove.call(this, name);
  };
  FakeElement.prototype.matches = matches;
  (FakeElement.prototype as unknown as { dispatchEvent: unknown }).dispatchEvent =
    dispatchEvent(savedDispatch);
  Object.defineProperty(FakeElement.prototype, "nodeName", {
    configurable: true,
    get(this: FakeElement) {
      return this.tagName;
    },
  });
  // The panels set locale captions and "&nbsp;" with innerHTML: kept as text.
  const innerHtml = Object.getOwnPropertyDescriptor(FakeElement.prototype, "innerHTML");
  Object.defineProperty(FakeElement.prototype, "innerHTML", {
    configurable: true,
    get: innerHtml?.get,
    set(this: FakeElement, value: string) {
      this.textContent = String(value)
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ");
    },
  });
  const savedClasses: Record<string, unknown> = {};
  for (const [name, tag] of Object.entries(TAGS)) {
    savedClasses[name] = g[name];
    g[name] = {
      [Symbol.hasInstance]: (value: unknown) =>
        value instanceof FakeElement && (tag === "*" || value.tagName === tag),
    };
  }
  const stats: unknown[][] = [];
  setDesigner({
    stats: (...args: unknown[]) => stats.push(args),
    isTouchEnabled: () => false,
    getActiveDocument: () => null,
    addEventListener() {},
    removeEventListener() {},
    ...designer,
  } as unknown as Designer);
  return {
    dom,
    stats,
    uninstall() {
      setDesigner(null);
      FakeElement.prototype.matches = savedMatches;
      FakeElement.prototype.dispatchEvent = savedDispatch;
      FakeElement.prototype.removeAttribute = savedRemove;
      delete (FakeElement.prototype as unknown as { nodeName?: string }).nodeName;
      if (innerHtml) Object.defineProperty(FakeElement.prototype, "innerHTML", innerHtml);
      else delete (FakeElement.prototype as unknown as { innerHTML?: string }).innerHTML;
      for (const name of Object.keys(TAGS)) g[name] = savedClasses[name];
      dom.uninstall();
    },
  };
}

/** A real scene with one page holding `nodes`. */
export function sceneWith(...nodes: Node[]): Scene {
  const scene = new Scene(new EditorWorkspace());
  const page = new Page();
  scene.appendChild(page);
  for (const node of nodes) (page as unknown as ContainerApi).appendChild(node);
  return scene;
}

/** A document over `scene` whose editor logs its transactions into `log`. */
export function documentOf(
  scene: Scene,
  log: string[],
  extra: Record<string, unknown> = {},
): Document {
  const editor = {
    beginTransaction: () => log.push("begin"),
    commitTransaction: (name: unknown) => log.push("commit " + String(name)),
    hideSelection: () => log.push("hide"),
    resetHideSelection: () => log.push("reset-hide"),
    addEventListener() {},
    removeEventListener() {},
    hasSelectionDetail: () => false,
    ...extra,
  };
  return { getScene: () => scene, getEditor: () => editor } as unknown as Document;
}

/** The first element under `root` matching `selector` (throws when there is none). */
export function find(root: unknown, selector: string): FakeElement {
  const found = (root as FakeElement).querySelector(selector);
  if (!found) throw new Error("No element for " + selector);
  return found;
}

/** Sets an input's value and fires its change event. */
export function change(input: FakeElement, value?: string): void {
  if (value !== undefined) input.value = value;
  input.dispatchEvent(new FakeEvent("change"));
}

/** Toggles a checkbox and fires its change event. */
export function check(box: FakeElement, checked: boolean): void {
  (box as unknown as { checked: boolean }).checked = checked;
  box.dispatchEvent(new FakeEvent("change"));
}

/** Fires a click on an element. */
export function click(element: FakeElement, init: { shiftKey?: boolean } = {}): void {
  element.dispatchEvent(new FakeEvent("click", init));
}
