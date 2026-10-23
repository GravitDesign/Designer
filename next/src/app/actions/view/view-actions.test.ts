import "../window.testing.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Locale } from "../../../engine/core/locale/locale.ts";
import type { Point } from "../../../engine/math/point.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { ScenePaintConfiguration } from "../../../engine/paint/scene-paint-configuration.ts";
import { FillPaintLayer } from "../../../engine/style/fill-paint-layer.ts";
import { setDesigner } from "../../shell/globals.ts";
import { Layout, type LayoutPart } from "../../shell/layout-ids.ts";
import { rect, setupDesigner, stubBrowserDocument, type Fixture } from "../actions.testing.ts";
import { setActionDesigner } from "../host.ts";
import { ChangeActiveWindowAction } from "./change-active-window-action.ts";
import { FastViewAction } from "./fast-view-action.ts";
import { FitAllAction } from "./fit-all-action.ts";
import { MagnificationAction } from "./magnification-action.ts";
import { OutlineViewAction } from "./outline-view-action.ts";
import { ShowGridAction } from "./show-grid-action.ts";
import { ShowGuideLinesAction } from "./show-guide-lines-action.ts";
import { ShowRulersAction } from "./show-rulers-action.ts";
import { ShowSelectionHandlesAction } from "./show-selection-handles-action.ts";
import { SnapUnitAction } from "./snap-unit-action.ts";
import { ToggleFullscreenAction } from "./toggle-fullscreen-action.ts";
import { ToggleGuideAction } from "./toggle-guide-action.ts";
import { TogglePaintLayersVisibilityAction } from "./toggle-paint-layers-visibility-action.ts";
import { ToggleSidebarAction } from "./toggle-sidebar-action.ts";
import { ToggleSnapAction } from "./toggle-snap-action.ts";
import { ZoomInAction } from "./zoom-in-action.ts";
import { ZoomOutAction } from "./zoom-out-action.ts";
import { known } from "./view-host.ts";

const PaintMode = ScenePaintConfiguration.PaintMode;

/** A view as the view actions use it: zoom, rulers, configuration and the zoom calls. */
function fakeView(zoom = 1) {
  const configuration: Record<string, unknown> = {
    paintMode: PaintMode.Full,
    guideLinesVisible: true,
    multiPageView: false,
  };
  const view = {
    zoom,
    rulers: false,
    calls: [] as unknown[][],
    getZoom: () => view.zoom,
    getScene: () => null as unknown,
    getViewConfiguration: () => configuration,
    hasRulers: () => view.rulers,
    setRulers: (visible: boolean) => {
      view.rulers = visible;
    },
    invalidate: () => {},
    invalidateAndResetCache: () => {},
    zoomAll: (...args: unknown[]) => view.calls.push(["zoomAll", ...args]),
    zoomAtCenter: (...args: unknown[]) => view.calls.push(["zoomAtCenter", ...args]),
  };
  return view;
}

type View = ReturnType<typeof fakeView>;

interface ViewFixture extends Fixture {
  view: View;
  settings: Record<string, unknown>;
  parts: Map<string, boolean>;
  windows: { list: unknown[]; active: unknown };
  zoomed: unknown[][];
  paintModes: string[];
}

/** The action test designer plus windows, settings, parts and the view calls. */
function setupViewDesigner(): ViewFixture {
  const fixture = setupDesigner();
  const view = fakeView();
  view.getScene = () => fixture.scene;
  const window = { getView: () => view };
  const windows = { list: [window] as unknown[], active: window as unknown };
  const settings: Record<string, unknown> = {
    snap_disabled: false,
    snap_zones: false,
    snap_guides: ["guide.grid", "guide.bbox"],
  };
  const parts = new Map<string, boolean>(
    Object.values(Layout).map((part: LayoutPart) => [part.id, true]),
  );
  const zoomed: unknown[][] = [];
  const paintModes: string[] = [];
  const document = fixture.document as unknown as Record<string, unknown>;
  document.getActiveWindow = () => windows.active;
  Object.assign(fixture.designer, {
    getWindows: () => ({
      getActiveWindow: () => windows.active,
      getWindows: () => windows.list,
      activateWindow: (next: unknown) => {
        windows.active = next;
      },
    }),
    getSetting: (key: string) => settings[key],
    setSetting: (key: string, value: unknown) => {
      settings[key] = value;
    },
    isPartVisible: (part: LayoutPart) => !!parts.get(part.id),
    setPartVisible: (part: LayoutPart, visible: boolean) => parts.set(part.id, visible),
    relayout: () => {},
    executeAction: (id: string) => fixture.actions.get(id)?.execute(),
    hasEventListeners: () => false,
    zoomAtViewCenter: (target: unknown, zoom: number) => zoomed.push([target, zoom]),
    setPaintMode: (mode: string) => {
      paintModes.push(mode);
      view.getViewConfiguration().paintMode = mode;
    },
    updateGEditorSceneConfigurationPaintMode: () => {},
  });
  return { ...fixture, view, settings, parts, windows, zoomed, paintModes };
}

let fixture: ViewFixture;
let mainframe: { classes: Set<string>; classList: { toggle(name: string, on: boolean): void } };

beforeEach(() => {
  const browser = stubBrowserDocument() as unknown as Record<string, unknown>;
  const classes = new Set<string>();
  mainframe = {
    classes,
    classList: { toggle: (name, on) => void (on ? classes.add(name) : classes.delete(name)) },
  };
  browser.getElementById = (id: string) => (id === "mainframe" ? mainframe : null);
  fixture = setupViewDesigner();
});

afterEach(() => {
  vi.unstubAllGlobals();
  setActionDesigner(null);
  setDesigner(null);
});

/** The fixture's page is 800x600; this makes it infinite. */
function infinitePage(): void {
  known(fixture.scene.getActivePage()).setProperties(["w", "h"], [0, 0]);
}

describe("Zoom In and Zoom Out", () => {
  it("step to the neighbouring zoom levels around the view", () => {
    const zoomIn = new ZoomInAction();
    const zoomOut = new ZoomOutAction();
    fixture.view.zoom = 1;
    zoomIn.execute();
    zoomOut.execute();
    // Between two levels: the next one up and the next one down.
    fixture.view.zoom = 0.7;
    zoomIn.execute();
    zoomOut.execute();
    expect(fixture.zoomed.map(([, zoom]) => zoom)).toEqual([1.5, 0.66, 1, 0.66]);
  });

  it("are disabled at the zoom limits", () => {
    fixture.view.zoom = 256;
    expect(new ZoomInAction().isEnabled()).toBe(false);
    expect(new ZoomOutAction().isEnabled()).toBe(true);
    fixture.view.zoom = 0.06;
    expect(new ZoomOutAction().isEnabled()).toBe(false);
  });

  it("keep the old ids, including zoom.out without the view prefix", () => {
    expect(new ZoomInAction().getId()).toBe("view.zoom.in");
    expect(new ZoomOutAction().getId()).toBe("zoom.out");
    expect(new ZoomInAction().isShortcutGlobal()).toBe(true);
  });
});

describe("Magnification", () => {
  it("zooms at the centre of everything painted, not at the view centre", () => {
    infinitePage();
    fixture.editor.insertElements([rect("A", 0, 0, 100, 40)], true);
    new MagnificationAction(400).execute();
    const [name, center, zoom] = fixture.view.calls[0] as [string, Point, number];
    expect(name).toBe("zoomAtCenter");
    expect([center.getX(), center.getY(), zoom]).toEqual([50, 20, 4]);
  });

  it("has one id per level and shortcuts for four of them", () => {
    const shortcuts = MagnificationAction.ZOOM_LEVELS.filter((level) =>
      new MagnificationAction(level).getShortcut(),
    );
    expect(shortcuts).toEqual([50, 100, 400, 800]);
    expect(new MagnificationAction(25).getId()).toBe("view.magnification.25");
    expect(new MagnificationAction(25).getTitle()).toBe("25%");
  });
});

describe("Fit All", () => {
  it("fits everything painted on an infinite page and is disabled when nothing is", () => {
    infinitePage();
    const action = new FitAllAction();
    expect(action.isEnabled()).toBe(false);
    fixture.editor.insertElements([rect("A", 10, 20, 30, 40)], true);
    expect(action.isEnabled()).toBe(true);
    action.execute();
    const [name, box, reduceOnly] = fixture.view.calls[0] as [string, Rect, boolean];
    expect(name).toBe("zoomAll");
    expect([box.getX(), box.getY(), box.getWidth(), box.getHeight(), reduceOnly]).toEqual([
      10,
      20,
      30,
      40,
      false,
    ]);
  });

  it("fits the page of a fixed-size document", () => {
    fixture.editor.insertElements([rect("A", 10, 20, 30, 40)], true);
    known(fixture.scene.getActivePage()).setProperties(["w", "h"], [300, 200]);
    new FitAllAction().execute();
    const box = known(fixture.view.calls[0])[1] as Rect;
    expect([box.getX(), box.getY(), box.getWidth(), box.getHeight()]).toEqual([0, 0, 300, 200]);
  });
});

describe("Show Grid", () => {
  it("writes the grid mode into the document, back to the last mode", () => {
    const action = new ShowGridAction();
    expect(action.isChecked()).toBe(false);
    action.execute();
    expect(fixture.scene.getProperty("gm")).toBe("box");
    expect(action.isChecked()).toBe(true);
    action.execute();
    expect(fixture.scene.getProperty("gm")).toBe(null);
    fixture.scene.setProperty("lgm", "axo");
    action.execute();
    expect(fixture.scene.getProperty("gm")).toBe("axo");
  });
});

describe("Show Rulers", () => {
  it("turns the guide lines back on with the rulers and stores the setting", () => {
    const guideLines = fixture.register(new ShowGuideLinesAction());
    const rulers = new ShowRulersAction();
    guideLines.execute();
    expect(fixture.settings.guide_lines_visible).toBe(false);
    rulers.execute();
    expect(fixture.view.rulers).toBe(true);
    expect(mainframe.classes.has("rulers")).toBe(true);
    expect(guideLines.isChecked()).toBe(true);
    expect(fixture.settings).toMatchObject({ rulers_visible: true, guide_lines_visible: true });
    // Hiding the rulers leaves the guide lines alone.
    rulers.execute();
    expect([fixture.view.rulers, guideLines.isChecked()]).toEqual([false, true]);
  });
});

describe("Snapping", () => {
  it("Enable Snapping flips snap_disabled; the guide toggles follow it", () => {
    const snap = new ToggleSnapAction();
    const grid = new ToggleGuideAction("guide.grid", "Grid");
    expect([snap.isChecked(), grid.isEnabled(), grid.isChecked()]).toEqual([true, true, true]);
    snap.execute();
    expect(fixture.settings.snap_disabled).toBe(true);
    expect([snap.isChecked(), grid.isEnabled()]).toEqual([false, false]);
  });

  it("a guide toggle adds or removes its id in a new snap_guides list", () => {
    const before = fixture.settings.snap_guides;
    new ToggleGuideAction("guide.grid", "Grid").execute();
    expect(fixture.settings.snap_guides).toEqual(["guide.bbox"]);
    expect(before).toEqual(["guide.grid", "guide.bbox"]);
    new ToggleGuideAction("guide.points", "Anchor Points").execute();
    expect(fixture.settings.snap_guides).toEqual(["guide.bbox", "guide.points"]);
    expect(new ToggleGuideAction("guide.grid", "Grid").getTitle()).toBe(
      (Locale.getValue("GCommonNames", "text.snap-to-action") as string).replace("%action", "Grid"),
    );
  });
});

describe("Snap to Full / Half Pixel", () => {
  it("rounds the geometry box; half adds .5 to position and size", () => {
    const a = rect("A", 10.3, 20.6, 30.4, 40.2);
    fixture.editor.insertElements([a], true);
    new SnapUnitAction(SnapUnitAction.Type.FullUnit).execute([a]);
    const rounded = () => {
      const box = known(a.getGeometryBBox());
      return [box.getX(), box.getY(), box.getWidth(), box.getHeight()].map(
        (value) => Math.round(value * 1e9) / 1e9,
      );
    };
    expect(rounded()).toEqual([10, 21, 30, 40]);
    new SnapUnitAction(SnapUnitAction.Type.HalfUnit).execute([a]);
    expect(rounded()).toEqual([10.5, 21.5, 30.5, 40.5]);
    expect(fixture.editor.getUndoStateName()).toBe("Snap to Half Units");
  });
});

describe("Outline and fast view", () => {
  it("outline goes back to Full on an infinite page and to Output on a clipped fixed page", () => {
    const outline = new OutlineViewAction();
    infinitePage();
    outline.execute();
    expect(outline.isChecked()).toBe(true);
    outline.execute();
    known(fixture.scene.getActivePage()).setProperties(["w", "h"], [100, 100]);
    outline.execute();
    outline.execute();
    expect(fixture.paintModes).toEqual([
      PaintMode.Outline,
      PaintMode.Full,
      PaintMode.Outline,
      PaintMode.Output,
    ]);
  });

  it("fast view ignores the page clip setting on a fixed page", () => {
    const fast = new FastViewAction();
    const page = known(fixture.scene.getActivePage());
    page.setProperties(["w", "h"], [100, 100]);
    // "cce" 1 means "don't clip"; outline view honours it, fast view doesn't.
    page.setProperty("cce", 1, true);
    fast.execute();
    expect(fixture.view.getViewConfiguration().defaultEffectDetailLevel).toBeGreaterThan(0);
    fast.execute();
    new OutlineViewAction().execute();
    new OutlineViewAction().execute();
    expect(fixture.paintModes).toEqual([
      PaintMode.Fast,
      PaintMode.Output,
      PaintMode.Outline,
      PaintMode.Full,
    ]);
    expect(fixture.view.getViewConfiguration().defaultEffectDetailLevel).toBe(null);
  });
});

describe("Show Selection Handles", () => {
  it("hides the handles of the selection and keeps the last answer without one", () => {
    const action = new ShowSelectionHandlesAction();
    expect([action.isEnabled(), action.isChecked()]).toEqual([false, true]);
    fixture.editor.insertElements([rect("A", 0)], true);
    expect(action.isChecked()).toBe(true);
    action.execute();
    expect(action.isChecked()).toBe(false);
    fixture.editor.clearSelection();
    expect(action.isChecked()).toBe(false);
  });
});

describe("Change active window", () => {
  it("wraps around in both directions and needs two windows", () => {
    const [w1, w2, w3] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const next = new ChangeActiveWindowAction(ChangeActiveWindowAction.Type.Next);
    const previous = new ChangeActiveWindowAction(ChangeActiveWindowAction.Type.Previous);
    fixture.windows.list = [w1];
    expect(next.isEnabled()).toBe(false);
    fixture.windows.list = [w1, w2, w3];
    fixture.windows.active = w3;
    next.execute();
    expect(fixture.windows.active).toBe(w1);
    previous.execute();
    expect(fixture.windows.active).toBe(w3);
    expect(next.getId()).toBe("view.change-active-window.next");
  });
});

describe("Fullscreen", () => {
  it("hides the parts and brings back only the ones that were visible", () => {
    const action = new ToggleFullscreenAction();
    fixture.register(new FitAllAction());
    fixture.parts.set(Layout.LeftSidebars.id, false);
    expect(action.isFullscreen()).toBe(false);
    action.execute();
    expect(action.isFullscreen()).toBe(true);
    action.execute();
    expect([
      fixture.parts.get(Layout.Header.id),
      fixture.parts.get(Layout.Toolbar.id),
      fixture.parts.get(Layout.Panels.id),
      fixture.parts.get(Layout.RightSidebars.id),
      fixture.parts.get(Layout.LeftSidebars.id),
    ]).toEqual([true, true, true, true, false]);
  });
});

describe("Toggle sidebar", () => {
  it("activates the sidebar, or hides its side when it is the active one", () => {
    let active: string | null = "library";
    const sidebars = {
      getActiveSidebar: () => active,
      setActiveSidebar: (id: string | null) => {
        active = id;
      },
      getSidebarsPart: () => Layout.LeftSidebars,
    };
    Object.assign(fixture.designer, { getLeftSidebars: () => sidebars });
    // Sidebars.setOrientationStateInSetting goes through the shell's designer().
    setDesigner(fixture.designer as never);
    const sidebar = {
      getId: () => "outline",
      getTitle: () => "Layers",
      getOrientation: () => "left",
      isVisible: () => true,
    };
    const action = new ToggleSidebarAction(sidebar as never);
    expect(action.getId()).toBe("view.toggle-sidebar.outline");
    action.execute();
    expect([active, fixture.parts.get("left-sidebars")]).toEqual(["outline", true]);
    action.execute();
    expect([active, fixture.parts.get("left-sidebars")]).toEqual([null, false]);
    expect(fixture.settings.sidebars_left_active).toBe(false);
  });
});

describe("Toggle fill / border visibility", () => {
  it("shows hidden fills, hides visible ones, hides a mixed selection", () => {
    const a = rect("A", 0);
    const b = rect("B", 20);
    for (const node of [a, b]) known(node.getPaintLayers()).appendChild(new FillPaintLayer());
    fixture.editor.insertElements([a, b], true);
    const fill = (node: typeof a) => known(known(node.getPaintLayers()).getFillLayers()[0]);
    const action = new TogglePaintLayersVisibilityAction(
      TogglePaintLayersVisibilityAction.Type.Fill,
    );
    fill(a).setProperty("_vs", true);
    fill(b).setProperty("_vs", true);
    action.execute();
    expect([fill(a).getProperty("_vs"), fill(b).getProperty("_vs")]).toEqual([false, false]);
    action.execute();
    expect([fill(a).getProperty("_vs"), fill(b).getProperty("_vs")]).toEqual([true, true]);
    fill(b).setProperty("_vs", false);
    action.execute();
    expect([fill(a).getProperty("_vs"), fill(b).getProperty("_vs")]).toEqual([false, false]);
  });
});
