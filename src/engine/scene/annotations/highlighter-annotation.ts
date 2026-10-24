// Old: chunk.vendor.js module 318 (GHighlighterAnnotation).
/**
 * A highlighter stroke annotation, node "anh"; saved separately with its geometry box.
 */
import type { PaintContext } from "../../paint/paint-context.ts";
import type { ContainerNode } from "../node-container.ts";
import { Node, registerNodeClass } from "../node.ts";
import { Path } from "../path.ts";
import { AnnotationMixin, handleShapeAnnotationChange, isAnnotationShown } from "./annotation.ts";

export class HighlighterAnnotation extends AnnotationMixin(Path) {
  static {
    registerNodeClass(this, "anh", "GHighlighterAnnotation");
  }

  constructor() {
    super();
    this.initializeAnnotation();
  }

  override validateInsertion(parent: ContainerNode): boolean {
    return "annlst" === Node.getName(parent);
  }

  override isPaintable(context?: PaintContext | null): boolean {
    return isAnnotationShown(this, context) && super.isPaintable(context);
  }

  override _handleChange(change: number, args?: unknown): void {
    handleShapeAnnotationChange(this, change, args, true);
    super._handleChange(change, args);
  }

  override toString(): string {
    return "[GHighlighterAnnotation]";
  }
}
