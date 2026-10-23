import { describe, expect, it, vi } from "vitest";
import { MouseEvent } from "../engine/core/mouse-event.ts";
import { Point } from "../engine/math/point.ts";
import { Transform } from "../engine/math/transform.ts";
import { ElementData } from "../engine/paint/element-data.ts";
import { ActionableMixin } from "../engine/scene/annotations/actionable.ts";
import type { Element } from "../engine/scene/element.ts";
import { Rectangle } from "../engine/scene/rectangle.ts";
import { Scene } from "../engine/scene/scene.ts";
import { ActionManager, type ActionManagerView } from "./action-manager.ts";
import { EditorOptions } from "./editor-options.ts";
import { EditorWorkspace } from "./editor-workspace.ts";

function fakeView(scene: Scene) {
  const listeners: [unknown, unknown, unknown][] = [];
  const editor = { name: "editor" };
  const worldTransform = new Transform(2, 0, 0, 2, 5, 5);
  const view: ActionManagerView & { listeners: typeof listeners } = {
    listeners,
    addEventListener: (eventClass, listener, target) =>
      listeners.push([eventClass, listener, target]),
    removeEventListener: (eventClass, listener, target) => {
      const index = listeners.findIndex(
        ([c, l, t]) => c === eventClass && l === listener && t === target,
      );
      if (index >= 0) listeners.splice(index, 1);
    },
    getScene: () => scene,
    getWorldTransform: () => worldTransform,
    getViewConfiguration: () => ({ multiPageView: "multi" }),
    getEditor: () => editor,
  };
  return { view, editor, worldTransform };
}

function click(x: number, y: number): MouseEvent {
  const event = new MouseEvent.Click();
  event.client = new Point(x, y);
  return event;
}

describe("ActionManager", () => {
  it("listens for clicks on the view it is given and stops on the next one", () => {
    const manager = new ActionManager();
    const scene = new Scene(new EditorWorkspace());
    const first = fakeView(scene).view;
    const second = fakeView(scene).view;
    manager.setView(first);
    expect(first.listeners).toEqual([[MouseEvent.Click, manager._mouseClick, manager]]);
    manager.setView(first);
    expect(first.listeners).toHaveLength(1);
    manager.setView(second);
    expect(first.listeners).toEqual([]);
    expect(second.listeners).toHaveLength(1);
    manager.setView(null);
    expect(second.listeners).toEqual([]);
  });

  it("hit-tests actionable elements at the click and runs the first hit's action", () => {
    const manager = new ActionManager();
    const scene = new Scene(new EditorWorkspace());
    const { view, editor, worldTransform } = fakeView(scene);
    manager.setView(view);
    const element = new Rectangle(0, 0, 10, 10) as unknown as Element;
    const executed: unknown[][] = [];
    const action = { execute: (...args: unknown[]) => executed.push(args) };
    const hitTest = vi
      .spyOn(scene, "hitTest")
      .mockReturnValue([new ElementData(element, { action })]);
    manager._mouseClick(click(30, 40));
    expect(hitTest).toHaveBeenCalledTimes(1);
    const args = hitTest.mock.calls[0] as unknown[];
    expect(args[0]).toEqual(new Point(30, 40));
    expect(args[1]).toBe(worldTransform);
    expect(args.slice(3)).toEqual([
      false,
      -1,
      EditorOptions.pickDistance,
      false,
      null,
      false,
      false,
      "multi",
      false,
    ]);
    const acceptor = args[2] as (element: unknown) => unknown;
    const hasMixin = vi.fn((mixin: unknown) => mixin === ActionableMixin);
    expect(acceptor({ hasMixin })).toBe(true);
    expect(hasMixin).toHaveBeenCalledWith(ActionableMixin);
    expect(executed).toEqual([[element, editor, view]]);
  });

  it("does nothing for a miss or a hit without an action", () => {
    const manager = new ActionManager();
    const scene = new Scene(new EditorWorkspace());
    const { view } = fakeView(scene);
    manager.setView(view);
    const element = new Rectangle(0, 0, 10, 10) as unknown as Element;
    const hitTest = vi.spyOn(scene, "hitTest").mockReturnValue(null);
    manager._mouseClick(click(1, 1));
    hitTest.mockReturnValue([]);
    manager._mouseClick(click(1, 1));
    hitTest.mockReturnValue([new ElementData(element, null)]);
    manager._mouseClick(click(1, 1));
    hitTest.mockReturnValue([new ElementData(element, { action: null })]);
    manager._mouseClick(click(1, 1));
    expect(hitTest).toHaveBeenCalledTimes(4);
  });
});
