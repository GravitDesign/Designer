// Old: designer.browser.dev.js module 1268 (the image panel's actions).
/**
 * What the image panel's buttons do: enter or leave crop mode (resetting
 * the crop when one is shown), replace the image's bitmap from a file,
 * and reset the image to its natural size.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Platform } from "../../engine/core/platform.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Image } from "../../engine/scene/image.ts";
import { Editor } from "../../editor/editor.ts";
import { PointerTool } from "../../editor/tools/pointer-tool.ts";
import { SelectTool } from "../../editor/tools/select-tool.ts";
import { SubSelectTool } from "../../editor/tools/sub-select-tool.ts";
import type { StorageData, StorageFileType } from "../storage/storage.ts";
import { designer } from "../shell/globals.ts";
import { lateExport } from "../shell/late.ts";

/** A storage as replaceImage uses it. */
interface PromptStorage {
  canPromptOpen(): boolean;
  openPrompt(
    fileTypes: readonly StorageFileType[],
    done: (item: { read(done: (data: StorageData) => void): unknown }) => void,
    multiple?: boolean,
  ): void;
}

/** The document as replaceImage uses it. */
interface ImageDocument {
  getStorage(): unknown;
}

const loc = (table: string, key: string): string => Locale.get(new LocaleKey(table, key)) ?? "";

/** `new GMessageDialog(text).open()` (dialogs/message-dialog.ts). */
function message(text: string): void {
  const MessageDialog = lateExport<new (text: string) => { open(): void }>(
    "dialogs/message-dialog.ts",
    "MessageDialog",
  );
  if (MessageDialog) new MessageDialog(text).open();
  else console.warn("[message dialog]", text);
}

/**
 * The crop button: with `noCrop` (the image shows its crop details) the
 * crop is reset first; then the sub-select tool goes on, or off again
 * back to the pointer in select mode.
 */
export function cropImage(image: unknown, noCrop: unknown): void {
  if (!(image instanceof Image)) return;
  if (noCrop)
    Editor.tryRunTransaction(
      image,
      () => {
        const transform = image.getImageTransform();
        image.setProperties(["trf", "ut", "tl_sx"], [transform, true, 0]);
      },
      loc("GImageProperties", "action.reset-cropping"),
    );
  const manager = designer().getToolManager();
  if (manager.getActiveTool() instanceof SubSelectTool) {
    manager.activateTool(PointerTool, null, true);
    (manager.getActiveTool() as SelectTool).setEditMode(SelectTool.EditMode.Select);
  } else manager.activateTool(SubSelectTool, null, true);
}

const REPLACE_TYPES: readonly StorageFileType[] = [
  { ext: "png", mime: "image/png" },
  { ext: "jpg", mime: "image/jpeg" },
  { ext: "jpeg", mime: "image/jpeg" },
  { ext: "gif", mime: "image/gif" },
];

/**
 * The replace button: asks for a png, jpg or gif and puts its data URL
 * into the image, keeping the image's position. Too big files, data URLs
 * and bitmaps get the "image too big" message.
 */
export function replaceImage(image: unknown, document: ImageDocument): void {
  if (!(image instanceof Image)) return;
  const storage = (document.getStorage() || designer().getDefaultStorage()) as PromptStorage | null;
  if (storage && storage.canPromptOpen()) {
    storage.openPrompt(
      REPLACE_TYPES,
      (item) => {
        item.read((data) => {
          const blob = new Blob([data as BlobPart]);
          if (blob.size > Platform.maxPngDataSize) message(loc("GDocument", "text.image-too-big"));
          else {
            const reader = new FileReader();
            reader.onload = () => {
              const url = reader.result as string;
              if (url.length > Platform.maxImgDataUrlLength)
                message(loc("GDocument", "text.image-too-big"));
              else {
                const bitmap = new window.Image();
                bitmap.onload = () => {
                  if (
                    bitmap.naturalHeight > Platform.maxImgLinearDimension ||
                    bitmap.naturalWidth > Platform.maxImgLinearDimension ||
                    bitmap.naturalWidth * bitmap.naturalHeight > Platform.maxImgAreaDots
                  )
                    message(loc("GDocument", "text.image-too-big"));
                  else {
                    const manager = designer().getToolManager();
                    manager.activateTool(PointerTool);
                    if (manager.getActiveTool() instanceof SelectTool)
                      (manager.getActiveTool() as SelectTool).setEditMode(
                        SelectTool.EditMode.Select,
                      );
                    const bbox = image.getGeometryBBox() as Rect;
                    const transform = new Transform().translated(bbox.getX(), bbox.getY());
                    Editor.tryRunTransaction(
                      image,
                      () => {
                        image.setProperties(
                          ["url", "iw", "ih", "itrf"],
                          [url, bitmap.naturalWidth, bitmap.naturalHeight, transform],
                        );
                      },
                      loc("GImageProperties", "action.replace-image"),
                    );
                    if (manager.getActiveTool() instanceof SelectTool)
                      (manager.getActiveTool() as SelectTool).setEditMode(SelectTool.EditMode.Edit);
                  }
                };
                bitmap.src = url;
              }
            };
            reader.onerror = () => {
              message(loc("GDocument", "text.image-too-big"));
            };
            reader.readAsDataURL(blob);
          }
        });
      },
      false,
    );
  }
}

/** The original size button: the image's natural size at its current top left. */
export function setOriginSize(image: unknown): void {
  if (!(image instanceof Image)) return;
  Editor.tryRunTransaction(
    image,
    () => {
      const bbox = image.getGeometryBBox();
      const x = bbox ? bbox.getX() : 0;
      const y = bbox ? bbox.getY() : 0;
      const transform = new Transform().translated(x, y);
      image.setProperties(
        ["trf", "itrf", "pw", "ph"],
        [transform, transform, image.getWidth(), image.getHeight()],
      );
    },
    loc("GImageProperties", "action.reset-size"),
  );
}
