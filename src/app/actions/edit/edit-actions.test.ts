import "../window.testing.ts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import type { Node } from "../../../engine/scene/node.ts";
import type { Rectangle } from "../../../engine/scene/rectangle.ts";
import {
  fakeElement,
  rect,
  setupDesigner,
  stubBrowserDocument,
  type FakeBrowserDocument,
  type Fixture,
} from "../actions.testing.ts";
import { setActionDesigner } from "../host.ts";
import { DeleteAction } from "./delete-action.ts";
import { DeselectAllAction } from "./deselect-all-action.ts";
import { DuplicateAction } from "./duplicate-action.ts";
import { InvertSelectionAction } from "./invert-selection-action.ts";
import { RedoAction } from "./redo-action.ts";
import { SelectAllAction } from "./select-all-action.ts";
import { UndoAction } from "./undo-action.ts";

const names = (nodes: readonly Node[] | null): unknown[] =>
  (nodes || []).map((node) => (node as Rectangle).getProperty("name"));

let fixture: Fixture;
let browser: FakeBrowserDocument;

beforeEach(() => {
  browser = stubBrowserDocument();
  fixture = setupDesigner();
});

afterEach(() => {
  vi.unstubAllGlobals();
  setActionDesigner(null);
});

describe("Undo and Redo", () => {
  it("undo the document when no text field has the focus", () => {
    const { editor } = fixture;
    editor.insertElements([rect("A", 0)], true);
    const undo = new UndoAction();
    const redo = new RedoAction();
    expect(undo.isEnabled()).toBe(true);
    expect(undo.getTitle()).toBe("Undo Insert Element(s)");
    expect(redo.isEnabled()).toBe(false);
    undo.execute();
    expect(editor.hasUndoState()).toBe(false);
    expect(redo.getTitle()).toBe("Redo Insert Element(s)");
    redo.execute();
    expect(editor.hasUndoState()).toBe(true);
    expect(browser.execCommand).not.toHaveBeenCalled();
  });

  it("go to the focused text field through execCommand", () => {
    browser.activeElement = fakeElement("input", { type: "text" });
    const undo = new UndoAction();
    const redo = new RedoAction();
    // Enabled although the document has nothing to undo.
    expect(undo.isEnabled()).toBe(true);
    undo.execute();
    redo.execute();
    expect(browser.execCommand.mock.calls).toEqual([["undo"], ["redo"]]);
  });

  it("leave buttons, selects, checkboxes and the canvas IME to the document", () => {
    const undo = new UndoAction();
    for (const element of [
      fakeElement("button"),
      fakeElement("select"),
      fakeElement("input", { type: "checkbox" }),
      { ...fakeElement("textarea"), className: "g-ime" },
    ]) {
      browser.activeElement = element;
      expect(undo.isEnabled()).toBe(false);
    }
  });

  it("keep the old ids, shortcuts, group and icons", () => {
    const undo = new UndoAction();
    const redo = new RedoAction();
    expect([undo.getId(), undo.getShortcut(), undo.getGroup(), undo.getIcon()]).toEqual([
      "edit.undo",
      [100, "z"],
      "undo_redo",
      "gravit-icon-undo",
    ]);
    expect([redo.getId(), redo.getShortcut(), redo.getIcon()]).toEqual([
      "edit.redo",
      [6, 100, "z"],
      "gravit-icon-redo",
    ]);
  });
});

describe("Select All, Deselect All, Invert Selection", () => {
  it("select the visible unlocked items of the page", () => {
    const { editor, scene } = fixture;
    const a = rect("A", 0);
    const hidden = rect("hidden", 20);
    const b = rect("B", 40);
    editor.insertElements([a, hidden, b], false);
    hidden.setProperty("vis", false);
    new SelectAllAction().execute();
    expect(names(editor.getSelection())).toEqual(["A", "B"]);
    expect(scene).toBeDefined();
  });

  it("invert the selection", () => {
    const { editor } = fixture;
    const a = rect("A", 0);
    const b = rect("B", 20);
    const c = rect("C", 40);
    editor.insertElements([a, b, c], false);
    editor.updateSelection(false, [b]);
    new InvertSelectionAction().execute();
    expect(names(editor.getSelection())).toEqual(["A", "C"]);
  });

  it("select and deselect the text of a focused field instead (BUG-138)", () => {
    const { editor } = fixture;
    editor.insertElements([rect("A", 0)], true);
    const setSelectionRange = vi.fn();
    browser.activeElement = Object.assign(fakeElement("input"), {
      selectionStart: 2,
      selectionEnd: 5,
      setSelectionRange,
    });
    new SelectAllAction().execute();
    new DeselectAllAction().execute();
    expect(browser.execCommand.mock.calls).toEqual([["selectAll"]]);
    expect(setSelectionRange.mock.calls).toEqual([[5, 5]]);
    expect(names(editor.getSelection())).toEqual(["A"]);
  });

  it("deselect the page selection in a focused contenteditable (BUG-138)", () => {
    const { editor } = fixture;
    editor.insertElements([rect("A", 0)], true);
    const collapseToEnd = vi.fn();
    vi.stubGlobal("window", {
      ...window,
      getSelection: () => ({ rangeCount: 1, collapseToEnd }),
    });
    browser.activeElement = fakeElement("div", { contenteditable: "true" });
    new DeselectAllAction().execute();
    expect(browser.execCommand).not.toHaveBeenCalled();
    expect(collapseToEnd).toHaveBeenCalledTimes(1);
    expect(names(editor.getSelection())).toEqual(["A"]);
  });

  it("deselect", () => {
    const { editor } = fixture;
    editor.insertElements([rect("A", 0)], true);
    const deselect = new DeselectAllAction();
    expect(deselect.isEnabled()).toBe(true);
    deselect.execute();
    expect(editor.getSelection()).toBeNull();
    expect(deselect.isEnabled()).toBe(false);
  });
});

describe("Delete and Duplicate", () => {
  it("delete the selection as one undo step", () => {
    const { editor, scene } = fixture;
    editor.insertElements([rect("A", 0), rect("B", 20)], true);
    const remove = new DeleteAction();
    expect(remove.isEnabled()).toBe(true);
    remove.execute();
    const page = scene.getActivePage() as unknown as { getChildren(): Node[] };
    expect(page.getChildren().filter((n) => n.getNodeName() === "rectangle")).toHaveLength(0);
    expect(remove.isEnabled()).toBe(false);
    editor.undoState();
    expect(page.getChildren().filter((n) => n.getNodeName() === "rectangle")).toHaveLength(2);
  });

  it("delete has Del and, off the Mac, Backspace", () => {
    const remove = new DeleteAction();
    expect(remove.getShortcut()).toEqual([102]);
    expect(remove.getAdditionalShortcuts()).toEqual([[4]]);
  });

  it("duplicate the selection with the action's title as undo name", () => {
    const { editor, scene } = fixture;
    editor.insertElements([rect("A", 0)], true);
    new DuplicateAction().execute();
    const page = scene.getActivePage() as unknown as { getChildren(): Node[] };
    expect(names(page.getChildren().filter((n) => n.getNodeName() === "rectangle"))).toEqual([
      "A",
      "A",
    ]);
    expect(editor.getUndoStateName()).toBe("Duplicate");
  });
});
