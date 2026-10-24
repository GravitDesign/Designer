/**
 * The select tool treats parts of the paths graph editor
 * (GPathsGraphEditor) like path parts: points and anchors are constrained
 * and snapped, segments are snapped by their box. The checks go through
 * here.
 */
import type { PartInfo } from "../../element-editors/base-editor.ts";
import { PathsGraphEditor } from "../../paths-graph/paths-graph-editor.ts";

/**
 * Whether `info` is a part of the paths graph editor whose id has one of
 * `types` (PartType names). Without `types`, any part of that editor.
 */
export function isPathsGraphPart(
  info: PartInfo | null | undefined,
  ...types: ("Point" | "Anchor" | "Segment")[]
): boolean {
  if (!info || !(info.editor instanceof PathsGraphEditor)) return false;
  if (!types.length) return true;
  // The old checks read `id.type` without a null check, so a paths graph
  // part with a null id throws here as it did there (callers that guarded
  // the id, like the points-drag check, still do).
  const id = info.id as { type?: unknown };
  const partTypes = PathsGraphEditor.PartType as Record<string, unknown>;
  for (const type of types) if (id.type == partTypes[type]) return true;
  return false;
}
