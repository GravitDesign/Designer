/**
 * The touch half of the interim GDesigner (designer.browser.dev.js, module
 * 1491) until the app shell exists (phase 7):
 *
 * - GDesigner's constructor: the document touch target on the document,
 *   and the editor touch target that GDesigner._windowEvent moves to the
 *   active window's view element (activate on window activation,
 *   deactivate on deactivation);
 * - GDesigner._applyTouchEditorOptions: the touch handle look, applied
 *   when the "touch" setting is restored as true (editor-tools.ts applies
 *   _applyDefaultEditorOptions when it's false; GDesigner._updateEditorOptions
 *   picks one of the two by isTouchEnabled(), then repaints the view);
 * - GDesigner.init: the body's long-press delay and its long-press
 *   listener, which opens the context menu where the press was; and
 *   GLongPressEvent started once (its module did that when it loaded);
 * - the gDesigner lookups of the gestures (active view, context menu,
 *   active tool), through the touch host.
 *
 * The context menu comes with the app shell; until then a long press
 * opens nothing.
 */
import { Rect } from "../../engine/math/rect.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { PaintContext } from "../../engine/paint/paint-context.ts";
import { EditorOptions } from "../../editor/editor-options.ts";
import { TransformBox } from "../../editor/element-editors/transform-box.ts";
import { PreserveAspectRatioAnnotation } from "../../editor/handles/preserve-aspect-ratio-annotation.ts";
import { RotateAnnotation } from "../../editor/handles/rotate-annotation.ts";
import { SkewHorizontalAnnotation } from "../../editor/handles/skew-horizontal-annotation.ts";
import { SkewVerticalAnnotation } from "../../editor/handles/skew-vertical-annotation.ts";
import { SelectTool } from "../../editor/tools/select-tool.ts";
import type { ToolManager } from "../../editor/tools/tool-manager.ts";
import { DocumentTouchTarget } from "../../editor/touch/document-touch-target.ts";
import { EditorTouchTarget } from "../../editor/touch/editor-touch-target.ts";
import { startLongPressEvents } from "../../editor/touch/long-press-event.ts";
import { TouchConfig } from "../../editor/touch/touch-config.ts";
import { setTouchHost, type TouchHost } from "../../editor/touch/touch-host.ts";
import { appWorkspace, onDocumentsChanged } from "./document.ts";
// The desktop options and the tool manager's first tool come first, as
// GDesigner.init ran before GDesigner.start restored the settings.
import "./editor-tools.ts";
import { activeView } from "./view-host.ts";

type Handles = Record<string, Record<string, unknown>>;

/** GDesigner._applyTouchEditorOptions, in the old order of assignments. */
export function applyTouchEditorOptions(): void {
  const dpi = PaintCanvas.getScreenDPI();
  const options = EditorOptions as unknown as Record<string, unknown>;
  const handles = EditorOptions.annotationHandles as unknown as Handles;
  const h = (name: string): Record<string, unknown> => handles[name] as Record<string, unknown>;
  options.distanceHelperBehaviour = SelectTool._DistanceHelperBehaviour.Click;
  options.resizeHandlesInDetailMode = false;
  options.rotateHandleInDetailMode = false;
  (handles as unknown as Record<string, unknown>).suppressRedundantCorners = true;
  h("gradient").size = 16 * dpi;
  h("gradient").sizeBig = 20 * dpi;
  h("preserveAspectRatio").side = Rect.Side.BOTTOM_RIGHT;
  (h("tranformBox").skew as Record<string, unknown>).enabled = true;
  (h("tranformBox").rotate as Record<string, unknown>).enabled = true;
  h("preserveAspectRatio").enabled = true;
  PaintContext.prototype.transformBoxOutlineColor = PaintContext.prototype.selectionOutlineColor;
  TransformBox.OUTSIDE_TOLERANCE = 0;
  options.annotPickDistance = 4;
  options.pickDistance = 20;
  h("tranformBox").size = 23 * dpi;
  h("tranformBox").outlineWidth = 3 * dpi;
  h("tranformBox").pivotSize = 23 * dpi;
  h("tranformBox").pivotOutlineWidth = 3 * dpi;
  h("tranformBox").outsideStroke = true;
  h("tranformBox").shadowColor = "transparent";
  options.rotateHandle = "bottom";
  h("rotate").size = 23 * dpi;
  h("rotate").iconSize = 23 * dpi;
  h("rotate").outlineWidth = dpi;
  h("rotate").shadowColor = "transparent";
  h("rotate").distance = 46 * dpi;
  h("resize").size = 23 * dpi;
  h("resize").outlineWidth = 3 * dpi;
  h("resize").outsideStroke = true;
  h("resize").shadowColor = "transparent";
  h("rectangle").size = 22 * dpi;
  h("rectangle").outlineWidth = 4 * dpi;
  h("rectangle").outsideStroke = true;
  h("rectangle").shadowColor = "transparent";
  h("rectangle").maxNumberOfDetailedSegments = 1;
  h("polygon").size = 22 * dpi;
  h("polygon").outlineWidth = 4 * dpi;
  h("polygon").outsideStroke = true;
  h("polygon").shadowColor = "transparent";
  h("polygon").maxNumberOfDetailedSegments = 2;
  h("ellipse").size = 22 * dpi;
  h("ellipse").outlineWidth = 4 * dpi;
  h("ellipse").outsideStroke = true;
  h("ellipse").shadowColor = "transparent";
  h("ellipse").maxNumberOfDetailedSegments = 2;
  (h("path").node as Record<string, unknown>).size = 20 * dpi;
  (h("path").node as Record<string, unknown>).outlineWidth = 2 * dpi;
  (h("path").control as Record<string, unknown>).size = 10 * dpi;
  SkewHorizontalAnnotation.setIconVisible(true);
  SkewVerticalAnnotation.setIconVisible(true);
  PreserveAspectRatioAnnotation.setIconVisible(true);
  RotateAnnotation.setIconVisible(true);
}

/**
 * GDesigner.isTouchEnabled with the pro features this build always has:
 * the stored "touch" setting (localStorage "designer.settings").
 */
function touchSettingOn(): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as unknown;
    return !!(stored && typeof stored === "object" && (stored as Record<string, unknown>).touch);
  } catch {
    return false;
  }
}

if (typeof localStorage === "object" && touchSettingOn()) applyTouchEditorOptions();

if (typeof HTMLDivElement === "function") {
  const host: TouchHost = {
    getActiveView: () => activeView(),
    getContextMenu: () => null,
    getActiveTool: () => (appWorkspace().getToolManager() as ToolManager | null)?.getActiveTool(),
    // The context menu comes with the app shell.
    triggerContextMenu: () => {},
  };
  setTouchHost(host);

  new DocumentTouchTarget(document);
  const editorTouchTarget = new EditorTouchTarget();
  let touchElement: HTMLElement | null = null;
  onDocumentsChanged(() => {
    const view = activeView();
    const element = view ? view.getHtmlElement() : null;
    if (element === touchElement) return;
    if (touchElement) editorTouchTarget.deactivate(touchElement);
    touchElement = element;
    if (element) editorTouchTarget.activate(element);
  });

  document.body.setAttribute("data-long-press-delay", String(TouchConfig.LONG_PRESS_TIME_OUT));
  document.body.addEventListener("long-press", (event) => {
    const { detail } = event as CustomEvent<{ clientX: number; clientY: number }>;
    if (event.target) host.triggerContextMenu(event.target, detail.clientX, detail.clientY);
  });
  startLongPressEvents();
}
