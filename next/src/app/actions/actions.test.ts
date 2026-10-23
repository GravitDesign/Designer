import "./window.testing.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Key } from "../../engine/core/key.ts";
import { Node } from "../../engine/scene/node.ts";
import type { Rectangle } from "../../engine/scene/rectangle.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Action } from "./action.ts";
import {
  layersOf,
  rect,
  setupDesigner,
  stubBrowserDocument,
  type Fixture,
} from "./actions.testing.ts";
import { Category } from "./category.ts";
import { ChangeOpacityAction } from "./edit/change-opacity-action.ts";
import { PasteInPlaceAction } from "./edit/paste-in-place-action.ts";
import { SelectByPaintLayerAction } from "./edit/select-by-paint-layer-action.ts";
import { SelectByShapeAction } from "./edit/select-by-shape-action.ts";
import { SwapPaintLayersAction } from "./edit/swap-paint-layers-action.ts";
import { setActionDesigner } from "./host.ts";
import { MainAction } from "./main-action.ts";
import { SubAction } from "./sub-action.ts";

const names = (nodes: readonly Node[] | null): unknown[] =>
  (nodes || []).map((node) => (node as Rectangle).getProperty("name"));

let fixture: Fixture;

beforeEach(() => {
  stubBrowserDocument();
  fixture = setupDesigner();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  setActionDesigner(null);
});

describe("Category", () => {
  it("resolves labels and parents of the menu chain", () => {
    const chain: string[] = [];
    for (let c: Category | null = Category.CATEGORY_EDIT_PASTE; c; c = c.parent) {
      chain.unshift(c.label as string);
    }
    expect(chain).toEqual(["Edit", "Edit/Paste"]);
    expect(Category.CATEGORY_FILE_EXPORT_PDF.parent).toBe(Category.CATEGORY_FILE_EXPORT);
  });

  it("shows touch icons only in the touch layout", () => {
    expect(Category.CATEGORY_EDIT_PASTE.icon).toBeNull();
    (fixture.designer as unknown as { isTouchEnabled: () => boolean }).isTouchEnabled = () => true;
    expect(Category.CATEGORY_EDIT_PASTE.icon).toBe("gravit-icon-paste");
    expect(Category.CATEGORY_ACCOUNT.visible).toBe(true);
  });
});

describe("Action", () => {
  it("renders shortcut hints the Windows way", () => {
    expect(Action.getActionShortcutHint([Key.Constant.SHIFT, Key.Constant.META, "z"])).toBe(
      "Shift+Ctrl+Z",
    );
    expect(Action.getActionShortcutHint(null)).toBeNull();
  });
});

class DemoSub extends SubAction {
  static override Type = { One: "one", Two: "two" };
  ran: string[] = [];
  protected override _getMainActionId(): string {
    return "demo";
  }
  override getShortcutSubKey(): string {
    return this._type === "one" ? "1" : "2";
  }
  override execute(): void {
    this.ran.push(this._type);
  }
}

class DemoMain extends MainAction {
  ranMain = 0;
  override getId(): string {
    return "demo";
  }
  override getShortcut(): readonly string[] {
    return ["M"];
  }
  override execute(): void {
    this.ranMain++;
  }
}

describe("MainAction and SubAction", () => {
  it("run the sub-action whose key follows the shortcut, else the main action", () => {
    vi.useFakeTimers();
    const listeners: ((event: KeyboardEvent) => void)[] = [];
    (document as unknown as Record<string, unknown>).addEventListener = (
      _type: string,
      listener: (event: KeyboardEvent) => void,
    ) => listeners.push(listener);
    (document as unknown as Record<string, unknown>).removeEventListener = (
      _type: string,
      listener: (event: KeyboardEvent) => void,
    ) => listeners.splice(listeners.indexOf(listener), 1);
    const main = fixture.register(new DemoMain(DemoSub)) as DemoMain;
    const one = fixture.register(new DemoSub("one")) as DemoSub;
    fixture.register(new DemoSub("two"));
    expect(one.getId()).toBe("demo.one");
    expect(one.getShortcutHint()).toBe("M then 1");

    main.executeFromShortcut();
    const event = {
      code: "Digit1",
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;
    (listeners[0] as (event: KeyboardEvent) => void)(event);
    expect(one.ran).toEqual(["one"]);
    expect(main.ranMain).toBe(0);

    main.executeFromShortcut();
    vi.advanceTimersByTime(Action.SHORTCUT_DELAY);
    expect(main.ranMain).toBe(1);
    expect(listeners).toHaveLength(0);
  });
});

describe("Select Same", () => {
  it("selects every element with the selection's fill patterns", () => {
    const { editor } = fixture;
    const red = [255, 0, 0];
    const withFill = (name: string, x: number, rgb: number[]) => {
      const node = rect(name, x);
      const fill = new FillPaintLayer();
      fill.setProperty("_pt", new RGBColor(rgb));
      layersOf(node).appendChild(fill);
      return node;
    };
    const a = withFill("A", 0, red);
    const b = withFill("B", 20, [0, 0, 255]);
    const c = withFill("C", 40, red);
    editor.insertElements([a, b, c], false);
    editor.updateSelection(false, [a]);
    const action = new SelectByPaintLayerAction(SelectByPaintLayerAction.Type.Fill);
    expect(action.getId()).toBe("edit.select-by-paintlayer.fill");
    expect(action.isEnabled()).toBe(true);
    action.execute();
    expect(names(editor.getSelection())).toEqual(["A", "C"]);
  });

  it("is disabled when the selection shares no value", () => {
    const { editor } = fixture;
    const a = rect("A", 0);
    editor.insertElements([a], true);
    const fills = new SelectByPaintLayerAction(SelectByPaintLayerAction.Type.Fill);
    // A rectangle without a fill has no value to match.
    expect(fills.isEnabled()).toBe(false);
    const shapes = new SelectByShapeAction();
    expect(shapes.isEnabled()).toBe(true);
  });
});

describe("Change Opacity", () => {
  it("turns Shift+digits into an opacity", () => {
    vi.useFakeTimers();
    const { editor } = fixture;
    const a = rect("A", 0);
    editor.insertElements([a], true);
    const action = new ChangeOpacityAction();
    const key = (code: string) => ({ code }) as KeyboardEvent;
    action.executeFromShortcut(key("Digit5"));
    vi.advanceTimersByTime(Action.SHORTCUT_DELAY);
    expect(a.getProperty("_stop")).toBe(0.5);
    action.executeFromShortcut(key("Digit2"));
    action.executeFromShortcut(key("Digit5"));
    expect(a.getProperty("_stop")).toBe(0.25);
    action.executeFromShortcut(key("Digit0"));
    vi.advanceTimersByTime(Action.SHORTCUT_DELAY);
    expect(a.getProperty("_stop")).toBe(1);
    action.executeFromShortcut(key("Digit0"));
    action.executeFromShortcut(key("Digit5"));
    expect(a.getProperty("_stop")).toBe(0.05);
  });
});

describe("Swap Fill and Border", () => {
  it("turns fills into borders (first, aligned inside) and borders into fills", () => {
    const { editor } = fixture;
    const a = rect("A", 0);
    const fill = new FillPaintLayer();
    fill.setProperty("_pt", new RGBColor([255, 0, 0]));
    const border = new BorderPaintLayer();
    border.setProperty("_pt", new RGBColor([0, 0, 255]));
    layersOf(a).appendChild(fill);
    layersOf(a).appendChild(border);
    editor.insertElements([a], true);
    new SwapPaintLayersAction().execute();
    const layers = layersOf(a).getChildren();
    expect(layers.map((layer) => layer instanceof BorderPaintLayer)).toEqual([true, false]);
    expect((layers[0] as BorderPaintLayer).getProperty("_ba")).toBe("I");
    expect(((layers[0] as BorderPaintLayer).getProperty("_pt") as RGBColor).toScreen()).toEqual(
      new RGBColor([255, 0, 0]).toScreen(),
    );
  });
});

describe("Paste In Place", () => {
  it("moves the pasted elements onto the selection's top-left corner", () => {
    const { editor, clipboard, scene } = fixture;
    const target = rect("target", 100, 50, 30, 30);
    editor.insertElements([target], true);
    clipboard.set(Node.MIME_TYPE, Node.serialize([rect("copy", 0, 0, 10, 10)]) as string);
    const paste = {
      assignCallback: vi.fn(),
    };
    (fixture.designer as unknown as { getPaste: () => unknown }).getPaste = () => paste;
    new PasteInPlaceAction().execute();
    const page = scene.getActivePage() as unknown as { getChildren(): Node[] };
    const copy = page.getChildren().find((node) => names([node])[0] === "copy") as Rectangle;
    const box = copy.getGeometryBBox();
    expect([box?.getX(), box?.getY()]).toEqual([100, 50]);
    expect(editor.getUndoStateName()).toBe("Paste In Place");
  });
});
