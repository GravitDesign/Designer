// Old: chunk.vendor.js module 366 (GComment).
/**
 * A comment in an annotation's thread, node "cmt". It lives only below a
 * node with the annotation mixin. Setting `uid` adds the uid to `read`;
 * every non-custom change stamps `mtime` unless `mtime` is set in the same
 * call. A `read` that isn't an array makes setting `uid` throw.
 */
import { GDate } from "../../core/date.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { NodeChange } from "../node-change.ts";
import type { ContainerNode } from "../node-container.ts";
import { Properties, type PropertiesChangeArgs } from "../node-properties.ts";
import { Store } from "../node-store.ts";
import { Node, registerNodeClass } from "../node.ts";
import { SceneNode } from "../scene-node.ts";
import { Annotation, updateReadList } from "./annotation.ts";

const Type = {
  User: 0,
  Open: 1,
  Close: 2,
} as const;

const MetaProperties = {
  text: null,
  uid: null,
  time: 0,
  mtime: 0,
  seq: 0,
  name: "",
  img: null,
  email: null,
  type: Type.User,
  rmd: false,
  sid: null,
  read: null,
  asgn: null,
  Guid: null,
  atp: null,
};

export class Comment extends Store(Properties(SceneNode)) {
  static {
    registerNodeClass(this, "cmt", "GComment");
  }

  static Type = Type;
  static MetaProperties: Readonly<Record<string, unknown>> = MetaProperties;

  declare $text: unknown;

  constructor() {
    super();
    this._setDefaultProperties(MetaProperties);
  }

  override validateInsertion(parent: ContainerNode): boolean {
    return parent.hasMixin(Annotation);
  }

  isFillingCompleted(): boolean {
    return null !== this.$text;
  }

  isEmptyTextAllowed(): boolean {
    return false;
  }

  /** Copies get fresh timestamps and no cloud ids. */
  storeAction(args: StoreChangeArgs | null | undefined, name: string, value: unknown): unknown {
    if (args && args.options && args.options.copy) {
      if ("time" === name || "mtime" === name) return GDate.now();
      if ("Guid" === name || "sid" === name) return null;
    }
    return value;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      const storeArgs = args as StoreChangeArgs;
      // The old code bound GComment's own storeAction, not an override.
      this.storeProperties(
        storeArgs.blob,
        MetaProperties,
        Comment.prototype.storeAction.bind(this, storeArgs),
      );
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, MetaProperties);
    } else if (change === NodeChange.BeforePropertiesChange) {
      const changed = args as PropertiesChangeArgs;
      updateReadList(this, changed);
      if (!changed.custom && !this.isRestoring()) {
        const index = changed.properties.indexOf("mtime");
        if (index < 0) {
          changed.properties.push("mtime");
          changed.values.push(GDate.now());
        } else if (this.recordedTransaction) changed.values[index] = GDate.now();
      }
    }
    // GNode's handler, as in the old code (it skipped GSceneNode's).
    Node.prototype._handleChange.call(this, change, args);
  }

  override toString(): string {
    return "[GComment]";
  }
}
