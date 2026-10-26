import "../window.testing.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Node } from "../../../engine/scene/node.ts";
import { Group } from "../../../engine/scene/group.ts";
import { installFakeDom } from "../../color/fake-dom.testing.ts";
import { rect, setupDesigner, type Fixture } from "../actions.testing.ts";
import { setActionDesigner } from "../host.ts";
import { CutCopyAction } from "./cut-copy-action.ts";

/** The private steps of the action the tests drive. */
interface CutCopyInternals {
  _deleteCutSelection(): void;
  _filterOutSelectionWithSameParent(selection: Node[]): Node[];
}

let fixture: Fixture;

beforeEach(() => {
  installFakeDom();
  fixture = setupDesigner();
});

afterEach(() => {
  setActionDesigner(null);
  vi.unstubAllGlobals();
});

describe("Cut", () => {
  it("names its undo step Cut Selection (BUG-139)", () => {
    const { editor } = fixture;
    const a = rect("A", 0);
    editor.insertElements([a], true);
    editor.updateSelection(false, [a]);
    const cut = new CutCopyAction(true) as unknown as CutCopyInternals;
    cut._deleteCutSelection();
    expect(a.getParent()).toBeNull();
    expect(editor.getUndoStateName()).toBe("Cut Selection");
  });
});

describe("Copy", () => {
  it("leaves out a selected child of a selected group (BUG-140)", () => {
    const { editor } = fixture;
    const group = new Group();
    const a = rect("A", 0);
    const b = rect("B", 20);
    const c = rect("C", 40);
    group.appendChild(a);
    group.appendChild(b);
    editor.insertElements([group, c], true);
    const copy = new CutCopyAction(false) as unknown as CutCopyInternals;
    const kept = (selection: Node[]) =>
      copy
        ._filterOutSelectionWithSameParent(selection)
        .map((n) => ([group, a, b, c] as Node[]).indexOf(n));
    // The layers panel's Ctrl+click can select a child after its group.
    expect(kept([b, c, group])).toEqual([0, 3]);
    expect(kept([b, a])).toEqual([1, 2]);
  });
});
