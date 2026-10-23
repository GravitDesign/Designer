/**
 * What the views take from clusters that come later (the tools, level 9).
 * The old code reached them through the workspace or required them
 * directly; here the view looks them up when it needs them, so it works
 * without them until they exist.
 *
 * The tool manager: GEditorWidget listens to its InvalidationRequestEvent
 * and lets it paint the active tool over the scene. The old app's
 * workspace (GEditorWorkspace) made it, and the view found it with
 * `scene.getWorkspace().getToolManager()`. The interface below is what the
 * view uses of GToolManager (editor/tools/tool-manager.ts, the
 * editor-tools-base cluster); its event class is read from the manager's
 * class (`ToolManager.InvalidationRequestEvent`), as the old code read it
 * from the required module.
 */
import type { EventClass } from "../../engine/core/event.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";

/** GToolManager.InvalidationRequestEvent: the active tool needs `area` (view pixels) repainted. */
export interface ToolInvalidationRequest {
  area: Rect | null;
}

/** The part of GToolManager the editor view uses. */
export interface ViewToolManager {
  addEventListener(
    eventClass: EventClass,
    listener: (event: ToolInvalidationRequest) => void,
    target?: object | null,
  ): void;
  removeEventListener(eventClass: EventClass, listener: unknown, target?: object | null): boolean;
  paint(context: PaintContext): void;
}

interface ToolManagerSource {
  getToolManager?: () => ViewToolManager | null | undefined;
}

/**
 * The tool manager of `workspace` (null until the tools cluster gives the
 * workspace one). Hook for editor-tools-base.
 */
export function getWorkspaceToolManager(workspace: unknown): ViewToolManager | null {
  const source = workspace as ToolManagerSource | null;
  return (source && typeof source.getToolManager === "function" && source.getToolManager()) || null;
}

/** The InvalidationRequestEvent class of `toolManager`'s class. */
export function toolInvalidationRequestEvent(toolManager: ViewToolManager): EventClass {
  return (toolManager.constructor as unknown as { InvalidationRequestEvent: EventClass })
    .InvalidationRequestEvent;
}

/**
 * Kept for editor/cursor.ts, which registers GCursor.initStyle here. The
 * widget now calls Cursor.initStyle directly, so the registration is no
 * longer needed and can go together with this function.
 */
export function registerCursorStyle(init: () => void): void {
  void init;
}
