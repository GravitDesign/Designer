import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RGBColor } from "../engine/color/rgb-color.ts";
import { Point } from "../engine/math/point.ts";
import { Transform } from "../engine/math/transform.ts";
import { installFakeCanvas } from "../engine/paint/testing/fake-canvas.ts";
import type { Page } from "../engine/scene/page.ts";
import { Rectangle } from "../engine/scene/rectangle.ts";
import { Scene } from "../engine/scene/scene.ts";
import { FillPaintLayer } from "../engine/style/fill-paint-layer.ts";
import { LinearGradient } from "../engine/style/linear-gradient.ts";
import { RadialGradient } from "../engine/style/radial-gradient.ts";
import { Editor } from "./editor.ts";
import { EditorOptions } from "./editor-options.ts";
import { EditorWorkspace } from "./editor-workspace.ts";
import { ElementEditor } from "./element-editors/element-editor.ts";
import { LinearGradientEditor } from "./element-editors/linear-gradient-editor.ts";
import { PageEditor } from "./element-editors/page-editor.ts";
import { RadialGradientEditor } from "./element-editors/radial-gradient-editor.ts";
import "./element-editors/rectangle-editor.ts";
import "./element-editors/scene-editor.ts";
import "./element-editors/layer-editor.ts";
import {
  StyleEdManager,
  StyleEditorChangedEvent,
  StyleEditorEvent,
  type StyleEdView,
} from "./style-ed-manager.ts";

interface Setup {
  scene: Scene;
  editor: Editor;
  rect: Rectangle;
  fill: FillPaintLayer;
  manager: StyleEdManager;
  view: StyleEdView & { cursors: unknown[]; worldTransformPages: unknown[] };
}

/**
 * A scene with a 200 x 120 rectangle whose only fill is plain red, and an
 * activated manager over a fake view of it.
 */
function setup(): Setup {
  const scene = new Scene(new EditorWorkspace());
  const editor = new Editor(scene);
  const rect = new Rectangle(100, 100, 200, 120);
  const fill = new FillPaintLayer();
  fill.setProperty("_pt", new RGBColor([255, 0, 0]));
  (rect.getPaintLayers() as NonNullable<ReturnType<Rectangle["getPaintLayers"]>>).appendChild(fill);
  editor.insertElements([rect], true);
  const manager = new StyleEdManager();
  const cursors: unknown[] = [];
  const worldTransformPages: unknown[] = [];
  const view = {
    cursors,
    worldTransformPages,
    getScene: () => scene,
    getEditor: () => editor,
    _convertClientPositionFromMousePosition: (event: MouseEvent) =>
      new Point((event as unknown as { clientX: number }).clientX - 10, 7),
    getWorldTransform: (page: unknown) => {
      worldTransformPages.push(page);
      return new Transform(2, 0, 0, 2, 0, 0);
    },
    getViewConfiguration: () => ({ multiPageView: "multi" }),
    setCursor: (cursor: unknown) => cursors.push(cursor),
  };
  manager.activate(view);
  return { scene, editor, rect, fill, manager, view };
}

let uninstallCanvas: () => void;
beforeEach(() => {
  uninstallCanvas = installFakeCanvas();
});
afterEach(() => uninstallCanvas());

describe("StyleEdManager.updateEditor routing", () => {
  it("opens the linear gradient editor under the rectangle's editor when a fill gets a gradient", () => {
    const { rect, fill, manager } = setup();
    expect(manager.getActiveEditor()).toBeNull();
    fill.setProperty("_pt", new LinearGradient());
    const active = manager.getActiveEditor() as LinearGradientEditor;
    expect(active).toBe(manager.getEditor(LinearGradientEditor));
    // The paint layer is no stylable; its owner's editor is the parent.
    expect(active.getParentEditor()).toBe(ElementEditor.getEditor(rect));
    expect(active._propHolder).toBe(fill);
    expect(active._propName).toBe("_pt");
  });

  it("switches to the radial editor without an EditorChangedEvent (updateEditor deactivates first)", () => {
    const { fill, manager } = setup();
    const changes: [unknown, unknown][] = [];
    manager.addEventListener(StyleEditorChangedEvent, (event) =>
      changes.push([event.previousEditor, event.newEditor]),
    );
    fill.setProperty("_pt", new LinearGradient());
    const linear = manager.getActiveEditor();
    fill.setProperty("_pt", new RadialGradient());
    expect(manager.getActiveEditor()).toBe(manager.getEditor(RadialGradientEditor));
    expect((linear as LinearGradientEditor).getParentEditor()).toBeNull();
    // See "Style editor switch never fires EditorChangedEvent" in QUESTIONS.md.
    expect(changes).toEqual([]);
  });

  it("closes the editor when the fill goes back to a colour", () => {
    const { fill, manager } = setup();
    fill.setProperty("_pt", new LinearGradient());
    const linear = manager.getActiveEditor() as LinearGradientEditor;
    fill.setProperty("_pt", new RGBColor([0, 0, 255]));
    expect(manager.getActiveEditor()).toBeNull();
    expect(linear.getParentEditor()).toBeNull();
  });

  it("ignores changes of non-pattern properties and nodes without pattern properties", () => {
    const { rect, fill, manager } = setup();
    fill.setProperty("_pt", new LinearGradient());
    const active = manager.getActiveEditor();
    fill.setProperty("_op", 0.5);
    rect.setProperty("name", "renamed");
    expect(manager.getActiveEditor()).toBe(active);
  });

  it("attaches to the page editor for a page background gradient", () => {
    const { scene, manager } = setup();
    const page = scene.getActivePage() as Page;
    page.setProperty("bck", new LinearGradient());
    const active = manager.getActiveEditor() as LinearGradientEditor;
    expect(active).toBe(manager.getEditor(LinearGradientEditor));
    expect(active.getParentEditor()).toBeInstanceOf(PageEditor);
    expect(active.getParentEditor()).toBe(ElementEditor.getEditor(page));
  });

  it("opens nothing for a paint layer whose owner is not in a scene", () => {
    const { manager } = setup();
    const loose = new Rectangle(0, 0, 10, 10);
    const fill = new FillPaintLayer();
    fill.setProperty("_pt", new LinearGradient());
    (loose.getPaintLayers() as NonNullable<ReturnType<Rectangle["getPaintLayers"]>>).appendChild(
      fill,
    );
    manager.updateEditor(fill, "_pt");
    expect(manager.getActiveEditor()).toBeNull();
  });

  it("does not reopen editors for changes made while handleEditorPartUpdate runs", () => {
    const { fill, manager } = setup();
    fill.setProperty("_pt", new LinearGradient());
    const linear = manager.getActiveEditor();
    const events: unknown[] = [];
    const listener = (event: StyleEditorEvent) => {
      events.push([event.type, event.data, manager._editorUpdateBlocker]);
      fill.setProperty("_pt", new RadialGradient());
    };
    manager.addEventListener(StyleEditorEvent, listener);
    manager.handleEditorPartUpdate({ idx: 3 });
    expect(events).toEqual([[StyleEdManager.EditorEventType.ActivePointChange, { idx: 3 }, true]]);
    expect(manager.getActiveEditor()).toBe(linear);
    expect(manager._editorUpdateBlocker).toBe(false);
    // Once released, the next change routes again.
    manager.removeEventListener(StyleEditorEvent, listener);
    fill.setProperty("_pt", new RadialGradient(null, 2));
    expect(manager.getActiveEditor()).toBe(manager.getEditor(RadialGradientEditor));
  });

  it("does not block anything when nobody listens to editor events", () => {
    const { manager } = setup();
    const block = vi.spyOn(manager, "blockEditorUpdate");
    manager.handleEditorPartUpdate(null);
    expect(block).not.toHaveBeenCalled();
  });

  it("stops listening to the scene when deactivated", () => {
    const { fill, manager } = setup();
    fill.setProperty("_pt", new LinearGradient());
    const linear = manager.getActiveEditor() as LinearGradientEditor;
    manager.deactivate();
    expect(linear.getParentEditor()).toBeNull();
    fill.setProperty("_pt", new RadialGradient());
    expect(manager.getActiveEditor()).toBeNull();
    expect(manager.getEditor(RadialGradientEditor)?.getParentEditor()).toBeNull();
  });
});

describe("StyleEdManager._activateEditor", () => {
  /** A scene with the linear editor active on the fill, and the fill's activation. */
  function withLinearActive() {
    const setup_ = setup();
    setup_.fill.setProperty("_pt", new LinearGradient());
    const linear = setup_.manager.getActiveEditor() as LinearGradientEditor;
    const activation = {
      parentEditor: ElementEditor.getEditor(setup_.rect),
      propName: "_pt",
      propHolder: setup_.fill,
    };
    return { ...setup_, linear, activation };
  }

  it("fires EditorChangedEvent(previous, new) when called with an editor still active", () => {
    const { fill, manager, linear, activation } = withLinearActive();
    const changes: [unknown, unknown][] = [];
    manager.addEventListener(StyleEditorChangedEvent, (event) =>
      changes.push([event.previousEditor, event.newEditor]),
    );
    manager.blockEditorUpdate();
    fill.setProperty("_pt", new RadialGradient());
    manager.releaseEditorUpdate();
    expect(manager.getActiveEditor()).toBe(linear);
    expect(manager._activateEditor(RadialGradientEditor, activation)).toBe(true);
    const radial = manager.getEditor(RadialGradientEditor);
    expect(manager.getActiveEditor()).toBe(radial);
    expect(linear.getParentEditor()).toBeNull();
    expect(changes).toEqual([[linear, radial]]);
  });

  it("keeps the active editor when it is already active for the same gradient", () => {
    const { manager, linear, activation } = withLinearActive();
    const parent = linear.getParentEditor();
    const deactivate = vi.spyOn(linear, "deactivate");
    expect(manager._activateEditor(LinearGradientEditor, activation)).toBe(false);
    expect(deactivate).not.toHaveBeenCalled();
    expect(manager.getActiveEditor()).toBe(linear);
    expect(linear.getParentEditor()).toBe(parent);
  });

  it("re-activates the same editor when the gradient changed", () => {
    const { fill, manager, linear, activation } = withLinearActive();
    manager.blockEditorUpdate();
    fill.setProperty("_pt", new LinearGradient(null, 2));
    manager.releaseEditorUpdate();
    const deactivate = vi.spyOn(linear, "deactivate");
    expect(manager._activateEditor(linear, activation)).toBe(true);
    expect(deactivate).toHaveBeenCalled();
    expect(manager.getActiveEditor()).toBe(linear);
  });

  it("refuses while the active editor can't be deactivated", () => {
    const { manager, linear, activation } = withLinearActive();
    vi.spyOn(linear, "isDeactivatable").mockReturnValue(false);
    expect(manager._activateEditor(RadialGradientEditor, activation)).toBe(false);
    expect(manager.getActiveEditor()).toBe(linear);
  });

  it("closes the active editor for a class it doesn't know", () => {
    const { manager, linear, activation } = withLinearActive();
    expect(manager._activateEditor(Rectangle, activation)).toBe(false);
    expect(manager.getActiveEditor()).toBeNull();
    expect(linear.getParentEditor()).toBeNull();
  });

  it("does nothing while not activated", () => {
    const manager = new StyleEdManager();
    const activation = {
      parentEditor: null,
      propName: "_pt",
      propHolder: new FillPaintLayer(),
    };
    expect(manager._activateEditor(LinearGradientEditor, activation)).toBe(false);
  });
});

describe("StyleEdManager.getOverlayLock", () => {
  // Node has no DOM MouseEvent; getOverlayLock checks `instanceof MouseEvent`.
  class FakeMouseEvent {
    constructor(public clientX: number) {}
  }
  const globals = globalThis as unknown as Record<string, unknown>;
  let savedMouseEvent: unknown;
  beforeEach(() => {
    savedMouseEvent = globals.MouseEvent;
    globals.MouseEvent = FakeMouseEvent;
  });
  afterEach(() => {
    if (savedMouseEvent === undefined) Reflect.deleteProperty(globals, "MouseEvent");
    else globals.MouseEvent = savedMouseEvent;
  });

  it("hit-tests the active editor at the event's view position", () => {
    const { scene, fill, manager, view } = setup();
    fill.setProperty("_pt", new LinearGradient());
    const active = manager.getActiveEditor() as LinearGradientEditor;
    const calls: unknown[][] = [];
    let hit: unknown = { id: "stop" };
    vi.spyOn(active, "getPartInfoAt").mockImplementation((...args: unknown[]) => {
      calls.push(args);
      return hit as never;
    });
    const event = new FakeMouseEvent(25) as unknown as MouseEvent;
    expect(manager.getOverlayLock(event)).toBe(true);
    expect(calls).toHaveLength(1);
    const [position, transform, filter, distance, multiPage] = calls[0] as [
      Point,
      Transform,
      unknown,
      unknown,
      unknown,
    ];
    expect([position.getX(), position.getY()]).toEqual([15, 7]);
    expect(transform.getScaleFactor()).toBe(2);
    expect(view.worldTransformPages).toEqual([scene.getActivePage()]);
    expect(filter).toBeNull();
    expect(distance).toBe(EditorOptions.pickDistance);
    expect(multiPage).toBe("multi");
    // Without an event the last answer stays.
    hit = null;
    expect(manager.getOverlayLock()).toBe(true);
    expect(manager.getOverlayLock({ clientX: 25 })).toBe(true);
    expect(calls).toHaveLength(1);
    // A miss resets it.
    expect(manager.getOverlayLock(event)).toBe(false);
  });

  it("is reset when no editor is active", () => {
    const { manager } = setup();
    manager.setOverlayLock();
    expect(manager.getOverlayLock()).toBe(false);
  });
});

describe("StyleEdManager.updateActiveEditorCursor", () => {
  it("throws a TypeError with an active editor and a view (reads the never-set _activeTool)", () => {
    const { fill, manager, view } = setup();
    // No active editor: nothing happens.
    manager.updateActiveEditorCursor();
    fill.setProperty("_pt", new LinearGradient());
    const active = manager.getActiveEditor() as LinearGradientEditor;
    // BUGS-FIXED candidate "Style editor cursor update reads a missing tool".
    expect(() => manager.updateActiveEditorCursor()).toThrow(TypeError);
    // The style editor's updateCursor routes there when it is the active one.
    expect(() => active.updateCursor()).toThrow(TypeError);
    expect(view.cursors).toEqual([]);
    // An inactive registered editor doesn't call it.
    (manager.getEditor(RadialGradientEditor) as RadialGradientEditor).updateCursor();
  });
});
