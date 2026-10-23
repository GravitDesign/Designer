// Old: designer.browser.dev.js module 1290 (GZoomInAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { ZoomTool } from "../../../editor/tools/zoom-tool.ts";
import { SceneWidget } from "../../../editor/view/scene-widget.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { activeWindow, activeWindowView, viewDesigner } from "./view-host.ts";

/** View > Zoom In: the next zoom level up, around the selection or the view centre. */
export class ZoomInAction extends Action {
  static ID = "view.zoom.in";
  static TITLE = new LocaleKey("GZoomInAction", "title");
  static ZOOM_STEP = 2;
  static SHORTCUT: Shortcut = [Key.Constant.META, "+"];
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    ZoomInAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GZoomInAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GZoomInAction", "tooltip-description")),
        shortcut: ZoomInAction.SHORTCUT,
      }),
    };
  }

  override getId(): string {
    return ZoomInAction.ID;
  }

  override getTitle(): LocaleKey {
    return ZoomInAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW_MAGNIFICATION;
  }

  override getGroup(): string {
    return "zoom/magnification";
  }

  override getShortcut(): Shortcut {
    return ZoomInAction.SHORTCUT;
  }

  override isShortcutGlobal(): boolean {
    return true;
  }

  override getIcon(): string | null {
    return viewDesigner().isTouchEnabled() ? "gravit-icon-zoom-in" : null;
  }

  override isEnabled(): boolean {
    const window = activeWindow();
    const view = window ? window.getView() : null;
    return !!view && view.getZoom() < SceneWidget.options.maxZoomFactor;
  }

  /**
   * The search walks the levels from both ends at once: the smallest level
   * above the zoom wins, and a zoom that is exactly a level takes the one
   * after it. At the last level (the largest zoom) the action is disabled,
   * so the exact-match branch never reads past the end.
   */
  override execute(): void {
    const view = activeWindowView();
    let zoom: number | null | undefined = null;
    if (ZoomTool.options.zoomLevels) {
      const levels = ZoomTool.options.zoomLevels;
      const current = view.getZoom();
      const last = levels.length - 1;
      for (let i = 0; i < levels.length; i++) {
        if (current < (levels[last - i] as number)) zoom = levels[last - i];
        if (current === levels[i]) {
          zoom = last > 0 ? levels[i + 1] : SceneWidget.options.maxZoomFactor;
          break;
        }
      }
    } else zoom = view.getZoom() * ZoomInAction.ZOOM_STEP;
    viewDesigner().zoomAtViewCenter(view, zoom as number);
  }

  override getTooltipConfig(area?: string): unknown {
    return (area && ZoomInAction.TOOLTIP_CONFIG && ZoomInAction.TOOLTIP_CONFIG[area]) || null;
  }

  override toString(): string {
    return "[Object GZoomInAction]";
  }
}
