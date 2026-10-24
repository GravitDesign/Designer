/**
 * The inspector sidebar's panel update (_updatePropertyPanels, _updateUI,
 * _settingChanged) on the fake DOM, with fake panels registered under the
 * PROPERTIES_TABLE names the sidebar groups by. Expected values follow the
 * old code, designer.browser.dev.js 56034-56127.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FakeElement } from "../menus/testing/fake-dom.testing.ts";
import { setLateModules } from "../shell/late.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { buildProperties, InspectorSidebar, setPropertiesSource } from "./inspector-sidebar.ts";
import { installPaintTestDom, type PaintTestDom } from "./paint-dom.testing.ts";
import { Properties } from "./properties.ts";

let t: PaintTestDom;
let touch = false;
const restore: (() => void)[] = [];

/** Defines a getter or method on FakeElement.prototype for this test file. */
function patch(name: string, descriptor: PropertyDescriptor): void {
  const proto = FakeElement.prototype as unknown as Record<string, unknown>;
  const saved = Object.getOwnPropertyDescriptor(proto, name);
  Object.defineProperty(proto, name, { configurable: true, ...descriptor });
  restore.push(() => {
    if (saved) Object.defineProperty(proto, name, saved);
    else Reflect.deleteProperty(proto, name);
  });
}

/** Whether the element or an ancestor has an inline display of none. */
function hiddenChain(element: FakeElement): boolean {
  for (let n: FakeElement | null = element; n; n = n.parentElement)
    if (n.style.display === "none") return true;
  return false;
}

function attached(element: FakeElement): boolean {
  for (let n: FakeElement | null = element; n; n = n.parentElement)
    if (n === element.ownerDocument.documentElement) return true;
  return false;
}

/** The parts of Element the sidebar uses that the shared fake DOM lacks. */
function patchFakeDom(): void {
  const sibling = function (this: FakeElement): FakeElement | null {
    const parent = this.parentElement;
    return parent ? (parent.children[parent.children.indexOf(this) + 1] ?? null) : null;
  };
  patch("parentNode", {
    get(this: FakeElement) {
      return this.parentElement;
    },
  });
  patch("nextSibling", { get: sibling });
  patch("nextElementSibling", { get: sibling });
  patch("isConnected", {
    get(this: FakeElement) {
      return attached(this);
    },
  });
  patch("innerHTML", {
    get(this: FakeElement) {
      return this.children.length ? "<child>" : this.textContent;
    },
  });
  // jQuery's :visible: attached and no hidden ancestor.
  patch("getClientRects", {
    value(this: FakeElement) {
      if (!attached(this)) return [];
      return hiddenChain(this) ? [] : [{}];
    },
  });
  const insertBefore = FakeElement.prototype.insertBefore;
  patch("insertBefore", {
    value(this: FakeElement, node: FakeElement, reference: FakeElement | null) {
      // A real DOM leaves a node in place when it is its own reference.
      if (node === reference) return node;
      return insertBefore.call(this, node, reference);
    },
  });
}

interface PanelOptions {
  /** The old toString name. */
  name: string;
  /** What init puts into the toolbar (nothing: the toolbar is dropped). */
  toolbarLabel?: string;
  /** A class init adds to the panel. */
  panelClass?: string;
}

/** A panel class whose visibility and isGroup answer a test sets per instance. */
function panelClass(options: PanelOptions) {
  return class FakePanel extends Properties {
    visible = true;
    group = true;
    previousSeen: (Properties | null)[] = [];

    override init(panel: HTMLElement, toolbar: HTMLElement): void {
      if (options.panelClass) panel.classList.add(options.panelClass);
      if (options.toolbarLabel !== undefined) {
        const label = document.createElement("label");
        label.textContent = options.toolbarLabel;
        toolbar.appendChild(label);
      }
    }

    override isAvailable(): boolean {
      return true;
    }

    override update(): boolean {
      return this.visible;
    }

    override isGroup(previous: Properties | null): boolean {
      this.previousSeen.push(previous);
      return this.group;
    }

    override toString(): string {
      return `[Object ${options.name}]`;
    }
  };
}

const TextPanel = panelClass({ name: "GTextProperties" });
const SlicePanel = panelClass({ name: "GSliceProperties" });
const BoolOpPanel = panelClass({ name: "GBoolOpProperties" });
const AppearancePanel = panelClass({ name: "GAppearanceProperties" });
const PlainPanel = panelClass({ name: "GPlain", toolbarLabel: "Plain" });

function registerAppearanceGroup(): void {
  setLateModules({
    "inspector/text-properties.ts": { TextProperties: TextPanel },
    "inspector/slice-properties.ts": { SliceProperties: SlicePanel },
    "inspector/bool-op-properties.ts": { BoolOpProperties: BoolOpPanel },
    "inspector/appearance-properties.ts": { AppearanceProperties: AppearancePanel },
  });
}

/** An InspectorSidebar initialised in a `.sidebar-inspector` host in body. */
function sidebarWith(panels: Properties[]): { sidebar: InspectorSidebar; host: FakeElement } {
  setPropertiesSource(() => panels);
  const host = t.dom.document.createElement("div");
  host.classList.add("sidebar-inspector");
  t.dom.document.body.appendChild(host);
  const sidebar = new InspectorSidebar();
  sidebar.init(host as unknown as HTMLElement);
  return { sidebar, host };
}

const display = (element: FakeElement | null | undefined): string =>
  (element as FakeElement).style.display;

beforeEach(() => {
  touch = false;
  t = installPaintTestDom({
    isTouchEnabled: () => touch,
    getToolManager: () => ({
      getActiveTool: () => null,
      addEventListener() {},
      removeEventListener() {},
    }),
    getRightSidebars: () => ({ addEventListener() {}, removeEventListener() {} }),
  });
  patchFakeDom();
});

afterEach(() => {
  while (restore.length) (restore.pop() as () => void)();
  t.uninstall();
  setLateModules({});
  setPropertiesSource(() => buildProperties());
});

describe("InspectorSidebar._updatePropertyPanels", () => {
  it("shows the slice panel's shared toolbar again in touch mode (R7-C-501)", () => {
    registerAppearanceGroup();
    const text = new TextPanel();
    const slice = new SlicePanel();
    const boolOp = new BoolOpPanel();
    text.visible = false;
    boolOp.visible = false;
    touch = true;
    const { host } = sidebarWith([text, slice, boolOp]);
    // The hidden bool-op panel came last and hid the shared toolbar.
    expect(display(host.querySelector(".appearance-toolbar"))).toBe("");
  });

  it("leaves the shared toolbar hidden on the desktop", () => {
    registerAppearanceGroup();
    const slice = new SlicePanel();
    const boolOp = new BoolOpPanel();
    boolOp.visible = false;
    const { host } = sidebarWith([slice, boolOp]);
    expect(display(host.querySelector(".appearance-toolbar"))).toBe("none");
  });

  it("does not re-show the toolbar for a visible text panel in touch mode", () => {
    registerAppearanceGroup();
    const text = new TextPanel();
    const slice = new SlicePanel();
    const boolOp = new BoolOpPanel();
    slice.visible = false;
    boolOp.visible = false;
    touch = true;
    const { host } = sidebarWith([text, slice, boolOp]);
    expect(display(host.querySelector(".appearance-toolbar"))).toBe("none");
  });

  it("shows a divider only after a previous visible panel that groups with it", () => {
    const first = new PlainPanel();
    const hidden = new PlainPanel();
    const grouped = new PlainPanel();
    const separate = new PlainPanel();
    hidden.visible = false;
    separate.group = false;
    const { host } = sidebarWith([first, hidden, grouped, separate]);
    const rules = host.querySelectorAll(".scrolling-panels > hr");
    expect(rules.map((hr) => display(hr))).toEqual(["none", "none", "", "none"]);
    // isGroup gets the previous visible panel, skipping the hidden one.
    expect(grouped.previousSeen).toEqual([first]);
    expect(separate.previousSeen).toEqual([grouped]);
    // The first visible panel is never asked.
    expect(first.previousSeen).toEqual([]);
  });

  it("drops empty toolbars and marks the last visible toolbar", () => {
    const Bare = panelClass({ name: "GBare" });
    const first = new PlainPanel();
    const bare = new Bare();
    const last = new PlainPanel();
    const { host } = sidebarWith([first, bare, last]);
    const toolbars = host.querySelectorAll(".scrolling-panels > .toolbar");
    expect(toolbars).toHaveLength(2);
    expect(toolbars.map((tb) => tb.classList.contains("last-toolbar"))).toEqual([false, true]);
  });

  it("moves last-toolbar to the new last visible toolbar", () => {
    const first = new PlainPanel();
    const last = new PlainPanel();
    const { sidebar, host } = sidebarWith([first, last]);
    last.visible = false;
    sidebar._updatePropertyPanels();
    const toolbars = host.querySelectorAll(".scrolling-panels > .toolbar");
    expect(toolbars.map((tb) => tb.classList.contains("last-toolbar"))).toEqual([true, false]);
  });

  it("creates one appearance divider and hides it with the appearance toolbar", () => {
    registerAppearanceGroup();
    const appearance = new AppearancePanel();
    const { sidebar, host } = sidebarWith([appearance]);
    const page = t.dom.document;
    expect(page.querySelectorAll(".appearance-divider")).toHaveLength(1);
    const divider = page.querySelector(".appearance-divider") as FakeElement;
    // Before the first appearance toolbar.
    expect(divider.parentElement?.children.indexOf(divider)).toBe(
      (divider.parentElement as FakeElement).children.indexOf(
        host.querySelector(".appearance-toolbar") as FakeElement,
      ) - 1,
    );
    expect(display(divider)).toBe("");
    appearance.visible = false;
    sidebar._updatePropertyPanels();
    expect(page.querySelectorAll(".appearance-divider")).toHaveLength(1);
    expect(display(divider)).toBe("none");
  });

  it("hides the last visible rule of the appearance group", () => {
    registerAppearanceGroup();
    const { host } = sidebarWith([new TextPanel(), new SlicePanel(), new BoolOpPanel()]);
    const rules = host.querySelectorAll(".appearance-properties-panel > div > hr");
    // First: no previous panel; second: shown; third: the last visible, hidden.
    expect(rules.map((hr) => display(hr))).toEqual(["none", "", "none"]);
  });

  it("makes the accordion panels' toolbars accordions and hides their buttons in touch mode", () => {
    registerAppearanceGroup();
    const { sidebar, host } = sidebarWith([new AppearancePanel()]);
    const toolbar = host.querySelector(".appearance-toolbar") as FakeElement;
    expect(toolbar.classList.contains("appearance-panel-toggle-btn")).toBe(true);
    const button = host.querySelector(".appearance-panel-toggle-btn button.g-accordion");
    expect(button).not.toBeNull();
    expect(display(button)).toBe("");
    touch = true;
    sidebar._updatePropertyPanels();
    expect(display(button)).toBe("none");
    touch = false;
    sidebar._settingChanged(new SettingChangedEvent("touch", null, null));
    expect(display(button)).toBe("");
  });

  it("refreshes on the touch setting and ignores other settings", () => {
    registerAppearanceGroup();
    const slice = new SlicePanel();
    const boolOp = new BoolOpPanel();
    boolOp.visible = false;
    const { sidebar, host } = sidebarWith([slice, boolOp]);
    const toolbar = host.querySelector(".appearance-toolbar") as FakeElement;
    expect(display(toolbar)).toBe("none");
    touch = true;
    sidebar._settingChanged(new SettingChangedEvent("decimals_num", null, null));
    expect(display(toolbar)).toBe("none");
    sidebar._settingChanged(new SettingChangedEvent("touch", null, null));
    expect(display(toolbar)).toBe("");
  });
});

describe("InspectorSidebar._updateUI", () => {
  /** A host with the movable panels before the scene panel, in a scrambled order. */
  function scrambled(): { host: FakeElement; names: () => string[] } {
    const host = t.dom.document.createElement("div");
    const make = (name: string) => {
      const element = t.dom.document.createElement("div");
      element.classList.add(name);
      return element;
    };
    host.append(
      make("symbol-instance-toolbar"),
      make("symbol-instance-panel"),
      make("item-property-panel"),
      make("item-next"),
      make("scene-properties-panel"),
      make("scene-next"),
      make("group-frame-property-panel"),
      make("group-frame-next"),
      make("frame-property-panel"),
      make("frame-next"),
    );
    return { host, names: () => host.children.map((c) => c.className) };
  }

  it("moves the frame, group frame, item and symbol panels after the scene panel's neighbour", () => {
    const { host, names } = scrambled();
    const sidebar = new InspectorSidebar();
    sidebar._htmlElement = host as unknown as HTMLElement;
    sidebar._updateUI();
    expect(names()).toEqual([
      "scene-properties-panel",
      "scene-next",
      "group-frame-property-panel",
      "group-frame-next",
      "frame-property-panel",
      "frame-next",
      "item-property-panel",
      "item-next",
      "symbol-instance-toolbar",
      "symbol-instance-panel",
    ]);
  });

  it("moves them after the last appearance part in touch mode", () => {
    const { host } = scrambled();
    const appearance = t.dom.document.createElement("div");
    appearance.classList.add("appearance-properties-panel");
    const part = (name: string) => {
      const element = t.dom.document.createElement("div");
      element.classList.add("appearance-property-panel", name);
      return element;
    };
    appearance.append(part("first"), part("last"));
    host.append(appearance);
    touch = true;
    const sidebar = new InspectorSidebar();
    sidebar._htmlElement = host as unknown as HTMLElement;
    sidebar._updateUI();
    expect(appearance.children.map((c) => c.className)).toEqual([
      "appearance-property-panel first",
      "appearance-property-panel last",
      "group-frame-property-panel",
      "group-frame-next",
      "frame-property-panel",
      "frame-next",
      "item-property-panel",
      "item-next",
      "symbol-instance-toolbar",
      "symbol-instance-panel",
    ]);
    // The scene panel stays where it was.
    expect(host.children.map((c) => c.className)).toEqual([
      "scene-properties-panel",
      "scene-next",
      "appearance-properties-panel",
    ]);
  });
});
