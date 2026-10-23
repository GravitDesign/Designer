// Old: designer.browser.dev.js module 163 (the gvdesign branch of
// GDocument.store and the helper W that defers by 10 ms).
/**
 * Scene in, .gvdesign bytes out (FMT-GVD-002, FMT-PREVIEW-001): count the
 * scene's descendants, wait 10 ms, serialize with `save: true`, refuse an
 * empty or implausibly short result, wait 10 ms, build the preview (4 s at
 * most), splice it in as the first key and gzip at level 9; refuse a gzip
 * result that is not larger than 20 bytes plus the descendant count.
 *
 * What stays with the app (phase 7): the document status changes, the
 * editor save point, recent files and writing the bytes to a storage item.
 */
import { Node } from "../../engine/scene/node.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import type { SerializeOptions } from "../../engine/serialize/blob.ts";
import { gzipJson, injectPreview } from "./format.ts";
import { buildPreview } from "./preview.ts";

/** How long a save waits for the preview before it saves without one. */
export const PREVIEW_TIMEOUT = 4000;

/** Why a save failed: a GDocument locale key, or the old literal message. */
export class GvdesignStoreError extends Error {
  constructor(
    message: string,
    /** The GLocaleKey the old app showed, when it showed one. */
    readonly localeKey: { group: string; key: string } | null,
  ) {
    super(message);
    this.name = "GvdesignStoreError";
  }
}

const cannotSave = (): GvdesignStoreError =>
  new GvdesignStoreError("text.cannot-save", { group: "GDocument", key: "text.cannot-save" });

export interface StoreGvdesignOptions extends SerializeOptions {
  /** Called with 10, 50 and 75 like the old progress bar. */
  progress?: ((percent: number) => void) | null;
  /**
   * Builds the preview; the default is buildPreview. Tests and callers
   * without a canvas pass their own.
   */
  preview?: ((scene: Scene) => Promise<Blob | null>) | null;
}

/** The old W: run `callback` after 10 ms. */
function defer(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

/** The preview as a data URL, or null after an error, no blob or 4 s. */
function previewDataUrl(
  scene: Scene,
  build: (scene: Scene) => Promise<Blob | null>,
): Promise<string | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (url: string | null): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(url);
    };
    const timer = setTimeout(() => finish(null), PREVIEW_TIMEOUT);
    try {
      build(scene)
        .then((blob) => {
          if (done) return;
          if (!blob || "undefined" == typeof FileReader) return finish(null);
          const reader = new FileReader();
          reader.onloadend = () => finish(reader.result as string | null);
          reader.onerror = () => finish(null);
          reader.readAsDataURL(blob);
        })
        .catch(() => finish(null));
    } catch {
      finish(null);
    }
  });
}

/**
 * The bytes GDocument.store writes for a .gvdesign file. `options` are the
 * save options the caller passes (the old GUtil.extend({save: true},
 * options)); rejects with a GvdesignStoreError where the old code called
 * its fail callback.
 */
export async function storeGvdesign(
  scene: Scene,
  options: StoreGvdesignOptions = {},
): Promise<Uint8Array> {
  const { progress, preview, ...serializeOptions } = options;
  let descendants = 0;
  scene.acceptChildren(() => {
    descendants++;
  });
  if (progress) progress(10);
  await defer();
  let json: string | null;
  try {
    json = Node.serialize(scene, { save: true, ...serializeOptions });
  } catch (error) {
    console.error(error);
    throw cannotSave();
  }
  if (null === json || "" === json || json.length < descendants) throw cannotSave();
  if (progress) progress(50);
  await defer();
  const url = await previewDataUrl(scene, preview || buildPreview);
  const bytes = gzipJson(injectPreview(json, url));
  if (progress) progress(75);
  if (!(bytes.byteLength > 20 + descendants)) {
    throw new GvdesignStoreError("GZIP compression fail", null);
  }
  return bytes;
}
