// Old: chunk.vendor.js module 2 (GNode.Store).
/**
 * Marks a node as storable: `GNode.store` skips nodes without it, and
 * `clone` is a serialize/deserialize round trip.
 */
import { defineMixin, type AnyConstructor } from "../core/object.ts";
import type { SerializeOptions } from "../serialize/blob.ts";
import type { Node } from "./node.ts";

/** Node.serialize and Node.deserialize, bound by node.ts (which imports this file). */
interface NodeCodec {
  serialize(node: Node, options?: SerializeOptions): string | null;
  deserialize(json: string, constructorArg?: unknown): Node | Node[] | null;
}

let codec: NodeCodec | null = null;

/** Called once by node.ts. */
export function bindNodeCodec(nodeCodec: NodeCodec): void {
  codec = nodeCodec;
}

export interface StoreApi {
  /** A copy of the node (a node of the class its name is registered for). */
  clone(options?: SerializeOptions, constructorArg?: unknown): this | null;
}

export const Store = defineMixin(
  "GNode.Store",
  <TBase extends AnyConstructor<Node>>(Base: TBase) => {
    abstract class StoreMixin extends Base implements StoreApi {
      clone(options?: SerializeOptions, constructorArg?: unknown): this | null {
        const nodeCodec = codec as NodeCodec;
        const json = nodeCodec.serialize(this, options);
        // One node serializes to an object, so it restores to one node.
        return json ? (nodeCodec.deserialize(json, constructorArg) as this | null) : null;
      }
    }
    return StoreMixin;
  },
);

export type StoreNode = Node & StoreApi;

export function hasStore(node: Node): node is StoreNode {
  return node.hasMixin(Store);
}
