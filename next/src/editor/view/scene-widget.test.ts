import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MouseEvent, MouseWheelEvent } from "../../engine/core/mouse-event.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import {
  InvalidationFinishedEvent,
  InvalidationRequestEvent,
  Scene,
} from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { SceneWidget } from "./scene-widget.ts";
import {
  installFakeDom,
  pendingFrames,
  runAllFrames,
  type FakeElement,
} from "./testing/fake-dom.ts";

let uninstall: () => void;
beforeEach(() => {
  uninstall = installFakeDom();
});
afterEach(() => {
  Platform.modifiers.ctrlKey = false;
  Platform.modifiers.shiftKey = false;
  uninstall();
});

/** A view laid out like the app's: 1600 x 1000, panels over its edges, 10px margin. */
function appView(): { view: SceneWidget; scene: Scene } {
  const scene = new Scene(new Workspace());
  const view = new SceneWidget(scene);
  view.setViewOffset([250, 73, 300, 0]);
  view.setViewMargin([10, 10, 10, 10]);
  view.resize(1600, 1000);
  runAllFrames();
  return { view, scene };
}

const state = (view: SceneWidget) => [view.getZoom(), view.getScrollX(), view.getScrollY()];
const box = (rect: Rect) => [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()];

function wheel(view: SceneWidget, deltaY: number, at = new Point(600, 400)): void {
  const event = new MouseWheelEvent();
  event.deltaX = 0;
  event.deltaY = deltaY;
  event.client = at;
  view.trigger(event);
}

describe("SceneWidget", () => {
  it("builds the element canvas, the input layer, the hint and the IME box", () => {
    const { view } = appView();
    const element = view._htmlElement as unknown as FakeElement;
    expect(element.className).toBe(" g-scene-widget");
    const kinds = element.children.map((child) =>
      "tagName" in child ? child.tagName + "." + child.className : "canvas",
    );
    expect(kinds).toEqual(["canvas", "DIV.", "DIV.inline-hint", "DIV."]);
    const ime = (element.children[3] as FakeElement).firstChild as FakeElement;
    expect(ime.className).toBe(SceneWidget.GRAVIT_IME);
  });

  it("measures the view box inside the offset and the margin", () => {
    const { view } = appView();
    expect(box(view.getViewBox(true))).toEqual([250, 73, 1050, 927]);
    expect(box(view.getViewBox())).toEqual([260, 83, 1030, 907]);
  });

  it("zooms around a point in the middle of the view box, within the zoom limits", () => {
    const { view } = appView();
    view.zoomAtCenter(new Point(100, 50), 2);
    // 100 * 2 - 775 and 50 * 2 - 536.5, rounded (-436.5 rounds up).
    expect(state(view)).toEqual([2, -575, -436]);
    view.zoomAtCenter(new Point(0, 0), 1000);
    expect(view.getZoom()).toBe(256);
    view.zoomAtCenter(new Point(0, 0), 0.001);
    expect(view.getZoom()).toBe(0.06);
    const world = view.getViewTransform().mapPoint(view.getViewBox().getSide(Rect.Side.CENTER));
    // The scroll is rounded to device pixels: half a pixel at 6% is 8.33 units.
    expect(world.getX()).toBe(0);
    expect(world.getY()).toBeCloseTo(0.5 / 0.06, 6);
  });

  it("fits an area and keeps a zoomed point in place", () => {
    const { view } = appView();
    view.zoomAll(new Rect(0, 0, 2060, 907), false);
    expect(view.getZoom()).toBe(0.5);
    const point = new Point(120, 80);
    const before = view.getWorldTransform().mapPoint(point);
    view.zoomAt(point, 3);
    const after = view.getWorldTransform().mapPoint(point);
    expect(Math.abs(after.getX() - before.getX())).toBeLessThanOrEqual(0.5);
    expect(Math.abs(after.getY() - before.getY())).toBeLessThanOrEqual(0.5);
  });

  it("ignores scrolls under half a pixel and reports the scroll made", () => {
    const { view } = appView();
    expect(view.scrollBy(0.4, -0.5)).toBeNull();
    const moved = view.scrollBy(10.6, -3.2) as Point;
    expect([moved.getX(), moved.getY()]).toEqual([11, -3]);
    expect(state(view)).toEqual([1, 11, -3]);
  });

  it("zooms with Ctrl + wheel in steps that stop at the zoom stops", () => {
    const { view } = appView();
    Platform.modifiers.ctrlKey = true;
    const zooms: number[] = [];
    for (let i = 0; i < 3; i++) {
      wheel(view, -100);
      zooms.push(view.getZoom());
    }
    // 1 + 20 / 37.5 / 1.6 = 1.333..., then past the 1.5 stop.
    expect(zooms[0]).toBeCloseTo(1.3333333, 6);
    expect(zooms[1]).toBe(1.5);
    expect(zooms[2]).toBe(2);
    expect(view._isZooming).toBe(true);
  });

  it("scrolls with the wheel, sideways with Shift", () => {
    const { view } = appView();
    wheel(view, 120);
    expect(state(view)).toEqual([1, 0, 120]);
    Platform.modifiers.shiftKey = true;
    wheel(view, 90);
    expect(state(view)).toEqual([1, 90, 120]);
    expect(view._isPanning).toBe(true);
  });

  it("schedules one repaint for any number of invalidations", () => {
    const { view } = appView();
    expect(view._repaintRequestFrameId).toBeNull();
    expect(view.invalidate(new Rect(10, 10, 20, 20), true)).toBe(true);
    expect(view.invalidate(new Rect(100, 10, 20, 20))).toBe(true);
    expect(pendingFrames()).toBe(1);
    runAllFrames();
    expect(view._repaintRequestFrameId).toBeNull();
  });

  it("reports an invalidation with nothing new to paint as finished", () => {
    const { view, scene } = appView();
    const finished: unknown[] = [];
    scene.addEventListener(InvalidationFinishedEvent, (event: InvalidationFinishedEvent) =>
      finished.push(event.configuration),
    );
    expect(view.invalidate(new Rect(5000, 5000, 10, 10))).toBe(false);
    expect(finished).toEqual([view.getViewConfiguration()]);
    view._recordedTransactionStarted();
    view.invalidate(new Rect(5000, 5000, 10, 10));
    expect(finished).toHaveLength(1);
    view._recordedTranactionFinished();
    expect(finished).toHaveLength(2);
  });

  it("repaints the mapped area of a scene invalidation and drops its cached tiles", () => {
    const { view, scene } = appView();
    view.zoomAtCenter(new Point(0, 0), 2);
    runAllFrames();
    const dirty: number[][] = [];
    const original = view._sceneCanvas.setDirtyCache.bind(view._sceneCanvas);
    view._sceneCanvas.setDirtyCache = (area, scale, x, y) => {
      if (area) dirty.push([...box(area), scale, x, y]);
      original(area, scale, x, y);
    };
    scene.trigger(new InvalidationRequestEvent(new Rect(0, 0, 10, 10)));
    // World (0,0)-(10,10) at 200%, scrolled by (-775, -536), grown by 2.
    expect(dirty).toEqual([[773, 534, 24, 24, 2, -775, -536]]);
  });

  it("lays the rulers out along the view offset", () => {
    const { view } = appView();
    view.setRulers(true);
    const horizontal = view._horizontalRuler as NonNullable<SceneWidget["_horizontalRuler"]>;
    const vertical = view._verticalRuler as NonNullable<SceneWidget["_verticalRuler"]>;
    const unit = view._unitRuler as NonNullable<SceneWidget["_unitRuler"]>;
    expect([
      horizontal.getX(),
      horizontal.getY(),
      horizontal._width,
      horizontal.getHeight(),
    ]).toEqual([269, 73, 1031, 19]);
    expect([vertical.getX(), vertical.getY(), vertical.getWidth(), vertical._height]).toEqual([
      250, 92, 19, 908,
    ]);
    expect([unit.getX(), unit.getY()]).toEqual([250, 73]);
    // The ruler's zero follows the scroll: offset = -scrollX - 250 - 19.
    view.scrollBy(-100, 0);
    expect(horizontal._offset).toBe(100 - 269);
    view.setRulers(false);
    expect(view.hasRulers()).toBe(false);
    expect((view._htmlElement as unknown as FakeElement).children).toHaveLength(4);
  });

  it("hides the inline hint when the pointer leaves", () => {
    const { view } = appView();
    view.updateInlineHint("a\nb", new Point(100, 50), Rect.Side.TOP_LEFT);
    const hint = view._inlineHintDiv as unknown as FakeElement;
    expect([hint.innerHTML, hint.style.left, hint.style.top, hint.style.display]).toEqual([
      "a<br>b",
      "100px",
      "50px",
      "",
    ]);
    view.trigger(new MouseEvent.Leave());
    expect(hint.style.visibility).toBe("hidden");
    view.trigger(new MouseEvent.Enter());
    expect(hint.style.visibility).toBe("");
    view.updateInlineHint(null);
    expect(hint.style.display).toBe("none");
  });

  it("lets go of the scene and its frames when released", () => {
    const { view, scene } = appView();
    view.invalidate(new Rect(0, 0, 10, 10));
    expect(pendingFrames()).toBe(1);
    view.release();
    expect(pendingFrames()).toBe(0);
    expect(scene.isReleased()).toBe(true);
    expect(scene.hasEventListeners(InvalidationRequestEvent)).toBe(false);
  });
});
