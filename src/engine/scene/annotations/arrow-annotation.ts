// Old: chunk.vendor.js module 319 (GArrowAnnotation).
/**
 * An arrow annotation, node "anarr": a path whose end markers grow a bit faster with the border width than on plain paths.
 */
import type { PaintContext } from "../../paint/paint-context.ts";
import type { ContainerNode } from "../node-container.ts";
import { Node, registerNodeClass } from "../node.ts";
import { Path } from "../path.ts";
import { AnnotationMixin, handleShapeAnnotationChange, isAnnotationShown } from "./annotation.ts";

export class ArrowAnnotation extends AnnotationMixin(Path) {
  static {
    registerNodeClass(this, "anarr", "GArrowAnnotation");
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

  /** sqrt(w) + 2% of sqrt(w) * w: the marker scale for border width w. */
  override _calculateMarkerVerticeBorderScale(width: number): number {
    const root = Math.sqrt(width);
    return root + 0.02 * root * width;
  }

  override toString(): string {
    return "[GArrowAnnotation]";
  }
}
