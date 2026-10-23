import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MouseEvent, MouseWheelEvent } from "../../engine/core/mouse-event.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Hardware, System } from "../../engine/core/system.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import {
  InvalidationFinishedEvent,
  InvalidationRequestEvent,
  Scene,
} from "../../engine/scene/scene.ts";
import { RendererConfig } from "../../engine/paint/renderer-config.ts";
import { ScenePaintConfiguration } from "../../engine/paint/scene-paint-configuration.ts";
import type { FakeCanvas, FakeContext2D } from "../../engine/paint/testing/fake-canvas.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { SceneWidget } from "./scene-widget.ts";
import {
  installFakeDom,
  pendingFrames,
  runAllFrames,
  runFrames,
  setDevicePixelRatio,
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

// The recorded old values went through JSON, which writes -0 as 0.
const state = (view: SceneWidget) =>
  [view.getZoom(), view.getScrollX(), view.getScrollY()].map((value) => value + 0);
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
  it("resizes after a pending repaint has run, once, with the last size asked for", () => {
    const { view } = appView();
    view.invalidate(new Rect(0, 0, 10, 10));
    const done: string[] = [];
    view.resize(1200, 800, false, () => done.push("first"));
    // The widget takes the size at once; the canvases wait for the frame.
    expect([view.getWidth(), view.getHeight()]).toEqual([1200, 800]);
    expect(view._elementCanvas.getWidth()).toBe(1600);
    // A second resize before the frame replaces the first one.
    view.resize(1000, 700, false, () => done.push("second"));
    expect(pendingFrames()).toBe(2);
    runFrames();
    expect(done).toEqual(["second"]);
    expect([view._elementCanvas.getWidth(), view._elementCanvas.getHeight()]).toEqual([1000, 700]);
    expect(box(view._dirtySceneList.getArea() as Rect)).toEqual([0, 0, 1000, 700]);
    runAllFrames();
    expect(done).toEqual(["second"]);
  });

  it("resizes after a pending pan finish has run", () => {
    const { view } = appView();
    view.beginPan();
    view.scrollBy(40, 0);
    view.finishPan();
    expect(view._finishPanRequestFrameId).not.toBeNull();
    let done = 0;
    view.resize(1000, 700, false, () => done++);
    expect(view._sceneCanvas.getWidth()).toBe(1600);
    runAllFrames();
    expect(done).toBe(1);
    expect(view._finishPanRequestFrameId).toBeNull();
    expect([view._sceneCanvas.getWidth(), view._sceneCanvas.getHeight()]).toEqual([1000, 700]);
  });

  it("drops every cached tile at the logical zoom and scroll when the cache is reset", () => {
    const { view } = appView();
    view.zoomAtCenter(new Point(0, 0), 2);
    runAllFrames();
    const calls: (number[] | null)[][] = [];
    view._sceneCanvas.setDirtyCache = (area, scale, x, y) => {
      calls.push([area ? box(area) : null, [scale, x, y]]);
    };
    view.invalidateAndResetCache(null);
    expect(calls).toEqual([
      [
        [0, 0, 1600, 1000],
        [2, -775, -536],
      ],
    ]);
    // The whole scene is repainted.
    expect(view._dirtySceneList.flush()?.getDirtyRectangles()?.map(box)).toEqual([
      [0, 0, 1600, 1000],
    ]);
    view.invalidateAndResetCache(new Rect(10, 20, 0, 5));
    expect(calls).toHaveLength(1);
  });

  it("sizes the tile cache for the hardware and cleans it on request", () => {
    const { view } = appView();
    const saved = [
      System.hardware,
      RendererConfig.MAX_CACHED_ZOOM_LEVELS,
      RendererConfig.MAX_CACHED_PER_ONE_ZOOM,
    ] as const;
    try {
      System.hardware = Hardware.Tablet;
      view.configureCache();
      expect([
        RendererConfig.MAX_CACHED_ZOOM_LEVELS,
        RendererConfig.MAX_CACHED_PER_ONE_ZOOM,
      ]).toEqual([3, 21]);
      System.hardware = Hardware.Desktop;
      view.configureCache();
      expect([
        RendererConfig.MAX_CACHED_ZOOM_LEVELS,
        RendererConfig.MAX_CACHED_PER_ONE_ZOOM,
      ]).toEqual([5, 64]);
      let cleaned = 0;
      view._sceneCanvas.cleanCache = () => {
        cleaned++;
      };
      view.cleanCache();
      expect(cleaned).toBe(1);
    } finally {
      System.hardware = saved[0];
      RendererConfig.MAX_CACHED_ZOOM_LEVELS = saved[1];
      RendererConfig.MAX_CACHED_PER_ONE_ZOOM = saved[2];
    }
  });

  // Recorded from the old app: GSceneWidget (module 363) on a GScene with a
  // 400 x 300 page, view 800 x 600 without offsets.
  it.each([
    {
      mode: null,
      expected: [
        [1, 0, 0],
        [1, -200, -150],
        [1, -200, -150],
        [4, 400, 300],
        [4, -20, 0],
        [4, 820, 620],
        [4, 790, 620],
      ],
    },
    {
      // The old code measures the active page's unscaled box against the
      // view in output mode, so the page always counts as smaller and stays
      // centered.
      mode: ScenePaintConfiguration.PaintMode.Output,
      expected: [
        [1, 0, 0],
        [1, -200, -150],
        [1, -200, -150],
        [4, 400, 300],
        [4, 400, 300],
        [4, 400, 300],
        [4, 400, 300],
      ],
    },
  ])(
    "keeps the content within reach with limitScrollingToView (paint mode $mode)",
    ({ mode, expected }) => {
      SceneWidget.options.limitScrollingToView = true;
      try {
        const scene = new Scene(new Workspace());
        (scene.getActivePage() as Page).setProperties(["w", "h"], [400, 300]);
        const view = new SceneWidget(scene);
        if (mode !== null) view.getViewConfiguration().paintMode = mode;
        view.setViewOffset([0, 0, 0, 0]);
        view.resize(800, 600);
        const log = [state(view)];
        view.scrollBy(-500, -400);
        log.push(state(view));
        view.scrollBy(1000, 1000);
        log.push(state(view));
        view.zoomAtCenter(new Point(200, 150), 4);
        log.push(state(view));
        view.scrollBy(-5000, -5000);
        log.push(state(view));
        view.scrollBy(5000, 5000);
        log.push(state(view));
        view.scrollBy(-30, 20);
        log.push(state(view));
        expect(log).toEqual(expected);
      } finally {
        SceneWidget.options.limitScrollingToView = false;
      }
    },
  );

  it("keeps the watermark over the composited screen", () => {
    const { view } = appView();
    const watermark = document.createElement("canvas") as unknown as FakeCanvas;
    view.getViewConfiguration().watermark = watermark;
    const element = view._elementCanvas._canvasContext.canvas as unknown as FakeCanvas;
    const helper = view._watermarkHelperCanvas._canvasContext.canvas as unknown as FakeCanvas;
    const log = contextLog(element);
    const helperLog = contextLog(helper);
    log.length = 0;
    helperLog.length = 0;
    view.invalidate(new Rect(10, 10, 20, 20));
    runAllFrames();
    const draws = (entries: string[]) =>
      entries.filter((entry) => /^(clearRect|drawImage|createPattern|fillRect)\(/.test(entry));
    // First the screen without the watermark comes back from the helper,
    // then the tiles are drawn in the dirty area; afterwards the helper
    // saves the new screen and the watermark texture covers everything.
    expect(draws(log)).toEqual([
      "clearRect(0,0,1600,1000)",
      `drawImage(canvas#${helper.id},0,0)`,
      "clearRect(10,10,20,20)",
      expect.stringMatching(/^drawImage\(canvas#\d+,10,10,20,20,10,10,20,20\)$/),
      `createPattern(canvas#${watermark.id},"repeat")`,
      "fillRect(0,0,1600,1000)",
    ]);
    expect(draws(helperLog)).toEqual([
      "clearRect(0,0,1600,1000)",
      `drawImage(canvas#${element.id},0,0)`,
    ]);
    view.getViewConfiguration().watermark = null;
    log.length = 0;
    view.invalidate(new Rect(10, 10, 20, 20));
    runAllFrames();
    expect(draws(log)).toEqual([
      "clearRect(10,10,20,20)",
      expect.stringMatching(/^drawImage\(canvas#\d+,10,10,20,20,10,10,20,20\)$/),
    ]);
  });
});

describe("SceneWidget at device pixel ratio 2", () => {
  function retinaView(): { view: SceneWidget; scene: Scene } {
    setDevicePixelRatio(2);
    return appView();
  }

  it("gives every canvas and both dirty lists device pixels", () => {
    const { view } = retinaView();
    const element = view._elementCanvas._canvasContext.canvas;
    expect([element.width, element.height, element.style.width, element.style.height]).toEqual([
      3200,
      2000,
      "1600px",
      "1000px",
    ]);
    for (const canvas of [view._sceneCanvas, view._panHelperCanvas, view._watermarkHelperCanvas])
      expect([canvas.getWidth(), canvas.getHeight()]).toEqual([3200, 2000]);
    expect(box(view._dirtySceneList.getArea() as Rect)).toEqual([0, 0, 3200, 2000]);
    expect(box(view._dirtyElementList.getArea() as Rect)).toEqual([0, 0, 3200, 2000]);
    expect(view.getLogicalZoom()).toBe(2);
    // The view box center (775, 536.5) in device pixels.
    view.zoomAtCenter(new Point(0, 0), 1);
    expect(state(view)).toEqual([1, -1550, -1073]);
  });

  it("places the inline hint in CSS pixels", () => {
    const { view } = retinaView();
    const hint = view._inlineHintDiv as unknown as FakeElement;
    hint.offsetWidth = 40;
    hint.offsetHeight = 20;
    view.updateInlineHint("hint", new Point(200, 100), Rect.Side.CENTER);
    expect([hint.style.left, hint.style.top]).toEqual(["80px", "40px"]);
    view.updateInlineHint("hint", new Point(200, 100), Rect.Side.BOTTOM_RIGHT);
    expect([hint.style.left, hint.style.top]).toEqual(["60px", "30px"]);
  });

  it("moves the ruler markers to the pointer in CSS pixels and the ruler zero in device pixels", () => {
    const { view } = retinaView();
    view.setRulers(true);
    const horizontal = view._horizontalRuler as NonNullable<SceneWidget["_horizontalRuler"]>;
    const vertical = view._verticalRuler as NonNullable<SceneWidget["_verticalRuler"]>;
    const move = new MouseEvent.Move();
    move.client = new Point(1000, 600);
    view.trigger(move);
    // 1000 / 2 - 19 - 250 and 600 / 2 - 19 - 73.
    expect((horizontal._mouseMarker as unknown as FakeElement).style.left).toBe("231px");
    expect((vertical._mouseMarker as unknown as FakeElement).style.top).toBe("208px");
    // The zero: -scrollX - (250 + 19) * 2.
    view.scrollBy(-100, 0);
    expect(horizontal._offset).toBe(100 - 538);
  });
});

function contextLog(canvas: FakeCanvas): string[] {
  return (canvas.getContext("2d") as FakeContext2D).log;
}
