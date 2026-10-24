// Old: designer.browser.dev.js module 1297 (GOutlineViewAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { ScenePaintConfiguration } from "../../../engine/paint/scene-paint-configuration.ts";
import { PageClip } from "../../export/page-clip.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { activeWindow, activeWindowView, viewDesigner, known } from "./view-host.ts";

const PaintMode = ScenePaintConfiguration.PaintMode;

/**
 * View > Outline (Alt+Y): paints the active view as outlines. Turning it
 * off goes back to what the page's clip setting says: Output (clipped) for
 * a fixed-size page that clips its content, Full otherwise. The editor's
 * paint configuration follows (outline and full only).
 */
export class OutlineViewAction extends Action {
  static ID = "view.outline-view";
  static TITLE = new LocaleKey("GOutlineViewAction", "title");
  static GroupID = "view";
  static StoragePropertyName = "designer.settings.outline-view.enabled";

  override getId(): string {
    return OutlineViewAction.ID;
  }

  override getTitle(): string {
    return Locale.get(OutlineViewAction.TITLE) as string;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override getGroup(): string {
    return OutlineViewAction.GroupID;
  }

  override isCheckable(): boolean {
    return true;
  }

  override getIcon(): string | null {
    return viewDesigner().isTouchEnabled() ? "gravit-icon-out-line" : null;
  }

  override isChecked(): boolean {
    const window = activeWindow();
    if (window) {
      const configuration = known(window.getView()).getViewConfiguration();
      return !!configuration && configuration.paintMode === PaintMode.Outline;
    }
    return false;
  }

  override isEnabled(): boolean {
    return !!activeWindow();
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.OPTION, "Y"];
  }

  override execute(): void {
    let mode: string;
    if (activeWindowView().getViewConfiguration().paintMode === PaintMode.Outline) {
      const document = viewDesigner().getActiveDocument();
      if (document) {
        const page = known(document.getScene()).getActivePage();
        if (page && !page.isFixedSized()) mode = PaintMode.Full;
        else
          mode =
            (known(page).getProperty(PageClip.PAGE_CLIP_PROPERTY_NAME, true) ||
              PageClip.PAGE_CLIP_CONTENT_ENABLED) === PageClip.PAGE_CLIP_CONTENT_ENABLED
              ? PaintMode.Output
              : PaintMode.Full;
      } else mode = PaintMode.Output;
    } else mode = PaintMode.Outline;
    viewDesigner().setPaintMode(mode);
    viewDesigner().updateGEditorSceneConfigurationPaintMode(mode);
  }

  override toString(): string {
    return "[Object GOutlineViewAction]";
  }
}
