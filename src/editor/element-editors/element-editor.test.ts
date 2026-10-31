import { describe, expect, it } from "vitest";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { Group } from "../../engine/scene/group.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Element } from "../../engine/scene/element.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BaseEditor } from "./base-editor.ts";
import { ElementEditor, type EditedElement } from "./element-editor.ts";
import { GroupEditor } from "./group-editor.ts";
import { RectangleEditor } from "./rectangle-editor.ts";

function box(rect: Rect | null): number[] | null {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

function rect(x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r;
}

function setup() {
  const scene = new Scene(new Workspace());
  const invalidated: unknown[] = [];
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = {
    requestInvalidation: (editor: unknown) => invalidated.push(editor),
  };
  const group = new Group();
  const a = rect(0, 0, 10, 10);
  const b = rect(20, 0, 10, 10);
  const c = rect(40, 0, 10, 10);
  group.appendChild(a);
  group.appendChild(b);
  group.appendChild(c);
  scene.appendChild(group);
  return { scene, group, a, b, c, invalidated };
}

describe("GElementEditor", () => {
  it("creates the editor registered for the exact class", () => {
    expect(ElementEditor.createEditor(new Rectangle())).toBeInstanceOf(RectangleEditor);
    // Group's editor is GroupEditor; a class without one gets none.
    expect(ElementEditor.createEditor(new Group())).toBeInstanceOf(GroupEditor);
    expect(ElementEditor.createEditor(new Workspace() as never)).toBeNull();
  });

  it("refuses to open an editor for a detached element", () => {
    expect(() => ElementEditor.openEditor(new Rectangle())).toThrow(
      "Node is not attached to create an editor for.",
    );
  });

  it("opens the parent editors and keeps the child editors in paint order", () => {
    const { group, a, b, c } = setup();
    const editorC = ElementEditor.openEditor(c) as ElementEditor;
    const groupEditor = ElementEditor.getEditor(group) as GroupEditor;
    expect(groupEditor).toBeInstanceOf(GroupEditor);
    expect(editorC.getParentEditor()).toBe(groupEditor);
    const editorA = ElementEditor.openEditor(a) as ElementEditor;
    const editorB = ElementEditor.openEditor(b) as ElementEditor;
    expect(groupEditor.getEditors()).toEqual([editorA, editorB, editorC]);
    expect(ElementEditor.openEditor(a)).toBe(editorA);
    // `append` puts it at the end whatever the order.
    ElementEditor.closeElementEditor(a);
    expect(ElementEditor.getEditor(a)).toBeNull();
    ElementEditor.openEditor(a, false, true);
    expect(groupEditor.getEditors()?.at(-1)).toBe(ElementEditor.getEditor(a));
  });

  it("closes the editors inside an editor along with it", () => {
    const { group, a, b } = setup();
    ElementEditor.openEditor(a);
    ElementEditor.openEditor(b);
    const groupEditor = ElementEditor.getEditor(group) as GroupEditor;
    ElementEditor.closeElementEditor(group);
    expect(ElementEditor.getEditor(group)).toBeNull();
    expect(ElementEditor.getEditor(a)).toBeNull();
    expect(groupEditor.getEditors()).toEqual([]);
  });

  it("asks the scene's GEditor to repaint", () => {
    const { a, invalidated } = setup();
    const editor = ElementEditor.openEditor(a) as ElementEditor;
    invalidated.length = 0;
    editor.setFlag(BaseEditor.Flag.Selected);
    expect(invalidated).toEqual([editor, editor]);
  });

  it("is empty unless selected or highlighted and maps the source box otherwise", () => {
    const { a } = setup();
    const editor = ElementEditor.openEditor(a) as ElementEditor;
    expect(editor.getBBox(new Transform())).toBeNull();
    editor.setFlag(BaseEditor.Flag.Highlighted);
    // The 10 x 10 box, the 1.5 margin; highlighted shows no handles.
    expect(box(editor.getBBox(new Transform()))).toEqual([-1.5, -1.5, 13, 13]);
  });

  it("applies a previewed transform to the element and resets it", () => {
    const { a } = setup();
    const editor = ElementEditor.openEditor(a) as ElementEditor;
    editor.setFlag(BaseEditor.Flag.Selected);
    editor._setTransform(new Transform(1, 0, 0, 1, 5, 7));
    expect(editor.canApplyTransform()).toBe(true);
    expect(box(editor.getPEGeometryBBox())).toEqual([5, 7, 10, 10]);
    editor.applyTransform(a);
    expect(box(a.getGeometryBBox())).toEqual([5, 7, 10, 10]);
    expect(editor._transform).toBeNull();
    // A partially locked element can't take a transform.
    a.setFlag(ElementFlag.PartialLocked);
    editor._setTransform(new Transform(1, 0, 0, 1, 5, 7));
    expect(editor.canApplyTransform()).toBe(false);
  });

  it("links and unlinks the preview to the element", () => {
    const { a } = setup();
    const editor = ElementEditor.openEditor(a) as ElementEditor;
    const preview = rect(0, 0, 1, 1) as unknown as EditedElement;
    editor._setElementPreview(preview);
    expect(preview._baseElement).toBe(a);
    expect(editor.getPaintElement()).toBe(preview);
    editor.resetTransform();
    expect(preview._baseElement).toBeNull();
    expect(editor.getPaintElement()).toBe(a);
  });

  describe("relayout of anchored contents", () => {
    /** The group of setup() with its editor; _layoutAnchorContents records its arguments. */
    function layoutSetup() {
      const parts = setup();
      const editor = ElementEditor.openEditor(parts.group) as ElementEditor;
      const calls: unknown[][] = [];
      const group = parts.group as unknown as EditedElement;
      group._layoutAnchorContents = (newBox: Rect | null, oldBox: Rect | null, t: unknown) =>
        void calls.push([box(newBox), box(oldBox), t ? (t as Transform).getMatrix() : null]);
      return { ...parts, editor, group, calls };
    }
    const prepare = (editor: ElementEditor, data: unknown) =>
      ElementEditor.prototype._prepareApplyPartMove.call(editor, "part", data);
    const finish = (editor: ElementEditor, data: unknown) =>
      ElementEditor.prototype._finishApplyPartMove.call(editor, "part", data);
    const widen = (c: Rectangle, by: number) =>
      c.setProperty("trf", new Transform(5 + by / 2, 0, 0, 5, 45 + by / 2, 5));

    it("passes the new and old box after a part move that resizes", () => {
      const { editor, group, c, calls } = layoutSetup();
      prepare(editor, {});
      expect(group._relayout).toBe(true);
      expect(box(editor._oldBBox as Rect)).toEqual([0, 0, 50, 10]);
      widen(c, 10);
      finish(editor, {});
      expect(calls).toEqual([[[0, 0, 60, 10], [0, 0, 50, 10], null]]);
      expect(group._relayout).toBe(false);
    });

    it("doesn't relayout when the size stays within 1e-10", () => {
      const { editor, c, calls } = layoutSetup();
      prepare(editor, {});
      widen(c, 1e-11);
      finish(editor, {});
      expect(calls).toEqual([]);
      prepare(editor, {});
      widen(c, 1e-9);
      finish(editor, {});
      expect(calls.length).toBe(1);
    });

    it("relayouts by the layout transform when one was set during the move", () => {
      const { editor, group, calls } = layoutSetup();
      prepare(editor, {});
      expect(group._layoutTransform).toBeNull();
      group._layoutTransform = new Transform(2, 0, 0, 2, 0, 0);
      finish(editor, {});
      expect(calls).toEqual([[null, null, [2, 0, 0, 2, 0, 0]]]);
      expect(group._layoutTransform).toBeNull();
    });

    it("adds a rotation to the anchored children's anchor transforms without relayout", () => {
      const { editor, group, a, b, c, calls } = layoutSetup();
      expect(a.hasMixin(Element.Anchor)).toBe(true);
      a.setProperty("hacr", 1);
      a.setProperty("hatrf", new Transform(1, 0, 0, 1, 5, 0));
      b.setProperty("vacr", 1);
      c.setProperties(["hacr", "vacr"], [null, null]);
      const matrix = (node: Rectangle, name: string) =>
        (node.getProperty(name) as Transform | null)?.getMatrix() ?? null;
      const anchorTransforms = () =>
        [a, b, c].map((node) => [matrix(node, "hatrf"), matrix(node, "vatrf")]);
      /** What the anchored children (a and b) get: their transforms times `add`. */
      const expected = (before: (number[] | null)[][], add: Transform) =>
        before.map((pair, i) =>
          i === 2
            ? pair
            : pair.map((m) =>
                m
                  ? new Transform(...(m as [number, number, number, number, number, number]))
                      .multiplied(add)
                      .getMatrix()
                  : add.getMatrix(),
              ),
        );
      const data = { noRelayout: true };
      prepare(editor, data);
      expect(editor._oldBBox).toBeUndefined();
      const rotation = new Transform(0, 1, -1, 0, 3, 0);
      group._layoutTransform = rotation;
      const before = anchorTransforms();
      finish(editor, data);
      const after = anchorTransforms();
      expect(after).toEqual(expected(before, rotation));
      expect(after[0]).not.toEqual(before[0]);
      expect(after[2]).toEqual([null, null]);
      expect(calls).toEqual([]);
      expect([group._layoutTransform, group._relayout]).toEqual([null, false]);
      // Without a layout transform the identity is added.
      prepare(editor, data);
      finish(editor, data);
      expect(anchorTransforms()).toEqual(expected(after, new Transform()));
    });

    it("relayouts an applied transform by the preview or the pre-transform", () => {
      const { editor, group, calls } = layoutSetup();
      // Nothing previewed: no relayout.
      editor._prepareApplyTransform(group);
      expect([group._layoutTransform, group._relayout]).toEqual([null, false]);
      const scale = new Transform(2, 0, 0, 1, 0, 0);
      editor._transform = scale;
      editor._prepareApplyTransform(group);
      expect([group._layoutTransform, group._relayout]).toEqual([scale, true]);
      editor._finishApplyTransform(group);
      editor._transform = null;
      editor._preTransform = new Transform(1, 0, 0, 3, 0, 0);
      editor._prepareApplyTransform(group);
      editor._finishApplyTransform(group);
      expect(calls).toEqual([
        [null, null, [2, 0, 0, 1, 0, 0]],
        [null, null, [1, 0, 0, 3, 0, 0]],
      ]);
      expect([group._layoutTransform, group._relayout]).toEqual([null, false]);
    });

    it("relayouts an applied part selection by the boxes and forgets the old box", () => {
      const { editor, group, c, calls } = layoutSetup();
      editor._partSelection = ["part"];
      editor._prepareApplyTransform(group);
      expect(box(editor._oldBBox as Rect)).toEqual([0, 0, 50, 10]);
      widen(c, 10);
      editor._finishApplyTransform(group);
      expect(calls).toEqual([[[0, 0, 60, 10], [0, 0, 50, 10], null]]);
      expect(editor._oldBBox).toBeNull();
    });
  });
});

describe("GElementEditor among many siblings", () => {
  /** `count` rectangles in a group in a scene. */
  function row(count: number) {
    const scene = new Scene(new Workspace());
    (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = {
      requestInvalidation: () => {},
    };
    const group = new Group();
    const shapes: Rectangle[] = [];
    for (let i = 0; i < count; i++) {
      const shape = rect(i * 2, 0, 1, 1);
      group.appendChild(shape);
      shapes.push(shape);
    }
    scene.appendChild(group);
    return { group, shapes };
  }

  const elementsOfEditors = (group: Group) =>
    ((ElementEditor.getEditor(group) as GroupEditor).getEditors() as ElementEditor[]).map(
      (editor) => editor.getElement(),
    );

  /** Counts the steps from a node to the next while `body` runs. */
  function countSteps(body: () => void): number {
    const proto = Object.getPrototypeOf(Rectangle.prototype) as object;
    let owner: { getNext: () => unknown } | null = null;
    for (let p: object | null = proto; p && !owner; p = Object.getPrototypeOf(p) as object | null)
      if (Object.hasOwn(p, "getNext")) owner = p as { getNext: () => unknown };
    const target = owner as { getNext: () => unknown };
    const original = target.getNext;
    let steps = 0;
    target.getNext = function (this: unknown) {
      steps++;
      return original.call(this);
    };
    try {
      body();
    } finally {
      target.getNext = original;
    }
    return steps;
  }

  it("keeps paint order with an editor open in the middle, without walking the siblings", () => {
    const { group, shapes } = row(1200);
    ElementEditor.openEditor(shapes[600] as Rectangle);
    const steps = countSteps(() => {
      for (const shape of shapes) ElementEditor.openEditor(shape);
    });
    expect(elementsOfEditors(group)).toEqual(shapes);
    // Each of the 600 shapes before the open editor walked the 599 after
    // it before; now the walk stops after 64 and looks positions up.
    expect(steps).toBeLessThan(100_000);
  });

  it("looks up an element where it is after a sibling moved", () => {
    const { group, shapes } = row(300);
    const at = (i: number) => shapes[i] as Rectangle;
    ElementEditor.openEditor(at(150));
    // A walk of more than 64 siblings, which looks up their positions.
    ElementEditor.openEditor(at(10));
    expect(elementsOfEditors(group)).toEqual([at(10), at(150)]);
    // Shape 5 moves far behind shape 150.
    group.removeChild(at(5));
    group.insertChild(at(5), at(290));
    ElementEditor.openEditor(at(5));
    expect(elementsOfEditors(group)).toEqual([at(10), at(150), at(5)]);
  });
});
