// Old: chunk.vendor.js module 921 (a block node of a code: list and list item).
import { uuid } from "../../core/util.ts";
import { TLNode } from "./node.ts";

/** A number field, or a method that returns one. */
function readMetric(node: TLNode, key: string): number {
  const value = (node as unknown as Record<string, unknown>)[key];
  let result = 0;
  if ("number" == typeof value) result = value;
  else if ("function" == typeof value) result = (value as () => number).call(node);
  return result;
}

/**
 * A node that groups other nodes: "list" (the list) and "item" (one list
 * item: its marker and its frame). finalize fixes the extents once the
 * children are in.
 */
export class CodeNode extends TLNode {
  uuid: string;
  _depth = 0;
  _children: TLNode[];
  _parent: TLNode | null = null;
  declare actualWidth: number;
  declare ascent: number;
  declare descent: number;
  declare baseline: number;

  constructor(type: string, parent: TLNode | null, left?: number, top?: number, depth?: number) {
    super();
    this.uuid = uuid();
    this.type = type;
    this._children = [];
    this._parent = parent;
    this._left = "number" == typeof left ? left : Number.MAX_VALUE;
    this._top = "number" == typeof top ? top : Number.MAX_VALUE;
    this._depth = "number" == typeof depth ? depth : 0;
  }

  getDepth(): number {
    return this._depth;
  }

  override children(): TLNode[] {
    return this._children;
  }

  override parent(): TLNode | null {
    return this._parent;
  }

  /**
   * Fixes ordinal, length, actual width, ascent, descent and baseline from
   * the children (read-only from then on). `ordinalShift` moves the start
   * back, `extraLength` and `extraWidth` add to the end.
   */
  finalize(ordinalShift?: number | null, extraLength?: number | null, extraWidth?: number): void {
    let first = Number.MAX_VALUE;
    let end = 0;
    let width = 0;
    let ascent = 0;
    let descent = 0;
    let baseline = Number.MAX_VALUE;
    this._children.forEach((child) => {
      first = Math.min(first, child.ordinal);
      end = Math.max(end, child.ordinal + child.length);
      width = Math.max(width, readMetric(child, "actualWidth"));
      ascent = Math.max(ascent, readMetric(child, "ascent"));
      descent = Math.max(descent, readMetric(child, "descent"));
      baseline = Math.min(baseline, readMetric(child, "baseline"));
    });
    if (extraWidth) width += extraWidth;
    Object.defineProperty(this, "ordinal", { value: first - (ordinalShift || 0) });
    Object.defineProperty(this, "length", { value: (extraLength || 0) + end - first });
    Object.defineProperty(this, "actualWidth", { value: width });
    Object.defineProperty(this, "ascent", { value: ascent });
    Object.defineProperty(this, "descent", { value: descent });
    Object.defineProperty(this, "baseline", { value: baseline });
  }
}
