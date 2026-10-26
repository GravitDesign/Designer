// Old: designer.browser.dev.js module 1603 (the fast view action, unnamed; its title key is GFastViewAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { PaintCanvas } from "../../../engine/paint/paint-canvas.ts";
import { ScenePaintConfiguration } from "../../../engine/paint/scene-paint-configuration.ts";
import { PageClip } from "../../export/page-clip.ts";
import type { Window } from "../../shell/window.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { activeWindow, viewDesigner, known } from "./view-host.ts";

const PaintMode = ScenePaintConfiguration.PaintMode;

/**
 * View > Fast View: paints the active view in the fast mode with effects
 * at a lower detail level. Turning it off resets the detail level and goes
 * back to what the page's clip setting says, like Outline view: Output
 * (clipped) for a fixed-size page that clips its content, Full otherwise.
 * Old: it read clip names GPageProperties never defined, so a fixed-size
 * page always got Output (BUG-141).
 */
export class FastViewAction extends Action {
  static ID = "view.fast-view";
  static TITLE = new LocaleKey("GFastViewAction", "title");
  static GroupID = "view";

  override getId(): string {
    return FastViewAction.ID;
  }

  override getTitle(): string {
    return Locale.get(FastViewAction.TITLE) as string;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override getGroup(): string {
    return FastViewAction.GroupID;
  }

  override isEnabled(): boolean {
    return !!activeWindow();
  }

  override isCheckable(): boolean {
    return true;
  }

  override isChecked(): boolean {
    const document = viewDesigner().getActiveDocument();
    const window = document && document.getActiveWindow();
    if (window) {
      const configuration = known(window.getView()).getViewConfiguration();
      return !!configuration && configuration.paintMode === PaintMode.Fast;
    }
    return false;
  }

  override execute(): void {
    let mode: string;
    const document = known(viewDesigner().getActiveDocument());
    const configuration = known(
      (document.getActiveWindow() as Window).getView(),
    ).getViewConfiguration();
    if (configuration.paintMode === PaintMode.Fast) {
      const page = known(document.getScene()).getActivePage();
      configuration.defaultEffectDetailLevel = null;
      if (page && !page.isFixedSized()) mode = PaintMode.Full;
      else
        mode =
          (known(page).getProperty(PageClip.PAGE_CLIP_PROPERTY_NAME, true) ||
            PageClip.PAGE_CLIP_CONTENT_ENABLED) === PageClip.PAGE_CLIP_CONTENT_ENABLED
            ? PaintMode.Output
            : PaintMode.Full;
    } else {
      configuration.defaultEffectDetailLevel = 0.5 / PaintCanvas.getScreenDPI();
      mode = PaintMode.Fast;
    }
    viewDesigner().setPaintMode(mode);
    viewDesigner().updateGEditorSceneConfigurationPaintMode(mode);
  }

  override toString(): string {
    return "[GAction GFastViewAction]";
  }
}
