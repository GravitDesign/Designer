import { describe, expect, it } from "vitest";
import { Connector } from "../../engine/scene/connector.ts";
import type { Page } from "../../engine/scene/page.ts";
import { AnchorPoint } from "../../engine/scene/path-base.ts";
import { Path } from "../../engine/scene/path.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { Transform } from "../../engine/math/transform.ts";
import { BaseEditor } from "./base-editor.ts";
import { BoxEditor } from "./box-editor.ts";
import { ConnectorEditor, type EditedConnector } from "./connector-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { PathEditor } from "./path-editor.ts";

function setup() {
  const scene = new Scene(new Workspace());
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = {
    requestInvalidation() {},
  };
  const connector = new Connector();
  for (const [x, y] of [
    [0, 0],
    [50, 0],
    [100, 0],
  ] as const) {
    const point = new AnchorPoint();
    point.setProperties(["x", "y"], [x, y]);
    connector.getAnchorPoints().appendChild(point);
  }
  (scene.getActivePage() as Page).appendChild(connector);
  const editor = new ConnectorEditor(connector as EditedConnector);
  editor.setFlag(BaseEditor.Flag.Selected);
  return { connector, editor, anchors: connector.getAnchorPoints().getChildren() as AnchorPoint[] };
}

describe("connector editor", () => {
  it("is the editor of connectors, without resize box and rotation handle", () => {
    const { connector, editor } = setup();
    expect(ElementEditor.createEditor(connector)).toBeInstanceOf(ConnectorEditor);
    expect(ElementEditor.createEditor(new Path())).not.toBeInstanceOf(ConnectorEditor);
    expect(editor.hasFlag(BoxEditor.Flag.ResizeAll)).toBe(false);
    expect(editor.hasFlag(BoxEditor.Flag.RotateHandle)).toBe(false);
    expect(editor.hasFlag(BoxEditor.Flag.RotateCorners)).toBe(true);
    editor.setFlag(BoxEditor.Flag.ResizeEdges);
    expect(editor.hasFlag(BoxEditor.Flag.ResizeEdges)).toBe(false);
  });

  it("doesn't delete its end points", () => {
    const { editor, anchors } = setup();
    editor.selectOnePoint(anchors[1] as AnchorPoint);
    expect(editor.isDeletePartsAllowed()).toBe(true);
    editor.updatePartSelection(true, [{ type: PathEditor.PartType.Point, point: anchors[2] }]);
    expect(editor.isDeletePartsAllowed()).toBe(false);
  });

  it("applies a whole-connector transform only with both paths connected", () => {
    const { connector, editor, anchors } = setup();
    editor._setTransform(new Transform(1, 0, 0, 1, 10, 0));
    editor.applyTransform(connector);
    // No source and destination path: nothing moves and the transform stays.
    expect(anchors[0]?.getProperty("x")).toBe(0);
    expect(editor._transform?.getMatrix()).toEqual([1, 0, 0, 1, 10, 0]);
  });
});
