// Old: chunk.vendor.js module 84 (GAnnotation).
/**
 * What every review annotation shares: the meta properties (author, text,
 * timestamps, sequence, resolved and removed state, cloud ids), the
 * comments below it and the `mtime` stamp.
 *
 * The old GAnnotation was a plain function mixed into GPath, GRectangle,
 * GEllipse, GText and GSceneNode subclasses. Here `Annotation` is the
 * registered identity (`hasMixin(Annotation)`, the statics) and
 * `AnnotationMixin(Base)` adds the members.
 *
 * Timestamps: every non-custom, non-temporary property change stamps
 * `mtime` with the current time unless `mtime` is set in the same call
 * (inside a recorded transaction it is stamped anyway). A change below the
 * annotation stamps the annotation too (through the bubbling
 * BeforePropertiesChangeEvent), unless that change sets `mtime` itself,
 * as every comment change does.
 *
 * The cloud features that wrote most of these properties (comment sync,
 * collaborators) are gone, but the properties stay: files contain them.
 */
import { GDate } from "../../core/date.ts";
import { defineMixin, getTypeId, registerClass, type AnyConstructor } from "../../core/object.ts";
import { Rect } from "../../math/rect.ts";
import type {
  NodeBlob,
  RestoreChangeArgs,
  StoreChangeArgs,
  StoreOptions,
} from "../../serialize/blob.ts";
import type { PaintContext } from "../../paint/paint-context.ts";
import type { ScenePaintConfiguration } from "../../paint/scene-paint-configuration.ts";
import { ElementFlag } from "../element-change.ts";
import { NodeChange } from "../node-change.ts";
import {
  handleAnnotationLinkableChange,
  Linkable,
  type LinkableNode,
} from "../element-linkable.ts";
import type { ContainerApi } from "../node-container.ts";
import { BeforePropertiesChangeEvent } from "../node-events.ts";
import type { PropertiesApi, PropertiesChangeArgs, PropertyDefaults } from "../node-properties.ts";
import { Node } from "../node.ts";
import type { SceneNode } from "../scene-node.ts";
import { Comment } from "./comment.ts";

const Flag = {
  Hidden: ElementFlag.Hidden,
} as const;

const MetaProperties = {
  vis: true,
  name: null,
  text: null,
  img: null,
  uid: null,
  email: null,
  time: 0,
  mtime: 0,
  seq: 0,
  loc: null,
  typ: 0,
  rsv: undefined,
  rmd: false,
  sid: null,
  read: null,
  asgn: null,
  Guid: null,
  atp: null,
};

/** Properties whose changes don't stamp `mtime`: locks and rich text. */
const IgnoredProperties = ["plkt", "lkt", "rtxt"];

/** Store options the old cloud saving and the undo recorder passed. */
export interface AnnotationStoreOptions extends StoreOptions {
  /** Store the annotation's own properties in `blob.own` (cloud saving). */
  separateSaving?: boolean;
  recordedTransaction?: boolean;
  /** Values the recorder saw; they replace the defaults the blob is diffed against. */
  recordedProperties?: Record<string, unknown>;
}

/** Store/restore payloads: copies get fresh timestamps and no cloud ids. */
interface ActionArgs {
  options?: StoreOptions | null;
  blob?: NodeBlob;
}

/** The registered identity of the annotation mixin, with the old statics. */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the old GAnnotation was a bare function: an identity with statics
export class Annotation {
  static {
    registerClass(this, "GAnnotation");
  }

  static Flag: Readonly<Record<string, number>> = Flag;
  static MetaProperties: PropertyDefaults = MetaProperties;
  static IgnoredProperties: readonly string[] = IgnoredProperties;
  static Linkable = Linkable;
}

/** What a class needs to take the annotation members. */
export type AnnotationHost = SceneNode & PropertiesApi & ContainerApi;

/** The annotation members, as added by AnnotationMixin. */
export interface AnnotationApi {
  addComment(
    text: unknown,
    uid: unknown,
    name?: unknown,
    img?: unknown,
    email?: unknown,
    type?: number | null,
  ): Comment;
  isFillingCompleted(): boolean;
  isEmptyTextAllowed(): boolean;
  getNextAnnotationSequence(): number;
  storeAction(args: ActionArgs | null | undefined, name: string, value: unknown): unknown;
  isPropertiesIgnorable(names: readonly string[]): boolean;
  restoreAction(args: ActionArgs | null | undefined, name: string, value: unknown): unknown;
  initializeAnnotation(): void;
  handleBeforePropertiesChangeEvent(event: BeforePropertiesChangeEvent): void;
  handleBeforePropertiesChange(args: PropertiesChangeArgs): void;
  updateReadUnreadStatus(args: PropertiesChangeArgs): PropertiesChangeArgs;
  initDefaultForLimitedRestore(): void;
  initSizeAndPosition(): void;
  _handleAnnotationLinkableChange(change: number, args: unknown): void;
}

export type AnnotationNode = AnnotationHost & AnnotationApi;

function annotationMembers<TBase extends AnyConstructor<AnnotationHost>>(Base: TBase) {
  abstract class AnnotationMembers extends Base implements AnnotationApi {
    /** Appends a comment by `uid`, numbered after the last child. */
    addComment(
      text: unknown,
      uid: unknown,
      name?: unknown,
      img?: unknown,
      email?: unknown,
      type?: number | null,
    ): Comment {
      const comment = new Comment();
      const sequence = this.getNextAnnotationSequence();
      comment.setProperties(
        ["text", "uid", "time", "seq", "name", "img", "email", "type", "rmd"],
        [text, uid, GDate.now(), sequence, name, img, email, type || Comment.Type.User, true],
      );
      this.appendChild(comment);
      comment.setProperty("rmd", false);
      return comment;
    }

    isFillingCompleted(): boolean {
      return null !== (this as unknown as { $text: unknown }).$text;
    }

    isEmptyTextAllowed(): boolean {
      return true;
    }

    /** One more than the `seq` of the last child, 0 without children. */
    getNextAnnotationSequence(): number {
      let sequence = 0;
      const last = this.getLastChild();
      if (last) sequence = ((last as Node & PropertiesApi).getProperty("seq") as number) + 1;
      return sequence;
    }

    storeAction(args: ActionArgs | null | undefined, name: string, value: unknown): unknown {
      if (args && args.options && args.options.copy) {
        if ("rsv" === name) return false;
        if ("time" === name || "mtime" === name) return GDate.now();
        if ("Guid" === name || "sid" === name) return null;
      }
      return value;
    }

    isPropertiesIgnorable(names: readonly string[]): boolean {
      return names.every((name) => IgnoredProperties.indexOf(name) >= 0);
    }

    restoreAction(args: ActionArgs | null | undefined, name: string, value: unknown): unknown {
      if (args && args.options && args.options.copy) {
        if ("time" === name || "mtime" === name) return GDate.now();
        if ("rsv" === name) return false;
        if ("Guid" === name || "sid" === name) return null;
      }
      return value;
    }

    /** Called by every annotation constructor after the base constructor. */
    initializeAnnotation(): void {
      this.addEventListener(
        BeforePropertiesChangeEvent,
        this.handleBeforePropertiesChangeEvent,
        this,
      );
      this._setDefaultProperties(MetaProperties);
    }

    /** A descendant changes: stamp this annotation's `mtime`. */
    handleBeforePropertiesChangeEvent(event: BeforePropertiesChangeEvent): void {
      const node = event.node as Node;
      if (node === this) return;
      if (
        event.custom ||
        event.temporary ||
        this.isPropertiesIgnorable(event.properties as string[]) ||
        this.isRestoring() ||
        node.isRestoring()
      ) {
        return;
      }
      if (
        (event.properties as string[]).indexOf("mtime") < 0 ||
        this.recordedTransaction ||
        node.recordedTransaction
      ) {
        this.setProperty("mtime", GDate.now());
      }
    }

    /** Adds `mtime` (and `read` for a new `uid`) to a change of this annotation. */
    handleBeforePropertiesChange(args: PropertiesChangeArgs): void {
      if (!args.custom && !args.temporary && !this.isPropertiesIgnorable(args.properties)) {
        if (!this.isRestoring()) {
          const index = args.properties.indexOf("mtime");
          if (index < 0) {
            args.properties.push("mtime");
            args.values.push(GDate.now());
          } else if (this.recordedTransaction) args.values[index] = GDate.now();
        }
        this.updateReadUnreadStatus(args);
      }
    }

    /**
     * Whoever sets `uid` has read it: the uid joins `read`. A `read` that
     * isn't an array (a string, a number) makes this throw, as before.
     */
    updateReadUnreadStatus(args: PropertiesChangeArgs): PropertiesChangeArgs {
      return updateReadList(this, args);
    }

    initDefaultForLimitedRestore(): void {}

    initSizeAndPosition(): void {}

    _handleAnnotationLinkableChange(change: number, args: unknown): void {
      handleAnnotationLinkableChange(this as unknown as LinkableNode, change, args);
    }
  }
  return AnnotationMembers;
}

/** GAnnotation as a mixin: `class X extends AnnotationMixin(Path)`. */
export const AnnotationMixin = defineMixin(Annotation, annotationMembers);

/** Whether a node carries the annotation members. */
export function isAnnotation(node: unknown): node is AnnotationNode {
  return node instanceof Node && node.hasMixin(Annotation);
}

/**
 * The `read` bookkeeping shared by annotations and comments: a truthy
 * `uid` in the change is added to `read` (the one in the change, or a
 * copy of the current list).
 */
export function updateReadList(
  node: PropertiesApi,
  args: PropertiesChangeArgs,
): PropertiesChangeArgs {
  const uidIndex = args.properties.indexOf("uid");
  const readIndex = args.properties.indexOf("read");
  if (uidIndex >= 0 && args.values[uidIndex]) {
    const read = (
      readIndex >= 0
        ? args.values[readIndex]
        : ((node.getProperty("read") as unknown[] | null) || []).slice()
    ) as unknown[] | null;
    if (read && read.indexOf(args.values[uidIndex]) < 0) {
      read.push(args.values[uidIndex]);
      if (readIndex < 0) {
        args.properties.push("read");
        args.values.push(read);
      }
    }
  }
  return args;
}

/**
 * The defaults the annotation meta properties are diffed against when
 * stored: the class defaults, or inside a recorded transaction the values
 * the recorder passed.
 */
function storedMetaDefaults(node: Node, options: AnnotationStoreOptions): PropertyDefaults {
  let defaults: PropertyDefaults = MetaProperties;
  if (node.recordedTransaction || options.recordedTransaction) {
    const names = Object.keys(MetaProperties);
    const recorded = options.recordedProperties || {};
    const merged: Record<string, unknown> = {};
    for (let i = 0, count = names.length; i < count; i++) {
      const name = names[i] as string;
      merged[name] = Object.hasOwn(recorded, name)
        ? recorded[name]
        : (MetaProperties as Record<string, unknown>)[name];
    }
    defaults = merged;
  }
  return defaults;
}

/** Stores the annotation meta properties (the Store change of every annotation). */
export function storeAnnotationProperties(node: AnnotationNode, args: StoreChangeArgs): void {
  const defaults = storedMetaDefaults(node, args.options as AnnotationStoreOptions);
  node.storeProperties(args.blob, defaults, node.storeAction.bind(node, args));
}

/**
 * With `separateSaving`, the rest of the store goes into a nested `own`
 * blob that carries just the node name; `withBBox` adds the geometry box
 * there (highlighter and pencil).
 */
export function separateOwnBlob(
  node: AnnotationNode & { getGeometryBBox(): Rect | null },
  args: StoreChangeArgs,
  withBBox: boolean,
): void {
  const blob = args.blob;
  if (!(args.options as AnnotationStoreOptions).separateSaving) return;
  const own: NodeBlob = { "@": Node._nodeClassToNameMap.get(getTypeId(node)) };
  blob["own"] = own;
  args.blob = own;
  if (withBBox) {
    const box = node.getGeometryBBox();
    args.blob["bbox"] = box ? Rect.serialize(box) : null;
  }
}

/** Restores the annotation meta properties (the Restore change of every annotation). */
export function restoreAnnotationProperties(node: AnnotationNode, args: RestoreChangeArgs): void {
  node.restoreProperties(args.blob, MetaProperties, node.restoreAction.bind(node, args));
}

/** Resolving (`rsv`) or removing (`rmd`) changes whether an annotation shows. */
export function changesAnnotationVisibility(args: PropertiesChangeArgs): boolean {
  return args.properties.indexOf("rsv") >= 0 || args.properties.indexOf("rmd") >= 0;
}

/** An annotation drawn as a shape (rectangle, ellipse, path). */
export type ShapeAnnotationNode = AnnotationNode & {
  getGeometryBBox(): Rect | null;
  _requestInvalidation(): void;
};

/**
 * The part of `_handleChange` the shape annotations share (comment,
 * rectangle, ellipse, arrow, highlighter, pencil); the caller then calls
 * its base handler. `withBBox`: the separately saved blob gets the
 * geometry box.
 */
export function handleShapeAnnotationChange(
  node: ShapeAnnotationNode,
  change: number,
  args: unknown,
  withBBox: boolean,
): void {
  if (change === NodeChange.Store) {
    storeAnnotationProperties(node, args as StoreChangeArgs);
    separateOwnBlob(node, args as StoreChangeArgs, withBBox);
  } else if (change === NodeChange.Restore) {
    restoreAnnotationProperties(node, args as RestoreChangeArgs);
  } else if (change === NodeChange.BeforePropertiesChange) {
    node.handleBeforePropertiesChange(args as PropertiesChangeArgs);
  } else if (change == NodeChange.AfterPropertiesChange) {
    if (changesAnnotationVisibility(args as PropertiesChangeArgs)) node._requestInvalidation();
  }
}

/**
 * GElement's isPaintable for annotations: nothing to paint while the
 * configuration hides annotations, this one is removed (`rmd`) or it is
 * resolved (`rsv`) and resolved ones are hidden.
 */
export function isAnnotationShown(node: PropertiesApi, context?: PaintContext | null): boolean {
  return !(
    context && !(context.configuration as ScenePaintConfiguration).isElementAnnotationsVisible(node)
  );
}
