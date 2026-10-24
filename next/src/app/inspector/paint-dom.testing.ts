/**
 * The fake DOM setup of the paint panel tests (fill, appearance): the
 * shared fake DOM (menus/testing/fake-dom.testing.ts) plus the selectors
 * and element classes the panels use, and a designer stub.
 */
import { StyleEdManager } from "../../editor/style-ed-manager.ts";
import type { Document } from "../document/document.ts";
import {
  FakeElement,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "../shell/designer.ts";
import { setDesigner } from "../shell/globals.ts";
import type { Scene } from "../../engine/scene/scene.ts";

// The fake DOM has no element classes; paint-dom's `:input` check uses them.
const TAGS: Record<string, string> = {
  HTMLInputElement: "INPUT",
  HTMLSelectElement: "SELECT",
  HTMLTextAreaElement: "TEXTAREA",
  HTMLButtonElement: "BUTTON",
};
const g = globalThis as unknown as Record<string, unknown>;
const savedClasses: Record<string, unknown> = {};

/**
 * The selectors the panel queries (attributes, descendant and child
 * combinators, :first-child, :last-child), which the shared fake DOM's
 * matcher doesn't have.
 */
function matchCompound(element: FakeElement, compound: string): boolean {
  const re =
    /^([a-z*]+)|\.([\w-]+)|\[([\w-]+)(?:(\^?=)"?([^"\]]*)"?)?\]|:(first-child|last-child)/gi;
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
    if (pseudo) {
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

const savedMatches = FakeElement.prototype.matches;
function patchMatches(): void {
  FakeElement.prototype.matches = function (this: FakeElement, selector: string): boolean {
    return selector.split(",").some((one) => {
      const parts = one
        .trim()
        .split(/\s*(>)\s*|\s+/)
        .map((part) => (part === undefined ? " " : part))
        .filter((part) => part !== "");
      return matchChain(this, parts);
    });
  };
}

export interface PaintTestDom {
  dom: FakeDomHandle;
  commits: { name: unknown; data: unknown }[];
  contextMenus: unknown[];
  uninstall(): void;
}

/** Installs the fake DOM and a designer stub; call uninstall() after the test. */
export function installPaintTestDom(designer: Record<string, unknown> = {}): PaintTestDom {
  const dom = installFakeDom();
  patchMatches();
  for (const [name, tag] of Object.entries(TAGS)) {
    savedClasses[name] = g[name];
    g[name] = {
      [Symbol.hasInstance]: (value: unknown) => (value as FakeElement | null)?.tagName === tag,
    };
  }
  const contextMenus: unknown[] = [];
  const styleEdManager = new StyleEdManager();
  setDesigner({
    stats() {},
    isTouchEnabled: () => false,
    getOpacityIncrement: () => 1,
    getActiveDocument: () => null,
    getWorkspace: () => ({ getStyleEdManager: () => styleEdManager }),
    getRightSidebars: () => ({ getSidebar: () => ({ trigger() {} }) }),
    setMouseOverContext() {},
    getContextMenu: () => ({ trigger: (options: unknown) => contextMenus.push(options) }),
    getLicense: () => ({ isPro: () => true, isExpired: () => false }),
    isEnabledProFeatures: () => true,
    getStylePreview: () => null,
    addEventListener() {},
    removeEventListener() {},
    ...designer,
  } as unknown as Designer);
  return {
    dom,
    commits: [],
    contextMenus,
    uninstall() {
      setDesigner(null);
      FakeElement.prototype.matches = savedMatches;
      for (const name of Object.keys(TAGS)) g[name] = savedClasses[name];
      dom.uninstall();
    },
  };
}

/** Every element below `root`, in document order. */
export function descendants(root: FakeElement): FakeElement[] {
  const out: FakeElement[] = [];
  const walk = (node: FakeElement) => {
    for (const child of node.children) {
      out.push(child);
      walk(child);
    }
  };
  walk(root);
  return out;
}

/** A document over `scene` whose editor records commits into `commits`. */
export function documentOf(scene: Scene, commits: { name: unknown; data: unknown }[]): Document {
  const editor = {
    beginTransaction() {},
    commitTransaction(name: unknown, data: unknown) {
      commits.push({ name, data });
    },
    hideSelection() {},
    resetHideSelection() {},
  };
  return {
    getScene: () => scene,
    getEditor: () => editor,
    updateActiveStylesList() {},
    clearActiveStylesList() {},
    hasCDR: () => false,
  } as unknown as Document;
}
