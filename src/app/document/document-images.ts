// Old: designer.browser.dev.js module 119 (GCloud), its local parts.
/**
 * What is left of the cloud helper class without the cloud: resolving an
 * image URL from the scene dictionary (FMT-GVD-011, UI-IMAGE-002), the
 * .gvdesign unpacking (io/gvdesign/format.ts) and reading a Blob.
 *
 * Dropped with the cloud: login and sign-up, files and folders, the cloud
 * save (performSave, createFile, loadDesignData, renameFile, thumbnails),
 * cloud annotations, recent cloud files, coupons, e-mail confirmation and
 * image resolution through the cloud API, 123rf and Magenta.
 */
import { Platform } from "../../engine/core/platform.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { unzipData } from "../../io/gvdesign/format.ts";
import { documentDialogs } from "./document-host.ts";

/** The workspace's resolve-URL event as resolveImage reads it. */
export interface ResolveImageRequest {
  url: string;
  scene: {
    isReleased(): boolean;
    getDictionary(): { getEntry(url: string): { value: string } | null } | null;
  } | null;
  resolved(url: string): void;
}

export const DocumentImages = {
  unzipData,

  /**
   * Answers the workspace's request for an image URL that is a data URL
   * in the scene dictionary (warning when it is longer than the browser
   * can show). Other URLs were resolved through the cloud and stay
   * unresolved.
   */
  resolveImage(request: ResolveImageRequest): void {
    const scene = request.scene;
    if (scene && scene.isReleased()) return;
    const entry =
      scene &&
      scene.getDictionary() &&
      (
        scene.getDictionary() as NonNullable<
          ReturnType<NonNullable<ResolveImageRequest["scene"]>["getDictionary"]>
        >
      ).getEntry(request.url);
    if (entry && /^data:.{0,255};base64,/i.exec(entry.value)) {
      if (entry.value.length > Platform.maxImgDataUrlLength) {
        documentDialogs().message(
          Locale.get(new LocaleKey("GDocument", "text.image-in-design-too-big")) as string,
        );
      }
      request.resolved(entry.value);
    }
  },

  /** No cloud API: never online. */
  isOnline(): boolean {
    return false;
  },

  createUint8ArrayFromBlob(blob: Blob): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function () {
        resolve(new Uint8Array(this.result as ArrayBuffer));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  },
};

/** GCloud.resolveImage, the export the designer's resolve-URL handler looks up. */
export const resolveImage = DocumentImages.resolveImage;
