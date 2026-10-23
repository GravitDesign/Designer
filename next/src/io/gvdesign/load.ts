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
 * scene, or null when the JSON holds something other than a scene. Like
 * the old code it never settles for empty or invalid JSON, because
 * GNode.deserializeAsync then never calls back (the old document stays
 * in its Loading state).
 */
export function deserializeScene(
  json: string | null,
  workspace: Workspace,
  progress?: ((percent: number) => void) | null,
): Promise<Scene | null> {
  if (progress) progress(15);
  return new Promise((resolve, reject) => {
    try {
      Node.deserializeAsync(json, workspace, progress, null, (result) => {
        resolve(result instanceof Scene ? result : null);
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
): Promise<Scene | null> {
  if (progress) progress(5);
  await sleep(10);
  const json = unzipData(bytes);
  if (progress) progress(10);
  await sleep(10);
  return deserializeScene(json, workspace, progress);
}
