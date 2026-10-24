// Old: chunk.vendor.js module 532 (GAnnotable).
/**
 * Elements annotations can be linked to: the scene keeps the links, so an
 * annotation finds the elements it points at and the other way round.
 */
import { defineMixin, type AnyConstructor } from "../../core/object.ts";
import type { SceneHooks, SceneNode } from "../scene-node.ts";
import { Linkable } from "../element-linkable.ts";
import { Annotation } from "./annotation.ts";

export interface AnnotableApi {
  linkAnnotation(annotation: SceneNode): boolean;
  getLinkedAnnotations(): SceneNode[];
}

function annotableMembers<TBase extends AnyConstructor<SceneNode>>(Base: TBase) {
  abstract class AnnotableMembers extends Base implements AnnotableApi {
    /** Links a linkable annotation to this element; false without a scene. */
    linkAnnotation(annotation: SceneNode): boolean {
      if (!annotation.hasMixin(Linkable) || !this._scene) return false;
      this._scene.link(this, annotation);
      return true;
    }

    getLinkedAnnotations(): SceneNode[] {
      const linked: SceneNode[] = [];
      if (this._scene) {
        (this._scene as SceneHooks).visitLinks(this, (node) => {
          if (node.hasMixin(Annotation)) linked.push(node);
        });
      }
      return linked;
    }
  }
  return AnnotableMembers;
}

export const Annotable = defineMixin("GAnnotable", annotableMembers);
