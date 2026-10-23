// Old: chunk.vendor.js module 317 (GEllipseAnnotation).
/**
 * An ellipse annotation, node "ane".
 */
import type { PaintContext } from "../../paint/paint-context.ts";
import type { ContainerNode } from "../node-container.ts";
import { Node, registerNodeClass } from "../node.ts";
import { Ellipse } from "../ellipse.ts";
import { AnnotationMixin, handleShapeAnnotationChange, isAnnotationShown } from "./annotation.ts";

export class EllipseAnnotation extends AnnotationMixin(Ellipse) {
  static {
    registerNodeClass(this, "ane", "GEllipseAnnotation");
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
    return "[GEllipseAnnotation]";
  }
}
