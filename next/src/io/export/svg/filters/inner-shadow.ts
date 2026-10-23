// Old: chunk.vendor.js module 1463 (the inner shadow filter writer).
import { Color } from "../../../../engine/color/color.ts";
import type { PropertiesNode as Node } from "../../../../engine/scene/node-properties.ts";
import type { FilterBuilder, FilterWriter } from "../filter-builder.ts";
import { SvgUtil } from "../svg-util.ts";

export const InnerShadowFilter: FilterWriter & {
  apply(builder: FilterBuilder, effect: Node, element: unknown): void;
} = {
  groupKey: "function o() {}",

  /** The offset, blurred source cut out of itself, flooded with the shadow color, over the source. */
  apply(builder, effect) {
    const filter = builder.createParallelFilter(this);
    filter.addFilter("feOffset", {
      in: "SourceGraphic",
      dx: effect.getProperty("x"),
      dy: effect.getProperty("y"),
    });
    filter.addFilter("feGaussianBlur", {
      stdDeviation: SvgUtil.pixelToStdDeviation(effect.getProperty("r") as number),
      result: "offsetBlur",
    });
    filter.addFilter("feComposite", {
      in: "SourceGraphic",
      in2: "offsetBlur",
      result: "inverse",
      operator: "out",
    });
    const pattern = effect.getProperty("pat") as Color;
    const color = Color.rgbToCSS(pattern.getValue() as number[]);
    filter.addFilter("feFlood", {
      "flood-color": color,
      "flood-opacity": effect.getProperty("opc"),
      result: "color",
    });
    filter.addFilter("feComposite", {
      in: "color",
      in2: "inverse",
      operator: "in",
      result: "shadow",
    });
    filter.addFilter("feComposite", { in: "shadow", in2: "SourceGraphic", operator: "over" });
  },
};
