// Old: chunk.vendor.js module 923 (GTLCodes.PathNumber: a list number from the item's path).
import { StringCode } from "./string-part.ts";

/** Where a list marker sits: its item node and the item's index path in the list tree. */
export interface MarkerData {
  node: { getDepth(): number };
  pathNumber: number[];
}

/** A string code whose text is made from the item's index path. */
export class PathNumberCode extends StringCode {
  constructor(obj: unknown, data: MarkerData, format: (path: number[]) => string) {
    super(obj, format(data.pathNumber));
  }
}
