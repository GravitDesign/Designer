import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, onTestFinished } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { SceneOptions } from "../../engine/scene/scene-options.ts";
import { Symbol } from "../../engine/scene/symbol.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BaseEditor } from "./base-editor.ts";
import { LabelHolder } from "./block-editor.ts";
import { BoxEditor } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import "./rectangle-editor.ts";
import { SymbolEditor } from "./symbol-editor.ts";

function box(rect: Rect | null): number[] | null {
  return rect ? [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()] : null;
}

function setup() {
  const scene = new Scene(new Workspace());
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = {
    requestInvalidation: () => {},
  };
  const a = new Rectangle();
  a.setProperty("trf", new Transform(50, 0, 0, 25, 150, 125));
  scene.appendChild(a);
  const master = Symbol.create([a], scene.getActivePage() as never, "Badge");
  const editor = ElementEditor.openEditor(master) as SymbolEditor;
  return { scene, a, master, editor };
}

const guides = { mapPoint: (p: Point) => p };

/** Recorded from the old app: a master resize by its bottom-right handle. */
const here = dirname(fileURLToPath(import.meta.url));
const oldResize = JSON.parse(
  readFileSync(resolve(here, "__fixtures__", "old-symbol-editor-resize.json"), "utf8"),
) as unknown;

describe("GSymbolEditor", () => {
  it("is the symbol's editor and shows while attached", () => {
    const { editor } = setup();
    expect(editor).toBeInstanceOf(SymbolEditor);
    expect(editor._isAttached).toBe(true);
    // Not selected, but attached: it still has a box and shows.
    expect(editor._isBBoxEmpty()).toBe(false);
    expect(editor._showEditor()).toBe(true);
  });

  it("drops its preview on any geometry change in the scene while attached", () => {
    const { a, editor } = setup();
    editor.createElementPreview();
    expect(editor._elementPreview).not.toBeNull();
    a.setProperty("trf", new Transform(60, 0, 0, 25, 150, 125));
    expect(editor._elementPreview).toBeNull();
    editor._detach();
    editor.createElementPreview();
    a.setProperty("trf", new Transform(50, 0, 0, 25, 150, 125));
    expect(editor._elementPreview).not.toBeNull();
  });

  it("has the symbol colour only for masters and instances", () => {
    const { editor } = setup();
    expect(editor.getColor()).toEqual(new RGBColor([132, 102, 176]));
    const loose = new SymbolEditor(new Symbol() as never);
    expect(loose.getColor()).toBeNull();
  });

  it("hits the label over the symbol", () => {
    const { master, editor } = setup();
    const top = (master.getGeometryBBox() as Rect).getY();
    const left = (master.getGeometryBBox() as Rect).getX();
    const hit = editor.getPartInfoAt(new Point(left + 15, top - 3), new Transform());
    expect(hit && hit.id).toBe(LabelHolder.LABEL_PART_ID);
    expect(hit && hit.selectable).toBe(true);
    // Below the symbol there is no label.
    expect(editor.getPartInfoAt(new Point(left + 15, top + 200), new Transform())).toBeNull();
  });

  it("moves the symbol by a label drag", () => {
    const { master, a, editor } = setup();
    editor.setFlag(BaseEditor.Flag.Selected);
    const before = box(master.getGeometryBBox()) as number[];
    const start = new Point((before[0] as number) + 15, (before[1] as number) - 3);
    const data = { point: start, origTrf: new Transform() };
    editor.movePart(
      LabelHolder.LABEL_PART_ID,
      data,
      start.add(new Point(30, 10)),
      new Transform(),
      guides,
    );
    expect(Transform.serialize(editor._transform as Transform)).toEqual([1, 0, 0, 1, 30, 10]);
    editor.applyPartMove(LabelHolder.LABEL_PART_ID, data);
    expect(box(master.getGeometryBBox())).toEqual([
      (before[0] as number) + 30,
      (before[1] as number) + 10,
      before[2],
      before[3],
    ]);
    expect(box(a.getGeometryBBox())).toEqual([130, 110, 100, 50]);
    expect(editor._transform).toBeNull();
  });

  it("resizes a master by its handle and the instances with the same frame, as the old app did", () => {
    // Recorded with the engine's defaults for the options the old app
    // changes at start (label scaling, rotation handle distance, adaptive
    // resize handles).
    onTestFinished(() => {
      SceneOptions.scaleLabel = true;
    });
    const scene = new Scene(new Workspace());
    (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = {
      requestInvalidation: () => {},
    };
    const page = scene.getActivePage() as unknown as { appendChild(node: unknown): void };
    const a = new Rectangle();
    a.setProperty("trf", new Transform(50, 0, 0, 25, 150, 125));
    page.appendChild(a);
    const master = Symbol.create([a], page as never, "Badge");
    const instance = master.clone() as Symbol;
    page.appendChild(instance);
    instance.transform(new Transform(1, 0, 0, 1, 300, 0));
    instance.setProperty("blockEv", "kept");
    // Scaled, so its scale differs from the master's: left alone.
    const scaled = master.clone() as Symbol;
    page.appendChild(scaled);
    scaled.transform(new Transform(2, 0, 0, 2, 0, 300));
    const blockLog: unknown[][] = [];
    for (const [name, node] of [
      ["master", master],
      ["instance", instance],
      ["scaled", scaled],
    ] as const) {
      const original = node.setProperty.bind(node);
      node.setProperty = ((property: string, value: unknown, ...rest: unknown[]) => {
        if (property === "blockEv")
          blockLog.push([name, value === undefined ? "<undefined>" : value]);
        return (original as (...args: unknown[]) => unknown)(property, value, ...rest);
      }) as typeof node.setProperty;
    }
    const trf = (node: unknown) =>
      ((node as Rectangle).getProperty("trf") as Transform | null)?.getMatrix() ?? null;
    const state = () => {
      const masterBlockEv = master.getProperty("blockEv");
      return {
        masterFrame: box(master.getProperty("frame") as Rect),
        masterTrf: trf(master),
        childTrf: trf(a),
        masterBox: box(master.getGeometryBBox()),
        instanceFrame: box(instance.getProperty("frame") as Rect),
        instanceTrf: trf(instance),
        instanceChildTrf: trf(instance.getFirstChild()),
        instanceBox: box(instance.getGeometryBBox()),
        instanceBlockEv: instance.getProperty("blockEv"),
        scaledFrame: box(scaled.getProperty("frame") as Rect),
        scaledTrf: trf(scaled),
        masterBlockEv: masterBlockEv === undefined ? "<undefined>" : masterBlockEv,
      };
    };
    const editor = ElementEditor.openEditor(master) as SymbolEditor;
    editor.setFlag(BaseEditor.Flag.Selected);
    const before = state();
    const customBoxIdle: Record<string, number[] | null> = {};
    for (const scaleLabel of [true, false]) {
      SceneOptions.scaleLabel = scaleLabel;
      customBoxIdle[String(scaleLabel)] = box(
        editor.getCustomBBox(new Transform(2, 0, 0, 2, 0, 0)),
      );
    }
    SceneOptions.scaleLabel = true;
    editor.createElementPreview();
    const corner = (master.getGeometryBBox() as Rect).getSide(Rect.Side.BOTTOM_RIGHT);
    const resize = editor.movePart(
      BoxEditor.RESIZE_HANDLE_PART_ID,
      { side: Rect.Side.BOTTOM_RIGHT },
      corner.add(new Point(20, 10)),
      new Transform(),
      guides,
      false,
      false,
    ) as Transform | null;
    const stored = editor._storedMoveData;
    const preview = editor._elementPreview;
    const previewed = {
      resize: resize ? resize.getMatrix() : null,
      preTransform: editor._preTransform ? editor._preTransform.getMatrix() : null,
      peBox: box(editor.getPEGeometryBBox()),
      customBox: box(editor.getCustomBBox(new Transform())),
      customBoxScaled: box(editor.getCustomBBox(new Transform(2, 0, 0, 2, 0, 0))),
      canApply: !!editor.canApplyTransform(),
      previewTrf: preview ? trf(preview) : null,
      stored: stored ? { side: stored.side, dx: stored.dx, dy: stored.dy } : null,
    };
    editor.applyPartMove(BoxEditor.RESIZE_HANDLE_PART_ID, { side: Rect.Side.BOTTOM_RIGHT });
    const after = state();
    editor._transform = new Transform(1, 0, 0, 1, 10, 0);
    const peBoxMoved = box(editor.getPEGeometryBBox());
    editor._transform = null;
    expect({
      before,
      customBoxIdle,
      ...previewed,
      after,
      blockLog,
      instanceEditorOpen: !!ElementEditor.getEditor(instance),
      preview: !!editor._elementPreview,
      peBoxMoved,
    }).toEqual(oldResize);
  });
});
