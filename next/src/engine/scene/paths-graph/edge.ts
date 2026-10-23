// Old: chunk.vendor.js module 929 (GEdge, not in the G barrel).
/**
 * A graph edge from a source to a destination anchor, held as anchor
 * links so a restored edge can name its anchors by id before they exist.
 * The old GEdge was a plain class used as a mixin (GPGEdge mixes it in);
 * both forms exist here with the same members.
 */
import { defineMixin, hasMixin, registerClass, type AnyConstructor } from "../../core/object.ts";
import { AnchorLink } from "../anchor-link.ts";
import { Anchor, type AnchorId } from "../anchor.ts";

/** An anchor or a link to one, as setSource and setDestination take them. */
export type EdgeEnd = Anchor | AnchorLink | null | undefined;

function edgeMembers<TBase extends AnyConstructor>(Base: TBase) {
  abstract class EdgeMembers extends Base {
    declare _uid: AnchorId | null;
    declare _srcAnchor: AnchorLink | null;
    declare _dstAnchor: AnchorLink | null;
    declare _directed: unknown;
    declare _data: unknown;

    getId(): AnchorId | null {
      return this._uid;
    }

    getSource(): Anchor | null {
      return (this._srcAnchor as AnchorLink).getAnchor();
    }

    getDestination(): Anchor | null {
      return (this._dstAnchor as AnchorLink).getAnchor();
    }

    getSourceId(): AnchorId | null {
      return (this._srcAnchor as AnchorLink).getId();
    }

    getDestinationId(): AnchorId | null {
      return (this._dstAnchor as AnchorLink).getId();
    }

    /** [source, destination]; an end without a link is null. */
    getAnchors(): (Anchor | null)[] {
      return [
        this._srcAnchor ? this._srcAnchor.getAnchor() : null,
        this._dstAnchor ? this._dstAnchor.getAnchor() : null,
      ];
    }

    getData(): unknown {
      return this._data;
    }

    /** A link is kept as it is, an anchor gets a new link; anything else is ignored. */
    setSource(end: EdgeEnd): void {
      if (end instanceof AnchorLink) this._srcAnchor = end;
      else if (end instanceof Anchor || hasMixin(end, Anchor)) {
        this._srcAnchor = new AnchorLink(null, end as Anchor);
      }
    }

    setDestination(end: EdgeEnd): void {
      if (end instanceof AnchorLink) this._dstAnchor = end;
      else if (end instanceof Anchor || hasMixin(end, Anchor)) {
        this._dstAnchor = new AnchorLink(null, end as Anchor);
      }
    }

    /** Takes exactly two ends: [source, destination]. */
    setAnchors(ends: readonly EdgeEnd[] | null | undefined): void {
      if (ends && 2 === ends.length) {
        this.setSource(ends[0]);
        this.setDestination(ends[1]);
      }
    }

    setData(data: unknown): void {
      this._data = data;
    }

    init(source: EdgeEnd, destination: EdgeEnd, data?: unknown): void {
      this.setSource(source);
      this.setDestination(destination);
      if (data) this.setData(data);
    }
  }
  const prototype = EdgeMembers.prototype;
  prototype._uid = null;
  prototype._srcAnchor = null;
  prototype._dstAnchor = null;
  prototype._directed = null;
  prototype._data = null;
  return EdgeMembers;
}

export class Edge extends edgeMembers(Object) {
  static {
    registerClass(this, "GEdge");
  }

  // Only the class has it: the old mixing skipped toString.
  override toString(): string {
    return "[Object GEdge]";
  }
}

/** GEdge as a mixin: `class PGEdge extends EdgeMixin(Base)`. */
export const EdgeMixin = defineMixin(Edge, edgeMembers);

/** Any object with the edge members (class or mixin). */
export type EdgeLike = InstanceType<ReturnType<typeof edgeMembers>>;
