import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Key } from "../../engine/core/key.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { Point } from "../../engine/math/point.ts";
import { EditorOptions } from "../editor-options.ts";
import { installFakeDom } from "../view/testing/fake-dom.ts";
import { EllipseTool } from "./ellipse-tool.ts";
import { FillTool } from "./fill-tool.ts";
import { HandTool } from "./hand-tool.ts";
import { PenTool } from "./pen-tool.ts";
import { PointerTool } from "./pointer-tool.ts";
import { SelectTool } from "./select-tool.ts";
import { RectangleTool } from "./rectangle-tool.ts";
import { SubSelectTool } from "./sub-select-tool.ts";
import { ToolChangedEvent, ToolManager } from "./tool-manager.ts";
import { clearModifiers, releaseTools, setModifiers, setupTools } from "./tool-testing.ts";
import { ZoomTool } from "./zoom-tool.ts";

let uninstall: () => void;
beforeEach(() => {
  uninstall = installFakeDom();
  vi.useFakeTimers();
});
afterEach(() => {
  releaseTools();
  clearModifiers();
  vi.useRealTimers();
  uninstall();
});

const name = (tool: unknown): string => String(tool).replace(/^\[Object (.*)\]$/, "$1");

function changes(manager: ToolManager): string[] {
  const log: string[] = [];
  manager.addEventListener(ToolChangedEvent, (event: ToolChangedEvent) => {
    log.push(`${name(event.previousTool)}>${name(event.newTool)}${event.light ? " light" : ""}`);
  });
  return log;
}

describe("ToolManager registry", () => {
  it("registers the thirty tools in the old order, the fill tool twice", () => {
    const manager = new ToolManager();
    const names: string[] = [];
    for (let i = 0; i < manager.getToolCount(); i++) names.push(name(manager.getTool(i)));
    expect(names).toEqual([
      "GPointerTool",
      "GSubSelectTool",
      "GLassoTool",
      "GLayerTool",
      "GLineTool",
      "GPenTool",
      "GBezigonTool",
      "GPathsGraphTool",
      "GFreehandTool",
      "GMagicTool",
      "GRectangleTool",
      "GEllipseTool",
      "GTriangleTool",
      "GPolygonTool",
      "GStarTool",
      "GSimpleShapeTool",
      "GTextTool",
      "GKnifeTool",
      "GFillTool",
      "GSliceTool",
      "GFillTool",
      "GHandTool",
      "GZoomTool",
      // The connector tool kept the pen's toString.
      "GPenTool",
      "GEllipseAnnotationTool",
      "GPencilAnnotationTool",
      "GRectangleAnnotationTool",
      "GArrowAnnotationTool",
      "GCommentAnnotationTool",
      "GHighlighterAnnotationTool",
    ]);
    // Lookups by class find the last registration of a class.
    expect(manager.indexOf(FillTool)).toBe(20);
    expect(manager.indexOf(PenTool)).toBe(5);
    expect(manager.getTool(RectangleTool)).toBe(manager.getTool(10));
    expect(manager.hasTool(ZoomTool)).toBe(true);
  });

  it("refuses to register a tool twice", () => {
    const manager = new ToolManager();
    expect(() => manager.addTool(manager.getTool(0) as never)).toThrow(
      "Tool is already registered",
    );
  });
});

describe("ToolManager switching", () => {
  it("activates tools on the view, with the tool's cursor and a ToolChangedEvent", () => {
    const { manager, view } = setupTools();
    const log = changes(manager);
    expect(manager.activateTool(PointerTool)).toBe(true);
    expect(manager.activateTool(RectangleTool)).toBe(true);
    expect(view.getCursor()).toBe("cross");
    expect(manager.activateTool(RectangleTool)).toBe(false);
    expect(log).toEqual(["null>GPointerTool", "GPointerTool>GRectangleTool"]);
    expect(manager.getOldTool()).toBe(manager.getTool(PointerTool));
  });

  it("can't leave a tool in the middle of a drag", () => {
    const { manager, input } = setupTools();
    manager.activateTool(RectangleTool);
    input.down(10, 10);
    input.drag(50, 50);
    expect(manager.activateTool(EllipseTool)).toBe(false);
    expect(name(manager.getActiveTool())).toBe("GRectangleTool");
    input.up(50, 50);
    expect(manager.activateTool(EllipseTool)).toBe(true);
  });

  it("notifyJobDone brings the default tool back on the next tick", () => {
    const { manager } = setupTools();
    manager.activateTool(RectangleTool);
    manager.notifyJobDone(manager.getActiveTool() as never);
    expect(name(manager.getActiveTool())).toBe("GRectangleTool");
    vi.advanceTimersByTime(0);
    expect(name(manager.getActiveTool())).toBe("GPointerTool");
    // The default tool itself never switches.
    manager.notifyJobDone(manager.getActiveTool() as never);
    vi.advanceTimersByTime(0);
    expect(name(manager.getActiveTool())).toBe("GPointerTool");
  });

  it("goes back to the last path tool, else the pen", () => {
    const { manager } = setupTools();
    manager.activateTool(PointerTool);
    manager.activateOldPathTool();
    expect(name(manager.getActiveTool())).toBe("GPenTool");
    manager.activateSubSelect();
    expect(manager.getActiveTool()).toBe(manager.getTool(SubSelectTool));
  });
});

describe("ToolManager spring-loaded keys", () => {
  it("a quick tap keeps the new tool, holding the key 450 ms or longer goes back", () => {
    const { manager } = setupTools();
    manager.activateTool(PointerTool);
    expect(manager.tempToolKeyActivate(EllipseTool)).toBe(true);
    expect(manager.getTemporaryActiveTool()).toBe(manager.getTool(PointerTool));
    vi.advanceTimersByTime(100);
    expect(manager.tempToolKeyRelease(EllipseTool, 450)).toBe(true);
    expect(name(manager.getActiveTool())).toBe("GEllipseTool");
    expect(manager.getTemporaryActiveTool()).toBeNull();

    manager.tempToolKeyActivate(RectangleTool);
    vi.advanceTimersByTime(449);
    manager.tempToolKeyRelease(RectangleTool, 450);
    expect(name(manager.getActiveTool())).toBe("GRectangleTool");

    manager.tempToolKeyActivate(EllipseTool);
    vi.advanceTimersByTime(450);
    manager.tempToolKeyRelease(EllipseTool, 450);
    expect(name(manager.getActiveTool())).toBe("GRectangleTool");
  });

  it("a held hand key is a light switch; a tap then deactivates the kept tool", () => {
    const { manager } = setupTools();
    manager.activateTool(ZoomTool);
    const zoom = manager.getActiveTool() as ZoomTool;
    const log = changes(manager);
    manager.tempToolKeyActivate(HandTool);
    // Light: the zoom tool keeps its view.
    expect(zoom._view).not.toBeNull();
    vi.advanceTimersByTime(10);
    manager.tempToolKeyRelease(HandTool, 450);
    expect(name(manager.getActiveTool())).toBe("GHandTool");
    expect(zoom._view).toBeNull();
    expect(log).toEqual(["GZoomTool>GHandTool light", "GZoomTool>GHandTool"]);
  });

  it("other tools ignore their key while a temporary tool is active", () => {
    const { manager } = setupTools();
    manager.activateTool(PointerTool);
    manager.tempToolKeyActivate(EllipseTool);
    expect(manager.activateTool(RectangleTool)).toBe(false);
    expect(manager.activateTool(RectangleTool, null, true)).toBe(true);
    expect(manager.getTemporaryActiveTool()).toBeNull();
  });
});

describe("ToolManager Space and Meta", () => {
  it("Space holds the hand tool, Meta then the zoom tool; releasing returns", () => {
    const { manager } = setupTools();
    manager.activateTool(RectangleTool);
    const log = changes(manager);
    setModifiers({ spaceKey: true });
    expect(name(manager.getActiveTool())).toBe("GHandTool");
    expect(name(manager.getTemporaryActiveTool())).toBe("GRectangleTool");
    setModifiers({ metaKey: true });
    expect(name(manager.getActiveTool())).toBe("GZoomTool");
    setModifiers({ metaKey: false, spaceKey: false });
    expect(name(manager.getActiveTool())).toBe("GRectangleTool");
    expect(manager.getTemporaryActiveTool()).toBeNull();
    expect(log).toEqual([
      "GRectangleTool>GHandTool light",
      "GHandTool>GZoomTool light",
      "GZoomTool>GRectangleTool",
    ]);
  });

  it("does nothing while a text is edited inline", () => {
    const { manager, editor } = setupTools();
    manager.activateTool(RectangleTool);
    vi.spyOn(editor, "isInlineEditing").mockReturnValue(true);
    setModifiers({ spaceKey: true });
    expect(name(manager.getActiveTool())).toBe("GRectangleTool");
  });
});

describe("ToolManager inline hints", () => {
  it("maps the hint position from page to view coordinates", () => {
    const { manager, view } = setupTools();
    manager.activateTool(RectangleTool);
    view.transform(-100, -50, 2);
    const shown: unknown[] = [];
    vi.spyOn(view, "updateInlineHint").mockImplementation((text, position) => {
      shown.push([text, position ? [position.getX(), position.getY()] : null]);
    });
    (manager.getActiveTool() as RectangleTool).updateInlineHint("10, 20", new Point(10, 20), "bl");
    (manager.getActiveTool() as RectangleTool).updateInlineHint(null);
    expect(shown).toEqual([
      ["10, 20", [120, 90]],
      [null, null],
    ]);
  });
});

describe("ToolManager tool exit key", () => {
  const exitKey = EditorOptions.toolExitKey;
  beforeEach(() => {
    // What the annotations sidebar sets.
    // The old app sets the key code (a number); the option is typed as a string.
    EditorOptions.toolExitKey = Key.Constant.ESC as unknown as string;
  });
  afterEach(() => {
    EditorOptions.toolExitKey = exitKey;
  });

  it("ends the tool's job: the default tool comes back on the next tick", () => {
    const { manager, input } = setupTools();
    manager.activateTool(RectangleTool);
    input.keyDown(Key.Constant.ESC);
    expect(name(manager.getActiveTool())).toBe("GRectangleTool");
    vi.advanceTimersByTime(0);
    expect(name(manager.getActiveTool())).toBe("GPointerTool");
  });

  it("puts the pointer tool back into select mode", () => {
    const { manager, input } = setupTools();
    manager.activateTool(PointerTool);
    const pointer = manager.getActiveTool() as PointerTool;
    pointer.setEditMode(SelectTool.EditMode.Edit);
    input.keyDown(Key.Constant.ESC);
    expect(pointer.getEditMode()).toBe(SelectTool.EditMode.Select);
  });

  it("is ignored without the option", () => {
    EditorOptions.toolExitKey = exitKey;
    const { manager, input } = setupTools();
    manager.activateTool(RectangleTool);
    input.keyDown(Key.Constant.ESC);
    vi.advanceTimersByTime(0);
    expect(name(manager.getActiveTool())).toBe("GRectangleTool");
  });

  it("is listened for only after a full activation", () => {
    const { manager, input, view } = setupTools();
    manager.activateTool(RectangleTool);
    const tool = manager.getActiveTool() as RectangleTool;
    const jobDone = vi.spyOn(manager, "notifyJobDone");
    // Any deactivation, light or not, removes the listener; a light
    // activation doesn't add it back.
    tool.deactivate(view, true);
    tool.activate(view, true);
    input.keyDown(Key.Constant.ESC);
    expect(jobDone).not.toHaveBeenCalled();
    tool.deactivate(view, true);
    tool.activate(view);
    input.keyDown(Key.Constant.ESC);
    expect(jobDone).toHaveBeenCalledWith(tool);
  });
});

describe("ToolManager Space released mid-pan", () => {
  it("ends the hand tool's drag on the view, then returns to the previous tool", () => {
    const { manager, input, view } = setupTools();
    manager.activateTool(RectangleTool);
    setModifiers({ spaceKey: true });
    const hand = manager.getActiveTool() as HandTool;
    const dragEnds: unknown[] = [];
    view.addEventListener(MouseEvent.DragEnd, (event: unknown) => dragEnds.push(event));
    const finishPan = vi.spyOn(view, "finishPan");
    input.down(100, 100);
    input.drag(120, 110);
    expect(hand._panning).toBe(true);
    expect(hand.isDeactivatable()).toBe(false);
    setModifiers({ spaceKey: false });
    expect(dragEnds.length).toBe(1);
    expect(hand._panning).toBe(false);
    expect(finishPan).toHaveBeenCalledTimes(1);
    expect(name(manager.getActiveTool())).toBe("GRectangleTool");
    expect(manager.getTemporaryActiveTool()).toBeNull();
  });
});
