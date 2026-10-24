/**
 * Test helpers for the select tools: a real scene, editor and editor view
 * (on the fake DOM of editor/view/testing) at zoom 1 with scene (0, 0) at
 * view (0, 0), a stand-in tool manager, and input that goes through the
 * view's event listeners like the real pointer and keyboard.
 */
import "../../index.ts";
import { KeyEvent } from "../../../engine/core/key-event.ts";
import { ModifiersChangedEvent } from "../../../engine/core/modifiers-changed-event.ts";
import { Modifiers } from "../../../engine/core/modifiers.ts";
import { MouseEvent } from "../../../engine/core/mouse-event.ts";
import { Platform } from "../../../engine/core/platform.ts";
import { Point } from "../../../engine/math/point.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { Ellipse } from "../../../engine/scene/ellipse.ts";
import { FillPaintLayer } from "../../../engine/style/fill-paint-layer.ts";
import { Group } from "../../../engine/scene/group.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Rectangle } from "../../../engine/scene/rectangle.ts";
import { Scene } from "../../../engine/scene/scene.ts";
import { Editor } from "../../editor.ts";
import { EditorWorkspace } from "../../editor-workspace.ts";
import { EditorWidget } from "../../view/editor-widget.ts";
import { runAllFrames } from "../../view/testing/fake-dom.ts";
import type { SelectTool } from "../select-tool.ts";
import type { Tool } from "../tool.ts";
import type { ToolManager } from "../tool-manager.ts";

/** What the tools ask of the tool manager, recording the requests. */
export class FakeToolManager {
  active: Tool | null = null;
  temporary: Tool | null = null;
  calls: string[] = [];
  hints: (string | null)[] = [];

  getActiveTool(): Tool | null {
    return this.active;
  }
  getTemporaryActiveTool(): Tool | null {
    return this.temporary;
  }
  _updateActiveToolCursor(): void {}
  _updateInlineHint(text: string | null): void {
    this.hints.push(text);
  }
  _invalidateActiveToolArea(): void {}
  notifyJobDone(): void {
    this.calls.push("notifyJobDone");
  }
  activateSubSelect(): void {
    this.calls.push("activateSubSelect");
  }
  activateOldPathTool(): void {
    this.calls.push("activateOldPathTool");
  }
  activateTool(): void {
    this.calls.push("activateTool");
  }
}

export interface ToolSetup<T extends SelectTool> {
  scene: Scene;
  editor: Editor;
  view: EditorWidget;
  tool: T;
  manager: FakeToolManager;
  /** The page's children. */
  page: { appendChild(node: Node): void; getChildren(): Node[] };
}

export function setupTool<T extends SelectTool>(tool: T): ToolSetup<T> {
  const scene = new Scene(new EditorWorkspace());
  const editor = new Editor(scene);
  const view = new EditorWidget(editor);
  view.setViewOffset([0, 0, 0, 0]);
  view.resize(800, 600);
  view.transform(0, 0, 1);
  runAllFrames();
  const manager = new FakeToolManager();
  tool._manager = manager as unknown as ToolManager;
  manager.active = tool;
  tool.activate(view);
  const page = scene.getActivePage() as unknown as ToolSetup<T>["page"];
  return { scene, editor, view, tool, manager, page };
}

/** A black fill, so hit tests find the inside. */
function fill(shape: Rectangle | Ellipse): void {
  shape.getPaintLayers()?.appendChild(new FillPaintLayer(RGBColor.BLACK));
}

/** A rectangle from (x, y) of size w × h, appended to `parent`. */
export function rect(
  parent: { appendChild(node: Node): void },
  x: number,
  y: number,
  w: number,
  h: number,
): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  fill(r);
  parent.appendChild(r);
  return r;
}

export function ellipse(
  parent: { appendChild(node: Node): void },
  x: number,
  y: number,
  w: number,
  h: number,
): Ellipse {
  const e = new Ellipse();
  e.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  fill(e);
  parent.appendChild(e);
  return e;
}

export function group(parent: { appendChild(node: Node): void }): Group {
  const g = new Group();
  parent.appendChild(g);
  return g;
}

function mouse<E extends MouseEvent>(
  cls: new () => E,
  x: number,
  y: number,
  button = MouseEvent.BUTTON_LEFT,
): E {
  const event = new cls();
  event.client = new Point(x, y);
  event.button = button;
  return event;
}

/** Pointer input through the view's listeners. */
export class Input {
  private start: Point | null = null;
  private last: Point | null = null;

  constructor(private readonly view: EditorWidget) {}

  move(x: number, y: number): void {
    this.view.trigger(mouse(MouseEvent.Move, x, y));
  }

  down(x: number, y: number, button = MouseEvent.BUTTON_LEFT): void {
    this.start = new Point(x, y);
    this.last = this.start;
    this.view.trigger(mouse(MouseEvent.Down, x, y, button));
  }

  /** A drag step; the first one also sends DragStart. */
  drag(x: number, y: number, button = MouseEvent.BUTTON_LEFT): void {
    const start = this.start as Point;
    if (this.last === start) {
      const dragStart = mouse(MouseEvent.DragStart, start.getX(), start.getY(), button);
      this.view.trigger(dragStart);
    }
    const event = mouse(MouseEvent.Drag, x, y, button);
    event.clientStart = start;
    event.clientDelta = new Point(x - (this.last as Point).getX(), y - (this.last as Point).getY());
    this.last = new Point(x, y);
    this.view.trigger(event);
  }

  /**
   * Releases; after a drag also sends DragEnd first. A drag that auto-pans
   * finishes after the view's next frame and the release waits for that,
   * so this runs the frames and resolves once the release is through.
   */
  async up(x: number, y: number, button = MouseEvent.BUTTON_LEFT): Promise<void> {
    if (this.last !== this.start) {
      const end = mouse(MouseEvent.DragEnd, x, y, button);
      end.clientStart = this.start as Point;
      end.clientDelta = new Point(0, 0);
      this.view.trigger(end);
      runAllFrames();
    }
    this.view.trigger(mouse(MouseEvent.Release, x, y, button));
    this.start = null;
    this.last = null;
    for (let i = 0; i < 5; i++) await Promise.resolve();
  }

  async click(x: number, y: number): Promise<void> {
    this.down(x, y);
    await this.up(x, y);
  }

  dblclick(x: number, y: number): void {
    this.view.trigger(mouse(MouseEvent.DblClick, x, y));
  }

  keyDown(key: KeyEvent["key"]): void {
    const event = new KeyEvent.Down();
    event.key = key;
    event.preventDefault = () => {};
    event.stopPropagation = () => {};
    this.view.trigger(event);
  }

  keyUp(key: KeyEvent["key"]): void {
    const event = new KeyEvent.Release();
    event.key = key;
    this.view.trigger(event);
  }
}

type ModifierName = Exclude<keyof Modifiers, "toString">;

/** Sets modifiers as the platform would and sends its ModifiersChangedEvent. */
export function setModifiers(values: Partial<Record<ModifierName, boolean>>): void {
  const event = new ModifiersChangedEvent();
  event.changed = new Modifiers();
  for (const key of Object.keys(values) as ModifierName[]) {
    const value = values[key] as boolean;
    if (Platform.modifiers[key] !== value) {
      Platform.modifiers[key] = value;
      event.changed[key] = true;
    }
  }
  Platform.trigger(event);
}

/** Resets every modifier without events. */
export function clearModifiers(): void {
  const fresh = new Modifiers();
  for (const key of Object.keys(fresh) as ModifierName[]) Platform.modifiers[key] = fresh[key];
}
