import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventTarget } from "../../engine/core/event-target.ts";
import { Key } from "../../engine/core/key.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Editor } from "../../editor/editor.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import "../../editor/element-editors/rectangle-editor.ts";
import "../../editor/element-editors/page-editor.ts";
import "../../editor/element-editors/scene-editor.ts";
import "../../editor/element-editors/layer-editor.ts";
import "../../editor/element-editors/image-editor.ts";
import "../../editor/element-editors/symbol-editor.ts";
import "../../editor/element-editors/selection-position-editor.ts";
import { Block } from "../../engine/scene/block.ts";
import { Image } from "../../engine/scene/image.ts";
import { Node as SceneNode } from "../../engine/scene/node.ts";
import { Symbol as SymbolNode } from "../../engine/scene/symbol.ts";
import { MenuButton } from "../widgets/menu-button.ts";
import { Action } from "../actions/action.ts";
import { OpenQuickHelpScreenAction } from "../actions/help/open-quick-help-action.ts";
import { ToggleTouchAction } from "../actions/view/toggle-touch-action.ts";
import { DocumentEvent } from "../document/document-event.ts";
import type { ContextMenu } from "../menus/context-menu.ts";
import {
  fake,
  fire,
  installFakeDom,
  type FakeDomHandle,
  type FakeElement,
} from "../menus/testing/fake-dom.testing.ts";
import type { Container } from "../shell/container.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setContainer, setDesigner } from "../shell/globals.ts";
import { Sidebars, type SidebarLike } from "../shell/layout.ts";
import { FullscreenBanner } from "./fullscreen-banner.ts";
import { Collapsible, Orientation } from "./orientation.ts";
import { propertyRowElement } from "./property-row-element.ts";
import { calculatePosition, QuickHelp } from "./quick-help.ts";
import { TouchContextMenu } from "./touch-context-menu.ts";
import {
  DEFAULT_WIDTH_FOR_TOUCH,
  updateTouchToolbar,
  type TouchToolbarTool,
} from "./touch-toolbar.ts";
import { VirtualKeyBar } from "./virtual-key-bar.ts";

class TestAction extends Action {
  enabled = true;
  available = true;
  runs = 0;
  constructor(
    private readonly _id: string,
    private readonly _icon: string | null = null,
  ) {
    super();
  }
  override getId(): string {
    return this._id;
  }
  override getTitle(): string {
    return this._id;
  }
  override getIcon(): string | null {
    return this._icon;
  }
  override isEnabled(): boolean {
    return this.enabled;
  }
  override isAvailable(): boolean {
    return this.available;
  }
  override execute(): void {
    this.runs++;
  }
}

/** Fullscreen and paste here have methods of their own that the touch UI calls. */
class FullscreenTestAction extends TestAction {
  fullscreen = false;
  isFullscreen(): boolean {
    return this.fullscreen;
  }
}

class PasteHereTestAction extends TestAction {
  position: unknown = "unset";
  setPosition(position: unknown): void {
    this.position = position;
  }
}

class MergeTestAction extends TestAction {
  constructor(private readonly _subs: Action[]) {
    super("modify.merge");
  }
  getSubActions(): Action[] {
    return this._subs;
  }
}

/** The KeyboardEvent the bar dispatches (node has none). */
class TestKeyboardEvent {
  constructor(
    readonly type: string,
    readonly init: { keyCode?: number },
  ) {}
  get keyCode(): number | undefined {
    return this.init.keyCode;
  }
}

interface Harness {
  designer: FakeDesigner;
  actions: Map<string, TestAction>;
  view: FakeElement;
  stored: Map<string, unknown>;
}

class FakeDesigner extends EventTarget {
  touch = true;
  actions = new Map<string, TestAction>();
  executed: string[] = [];
  view: FakeElement;
  editor: Editor | null = null;
  contextSensitive: string[] = [];
  constructor(view: FakeElement) {
    super();
    this.view = view;
  }
  getAction(id: string): Action | null {
    return this.actions.get(id) || null;
  }
  executeAction(id: string): unknown {
    this.executed.push(id);
    const action = this.actions.get(id);
    if (action) action.execute();
    return true;
  }
  canExecuteAction(id: string): boolean {
    const action = this.actions.get(id);
    return !!action && action.isEnabled();
  }
  isTouchEnabled(): boolean {
    return this.touch;
  }
  setTouchEnabled(enabled: boolean): void {
    this.touch = enabled;
  }
  getActiveDocument(): unknown {
    return {
      getActiveWindow: () => ({ getView: () => ({ getHtmlElement: () => this.view }) }),
      getEditor: () => this.editor,
      isLockedByVersionHistory: () => false,
      getScene: () => (this.editor ? this.editor.getScene() : null),
    };
  }
  getRightSidebars(): unknown {
    return {
      disableContextSensitive: () => this.contextSensitive.push("off"),
      enableContextSensitive: () => this.contextSensitive.push("on"),
    };
  }
}

const BAR_ACTIONS = [
  "edit.copy",
  "paste.paste",
  "edit.paste.in-place",
  "edit.paste.inside",
  "edit.paste.replace",
  "edit.paste.style",
  "edit.delete",
  "edit.select-all",
  "edit.deselect-all",
  "modify.group",
  "modify.split",
  "modify.converttopath",
  "help.open-quick-help",
  ...Object.values(Editor.ArrangeOrderType).map((type) => "arrange.order." + type),
];

let dom: FakeDomHandle;

function setup(ids: readonly string[] = BAR_ACTIONS): Harness {
  const view = fake(document.createElement("div"));
  const designer = new FakeDesigner(view);
  for (const id of ids) designer.actions.set(id, new TestAction(id, "icon-" + id));
  designer.actions.set("view.fullscreen", new FullscreenTestAction("view.fullscreen"));
  designer.editor = new Editor(new Scene(new EditorWorkspace()));
  setDesigner(designer as unknown as Designer);
  const stored = new Map<string, unknown>();
  setContainer({
    getProperty: (key: string) => Promise.resolve(stored.get(key) ?? null),
    setProperty: (key: string, value: unknown) => stored.set(key, value),
    getRuntime: () => "browser",
  } as unknown as Container);
  return { designer, actions: designer.actions, view, stored };
}

function keysOf(view: FakeElement): string[] {
  const keys: string[] = [];
  for (const type of ["keydown", "keyup"])
    view.addEventListener(type, (event) => {
      keys.push(type + ":" + String((event as unknown as TestKeyboardEvent).keyCode));
    });
  return keys;
}

function cls(element: unknown): string {
  return fake(element).className;
}

beforeEach(() => {
  dom = installFakeDom();
  (globalThis as Record<string, unknown>).KeyboardEvent = TestKeyboardEvent;
});

afterEach(() => {
  dom.uninstall();
  delete (globalThis as Record<string, unknown>).KeyboardEvent;
  resetGlobals();
  for (const key of [Key.Constant.SHIFT, Key.Constant.CONTROL, Key.Constant.ALT_LEFT])
    Platform.releaseKey(key);
  vi.useRealTimers();
});

describe("Collapsible", () => {
  it("folds a vertical panel with the button in front of it", () => {
    const panel = document.createElement("div");
    const collapsible = new Collapsible(panel);
    expect(cls(panel)).toBe("g-collapsible g-transitions-off expanded vertical");
    const button = fake(panel).children[0] as FakeElement;
    expect(button.className).toBe("g-collapsible-button");
    collapsible.collapse();
    expect(cls(panel)).toBe("g-collapsible g-transitions-off vertical collapsed");
    expect((button.children[0] as FakeElement).className).toBe("gravit-icon-touch-arrow-up");
    collapsible.expand();
    expect((button.children[0] as FakeElement).className).toBe("gravit-icon-touch-arrow-down");
  });

  it("puts a horizontal panel's button before it and reports the button's toggles", () => {
    const parent = document.createElement("div");
    const panel = document.createElement("div");
    parent.appendChild(panel);
    const collapsible = new Collapsible(panel, { orientation: Orientation.Horizontal });
    const button = fake(parent).children[0] as FakeElement;
    expect(button.className).toBe("g-collapsible-button");
    const seen: boolean[] = [];
    collapsible.onVisibilityChanged((expanded) => seen.push(expanded));
    collapsible.collapse();
    expect((button.children[0] as FakeElement).className).toBe("gravit-icon-touch-arrow-right");
    // Collapsing from code neither animates nor reports.
    expect(cls(panel)).toContain("g-transitions-off");
    expect(seen).toEqual([]);
    fire(button, "click");
    expect(seen).toEqual([true]);
    expect(cls(panel)).toBe("g-collapsible horizontal expanded");
    expect((button.children[0] as FakeElement).className).toBe("gravit-icon-touch-arrow-left");
  });
});

describe("propertyRowElement", () => {
  it("builds the row, its columns with widths and empty spacers", () => {
    const content = document.createElement("span");
    const row = fake(
      propertyRowElement({
        className: "paste-section",
        height: "auto",
        columns: [{ width: "48%", content }, { width: "4%" }, { width: "auto", content }],
      }),
    );
    expect(row.className).toBe("paste-section g-property-row no-label");
    const columns = row.children[0] as FakeElement;
    expect(columns.className).toBe("columns");
    expect(columns.style.cssText).toBe("height: auto;");
    const [first, spacer, last] = columns.children as FakeElement[];
    expect(first?.className).toBe("column");
    expect(first?.style.cssText).toBe("width: 48%;");
    expect((first?.children[0] as FakeElement).className).toBe("content");
    expect(spacer?.className).toBe("column no-padding");
    expect(spacer?.textContent).toBe(" ");
    expect(last?.className).toBe("column auto-grow");
    expect(last?.style.cssText).toBe("");
  });
});

describe("VirtualKeyBar", () => {
  function bar(harness = setup()): { bar: VirtualKeyBar; element: FakeElement } & Harness {
    const element = document.createElement("div");
    element.id = "assistant-bar";
    const keyBar = new VirtualKeyBar(element);
    return { bar: keyBar, element: fake(element), ...harness };
  }

  function key(element: FakeElement, code: number): FakeElement {
    return element.querySelector<FakeElement>(".g-virtual-key-" + code)
      ?.parentElement as FakeElement;
  }

  it("builds the bar with its keys, buttons and the folded arrow side", () => {
    const { element } = bar();
    expect(element.className).toBe("g-collapsible g-transitions-off expanded vertical");
    const container = element.children[1] as FakeElement;
    expect(container.className).toBe("container");
    expect(container.children.map((c) => c.className)).toEqual([
      "left-side",
      "g-collapsible-button",
      "right-side g-collapsible g-transitions-off horizontal collapsed",
    ]);
    expect(element.querySelectorAll(".g-virtual-key").length).toBe(7);
    const shift = element.querySelector<FakeElement>(".g-virtual-key-" + Key.Constant.SHIFT);
    expect(shift?.className).toBe("action-button g-virtual-key g-virtual-key-6");
    expect(shift?.textContent).toBe(Key.toLocalizedShort(Key.Constant.SHIFT, true));
    // Paste is a split button with its own menu button.
    const paste = element.querySelector<FakeElement>(".toolbar-button.split");
    expect(paste?.children.map((c) => c.className)).toEqual([
      "action-button",
      "dropdown-button g-menu-button",
    ]);
  });

  it("sends a virtual key to the view and holds the modifier while pressed", () => {
    const { element, view } = bar();
    const keys = keysOf(view);
    const shift = key(element, Key.Constant.SHIFT);
    fire(shift, "mousedown");
    expect(keys).toEqual(["keydown:16"]);
    expect(Platform.isHoldingKey(Key.Constant.SHIFT)).toBe(true);
    fire(shift, "mouseup");
    expect(keys).toEqual(["keydown:16", "keyup:16"]);
    expect(Platform.isHoldingKey(Key.Constant.SHIFT)).toBe(false);
  });

  it("keeps a modifier held after a double tap until the next one", () => {
    const { bar: keyBar, element, view } = bar();
    keyBar.activate();
    const keys = keysOf(view);
    const button = element.querySelector<FakeElement>(".g-virtual-key-" + Key.Constant.CONTROL);
    fire(button, "dblclick");
    expect(button?.classList.contains("g-held")).toBe(true);
    expect(Platform.isHoldingKey(Key.Constant.CONTROL)).toBe(true);
    // While held, presses send nothing and don't release it.
    fire(key(element, Key.Constant.CONTROL), "mousedown");
    fire(key(element, Key.Constant.CONTROL), "mouseup");
    expect(keys).toEqual([]);
    expect(Platform.isHoldingKey(Key.Constant.CONTROL)).toBe(true);
    expect(key(element, Key.Constant.CONTROL).classList.contains("g-active")).toBe(true);
    fire(button, "dblclick");
    expect(button?.classList.contains("g-held")).toBe(false);
    expect(Platform.isHoldingKey(Key.Constant.CONTROL)).toBe(false);
  });

  it("repeats an arrow key every 100 ms until it is released", () => {
    vi.useFakeTimers();
    const { element, view } = bar();
    const keys = keysOf(view);
    const right = key(element, Key.Constant.RIGHT) as FakeElement;
    // The arrows have no own class; find the right arrow by its icon.
    const arrow = element.querySelector<FakeElement>(".gravit-icon-touch-arrow-key-right")
      ?.parentElement?.parentElement as FakeElement;
    expect(right).toBeUndefined();
    fire(arrow, "mousedown");
    vi.advanceTimersByTime(250);
    expect(keys).toEqual(["keydown:39", "keydown:39", "keydown:39"]);
    fire(arrow, "mouseup");
    vi.advanceTimersByTime(300);
    expect(keys).toEqual(["keydown:39", "keydown:39", "keydown:39", "keyup:39"]);
  });

  it("disables the buttons of disabled actions and runs enabled ones", () => {
    const { bar: keyBar, element, actions, designer } = bar();
    (actions.get("edit.copy") as TestAction).enabled = false;
    (actions.get("modify.group") as TestAction).available = false;
    keyBar.activate();
    const copy = element.querySelector<FakeElement>(".gravit-icon-touch-copy");
    const copyButton = copy?.parentElement as FakeElement;
    expect(copyButton.className).toBe("action-button g-disabled");
    expect((copyButton as unknown as { disabled: boolean }).disabled).toBe(true);
    const group = element.querySelector<FakeElement>(".gravit-icon-touch-group")
      ?.parentElement as FakeElement;
    expect(group.classList.contains("g-disabled")).toBe(true);
    (actions.get("edit.copy") as TestAction).enabled = true;
    designer.trigger(new DocumentEvent(DocumentEvent.Type.Modified, designer.getActiveDocument()));
    expect(copyButton.className).toBe("action-button");
    fire(copyButton, "click");
    expect(designer.executed).toEqual(["edit.copy"]);
  });

  it("selects all without a selection and deselects with one", () => {
    const { element, designer } = bar();
    const scene = new Scene(new EditorWorkspace());
    designer.editor = new Editor(scene);
    const select = element.querySelector<FakeElement>(".gravit-icon-touch-selection")
      ?.parentElement as FakeElement;
    fire(select, "click");
    const r = new Rectangle();
    designer.editor.insertElements([r], true);
    fire(select, "click");
    expect(designer.executed).toEqual(["edit.select-all", "edit.deselect-all"]);
  });

  it("stores the arrow side's state and restores it", async () => {
    const harness = setup();
    harness.stored.set("designer.assistant-bar.left-side.expanded", true);
    const { element, stored } = bar(harness);
    await Promise.resolve();
    const right = element.querySelector<FakeElement>(".right-side") as FakeElement;
    expect(right.classList.contains("expanded")).toBe(true);
    const button = (element.children[1] as FakeElement).children[1] as FakeElement;
    fire(button, "click");
    expect(right.classList.contains("collapsed")).toBe(true);
    expect(stored.get("designer.assistant-bar.left-side.expanded")).toBe(false);
  });

  it("enables arrange steps only when they would move the element", () => {
    const { bar: keyBar, designer } = bar();
    const scene = new Scene(new EditorWorkspace());
    const editor = new Editor(scene);
    designer.editor = editor;
    const page = scene.getActivePage() as unknown as Node & { appendChild(n: Node): void };
    const back = new Rectangle();
    back.setProperty("trf", new Transform(10, 0, 0, 10, 0, 0));
    const front = new Rectangle();
    front.setProperty("trf", new Transform(10, 0, 0, 10, 20, 0));
    page.appendChild(back);
    page.appendChild(front);
    keyBar.activate();
    const Order = Editor.ArrangeOrderType;
    const state = () =>
      [Order.SendToFront, Order.BringForward, Order.SendBackward, Order.SendToBack].map((type) =>
        keyBar._isArrangeActionEnabled(type),
      );
    editor.updateSelection(false, [back]);
    expect(state()).toEqual([true, true, false, false]);
    editor.updateSelection(false, [front]);
    expect(state()).toEqual([false, false, true, true]);
    (designer.actions.get("arrange.order." + Order.SendToBack) as TestAction).enabled = false;
    expect(state()).toEqual([false, false, true, false]);
  });

  it("gives the paste and arrange menus their second class", () => {
    const { element } = bar();
    const menuOf = (icon: string): FakeElement => {
      const button = element.querySelector<FakeElement>("." + icon)?.parentElement as FakeElement;
      // The split paste button has its own dropdown; arrange is the button itself.
      const target =
        (button.parentElement as FakeElement).querySelector<FakeElement>(".dropdown-button") ||
        button;
      return fake((MenuButton.of(target as unknown as Element) as MenuButton).menu._htmlElement);
    };
    expect(menuOf("gravit-icon-touch-paste").className).toContain(
      "g-assistant-bar-menu paste-menu",
    );
    expect(menuOf("gravit-icon-touch-arrange-order").className).toContain(
      "g-assistant-bar-menu arrange-menu",
    );
  });

  it("shows the fullscreen button active while fullscreen", () => {
    const { bar: keyBar, element, actions, designer } = bar();
    keyBar.activate();
    const button = element.querySelector<FakeElement>(".gravit-icon-touch-fullscreen")
      ?.parentElement?.parentElement as FakeElement;
    expect(button.classList.contains("g-active")).toBe(false);
    (actions.get("view.fullscreen") as FullscreenTestAction).fullscreen = true;
    designer.trigger(new DocumentEvent(DocumentEvent.Type.Modified, designer.getActiveDocument()));
    expect(button.classList.contains("g-active")).toBe(true);
    keyBar.deactivate();
    (actions.get("view.fullscreen") as FullscreenTestAction).fullscreen = false;
    designer.trigger(new DocumentEvent(DocumentEvent.Type.Modified, designer.getActiveDocument()));
    expect(button.classList.contains("g-active")).toBe(true);
  });
});

describe("quick help", () => {
  it("places a tooltip on each side of its element", () => {
    const size = new Rect(0, 0, 40, 20);
    const target = new Rect(100, 50, 30, 10);
    const at = (tip: Parameters<typeof calculatePosition>[2]) => {
      const p = calculatePosition(size, target, tip);
      return [p.getX(), p.getY()];
    };
    expect(at({ i18n: "x" })).toEqual([95, 60]);
    expect(at({ i18n: "x", side: Rect.Side.TOP_CENTER, offsetY: -10 })).toEqual([95, 20]);
    expect(at({ i18n: "x", side: Rect.Side.LEFT_CENTER, offsetX: -15 })).toEqual([45, 45]);
    expect(at({ i18n: "x", side: Rect.Side.RIGHT_CENTER, offsetX: 15 })).toEqual([145, 45]);
    expect(() => at({ i18n: "x", side: Rect.Side.CENTER })).toThrow();
  });

  it("opens over the page with the gesture hints and closes on a click", () => {
    const { designer } = setup();
    const help = new QuickHelp();
    help.open();
    const body = fake(document.body);
    expect(body.classList.contains("g-quick-help")).toBe(true);
    const panel = body.querySelector<FakeElement>(".g-quick-help-screen") as FakeElement;
    expect(panel.classList.contains("hidden")).toBe(false);
    expect(panel.querySelectorAll(".static-tooltips > .container").length).toBe(3);
    const connector = panel.querySelector<FakeElement>(".connector") as FakeElement;
    expect(connector.style.cssText).toBe("display: none;");
    expect(designer.contextSensitive).toEqual(["off"]);
    fire(panel, "click");
    expect(body.classList.contains("g-quick-help")).toBe(false);
    expect(body.querySelector(".g-quick-help-screen")).toBeNull();
    expect(help.isOpen()).toBe(false);
    expect(designer.contextSensitive).toEqual(["off", "on"]);
  });

  it("opens from the help action, which only shows in touch mode", () => {
    const { designer } = setup();
    const action = new OpenQuickHelpScreenAction();
    expect(action.getId()).toBe("help.open-quick-help");
    expect(action.isVisible()).toBe(true);
    designer.touch = false;
    expect(action.isVisible()).toBe(false);
    action.execute();
    expect(fake(document.body).classList.contains("g-quick-help")).toBe(true);
  });
});

describe("ToggleTouchAction", () => {
  it("switches the touch setting and names the state it leads to", () => {
    const { designer } = setup();
    const action = new ToggleTouchAction();
    designer.touch = false;
    expect(action.getTitle()).toBe(ToggleTouchAction.TITLE);
    expect(action.getIcon()).toBeNull();
    action.execute();
    expect(designer.touch).toBe(true);
    expect(action.getTitle()).toBe(ToggleTouchAction.TITLE_DISABLE);
    expect(action.getIcon()).toBe("gravit-icon-touch-disable");
    expect(action.statsValue()).toBe("view.toggle-touch.on");
    expect(action.isCheckable()).toBe(true);
    expect(action.isAvailable()).toBe(true);
  });

  it("is not available on the iPad runtime", () => {
    setup();
    setContainer({ getRuntime: () => "ipad" } as unknown as Container);
    expect(new ToggleTouchAction().isAvailable()).toBe(false);
  });
});

describe("FullscreenBanner", () => {
  it("fades in on show and is removed once hidden", () => {
    vi.useFakeTimers();
    (globalThis as Record<string, unknown>).requestAnimationFrame = (callback: () => void) =>
      setTimeout(callback, 16);
    try {
      const banner = new FullscreenBanner().setBannerText("Press <b>Esc</b>");
      const element = fake(banner._element);
      expect(element.className).toBe("g-fullscreen-banner");
      banner.show();
      expect(element.parentElement).toBe(document.body);
      vi.advanceTimersByTime(600);
      expect(element.style.getPropertyValue("opacity")).toBe("1");
      // It hides itself after five seconds.
      vi.advanceTimersByTime(5000);
      expect(element.style.getPropertyValue("opacity")).toBe("0");
      expect(element.parentElement).toBeNull();
    } finally {
      delete (globalThis as Record<string, unknown>).requestAnimationFrame;
    }
  });
});

describe("touch toolbar", () => {
  function sidebarWith(tools: TouchToolbarTool[], visible = true): SidebarLike {
    return {
      getId: () => "inspector",
      getDefaultWidth: () => 280,
      getSettingWidth: () => 280,
      relayout: () => {},
      updateBadge: () => false,
      isVisible: () => visible,
      isDeactivatable: () => true,
      isEnabled: () => true,
      getTouchTools: () => tools,
      activate: () => {},
      deactivate: () => {},
    } as unknown as SidebarLike;
  }

  function tool(id: string, extra: Partial<TouchToolbarTool> = {}): TouchToolbarTool {
    const t: TouchToolbarTool = {
      id,
      sidebar: "",
      icon: "icon-" + id,
      activate: () => {},
      deactivate: () => {},
      ...extra,
    };
    return t;
  }

  function sidebars(sidebar: SidebarLike): { sidebars: Sidebars; element: FakeElement } {
    const element = document.createElement("div");
    const container = document.createElement("div");
    container.className = "sidebar-container";
    element.appendChild(container);
    const panel = document.createElement("div");
    panel.className = "fill-panel";
    container.appendChild(panel);
    const result = new Sidebars(element, "right", document.createElement("div"));
    (result as unknown as { _sidebars: unknown[] })._sidebars = [{ sidebar, container }];
    return { sidebars: result, element: fake(element) };
  }

  it("does nothing outside touch mode", () => {
    const { designer } = setup();
    designer.touch = false;
    const { sidebars: side, element } = sidebars(sidebarWith([tool("pages")]));
    updateTouchToolbar(side);
    expect(element.querySelector(".g-touch-toolbar")).toBeNull();
  });

  it("puts a button per tool first, marks the panels and counts the blocks", () => {
    setup();
    const fills = [document.createElement("div"), document.createElement("div")];
    for (const f of fills) {
      f.className = "fill-block";
      document.body.appendChild(f);
    }
    const { sidebars: side, element } = sidebars(
      sidebarWith([tool("document"), tool("fill", { panel: ".fill-panel" })]),
    );
    updateTouchToolbar(side);
    const toolbar = element.children[0] as FakeElement;
    expect(toolbar.className).toBe("g-touch-toolbar");
    expect(
      toolbar.children.map((b) => [
        b.getAttribute("id"),
        b.getAttribute("g-touch-tool"),
        b.className,
      ]),
    ).toEqual([
      ["document", "document", "g-touch-toolbar-button"],
      ["fill", "fill", "g-touch-toolbar-button"],
    ]);
    expect(((toolbar.children[1] as FakeElement).children[1] as FakeElement).textContent).toBe("2");
    const panel = element.querySelector<FakeElement>(".fill-panel") as FakeElement;
    expect(panel.getAttribute("g-touch-tool")).toBe("fill");
    expect(panel.className).toBe("fill-panel g-touch-toolbar-panel");
    expect(element.style.cssText).toBe("width: " + DEFAULT_WIDTH_FOR_TOUCH + "px;");
    // Rebuilding keeps a single toolbar.
    updateTouchToolbar(side);
    expect(element.querySelectorAll(".g-touch-toolbar").length).toBe(1);
  });

  it("activates a tool with its width and closes it on a second tap", () => {
    setup();
    const activated: string[] = [];
    const fill = tool("fill", {
      panelWidth: 340,
      activate: () => activated.push("on"),
      deactivate: () => activated.push("off"),
    });
    const { sidebars: side, element } = sidebars(sidebarWith([fill]));
    updateTouchToolbar(side);
    const button = (element.children[0] as FakeElement).children[0] as FakeElement;
    fire(button, "click");
    expect(activated).toEqual(["on"]);
    expect(element.style.cssText).toBe("width: 340px;");
    fire(button, "click");
    expect(activated).toEqual(["on", "off"]);
    expect(element.style.cssText).toBe("width: 280px;");
  });
});

/** The actions the touch overlay looks up (without merge and paste here). */
const MENU_IDS = [
  "arrange.transform.flip-horizontal",
  "arrange.transform.flip-vertical",
  "arrange.transform.rotate-90-left",
  "arrange.transform.rotate-90-right",
  "paste.paste",
  "edit.paste.in-place",
  "edit.paste.inside",
  "edit.paste.replace",
  "edit.paste.style",
  "modify.createnestedcompound",
  "modify.converttopath",
  "modify.vectorize",
  "modify.converttorawpath",
  "modify.ouline",
  "modify.offset",
  "modify.simplify",
  "modify.join-paths",
  "modify.split-path",
  "modify.split-line",
  "modify.createsymbol",
  "modify.resetinstance",
  "modify.detachsymbol",
  "modify.attachToPath",
  "modify.detachFromPath",
  "edit.selectbyfonttype",
  "modify.clip",
  "modify.mask-with-shape",
  "modify.path2bmp",
  "edit.duplicate",
];

describe("TouchContextMenu", () => {
  function menu(): { touch: TouchContextMenu; harness: Harness; hits: unknown[] } {
    const harness = setup(MENU_IDS);
    const union = new TestAction("modify.merge.union");
    harness.actions.set("modify.merge.union", union);
    harness.actions.set("modify.merge", new MergeTestAction([union]));
    harness.actions.set("edit.paste.here", new PasteHereTestAction("edit.paste.here"));
    const hits: unknown[] = [];
    const contextMenu = {
      _contextMenuClientPosition: "point",
      _mouseEvent: { pageX: 1 },
      _getHitsElments: () => ({ elementHits: hits }),
    } as unknown as ContextMenu;
    return { touch: new TouchContextMenu(contextMenu), harness, hits };
  }

  it("builds the sections in the old order inside the overlay", () => {
    const { touch } = menu();
    const content = fake(touch.element);
    expect(fake(content.parentElement).className).toBe("g-overlay context-menu-touch-overlay");
    expect(content.children.map((c) => c.className)).toEqual([
      "transform-section g-property-row no-label",
      "paste-section g-property-row no-label",
      "compound-section g-property-row no-label",
      "path-section g-property-row no-label",
      "symbol-section g-property-row no-label",
      "text-section g-property-row no-label",
      "image-section g-property-row no-label",
      "g-property-row no-label",
      "g-property-row no-label",
    ]);
    const flip = content.querySelector<FakeElement>(".button-group > .action") as FakeElement;
    expect(flip.getAttribute("data-action")).toBe("arrange.transform.flip-horizontal");
    expect((flip.children[0] as FakeElement).className).toBe("action-button icon");
    expect(((flip.children[0] as FakeElement).children[0] as FakeElement).className).toBe(
      "icon icon-arrange.transform.flip-horizontal",
    );
    const paste = content.querySelector<FakeElement>(".action-button-with-menu") as FakeElement;
    expect(paste.children.map((c) => c.className)).toEqual([
      "action",
      "open-menu icon gravit-icon-chevron-left-small",
    ]);
    expect(((paste.children[0] as FakeElement).children[0] as FakeElement).className).toBe(
      "action-button long-button icon",
    );
  });

  it("updates the disabled buttons and the paste position when it opens", () => {
    const { touch, harness, hits } = menu();
    (harness.actions.get("arrange.transform.flip-horizontal") as TestAction).enabled = false;
    harness.designer.trigger(
      new DocumentEvent(DocumentEvent.Type.ContextMenuOpened, harness.designer.getActiveDocument()),
    );
    const content = fake(touch.element);
    const button = (name: string) =>
      content.querySelector<FakeElement>(".action-button." + name) as FakeElement;
    const flip = (content.querySelector<FakeElement>(".button-group > .action") as FakeElement)
      .children[0] as FakeElement;
    expect(flip.getAttribute("disabled")).toBe("disabled");
    const vertical = (
      content.querySelectorAll<FakeElement>(".button-group > .action")[1] as FakeElement
    ).children[0] as FakeElement;
    expect(vertical.getAttribute("disabled")).toBeNull();
    expect(
      (harness.actions.get("edit.paste.here") as unknown as PasteHereTestAction).position,
    ).toBe("point");
    // Lock and hide need a selection; Select needs elements under the press.
    const select = content.querySelector<FakeElement>(
      ".select-menu-button > div > button",
    ) as FakeElement;
    expect(select.getAttribute("disabled")).toBe("disabled");
    hits.push({});
    harness.designer.trigger(
      new DocumentEvent(DocumentEvent.Type.ContextMenuOpened, harness.designer.getActiveDocument()),
    );
    expect(select.getAttribute("disabled")).toBeNull();
    void button;
  });

  it("runs an action from its button", () => {
    const { touch, harness } = menu();
    const duplicate = fake(touch.element)
      .querySelectorAll<FakeElement>(".button-group > .action")
      .find((a) => a.getAttribute("data-action") === "edit.duplicate") as FakeElement;
    fire(duplicate.children[0], "click");
    expect(harness.designer.executed).toEqual(["edit.duplicate"]);
  });
});

describe("TouchContextMenu commands", () => {
  interface Commands {
    _setAllSelectionsLocked(): void;
    _setAllSelectionsHidden(): void;
    _instanceToGoToMaster(): SymbolNode | null;
    _goToMaster(): void;
    _getSelectedItems(): SceneNode[];
    readonly element: HTMLElement;
  }

  type Page = SceneNode & { appendChild(n: SceneNode): void };

  function scene(): {
    touch: Commands;
    harness: Harness;
    editor: Editor;
    page: Page;
  } {
    const harness = setup(MENU_IDS);
    harness.actions.set("modify.merge", new MergeTestAction([]));
    harness.actions.set("edit.paste.here", new PasteHereTestAction("edit.paste.here"));
    const editor = new Editor(new Scene(new EditorWorkspace()));
    harness.designer.editor = editor;
    const contextMenu = {
      _contextMenuClientPosition: null,
      _mouseEvent: null,
      _getHitsElments: () => ({ elementHits: [] }),
    } as unknown as ContextMenu;
    const touch = new TouchContextMenu(contextMenu) as unknown as Commands;
    const page = editor.getScene().getActivePage() as unknown as Page;
    return { touch, harness, editor, page };
  }

  function shape(page: Page, x = 0): Rectangle {
    const r = new Rectangle();
    r.setProperty("trf", new Transform(10, 0, 0, 10, x, 0));
    page.appendChild(r);
    return r;
  }

  it("locks every selected element in one undo step", () => {
    const { touch, editor, page } = scene();
    const a = shape(page);
    const b = shape(page, 20);
    editor.updateSelection(false, [a, b]);
    a.setFlag(SceneNode.Flag.Highlighted as number);
    const undoBefore = editor.getUndoStates().length;
    touch._setAllSelectionsLocked();
    expect(a.getProperty("lkt")).toBe(Block.LockType.Full);
    expect(b.getProperty("lkt")).toBe(Block.LockType.Full);
    expect(a.hasFlag(SceneNode.Flag.Highlighted as number)).toBe(false);
    expect(editor.getSelection() || []).toEqual([]);
    expect(editor.getUndoStates().length).toBe(undoBefore + 1);
    expect(editor.getUndoStateName()).toBe("Toggle Locker");
  });

  it("stops locking when removing the flag doesn't shrink the list", () => {
    const { touch, editor, page } = scene();
    const a = shape(page);
    const b = shape(page, 20);
    editor.updateSelection(false, [a, b]);
    // A copy of the selection: the flag removal doesn't reach it.
    vi.spyOn(touch, "_getSelectedItems").mockReturnValue([a, b]);
    touch._setAllSelectionsLocked();
    expect(a.getProperty("lkt")).toBe(Block.LockType.Full);
  });

  it("hides every selected element in one undo step", () => {
    const { touch, editor, page } = scene();
    const a = shape(page);
    const b = shape(page, 20);
    editor.updateSelection(false, [a, b]);
    b.setFlag(SceneNode.Flag.Highlighted as number);
    const undoBefore = editor.getUndoStates().length;
    touch._setAllSelectionsHidden();
    expect(a.getProperty("vis")).toBe(false);
    expect(b.getProperty("vis")).toBe(false);
    expect(b.hasFlag(SceneNode.Flag.Highlighted as number)).toBe(false);
    expect(editor.getUndoStates().length).toBe(undoBefore + 1);
    expect(editor.getUndoStateName()).toBe("Toggle Visibility");
  });

  it("selects the first unlocked instance and zooms to it in one transaction", () => {
    const { touch, harness, editor, page } = scene();
    const locked = new SymbolNode();
    locked.setProperty("trf", new Transform(10, 0, 0, 10, 0, 0));
    page.appendChild(locked);
    const free = new SymbolNode();
    free.setProperty("trf", new Transform(10, 0, 0, 10, 50, 0));
    page.appendChild(free);
    const other = shape(page, 100);
    expect(touch._instanceToGoToMaster()).toBeNull();
    editor.updateSelection(false, [locked, other, free]);
    locked.setProperty("lkt", Block.LockType.Full);
    expect(touch._instanceToGoToMaster()).toBe(free);
    const begin = vi.spyOn(editor, "beginTransaction");
    const commit = vi.spyOn(editor, "commitTransaction");
    touch._goToMaster();
    // Old: it selects the instance itself, not its master (see "Go to
    // master in the touch menu selects the instance" in QUESTIONS.md).
    expect(editor.getSelection()).toEqual([free]);
    expect(harness.designer.executed).toEqual(["view.zoom.fit-selection"]);
    expect(begin).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith("Go to Master");
  });

  for (const [detail, caption] of [
    [false, "Crop"],
    [true, "No crop"],
  ] as const)
    it("names the crop item " + caption + " with selection detail " + detail, () => {
      const { touch, editor, page } = scene();
      const image = new Image();
      image.setProperty("trf", new Transform(10, 0, 0, 10, 0, 0));
      page.appendChild(image);
      editor.updateSelection(false, [image]);
      editor.setSelectionDetail(detail);
      expect(editor.hasSelectionDetail()).toBe(detail);
      // The text menu's button comes first, then the image menu's.
      const imageButton = fake(touch.element).querySelectorAll<FakeElement>(
        ".action-menu-button > div > button",
      )[1] as FakeElement;
      fire(imageButton, "click");
      const menu = fake(document.body)
        .querySelectorAll<FakeElement>(".g-context-menu")
        .find((m) => m.textContent.includes("Original Size")) as FakeElement;
      expect((menu.querySelector<FakeElement>(".g-menu-item") as FakeElement).textContent).toBe(
        caption,
      );
    });
});
