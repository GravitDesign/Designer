/**
 * What the view, window and help actions use of GDesigner. They need more
 * of it than the edit actions (settings, parts, paint mode, sidebars,
 * windows), so they see gDesigner() as the real Designer class. Unit tests
 * hand in a fake through setActionDesigner and cast it.
 */
import type { EditorWidget } from "../../../editor/view/editor-widget.ts";
import type { Designer, DesignerDocument } from "../../shell/designer.ts";
import type { Window } from "../../shell/window.ts";
import { gDesigner } from "../host.ts";

/** The old global gDesigner as the view actions use it. */
export function viewDesigner(): Designer {
  return gDesigner() as unknown as Designer;
}

/** gDesigner.getWindows().getActiveWindow(). */
export function activeWindow(): Window | null {
  return viewDesigner().getWindows().getActiveWindow();
}

/**
 * gDesigner.getWindows().getActiveWindow().getView() where the old code
 * knew there is an active window with a view (isEnabled checked it).
 */
export function activeWindowView(): EditorWidget {
  return (activeWindow() as Window).getView() as EditorWidget;
}

/** gDesigner.getActiveDocument() where isEnabled checked there is one. */
export function activeViewDocument(): DesignerDocument {
  return viewDesigner().getActiveDocument() as DesignerDocument;
}

/** gDesigner.getActiveDocument().getActiveWindow().getView() of the old actions. */
export function documentView(document: DesignerDocument): EditorWidget {
  return (document.getActiveWindow() as Window).getView() as EditorWidget;
}

/**
 * `value` where the old code took it for granted (and threw a TypeError
 * on null): the document's scene, the active page, the window's view.
 */
export function known<T>(value: T | null | undefined): T {
  return value as T;
}
