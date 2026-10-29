import { describe, expect, it } from "vitest";
import { Point } from "../engine/math/point.ts";
import { Transform } from "../engine/math/transform.ts";
import { Block } from "../engine/scene/block.ts";
import { NodeFlag } from "../engine/scene/node-change.ts";
import { BeforeRemoveEvent } from "../engine/scene/node-events.ts";
import type { Node } from "../engine/scene/node.ts";
import { Rectangle } from "../engine/scene/rectangle.ts";
import { Scene } from "../engine/scene/scene.ts";
import { Group } from "../engine/scene/group.ts";
import { Editor, ModifiedEvent, SelectionChangedEvent } from "./editor.ts";
import { EditorOptions } from "./editor-options.ts";
import { EditorWorkspace } from "./editor-workspace.ts";
import "./element-editors/group-editor.ts";
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

  it("BUG-040: a toggle marquee over a highlighted selected node unhighlights it and goes on", () => {
    const { editor } = setup();
    const a = rect(0, "a");
    const b = rect(20, "b");
    editor.insertElements([a, b], true);
    editor.updateSelection(false, [a]);
    a.setFlag(NodeFlag.Highlighted);
    const everything = { rewindVertices: () => false, readVertex: () => false };
    editor.highlightSelectablesUnderCollision(true, [a, b], everything);
    // a is selected, so the toggle marquee drops its highlight; b comes
    // after it and still gets highlighted.
    expect(a.hasFlag(NodeFlag.Highlighted)).toBe(false);
    expect(b.hasFlag(NodeFlag.Highlighted)).toBe(true);
    const c = rect(40, "c");
    editor.insertElements([c], false);
    c.setFlag(NodeFlag.Highlighted);
    editor.highlightSelectablesUnderCollision(true, [a], everything);
    // c is outside the marquee list: its highlight goes.
    expect(c.hasFlag(NodeFlag.Highlighted)).toBe(false);
  });
});

describe("Editor selection index", () => {
  /** isInSelection must answer what a search of the selection list would, for every node. */
  function expectInStep(editor: Editor, nodes: readonly Node[]): void {
    const selection = editor.getSelection() || [];
    for (const node of nodes) {
      expect(editor.isInSelection(node), String((node as Rectangle).getProperty("name"))).toBe(
        selection.includes(node),
      );
    }
  }

  function many(editor: Editor, count: number): Rectangle[] {
    const nodes: Rectangle[] = [];
    for (let i = 0; i < count; i++) nodes.push(rect(i * 20, "r" + i));
    editor.insertElements(nodes, true);
    return nodes;
  }

  it("follows nodes removed from the middle, the front and the back", () => {
    const { editor } = setup();
    const nodes = many(editor, 9);
    expectInStep(editor, nodes);
    for (const i of [4, 0, 8, 2]) (nodes[i] as Rectangle).removeFlag(NodeFlag.Selected);
    expect(names(editor.getSelection())).toEqual(["r1", "r3", "r5", "r6", "r7"]);
    expectInStep(editor, nodes);
    (nodes[4] as Rectangle).setFlag(NodeFlag.Selected);
    expect(names(editor.getSelection())).toEqual(["r1", "r3", "r5", "r6", "r7", "r4"]);
    expectInStep(editor, nodes);
  });

  it("follows clearing, with and without nodes to keep", () => {
    const { editor } = setup();
    const nodes = many(editor, 6);
    editor.clearSelection([nodes[1], nodes[4]]);
    expect(names(editor.getSelection())).toEqual(["r1", "r4"]);
    expectInStep(editor, nodes);
    editor.clearSelection();
    expect(editor.getSelection()).toBeNull();
    expectInStep(editor, nodes);
  });

  it("follows a new selection in another order and a reordered page", () => {
    const { scene, editor } = setup();
    const nodes = many(editor, 5);
    editor.updateSelection(false, [nodes[3], nodes[1], nodes[2]]);
    expect(names(editor.getSelection())).toEqual(["r1", "r2", "r3"]);
    expectInStep(editor, nodes);
    editor.arrangeOrder(Editor.ArrangeOrderType.SendToBack);
    const page = scene.getActivePage() as unknown as { getChildren(): Node[] };
    expect(names(page.getChildren())).toEqual(["r1", "r2", "r3", "r0", "r4"]);
    expectInStep(editor, nodes);
    editor.updateSelection(true, [nodes[2], nodes[4]]);
    expectInStep(editor, nodes);
  });

  it("follows delete, undo and redo", () => {
    const { editor } = setup();
    const nodes = many(editor, 4);
    editor.updateSelection(false, [nodes[1], nodes[2]]);
    editor.deleteSelection();
    expect(editor.getSelection()).toBeNull();
    expectInStep(editor, nodes);
    editor.undoState();
    expect(names(editor.getSelection())).toEqual(["r1", "r2"]);
    expectInStep(editor, nodes);
    editor.redoState();
    expect(editor.getSelection()).toBeNull();
    expectInStep(editor, nodes);
    editor.undoState();
    editor.undoState();
    expectInStep(editor, nodes);
  });

  it("counts a node that is in the list twice and removes its last place", () => {
    const { editor } = setup();
    const nodes = many(editor, 3);
    const a = nodes[0] as Rectangle;
    // Adding a selected node again puts it in the list twice, as before.
    editor._tryAddToSelection(a as never);
    expect(names(editor.getSelection())).toEqual(["r0", "r1", "r2", "r0"]);
    editor._tryRemoveFromSelection(a as never);
    expect(names(editor.getSelection())).toEqual(["r0", "r1", "r2"]);
    expect(editor.isInSelection(a)).toBe(true);
    a.removeFlag(NodeFlag.Selected);
    expect(names(editor.getSelection())).toEqual(["r1", "r2"]);
    expectInStep(editor, nodes);
  });
});

describe("Editor individual selection while the change is handed out", () => {
  type Parent = Node & { appendChild(child: Node): void; removeChild(child: Node): void };

  /** A group "g" holding "c", and a rectangle "r" next to it. */
  function scene(): { editor: Editor; g: Group; c: Rectangle; r: Rectangle } {
    const { editor } = setup();
    const g = new Group();
    g.setProperty("name", "g");
    const c = rect(0, "c");
    (g as unknown as Parent).appendChild(c);
    const r = rect(40, "r");
    editor.insertElements([g, r], false);
    return { editor, g, c, r };
  }

  const individual = (editor: Editor): unknown[] =>
    names(editor.getIndividualSelection() as unknown as Node[] | null);

  const fresh = (editor: Editor): unknown[] =>
    names(editor.filterIndividualElements(editor._selection || []) as unknown as Node[]);

  it("answers what the selection is at each call, also after changes made by a listener", () => {
    const { editor, g, c, r } = scene();
    const seen: unknown[][] = [];
    let changeInside = true;
    editor.addEventListener(SelectionChangedEvent, () => {
      seen.push(individual(editor));
      if (!changeInside) return;
      changeInside = false;
      // A selected child drops its group, though the editor turns the
      // child down and the selection list stays as it is.
      const childEditor = ElementEditor.openEditor(c) as ElementEditor;
      childEditor.validateSelectionChange = () => false;
      c.setFlag(NodeFlag.Selected);
      expect(names(editor.getSelection())).toEqual(["g", "r"]);
      seen.push(individual(editor));
      expect(individual(editor)).toEqual(fresh(editor));
      // Someone asks while the child is on its way out; once it is gone
      // the group counts again.
      const scene = editor.getScene();
      const ask = (): void => void editor.getIndividualSelection();
      scene.addEventListener(BeforeRemoveEvent, ask);
      (g as unknown as Parent).removeChild(c);
      scene.removeEventListener(BeforeRemoveEvent, ask);
      seen.push(individual(editor));
      expect(individual(editor)).toEqual(fresh(editor));
    });
    editor.updateSelection(false, [g, r]);
    expect(seen).toEqual([["g", "r"], ["r"], ["g", "r"]]);
    expect(individual(editor)).toEqual(["g", "r"]);
  });

  it("hands out a copy each time", () => {
    const { editor, g, r } = scene();
    let first: Node[] | null = null;
    let second: Node[] | null = null;
    editor.addEventListener(SelectionChangedEvent, () => {
      first = editor.getIndividualSelection() as unknown as Node[];
      first.length = 0;
      second = editor.getIndividualSelection() as unknown as Node[];
    });
    editor.updateSelection(false, [g, r]);
    expect(names(second)).toEqual(["g", "r"]);
  });
});
