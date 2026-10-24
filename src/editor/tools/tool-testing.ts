/**
 * Test helpers for the tools of this folder: a real scene, editor, editor
 * view (on the fake DOM of editor/view/testing, zoom 1, scene (0, 0) at
 * view (0, 0)) and the workspace's real tool manager working on that view,
 * with input sent through the view's listeners and the platform's
 * modifier events.
 */
import "../index.ts";
import { KeyEvent } from "../../engine/core/key-event.ts";
import { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { Modifiers } from "../../engine/core/modifiers.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Point } from "../../engine/math/point.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Editor } from "../editor.ts";
import { EditorWorkspace } from "../editor-workspace.ts";
import { EditorWidget } from "../view/editor-widget.ts";
import { runAllFrames } from "../view/testing/fake-dom.ts";
import type { ToolManager } from "./tool-manager.ts";

export interface ToolSetup {
  scene: Scene;
  editor: Editor;
  view: EditorWidget;
  manager: ToolManager;
  page: Page;
  input: Input;
}

const managers: ToolManager[] = [];

/**
 * Takes every tool manager made by setupTools off its view. Call it after
 * each test: a manager left on its view keeps listening to the platform's
 * modifier changes, and the tools remove their modifier listeners by
 * function (shared by all instances of a class), so a stale manager
 * reacting to a later test's modifiers would take the new tools' listeners.
 */
export function releaseTools(): void {
  for (const manager of managers.splice(0)) manager.setView(null);
}

/** A scene with its editor and view; the tool manager works on the view. */
export function setupTools(): ToolSetup {
  const workspace = new EditorWorkspace();
  const scene = new Scene(workspace);
  const editor = new Editor(scene);
  const view = new EditorWidget(editor);
  view.setViewOffset([0, 0, 0, 0]);
  view.resize(800, 600);
  view.transform(0, 0, 1);
  runAllFrames();
  const manager = workspace.getToolManager() as ToolManager;
  manager.setView(view);
  managers.push(manager);
  return {
    scene,
    editor,
    view,
    manager,
    page: scene.getActivePage() as Page,
    input: new Input(view),
  };
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

/** Pointer and key input through the view's listeners. */
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
    if (this.last === start)
      this.view.trigger(mouse(MouseEvent.DragStart, start.getX(), start.getY(), button));
    const event = mouse(MouseEvent.Drag, x, y, button);
    event.clientStart = start;
    const last = this.last as Point;
    event.clientDelta = new Point(x - last.getX(), y - last.getY());
    this.last = new Point(x, y);
    this.view.trigger(event);
  }

  /** Releases; after a drag DragEnd comes first. */
  up(x: number, y: number, button = MouseEvent.BUTTON_LEFT): void {
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
  }

  /** Press at `from`, drag through `points`, release at the last one. */
  dragThrough(from: [number, number], points: [number, number][]): void {
    this.down(from[0], from[1]);
    for (const [x, y] of points) this.drag(x, y);
    const last = points[points.length - 1] as [number, number];
    this.up(last[0], last[1]);
  }

  click(x: number, y: number): void {
    this.down(x, y);
    this.up(x, y);
  }

  keyDown(key: KeyEvent["key"]): void {
    const event = new KeyEvent.Down();
    event.key = key;
    event.preventDefault = () => {};
    event.stopPropagation = () => {};
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

/** The page's children in order. */
export function children(page: Page): Node[] {
  return (page as unknown as { getChildren(): Node[] }).getChildren();
}

/** The transform matrix of a node's "trf". */
export function trf(node: Node): number[] | null {
  const value = (node as unknown as { getProperty(name: string): unknown }).getProperty("trf") as {
    getMatrix(): number[];
  } | null;
  return value ? value.getMatrix() : null;
}
