import { describe, expect, it } from "vitest";
import { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { Node } from "../../engine/scene/node.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BaseEditor } from "./base-editor.ts";
import { BoxEditor } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import "./path-base-editor.ts";
import "./scene-editor.ts";
import { SelectionPositionEditor, type SelectionHost } from "./selection-position-editor.ts";

function square(x: number, y: number, size: number): PathBase {
  const path = new PathBase();
  for (const [px, py] of [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
  ]) {
    const point = new AnchorPoint();
    point.setProperties(["x", "y"], [px, py]);
    path.getAnchorPoints().appendChild(point);
  }
  return path;
}

function setup(lockSecond = false) {
  const scene = new Scene(new Workspace());
  const a = square(0, 0, 40);
  const b = square(60, 20, 40);
  if (lockSecond) b.setProperty("plkt", 2);
  const page = scene.getActivePage() as unknown as { appendChild(n: Node): void };
  page.appendChild(a);
  page.appendChild(b);
  const log: unknown[][] = [];
  const host = {
    requestInvalidation: (editor: unknown) => log.push(["invalidate", editor]),
    getIndividualSelection: () => [a, b],
  } as unknown as SelectionHost;
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = host;
  const editor = new SelectionPositionEditor();
  editor.activate(scene, host);
  return { scene, a, b, editor, log };
}

const rect = (r: Rect | null) => (r ? [r.getX(), r.getY(), r.getWidth(), r.getHeight()] : null);

describe("GSelectionPositionEditor", () => {
  it("boxes the whole selection and outlines each element's editor", () => {
    const { a, b, editor } = setup();
    expect(rect(editor.getBox())).toEqual([0, 0, 100, 60]);
    for (const element of [a, b]) {
      expect(ElementEditor.getEditor(element)?.hasFlag(BaseEditor.Flag.Outline)).toBe(true);
    }
    expect(editor.hasFlag(BoxEditor.Flag.ResizeAll)).toBe(true);
    expect(editor.hasFlag(BoxEditor.Flag.RotateHandle)).toBe(true);
    expect(editor.getObjectNameModified()).toBe("Selection");
    expect(editor.isRelativeToPage()).toBe(false);
  });

  it("drops all handles when one element has NoSizeChanges", () => {
    const { editor } = setup(true);
    expect(editor.hasFlag(BoxEditor.Flag.ResizeEdges)).toBe(false);
    expect(editor.hasFlag(BoxEditor.Flag.ResizeCenters)).toBe(false);
    expect(editor.hasFlag(BoxEditor.Flag.RotateCorners)).toBe(false);
    expect(editor.hasFlag(BoxEditor.Flag.RotateHandle)).toBe(false);
  });

  it("hands previews to the element editors and applies through them", () => {
    const { a, b, editor } = setup();
    const calls: unknown[][] = [];
    for (const element of [a, b]) {
      const child = ElementEditor.getEditor(element) as ElementEditor;
      child.edTransform = (t: Transform) =>
        void calls.push(["preview", element, t.getMatrix().slice()]);
      child.applyTransform = (target: unknown, rotate: unknown, exceptions: unknown) =>
        void calls.push(["apply", target, rotate, exceptions]);
    }
    const move = new Transform(1, 0, 0, 1, 10, 0);
    editor.edTransform(move);
    expect(calls).toEqual([
      ["preview", a, [1, 0, 0, 1, 10, 0]],
      ["preview", b, [1, 0, 0, 1, 10, 0]],
    ]);
    expect(editor._transform).toBe(move);
    calls.length = 0;
    editor.applyPartMove(BoxEditor.ROTATION_HANDLE_PART_ID, {}, null, [b]);
    expect(calls).toEqual([["apply", a, true, [b]]]);
    expect(editor._transform).toBeNull();
    // Nothing previewed: nothing applied.
    calls.length = 0;
    editor.applyPartMove(BoxEditor.RESIZE_HANDLE_PART_ID, {});
    expect(calls).toEqual([]);
  });

  it("hit tests only its own handles", () => {
    const { editor } = setup();
    editor.setFlag(BaseEditor.Flag.Selected);
    const corner = editor.getPartInfoAt(new Point(100, 60), new Transform());
    expect(corner?.id).toBe(BoxEditor.RESIZE_HANDLE_PART_ID);
    expect(editor.getPartInfoAt(new Point(100, 60), new Transform(), () => false)).toBeNull();
    expect(editor.getPartInfoAt(new Point(500, 500), new Transform())).toBeNull();
  });

  it("asks the scene's GEditor to repaint itself", () => {
    const { editor, log } = setup();
    log.length = 0;
    editor.requestInvalidation();
    expect(log).toEqual([["invalidate", editor]]);
  });
});
