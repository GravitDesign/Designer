// Old: chunk.vendor.js module 1447 (the PDF font selection).
import type { PDFFontResource } from "./font-resource.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFFont } from "./pdf-font.ts";
import type { PDFOutput } from "./output.ts";

/** `/F0 size Tf` and a newline; equal for the same font and size. */
export class PDFFontSelection extends PDFObject {
  fontResource: PDFFontResource;
  size: number;

  constructor(fontResource: PDFFontResource, size: number) {
    super();
    this.fontResource = fontResource;
    this.size = size;
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof PDFFontSelection &&
      other.fontResource.getFont().equals(this.fontResource.getFont()) &&
      other.size === this.size
    );
  }

  getFont(): PDFFont {
    return this.getFontResource().getFont();
  }

  getFontResource(): PDFFontResource {
    return this.fontResource;
  }

  override write(output: PDFOutput): void {
    output.write("/");
    output.write(this.fontResource.getName());
    output.writeSpace();
    output.write(this.size);
    output.writeSpace();
    output.writeln("Tf");
  }
}
