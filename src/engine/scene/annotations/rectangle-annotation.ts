// Old: chunk.vendor.js module 316 (GRectangleAnnotation).
/**
 * A rectangle annotation, node "anr".
 */
import type { PaintContext } from "../../paint/paint-context.ts";
import type { ContainerNode } from "../node-container.ts";
import { Node, registerNodeClass } from "../node.ts";
import { Rectangle } from "../rectangle.ts";
import { AnnotationMixin, handleShapeAnnotationChange, isAnnotationShown } from "./annotation.ts";

export class RectangleAnnotation extends AnnotationMixin(Rectangle) {
  static {
    registerNodeClass(this, "anr", "GRectangleAnnotation");
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
    handleShapeAnnotationChange(this, change, args, false);
    super._handleChange(change, args);
  }

  override toString(): string {
    return "[GRectangleAnnotation]";
  }
}
