import { AdjustMultiEffect } from "../../engine/style/effects/adjust-multi-effect.ts";
import { BlurEffect } from "../../engine/style/effects/blur-effect.ts";
import { ColorAdjustMultiEffect } from "../../engine/style/effects/color-adjust-multi-effect.ts";
import { ColorGradingEffect } from "../../engine/style/effects/color-grading-effect.ts";
import { ContactShadowEffect } from "../../engine/style/effects/contact-shadow-effect.ts";
import { CurvedShadowEffect } from "../../engine/style/effects/curved-shadow-effect.ts";
import { DropShadowEffect } from "../../engine/style/effects/drop-shadow-effect.ts";
import { InnerShadowEffect } from "../../engine/style/effects/inner-shadow-effect.ts";
import { LongShadowEffect } from "../../engine/style/effects/long-shadow-effect.ts";
import { MirrorEffect } from "../../engine/style/effects/mirror-effect.ts";
import { MultiEffect } from "../../engine/style/effects/multi-effect.ts";
import { OverlayEffect } from "../../engine/style/effects/overlay-effect.ts";

// Only the names the old G barrel had (vendor module 1). StackBlur and the
// curves filter were not in it.
export const engineEffectsCanvas = {
  GBlurEffect: BlurEffect,
  GInnerShadowEffect: InnerShadowEffect,
  GDropShadowEffect: DropShadowEffect,
  GColorGradingEffect: ColorGradingEffect,
  GOverlayEffect: OverlayEffect,
  GColorAdjustMultiEffect: ColorAdjustMultiEffect,
  GAdjustMultiEffect: AdjustMultiEffect,
  GMultiEffect: MultiEffect,
  GMirrorEffect: MirrorEffect,
  GContactShadowEffect: ContactShadowEffect,
  GCurvedShadowEffect: CurvedShadowEffect,
  GLongShadowEffect: LongShadowEffect,
};
