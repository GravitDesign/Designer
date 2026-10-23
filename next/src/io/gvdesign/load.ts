// Old: designer.browser.dev.js module 163 (GDocument._loadDataIntoDocument
// and GDocument.deserializeData), module 40 (sleep).
/**
 * .gvdesign bytes in, scene out (FMT-GVD-003, FMT-GVD-006): wait 10 ms,
 * unpack (gzip, or plain UTF-8 JSON), wait 10 ms, restore the scene in
 * time slices into the app's workspace. Progress reports 5, 10, 15 and
 * then the restore's 20 to 100.
 *
 * Legacy files need nothing here: the scene's restore handler marks a
 * file without a root "dictionary" as `_pre310` and texts recompute their
 * legacy height (FMT-GVD-009); "dictionary://" image and pattern URLs are
 * resolved by the scene dictionary (FMT-GVD-010).
 *
 * What stays with the app: the document status, centering the view, the
 * font wait and missing-fonts dialog. Dropped with the cloud: loading a
 * newer cloud copy when the file has cloud synchronization (`cid`/`cfs`)
 * and clearing `cfs` for files from external storage; such a file opens
 * like any other local file.
 */
import { Node } from "../../engine/scene/node.ts";
import { Scene } from "../../engine/scene/scene.ts";
import type { Workspace } from "../../engine/scene/workspace.ts";
import { unzipData } from "./format.ts";

/** module 40 sleep. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * GDocument.deserializeData without the cloud: resolves with the restored
 * scene. Like the old code it never settles when there is no scene:
 * - for empty or invalid JSON, because GNode.deserializeAsync then never
 *   calls back;
 * - when the restore gives null: the old code only went on (and resolved)
 *   when the result was truthy, so its LoadFailed branch was unreachable;
 * - when the restore gives something other than a scene (a JSON array, a
 *   root of an unknown class, a lone shape): the old code called
 *   `isCloudSynchronization()` on it, which only scenes have, and the
 *   TypeError ended the async executor without settling its promise.
 * The old document stayed in its Loading state in all three cases; see
 * "A .gvdesign that holds no scene stays Loading" in QUESTIONS.md.
 * A synchronous throw from deserializeAsync rejects, like the old
 * `.catch(o)`.
 */
export function deserializeScene(
  json: string | null,
  workspace: Workspace,
  progress?: ((percent: number) => void) | null,
): Promise<Scene> {
  if (progress) progress(15);
  return new Promise((resolve, reject) => {
    try {
      Node.deserializeAsync(json, workspace, progress, null, (result) => {
        if (result instanceof Scene) resolve(result);
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/** GDocument._loadDataIntoDocument: the scene in `bytes`. */
export async function loadGvdesign(
  bytes: Uint8Array,
  workspace: Workspace,
  progress?: ((percent: number) => void) | null,
): Promise<Scene> {
  if (progress) progress(5);
  await sleep(10);
  const json = unzipData(bytes);
  if (progress) progress(10);
  await sleep(10);
  return deserializeScene(json, workspace, progress);
}
