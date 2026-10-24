// Old: designer.browser.dev.js module 1311 (GCancelCropAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Image } from "../../../engine/scene/image.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Editor } from "../../../editor/editor.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner } from "../host.ts";
import { isCroppingImage, leaveCropMode } from "./crop-action.ts";

/**
 * Cancel Cropping: puts the image frame back onto the image (the frame
 * takes the image transform) and leaves crop mode.
 */
export class CancelCropAction extends ElementAction {
  static ID = "modify.cancel-crop";
  static TITLE = new LocaleKey("GCancelCropAction", "title");

  override getId(): string {
    return CancelCropAction.ID;
  }

  override getTitle(): LocaleKey {
    return CancelCropAction.TITLE;
  }

  override getIcon(): null {
    return null;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY;
  }

  override getGroup(): string {
    return "structure-group";
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    return isCroppingImage();
  }

  override execute(): boolean | undefined {
    if (!ElementAction.prototype.isEnabled.call(this)) return false;
    const designerDocument = gDesigner().getActiveDocument();
    if (designerDocument) {
      const selection = designerDocument.getEditor().getIndividualSelection() as Node[] | null;
      const image = selection && selection.length ? selection[0] : null;
      if (
        image &&
        image instanceof Image &&
        !Transform.equals(image.getTransform(), image.getImageTransform())
      ) {
        Editor.tryRunTransaction(
          image,
          () => {
            const imageTransform = image.getImageTransform();
            image.setProperties(["trf", "ut", "tl_sx"], [imageTransform, true, 0]);
          },
          Locale.get(CancelCropAction.TITLE) as string,
        );
      }
    }
    leaveCropMode();
    return undefined;
  }

  override toString(): string {
    return "[Object GCancelCropAction]";
  }
}
