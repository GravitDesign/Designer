// Old: chunk.vendor.js module 1226 (the PDF paint style).
import { Color } from "../../../engine/color/color.ts";
import { Gradient } from "../../../engine/style/gradient.ts";
import { LinearGradient } from "../../../engine/style/linear-gradient.ts";
import { RadialGradient } from "../../../engine/style/radial-gradient.ts";
import { PDFAxialShading } from "./axial-shading.ts";
import type { PDFGradientShading, PDFPaintOptions } from "./gradient-resource.ts";
import { PDFIndirectReference } from "./indirect-reference.ts";
import { OPERATIONFLAG_STROKE } from "./operation-flags.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";
import { PDFRadialShading } from "./radial-shading.ts";
import { PDFResourceGroup, type PDFResource } from "./resource.ts";
import { PDFPatternSelection } from "./resource-operation.ts";
import { PDFShadingPattern } from "./shading-pattern.ts";
import type { PDFIndirectObject } from "./xref-entry.ts";

/** What a paint style needs from the document besides the shading parts. */
export interface PDFPaintDocument {
  addResource<T extends PDFObject>(
    type: (typeof PDFResourceGroup.Types)[keyof typeof PDFResourceGroup.Types],
    resource: PDFIndirectReference<T>,
  ): PDFResource<T>;
}

type PaintOptions = PDFPaintOptions & { doc: PDFPaintOptions["doc"] & PDFPaintDocument };

/** A component list from a color space, or a pattern selection. */
type PaintPattern = PDFObject;

/**
 * A fill or stroke paint: a color (`r g b rg`, `k`, `g`) or a gradient
 * (a shading pattern resource, `/Pattern cs /Pn scn`). Stroke operators
 * are upper case.
 */
export class PDFPaintStyle extends PDFObject {
  declare _pattern: PaintPattern | null;
  declare _operator: string | null;
  declare _operation: number | null;
  declare _valid: boolean;

  constructor(options: PaintOptions, operation: number) {
    super();
    this._valid = true;
    this._operation = operation;
    this.load(options);
  }

  isValid(): boolean {
    return this._valid;
  }

  load(options: PaintOptions): void {
    const color = options.color;
    if (color instanceof Gradient) {
      let shading: PDFGradientShading;
      if (color instanceof LinearGradient) shading = new PDFAxialShading(options);
      else {
        if (!(color instanceof RadialGradient)) {
          console.log("WARN: Unsupported gradient pattern: " + String(color));
          return;
        }
        shading = new PDFRadialShading(options);
      }
      if (!shading.isValid()) {
        this._valid = false;
        return;
      }
      const document = options.doc;
      const shadingObject = document.getIndirectObject(shading);
      const patternObject: PDFIndirectObject<PDFShadingPattern> = document.getIndirectObject(
        new PDFShadingPattern(shadingObject),
      );
      document.addIndirectObject(shadingObject);
      document.addIndirectObject(patternObject);
      const resource = document.addResource(
        PDFResourceGroup.Types.PATTERN,
        new PDFIndirectReference(patternObject),
      );
      this._pattern = new PDFPatternSelection(resource, this._operation as number);
      this._operator = "scn";
    } else {
      if (!("string" == typeof color || color instanceof Color)) {
        console.log("WARN: Unsupported color: " + String(color));
        return;
      }
      const colorSpace = options.colorSpace || options.doc.getColorSpace();
      this._pattern = colorSpace.parseColor(color);
      this._operator = colorSpace.operator;
    }
    if ((this._operation as number) & OPERATIONFLAG_STROKE) {
      this._operator = (this._operator as string).toUpperCase();
    }
  }

  getPattern(): PaintPattern | null {
    return this._pattern;
  }

  override write(output: PDFOutput): void {
    (this._pattern as PaintPattern).write(output);
    output.writeln();
    output.write(this._operator as string);
  }

  override equals(other: unknown): boolean {
    return other instanceof PDFPaintStyle && (this._pattern as PaintPattern).equals(other._pattern);
  }
}

PDFPaintStyle.prototype._pattern = null;
PDFPaintStyle.prototype._operator = null;
PDFPaintStyle.prototype._operation = null;
PDFPaintStyle.prototype._valid = true;
