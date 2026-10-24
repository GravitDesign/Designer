// Old: chunk.vendor.js module 212 (GAnnotationTool).
/**
 * What the review annotation tools share: the insert transaction carries
 * the add-annotation data (old: for the cloud comment sync). GShapeTool
 * asks for it through getAdditionalTransactionDataMixin.
 *
 * The old GAnnotationTool was a function mixed into the tools; here
 * `AnnotationTool` is the identity and `AnnotationToolMixin(Base)` adds
 * the member.
 */
import { defineMixin, registerClass, type AnyConstructor } from "../../engine/core/object.ts";
import type { Node } from "../../engine/scene/node.ts";
import { AnnotationEditor, type AnnotationTransactionData } from "./annotation-editor.ts";

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the old GAnnotationTool was a bare function used as a mixin
export class AnnotationTool {
  static {
    registerClass(this, "GAnnotationTool");
  }
}

function annotationToolMembers<TBase extends AnyConstructor>(Base: TBase) {
  abstract class AnnotationToolMembers extends Base {
    getAdditionalTransactionDataMixin(
      shape: Node,
      parent: Node | null | undefined,
    ): AnnotationTransactionData {
      return AnnotationEditor.createAddAnnotationTransactionData([shape], parent);
    }
  }
  return AnnotationToolMembers;
}

/** The annotation tool mixin: `class X extends AnnotationToolMixin(EllipseTool)`. */
export const AnnotationToolMixin = defineMixin(AnnotationTool, annotationToolMembers);
