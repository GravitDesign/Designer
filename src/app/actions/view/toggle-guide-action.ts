// Old: designer.browser.dev.js module 1287 (GToggleGuideAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { viewDesigner } from "./view-host.ts";

/**
 * View > Snap > Snap to <guide>: adds or removes one guide id in the
 * snap_guides setting. The designer copies the setting into
 * Guides.options.guides when it changes, so snapping follows at once.
 * Disabled while snapping is off.
 */
export class ToggleGuideAction extends Action {
  static ID = "view.toggle-guide";

  private readonly _guideId: string;
  private readonly _guideName: string;

  /** `guideId` is the guide's ID ("guide.grid"); `guideName` the resolved name for the title. */
  constructor(guideId: string, guideName: string) {
    super();
    this._guideId = guideId;
    this._guideName = guideName;
  }

  override getId(): string {
    return ToggleGuideAction.ID + "." + this._guideId;
  }

  override getTitle(): string {
    return (Locale.get(new LocaleKey("GCommonNames", "text.snap-to-action")) as string).replace(
      "%action",
      this._guideName,
    );
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW_SNAP;
  }

  override getGroup(): string {
    return "snap/guide";
  }

  override isCheckable(): boolean {
    return true;
  }

  override isEnabled(): boolean {
    return !viewDesigner().getSetting("snap_disabled");
  }

  override isChecked(): boolean {
    return (viewDesigner().getSetting("snap_guides") as string[]).indexOf(this._guideId) >= 0;
  }

  override execute(): void {
    const guides = (viewDesigner().getSetting("snap_guides") as string[]).slice();
    const index = guides.indexOf(this._guideId);
    if (index >= 0) guides.splice(index, 1);
    else guides.push(this._guideId);
    viewDesigner().setSetting("snap_guides", guides);
  }

  override toString(): string {
    return "[Object GToggleGuideAction]";
  }
}
