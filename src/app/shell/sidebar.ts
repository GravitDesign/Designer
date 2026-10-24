// Old: designer.browser.dev.js module 806 (GSidebar).
/**
 * The base of the sidebars (inspector, outline, library, symbols): a view
 * with the defaults GSidebars (layout.ts) relies on. Subclasses give the
 * orientation, the widths and init; the rest does nothing by default.
 */
import { registerClass } from "../../engine/core/object.ts";
import { designer } from "./globals.ts";
import type { SidebarTouchTool } from "./layout.ts";
import { View } from "./view.ts";

export class Sidebar extends View {
  static {
    registerClass(this, "GSidebar");
  }

  /** Layout.Left or Layout.Right ("left"/"right"); null here. */
  getOrientation(): string | null {
    return null;
  }

  getMinimumWidth(): number {
    throw new Error("Not implemented.");
  }

  getDefaultWidth(): number {
    throw new Error("Not implemented.");
  }

  /** The width the user dragged to ("sidebars_width_<id>"), else the default. */
  getSettingWidth(): number {
    return designer().getSetting(
      "sidebars_width_".concat(this.getId()),
      this.getDefaultWidth(),
    ) as number;
  }

  isResizeable(): boolean {
    return false;
  }

  isDeactivatable(): boolean {
    return true;
  }

  relayout(): void {}

  resize(): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  init(_container: HTMLElement): void {}

  activate(): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  isToolAllowed(_tool: unknown): boolean {
    return true;
  }

  deactivate(): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  getTouchTools(_options?: { disableContextSensitive?: boolean }): SidebarTouchTool[] | null {
    return null;
  }

  /** Shows a count in the sidebar's badge; true when it did. None by default. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  updateBadge(_badge: HTMLElement): boolean {
    return false;
  }

  override toString(): string {
    return "[Object GSidebar]";
  }
}
