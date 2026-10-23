// Old: chunk.vendor.js module 2 (the blob format of GNode.store / GNode.restore).
/**
 * A stored node, the unit of the file format. Keys, in the order store
 * writes them:
 *
 * - `@`: the node name ("rectangle", "page", ...), the key the class is
 *   found by on restore.
 * - `@id`: the node id (GNode.Identity), left out for copies.
 * - whatever the PrepareStore handlers add.
 * - `$`: the children, in order, only when there are any.
 * - `@<name>`: custom properties, copied verbatim.
 * - `#`: the reference id (GNode.Reference), `&`: the multi-reference id
 *   (GNode.Multireference), each only when set.
 * - the class properties the Store handlers write, only those that differ
 *   from the declared defaults (Properties.storeProperties).
 */
export interface NodeBlob {
  "@"?: string;
  "@id"?: string;
  $?: NodeBlob[];
  "#"?: string;
  "&"?: string;
  [key: string]: unknown;
}

/** What `GNode.store` takes; `GNode.serialize` builds it from its own options. */
export interface StoreOptions {
  /** Saving to a file (some nodes store extra keys, the scene stamps `lmd`). */
  save?: boolean;
  /** A copy: no `@id`. */
  copy?: boolean;
  /** For copies: custom properties (`@name`) to leave out. */
  copyIgnoreProperties?: string[] | null;
  singleton?: boolean;
  /** Nodes (anywhere in the tree) that are not stored. */
  exceptions?: readonly unknown[] | false | null;
  lastModifiedDate?: unknown;
  /** Only children it accepts are stored. `serialize` doesn't pass it on. */
  passChildFilter?: (child: never) => boolean;
}

/** Options of `GNode.serialize`. */
export interface SerializeOptions extends StoreOptions {
  /** Indent the JSON by 4 spaces. */
  beautify?: boolean;
}

/** The payload of the PrepareStore and Store changes. */
export interface StoreChangeArgs {
  blob: NodeBlob;
  options: StoreOptions;
}

/** The payload of the PrepareRestore and Restore changes. */
export interface RestoreChangeArgs {
  blob: NodeBlob;
}

/** Restore progress in percent: 20 once parsed, then up to 100. */
export type ProgressCallback = (percent: number) => void;
