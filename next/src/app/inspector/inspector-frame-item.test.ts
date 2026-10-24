/**
 * The frame, group frame, item and align panels' handlers on the fake DOM
 * with a real scene and editor. Old code: designer.browser.dev.js
 * 158563-158673 (frame), 158703-158818 (group frame), 158853-159027
 * (item), 93907-93968 (align).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Group } from "../../engine/scene/group.ts";
import { Image } from "../../engine/scene/image.ts";
import { Layer } from "../../engine/scene/layer.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import "../../editor/index.ts";
import { Editor } from "../../editor/editor.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import type { Document } from "../document/document.ts";
import { FakeElement, fire } from "../menus/testing/fake-dom.testing.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { AlignProperties } from "./align-properties.ts";
import { FrameProperties } from "./frame-properties.ts";
import { GroupFrameProperties } from "./group-frame-properties.ts";
import { ItemProperties } from "./item-properties.ts";
import { installPaintTestDom, type PaintTestDom } from "./paint-dom.testing.ts";
import type { Properties } from "./properties.ts";

let t: PaintTestDom;
let touch = false;
const executed: unknown[][] = [];
/** The designer's SettingChangedEvent listeners. */
const settingListeners: unknown[] = [];

beforeEach(() => {
  touch = false;
  executed.length = 0;
  settingListeners.length = 0;
  t = installPaintTestDom({
    isTouchEnabled: () => touch,
    getAction: () => ({ getTitle: () => new LocaleKey("GCommonNames", "action.rotate") }),
    executeAction: (...args: unknown[]) => executed.push(args),
    addEventListener: (type: unknown, listener: unknown) => {
      if (type === SettingChangedEvent) settingListeners.push(listener);
    },
    removeEventListener: (type: unknown, listener: unknown) => {
      const index = settingListeners.indexOf(listener);
      if (type === SettingChangedEvent && index >= 0) settingListeners.splice(index, 1);
    },
  });
});

let unpatch: () => void = () => {};

beforeEach(() => {
  unpatch = patchChecked();
});

afterEach(() => {
  unpatch();
  t.uninstall();
});

interface Setup {
  scene: Scene;
  page: Page;
  document: Document;
  commits: unknown[];
}

function setup(): Setup {
  const scene = new Scene(new EditorWorkspace());
  const page = new Page();
  scene.appendChild(page);
  const editor = new Editor(scene);
  const commits: unknown[] = [];
  const commit = editor.commitTransaction.bind(editor);
  vi.spyOn(editor, "commitTransaction").mockImplementation((name?: unknown, ...rest) => {
    commits.push(name);
    return commit(name as string, ...(rest as []));
  });
  const document = { getScene: () => scene, getEditor: () => editor } as unknown as Document;
  return { scene, page, document, commits };
}

function add<T extends Node>(parent: Node, child: T): T {
  (parent as unknown as ContainerApi).appendChild(child);
  return child;
}

function rect(parent: Node): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(50, 0, 0, 25, 50, 25));
  return add(parent, r);
}

function init<T extends Properties>(properties: T): { properties: T; root: FakeElement } {
  const root = t.dom.document.createElement("div");
  const toolbar = t.dom.document.createElement("div");
  properties.init(root as unknown as HTMLElement, toolbar as unknown as HTMLElement);
  return { properties, root };
}

/**
 * The fake DOM's matcher doesn't know :checked, which the panels' handlers
 * test, and its innerHTML can't be set.
 */
function patchChecked(): () => void {
  const proto = FakeElement.prototype;
  const matches = proto.matches;
  proto.matches = function (this: FakeElement, selector: string): boolean {
    if (selector === ":checked") return !!(this as unknown as HTMLInputElement).checked;
    return matches.call(this, selector);
  };
  // propertyRow writes a prefix's label markup (plain text here) through innerHTML.
  const html = Object.getOwnPropertyDescriptor(proto, "innerHTML");
  Object.defineProperty(proto, "innerHTML", {
    configurable: true,
    get(this: FakeElement) {
      return this.textContent;
    },
    set(this: FakeElement, value: string) {
      this.textContent = value;
    },
  });
  return () => {
    proto.matches = matches;
    if (html) Object.defineProperty(proto, "innerHTML", html);
    else Reflect.deleteProperty(proto, "innerHTML");
  };
}

function check(box: FakeElement | null, checked: boolean): void {
  (box as unknown as HTMLInputElement).checked = checked;
  fire(box, "change");
}

describe("FrameProperties", () => {
  it("turns the frame mode of every layer on and off in one transaction each", () => {
    const s = setup();
    const a = add(s.page, new Layer());
    const b = add(s.page, new Layer());
    rect(a);
    rect(b);
    const { properties, root } = init(new FrameProperties());
    expect(properties.update(s.document, [a, b])).toBe(true);
    const box = root.querySelector('input[data-item-property="frm"]');
    expect((box as unknown as HTMLInputElement).checked).toBe(false);
    check(box, true);
    expect([!!a.getProperty("frm"), !!b.getProperty("frm")]).toEqual([true, true]);
    check(box, false);
    expect([!!a.getProperty("frm"), !!b.getProperty("frm")]).toEqual([false, false]);
    expect(s.commits).toEqual(["Turn On Frame Mode", "Turn Off Frame Mode"]);
  });

  it("follows the first layer's frame after a change", () => {
    const s = setup();
    const a = add(s.page, new Layer());
    rect(a);
    const { properties, root } = init(new FrameProperties());
    properties.update(s.document, [a]);
    a.setFrame(true);
    const box = root.querySelector('input[data-item-property="frm"]');
    expect((box as unknown as HTMLInputElement).checked).toBe(true);
  });

  it("adds a settings listener on every update with a document (Q-311)", () => {
    const s = setup();
    const { properties } = init(new FrameProperties());
    const r = rect(s.page);
    // Not layers: the listener stays and the next update adds another.
    properties.update(s.document, [r]);
    properties.update(s.document, [r]);
    properties.update(s.document, [r]);
    expect(settingListeners).toHaveLength(3);
    const layer = add(s.page, new Layer());
    properties.update(s.document, [layer]);
    // A shown panel removes one on the next update, which adds one again.
    properties.update(s.document, [layer]);
    expect(settingListeners).toHaveLength(4);
  });

  it("mounts the checkbox slider again on every touch update (Q-311)", () => {
    const s = setup();
    const { properties, root } = init(new FrameProperties());
    const box = root.querySelector(".frm-checkbox") as FakeElement;
    expect(box.listenerCount("change")).toBe(1);
    touch = true;
    const layer = add(s.page, new Layer());
    properties.update(s.document, [layer]);
    properties.update(s.document, [layer]);
    expect(box.classList.contains("g-checkbox-slider")).toBe(true);
    expect(box.listenerCount("change")).toBe(3);
    touch = false;
    properties.update(s.document, [layer]);
    expect(box.classList.contains("g-checkbox-slider")).toBe(false);
  });
});

describe("GroupFrameProperties", () => {
  it("switches groups to frames and back through the select", () => {
    const s = setup();
    const a = add(s.page, new Group());
    const b = add(s.page, new Group());
    rect(a);
    rect(b);
    const { properties, root } = init(new GroupFrameProperties());
    expect(properties.update(s.document, [a, b])).toBe(true);
    const select = root.querySelector('[data-item-property="frm"]') as FakeElement;
    expect(select.value).toBe("0");
    select.value = "1";
    fire(select, "change");
    expect([!!a.getProperty("frm"), !!b.getProperty("frm")]).toEqual([true, true]);
    // The panel follows the first group.
    expect(select.value).toBe("1");
    select.value = "0";
    fire(select, "change");
    expect([!!a.getProperty("frm"), !!b.getProperty("frm")]).toEqual([false, false]);
    expect(s.commits).toEqual(["Switch to Frame", "Switch to Group"]);
  });
});

describe("ItemProperties", () => {
  it("writes clk to items with item children and scc only to shapes", () => {
    const s = setup();
    const group = add(s.page, new Group());
    rect(group);
    const empty = add(s.page, new Group());
    const shape = rect(s.page);
    rect(shape);
    const { properties, root } = init(new ItemProperties());
    expect(properties.update(s.document, [group, empty, shape])).toBe(true);
    check(root.querySelector('input[data-item-property="clk"]'), true);
    expect([group, empty, shape].map((n) => !!n.getProperty("clk"))).toEqual([true, false, true]);
    check(root.querySelector('input[data-item-property="scc"]'), true);
    expect([group, empty, shape].map((n) => !!n.getProperty("scc"))).toEqual([false, false, true]);
    // Each change is one transaction without a title, as before.
    expect(s.commits).toEqual([undefined, undefined]);
  });

  /** The rows' display and classes after an update with `element` first. */
  function rows(element: Node): { item: string[]; shape: string[] } {
    const { properties, root } = init(new ItemProperties());
    properties._items = [element as never];
    properties._updateProperties();
    const describe = (selector: string) =>
      root
        .querySelectorAll<FakeElement>(selector)
        .flatMap((row) => [row.style.display || "shown", row.className]);
    return { item: describe("[major-item-only]"), shape: describe("[major-shape-only]") };
  }

  it("shows scale with content only for shapes that aren't images in frame mode", () => {
    const s = setup();
    const group = add(s.page, new Group());
    rect(group);
    expect(rows(group)).toEqual({
      item: ["shown", "g-property-row no-label"],
      shape: ["none", "g-property-row no-label"],
    });
    const shape = rect(s.page);
    rect(shape);
    expect(rows(shape)).toEqual({
      item: ["shown", "g-property-row no-label item-click-through"],
      shape: ["shown", "g-property-row no-label shape-scale-with-content"],
    });
    const image = add(s.page, new Image());
    rect(image);
    image.setProperty("dblMode", true);
    expect(rows(image)).toEqual({
      item: ["shown", "g-property-row no-label"],
      shape: ["none", "g-property-row no-label"],
    });
    const lone = rect(s.page);
    expect(rows(lone)).toEqual({
      item: ["none", "g-property-row no-label"],
      shape: ["none", "g-property-row no-label"],
    });
  });

  it("mounts sliders on both checkboxes in touch mode", () => {
    const s = setup();
    const { properties, root } = init(new ItemProperties());
    touch = true;
    properties.update(s.document, [rect(s.page)]);
    for (const selector of [".clk-checkbox", ".scc-checkbox"])
      expect(
        (root.querySelector(selector) as FakeElement).classList.contains("g-checkbox-slider"),
      ).toBe(true);
  });
});

describe("AlignProperties", () => {
  function align(): {
    s: Setup;
    root: FakeElement;
    elements: Node[];
    properties: AlignProperties;
  } {
    const s = setup();
    const elements = [rect(s.page), rect(s.page)];
    const { properties, root } = init(new AlignProperties());
    expect(properties.update(s.document, elements)).toBe(true);
    return { s, root, elements, properties };
  }

  const space = (root: FakeElement, type: string) =>
    root.querySelector(`[data-dist="${type}"]`) as FakeElement;

  it("distributes with the typed gap on Enter", () => {
    const { root, elements } = align();
    const box = space(root, "horizontal");
    box.value = "20";
    fire(box, "keydown", { keyCode: 13 });
    expect(executed).toEqual([["arrange.distribute.horizontal", [elements, null, 20], "shortcut"]]);
    // The box is formatted with the scene's decimals.
    expect(box.value).toBe("20");
  });

  it("reads a typed gap below 1 as 1 (the box's minValue), skips text and shows 1", () => {
    const { root, elements } = align();
    const box = space(root, "vertical");
    for (const value of ["0", "-5", "abc"]) {
      box.value = value;
      fire(box, "keydown", { keyCode: 13 });
      expect(box.value).toBe("1");
    }
    // "0" and "-5" clamp to 1 and distribute; "abc" reads as 0, which the
    // panel's `distance > 0` check skips.
    const call = ["arrange.distribute.vertical", [elements, null, 1], "shortcut"];
    expect(executed).toEqual([call, call]);
    box.value = "7";
    fire(box, "keydown", { keyCode: 65 });
    expect(executed).toHaveLength(2);
    expect(box.value).toBe("7");
  });

  it("runs the justify actions with the alignproperties source", () => {
    const { root } = align();
    const buttons = root.querySelectorAll<FakeElement>("button[data-action]");
    expect(buttons.map((b) => b.getAttribute("data-action"))).toEqual([
      "arrange.align.align-justify-horizontal",
      "arrange.align.align-justify-vertical",
    ]);
    fire(buttons[1], "click");
    expect(executed).toEqual([
      ["arrange.align.align-justify-vertical", undefined, "alignproperties"],
    ]);
  });

  it("reformats the gaps when the decimals setting changes", () => {
    const { root, properties } = align();
    expect(settingListeners).toHaveLength(1);
    const box = space(root, "horizontal");
    box.value = "-3";
    properties._settingChanged(new SettingChangedEvent("touch", false, true));
    expect(box.value).toBe("-3");
    properties._settingChanged(new SettingChangedEvent("decimals_num", 1, 2));
    expect(box.value).toBe("1");
  });
});
