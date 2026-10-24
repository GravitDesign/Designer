// Old: chunk.vendor.js module 512 (GAnchorLink, not in the G barrel).
/**
 * A reference to an anchor by id that resolves to the anchor object once
 * it is known (edges of the paths graph point at anchors this way).
 */
import type { Anchor, AnchorId } from "./anchor.ts";

export class AnchorLink {
  declare _uid: AnchorId | null;
  declare _anchor: Anchor | null;

  constructor(id?: AnchorId | null, anchor?: Anchor | null) {
    if (anchor) this.setAnchor(anchor);
    else this._uid = id as AnchorId | null;
  }

  getId(): AnchorId | null {
    return this._uid;
  }

  /** A different id drops the resolved anchor. */
  setId(id: AnchorId | null): void {
    if (id && this._anchor && !(this._uid as AnchorId).isEqual(id)) this._anchor = null;
    this._uid = id;
  }

  getAnchor(): Anchor | null {
    return this._anchor;
  }

  setAnchor(anchor: Anchor): void {
    this._uid = anchor.getId();
    this._anchor = anchor;
  }

  toString(): string {
    return "[Object GAnchorLink]";
  }
}

AnchorLink.prototype._uid = null;
AnchorLink.prototype._anchor = null;
