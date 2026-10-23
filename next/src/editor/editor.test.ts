import { describe, expect, it } from "vitest";
import { Point } from "../engine/math/point.ts";
import { Transform } from "../engine/math/transform.ts";
import { Block } from "../engine/scene/block.ts";
import { NodeFlag } from "../engine/scene/node-change.ts";
import type { Node } from "../engine/scene/node.ts";
import { Rectangle } from "../engine/scene/rectangle.ts";
import { Scene } from "../engine/scene/scene.ts";
import { Editor, ModifiedEvent, SelectionChangedEvent } from "./editor.ts";
import { EditorOptions } from "./editor-options.ts";
import { EditorWorkspace } from "./editor-workspace.ts";
import "./element-editors/rectangle-editor.ts";
import "./element-editors/page-editor.ts";
import "./element-editors/scene-editor.ts";
import "./element-editors/layer-editor.ts";
import "./element-editors/selection-position-editor.ts";
import { ElementEditor } from "./element-editors/element-editor.ts";

function setup(): { scene: Scene; editor: Editor } {
  const scene = new Scene(new EditorWorkspace());
  const editor = new Editor(scene);
  return { scene, editor };
}

function rect(x: number, name: string): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(10, 0, 0, 10, x, 0));
  r.setProperty("name", name);
  return r;
}

const names = (nodes: readonly Node[] | null): unknown[] =>
  (nodes || []).map((n) => (n as Rectangle).getProperty("name"));

describe("Editor", () => {
  it("hangs on the scene and takes over nodes restored as selected", () => {
    const scene = new Scene(new EditorWorkspace());
    const page = scene.getActivePage() as unknown as { appendChild(n: Node): void };
    const r = rect(0, "a");
    page.appendChild(r);
    r.setFlag(NodeFlag.Selected);
    const editor = new Editor(scene);
    expect(Editor.getEditor(scene)).toBe(editor);
    expect(names(editor.getSelection())).toEqual(["a"]);
    expect(ElementEditor.getEditor(r)).not.toBeNull();
    editor.release();
    expect(Editor.getEditor(scene)).toBeNull();
  });

  it("inserts elements as one undoable transaction and selects them", () => {
    const { scene, editor } = setup();
    const a = rect(0, "a");
    const b = rect(20, "b");
    editor.insertElements([a, b], true);
    expect(names(editor.getSelection())).toEqual(["a", "b"]);
    expect(editor.hasUndoState()).toBe(true);
    expect(editor.getUndoStateName()).toBe("Insert Element(s)");
    const page = scene.getActivePage() as unknown as { getChildren(): Node[] };
    expect(page.getChildren()).toContain(a);

    editor.undoState();
    expect(page.getChildren()).not.toContain(a);
    expect(editor.getSelection()).toBeNull();
    expect(editor.hasRedoState()).toBe(true);

    editor.redoState();
    expect(page.getChildren()).toContain(a);
    expect(names(editor.getSelection())).toEqual(["a", "b"]);
  });

  it("follows the Selected flag set by others and clears it", () => {
    const { editor } = setup();
    const a = rect(0, "a");
    const b = rect(20, "b");
    editor.insertElements([a, b], true);
    let changes = 0;
    editor.addEventListener(SelectionChangedEvent, () => changes++);
    a.removeFlag(NodeFlag.Selected);
    expect(names(editor.getSelection())).toEqual(["b"]);
    expect(changes).toBe(1);
    editor.updateSelection(true, [a, b]);
    expect(names(editor.getSelection())).toEqual(["a"]);
    editor.clearSelection();
    expect(editor.getSelection()).toBeNull();
    expect(a.hasFlag(NodeFlag.Selected)).toBe(false);
  });

  it("drops the oldest undo state beyond maxUndoSteps and clears redo on a new state", () => {
    const { editor } = setup();
    const r = rect(0, "r");
    editor.insertElements([r], true);
    for (let i = 0; i < EditorOptions.maxUndoSteps + 5; i++) {
      editor.beginTransaction();
      r.setProperty("name", "n" + String(i));
      editor.commitTransaction("step " + String(i));
    }
    expect(editor.getUndoStates().length).toBe(EditorOptions.maxUndoSteps);
    expect(editor.getUndoStates()[0]?.name).toBe("step 5");
    editor.undoState();
    expect(r.getProperty("name")).toBe("n" + String(EditorOptions.maxUndoSteps + 3));
    editor.beginTransaction();
    r.setProperty("name", "x");
    editor.commitTransaction("x");
    expect(editor.hasRedoState()).toBe(false);
  });

  it("records nothing for an empty transaction and throws on an unmatched commit", () => {
    const { editor } = setup();
    let modified = 0;
    editor.addEventListener(ModifiedEvent, () => modified++);
    editor.beginTransaction();
    editor.commitTransaction("nothing");
    expect(editor.hasUndoState()).toBe(false);
    expect(modified).toBe(0);
    expect(() => editor.commitTransaction("again")).toThrow("Nothing to commit");
  });

  it("tracks the save point", () => {
    const { editor } = setup();
    expect(editor.isModified()).toBe(false);
    editor.insertElements([rect(0, "a")], true);
    expect(editor.isModified()).toBe(true);
    const savePoint = editor.markSavePoint();
    expect(editor.isModified()).toBe(false);
    editor.undoState();
    // No undo state left, but the save point is still the undone state.
    expect(editor.isModified()).toBe(true);
    savePoint.rollback();
    expect(editor.isModified()).toBe(false);
  });

  it("arranges the selection in paint order", () => {
    const { scene, editor } = setup();
    const a = rect(0, "a");
    const b = rect(20, "b");
    const c = rect(40, "c");
    editor.insertElements([a, b, c], true);
    editor.updateSelection(false, [a]);
    editor.arrangeOrder(Editor.ArrangeOrderType.SendToFront);
    const page = scene.getActivePage() as unknown as { getChildren(): Node[] };
    expect(names(page.getChildren())).toEqual(["b", "c", "a"]);
    editor.arrangeOrder(Editor.ArrangeOrderType.SendBackward);
    expect(names(page.getChildren())).toEqual(["b", "a", "c"]);
    expect(editor.getUndoStateName()).toBe("Arrange Order");
  });

  it("aligns elements to the union of their boxes", () => {
    const { editor } = setup();
    const a = rect(0, "a");
    const b = rect(30, "b");
    editor.insertElements([a, b], true);
    editor.arrangeAlign(Editor.ArrangeAlignType.AlignRight);
    expect(a.getGeometryBBox()?.getX()).toBe(20);
    expect(b.getGeometryBBox()?.getX()).toBe(20);
  });

  it("deletes the selection", () => {
    const { scene, editor } = setup();
    const a = rect(0, "a");
    editor.insertElements([a], true);
    editor.deleteSelection();
    const page = scene.getActivePage() as unknown as { getChildren(): Node[] };
    expect(page.getChildren()).not.toContain(a);
    expect(editor.getSelection()).toBeNull();
    expect(editor.getUndoStateName()).toBe("Delete Selection");
  });

  it("constrains to axes within tan(22.5°) and to the diagonal otherwise", () => {
    const flat = Editor.convertToConstrain(0, 0, 10, 4);
    expect([flat.getX(), flat.getY()]).toEqual([10, 0]);
    const diagonal = Editor.convertToConstrain(0, 0, 10, 5);
    expect([diagonal.getX(), diagonal.getY()]).toEqual([10, 10]);
    const steep = Editor.convertToConstrain(0, 0, -5, -10);
    expect([steep.getX(), steep.getY()]).toEqual([-10, -10]);
  });

  it("keeps always-at-the-back blocks behind the others", () => {
    const { scene } = setup();
    const page = scene.getActivePage() as unknown as Node & { appendChild(n: Node): void };
    const back = rect(0, "back");
    back.setProperty("plkt", Block.ProgramLck.AlwaysBack);
    const front = rect(10, "front");
    page.appendChild(back);
    page.appendChild(front);
    expect(Editor.validateBlockInsertion(page, front, back)).toBe(false);
    expect(Editor.validateBlockInsertion(page, front, null)).toBe(true);
    expect(Editor.validateBlockInsertion(page, back, null)).toBe(false);
  });

  it("runs a transaction for a node of a scene with an editor", () => {
    const { editor } = setup();
    const r = rect(0, "r");
    editor.insertElements([r], true);
    Editor.tryRunTransaction(r, () => r.setProperty("name", "renamed"), "Rename");
    expect(editor.getUndoStateName()).toBe("Rename");
  });

  // See "isElementModified counts undo states" in QUESTIONS.md.
  it("counts undo states with a change, not changes, in isElementModified", () => {
    const { editor } = setup();
    const r = rect(0, "r");
    editor.insertElements([r], true);
    editor.beginTransaction();
    r.setProperty("name", "x");
    r.setProperty("name", "y");
    editor.commitTransaction("twice");
    expect(editor.isElementModified(r)).toBe(false);
    editor.beginTransaction();
    r.setProperty("name", "z");
    editor.commitTransaction("again");
    expect(editor.isElementModified(r)).toBe(true);
  });

  it("opens a selection editor for several elements and closes it for one", () => {
    const { editor } = setup();
    const a = rect(0, "a");
    const b = rect(20, "b");
    editor.insertElements([a, b], true);
    expect(editor.getSelectionEditor()).not.toBeNull();
    editor.updateSelection(false, [a]);
    expect(editor.getSelectionEditor()).toBeNull();
    editor.setSelectionDetail(true);
    editor.updateSelection(false, [a, b]);
    expect(editor.getSelectionEditor()).toBeNull();
  });

  it("moves the selection by a delta without snapping", () => {
    const { editor } = setup();
    const a = rect(0, "a");
    editor.insertElements([a], true);
    const moved = editor.moveSelection(new Point(5, 7));
    expect([moved.getX(), moved.getY()]).toEqual([5, 7]);
    editor.applySelectionTransform();
    expect(a.getGeometryBBox()?.getX()).toBe(-5);
    expect(a.getGeometryBBox()?.getY()).toBe(-3);
    expect(editor.getUndoStateName()).toBe("Transform Selection");
  });

  // Pins the old crash (BUGS-FIXED candidate "Toggle marquee over a
  // highlighted selected node throws").
  it("throws like the old code when a toggle marquee meets a highlighted selected node", () => {
    const { editor } = setup();
    const a = rect(0, "a");
    editor.insertElements([a], true);
    a.setFlag(NodeFlag.Highlighted);
    const everything = { rewindVertices: () => false, readVertex: () => false };
    expect(() => editor.highlightSelectablesUnderCollision(true, [a], everything)).toThrow(
      ReferenceError,
    );
    a.removeFlag(NodeFlag.Highlighted);
    const b = rect(20, "b");
    editor.insertElements([b], true);
    editor.highlightSelectablesUnderCollision(true, [a], everything);
    // b is outside the marquee list: its highlight goes; a is selected, so
    // a toggle marquee doesn't highlight it.
    expect(b.hasFlag(NodeFlag.Highlighted)).toBe(false);
  });
});
