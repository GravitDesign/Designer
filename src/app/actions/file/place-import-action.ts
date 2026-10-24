// Old: designer.browser.dev.js module 1283 (GPlaceImportAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { FileTypes } from "../../document/file-types.ts";
import { Runtime } from "../../shell/container.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, richTooltipVideoUrl, TOOLTIP_AREA } from "../deps.ts";
import { applicationManager, gContainer, gDesigner, type ActionStorage } from "../host.ts";

/** File > Place Image (Alt+P): places or imports an image or vector file into the document. */
export class PlaceImportAction extends Action {
  static ID = "file.place-import";
  static TITLE = new LocaleKey("GPlaceImportAction", "title");
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    PlaceImportAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GPlaceImportAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GPlaceImportAction", "tooltip-description")),
        middle: false,
        video: richTooltipVideoUrl("Place_Image.mp4"),
        learnMore: "",
      }),
    };
  }

  override getId(): string {
    return PlaceImportAction.ID;
  }

  override getTitle(): LocaleKey {
    return PlaceImportAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_FILE_IMPORT;
  }

  override getGroup(): string {
    return "import/place-import";
  }

  override isVisible(): boolean {
    return gContainer().getRuntime() !== Runtime.IPad;
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-place-image" : null;
  }

  override isEnabled(storage?: ActionStorage | null): boolean {
    const designer = gDesigner();
    const document = designer.getActiveDocument();
    if (!document) return false;
    storage = storage || document.getStorage() || designer.getDefaultStorage();
    return !!storage && storage.canPromptOpen() && applicationManager().isImportResourcesEnabled();
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.OPTION, "P"];
  }

  /** Arguments as executeAction passes them: storage, done. */
  override execute(
    storage?: ActionStorage | null,
    done?: (() => void) | null,
  ): boolean | undefined {
    const designer = gDesigner();
    const document = designer.getActiveDocument();
    if (!document) return false;
    storage = storage || document.getStorage() || designer.getDefaultStorage();
    storage.openPrompt(
      FileTypes.getFileTypesArray().filter((type) => type.import_image),
      (item) => {
        document.placeOrImport(item);
        if (done) done();
      },
      false,
    );
  }

  override getTooltipConfig(area?: string): unknown {
    return (
      (area && PlaceImportAction.TOOLTIP_CONFIG && PlaceImportAction.TOOLTIP_CONFIG[area]) || null
    );
  }

  override toString(): string {
    return "[Object GPlaceImportAction]";
  }
}
