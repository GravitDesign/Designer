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
import { unpackPoint } from "../../engine/core/util.ts";
import { FakeToolManager } from "./select/testing.ts";
import type { Tool } from "./tool.ts";
import type { ToolManager } from "./tool-manager.ts";
import recorded from "./pen-branches.recorded.json";

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

  /** `origin`: the view pixel added to every position (see scenarioView). */
  constructor(
    private readonly view: EditorWidget,
    private readonly origin: readonly [number, number] = [0, 0],
  ) {}

  private event<E extends MouseEvent>(cls: new () => E, x: number, y: number, button: number): E {
    return mouse(cls, x + this.origin[0], y + this.origin[1], button);
  }

  /** A pointer move; while a button is down the view also sends Drag. */
  move(x: number, y: number): void {
    this.view.trigger(this.event(MouseEvent.Move, x, y, this.button));
  }

  down(x: number, y: number, button = MouseEvent.BUTTON_LEFT): void {
    this.button = button;
    this.view.trigger(this.event(MouseEvent.Down, x, y, button));
  }

  /** A move with the button down. */
  drag(x: number, y: number): void {
    this.move(x, y);
  }

  up(x: number, y: number, button = this.button): void {
    this.view.trigger(this.event(MouseEvent.Release, x, y, button));
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

/**
 * Anchor points in their saved form (AnchorPoint.serialize) with the
 * reference ids dropped and packed coordinates unpacked, so they compare
 * with points recorded from the old app's saved documents.
 */
export function savedPoints(path: Path): unknown[][] {
  const out: unknown[][] = [];
  for (
    let p = path.getAnchorPoints().getFirstChild() as AnchorPoint | null;
    p;
    p = p.getNext() as AnchorPoint | null
  ) {
    out.push(p.serialize());
  }
  return readableSavedPoints(out);
}

/** Saved anchor points without reference ids, packed points as [x, y]. */
export function readableSavedPoints(saved: readonly (readonly unknown[])[]): unknown[][] {
  return saved.map((data) => {
    const out: unknown[] = [];
    for (let i = 0; i < data.length; i++) {
      const value = data[i];
      if (value === "#" || value === "&") i++;
      else if (typeof value === "string" && value.length > 3)
        out.push(Array.from(unpackPoint(value)));
      else out.push(value);
    }
    return out;
  });
}

/**
 * `s` with the view the editor-tools scenarios use: scene (0, 0) at view
 * (400, 200), zoom 1, on a canvas about their size, and input in scene
 * coordinates. Within 40 px of the view's edge the pen auto-pans, so the
 * origin and the size matter for replaying a scenario.
 */
export function scenarioView<T extends Tool>(s: PathToolSetup<T>): PathToolSetup<T> {
  s.view.resize(1100, 800);
  s.view.transform(-400, -200, 1);
  runAllFrames();
  return { ...s, input: new Input(s.view, [400, 200]) };
}

/**
 * A press at `from`, moves through `through` and the release at the last
 * one, after the double-click window. A right-button drag reaches the pen
 * only through its move handler, which ignores moves for DBLCLICKTM after
 * a press, so those moves wait that long (the scenarios' steps are that
 * far apart). Left-button drags go through DragStart and Drag, which have
 * no such guard.
 */
export function dragThrough(
  input: Input,
  from: [number, number],
  through: [number, number][],
  button = MouseEvent.BUTTON_LEFT,
): void {
  pause();
  input.down(from[0], from[1], button);
  for (const [x, y] of through) {
    if (button === MouseEvent.BUTTON_RIGHT) pause();
    input.drag(x, y);
  }
  const last = at(through, -1);
  input.up(last[0], last[1], button);
}

/** A case of pen-branches.recorded.json. */
export interface RecordedCase {
  paths: { closed: boolean; pts: unknown[][] }[];
  undo: string;
  tool: string;
  probes: Record<string, { undo: string; tool: string; preview: number[][] }>;
}

/**
 * The old app's recording of an editor-tools scenario (paths of the saved
 * document, undo name and tool at the end, probes), as extracted into
 * pen-branches.recorded.json from parity/expected/editor-tools/<id>.json.
 */
export function oldApp(id: string): RecordedCase {
  const entry = (recorded as unknown as Record<string, RecordedCase | undefined>)[id];
  if (!entry) throw new Error(`no recording for ${id}`);
  return entry;
}

/** The recorded paths of `id`, in the form savedPaths returns. */
export function oldPaths(id: string): { closed: boolean; pts: unknown[][] }[] {
  return oldApp(id).paths.map((p) => ({ closed: p.closed, pts: readableSavedPoints(p.pts) }));
}

/** `list` as saved: closed flag and saved anchor points. */
export function savedPaths(list: readonly Path[]): { closed: boolean; pts: unknown[][] }[] {
  return list.map((p) => ({ closed: !!p.getProperty("closed"), pts: savedPoints(p) }));
}
