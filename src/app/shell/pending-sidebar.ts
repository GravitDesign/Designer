/**
 * Stands in for a sidebar whose cluster isn't ported yet: same id, title,
 * side and widths as the old one (GInspectorSidebar, GOutlineSidebar,
 * GLibrarySidebar, GSymbolsSidebar), an empty container. The canvas keeps
 * its old view offset that way, which the editor scenarios depend on.
 * bootstrap.ts uses it only while the real class is missing.
 */
import { EventTarget } from "../../engine/core/event-target.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { designer } from "./globals.ts";
import type { SidebarLike, SidebarTouchTool } from "./layout.ts";

export interface PendingSidebarSpec {
  id: string;
  /** The old class name, which is also the string table of its title. */
  className: string;
  orientation: "left" | "right";
  width: number;
  resizeable: boolean;
}

export class PendingSidebar extends EventTarget implements SidebarLike {
  constructor(private readonly _spec: PendingSidebarSpec) {
    super();
  }

  getId(): string {
    return this._spec.id;
  }

  getTitle(): LocaleKey {
    return new LocaleKey(this._spec.className, "title");
  }

  getOrientation(): string {
    return this._spec.orientation;
  }

  getMinimumWidth(): number {
    return this._spec.width;
  }

  getDefaultWidth(): number {
    return this._spec.width;
  }

  /** GSidebar.getSettingWidth: the stored width, else the default. */
  getSettingWidth(): number {
    return designer().getSetting(
      `sidebars_width_${this.getId()}`,
      this.getDefaultWidth(),
    ) as number;
  }

  isResizeable(): boolean {
    return this._spec.resizeable;
  }

  isDeactivatable(): boolean {
    return true;
  }

  isVisible(): boolean {
    return true;
  }

  isEnabled(): boolean {
    return true;
  }

  relayout(): void {}

  resize(): void {}

  init(): void {}

  activate(): void {}

  deactivate(): void {}

  getTouchTools(): SidebarTouchTool[] | null {
    return null;
  }

  updateBadge(): boolean {
    return false;
  }

  override toString(): string {
    return "[Object GSidebar]";
  }
}
