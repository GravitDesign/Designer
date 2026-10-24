import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FakeElement,
  fire,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import { isEditable } from "./debounce.ts";
import { propertyRow, type RowColumn } from "./property-row.ts";

// The fake DOM has no nodeName and a read-only innerHTML; the row needs
// both (the :input test and the prefix markup, which here is only text
// and &nbsp;).
const proto = FakeElement.prototype as unknown as Record<string, unknown>;
const innerHTML = Object.getOwnPropertyDescriptor(FakeElement.prototype, "innerHTML");
Object.defineProperty(FakeElement.prototype, "innerHTML", {
  configurable: true,
  get: innerHTML?.get,
  set(this: FakeElement, value: string) {
    this.textContent = value.replace(/&nbsp;/g, " ");
  },
});
if (!("nodeName" in proto))
  Object.defineProperty(FakeElement.prototype, "nodeName", {
    get(this: FakeElement) {
      return this.tagName;
    },
  });

let dom: FakeDomHandle;

beforeEach(() => {
  dom = installFakeDom();
});

afterEach(() => {
  dom.uninstall();
});

function make(tag: string): FakeElement {
  return dom.document.createElement(tag);
}

function row(options: Parameters<typeof propertyRow>[1]): FakeElement {
  return propertyRow(make("div") as unknown as HTMLElement, options) as unknown as FakeElement;
}

function children(element: FakeElement | undefined): FakeElement[] {
  return element ? element.children : [];
}

describe("propertyRow (UI-FIELD-163, module 1725)", () => {
  it("builds the label, the columns and the captions with the old classes", () => {
    const input = make("input");
    const span = make("span");
    const element = row({
      label: "Size",
      clazz: "size",
      columns: [
        { content: input, width: "auto", label: "W" },
        { content: span, prefix: "H" },
        {},
      ] as unknown as RowColumn[],
    });
    expect(element.className).toBe("g-property-row size");
    const [label, columns, labels] = element.children;
    expect(label?.className).toBe("property-label");
    expect(children(label)[0]?.className).toBe("vertical-align");
    expect(label?.textContent).toBe("Size");
    const [first, second, third] = children(columns);
    expect([first?.tagName, first?.className]).toEqual(["LABEL", "column auto-grow"]);
    expect(children(first)[0]?.className).toBe("content");
    expect(children(children(first)[0])[0]).toBe(input);
    expect([second?.tagName, second?.className]).toEqual(["DIV", "column"]);
    expect(children(second).map((c) => c.className)).toEqual(["prefix", "content"]);
    expect(children(second)[0]?.textContent).toBe("H ");
    expect(third?.className).toBe("column no-padding");
    expect(third?.textContent).toBe(" ");
    expect(labels?.className).toBe("labels");
    expect(children(labels).map((c) => c.className)).toEqual(["auto-grow", "", "no-padding"]);
    expect(children(labels).map((c) => c.textContent)).toEqual(["W", " ", " "]);
  });

  it("wipes a prefix of a column with neither content nor html, as .html('&nbsp;') did", () => {
    const element = row({ columns: [{ prefix: "x", width: 40 }] });
    const column = children(element.children[0])[0];
    expect(column?.children).toEqual([]);
    expect(column?.textContent).toBe(" ");
    expect(column?.style.cssText).toBe("width: 40px;");
    expect(element.className).toBe("g-property-row no-label");
  });

  it("gives every column of a menu row an arrow that clicks that column's content", () => {
    const clicked: string[] = [];
    const a = make("button");
    const b = make("button");
    Object.assign(a, { click: () => clicked.push("a") });
    Object.assign(b, { click: () => clicked.push("b") });
    const element = row({
      isMenu: true,
      noPaddingRight: true,
      columns: [{ content: a }, { content: b }] as unknown as RowColumn[],
    });
    const columns = element.children[0] as FakeElement;
    expect(columns.className).toBe("columns no-padding-left no-padding-right");
    const arrow = children(columns.children[1]).find((c) => c.className === "gravit-icon-right");
    fire(arrow, "click");
    expect(clicked).toEqual(["b"]);
  });

  it("makes the label clickable with an arrow in its span", () => {
    const calls: unknown[] = [];
    const element = row({ label: "Font", click: () => calls.push("click"), columns: [] });
    const label = element.children[0] as FakeElement;
    expect(label.className).toBe("property-label clickable");
    const span = label.children[0] as FakeElement;
    expect(children(span).map((c) => c.className)).toEqual(["gravit-icon-down click-arrow"]);
    fire(span, "click");
    expect(calls).toEqual(["click"]);
  });

  it("puts an icon class in a span and marks the row and the label", () => {
    const element = row({ icon: "gravit-icon-w", justified: true, height: 30, columns: [] });
    expect(element.className).toBe("g-property-row icon-label justified");
    const label = element.children[0] as FakeElement;
    expect(label.className).toBe("property-label strict-line-height");
    expect(children(label)[0]?.className).toBe("gravit-icon-w");
    expect((element.children[1] as FakeElement).style.cssText).toBe("height: 30px;");
  });
});

describe("isEditable (UI-FIELD-174, :editable of module 1689)", () => {
  function input(type: string | null): FakeElement {
    const element = make("input");
    if (type !== null) element.setAttribute("type", type);
    return element;
  }

  it("accepts text-like inputs, textareas and contenteditable", () => {
    const editable = make("div");
    editable.setAttribute("contenteditable", "true");
    for (const element of [
      input(null),
      input(""),
      input("text"),
      input("number"),
      make("textarea"),
      editable,
    ])
      expect(isEditable(element as unknown as Element)).toBe(true);
  });

  it("rejects checkboxes, other inputs, selects and buttons", () => {
    for (const element of [
      input("checkbox"),
      input("radio"),
      input("range"),
      make("select"),
      make("button"),
    ])
      expect(isEditable(element as unknown as Element)).toBe(false);
    expect(isEditable(null)).toBe(false);
  });
});
