// Old: chunk.vendor.js module 1035 (GEmptyAnnotation).
/**
 * An annotation without a shape, node "ann": just the meta properties and
 * the comment thread. Not an element, so it is never painted or hit.
 *
 * Two old slips are kept (QUESTIONS.md):
 * - Restore read the class's own `MetaProperties`, which it never had
 *   (statics came from GSceneNode), so restoring sets none of the meta
 *   properties; a loaded "ann" keeps the defaults.
 * - `isVisible` tested `Flag.Hidden` of GSceneNode's flags, which has no
 *   such bit, so it is always true. Changing `vis` throws after setting
 *   or clearing the flag, since a scene node has no `_requestInvalidation`.
 */
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { NodeChange } from "../node-change.ts";
import { Container, type ContainerNode } from "../node-container.ts";
import { Reference } from "../node-identity.ts";
import { Properties, type PropertiesChangeArgs } from "../node-properties.ts";
import { Store } from "../node-store.ts";
import { Node, registerNodeClass } from "../node.ts";
import { SceneNode } from "../scene-node.ts";
import { Annotation, AnnotationMixin, storeAnnotationProperties } from "./annotation.ts";

/** What the old restore read: GEmptyAnnotation.MetaProperties, which was undefined. */
const RESTORED_PROPERTIES = {};

export class EmptyAnnotation extends AnnotationMixin(
  Reference(Store(Properties(Container(SceneNode)))),
) {
  static {
    registerNodeClass(this, "ann", "GEmptyAnnotation");
  }

  constructor() {
    super();
    this.initializeAnnotation();
  }

  override validateInsertion(parent: ContainerNode): boolean {
    return "annlst" === Node.getName(parent);
  }

  isVisible(): boolean {
    return true;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) storeAnnotationProperties(this, args as StoreChangeArgs);
    else if (change === NodeChange.Restore) {
      const restoreArgs = args as RestoreChangeArgs;
      this.restoreProperties(
        restoreArgs.blob,
        RESTORED_PROPERTIES,
        this.restoreAction.bind(this, restoreArgs),
      );
    } else if (change == NodeChange.AfterPropertiesChange) {
      if ((args as PropertiesChangeArgs).properties.indexOf("vis") >= 0) this._updateVisibility();
    } else if (change === NodeChange.BeforePropertiesChange) {
      this.handleBeforePropertiesChange(args as PropertiesChangeArgs);
    }
    super._handleChange(change, args);
  }

  _updateVisibility(): void {
    // Not a scene node method: the call throws a TypeError, as before.
    const self = this as unknown as { _requestInvalidation(): void };
    if (this.getProperty("vis")) {
      this.removeFlag(Annotation.Flag.Hidden as number);
      self._requestInvalidation();
    } else {
      self._requestInvalidation();
      this.setFlag(Annotation.Flag.Hidden as number);
    }
  }

  override toString(): string {
    return "[GEmptyAnnotation]";
  }
}
