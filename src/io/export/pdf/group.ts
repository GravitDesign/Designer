// Old: chunk.vendor.js module 1224 (the PDF transparency group attributes).
import type { PDFColorSpace } from "./color-spaces.ts";
import { PDFDictionary } from "./pdf-dictionary.ts";

export interface GroupOptions {
  subType?: string;
  individual?: boolean;
  colorSpace?: PDFColorSpace;
}

/** `<</Type /Group/S /Transparency[/I true][/CS ...]>>`. */
export class PDFGroup extends PDFDictionary {
  static SubType = { DEFAULT: "Transparency" } as const;

  constructor(options?: GroupOptions) {
    super();
    options = options || {};
    this.put("/Type", "/Group");
    this.put("/S", "/" + (options.subType || PDFGroup.SubType.DEFAULT));
    if (options.individual) this.put("/I", options.individual);
    if (options.colorSpace) this.put("/CS", options.colorSpace.name);
  }
}
