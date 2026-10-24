// Old: chunk.vendor.js module 1460 (the blur filter writer).
import type { PropertiesNode as Node } from "../../../../engine/scene/node-properties.ts";
import type { FilterBuilder, FilterWriter } from "../filter-builder.ts";
import { SvgUtil } from "../svg-util.ts";

export const BlurFilter: FilterWriter & {
  apply(builder: FilterBuilder, effect: Node, element: unknown): void;
} = {
  groupKey: "function r() {}",

  /** A Gaussian blur of the effect's radius. */
  apply(builder, effect) {
    builder.createSeriesFilter(this).addFilter("feGaussianBlur", {
      stdDeviation: SvgUtil.pixelToStdDeviation(effect.getProperty("r") as number),
    });
  },
};
