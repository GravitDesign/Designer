import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Page } from "../../engine/scene/page.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Style } from "../../engine/style/style.ts";
import { PropertySet } from "../../engine/style/stylable-sets.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import {
  fire,
  FakeEvent,
  FakeElement,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { designerStyleEditor } from "./designer-style-editor.ts";

/**
 * Selector matching for the parts the picker uses (tag, classes,
 * attributes, :not(simple)), with child and descendant combinators.
 */
function matchCompound(element: FakeElement, compound: string): boolean {
  const re = /^([a-z*]+)|\.([\w-]+)|\[([\w-]+)(?:(\^?=)"?([^"\]]*)"?)?\]|:not\(([^)]*)\)/gi;
  let rest = compound;
  let m: RegExpExecArray | null;
  while (rest.length && ((re.lastIndex = 0), (m = re.exec(rest))) && m.index === 0) {
    const [all, tag, cls, attr, op, value, not] = m;
    if (tag && tag !== "*" && element.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    if (cls && !element.classList.contains(cls)) return false;
    if (attr) {
      const actual = element.getAttribute(attr);
      if (actual === null) return false;
      if (op === "=" && actual !== value) return false;
      if (op === "^=" && !actual.startsWith(value as string)) return false;
    }
    if (not && matchCompound(element, not)) return false;
    rest = rest.slice(all.length);
  }
  return rest.length === 0;
}

function matchChain(element: FakeElement | null, parts: string[]): boolean {
  if (!element) return false;
  const last = parts[parts.length - 1] as string;
  if (!matchCompound(element, last)) return false;
  if (parts.length === 1) return true;
  const combinator = parts[parts.length - 2];
  const before = parts.slice(0, -2);
  if (combinator === ">") return matchChain(element.parentElement, before);
  for (let n = element.parentElement; n; n = n.parentElement)
    if (matchChain(n, before)) return true;
  return false;
}

const g = globalThis as unknown as Record<string, unknown>;
const saved = {
  element: g.Element,
  customEvent: g.CustomEvent,
  matches: FakeElement.prototype.matches,
};
function patchDom(): void {
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
  g.Element = FakeElement;
  g.CustomEvent = class extends FakeEvent {
    detail: unknown;
    constructor(type: string, init: { bubbles?: boolean; detail?: unknown } = {}) {
      super(type, { bubbles: init.bubbles ?? false });
      this.detail = init.detail;
    }
  };
  const proto = FakeElement.prototype as unknown as Record<string, unknown>;
  proto.getClientRects = function (this: FakeElement) {
    return this.parentElement ? [this.box] : [];
  };
  Object.defineProperty(proto, "nodeName", {
    configurable: true,
    get(this: FakeElement) {
      return this.tagName;
    },
  });
}

let dom: FakeDomHandle;
let commits: unknown[];
let updates: unknown[][];
let previews: unknown[][];
let selection: Rectangle[];
let scene: Scene;

function styleNamed(name: string, defaultStyle = false): Style {
  const style = new Style();
  style.setProperty("name", name);
  style.setProperty("defaultStyle", defaultStyle);
  (scene.getStyles() as unknown as ContainerApi).appendChild(style);
  return style;
}

beforeEach(() => {
  dom = installFakeDom();
  patchDom();
  commits = [];
  updates = [];
  previews = [];
  scene = new Scene(new EditorWorkspace());
  const page = new Page();
  scene.appendChild(page);
  const rect = new Rectangle();
  (page as unknown as ContainerApi).appendChild(rect);
  selection = [rect];
  const editor = {
    getSelection: () => selection,
    beginTransaction() {},
    commitTransaction(name: unknown) {
      commits.push(name);
    },
    updateSelection(...args: unknown[]) {
      updates.push(args);
    },
  };
  const document = { getScene: () => scene, getEditor: () => editor };
  setDesigner({
    getActiveDocument: () => document,
    getStylePreview: () => "data:image/png;base64,AAAA",
    createNewStylePreview: (...args: unknown[]) => {
      previews.push(args);
      return "data:image/png;base64,BBBB";
    },
  } as unknown as Designer);
});

afterEach(() => {
  resetGlobals();
  FakeElement.prototype.matches = saved.matches;
  g.Element = saved.element;
  g.CustomEvent = saved.customEvent;
  delete (FakeElement.prototype as unknown as Record<string, unknown>).getClientRects;
  delete (FakeElement.prototype as unknown as Record<string, unknown>).nodeName;
  dom.uninstall();
});

function field(): FakeElement {
  const container = dom.document.createElement("div");
  const inner = dom.document.createElement("span");
  inner.classList.add("g-styles-field");
  container.appendChild(inner);
  dom.document.body.appendChild(container);
  designerStyleEditor(container as unknown as HTMLElement);
  return container;
}

const picker = () => dom.document.querySelector(".g-style-editor");
const names = (root: FakeElement) =>
  root.querySelectorAll(".style").map((row) => row.querySelector("span")?.textContent ?? null);

describe("designerStyleEditor", () => {
  it("opens the picker with the shared styles, not the default ones", () => {
    styleNamed("Default", true);
    styleNamed("Blue");
    styleNamed("Red");
    const target = field();
    expect(picker()).toBe(null);
    fire(target, "click");
    const content = picker() as FakeElement;
    expect(content.style.getPropertyValue("width")).toBe("250px");
    expect(content.parentElement?.classList.contains("g-overlay")).toBe(true);
    const [noStyle, list, toolbar] = content.children as FakeElement[];
    expect(noStyle?.className).toBe("styles no-style");
    expect(noStyle?.querySelector(".style")?.className).toBe("style g-selected");
    expect(names(list as FakeElement)).toEqual(["Blue", "Red"]);
    expect(list?.className).toBe("styles");
    expect(toolbar?.className).toBe("style-toolbar");
  });

  it("doesn't open while the field is disabled", () => {
    const target = field();
    target.querySelector(".g-styles-field")?.classList.add("g-disabled");
    fire(target, "click");
    expect(picker()).toBe(null);
  });

  it("marks the linked style and links another one on click, in one undo step", () => {
    const blue = styleNamed("Blue");
    const red = styleNamed("Red");
    (selection[0] as Rectangle).setProperty("sref", blue.getReferenceId());
    const target = field();
    fire(target, "click");
    const rows = (picker() as FakeElement).children[1]?.querySelectorAll(".style") ?? [];
    expect(rows.map((row) => row.className)).toEqual(["style g-selected", "style"]);
    expect(
      (picker() as FakeElement).querySelector(".no-style .style")?.classList.contains("g-selected"),
    ).toBe(false);
    fire(rows[1], "click");
    expect((selection[0] as Rectangle).getProperty("sref")).toBe(red.getReferenceId());
    expect(commits).toHaveLength(1);
    expect(updates).toEqual([[false, selection]]);
    // The row click closes the picker.
    expect(picker()).toBe(null);
  });

  it("creates a style from the selection and links it", () => {
    const target = field();
    fire(target, "click");
    const createBox = (picker() as FakeElement).querySelector(".style-toolbar")?.children[0];
    fire(createBox, "click");
    const creator = dom.document.querySelector(".g-style-creator") as FakeElement;
    expect(creator).not.toBe(null);
    const boxes = creator.querySelectorAll(".checkboxes input");
    expect(boxes.map((box) => box.getAttribute("data-property"))).toEqual([
      "style",
      "fill",
      "border",
      "effects",
      "text",
    ]);
    // A rectangle shares everything but the text sets.
    expect(boxes.map((box) => (box as unknown as { checked: boolean }).checked)).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
    const before = (scene.getStyles() as unknown as ContainerApi).getChildren().length;
    fire(creator.querySelector(".creator-toolbar.bottom button"), "click");
    const children = (scene.getStyles() as unknown as ContainerApi).getChildren();
    expect(children.length).toBe(before + 1);
    const created = children[children.length - 1] as Style;
    expect(created.getProperty("defaultStyle")).toBe(false);
    expect(created.getProperty("ps")).toEqual([
      PropertySet.Style,
      PropertySet.FillPaintLayers,
      PropertySet.BorderPaintLayers,
      PropertySet.Effects,
    ]);
    expect((selection[0] as Rectangle).getProperty("sref")).toBe(created.getReferenceId());
    expect(previews).toEqual([[created, true, false]]);
    // Both overlays are closed again.
    expect(dom.document.querySelector(".g-style-creator")).toBe(null);
    expect(picker()).toBe(null);
  });
});

describe("the style organizer", () => {
  function openOrganizer(): FakeElement {
    const target = field();
    fire(target, "click");
    const organizeBox = (picker() as FakeElement).querySelector(".style-toolbar")?.children[1];
    fire(organizeBox, "click");
    return dom.document.querySelector(".g-dialog.g-style-creator.organizer") as FakeElement;
  }

  const order = () =>
    (scene.getStyles() as unknown as ContainerApi)
      .getChildren()
      .map((style) => (style as Style).getProperty("name"))
      .filter((name) => ["A", "B", "C"].includes(name as string));

  /** Drags the row named `from` onto the row named `to`. */
  function drag(dialog: FakeElement, from: string, to: string, drop = true): void {
    const row = (name: string) =>
      dialog.querySelectorAll(".style").find((r) => r.querySelector("span")?.textContent === name);
    fire(row(from), "mousedown");
    fire(row(from), "dragstart");
    if (drop) fire(row(to), "drop");
  }

  it("lists draggable rows with edit and delete buttons", () => {
    styleNamed("A");
    styleNamed("B");
    const dialog = openOrganizer();
    const rows = dialog.querySelectorAll(".style");
    expect(rows.map((r) => r.getAttribute("draggable"))).toEqual(["true", "true"]);
    expect(rows.map((r) => r.querySelector(".styles-buttons")?.children.length)).toEqual([2, 2]);
  });

  it("moves a dropped style after a later row and before an earlier one", () => {
    styleNamed("A");
    styleNamed("B");
    styleNamed("C");
    const dialog = openOrganizer();
    drag(dialog, "A", "C");
    expect(order()).toEqual(["B", "C", "A"]);
    drag(dialog, "A", "B");
    expect(order()).toEqual(["A", "B", "C"]);
  });

  it("moves twice after a drag that was not dropped (old listeners pile up)", () => {
    styleNamed("A");
    styleNamed("B");
    styleNamed("C");
    const dialog = openOrganizer();
    drag(dialog, "A", "C", false);
    drag(dialog, "A", "C");
    // The first drop listener puts A after C, the second one before C again.
    expect(order()).toEqual(["B", "A", "C"]);
  });

  it("rebuilds the picker's rows on Finish", () => {
    styleNamed("A");
    const dialog = openOrganizer();
    styleNamed("B");
    fire(dialog.querySelector(".creator-toolbar.bottom button"), "click");
    const list = (picker() as FakeElement).children[1] as FakeElement;
    expect(names(list)).toEqual(["A", "B"]);
  });
});
