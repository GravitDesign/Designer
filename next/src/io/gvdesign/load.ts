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
import type { NodeBlob } from "../../engine/serialize/blob.ts";
import { unzipData } from "./format.ts";

/** module 40 sleep. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A .gvdesign text that holds no scene. */
export class NoSceneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoSceneError";
  }
}

/** Why `json` holds no scene, or null when its root is a scene. */
function noSceneReason(json: string | null): string | null {
  if (!json) return "the file is empty";
  let root: unknown;
  try {
    root = JSON.parse(json);
  } catch {
    return "the file is not valid JSON";
  }
  if (root === null || typeof root !== "object" || Array.isArray(root)) {
    return "the file's root is not a scene";
  }
  const blob = root as Record<string, unknown>;
  if (blob["@"] !== "scene") return "the file's root is not a scene";
  // The restore never calls back for a scene without children, and
  // throws out of its time slice for a child of an unknown class.
  const children = blob["$"];
  if (!Array.isArray(children) || !children.length) return "the file's scene has no pages";
  for (const child of children as unknown[]) {
    const name = child !== null && typeof child === "object" ? (child as NodeBlob)["@"] : null;
    if (typeof name !== "string" || !Node._nameToNodeClassMap.has(name)) {
      return "the file's scene holds an element of an unknown kind";
    }
  }
  return null;
}

/**
 * GDocument.deserializeData without the cloud: resolves with the restored
 * scene, and rejects with a NoSceneError when the text holds none; see
 * "A .gvdesign without a scene, or with cut-off JSON, stays Loading
 * forever" in BUGS-FIXED.md. The root is checked before the restore,
 * because GNode.deserializeAsync never calls back for empty or invalid
 * JSON, nor for a root without children (a lone shape, an unknown class).
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
    const reason = noSceneReason(json);
    if (reason !== null) {
      reject(new NoSceneError(reason));
      return;
    }
    try {
      Node.deserializeAsync(json, workspace, progress, null, (result) => {
        if (result instanceof Scene) resolve(result);
        else reject(new NoSceneError("the file's root is not a scene"));
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
