/**
 * Test helpers for the path tools (pen, bezigon, freehand, knife): the
 * select tools' scene, editor and view setup (select/testing.ts) for any
 * tool, plus shortcuts for reading paths back.
 */
import { vi } from "vitest";
import { Scene } from "../../engine/scene/scene.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { AnchorPoint } from "../../engine/scene/path-base.ts";
import { Path } from "../../engine/scene/path.ts";
import { Editor } from "../editor.ts";
import { EditorWorkspace } from "../editor-workspace.ts";
import { EditorWidget } from "../view/editor-widget.ts";
import { runAllFrames } from "../view/testing/fake-dom.ts";
import { KeyEvent } from "../../engine/core/key-event.ts";
import { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { Modifiers } from "../../engine/core/modifiers.ts";
import { Platform } from "../../engine/core/platform.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { Point } from "../../engine/math/point.ts";
import { FakeToolManager } from "./select/testing.ts";
import type { Tool } from "./tool.ts";
import type { ToolManager } from "./tool-manager.ts";

export { clearModifiers, rect, ellipse } from "./select/testing.ts";

type ModifierName = "shiftKey" | "optionKey" | "metaKey" | "spaceKey" | "ctrlKey";

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

function mouse<E extends MouseEvent>(cls: new () => E, x: number, y: number, button: number): E {
  const event = new cls();
  event.client = new Point(x, y);
  event.button = button;
  return event;
}

/**
 * Pointer and key input through the view, as the DOM would send it: the
 * view itself turns moves with a button down into DragStart, Drag and
 * DragEnd (after the Move listeners ran), as in the app.
 */
export class Input {
  private button = MouseEvent.BUTTON_LEFT;

  constructor(private readonly view: EditorWidget) {}

  /** A pointer move; while a button is down the view also sends Drag. */
  move(x: number, y: number): void {
    this.view.trigger(mouse(MouseEvent.Move, x, y, this.button));
  }

  down(x: number, y: number, button = MouseEvent.BUTTON_LEFT): void {
    this.button = button;
    this.view.trigger(mouse(MouseEvent.Down, x, y, button));
  }

  /** A move with the button down. */
  drag(x: number, y: number): void {
    this.move(x, y);
  }

  up(x: number, y: number, button = this.button): void {
    this.view.trigger(mouse(MouseEvent.Release, x, y, button));
    this.button = MouseEvent.BUTTON_LEFT;
  }

  click(x: number, y: number, button = MouseEvent.BUTTON_LEFT): void {
    this.down(x, y, button);
    this.up(x, y, button);
  }

  keyDown(key: KeyEvent["key"]): void {
    const event = new KeyEvent.Down();
    event.key = key;
    event.preventDefault = () => {};
    event.stopPropagation = () => {};
    this.view.trigger(event);
  }
}

export interface PathToolSetup<T extends Tool> {
  scene: Scene;
  editor: Editor;
  view: EditorWidget;
  tool: T;
  manager: FakeToolManager;
  input: Input;
  page: { appendChild(node: Node): void; getChildren(): Node[] };
}

/** `tool` active on a fresh view at zoom 1 with scene (0, 0) at view (0, 0). */
export function setupPathTool<T extends Tool>(tool: T): PathToolSetup<T> {
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
  const page = scene.getActivePage() as unknown as PathToolSetup<T>["page"];
  return { scene, editor, view, tool, manager, input: new Input(view), page };
}

/** Lets the pen's 300 ms double-click window pass. */
export function pause(ms = 400): void {
  vi.advanceTimersByTime(ms);
}

/** The paths on the page, in order. */
export function paths(page: { getChildren(): Node[] }): Path[] {
  return page.getChildren().filter((n): n is Path => n instanceof Path);
}

/** The `index`th path on the page; fails the test when there is none. */
export function pathAt(page: { getChildren(): Node[] }, index = 0): Path {
  const path = paths(page)[index];
  if (!path) throw new Error(`no path ${index} on the page`);
  return path;
}

/** `list[index]`, failing the test when it is missing. */
export function at<T>(list: readonly T[], index: number): T {
  if (index < 0) index += list.length;
  if (!(index in list)) throw new Error(`no item ${index}`);
  return list[index] as T;
}

/** Anchor point properties as plain data. */
export function points(path: Path, names: string[] = ["x", "y"]): unknown[][] {
  const out: unknown[][] = [];
  for (
    let p = path.getAnchorPoints().getFirstChild() as AnchorPoint | null;
    p;
    p = p.getNext() as AnchorPoint | null
  ) {
    out.push(names.map((n) => p?.getProperty(n)));
  }
  return out;
}

/** A path through `coords` ([x, y] each), appended to `page`. */
export function polyline(
  page: { appendChild(node: Node): void },
  coords: [number, number][],
  closed = false,
): Path {
  const path = new Path();
  for (const [x, y] of coords) {
    const point = new Path.AnchorPoint();
    point.setProperties(["x", "y"], [x, y]);
    path.getAnchorPoints().appendChild(point);
  }
  if (closed) path.setProperty("closed", true);
  page.appendChild(path);
  return path;
}
