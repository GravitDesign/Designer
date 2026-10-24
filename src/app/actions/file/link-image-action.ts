// Old: designer.browser.dev.js module 1280 (GLinkImageAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Image as GImage } from "../../../engine/scene/image.ts";
import { FileTypes } from "../../document/file-types.ts";
import { Runtime } from "../../shell/container.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { richTooltipConfig, TOOLTIP_AREA } from "../deps.ts";
import { gContainer, gDesigner, type ActionStorage } from "../host.ts";

/** What the action uses of the scene dictionary of linked files. */
interface LinkDictionary {
  putValueIfAbsent(url: string): { getUrl(): string } | null;
}

/**
 * File > Link Image (desktop app only): inserts an image that refers to
 * the file on disk (file://) instead of embedding it.
 */
export class LinkImageAction extends Action {
  static ID = "file.link-import";
  static TITLE = new LocaleKey("GLinkImageAction", "title");
  static TOOLTIP_CONFIG: Record<string, unknown> | null = null;

  constructor() {
    super();
    LinkImageAction.TOOLTIP_CONFIG = {
      [TOOLTIP_AREA.TOOLBAR]: richTooltipConfig({
        title: Locale.get(new LocaleKey("GLinkImageAction", "tooltip-title")),
        description: Locale.get(new LocaleKey("GLinkImageAction", "tooltip-description")),
        middle: false,
        learnMore: "",
      }),
    };
  }

  override getId(): string {
    return LinkImageAction.ID;
  }

  override getTitle(): LocaleKey {
    return LinkImageAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_FILE_IMPORT;
  }

  override getGroup(): string {
    return "import/place-import";
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-link-image" : null;
  }

  override isEnabled(storage?: ActionStorage | null): boolean {
    if (gContainer().getRuntime() !== Runtime.Electron) return false;
    const designer = gDesigner();
    const document = designer.getActiveDocument();
    if (!document) return false;
    storage = storage || document.getStorage() || designer.getDefaultStorage();
    return !!storage && storage.canPromptOpen();
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
      FileTypes.getFileTypesArray().filter((type) => 0 === type.mime.indexOf("image")),
      (item) => {
        const fileUrl = "file://" + item.getUniqueId();
        let url = fileUrl;
        const entry = (
          document.getScene().getDictionary() as unknown as LinkDictionary
        ).putValueIfAbsent(url);
        if (entry) url = entry.getUrl();
        const probe = new Image();
        probe.onload = () => {
          const image = new GImage();
          image.setProperties(["iw", "ih", "url"], [probe.naturalWidth, probe.naturalHeight, url]);
          document.insertElement(image, true, true);
          if (done) done();
        };
        probe.src = fileUrl;
      },
      false,
    );
  }

  override isAvailable(): boolean {
    return gContainer().getRuntime() !== Runtime.IPad;
  }

  override getTooltipConfig(area?: string): unknown {
    return (area && LinkImageAction.TOOLTIP_CONFIG && LinkImageAction.TOOLTIP_CONFIG[area]) || null;
  }

  override toString(): string {
    return "[Object GLinkImageAction]";
  }
}
