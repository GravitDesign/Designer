import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventTarget } from "../../engine/core/event-target.ts";
import { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { Platform } from "../../engine/core/platform.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { FakeCanvas, FakeContext2D } from "../../engine/paint/testing/fake-canvas.ts";
import type { Element } from "../../engine/scene/element.ts";
import { Node } from "../../engine/scene/node.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Symbol as SymbolNode } from "../../engine/scene/symbol.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { Editor, type CustomDropEvent, type FileDropEvent } from "../editor.ts";
import { EditorWorkspace } from "../editor-workspace.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import {
  InvalidationRequestEvent as ToolInvalidationRequestEvent,
  ToolManager,
} from "../tools/tool-manager.ts";
import { EditorWidget } from "./editor-widget.ts";
import type { RulerWidget } from "./ruler-widget.ts";
import {
  installFakeDom,
  runAllFrames,
  setDevicePixelRatio,
  type FakeElement,
} from "./testing/fake-dom.ts";

let uninstall: () => void;
beforeEach(() => {
  uninstall = installFakeDom();
});
afterEach(() => uninstall());

/** The guides and the distance helper as the view uses them, recording calls. */
class FakeHelper extends EventTarget {
  calls: string[] = [];
  setView(): void {
    this.calls.push("setView");
  }
  beginMap(): void {}
  finishMap(): void {}
  mapPoint(point: Point): Point {
    // Snaps to whole tens, unless Meta is held.
    if (Platform.modifiers.metaKey) return point;
    return new Point(Math.round(point.getX() / 10) * 10, Math.round(point.getY() / 10) * 10);
  }
  invalidate(): void {}
  paint(): void {
    this.calls.push("paint");
  }
  isActivated(): boolean {
    return false;
  }
}

/** The GEditor calls the view makes, on a real scene. */
function fakeEditor(scene: Scene) {
  const transactions: string[] = [];
  const editor = Object.assign(new EventTarget(), {
    guides: new FakeHelper(),
    distance: new FakeHelper(),
    transactions,
    getScene: () => scene,
    getGuides(): FakeHelper {
      return this.guides;
    },
    getDistanceHelper(): FakeHelper {
      return this.distance;
    },
    updateInlineEditorForView: () => transactions.push("inline"),
    closeInlineEditor: () => {},
    beginTransaction: () => transactions.push("begin"),
    commitTransaction: (name: string) => transactions.push("commit " + name),
  });
  return editor;
}

function setup(fixedPage: boolean) {
  const scene = new Scene(new Workspace());
  const page = scene.getActivePage() as NonNullable<ReturnType<Scene["getActivePage"]>>;
  if (fixedPage) page.setProperties(["w", "h", "ml", "mt", "mr", "mb"], [400, 300, 10, 10, 10, 10]);
  const editor = fakeEditor(scene);
  const view = new EditorWidget(editor as unknown as Editor);
  view.getViewConfiguration().pageDecoration = {
    ...view.getViewConfiguration().pageDecoration,
    shadow: 4,
    shadowOffsetY: 2,
    shadowBackground: "rgba(0,0,0,0.25)",
  };
  view.setViewOffset([0, 0, 0, 0]);
  view.resize(800, 600);
  runAllFrames();
  return { scene, page, editor, view };
}

function elementLog(view: EditorWidget): string[] {
  return (
    (view._elementCanvas._canvasContext.canvas as unknown as FakeCanvas).getContext(
      "2d",
    ) as FakeContext2D
  ).log;
}

describe("EditorWidget", () => {
  it("is an editor view of the editor's scene, known to its guides", () => {
    const { view, editor, scene } = setup(true);
    expect((view._htmlElement as unknown as FakeElement).className).toBe(
      " g-scene-widget g-editor-widget",
    );
    expect(view.getScene()).toBe(scene);
    expect(view.getEditor()).toBe(editor);
    expect(editor.guides.calls[0]).toBe("setView");
    expect(editor.distance.calls[0]).toBe("setView");
  });

  it("gives the scene the room page shadows need at the zoom", () => {
    const { view, scene } = setup(true);
    view.zoomAtCenter(new Point(0, 0), 2);
    // (1 + 2 * 4) plus the 2 px y offset below, in world units at 200%.
    expect(scene.getShadowExpandArea()).toEqual({ left: 4.5, top: 4.5, right: 4.5, bottom: 5.5 });
  });

  it("paints the page background with its shadow under the scene, and the margins", () => {
    const { view, editor } = setup(true);
    const log = elementLog(view);
    log.length = 0;
    view.invalidate(null, true);
    runAllFrames();
    expect(log).toContain('shadowColor="rgba(0,0,0,0.25)"');
    expect(log).toContain("shadowBlur=4");
    // The magenta margin outline 10 px inside the page.
    expect(log.some((entry) => entry.startsWith("strokeRect(") || entry.includes("#ff00ff"))).toBe(
      true,
    );
    expect(editor.guides.calls).toContain("paint");
  });

  it("leaves the page background to the scene when only the inside of an opaque page is dirty", () => {
    const { view, page } = setup(true);
    page.setProperties(["bck", "bop"], [new RGBColor([255, 255, 255]), 1]);
    view.zoomAtCenter(new Point(200, 150), 1);
    runAllFrames();
    const log = elementLog(view);
    log.length = 0;
    const center = view.getWorldTransform(page).mapPoint(new Point(200, 150));
    view.invalidate(new Rect(center.getX() - 5, center.getY() - 5, 10, 10));
    runAllFrames();
    expect(log.filter((entry) => entry.startsWith("shadowBlur=4"))).toEqual([]);
  });

  it("adds a guide line dragged out of the ruler as one undo step", () => {
    const { view, editor, scene } = setup(true);
    view.setRulers(true);
    view.startMoveGuideLine(true, -1);
    view.moveGuideLine(view.getWorldTransform().mapPoint(new Point(123, 40)));
    const line = view._guideLineDiv as unknown as FakeElement;
    line.offsetLeft = 300;
    view.finishMoveGuideLine();
    expect(scene.getProperty("vgl")).toEqual([120]);
    expect(editor.transactions.filter((entry) => entry !== "inline")).toEqual([
      "begin",
      "commit Add guide line",
    ]);
  });

  it("removes a guide line dropped back on its ruler", () => {
    const { view, scene } = setup(true);
    scene.setProperty("vgl", [50, 80]);
    view.setRulers(true);
    view.startMoveGuideLine(true, 0);
    view.moveGuideLine(new Point(5, 5));
    (view._guideLineDiv as unknown as FakeElement).offsetLeft = 5;
    view.finishMoveGuideLine();
    expect(scene.getProperty("vgl")).toEqual([80]);
  });

  it("captures text input through the hidden text box", () => {
    const { view } = setup(false);
    const typed: string[] = [];
    const onInput = (event: Event) => typed.push(event.type);
    view.startCaptureInput(onInput);
    expect(view.isCapturingInput()).toBe(true);
    expect(view.hasFocus()).toBe(true);
    (view._fakeTextBox as unknown as FakeElement).dispatch({ type: "input" });
    view.endCaptureInput();
    (view._fakeTextBox as unknown as FakeElement).dispatch({ type: "input" });
    expect(typed).toEqual(["input"]);
    expect((view._fakeTextDiv as unknown as FakeElement).style.display).toBe("none");
  });
});

describe("EditorWidget rulers", () => {
  function rulerDown(view: EditorWidget, vertical: boolean, x: number, y: number) {
    const ruler = (vertical ? view._verticalRuler : view._horizontalRuler) as RulerWidget;
    const down: MouseEvent & { stopPropagation?: () => void } = new MouseEvent.Down();
    down.client = new Point(x, y);
    let stopped = false;
    down.stopPropagation = () => {
      stopped = true;
    };
    ruler.trigger(down);
    return () => stopped;
  }

  function viewEvent(view: EditorWidget, event: MouseEvent, x: number, y: number): void {
    event.client = new Point(x, y);
    view.trigger(event);
  }

  it("drags a new guide line out of the vertical ruler with the pointer", () => {
    const { view, editor, scene } = setup(true);
    view.setRulers(true);
    const stopped = rulerDown(view, true, 10, 200);
    expect(stopped()).toBe(true);
    const line = view._guideLineDiv as unknown as FakeElement;
    expect(line.style.visibility).toBe("hidden");
    viewEvent(view, new MouseEvent.Move(), 123, 200);
    // Snapped by the guides to 120, shown, with the position as a hint
    // under the horizontal ruler (19 px high, plus 3).
    expect([line.style.left, line.style.visibility]).toEqual(["120px", ""]);
    const hint = view._inlineHintDiv as unknown as FakeElement;
    expect([hint.innerHTML, hint.style.left, hint.style.top, hint.style.display]).toEqual([
      "120px",
      "120px",
      "22px",
      "",
    ]);
    line.offsetLeft = 120;
    viewEvent(view, new MouseEvent.Release(), 123, 200);
    expect(scene.getProperty("vgl")).toEqual([120]);
    expect(editor.transactions.filter((entry) => entry !== "inline")).toEqual([
      "begin",
      "commit Add guide line",
    ]);
    expect(hint.style.display).toBe("none");
    // The drag listeners are gone with the release.
    viewEvent(view, new MouseEvent.Move(), 300, 200);
    viewEvent(view, new MouseEvent.Release(), 300, 200);
    expect(view._guideLineDiv).toBeNull();
    expect(scene.getProperty("vgl")).toEqual([120]);
  });

  it("drags a horizontal guide line with the hint right of the vertical ruler", () => {
    const { view, scene } = setup(true);
    view.setRulers(true);
    rulerDown(view, false, 1, 5);
    viewEvent(view, new MouseEvent.Move(), 300, 87);
    const line = view._guideLineDiv as unknown as FakeElement;
    const hint = view._inlineHintDiv as unknown as FakeElement;
    expect(line.style.top).toBe("90px");
    expect([hint.innerHTML, hint.style.left, hint.style.top]).toEqual(["90px", "22px", "90px"]);
    line.offsetTop = 90;
    viewEvent(view, new MouseEvent.Release(), 300, 87);
    expect(scene.getProperty("hgl")).toEqual([90]);
  });

  it("ignores a press on the leftmost 2 px of the vertical ruler only", () => {
    const { view } = setup(true);
    view.setRulers(true);
    expect(rulerDown(view, true, 2, 200)()).toBe(false);
    expect(view._guideLineInfo).toBeNull();
    expect(rulerDown(view, true, 3, 200)()).toBe(true);
    expect(view._guideLineInfo).toEqual({ isVertical: true, guideIndex: -1 });
    view.finishMoveGuideLine();
    expect(rulerDown(view, false, 1, 5)()).toBe(true);
    expect(view._guideLineInfo).toEqual({ isVertical: false, guideIndex: -1 });
    // Platform is global: an unfinished drag would keep its modifier listener.
    view.finishMoveGuideLine();
  });

  it("maps the guide line again when Meta changes during the drag", () => {
    const { view } = setup(true);
    view.setRulers(true);
    rulerDown(view, true, 10, 200);
    viewEvent(view, new MouseEvent.Move(), 123, 200);
    const line = view._guideLineDiv as unknown as FakeElement;
    expect(line.style.left).toBe("120px");
    const changed = (metaKey: boolean, shiftKey: boolean): void => {
      const event = new ModifiersChangedEvent();
      event.changed.metaKey = metaKey;
      event.changed.shiftKey = shiftKey;
      Platform.trigger(event);
    };
    try {
      // The fake guides don't snap while Meta is held.
      Platform.modifiers.metaKey = true;
      changed(false, true);
      expect(line.style.left).toBe("120px");
      changed(true, false);
      expect(line.style.left).toBe("123px");
      Platform.modifiers.metaKey = false;
      changed(true, false);
      expect(line.style.left).toBe("120px");
      view.finishMoveGuideLine();
      const move = vi.spyOn(view, "moveGuideLine");
      changed(true, false);
      expect(move).not.toHaveBeenCalled();
    } finally {
      Platform.modifiers.metaKey = false;
    }
  });

  it("moves an existing guide line as one 'Change guide line' step, and an unmoved one not at all", () => {
    const { view, editor, scene } = setup(true);
    scene.setProperty("vgl", [50, 80]);
    view.setRulers(true);
    view.startMoveGuideLine(true, 1);
    const line = view._guideLineDiv as unknown as FakeElement;
    // Shown at once at the line's position.
    expect([line.style.left, line.style.visibility]).toEqual(["80px", undefined]);
    view.moveGuideLine(new Point(204, 10));
    line.offsetLeft = 200;
    view.finishMoveGuideLine();
    expect(scene.getProperty("vgl")).toEqual([50, 200]);
    view.startMoveGuideLine(true, 0);
    view.moveGuideLine(new Point(52, 10));
    (view._guideLineDiv as unknown as FakeElement).offsetLeft = 50;
    view.finishMoveGuideLine();
    expect(scene.getProperty("vgl")).toEqual([50, 200]);
    expect(editor.transactions.filter((entry) => entry !== "inline")).toEqual([
      "begin",
      "commit Change guide line",
    ]);
  });

  it("works in CSS pixels at device pixel ratio 2", () => {
    setDevicePixelRatio(2);
    const { view, scene } = setup(true);
    view.setRulers(true);
    // The ignored strip is 2 CSS pixels: 4 device pixels.
    expect(rulerDown(view, true, 4, 400)()).toBe(false);
    expect(rulerDown(view, true, 5, 400)()).toBe(true);
    // Device point 246 is world 123, snapped to 120: device 240, CSS 120.
    viewEvent(view, new MouseEvent.Move(), 246, 400);
    const line = view._guideLineDiv as unknown as FakeElement;
    const hint = view._inlineHintDiv as unknown as FakeElement;
    expect(line.style.left).toBe("120px");
    // Under the ruler: (2 * 19 + 3) device pixels.
    expect([hint.style.left, hint.style.top]).toEqual(["120px", "20.5px"]);
    line.offsetLeft = 120;
    viewEvent(view, new MouseEvent.Release(), 246, 400);
    expect(scene.getProperty("vgl")).toEqual([120]);
  });
});

describe("EditorWidget drops", () => {
  /** A DataTransfer with `data` by MIME type, or files. */
  function transfer(data: Record<string, string | null>, files: unknown[] = []): DataTransfer {
    return {
      files,
      types: Object.keys(data),
      getData: (type: string) => data[type] ?? "",
    } as unknown as DataTransfer;
  }

  function dropSetup() {
    const context = setup(true);
    const { editor, page, view } = context;
    const inserts: { elements: Node[]; flags: unknown[] }[] = [];
    const positions: number[][] = [];
    Object.assign(editor, {
      updateByMousePosition: (point: Point) => positions.push([point.getX(), point.getY()]),
      insertElements: (elements: Node[], ...flags: unknown[]) => {
        editor.transactions.push("insert");
        inserts.push({ elements, flags });
        for (const element of elements) page.appendChild(element);
      },
    });
    // Scrolled, so the view, scene and page points differ.
    view.scrollBy(-50, -20);
    editor.transactions.length = 0;
    return { ...context, inserts, positions };
  }

  const box = (element: Element) => {
    const rect = element.getGeometryBBox() as Rect;
    return [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()];
  };

  afterEach(() => vi.restoreAllMocks());

  it("hands dropped files to the FileDropEvent listeners with the page point, and nothing else", () => {
    const { view, editor, inserts } = dropSetup();
    const dropped: [unknown, number[]][] = [];
    editor.addEventListener(Editor.FileDropEvent, (event: FileDropEvent) => {
      const point = event.position as Point;
      dropped.push([event.file, [point.getX(), point.getY()]]);
    });
    const rectangle = Node.serialize(new Rectangle());
    view._handleDrop(new Point(100, 60), transfer({ [Node.MIME_TYPE]: rectangle }, ["a", "b"]));
    expect(dropped).toEqual([
      ["a", [50, 40]],
      ["b", [50, 40]],
    ]);
    expect(inserts).toEqual([]);
  });

  it("inserts a dropped node nobody accepted at the page point, without a transaction", () => {
    const { view, editor, inserts, positions } = dropSetup();
    const rectangle = new Rectangle();
    rectangle.setProperty("trf", new Transform(10, 0, 0, 20, 0, 0));
    view._handleDrop(
      new Point(100, 60),
      transfer({ [Node.MIME_TYPE]: Node.serialize(rectangle), "text/x-unknown": "skipped" }),
    );
    expect(inserts).toHaveLength(1);
    const inserted = inserts[0]?.elements[0] as Rectangle;
    expect(inserted).toBeInstanceOf(Rectangle);
    // Moved by the page point (50, 40), its own offset kept.
    expect(box(inserted)).toEqual([40, 20, 20, 40]);
    expect(inserts[0]?.flags).toEqual([true, false, true]);
    expect(positions).toEqual([[50, 40]]);
    expect(editor.transactions).toEqual(["insert"]);
  });

  it("offers every drop to the editors under the point and inserts nothing they accept", () => {
    const { view, page, inserts } = dropSetup();
    const target = new Rectangle();
    target.setProperty("trf", new Transform(50, 0, 0, 50, 50, 40));
    page.appendChild(target);
    const offers: unknown[][] = [];
    let accept = true;
    const createEditor = ElementEditor.createEditor.bind(ElementEditor);
    vi.spyOn(ElementEditor, "createEditor").mockImplementation((element, arg) =>
      element === target
        ? ({
            acceptDrop: (point: Point, type: unknown, source: unknown) => {
              offers.push([[point.getX(), point.getY()], type, source]);
              return accept;
            },
          } as unknown as ElementEditor)
        : createEditor(element, arg),
    );
    view._handleDrop(new Point(100, 60), transfer({ "text/plain": "hello" }));
    view._handleDrop(
      new Point(100, 60),
      transfer({ [Node.MIME_TYPE]: Node.serialize(new Rectangle()) }),
    );
    expect(offers.map((offer) => offer.slice(0, 2))).toEqual([
      [[50, 40], ElementEditor.DropType.Text],
      [[50, 40], ElementEditor.DropType.Node],
    ]);
    expect(offers[0]?.[2]).toBe("hello");
    expect(inserts).toEqual([]);
    accept = false;
    view._handleDrop(
      new Point(100, 60),
      transfer({ [Node.MIME_TYPE]: Node.serialize(new Rectangle()) }),
    );
    expect(inserts).toHaveLength(1);
  });

  it("passes custom drop data to the CustomDropEvent listeners", () => {
    const { view, editor, inserts } = dropSetup();
    const received: unknown[] = [];
    editor.addEventListener(Editor.CustomDropEvent, (event: CustomDropEvent) => {
      const point = event.position as Point;
      received.push(event.data, point.getX(), point.getY());
    });
    view._handleDrop(new Point(100, 60), transfer({ [ElementEditor.DROP_MIME_TYPE_CUSTOM]: "x" }));
    expect(received).toEqual(["x", 50, 40]);
    expect(inserts).toEqual([]);
  });

  /** A master symbol of one 10 x 10 rectangle at (5, 5) on the page. */
  function masterSymbol(page: Page): SymbolNode {
    const rectangle = new Rectangle();
    rectangle.setProperty("trf", new Transform(5, 0, 0, 5, 10, 10));
    page.appendChild(rectangle);
    return SymbolNode.create([rectangle], page, "S");
  }

  it("drops a symbol whose master is in the scene as a plain instance", () => {
    const { view, page, editor, inserts } = dropSetup();
    const master = masterSymbol(page);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    view._handleDrop(new Point(100, 60), transfer({ [Node.MIME_TYPE]: Node.serialize(master) }));
    const dropped = inserts[0]?.elements[0] as SymbolNode;
    expect(dropped).not.toBe(master);
    expect(dropped.isMaster()).toBe(false);
    // Its box's top left lands on the page point.
    expect(box(dropped)).toEqual([50, 40, 10, 10]);
    expect(editor.transactions).toEqual(["insert"]);
    expect(log.mock.calls).toEqual([["inserting:found"]]);
  });

  it("reuses the scene's unattached copy of a dropped symbol and links its instances in one transaction", () => {
    const { view, page, scene, editor, inserts } = dropSetup();
    const master = masterSymbol(page);
    const instance = master.clone() as SymbolNode;
    page.appendChild(instance);
    page.removeChild(master);
    expect(master.getParent()).toBeNull();
    instance.setProperty("masterRef", "stale");
    view._handleDrop(new Point(100, 60), transfer({ [Node.MIME_TYPE]: Node.serialize(master) }));
    expect(inserts[0]?.elements[0]).toBe(master);
    expect(box(master)).toEqual([50, 40, 10, 10]);
    expect(editor.transactions).toEqual(["begin", "insert", "commit Insert master symbol"]);
    expect(inserts[0]?.flags).toEqual([true, true, true]);
    expect(instance.getProperty("masterRef")).toBe(master.getReferenceId());
    expect(scene.getSymbols()).toContain(master);
  });

  it("makes a dropped symbol from elsewhere a master", () => {
    const { view, scene, editor, inserts } = dropSetup();
    const other = new Scene(new Workspace());
    const foreign = masterSymbol(other.getActivePage() as Page);
    const copy = foreign.clone() as SymbolNode;
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    view._handleDrop(new Point(100, 60), transfer({ [Node.MIME_TYPE]: Node.serialize(copy) }));
    const dropped = inserts[0]?.elements[0] as SymbolNode;
    // A clone has its own reference id, so it was not a master before.
    expect(log.mock.calls).toEqual([["inserting: making non master a master"]]);
    expect(dropped.isMaster()).toBe(true);
    expect([dropped.getProperty("masterRef"), dropped.getProperty("masterMultiRef")]).toEqual([
      dropped.getReferenceId(),
      dropped.getMultireferenceId(),
    ]);
    expect(editor.transactions).toEqual(["begin", "insert", "commit Insert master symbol"]);
    expect(scene.getSymbols()).toContain(dropped);
  });

  it("converts a DOM drop's page position to device pixels", () => {
    setDevicePixelRatio(2);
    const { view } = setup(true);
    const points: number[][] = [];
    view._handleDrop = (point: Point) => {
      points.push([point.getX(), point.getY()]);
    };
    let prevented = 0;
    const input = view._inputHtmlElement as unknown as FakeElement;
    input.dispatch({
      type: "drop",
      pageX: 100,
      pageY: 50,
      dataTransfer: transfer({}),
      preventDefault: () => prevented++,
      stopPropagation: () => prevented++,
    });
    expect(points).toEqual([[200, 100]]);
    expect(prevented).toBe(2);
  });
});

describe("EditorWidget and the tool manager", () => {
  it("repaints what the tool manager asks for and lets it paint, until released", () => {
    const scene = new Scene(new EditorWorkspace());
    const toolManager = (scene.getWorkspace() as EditorWorkspace).getToolManager() as ToolManager;
    expect(toolManager).toBeInstanceOf(ToolManager);
    const editor = fakeEditor(scene);
    const view = new EditorWidget(editor as unknown as Editor);
    view.setViewOffset([0, 0, 0, 0]);
    view.resize(800, 600);
    runAllFrames();
    let painted = 0;
    toolManager.paint = () => {
      painted++;
    };
    const invalidated: (number[] | null)[] = [];
    const invalidate = view.invalidate.bind(view);
    view.invalidate = (area, ...rest) => {
      invalidated.push(area ? [area.getX(), area.getY(), area.getWidth(), area.getHeight()] : null);
      return invalidate(area, ...rest);
    };
    toolManager.trigger(new ToolInvalidationRequestEvent(toolManager, new Rect(1, 2, 3, 4)));
    expect(invalidated).toEqual([[1, 2, 3, 4]]);
    runAllFrames();
    expect(painted).toBe(1);
    view.release();
    expect(toolManager.hasEventListeners(ToolInvalidationRequestEvent)).toBe(false);
  });
});
