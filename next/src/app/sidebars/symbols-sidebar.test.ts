import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EventTarget } from "../../engine/core/event-target.ts";
import { Editor } from "../../editor/editor.ts";
import { DocumentEvent } from "../document/document-event.ts";
import {
  fake,
  fire,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { SymbolsSidebar } from "./symbols-sidebar.ts";

let dom: FakeDomHandle;
let designer: EventTarget & { canCreate: boolean };

beforeEach(() => {
  dom = installFakeDom();
  designer = Object.assign(new EventTarget(), {
    canCreate: false,
    stats: () => undefined,
    canExecuteAction: () => designer.canCreate,
    executeAction: () => true,
    getSetting: (_key: string, fallback: unknown) => fallback,
  });
  setDesigner(designer as unknown as Designer);
});

afterEach(() => {
  resetGlobals();
  dom.uninstall();
});

function fakeDocument(): { document: unknown; editor: EventTarget } {
  const editor = new EventTarget();
  const scene = Object.assign(new EventTarget(), {
    getSymbols: () => [],
    getSymbolImage: () => null,
  });
  return { document: { getScene: () => scene, getEditor: () => editor }, editor };
}

describe("SymbolsSidebar", () => {
  it("has the old id, side and widths", () => {
    const sidebar = new SymbolsSidebar();
    expect(sidebar.getId()).toBe("symbols");
    expect(sidebar.getOrientation()).toBe("left");
    expect(sidebar.getMinimumWidth()).toBe(250);
    expect(sidebar.isResizeable()).toBe(true);
    expect(sidebar.getTouchTools()[0]?.id).toBe("symbols");
  });

  it("builds the toolbar with a disabled Create button and the tiles container", () => {
    const sidebar = new SymbolsSidebar();
    const container = fake(document.createElement("div"));
    sidebar.init(container as unknown as HTMLElement);
    expect(container.children.map((c) => c.className)).toEqual([
      "toolbar symbols-toolbar",
      "symbols-container",
    ]);
    const toolbar = container.children[0];
    const buttons = toolbar?.children.filter((c) => c.tagName === "BUTTON") ?? [];
    expect(buttons.map((b) => b.children.map((s) => s.className).join(","))).toEqual([
      "gravit-icon-trash,gravit-icon-touch-trash",
      "gravit-icon-plus,gravit-icon-touch-plus",
    ]);
    expect(buttons[1]?.className).toBe("g-disabled");
    expect(container.querySelector(".symbols")?.className).toBe("symbols g-symbols-panel");
  });

  it("enables Create New Symbol while Create Symbol can run, after selection changes", () => {
    const sidebar = new SymbolsSidebar();
    const container = fake(document.createElement("div"));
    sidebar.init(container as unknown as HTMLElement);
    const { document: doc, editor } = fakeDocument();
    designer.trigger(new DocumentEvent(DocumentEvent.Type.Activated, doc));
    const create = container.children[0]?.children[2];
    designer.canCreate = true;
    editor.trigger(new Editor.SelectionChangedEvent());
    expect(create?.className).toBe("");
    designer.canCreate = false;
    editor.trigger(new Editor.SelectionChangedEvent());
    expect(create?.className).toBe("g-disabled");
    // After deactivation the editor is no longer followed.
    designer.trigger(new DocumentEvent(DocumentEvent.Type.Deactivated, doc));
    designer.canCreate = true;
    editor.trigger(new Editor.SelectionChangedEvent());
    expect(create?.className).toBe("g-disabled");
    expect(container.querySelectorAll(".symbol-panel-info")).toHaveLength(1);
  });

  it("Delete Symbol does nothing while no tile is highlighted", () => {
    const sidebar = new SymbolsSidebar();
    const container = fake(document.createElement("div"));
    sidebar.init(container as unknown as HTMLElement);
    const { document: doc } = fakeDocument();
    designer.trigger(new DocumentEvent(DocumentEvent.Type.Activated, doc));
    fire(container.children[0]?.children[1], "click");
    expect(container.querySelectorAll(".symbol-panel-info")).toHaveLength(1);
  });
});
