import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EventTarget } from "../../engine/core/event-target.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import type { FakeCanvas, FakeContext2D } from "../../engine/paint/testing/fake-canvas.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import type { Editor } from "../editor.ts";
import { EditorWidget } from "./editor-widget.ts";
import { installFakeDom, runAllFrames, type FakeElement } from "./testing/fake-dom.ts";

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
    // Snaps to whole tens.
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
