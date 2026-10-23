/**
 * Interim stand-in for the document windows (GWindows and GWindow in
 * designer.browser.dev.js, the app-shell cluster of phase 7): it shows the
 * active document's GEditorWidget where the old app had it, and the
 * app.view() hook the scenarios use.
 *
 * The old page (1600 x 1000 in the parity browser) was
 *
 *     body > #mainframe(.rulers) > .frame > #windows > .window > view
 *
 * with the header, toolbar and sidebars laid over the canvas. The view
 * filled the window and kept the panels out through its view offset
 * (left sidebar 250px, header and toolbar 73px, right sidebar 300px) and a
 * view margin of 10px (GWindow.VIEW_MARGIN). This file builds the same
 * elements, with empty panel elements in the old positions: the old
 * style sheet gives them their backgrounds and the shadows that fall onto
 * the rulers and the canvas edge.
 *
 * What it ports:
 * - GWindow._updateScene: a new view for the document's scene when the
 *   document is ready and the scene changed (a loaded file replaces the
 *   empty scene it was opened with), with the view margin, the window
 *   background (white for an infinite canvas) and "needs centering";
 * - GWindows.activateWindow and GWindow.relayout / activate / deactivate:
 *   the active window's container is the only one in #windows; it gets
 *   the size of #windows, the view offset and a resize (which scrolls by
 *   half the size change), then centerAndZoom once, the rulers and guide
 *   settings, and the focus; a deactivated window drops its tile cache;
 * - GWindow.centerAndZoom;
 * - removing a window: the view is released (GSceneWidget.release) and
 *   the container removed;
 * - from the page properties panel (GPageProperties._pageActivationEventHandler
 *   and _propertiesUpdateEventHandler), which the old app ran on every
 *   window activation: a fixed-size page shows its content clipped (paint
 *   mode Output) unless its "cce" setting says otherwise, an infinite one
 *   is never clipped;
 * - from GDesigner boot: the page shadow of GEditorPaintConfiguration,
 *   the theme style sheet and what _setTheme / _updateTheme derive from
 *   it (guide line colours, the label colour, the rulers recreated).
 *
 * The settings (rulers_visible, guide_lines_visible, symbol_labels_visible,
 * theme) are read from localStorage "designer.settings" with the old
 * defaults; the settings store comes with the shell.
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { PaintContext } from "../../engine/paint/paint-context.ts";
import { ScenePaintConfiguration } from "../../engine/paint/scene-paint-configuration.ts";
import {
  AfterFlagChangeEvent,
  AfterPropertiesChangeEvent,
} from "../../engine/scene/node-events.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { EditorOptions } from "../../editor/editor-options.ts";
import { EditorPaintConfiguration } from "../../editor/editor-paint-configuration.ts";
import { EditorWidget } from "../../editor/view/editor-widget.ts";
import {
  documentStatusName,
  getActiveDocument,
  getDocuments,
  onDocumentsChanged,
  type InterimDocument,
} from "./document.ts";

/** GWindow.VIEW_MARGIN. */
const VIEW_MARGIN = 10;

/**
 * The panels' sizes over the canvas at the parity window size (measured in
 * the old app): left sidebar, header plus toolbar, right sidebar, footer.
 */
const VIEW_OFFSET = [250, 73, 300, 0];

/** Settings this host reads, with the defaults GDesigner set. */
interface ViewSettings {
  theme: string;
  rulers_visible: boolean;
  guide_lines_visible: boolean;
  symbol_labels_visible: boolean;
}

const DEFAULT_SETTINGS: ViewSettings = {
  theme: "light",
  rulers_visible: false,
  guide_lines_visible: true,
  symbol_labels_visible: true,
};

function readSettings(): ViewSettings {
  let stored: Partial<ViewSettings>;
  try {
    stored = JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as Partial<ViewSettings>;
  } catch {
    stored = {};
  }
  return { ...DEFAULT_SETTINGS, ...stored };
}

/** A document as this host uses it. */
type HostedDocument = InterimDocument;

/** One document's window (GWindow). */
interface ViewWindow {
  document: HostedDocument;
  container: HTMLDivElement;
  view: EditorWidget | null;
  requiresViewTransformation: boolean;
  /** The scene listeners of the page properties stand-in. */
  sceneListeners: {
    scene: Scene;
    flag: (event: AfterFlagChangeEvent) => void;
    properties: (event: AfterPropertiesChangeEvent) => void;
  } | null;
}

const windows: ViewWindow[] = [];
let activeWindow: ViewWindow | null = null;
let windowsElement: HTMLDivElement | null = null;
let mainframe: HTMLDivElement | null = null;

// GDesigner boot: the page shadow of the editor views.
EditorPaintConfiguration.prototype.pageDecoration.shadow = 4;
EditorPaintConfiguration.prototype.pageDecoration.shadowOffsetY = 2;
EditorPaintConfiguration.prototype.pageDecoration.shadowBackground = "rgba(0,0,0,0.25)";

/** Builds #mainframe with #windows and the empty panel elements, once. */
function ensureShell(): HTMLDivElement {
  if (windowsElement) return windowsElement;
  mainframe = document.createElement("div");
  mainframe.id = "mainframe";
  const frame = document.createElement("div");
  frame.className = "frame";
  windowsElement = document.createElement("div");
  windowsElement.id = "windows";
  frame.appendChild(windowsElement);
  // The panels in the old order, with the inline positions the old
  // layout gave them; the style sheet does the rest.
  const panels: [string, string][] = [
    ["header", "top: 0px;"],
    ["toolbar", "left: 0px; top: 36px; right: 0px;"],
    ["left-sidebars", "width: 250px; top: 73px; height: 927px;"],
    ["right-sidebars", "width: 300px; top: 73px; height: 927px;"],
  ];
  for (const [id, style] of panels) {
    const panel = document.createElement("div");
    panel.id = id;
    panel.setAttribute("style", style);
    frame.appendChild(panel);
  }
  mainframe.appendChild(frame);
  document.body.insertBefore(mainframe, document.body.firstChild);
  applyTheme(readSettings().theme);
  return windowsElement;
}

/**
 * GDesigner._setTheme: the theme's style sheet, the guide line colours,
 * the rulers recreated (they read their colour from the style sheet) and
 * the label colour (_updateTheme).
 */
function applyTheme(theme: string): void {
  if (!theme || "default" === theme) theme = "light";
  const link = document.querySelector<HTMLLinkElement>('head > link[href$=".css"]');
  const done = (): void => {
    EditorOptions.guideLineColor =
      "light" === theme ? new RGBColor([107, 156, 228]) : new RGBColor([227, 0, 97]);
    EditorOptions.guideLineHintColor = "light" === theme ? "blue" : "#F790B6";
    for (const win of windows) {
      const view = win.view;
      if (view) {
        view.setRulers(!view.hasRulers());
        view.setRulers(!view.hasRulers());
      }
    }
    updateTheme();
  };
  if (!link) {
    done();
    return;
  }
  const parts = (link.getAttribute("href") as string).split(".");
  parts[2] = theme;
  const href = parts.join(".");
  if (link.getAttribute("href") === href && link.sheet) {
    done();
    return;
  }
  link.addEventListener("load", done, { once: true });
  link.setAttribute("href", href);
}

/** GDesigner._updateTheme: labels in black or white, whichever reads on #windows. */
function updateTheme(): void {
  const win = activeWindow;
  if (!win || !win.view || !windowsElement) return;
  const element = windowsElement;
  Platform.scheduleFrame(() => {
    let color = RGBColor.BLACK;
    const background = getComputedStyle(element).getPropertyValue("background-color");
    const parsed = RGBColor.fromCSSColor(background);
    if (parsed) {
      const screen = parsed.toScreen();
      color =
        (299 * (screen[0] as number) + 587 * (screen[1] as number) + 114 * (screen[2] as number)) /
          1e3 >=
        128
          ? RGBColor.BLACK
          : RGBColor.WHITE;
    }
    PaintContext.prototype.labelColor = color;
    if (win.view) win.view.invalidate();
  });
  relayoutActive();
}

function createWindow(doc: HostedDocument): ViewWindow {
  const container = document.createElement("div");
  container.className = "window";
  container.addEventListener("mousedown", () => {
    if (created.view) created.view.focus();
  });
  const created: ViewWindow = {
    document: doc,
    container,
    view: null,
    requiresViewTransformation: true,
    sceneListeners: null,
  };
  windows.push(created);
  updateScene(created);
  return created;
}

/** GWindow._updateScene. */
function updateScene(win: ViewWindow): void {
  const scene = win.document.getScene();
  if (win.view && scene === win.view.getScene()) return;
  releaseView(win);
  if (!scene || "ready" !== documentStatusName(win.document)) return;
  const editor = win.document.getEditor();
  if (!editor) return;
  const view = new EditorWidget(editor);
  view.setViewMargin([VIEW_MARGIN, VIEW_MARGIN, VIEW_MARGIN, VIEW_MARGIN]);
  win.container.replaceChildren(view._htmlElement);
  win.view = view;
  updateWindowBackground(win);
  const flag = (event: AfterFlagChangeEvent): void => {
    if (event.node instanceof Page && event.flag === NodeFlag.Active) {
      updateWindowBackground(win);
      if (win === activeWindow && event.set) syncClipContent(win, event.node);
    }
  };
  const properties = (event: AfterPropertiesChangeEvent): void => {
    const changed = event.properties as string[];
    if (event.temporary) return;
    if (event.node === scene && (changed.indexOf("w") >= 0 || changed.indexOf("h") >= 0))
      updateWindowBackground(win);
    if (
      win === activeWindow &&
      event.node instanceof Page &&
      (changed.indexOf("w") >= 0 || changed.indexOf("h") >= 0) &&
      !event.node.isFixedSized() &&
      view.getViewConfiguration().paintMode === ScenePaintConfiguration.PaintMode.Output
    ) {
      setPaintMode(view, ScenePaintConfiguration.PaintMode.Full);
      event.node.setProperty(PAGE_CLIP_PROPERTY_NAME, PAGE_CLIP_CONTENT_DISABLED, true);
    }
  };
  scene.addEventListener(AfterFlagChangeEvent, flag, null, undefined, undefined, true);
  scene.addEventListener(AfterPropertiesChangeEvent, properties, null, undefined, undefined, true);
  win.sceneListeners = { scene, flag, properties };
  win.requiresViewTransformation = true;
  if (win === activeWindow) {
    // The old document was deactivated around the scene change and its
    // window activated again with the new view.
    activeWindow = null;
    activateWindow(win);
  }
}

/** GWindow._updateWindowBackground. */
function updateWindowBackground(win: ViewWindow): void {
  if (!win.view) return;
  win.view._htmlElement.style.background = win.document.getScene().isFixedSized() ? "" : "white";
}

function releaseView(win: ViewWindow): void {
  if (win.sceneListeners) {
    const { scene, flag, properties } = win.sceneListeners;
    scene.removeEventListener(AfterFlagChangeEvent, flag);
    scene.removeEventListener(AfterPropertiesChangeEvent, properties);
    win.sceneListeners = null;
  }
  if (win.view) {
    win.view.release();
    win.view = null;
  }
}

/** GWindows.activateWindow. */
function activateWindow(win: ViewWindow | null): void {
  if (win === activeWindow) return;
  if (activeWindow) {
    deactivate(activeWindow);
    activeWindow.container.remove();
  }
  activeWindow = win;
  if (win) {
    ensureShell().appendChild(win.container);
    relayout(win);
    activate(win);
    // GPageProperties answered the window's activation.
    const page = win.document.getScene().getActivePage();
    if (page) syncClipContent(win, page);
  }
}

/** GWindow.deactivate. */
function deactivate(win: ViewWindow): void {
  const editor = win.document.getEditor();
  if (editor) editor.closeInlineEditor();
  if (win.view) win.view.cleanCache();
}

function relayoutActive(): void {
  if (activeWindow) relayout(activeWindow);
}

/** GWindows._relayoutWindow and GWindow.relayout. */
function relayout(win: ViewWindow, force?: boolean): void {
  const view = win.view;
  const element = ensureShell();
  const width = element.clientWidth;
  const height = element.clientHeight;
  if (!view) return;
  win.container.style.width = width + "px";
  win.container.style.height = height + "px";
  view.setViewOffset(VIEW_OFFSET);
  const previousWidth = view.getWidth();
  const previousHeight = view.getHeight();
  view.resize(width, height, force, () => {
    if (previousWidth && previousHeight && (previousWidth != width || previousHeight != height))
      view.scrollBy((previousWidth - width) / 2, (previousHeight - height) / 2);
  });
}

/** GWindow.activate. */
function activate(win: ViewWindow, recenter?: boolean): void {
  const view = win.view;
  if (!view) return;
  if (
    win.requiresViewTransformation &&
    ((1 === view.getZoom() && 0 === view.getScrollX() && 0 === view.getScrollY()) || recenter)
  )
    centerAndZoom(win);
  win.requiresViewTransformation = false;
  const settings = readSettings();
  view.setRulers(settings.rulers_visible);
  (mainframe as HTMLDivElement).classList.toggle("rulers", view.hasRulers());
  const configuration = view.getViewConfiguration();
  configuration.guideLinesVisible = settings.guide_lines_visible;
  configuration.symbolLabelsVisible = settings.symbol_labels_visible;
  configuration.gridVisible = true;
  view.focus();
}

/** GWindow.centerAndZoom: the active page's content at 100%, or fitted when larger. */
function centerAndZoom(win: ViewWindow): void {
  const view = win.view as EditorWidget;
  const scene = win.document.getScene();
  const page = scene.getActivePage();
  let box = scene.getPaintBBox();
  if (page) {
    if (view.getViewConfiguration().multiPageView) {
      const position = page.getPosition(1);
      const pageBox = (
        page as unknown as { getPaintBBox(multiPage: number): Rect | null }
      ).getPaintBBox(1);
      if (pageBox) box = pageBox.translated(position.getX(), position.getY());
    } else box = page.getPaintBBox();
    // The old code first checked a CorelDRAW origin property; its name is
    // empty in this build (CDR_ORIGIN_PROPERTY_NAME), so that branch never ran.
  } else if (scene.isFixedSized())
    box = new Rect(0, 0, scene.getProperty("w") as number, scene.getProperty("h") as number);
  const viewBox = view.getViewBox(true);
  if (!box || box.isEmpty() || viewBox.isEmpty()) view.zoomAt(new Point(0, 0), 1);
  else if (box.getWidth() >= viewBox.getWidth() || box.getHeight() >= viewBox.getHeight())
    view.zoomAll(box, false);
  else view.zoomAtCenter(box.getSide(Rect.Side.CENTER), 1);
}

/** The page's clip setting (module 1158 PAGE_CLIP_*), default on (PAGE_CLIP_DEFAULT). */
const PAGE_CLIP_PROPERTY_NAME = "cce";
const PAGE_CLIP_CONTENT_ENABLED = 2;
const PAGE_CLIP_CONTENT_DISABLED = 1;

/** GPageProperties._pageActivationEventHandler. */
function syncClipContent(win: ViewWindow, page: Page): void {
  const view = win.view;
  if (!view) return;
  const mode = view.getViewConfiguration().paintMode;
  const infinite = !page.isFixedSized();
  if (infinite && mode === ScenePaintConfiguration.PaintMode.Output) {
    setPaintMode(view, ScenePaintConfiguration.PaintMode.Full);
    page.setProperty(PAGE_CLIP_PROPERTY_NAME, PAGE_CLIP_CONTENT_DISABLED, true);
  } else if (!infinite) {
    const setting = page.getProperty(PAGE_CLIP_PROPERTY_NAME, true) || PAGE_CLIP_CONTENT_ENABLED;
    setPaintMode(
      view,
      setting === PAGE_CLIP_CONTENT_ENABLED
        ? ScenePaintConfiguration.PaintMode.Output
        : ScenePaintConfiguration.PaintMode.Full,
    );
  }
}

/** GDesigner.setPaintMode: the mode now, a repaint without cached tiles on the next frame. */
function setPaintMode(view: EditorWidget, mode: string): void {
  view.getViewConfiguration().paintMode = mode;
  Platform.scheduleFrame(() => {
    view.invalidateAndResetCache(null);
  });
}

/** Brings the windows in line with the document list and the active document. */
function sync(): void {
  const documents = getDocuments() as readonly HostedDocument[];
  for (const win of windows.slice()) {
    if (documents.indexOf(win.document) >= 0) continue;
    if (win === activeWindow) activateWindow(null);
    releaseView(win);
    win.container.remove();
    windows.splice(windows.indexOf(win), 1);
  }
  for (const doc of documents) {
    const win = windows.find((candidate) => candidate.document === doc);
    if (win) updateScene(win);
    else createWindow(doc);
  }
  const active = getActiveDocument() as HostedDocument | null;
  activateWindow(active ? (windows.find((win) => win.document === active) ?? null) : null);
}

// The windows follow the GDesigner document events. Engine unit tests load
// the parity hooks in Node, with no DOM or only a canvas stand-in; there
// are no windows to show there.
if (typeof HTMLDivElement === "function") onDocumentsChanged(sync);

/** The active document's view. */
export function activeView(): EditorWidget | null {
  return activeWindow ? activeWindow.view : null;
}

/**
 * The active view has no repaint scheduled and its tile renderer nothing
 * queued: what corpus.viewIdle reports (parity/scenarios/corpus/old-hooks.js).
 */
export function activeViewIdle(): boolean {
  const view = activeView();
  if (!view) return true;
  const queue = view._sceneCanvas._renderQueue;
  return view._repaintRequestFrameId == null && (!queue || queue.length === 0);
}

export const viewHostHooks = {
  /** The active window's view (designer.getWindows().getActiveWindow().getView()). */
  view(): EditorWidget | null {
    return activeView();
  },
};
