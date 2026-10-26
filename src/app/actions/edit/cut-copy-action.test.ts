import "../window.testing.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeDom } from "../../color/fake-dom.testing.ts";
import { rect, setupDesigner, type Fixture } from "../actions.testing.ts";
import { setActionDesigner } from "../host.ts";
import { CutCopyAction } from "./cut-copy-action.ts";

/** The private steps of the action the tests drive. */
interface CutCopyInternals {
  _deleteCutSelection(): void;
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
