// Old: designer.browser.dev.js module 1662 (GLibrarySidebar).
/**
 * The Libraries sidebar on the left: the library panel (library-panel.ts)
 * in a scrolling `.library-container`, with the offline overlay the old
 * app showed when the network went away.
 *
 * The old sidebar was enabled only while the cloud API was configured
 * (GDocumentImages.isOnline) and hid the panel while offline. The rewrite
 * has no cloud API and no network availability event, so the sidebar is
 * always enabled and never offline, which is what the old local app
 * showed; see "The library panel can't load assets any more" in
 * QUESTIONS.md.
 *
 * It extends View with GSidebar's defaults (module 806) written out,
 * because shell/sidebar.ts (app-shell-storage) doesn't exist yet.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { TouchTool } from "../../editor/touch/touch-tool.ts";
import { applicationManager } from "../actions/host.ts";
import { css } from "../shell/dom.ts";
import type { SidebarLike, SidebarTouchTool } from "../shell/layout.ts";
import { Sidebar } from "../shell/sidebar.ts";
import { LibraryPanel } from "./library-panel.ts";

/** GDocumentImages.isOnline in the old local app: the API object was there. */
function isOnline(): boolean {
  return true;
}

/** GDesigner.isOffline: the network availability event is gone, so never. */
function isOffline(): boolean {
  return false;
}

export class LibrarySidebar extends Sidebar implements SidebarLike {
  static ID = "library";
  static TITLE = new LocaleKey("GLibrarySidebar", "title");

  _initialized = false;
  _libraryPanel: HTMLElement | null = null;
  _libraryPanelInstance: LibraryPanel | null = null;
  _htmlElement: HTMLElement | null = null;

  override getId(): string {
    return LibrarySidebar.ID;
  }

  override getTitle(): LocaleKey {
    return LibrarySidebar.TITLE;
  }

  override isEnabled(): boolean {
    return isOnline();
  }

  override isVisible(): boolean {
    return !!applicationManager().isEditingEnabled();
  }

  override getOrientation(): string {
    return "left";
  }

  override getMinimumWidth(): number {
    return 250;
  }

  override getDefaultWidth(): number {
    return 250;
  }

  override isResizeable(): boolean {
    return true;
  }

  override resize(): void {
    (this._libraryPanelInstance as LibraryPanel).resize();
  }

  override relayout(): void {
    if (
      !(this._libraryPanel && !this._libraryPanel.classList.contains("unavailable")) &&
      this.isEnabled()
    )
      this._addLibraryPanel(this._htmlElement as HTMLElement);
  }

  override init(htmlElement: HTMLElement): void {
    this._htmlElement = htmlElement;
    this._addLibraryPanel(htmlElement);
  }

  _addLibraryPanel(htmlElement: HTMLElement): void {
    if (!this._libraryPanel) {
      const toolbar = document.createElement("div");
      toolbar.className = "toolbar library-toolbar g-touch-only";
      const label = document.createElement("label");
      label.textContent = Locale.get(new LocaleKey("GLibrarySidebar", "title")) as string;
      toolbar.appendChild(label);
      htmlElement.appendChild(toolbar);
      const panel = document.createElement("div");
      const overlay = document.createElement("div");
      overlay.classList.add("overlay");
      const box = document.createElement("div");
      box.classList.add("box");
      const text = document.createElement("span");
      text.textContent = Locale.get(
        new LocaleKey("GOfflineDialog", "title.unavailable-feature"),
      ) as string;
      box.appendChild(text);
      overlay.appendChild(box);
      panel.appendChild(overlay);
      panel.classList.add("library-container");
      css(panel, "overflow", "auto");
      htmlElement.appendChild(panel);
      this._libraryPanel = panel;
    }
    const panel = this._libraryPanel;
    panel.classList.toggle("offline", isOffline());
    if (isOnline()) {
      if (panel.classList.contains("unavailable")) {
        panel.classList.remove("unavailable");
        panel.replaceChildren();
      }
      if (!isOffline()) {
        this._libraryPanelInstance = new LibraryPanel(panel);
        this._initialized = true;
      }
    } else {
      panel.classList.add("unavailable");
      const text = document.createElement("span");
      text.classList.add("span-unavailable");
      text.textContent = Locale.get(new LocaleKey("GLibrarySidebar", "text.connect")) as string;
      panel.appendChild(text);
    }
  }

  override getTouchTools(): SidebarTouchTool[] {
    return [
      new TouchTool({
        id: "libraries",
        sidebar: this.getId(),
        icon: "gravit-icon-touch-libraries-panel",
        panel: ".library-container",
      }) as unknown as SidebarTouchTool,
    ];
  }

  override toString(): string {
    return "[Object GLibrarySidebar]";
  }
}
