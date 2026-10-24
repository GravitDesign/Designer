// Old: chunk.vendor.js module 2 (GNode.Identity, GNode.Tag, GNode.Reference, GNode.Multireference).
/**
 * The id mixins. Each id is created on first use and saved under its own
 * blob key: `@id` (Identity, 6 characters, left out of copies), `#`
 * (Reference: what links, styles and symbols point to) and `&`
 * (Multireference: shared by the copies of one node, so a symbol instance
 * finds its master's counterpart).
 */
import { defineMixin, type AnyConstructor } from "../core/object.ts";
import { uuid } from "../core/util.ts";
import type { Node } from "./node.ts";

export interface IdentityApi {
  /** The node id, kept in `__id` (null until first asked for or restored). */
  __id: string | null;
  getId(): string;
}

export const Identity = defineMixin(
  "GNode.Identity",
  <TBase extends AnyConstructor<Node>>(Base: TBase) => {
    abstract class IdentityMixin extends Base implements IdentityApi {
      declare __id: string | null;

      getId(): string {
        if (!this.__id) this.__id = uuid(6);
        return this.__id;
      }
    }
    IdentityMixin.prototype.__id = null;
    return IdentityMixin;
  },
);

export interface TagApi {
  getTags(): string[];
}

/**
 * GNode.Tag. No class mixed it in, so the old engine never gave it a type
 * id; it is a plain factory here for the same reason (hasMixin(Tag) is
 * false everywhere, as before).
 */
export const Tag = <TBase extends AnyConstructor<Node>>(Base: TBase) => {
  abstract class TagMixin extends Base implements TagApi {
    getTags(): string[] {
      throw new Error("Not Supported.");
    }
  }
  return TagMixin;
};

export interface ReferenceApi {
  _referenceId: string | null;
  /** The id this node had before it was re-identified (set by the document code). */
  _oldReferenceId: string | null;
  getOldReferenceId(): string | null;
  getReferenceId(): string;
}

export const Reference = defineMixin(
  "GNode.Reference",
  <TBase extends AnyConstructor<Node>>(Base: TBase) => {
    abstract class ReferenceMixin extends Base implements ReferenceApi {
      declare _referenceId: string | null;
      declare _oldReferenceId: string | null;

      getOldReferenceId(): string | null {
        return this._oldReferenceId;
      }

      getReferenceId(): string {
        if (!this._referenceId) this._referenceId = uuid();
        return this._referenceId;
      }
    }
    ReferenceMixin.prototype._referenceId = null;
    ReferenceMixin.prototype._oldReferenceId = null;
    return ReferenceMixin;
  },
);

export interface MultireferenceApi {
  _multiReferenceId: string | null;
  getMultireferenceId(): string;
  resetMultireference(): void;
  hasMultireference(): boolean;
}

export const Multireference = defineMixin(
  "GNode.Multireference",
  <TBase extends AnyConstructor<Node>>(Base: TBase) => {
    abstract class MultireferenceMixin extends Base implements MultireferenceApi {
      declare _multiReferenceId: string | null;

      getMultireferenceId(): string {
        if (!this._multiReferenceId) this._multiReferenceId = uuid();
        return this._multiReferenceId;
      }

      resetMultireference(): void {
        this._multiReferenceId = null;
      }

      /** True when there is no id yet: the old code had the test inverted. Kept. */
      hasMultireference(): boolean {
        return null === this._multiReferenceId;
      }
    }
    MultireferenceMixin.prototype._multiReferenceId = null;
    return MultireferenceMixin;
  },
);

export type IdentityNode = Node & IdentityApi;
export type ReferenceNode = Node & ReferenceApi;
export type MultireferenceNode = Node & MultireferenceApi;

export function hasIdentity(node: Node): node is IdentityNode {
  return node.hasMixin(Identity);
}

export function hasReference(node: Node): node is ReferenceNode {
  return node.hasMixin(Reference);
}

export function hasMultireference(node: Node): node is MultireferenceNode {
  return node.hasMixin(Multireference);
}
