// Old: chunk.vendor.js module 267 (the GTL layout node, carota's node.js).
import { GObject } from "../../core/object.ts";
import { TLRect } from "./rect.ts";

/** The next leaf after `start` in document order, or null at the end. */
function nextLeaf(start: TLNode): TLNode | null {
  let node = start;
  for (;;) {
    const parent = node.parent();
    if (!parent) return null;
    const siblings = parent.children();
    let next = siblings[siblings.indexOf(node) + 1];
    if (next) {
      for (;;) {
        if (!next.first) console.log("Error getting node");
        const first: TLNode | undefined = next.first();
        if (!first) break;
        next = first;
      }
      return next;
    }
    node = parent;
  }
}

/**
 * A node of the laid out document: document, frame, line, positioned
 * word, positioned character, list and list item nodes, inline nodes.
 * Every node covers `length` characters from `ordinal` on.
 */
export class TLNode extends GObject {
  /** "document", "frame", "line", "word", "character", "list", "item", "inline". */
  declare type: string;
  declare ordinal: number;
  declare length: number;
  /** Set on block nodes (lists) and on list markers. */
  declare block?: boolean;
  /** Set on the last character of a paragraph. */
  declare newLine?: boolean;
  /** Set on the last character of a list. */
  declare endOfList?: boolean;
  declare _left?: number;
  declare _top?: number;

  /** The letter spacing at the end of the node; lines override it. */
  getLastValidCharSpacing(): number {
    return 0;
  }

  first(): TLNode | undefined {
    return this.children()[0];
  }

  last(): TLNode | undefined {
    return this.children()[this.children().length - 1];
  }

  /** The next leaf node in document order, or null at the end. */
  next(): TLNode | null {
    return nextLeaf(this);
  }

  previous(): TLNode | null {
    const parent = this.parent();
    if (!parent) return null;
    const siblings = parent.children();
    const previous = siblings[siblings.indexOf(this) - 1];
    if (previous) return previous;
    const parentPrevious = parent.previous();
    return parentPrevious ? (parentPrevious.last() ?? null) : null;
  }

  /** The deepest node that contains the ordinal, or this node. */
  byOrdinal(ordinal: number): TLNode {
    let found: TLNode | null = null;
    return this.children().some((child) => {
      if (
        ordinal >= child.ordinal &&
        ordinal < child.ordinal + child.length &&
        (found = child.byOrdinal(ordinal))
      ) {
        return true;
      }
      return undefined;
    })
      ? (found as unknown as TLNode)
      : this;
  }

  /** The leaf node at a point; past the end, the last leaf (or a block right after it). */
  byCoordinate(x: number, y: number): TLNode | null {
    let found: TLNode | null | undefined;
    this.children().some((child) => {
      if (child.bounds().contains(x, y) && (found = child.byCoordinate(x, y))) return true;
      return undefined;
    });
    if (!found) {
      for (found = this.last(); found;) {
        const last = found.last();
        if (!last) break;
        found = last;
      }
      const next = (found as TLNode).next();
      if (next && next.block) found = next;
    }
    return found ?? null;
  }

  draw(context: unknown, viewport?: TLRect | null): void {
    this.children().forEach((child) => {
      child.draw(context, viewport);
    });
  }

  parentOfType(type: string): TLNode | null {
    const parent = this.parent();
    return parent && (parent.type === type ? parent : parent.parentOfType(type));
  }

  /** The union of the children's bounds; NaN values are left out. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- lines take a second flag; callers pass it to any node
  bounds(actual?: boolean, tight?: boolean): TLRect {
    const count = this.children().length;
    let left = count ? Number.MAX_VALUE : (this._left as number);
    let top = count ? Number.MAX_VALUE : (this._top as number);
    let right = count ? -Number.MAX_VALUE : 0;
    let bottom = count ? -Number.MAX_VALUE : 0;
    this.children().forEach((child) => {
      const bounds = child.bounds(actual);
      if (!Number.isNaN(bounds.l)) {
        left = Math.min(left, bounds.l);
        if (!Number.isNaN(bounds.w)) right = Math.max(right, bounds.l + bounds.w);
      }
      if (!Number.isNaN(bounds.t)) {
        top = Math.min(top, bounds.t);
        if (!Number.isNaN(bounds.h)) bottom = Math.max(bottom, bounds.t + bounds.h);
      }
    });
    return new TLRect(left, top, right - left, bottom - top);
  }

  children(): TLNode[] {
    return [];
  }

  parent(): TLNode | null {
    return null;
  }
}
