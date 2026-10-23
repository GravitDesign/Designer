// Old: chunk.vendor.js module 1219 (the PDF node marker).
import { PDFObject } from "./pdf-object.ts";

/**
 * Marks where a node's drawing starts and ends in a content stream. It
 * writes nothing; rasterized nodes are found by their markers and their
 * drawing replaced with the bitmap.
 */
export class PDFNodeMarker extends PDFObject {
  static Type = { BEGIN: 0, END: 1 } as const;

  _node: unknown;
  _type: number;

  constructor(node: unknown, type: number) {
    super();
    this._node = node;
    this._type = type;
  }

  getType(): number {
    return this._type;
  }

  override isEmpty(): boolean {
    return true;
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof PDFNodeMarker && this._node == other._node && this._type === other._type
    );
  }
}
