// Old: chunk.vendor.js module 370 (GTextAnnotation).
/**
 * A text note, node "ant": a GText that starts as black "New annotation"
 * (localized) in a 1:1 box. Building it already stamps `mtime`, since the
 * constructor's own property changes go through the annotation handler.
 */
import { RGBColor } from "../../color/rgb-color.ts";
import { LocaleKey } from "../../core/locale/locale-key.ts";
import { Locale } from "../../core/locale/locale.ts";
import { Transform } from "../../math/transform.ts";
import type { PaintContext } from "../../paint/paint-context.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { Text } from "../../text/text.ts";
import { NodeChange } from "../node-change.ts";
import type { ContainerNode } from "../node-container.ts";
import type { PropertiesChangeArgs } from "../node-properties.ts";
import { Node, registerNodeClass } from "../node.ts";
import {
  AnnotationMixin,
  isAnnotationShown,
  restoreAnnotationProperties,
  storeAnnotationProperties,
} from "./annotation.ts";

export class TextAnnotation extends AnnotationMixin(Text) {
  static {
    registerNodeClass(this, "ant", "GTextAnnotation");
  }

  constructor() {
    super();
    this.initializeAnnotation();
    this.transformSourceBBox(new Transform(1, 0, 0, 1, 0, 0));
    // The old code passed 1 for both flags.
    this.setText(Locale.get(new LocaleKey("GTextAnnotation", "text.new-annotation")), true, true);
    this.setProperties(["_fc"], [RGBColor.BLACK]);
  }

  override validateInsertion(parent: ContainerNode): boolean {
    return "annlst" === Node.getName(parent);
  }

  override isPaintable(context?: PaintContext | null): boolean {
    return isAnnotationShown(this, context) && super.isPaintable(context);
  }

  override isEmptyTextAllowed(): boolean {
    return false;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) storeAnnotationProperties(this, args as StoreChangeArgs);
    else if (change === NodeChange.Restore) {
      restoreAnnotationProperties(this, args as RestoreChangeArgs);
    } else if (change === NodeChange.BeforePropertiesChange) {
      this.handleBeforePropertiesChange(args as PropertiesChangeArgs);
    }
    super._handleChange(change, args);
  }

  override toString(): string {
    return "[GTextAnnotation]";
  }
}
