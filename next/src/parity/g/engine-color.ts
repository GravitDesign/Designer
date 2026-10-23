import { CMYKColor } from "../../engine/color/cmyk-color.ts";
import { Color } from "../../engine/color/color.ts";
import { ColorHelper } from "../../engine/color/color-helper.ts";
import { HSVColor } from "../../engine/color/hsv-color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Gradient } from "../../engine/style/gradient.ts";
import { LinearGradient } from "../../engine/style/linear-gradient.ts";
import { Pattern } from "../../engine/style/pattern.ts";
import { RadialGradient } from "../../engine/style/radial-gradient.ts";

export const engineColor = {
  GPattern: Pattern,
  GColor: Color,
  GRGBColor: RGBColor,
  GCMYKColor: CMYKColor,
  GHSVColor: HSVColor,
  GColorHelper: ColorHelper,
  GGradient: Gradient,
  GLinearGradient: LinearGradient,
  GRadialGradient: RadialGradient,
};

// The old app loads the CMYK profile once its UI is up (GDesigner init).
// Until the new shell does the same, the parity build starts the load
// here, so CMYK conversions switch to the profile the same way.
if (typeof window !== "undefined") Color.setCMYKProfile("USWebCoatedSWOPv2", "assets/data/icc/");
