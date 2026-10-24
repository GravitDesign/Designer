import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Platform } from "../../engine/core/platform.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { installFakeCanvas } from "../../engine/paint/testing/fake-canvas.ts";
import type { PropertiesNode } from "../../engine/scene/node-properties.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { AngularGradient } from "../../engine/style/angular-gradient.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import type { Gradient } from "../../engine/style/gradient.ts";
import { LinearGradient } from "../../engine/style/linear-gradient.ts";
import { RadialGradient } from "../../engine/style/radial-gradient.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import type { StyleEdManager } from "../style-ed-manager.ts";
import { AngularGradientEditor } from "./angular-gradient-editor.ts";
import { BaseEditor, type PartInfo } from "./base-editor.ts";
import {
  GradientStyleEditor,
  type PlusStopPartId,
  type StopPartId,
} from "./gradient-style-editor.ts";
import { LinearGradientEditor } from "./linear-gradient-editor.ts";
import { RadialGradientEditor } from "./radial-gradient-editor.ts";
import { RectangleEditor } from "./rectangle-editor.ts";
import { StyleEditor } from "./style-editor.ts";

/** Records what the editors ask of the style editor manager. */
class FakeManager {
  calls: unknown[][] = [];
  getScene(): null {
    return null;
  }
  getActiveEditor(): null {
    return null;
  }
  notifyDeactivated(editor: unknown): void {
    this.calls.push(["notifyDeactivated", editor]);
  }
  blockEditorUpdate(): void {
    this.calls.push(["block"]);
  }
  releaseEditorUpdate(): void {
    this.calls.push(["release"]);
  }
  preparePermanentChange(): void {
    this.calls.push(["prepare"]);
  }
  beginTransaction(): void {
    this.calls.push(["begin"]);
  }
  commitTransaction(name: unknown, data: unknown): void {
    this.calls.push(["commit", name, data]);
  }
  handleEditorPartUpdate(part: unknown): void {
    this.calls.push(["partUpdate", part]);
  }
  updateActiveEditorCursor(): void {}
}

/**
 * A 200 x 120 rectangle at (100, 100) whose only fill holds `gradient`,
 * like the parity fixture gradientRect.
 */
function gradientRect(gradient: Gradient): { rect: Rectangle; fill: FillPaintLayer } {
  const rect = new Rectangle(100, 100, 200, 120);
  const fill = new FillPaintLayer();
  fill.setProperty("_pt", gradient);
  (rect.getPaintLayers() as NonNullable<ReturnType<Rectangle["getPaintLayers"]>>).appendChild(fill);
  return { rect, fill };
}

interface Setup<E extends GradientStyleEditor> {
  editor: E;
  manager: FakeManager;
  rect: Rectangle;
  fill: FillPaintLayer;
  parent: RectangleEditor;
}

/** An active gradient editor of the rectangle's fill under its rectangle editor. */
function activeEditor<E extends GradientStyleEditor>(editor: E, gradient: Gradient): Setup<E> {
  const { rect, fill } = gradientRect(gradient);
  const parent = new RectangleEditor(rect as never);
  const manager = new FakeManager();
  editor._manager = manager as unknown as StyleEdManager;
  const ok = editor.activate({
    parentEditor: parent,
    propName: "_pt",
    propHolder: fill as unknown as PropertiesNode,
  });
  expect(ok).toBe(true);
  return { editor, manager, rect, fill, parent };
}

const identity = new Transform();
const pt = (p: Point | null | undefined) => (p ? [p.getX(), p.getY()] : null);
const near = (p: Point | undefined, x: number, y: number) => {
  expect(p).toBeDefined();
  expect((p as Point).getX()).toBeCloseTo(x, 9);
  expect((p as Point).getY()).toBeCloseTo(y, 9);
};

/** A paint context whose canvas records every call. */
function recordingContext(): { context: PaintContext; calls: [string, unknown[]][] } {
  const calls: [string, unknown[]][] = [];
  const canvas = new Proxy(
    {},
    {
      get: (_target, name) => {
        if (name === "getTransform") return () => new Transform();
        return (...args: unknown[]) => {
          calls.push([String(name), args]);
          return undefined;
        };
      },
    },
  );
  const context = {
    canvas,
    selectionOutlineColor: new RGBColor([40, 128, 230]),
  } as unknown as PaintContext;
  return { context, calls };
}

// paintAnnotation draws its handle images on canvases.
let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());

afterEach(() => {
  Platform.modifiers.metaKey = false;
});

describe("GStyleEditor", () => {
  it("attaches to a shape editor and selects itself", () => {
    const { editor, parent } = activeEditor(new LinearGradientEditor(), new LinearGradient());
    expect(editor.getParentEditor()).toBe(parent);
    expect(parent.getEditors()).toContain(editor);
    expect(editor.hasFlag(BaseEditor.Flag.Selected)).toBe(true);
    expect(editor.isDeactivatable()).toBe(true);
    expect(editor.getCursor()).toBe(null);
  });

  it("refuses a parent that isn't a shape, page, scene or group editor", () => {
    const { fill } = gradientRect(new LinearGradient());
    const editor = new LinearGradientEditor();
    editor._manager = new FakeManager() as unknown as StyleEdManager;
    expect(
      editor.activate({
        parentEditor: new BaseEditor(),
        propName: "_pt",
        propHolder: fill as unknown as PropertiesNode,
      }),
    ).toBe(false);
    expect(editor.getParentEditor()).toBe(null);
  });

  it("detaches, clears the part selection and tells the manager on deactivate", () => {
    const { editor, manager, parent } = activeEditor(
      new LinearGradientEditor(),
      new LinearGradient(),
    );
    editor.updatePartSelection(false, [{ type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: 0 }]);
    expect(editor.getPartSelection()).not.toBe(null);
    editor.deactivate();
    expect(parent.getEditors()).not.toContain(editor);
    expect(editor.hasFlag(BaseEditor.Flag.Selected)).toBe(false);
    expect(editor.getPartSelection()).toBe(null);
    expect(manager.calls.some((c) => c[0] === "notifyDeactivated" && c[1] === editor)).toBe(true);
    // deactivate passes noEvent, so no part update reaches the manager.
    expect(manager.calls.filter((c) => c[0] === "partUpdate").length).toBe(1);
    expect(editor.getEditObj()).toBe(null);
  });

  it("blocks editor updates while a part moves and releases them on apply", () => {
    const { editor, manager } = activeEditor(new LinearGradientEditor(), new LinearGradient());
    const part = { type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: 1 };
    editor.movePart(part, null, new Point(300, 160), identity, null, false, false);
    expect(manager.calls.at(-1)).toEqual(["block"]);
    editor.applyPartMove(part, null);
    const names = manager.calls.map((c) => c[0]);
    expect(names.slice(-2)).toEqual(["prepare", "release"]);
  });
});

describe("GGradientStyleEditor", () => {
  it("only activates for a gradient", () => {
    const { fill } = gradientRect(new LinearGradient());
    fill.setProperty("_pt", new RGBColor([1, 2, 3]));
    const editor = new LinearGradientEditor();
    editor._manager = new FakeManager() as unknown as StyleEdManager;
    expect(
      editor.activate({
        parentEditor: new RectangleEditor(fill.getParent()?.getParent() as never),
        propName: "_pt",
        propHolder: fill as unknown as PropertiesNode,
      }),
    ).toBe(false);
  });

  it("edits a clone of the gradient and knows when it changed", () => {
    const gradient = new LinearGradient();
    const { editor, fill, parent } = activeEditor(new LinearGradientEditor(), gradient);
    expect(editor.getEditObj()).not.toBe(gradient);
    const activation = {
      parentEditor: parent,
      propName: "_pt",
      propHolder: fill as unknown as PropertiesNode,
    };
    expect(editor.validateAlreadyActive(activation)).toBe(true);
    const changed = new LinearGradient(null, 2);
    fill.setProperty("_pt", changed);
    expect(editor.validateAlreadyActive(activation)).toBe(false);
  });

  it("interpolates the colour and opacity of a new stop, rounding the channels", () => {
    const stops = [
      { position: 0, color: new RGBColor([0, 0, 0]), opacity: 1 },
      { position: 0.8, color: new RGBColor([255, 100, 10]), opacity: 0.2 },
    ];
    const { editor } = activeEditor(new LinearGradientEditor(), new LinearGradient(stops));
    const stop = editor._prepareNewStop(0.3);
    // 0.3 of 0..0.8 is 0.375 of the way; 100 * 0.37499999999999994
    // rounds down (old app: [96, 37, 4]).
    expect(stop.color.getValue()).toEqual([96, 37, 4]);
    expect(stop.opacity).toBeCloseTo(1 * 0.625 + 0.2 * 0.375, 12);
    // Past the last stop: the last stop's colour.
    expect(editor._prepareNewStop(0.9).color.getValue()).toEqual([255, 100, 10]);
    expect(editor._prepareNewStop(0.9).opacity).toBe(0.2);
  });

  it("adds a stop where the line is clicked, in one transaction, and selects it", () => {
    const { editor, manager, fill } = activeEditor(
      new LinearGradientEditor(),
      new LinearGradient(),
    );
    const plus: PlusStopPartId = { type: GradientStyleEditor.PLUS_STOP_PART_ID, pos: 0.25 };
    const result = editor.updatePartSelection(false, [plus]) as PartInfo;
    const saved = fill.getProperty("_pt") as LinearGradient;
    expect(saved.getStops().map((s) => s.position)).toEqual([0, 0.25, 1]);
    expect(saved.getStops()[1]?.color.getValue()).toEqual([191, 191, 191]);
    expect((result.id as StopPartId).idx).toBe(1);
    expect(editor.getPartSelection()).toEqual([result.id]);
    const names = manager.calls.map((c) => c[0]);
    expect(names).toEqual(["block", "begin", "commit", "release", "partUpdate", "partUpdate"]);
    const commit = manager.calls[2] as unknown[];
    expect(commit[1]).toBe("Add Gradient Stop");
    expect(commit[2]).toEqual({ chooserOn: true, fillLayerIndex: 0 });
    expect(editor.getEditorData()).toEqual({
      chooserOn: true,
      fillLayerIndex: 0,
      activeStopIdx: 1,
    });
  });

  it("reports a border layer's index", () => {
    const { rect } = gradientRect(new LinearGradient());
    const border = new BorderPaintLayer();
    border.setProperty("_pt", new LinearGradient());
    (rect.getPaintLayers() as NonNullable<ReturnType<Rectangle["getPaintLayers"]>>).appendChild(
      border,
    );
    const editor = new LinearGradientEditor();
    editor._manager = new FakeManager() as unknown as StyleEdManager;
    editor.activate({
      parentEditor: new RectangleEditor(rect as never),
      propName: "_pt",
      propHolder: border as unknown as PropertiesNode,
    });
    expect(editor.getEditorData()).toEqual({ chooserOn: true, borderLayerIndex: 1 });
  });

  it("compares stop part ids by index and add-stop ids by position", () => {
    const editor = new LinearGradientEditor();
    const stop = GradientStyleEditor.STOP_HANDLE_PART_ID;
    const plus = GradientStyleEditor.PLUS_STOP_PART_ID;
    expect(editor._partIdAreEqual({ type: stop, idx: 1 }, { type: stop, idx: 1 })).toBe(true);
    expect(editor._partIdAreEqual({ type: stop, idx: 1 }, { type: stop, idx: 2 })).toBe(false);
    expect(editor._partIdAreEqual({ type: plus, pos: 0.5 }, { type: plus, pos: 0.5 })).toBe(true);
    expect(editor._partIdAreEqual({ type: stop, idx: 1 }, { type: plus, idx: 1 })).toBe(false);
    expect(editor._partIdAreEqual("a", "a")).toBe(true);
    expect(editor._partIdAreEqual("a", "b")).toBe(false);
    expect(editor.getCursor({ type: stop, idx: 0 })).toBe(Cursor.SelectDot);
    expect(editor.getCursor({ type: plus, pos: 0 })).toBe(Cursor.SelectPlus);
    expect(editor.getCursor("x")).toBe(null);
  });

  it("aligns handle points to the pixel grid for odd stroke widths", () => {
    expect(pt(GradientStyleEditor.alignHandlePoint(new Point(10.7, 3.2), 1))).toEqual([10.5, 3.5]);
    expect(pt(GradientStyleEditor.alignHandlePoint(new Point(10.7, 3.2), 2))).toEqual([10, 3]);
  });

  it("snaps to the box corners, edge centers and center within 5 px", () => {
    const { editor } = activeEditor(new LinearGradientEditor(), new LinearGradient());
    editor._snapPoints = editor._getSnapPoints(identity);
    expect(editor._snapPoints.map(pt)).toEqual([
      [100, 100],
      [300, 100],
      [100, 220],
      [300, 220],
      [300, 160],
      [100, 160],
      [200, 100],
      [200, 220],
      [200, 160],
    ]);
    expect(pt(editor._snapPosition(new Point(297, 217)))).toEqual([300, 220]);
    expect(pt(editor._snapPosition(new Point(296, 216)))).toEqual([296, 216]);
    expect(StyleEditor.options.snapDistance).toBe(5);
  });

  it("follows a stop to its new index when moving it past another one", () => {
    const stops = [
      { position: 0, color: new RGBColor([0, 0, 0]), opacity: 1 },
      { position: 0.2, color: new RGBColor([255, 0, 0]), opacity: 1 },
      { position: 0.6, color: new RGBColor([0, 255, 0]), opacity: 1 },
      { position: 1, color: new RGBColor([255, 255, 255]), opacity: 1 },
    ];
    const { editor, fill } = activeEditor(new LinearGradientEditor(), new LinearGradient(stops));
    const part = { type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: 1 };
    editor.updatePartSelection(false, [part]);
    // x 260 is 0.8 along the line from 100 to 300.
    editor.movePart(part, null, new Point(260, 160), identity, null, false, false);
    expect(part.idx).toBe(2);
    expect((editor.getPartSelection()?.[0] as StopPartId).idx).toBe(2);
    // A drag writes the gradient as a temporary property.
    const preview = fill.getProperty("_pt", false, null, true) as LinearGradient;
    expect(preview.getStops().map((s) => Math.round(s.position * 1e9) / 1e9)).toEqual([
      0, 0.6, 0.8, 1,
    ]);
    expect(preview.getStops()[2]?.color.getValue()).toEqual([255, 0, 0]);
    const saved = fill.getProperty("_pt") as LinearGradient;
    expect(saved.getStops().map((s) => s.position)).toEqual([0, 0.2, 0.6, 1]);
  });
});

describe("GLinearGradientEditor", () => {
  it("puts the stops on the line through the box and hits them", () => {
    const { editor } = activeEditor(new LinearGradientEditor(), new LinearGradient());
    expect(editor._getAnnotationPoints().map(pt)).toEqual([
      [100, 160],
      [300, 160],
    ]);
    const hit = editor.getPartInfoAt(new Point(301, 161), identity, null, 4) as PartInfo;
    expect(hit.id).toEqual({ type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: 1 });
    expect(hit.selectable).toBe(true);
    const plus = editor.getPartInfoAt(new Point(150, 162), identity, null, 4) as PartInfo;
    expect(plus.id).toEqual({ type: GradientStyleEditor.PLUS_STOP_PART_ID, pos: 0.25 });
    expect(editor.getPartInfoAt(new Point(150, 170), identity, null, 4)).toBe(null);
  });

  it("slides a middle stop along the line, clamped to the end stops", () => {
    const stops = [
      { position: 0.1, color: new RGBColor([0, 0, 0]), opacity: 1 },
      { position: 0.5, color: new RGBColor([255, 0, 0]), opacity: 1 },
      { position: 0.9, color: new RGBColor([255, 255, 255]), opacity: 1 },
    ];
    const { editor, fill } = activeEditor(new LinearGradientEditor(), new LinearGradient(stops));
    const part = { type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: 1 };
    editor.movePart(part, null, new Point(240, 190), identity, null, false, false);
    const temporary = () => fill.getProperty("_pt", false, null, true) as LinearGradient;
    expect(temporary().getStops()[1]?.position).toBeCloseTo(0.7, 12);
    editor.movePart(part, null, new Point(400, 175), identity, null, false, false);
    expect(temporary().getStops()[1]?.position).toBeCloseTo(0.9, 12);
    expect((fill.getProperty("_pt") as LinearGradient).getStops()[1]?.position).toBe(0.5);
  });

  it("moves an end stop, snapping to the box unless Meta is held, and bakes it on apply", () => {
    const { editor, fill } = activeEditor(new LinearGradientEditor(), new LinearGradient());
    const part = { type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: 1 };
    editor.movePart(part, null, new Point(298, 218), identity, null, false, false);
    near(editor._getAnnotationPoints()[1], 300, 220);
    editor.applyPartMove(part, null);
    const saved = fill.getProperty("_pt") as LinearGradient;
    expect(saved.getTransform()).toBe(null);
    expect(saved._angle).toBeCloseTo(Math.atan2(60 / 120, 1), 12);
    expect(saved.getScale()).toBeCloseTo(Math.sqrt(1 + 0.25), 12);
    near(editor._getAnnotationPoints()[1], 300, 220);

    Platform.modifiers.metaKey = true;
    const other = new LinearGradientEditor();
    const second = activeEditor(other, new LinearGradient());
    other.movePart(part, null, new Point(298, 218), identity, null, false, false);
    near(other._getAnnotationPoints()[1], 298, 218);
    expect(second.editor._snapPoints).toBe(null);
  });

  it("moves the whole gradient with the first stop", () => {
    const { editor } = activeEditor(new LinearGradientEditor(), new LinearGradient());
    const part = { type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: 0 };
    editor.movePart(part, null, new Point(120, 140), identity, null, false, false);
    const points = editor._getAnnotationPoints();
    near(points[0], 120, 140);
    near(points[1], 300, 160);
  });

  it("constrains the end to 45 degree steps with Shift", () => {
    const { editor } = activeEditor(new LinearGradientEditor(), new LinearGradient());
    const part = { type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: 1 };
    editor.movePart(part, null, new Point(273, 233), identity, null, true, false);
    const [start, end] = editor._getAnnotationPoints() as [Point, Point];
    const angle = Math.atan2(end.getY() - start.getY(), end.getX() - start.getX());
    expect(angle / (Math.PI / 4)).toBeCloseTo(Math.round(angle / (Math.PI / 4)), 9);
    expect(EditorOptions.cursorConstraint).toBe(0);
  });

  it("paints the line, the stops and the selected stop big in its colour", () => {
    const { editor } = activeEditor(new LinearGradientEditor(), new LinearGradient());
    editor.updatePartSelection(false, [{ type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: 1 }]);
    const { context, calls } = recordingContext();
    editor.paint(identity, context);
    const names = calls.map((c) => c[0]);
    expect(names.slice(0, 3)).toEqual(["putVertices", "strokeVertices", "strokeVertices"]);
    // The shadow stroke at 60 % opacity, then the white line.
    expect(calls[1]?.[1][6]).toBe(0.6);
    expect(calls[2]?.[1][0]).toBe(RGBColor.WHITE);
    expect(calls.length).toBeGreaterThan(3);
  });
});

describe("GRadialGradientEditor", () => {
  it("finds the extra, move, add-stop and stop parts", () => {
    const { editor } = activeEditor(new RadialGradientEditor(), new RadialGradient());
    const at = (x: number, y: number) =>
      editor.getPartInfoAt(new Point(x, y), identity, null, 4) as PartInfo | null;
    expect(at(200, 100)?.id).toBe(RadialGradientEditor.EXTRA_HANDLE_PART_ID);
    expect(at(200, 100)?.selectable).toBe(true);
    const move = at(200, 130) as PartInfo;
    expect(move.id).toBe(RadialGradientEditor.MOVE_HANDLE_PART_ID);
    expect(pt((move.data as { point: Point }).point)).toEqual([200, 130]);
    expect(at(250, 160)?.id).toEqual({ type: GradientStyleEditor.PLUS_STOP_PART_ID, pos: 0.5 });
    // The last stop sits on the end handle and wins.
    expect(at(300, 160)?.id).toEqual({ type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: 1 });
    expect(editor.getCursor(RadialGradientEditor.MOVE_HANDLE_PART_ID)).toBe(Cursor.SelectCross);
  });

  it("switches the leading axis on the extra handle", () => {
    const { editor } = activeEditor(new RadialGradientEditor(), new RadialGradient());
    const result = editor.updatePartSelection(false, [
      RadialGradientEditor.EXTRA_HANDLE_PART_ID,
    ]) as PartInfo;
    expect(editor._xLeading).toBe(false);
    expect(result.id).toEqual({ type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: 1 });
    expect(editor._getAnnotationPoints().map(pt)).toEqual([
      [200, 160],
      [200, 100],
    ]);
  });

  it("returns an end handle without a point when the last stop isn't at 1", () => {
    const stops = [
      { position: 0, color: new RGBColor([0, 0, 0]), opacity: 1 },
      { position: 0.7, color: new RGBColor([255, 255, 255]), opacity: 1 },
    ];
    const { editor } = activeEditor(new RadialGradientEditor(), new RadialGradient(stops));
    const result = editor.updatePartSelection(false, [
      RadialGradientEditor.EXTRA_HANDLE_PART_ID,
    ]) as PartInfo;
    expect(result.id).toBe(RadialGradientEditor.END_HANDLE_PART_ID);
    expect((result.data as { point?: unknown }).point).toBe(undefined);
  });

  it("scales the leading axis with the end handle and translates with the move handle", () => {
    const { editor, fill } = activeEditor(new RadialGradientEditor(), new RadialGradient());
    editor.movePart(
      RadialGradientEditor.END_HANDLE_PART_ID,
      null,
      new Point(330, 160),
      identity,
      null,
      false,
      false,
    );
    near(editor._getPivotPoints()[1], 330, 160);
    near(editor._getPivotPoints()[2], 200, 100);
    expect((fill.getProperty("_pt", false, null, true) as RadialGradient).getTransform()).not.toBe(
      null,
    );
    expect((fill.getProperty("_pt") as RadialGradient).getTransform()).toBe(null);

    const second = activeEditor(new RadialGradientEditor(), new RadialGradient());
    const move = second.editor.getPartInfoAt(new Point(200, 130), identity, null, 4) as PartInfo;
    second.editor.movePart(move.id, move.data, new Point(230, 150), identity, null, false, false);
    near(second.editor._getPivotPoints()[0], 230, 180);
  });

  it("keeps the focal point inside the radius", () => {
    const stops = [
      { position: 0.2, color: new RGBColor([0, 0, 0]), opacity: 1 },
      { position: 1, color: new RGBColor([255, 255, 255]), opacity: 1 },
    ];
    const { editor } = activeEditor(new RadialGradientEditor(), new RadialGradient(stops));
    editor.movePart(
      RadialGradientEditor.START_HANDLE_PART_ID,
      null,
      new Point(400, 160),
      identity,
      null,
      false,
      false,
    );
    const gradient = editor.getEditObj() as RadialGradient;
    expect(GMath.ptDist(gradient._fx, gradient._fy, gradient._cx, gradient._cy)).toBeLessThan(0.5);
    // t = radius / distance - 0.001 along center to pointer.
    expect(gradient._fx).toBeCloseTo(0.999, 12);
  });

  it("paints a cross at an end that has no stop", () => {
    const stops = [
      { position: 0.2, color: new RGBColor([0, 0, 0]), opacity: 1 },
      { position: 1, color: new RGBColor([255, 255, 255]), opacity: 1 },
    ];
    const withCross = activeEditor(new RadialGradientEditor(), new RadialGradient(stops));
    const a = recordingContext();
    withCross.editor.paint(identity, a.context);
    const plain = activeEditor(new RadialGradientEditor(), new RadialGradient());
    const b = recordingContext();
    plain.editor.paint(identity, b.context);
    const lines = (calls: [string, unknown[]][]) =>
      calls.filter((c) => c[0] === "strokeLine").length;
    expect(lines(a.calls) - lines(b.calls)).toBe(4);
  });
});

describe("GAngularGradientEditor", () => {
  it("finds the center, end and add-stop parts", () => {
    const { editor } = activeEditor(new AngularGradientEditor(), new AngularGradient());
    const at = (x: number, y: number) =>
      editor.getPartInfoAt(new Point(x, y), identity, null, 4) as PartInfo | null;
    expect(at(200, 160)?.id).toBe(AngularGradientEditor.CENTER_HANDLE_PART_ID);
    expect(editor.getCursor(AngularGradientEditor.CENTER_HANDLE_PART_ID)).toBe(Cursor.SelectCross);
    // Both stops sit on the end handle (a0 = -PI points right); the
    // last one hit wins.
    expect(at(300, 160)?.id).toEqual({ type: GradientStyleEditor.STOP_HANDLE_PART_ID, idx: 1 });
    const plus = at(100, 160) as PartInfo;
    expect((plus.id as PlusStopPartId).type).toBe(GradientStyleEditor.PLUS_STOP_PART_ID);
    expect((plus.id as PlusStopPartId).pos).toBeCloseTo(0.5, 9);
  });

  it("moves the center and turns the start angle", () => {
    const { editor, fill } = activeEditor(new AngularGradientEditor(), new AngularGradient());
    editor.movePart(
      AngularGradientEditor.CENTER_HANDLE_PART_ID,
      null,
      new Point(297, 103),
      identity,
      null,
      false,
      false,
    );
    const moved = fill.getProperty("_pt", false, null, true) as AngularGradient;
    // Snapped to the top-right corner.
    expect(moved._fx).toBeCloseTo(1, 12);
    expect(moved._fy).toBeCloseTo(0, 12);
    editor.movePart(
      AngularGradientEditor.END_HANDLE_PART_ID,
      null,
      new Point(300, 220),
      identity,
      null,
      false,
      false,
    );
    expect((fill.getProperty("_pt", false, null, true) as AngularGradient)._a0).toBeCloseTo(
      Math.atan2(-1, -0),
      12,
    );
    expect((fill.getProperty("_pt") as AngularGradient)._a0).toBe(-Math.PI);
  });

  it("grows its bbox by the big handle size", () => {
    const { editor } = activeEditor(new AngularGradientEditor(), new AngularGradient());
    const box = editor.getCustomBBox(identity);
    // Recorded from the old app.
    expect(box && [box.getX(), box.getY(), box.getWidth(), box.getHeight()]).toEqual([
      87, 87, 242.5, 146,
    ]);
    expect(EditorOptions.annotationHandles.gradient.sizeBig).toBe(12);
  });
});
