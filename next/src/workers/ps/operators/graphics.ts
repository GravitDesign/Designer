// Old: public/pscore.js, systemdict findresource … endcidrange (the second
// half of the operator table). The parts keep the old key order, so
// systemdict enumerates in the old order.
import type { PSPlainRecord } from "../objects.ts";
import { clippingOperators } from "./graphics-clipping.ts";
import { fontOperators } from "./graphics-fonts.ts";
import { geometryOperators } from "./graphics-geometry.ts";
import { imageOperators } from "./graphics-images.ts";
import { outputOperators } from "./graphics-output.ts";
import { paintOperators } from "./graphics-paint.ts";
import { resourceOperators } from "./graphics-resources.ts";
import { setupOperators } from "./graphics-setup.ts";
import { stateOperators } from "./graphics-state.ts";

export const graphicsOperators: PSPlainRecord = {
  ...resourceOperators,
  ...setupOperators,
  ...fontOperators,
  ...clippingOperators,
  ...geometryOperators,
  ...stateOperators,
  ...paintOperators,
  ...imageOperators,
  ...outputOperators,
};
