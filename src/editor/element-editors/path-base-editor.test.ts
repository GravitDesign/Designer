import { describe, expect, it } from "vitest";
import { Transform } from "../../engine/math/transform.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import { Path } from "../../engine/scene/path.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { ElementEditor } from "./element-editor.ts";
import { PathBaseEditor, type EditedPathBase } from "./path-base-editor.ts";

function path(): EditedPathBase {
  const p = new Path();
  const points = p.getAnchorPoints();
  for (const [x, y] of [
    [0, 0],
    [100, 0],
    [100, 50],
  ]) {
    const point = new AnchorPoint();
    point.setProperties(["x", "y"], [x, y]);
    points.appendChild(point);
  }
  return p as unknown as EditedPathBase;
}

describe("GPathBaseEditor", () => {
  it("is registered for GPathBase itself only", () => {
    expect(ElementEditor.createEditor(new PathBase())).toBeInstanceOf(PathBaseEditor);
  });

  it("previews points on a GPathBase copy that keeps the Selected flags", () => {
    const element = path();
    const second = element.getAnchorPoints().getChildByIndex(1) as AnchorPoint;
    second.setFlag(NodeFlag.Selected);
    const editor = new PathBaseEditor(element);
    const preview = editor.getPathBasePreview();
    expect(preview.constructor).toBe(PathBase);
    expect(editor.getPathBasePreview()).toBe(preview);
    const copies = preview.getAnchorPoints().getChildren() as AnchorPoint[];
    expect(copies.map((p) => [p.getProperty("x"), p.getProperty("y")])).toEqual([
      [0, 0],
      [100, 0],
      [100, 50],
    ]);
    expect(copies.map((p) => p.hasFlag(NodeFlag.Selected))).toEqual([false, true, false]);
    expect(editor.getPointPreview(second)).toBe(copies[1]);
    expect(editor.getPointPreview(new AnchorPoint())).toBeNull();
    editor.releasePathBasePreview();
    expect(editor.getPaintElement()).toBe(element);
  });

  it("previews edTransform on the element preview instead of its own transform", () => {
    const element = new Rectangle() as unknown as EditedPathBase;
    element.setProperty("trf", new Transform(50, 0, 0, 30, 50, 30));
    const editor = new PathBaseEditor(element);
    editor.createElementPreview = function () {
      this._setElementPreview(this._element.clone() as EditedPathBase);
    };
    editor.edTransform(new Transform(1, 0, 0, 1, 10, 0));
    expect(editor._transform).toBeNull();
    expect(editor.getPaintElement().getTransform()?.getMatrix()).toEqual([50, 0, 0, 30, 60, 30]);
    expect(element.getTransform()?.getMatrix()).toEqual([50, 0, 0, 30, 50, 30]);
  });

  it("switches the catch handle", () => {
    const editor = new PathBaseEditor(path());
    expect(editor._catchHandleAllowed()).toBe(true);
    editor.setCatchHandle(0);
    expect(editor._catchHandleAllowed()).toBe(false);
  });
});
