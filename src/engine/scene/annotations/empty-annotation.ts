// Old: chunk.vendor.js module 1035 (GEmptyAnnotation).
/**
 * An annotation without a shape, node "ann": just the meta properties and
 * the comment thread. Not an element, so it is never painted or hit.
 *
 * BUG-003 (BUGS-FIXED.md): the old restore read the class's own
 * `MetaProperties`, which it never had (statics came from GSceneNode), so
 * a loaded "ann" lost all its meta properties. It now restores
 * Annotation.MetaProperties like the other annotations.
 *
 * One old slip is kept (QUESTIONS.md, "Annotation model slips kept"):
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
import {
  Annotation,
  AnnotationMixin,
  restoreAnnotationProperties,
  storeAnnotationProperties,
} from "./annotation.ts";

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
      restoreAnnotationProperties(this, args as RestoreChangeArgs);
    } else if (change == NodeChange.AfterPropertiesChange) {
      if ((args as PropertiesChangeArgs).properties.indexOf("vis") >= 0) {
        // BUG-003: now that restore sets `vis`, loading a hidden "ann" must
        // not run the throwing _updateVisibility; it only sets the flag.
        if (this.isRestoring()) this._restoreVisibility();
        else this._updateVisibility();
      }
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

  _restoreVisibility(): void {
    if (this.getProperty("vis")) this.removeFlag(Annotation.Flag.Hidden as number);
    else this.setFlag(Annotation.Flag.Hidden as number);
  }

  override toString(): string {
    return "[GEmptyAnnotation]";
  }
}
