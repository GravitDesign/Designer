// Old: designer.browser.dev.js module 1167 (GMagnificationAction).
import { Key, type KeyValue } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Point } from "../../../engine/math/point.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { activeWindow, activeWindowView, viewDesigner } from "./view-host.ts";

/**
 * View > Magnification > n%: one action per zoom level. It zooms around
 * the centre of everything painted (in the multi-page view moved by the
 * active page's position), not around the view centre.
 */
export class MagnificationAction extends Action {
  static ID = "view.magnification";
  static ZOOM_LEVELS: readonly number[] = [
    6, 12, 25, 50, 66, 100, 150, 200, 300, 400, 800, 1600, 3200, 6400, 12800, 25600,
  ];

  private readonly _zoomLevel: number;

  /** `zoomLevel` in percent, one of ZOOM_LEVELS. */
  constructor(zoomLevel: number) {
    super();
    this._zoomLevel = zoomLevel;
  }

  override getId(): string {
    return MagnificationAction.ID + "." + this._zoomLevel.toString();
  }

  /** "100%", in the touch layout "100% (Actual Size)". */
  override getTitle(): string {
    let title = this._zoomLevel.toString() + "%";
    if (viewDesigner().isTouchEnabled() && 100 === this._zoomLevel)
      title += " (".concat(
        Locale.get(new LocaleKey("GMagnificationAction", "text.actual-size")) as string,
        ")",
      );
    return title;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW_MAGNIFICATION;
  }

  override getGroup(): string {
    return "zoom/magnification-level";
  }

  override getShortcut(): Shortcut | null {
    const shortcut = (key: KeyValue): Shortcut => [Key.Constant.META, key];
    switch (this._zoomLevel) {
      case 50:
        return shortcut("5");
      case 100:
        return shortcut("1");
      case 400:
        return shortcut("4");
      case 800:
        return shortcut("8");
      default:
        return null;
    }
  }

  override isEnabled(): boolean {
    return !!activeWindow();
  }

  override execute(): void {
    const zoom = this._zoomLevel / 100;
    const view = activeWindowView();
    const scene = view.getScene();
    const box = scene ? scene.getPaintBBox() : null;
    let center = box && !box.isEmpty() ? box.getSide(Rect.Side.CENTER) : new Point(0, 0);
    if (view.getViewConfiguration().multiPageView) {
      const page = scene.getActivePage();
      if (page) center = center.add(page.getPosition(true));
    }
    view.zoomAtCenter(center, zoom);
  }

  override toString(): string {
    return "[Object GMagnificationAction]";
  }
}
