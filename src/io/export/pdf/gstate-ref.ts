// Old: chunk.vendor.js module 1407 (the PDF graphics state reference).
import type { PDFExtGState } from "./ext-gstate.ts";
import { PDFConcatMatrix } from "./op-cm.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";
import type { PDFResource } from "./resource.ts";

/**
 * `/GSn gs`. A state made for a soft mask at a page origin is set with
 * that origin undone and redone around it, so the mask lines up.
 */
export class PDFGStateReference extends PDFObject {
  resource: PDFResource<PDFExtGState>;

  constructor(resource: PDFResource<PDFExtGState>) {
    super();
    this.resource = resource;
  }

  getGState(): PDFExtGState {
    return this.resource.getPDFObject();
  }

  override write(output: PDFOutput): void {
    const origin = this.getGState()._origin;
    if (origin) {
      new PDFConcatMatrix(
        origin.inverted() as NonNullable<ReturnType<typeof origin.inverted>>,
      ).write(output);
      output.writeln();
    }
    output.write("/");
    output.write(this.resource.getName());
    output.writeSpace();
    output.write("gs");
    if (origin) {
      output.writeln();
      new PDFConcatMatrix(origin).write(output);
    }
  }
}
