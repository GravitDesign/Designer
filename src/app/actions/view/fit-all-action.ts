// Old: designer.browser.dev.js module 449 (GFitAllAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { activeViewDocument, documentView, viewDesigner, known } from "./view-host.ts";

/**
 * View > Fit All: the active page of a fixed-size document (single page
 * view), otherwise everything painted, zoomed into the view.
 */
export class FitAllAction extends Action {
  static ID = "view.zoom.fit.all";
  static TITLE = new LocaleKey("GFitAllAction", "title");
  static SHORTCUT: Shortcut = [Key.Constant.OPTION, Key.Constant.META, "0"];
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    FitAllAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GFitAllAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GFitAllAction", "tooltip-description")),
        shortcut: FitAllAction.SHORTCUT,
      }),
    };
  }

  override getId(): string {
    return FitAllAction.ID;
  }

  override getTitle(): LocaleKey {
    return FitAllAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override getIcon(): string | null {
    return viewDesigner().isTouchEnabled() ? "gravit-icon-fit-all" : null;
  }

  override getGroup(): string {
    return "zoom";
  }

  override getShortcut(): Shortcut {
    return FitAllAction.SHORTCUT;
  }

  /** Enabled when the scene paints something (on any page, not only the active one). */
  override isEnabled(): boolean {
    const document = viewDesigner().getActiveDocument();
    const scene = document && document.getScene();
    const box = (scene && scene.getPaintBBox()) || null;
    return !!box && !box.isEmpty();
  }

  override execute(): void {
    const document = activeViewDocument();
    const scene = known(document.getScene());
    const multiPageView = documentView(document).getViewConfiguration().multiPageView;
    let box: Rect | null;
    if (scene.isFixedSized() && !multiPageView) {
      const page = known(scene.getActivePage());
      box = new Rect(0, 0, page.getProperty("w") as number, page.getProperty("h") as number);
    } else box = scene.getPaintBBox(multiPageView);
    if (box && !box.isEmpty()) documentView(document).zoomAll(box, false);
  }

  override getTooltipConfig(area?: string): unknown {
    return (area && FitAllAction.TOOLTIP_CONFIG && FitAllAction.TOOLTIP_CONFIG[area]) || null;
  }

  override toString(): string {
    return "[Object GFitAllAction]";
  }
}
