// Old: chunk.vendor.js module 1409 (the PDF graphics state parameters).
import type { Transform } from "../../../engine/math/transform.ts";
import { OPERATIONFLAG_FILL, OPERATIONFLAG_STROKE } from "./operation-flags.ts";
import { PDFDictionary } from "./pdf-dictionary.ts";

export interface ExtGStateOptions {
  opacity?: number | null;
  operation?: number | null;
  blendMode?: string | null;
  smask?: unknown;
  type?: string;
  origin?: Transform | null;
}

const BlendMode = {
  NORMAL: "Normal",
  MULTIPLY: "Multiply",
  SCREEN: "Screen",
  OVERLAY: "Overlay",
  DARKEN: "Darken",
  LIGHTEN: "Lighten",
  COLORDODGE: "ColorDodge",
  COLORBURN: "ColorBurn",
  HARDLIGHT: "HardLight",
  SOFTLIGHT: "SoftLight",
  DIFFERENCE: "Difference",
  EXCLUSION: "Exclusion",
  HUE: "Hue",
  SATURATION: "Saturation",
  COLOR: "Color",
  LUMINOSITY: "Luminosity",
} as const;

/**
 * An ExtGState: fill (`/ca`) and stroke (`/CA`) opacity, capped at 1, the
 * blend mode (`/BM`, unless normal), a soft mask and a type. `_origin`
 * is the page origin the soft mask was drawn at; the reference undoes it
 * around `gs` (see PDFGStateReference).
 */
export class PDFExtGState extends PDFDictionary {
  static BlendMode = BlendMode;

  _origin: Transform | null;

  constructor(options: ExtGStateOptions) {
    super();
    if (null != options.opacity && null != options.operation) {
      const opacity = Math.min(1, options.opacity);
      if (options.operation & OPERATIONFLAG_FILL) this.put("/ca", opacity);
      if (options.operation & OPERATIONFLAG_STROKE) this.put("/CA", opacity);
    }
    if (options.blendMode) {
      const mode = (BlendMode as Record<string, string>)[
        options.blendMode.toUpperCase().replace(/-/g, "")
      ];
      if (mode) {
        if (mode !== BlendMode.NORMAL) this.put("/BM", "/" + mode);
      } else console.log("WARN: Unsupported blend mode: " + options.blendMode);
    }
    if (options.smask) this.put("/SMask", options.smask);
    if (options.type) this.put("/Type", "/" + options.type);
    this._origin = options.origin && !options.origin.isIdentity() ? options.origin : null;
  }
}
