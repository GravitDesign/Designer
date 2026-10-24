// Old: designer.browser.dev.js module 1335 (GToggleFullscreenAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Layout } from "../../shell/layout-ids.ts";
import { lateExport } from "../../shell/late.ts";
import { runtime } from "../../shell/runtime.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { FitAllAction } from "./fit-all-action.ts";
import { viewDesigner } from "./view-host.ts";
import { FullscreenEvent } from "../../shell/fullscreen-event.ts";

/** The fullscreen banner (module 1588, touch/fullscreen-banner.ts). */
interface FullscreenBanner {
  setBannerText(html: string): FullscreenBanner;
  show(): FullscreenBanner;
  hide(): FullscreenBanner;
}

/** Which parts were visible before the canvas took the whole window. */
interface PartStates {
  header?: boolean;
  toolbar?: boolean;
  panels?: boolean;
  leftSidebar?: boolean;
  rightSidebar?: boolean;
}

let sharedBanner: FullscreenBanner | null | undefined;

/**
 * The old banner was one element shared by every instance of the action
 * (it sat on the prototype). It comes from app-touch-ui; until that
 * module exists there is no banner.
 */
function banner(): FullscreenBanner | null {
  if (sharedBanner === undefined) {
    const Banner = lateExport<new () => FullscreenBanner>(
      "touch/fullscreen-banner.ts",
      "FullscreenBanner",
    );
    sharedBanner = Banner ? new Banner() : null;
  }
  return sharedBanner;
}

/**
 * View > Fullscreen (Alt+Enter): hides the header, toolbar, panels and
 * both sidebars so the canvas fills the window, and brings back the ones
 * that were visible before. This is not the browser's fullscreen mode.
 * The banner explaining how to leave shows outside the touch layout.
 *
 * Hidden inside Microsoft Teams, which the rewrite never runs in.
 */
export class ToggleFullscreenAction extends Action {
  static ID = "view.fullscreen";
  static TITLE = new LocaleKey("GToggleFullscreenAction", "title");

  _lastStates: PartStates = {};
  _banner: FullscreenBanner | null;

  constructor() {
    super();
    this._banner = banner();
    if (this._banner)
      this._banner.setBannerText(
        Locale.get(new LocaleKey("GToggleFullscreenAction", "fullscreen-banner")) as string,
      );
  }

  override getId(): string {
    return ToggleFullscreenAction.ID;
  }

  override getTitle(): LocaleKey {
    return ToggleFullscreenAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.ALT_LEFT, Key.Constant.ENTER];
  }

  override isEnabled(): boolean {
    return !!viewDesigner().getActiveDocument() && this._isSupported();
  }

  override isVisible(): boolean {
    return this._isSupported();
  }

  _isSupported(): boolean {
    return !runtime.isExecutingOnMSTeamsSync();
  }

  override getIcon(): string | null {
    return viewDesigner().isTouchEnabled() ? "gravit-icon-toggle-full-screen" : null;
  }

  isFullscreen(): boolean {
    const designer = viewDesigner();
    return !(
      designer.isPartVisible(Layout.Header) ||
      designer.isPartVisible(Layout.Toolbar) ||
      designer.isPartVisible(Layout.RightSidebars) ||
      designer.isPartVisible(Layout.LeftSidebars) ||
      designer.isPartVisible(Layout.Panels)
    );
  }

  override execute(): void {
    const designer = viewDesigner();
    const fullscreen = this.isFullscreen();
    if (fullscreen) {
      if (this._banner) this._banner.hide();
    } else {
      this._updateLastStates();
      if (!designer.isTouchEnabled() && this._banner) this._banner.show();
    }
    designer.setPartVisible(Layout.Header, !!fullscreen && !!this._lastStates.header, "");
    designer.setPartVisible(Layout.Toolbar, !!fullscreen && !!this._lastStates.toolbar, "");
    designer.setPartVisible(Layout.Panels, !!fullscreen && !!this._lastStates.panels);
    designer.setPartVisible(Layout.RightSidebars, !!fullscreen && !!this._lastStates.rightSidebar);
    designer.setPartVisible(Layout.LeftSidebars, !!fullscreen && !!this._lastStates.leftSidebar);
    designer.relayout();
    designer.executeAction(FitAllAction.ID, undefined, undefined, true);
    if (designer.hasEventListeners(FullscreenEvent))
      designer.trigger(new FullscreenEvent(fullscreen));
  }

  _updateLastStates(): void {
    const designer = viewDesigner();
    this._lastStates = {
      header: designer.isPartVisible(Layout.Header),
      toolbar: designer.isPartVisible(Layout.Toolbar),
      panels: designer.isPartVisible(Layout.Panels),
      leftSidebar: designer.isPartVisible(Layout.LeftSidebars),
      rightSidebar: designer.isPartVisible(Layout.RightSidebars),
    };
  }

  override toString(): string {
    return "[Object GToggleFullscreenAction]";
  }
}
