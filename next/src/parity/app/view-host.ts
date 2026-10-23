/**
 * The app.view() hook and the view helpers other hooks use, over the real
 * windows (src/app/shell/windows.ts and window.ts).
 *
 * Also still here: the page properties stand-in the old app ran on every
 * window activation (GPageProperties._pageActivationEventHandler and
 * _propertiesUpdateEventHandler, app-inspector-document): a fixed-size
 * page shows its content clipped (paint mode Output) unless its "cce"
 * setting says otherwise, an infinite one is never clipped. It moves to
 * the page properties panel when that is ported.
 */
import { Platform } from "../../engine/core/platform.ts";
import { ScenePaintConfiguration } from "../../engine/paint/scene-paint-configuration.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import {
  AfterFlagChangeEvent,
  AfterPropertiesChangeEvent,
} from "../../engine/scene/node-events.ts";
import { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import type { EditorWidget } from "../../editor/view/editor-widget.ts";
import { PageClip } from "../../app/export/page-clip.ts";
import { designerOrNull } from "../../app/shell/globals.ts";
import type { Window } from "../../app/shell/window.ts";
import { WindowEvent } from "../../app/shell/windows.ts";
import { onDocumentsChanged } from "./document.ts";

// ---------------------------------------------------------------------------
// The page properties stand-in (app-inspector-document).

/** GDesigner.setPaintMode: the mode now, a repaint without cached tiles on the next frame. */
function setPaintMode(view: EditorWidget, mode: string): void {
  view.getViewConfiguration().paintMode = mode;
  Platform.scheduleFrame(() => {
    view.invalidateAndResetCache(null);
  });
}

/** GPageProperties._pageActivationEventHandler. */
function syncClipContent(view: EditorWidget, page: Page): void {
  const mode = view.getViewConfiguration().paintMode;
  const infinite = !page.isFixedSized();
  if (infinite && mode === ScenePaintConfiguration.PaintMode.Output) {
    setPaintMode(view, ScenePaintConfiguration.PaintMode.Full);
    page.setProperty(PageClip.PAGE_CLIP_PROPERTY_NAME, PageClip.PAGE_CLIP_CONTENT_DISABLED, true);
  } else if (!infinite) {
    const setting =
      page.getProperty(PageClip.PAGE_CLIP_PROPERTY_NAME, true) ||
      PageClip.PAGE_CLIP_CONTENT_ENABLED;
    setPaintMode(
      view,
      setting === PageClip.PAGE_CLIP_CONTENT_ENABLED
        ? ScenePaintConfiguration.PaintMode.Output
        : ScenePaintConfiguration.PaintMode.Full,
    );
  }
}

interface SceneListeners {
  scene: Scene;
  flag: (event: AfterFlagChangeEvent) => void;
  properties: (event: AfterPropertiesChangeEvent) => void;
}

let listening: SceneListeners | null = null;

function stopListening(): void {
  if (!listening) return;
  listening.scene.removeEventListener(AfterFlagChangeEvent, listening.flag);
  listening.scene.removeEventListener(AfterPropertiesChangeEvent, listening.properties);
  listening = null;
}

/** Follows the active window's scene: page activation and page size changes. */
function followWindow(window: Window | null): void {
  stopListening();
  const view = window ? window.getView() : null;
  const scene = view ? (view.getScene() as Scene | null) : null;
  if (!view || !scene) return;
  const flag = (event: AfterFlagChangeEvent): void => {
    if (event.node instanceof Page && event.flag === NodeFlag.Active && event.set)
      syncClipContent(view, event.node);
  };
  const properties = (event: AfterPropertiesChangeEvent): void => {
    const changed = event.properties as string[];
    if (event.temporary) return;
    if (
      event.node instanceof Page &&
      (changed.indexOf("w") >= 0 || changed.indexOf("h") >= 0) &&
      !event.node.isFixedSized() &&
      view.getViewConfiguration().paintMode === ScenePaintConfiguration.PaintMode.Output
    ) {
      setPaintMode(view, ScenePaintConfiguration.PaintMode.Full);
      event.node.setProperty(
        PageClip.PAGE_CLIP_PROPERTY_NAME,
        PageClip.PAGE_CLIP_CONTENT_DISABLED,
        true,
      );
    }
  };
  scene.addEventListener(AfterFlagChangeEvent, flag, null, undefined, undefined, true);
  scene.addEventListener(AfterPropertiesChangeEvent, properties, null, undefined, undefined, true);
  listening = { scene, flag, properties };
  const page = scene.getActivePage();
  if (page) syncClipContent(view, page);
}

let windowsHooked = false;

/** Hooks the stand-in to the designer's windows the first time a document changes. */
function hookWindows(): void {
  const designer = designerOrNull();
  if (windowsHooked || !designer || !designer.isInitialized()) return;
  windowsHooked = true;
  designer.getWindows().addEventListener(WindowEvent, (event: WindowEvent) => {
    if (event.type === WindowEvent.Type.Activated) followWindow(event.window);
    else if (event.type === WindowEvent.Type.Deactivated) followWindow(null);
  });
  followWindow(designer.getWindows().getActiveWindow());
}

if (typeof HTMLDivElement === "function") onDocumentsChanged(hookWindows);

// ---------------------------------------------------------------------------
// Hooks

/** The active window's view (designer.getWindows().getActiveWindow().getView()). */
export function activeView(): EditorWidget | null {
  const designer = designerOrNull();
  if (!designer || !designer.isInitialized()) return null;
  const window = designer.getWindows().getActiveWindow();
  return window ? window.getView() : null;
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
