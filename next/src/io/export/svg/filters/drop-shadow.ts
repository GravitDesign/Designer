// Old: chunk.vendor.js module 1461 (the drop shadow filter writer).
import { Color } from "../../../../engine/color/color.ts";
import type { PropertiesNode as Node } from "../../../../engine/scene/node-properties.ts";
import type { FilterBuilder, FilterWriter } from "../filter-builder.ts";
import { SvgUtil } from "../svg-util.ts";

export const DropShadowFilter: FilterWriter & {
  apply(builder: FilterBuilder, effect: Node, element: unknown): void;
} = {
  groupKey: "function o() {}",

  /** The blurred source, offset, flooded with the shadow color and blended under the source. */
  apply(builder, effect) {
    const filter = builder.createParallelFilter(this);
    filter.addFilter("feGaussianBlur", {
      in: "SourceGraphic",
      stdDeviation: SvgUtil.pixelToStdDeviation(effect.getProperty("r") as number),
    });
    filter.addFilter("feOffset", {
      dx: effect.getProperty("x"),
      dy: effect.getProperty("y"),
      result: "offsetBlur",
    });
    const pattern = effect.getProperty("pat") as Color;
    const color = Color.rgbToCSS(pattern.getValue() as number[]);
    filter.addFilter("feFlood", {
      "flood-color": color,
      "flood-opacity": effect.getProperty("opc"),
    });
    filter.addFilter("feComposite", { in2: "offsetBlur", operator: "in", result: "dropShadow" });
    filter.addFilter("feBlend", { in: "SourceGraphic", in2: "dropShadow", mode: "normal" });
  },
};
