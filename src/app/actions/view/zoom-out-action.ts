// Old: designer.browser.dev.js module 1291 (GZoomOutAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { ZoomTool } from "../../../editor/tools/zoom-tool.ts";
import { SceneWidget } from "../../../editor/view/scene-widget.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { activeWindow, activeWindowView, viewDesigner } from "./view-host.ts";

/**
 * View > Zoom Out: the next zoom level down, around the selection or the
 * view centre. Its id has no "view." prefix in the old app either.
 */
export class ZoomOutAction extends Action {
  static ID = "zoom.out";
  static TITLE = new LocaleKey("GZoomOutAction", "title");
  static ZOOM_STEP = 2;
  static SHORTCUT: Shortcut = [Key.Constant.META, "-"];
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    ZoomOutAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GZoomOutAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GZoomOutAction", "tooltip-description")),
        shortcut: ZoomOutAction.SHORTCUT,
      }),
    };
  }

  override getId(): string {
    return ZoomOutAction.ID;
  }

  override getTitle(): LocaleKey {
    return ZoomOutAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW_MAGNIFICATION;
  }

  override getGroup(): string {
    return "zoom/magnification";
  }

  override getShortcut(): Shortcut {
    return ZoomOutAction.SHORTCUT;
  }

  override isShortcutGlobal(): boolean {
    return true;
  }

  override getIcon(): string | null {
    return viewDesigner().isTouchEnabled() ? "gravit-icon-zoom-out" : null;
  }

  override isEnabled(): boolean {
    const window = activeWindow();
    const view = window ? window.getView() : null;
    return !!view && view.getZoom() > SceneWidget.options.minZoomFactor;
  }

  /** The largest level below the zoom; a zoom that is exactly a level takes the one before it. */
  override execute(): void {
    const view = activeWindowView();
    let zoom: number | null | undefined = null;
    if (ZoomTool.options.zoomLevels) {
      const levels = ZoomTool.options.zoomLevels;
      const current = view.getZoom();
      for (let i = 0; i < levels.length; i++) {
        if (current > (levels[i] as number)) zoom = levels[i];
        if (current === levels[i]) {
          zoom = i > 0 ? levels[i - 1] : SceneWidget.options.minZoomFactor;
          break;
        }
      }
    } else zoom = view.getZoom() / ZoomOutAction.ZOOM_STEP;
    viewDesigner().zoomAtViewCenter(view, zoom as number);
  }

  override getTooltipConfig(area?: string): unknown {
    return (area && ZoomOutAction.TOOLTIP_CONFIG && ZoomOutAction.TOOLTIP_CONFIG[area]) || null;
  }

  override toString(): string {
    return "[Object GZoomOutAction]";
  }
}
