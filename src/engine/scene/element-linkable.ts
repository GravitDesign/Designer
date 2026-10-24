// Old: chunk.vendor.js module 914 (GAnnotation.Linkable).
/**
 * Annotations that point at elements (a comment pinned to a shape) save
 * the reference ids of those elements as `annotablerefs` and hand them
 * back after restore, until the document resolves them.
 *
 * The old module was applied to GAnnotation (engine-annotations-model):
 * it hung `Linkable` off GAnnotation and put
 * `_handleAnnotationLinkableChange` on GAnnotation's prototype. That
 * class sets `static Linkable = Linkable` and forwards its method to
 * `handleAnnotationLinkableChange`.
 */
import { defineMixin, type AnyConstructor } from "../core/object.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { NodeChange } from "./node-change.ts";
import type { ReferenceNode } from "./node-identity.ts";
import type { Node } from "./node.ts";

export interface LinkableApi {
  _restoredReferences: unknown;
  getAnnotableReferences(): ReferenceNode[] | null;
  _getRestoredAnnotableReferences(): unknown;
  _resetRestoredAnnotableReferences(): void;
}

export type LinkableNode = Node & LinkableApi;

const linkableBody = <TBase extends AnyConstructor<Node>>(Base: TBase) => {
  abstract class LinkableMixin extends Base implements LinkableApi {
    declare _restoredReferences: unknown;

    getAnnotableReferences(): ReferenceNode[] | null {
      throw new Error("Not implemented");
    }

    _getRestoredAnnotableReferences(): unknown {
      return this._restoredReferences;
    }

    _resetRestoredAnnotableReferences(): void {
      this._restoredReferences = null;
    }
  }
  LinkableMixin.prototype._restoredReferences = null;
  return LinkableMixin;
};

const LinkableMixin = defineMixin("GAnnotation.Linkable", linkableBody);

export const Linkable = Object.assign(LinkableMixin, {
  MetaProperties: { targetGuid: null },
});

/** GAnnotation.prototype._handleAnnotationLinkableChange: stores and restores `annotablerefs`. */
export function handleAnnotationLinkableChange(
  annotation: LinkableNode,
  change: number,
  args: unknown,
): void {
  if (change === NodeChange.Store) {
    const references = annotation.getAnnotableReferences();
    if (references && references.length) {
      (args as StoreChangeArgs).blob["annotablerefs"] = references.map((node) =>
        node.getReferenceId(),
      );
    }
  } else if (change === NodeChange.Restore) {
    const blob = (args as RestoreChangeArgs).blob;
    if (Object.hasOwn(blob, "annotablerefs"))
      annotation._restoredReferences = blob["annotablerefs"];
  }
}
