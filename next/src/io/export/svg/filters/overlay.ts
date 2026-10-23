// Old: chunk.vendor.js module 1464 (the color overlay filter writer).
import type { Color } from "../../../../engine/color/color.ts";
import { RGBColor } from "../../../../engine/color/rgb-color.ts";
import type { PropertiesNode as Node } from "../../../../engine/scene/node-properties.ts";
import type { FilterBuilder, FilterWriter } from "../filter-builder.ts";
import { SvgFormat } from "../svg-format.ts";

export const OverlayFilter: FilterWriter & {
  apply(builder: FilterBuilder, effect: Node, element: Node): void;
} = {
  groupKey: "function o() {}",

  /**
   * Floods with the overlay color mixed over the element's "_fpt" fill
   * pattern (with "_fop" opacity), an old property name elements no
   * longer have.
   */
  apply(builder, effect, element) {
    const fill = SvgFormat.extractRGBA(element, "f");
    const overlay = (effect.getProperty("pat") as Color).getValue() as number[];
    overlay[3] = effect.getProperty("opc") as number;
    const mixed = RGBColor.mix(fill, overlay) as number[];
    builder.createSeriesFilter(this).addFilter("feFlood", {
      "flood-color": "rgb(" + [mixed[0], mixed[1], mixed[2]].join(",") + ")",
      "flood-opacity": 1,
    });
  },
};
