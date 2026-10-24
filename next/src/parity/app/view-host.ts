/**
 * The app.view() hook and the view helpers other hooks use, over the real
 * windows (src/app/shell/windows.ts and window.ts).
 */
import type { EditorWidget } from "../../editor/view/editor-widget.ts";
import { designerOrNull } from "../../app/shell/globals.ts";

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
