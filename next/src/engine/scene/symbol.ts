// Old: chunk.vendor.js module 216 (GSymbol).
/**
 * The symbol, node "symbol". A master symbol (`_master`, its own ids in
 * `masterRef` and `masterMultiRef`) holds the content; its clones are
 * instances, linked to the master through the scene (`masterRef`) and
 * child by child through the multireference id (`&`) every copy of a
 * node shares. `_siblingMap` maps those ids to the symbol's own nodes.
 *
 * Changes to the master's content are pushed to every instance's sibling
 * (inserts, removals, property changes; AfterSiblingUpdate tells the
 * instance). A sibling whose properties no longer match its master
 * counterpart is overridden: it moves to `_disabledSiblingMap` (saved as
 * `dsb`) and stops receiving the master's changes until it matches
 * again or is synchronized. `sbl` saves the ids of nested symbols'
 * siblings, `swp`/`swpori` the swap state of nested instances. `frame`
 * is the symbol's box in its own coordinates.
 */
import { Locale } from "../core/locale/locale.ts";
import { Event } from "../core/event.ts";
import { getTypeId, registerClass } from "../core/object.ts";
import { equals, uuid, xss } from "../core/util.ts";
import { GMath } from "../math/math.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform, type TransformDecomposition } from "../math/transform.ts";
import { ElementData } from "../paint/element-data.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../paint/paint-canvas.ts";
import { PaintContext } from "../paint/paint-context.ts";
import { RenderScheduler } from "../paint/render-scheduler.ts";
import { ScenePaintConfiguration } from "../paint/scene-paint-configuration.ts";
import type { RestoreChangeArgs, SerializeOptions, StoreChangeArgs } from "../serialize/blob.ts";
import { Effect } from "../style/effect.ts";
import { ElementStylable, type StylePaintContext } from "../style/element-stylable.ts";
import { Stylable } from "../style/stylable.ts";
import { PropertySet, PropertySetInfo } from "../style/stylable-sets.ts";
import { Formatting } from "../text/gtl/formatting.ts";
import { TLDocument } from "../text/gtl/document.ts";
import type { Run } from "../text/gtl/formatting.ts";
import { Part } from "../text/gtl/inline.ts";
import type { TLRange } from "../text/gtl/range.ts";
import { Text } from "../text/text.ts";
import { Block, LabelHolder } from "./block.ts";
import { Anchor } from "./element-anchor.ts";
import { ElementChange } from "./element-change.ts";
import { Layout } from "./element-layout.ts";
import { Transform as TransformMixin } from "./element-transform.ts";
import { Element } from "./element.ts";
import { Group } from "./group.ts";
import { Image } from "./image.ts";
import { Item } from "./item.ts";
import { NodeChange, NodeFlag } from "./node-change.ts";
import { Container, type ContainerNode } from "./node-container.ts";
import {
  AfterFlagChangeEvent,
  AfterInsertEvent,
  AfterPropertiesChangeEvent,
  AfterSpecialChangeEvent,
  BeforeInsertEvent,
  BeforePropertiesChangeEvent,
  BeforeRemoveEvent,
  AfterRemoveEvent,
} from "./node-events.ts";
import { Multireference, Reference, type MultireferenceApi } from "./node-identity.ts";
import { Properties, type PropertiesApi, type PropertiesChangeArgs } from "./node-properties.ts";
import { Node, registerNodeClass } from "./node.ts";
import { AnchorPoint, PathBase } from "./path-base.ts";
import type { ReferenceEvent } from "./reference-event.ts";
import { SceneNode, SceneNodeChange, type SceneHooks } from "./scene-node.ts";
import { Shape } from "./shape.ts";

/** The old debug log: only when the app's design-loading debug hook exists. */
declare const gdb_loaddesign: unknown;
function debugLog(message: unknown): void {
  if ("function" == typeof gdb_loaddesign) console.warn(message);
}

/**
 * Any node in a symbol's sibling maps, typed with everything the sync
 * code calls on one; which members really exist depends on the node.
 */
export interface Sibling extends Node, PropertiesApi, MultireferenceApi {
  $trf: Transform | null;
  $frame?: Rect | null;
  $masterMultiRef?: string | null;
  $swpori?: string[] | null;
  dependentUpdate: boolean;
  _relayout: boolean;
  _relayoutNow: boolean;
  _layoutTransform: Transform | null | undefined;
  skipBorderUpdate?: boolean;
  getTransform(): Transform | null;
  getImageTransform(): Transform | null;
  getSubnodeIds(ids: Record<string, Node>): void;
  acceptChildren(visitor: (node: Node) => unknown): void;
  clone(options?: SerializeOptions): Sibling | null;
  transform(
    transform: Transform,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void;
  getFrame(): Rect;
  isMaster(): boolean;
}

/** What a symbol needs from GScene (engine-scene-document). */
export interface SymbolScene extends SceneHooks {
  getWorkspace(): unknown;
  visitReferences(node: Node, visitor: (reference: Node) => void): void;
  startBlockReferenceChanges(): void;
  endBlockReferenceChanges(force?: boolean): void;
  _beginBlockEvents(eventClasses: readonly unknown[]): void;
  _endBlockEvents(eventClasses: readonly unknown[]): void;
  addEventListener(eventClass: unknown, listener: (event: never) => void, target?: object): void;
  removeEventListener(eventClass: unknown, listener: unknown, target?: object): boolean;
  _canEventBeSent(eventClass: unknown): boolean;
  _sendEvent(event: Event): void;
  constructor: { InvalidationFinishedEvent?: unknown };
}

/** What convertToMaster uses of a scene that is not (yet) the symbol's. */
interface SymbolDictionaryOwner {
  _symbolDictionary?: { _afterInsert(event: { node: Node }): void } | null;
}

/** The paint configuration as the thumbnail code reads it. */
interface ThumbnailConfiguration {
  thumbnails: boolean;
  thumbnailSize: number;
}

/** GScene.InvalidationFinishedEvent's payload. */
interface InvalidationFinished {
  configuration: ThumbnailConfiguration;
}

/** Options of `clone`: `symbolMasterReplicate` makes a copy of a master a master of its own. */
export interface SymbolCloneOptions extends SerializeOptions {
  symbolMasterReplicate?: boolean;
}

/** A text formatting change found by `_getChangedTextContentProperties`. */
interface ChangedTextProperty {
  property: string;
  value: unknown;
  oldValue: unknown;
  range: [number, number];
}

/** A run as the text-content comparison reads it. */
type RunRecord = Record<string, unknown>;

/** Numbers for code objects in runs, assigned in order of first sight (module wide, as before). */
const codeObjectIds: Record<string, number> = {};

/**
 * The plain text of runs for comparing structure: strings as they are,
 * each code object as its number, anything else "_".
 */
function runsText(runs: RunRecord[]): string {
  return runs
    .map((run) => {
      const text = run["text"];
      if ("string" == typeof text) return text;
      if ("object" == typeof text && text && (text as { $?: string }).$) {
        const key = (text as { $: string }).$;
        let id = codeObjectIds[key];
        if ("number" != typeof id) {
          id = Object.keys(codeObjectIds).length;
          codeObjectIds[key] = id;
        }
        return id;
      }
      return "_";
    })
    .join("");
}

const GeometryProperties = {
  trf: null,
  frame: null,
};

const MetaProperties = {
  masterRef: null,
  masterMultiRef: null,
  blockEv: false,
  dsb: null,
  sbl: null,
  swp: null,
  swpori: null,
};

/** The master repainted its thumbnail. */
export class SymbolThumbnailEvent extends Event {
  static {
    registerClass(this, "GSymbol.AfterThumbnailUpdate");
  }

  declare symbol: Symbol | null;
  declare image: PaintCanvas | null;

  constructor(symbol: Symbol, image: PaintCanvas | null) {
    super();
    this.symbol = symbol;
    this.image = image;
  }

  override toString(): string {
    return "[Event GSymbol.AfterThumbnailUpdate]";
  }
}
SymbolThumbnailEvent.prototype.symbol = null;
SymbolThumbnailEvent.prototype.image = null;

/** An instance's sibling was inserted, removed or updated from the master. */
export class SymbolSiblingUpdateEvent extends Event {
  static {
    registerClass(this, "GSymbol.AfterSiblingUpdate");
  }

  static INSERT = "insert";
  static REMOVE = "remove";
  static UPDATE = "update";

  declare updated: Node | null;
  declare targetNode: Node | null;
  declare type: string | null;

  constructor(targetNode: Node, updated: Node, type: string) {
    super();
    this.updated = updated;
    this.targetNode = targetNode;
    this.type = type;
  }

  override toString(): string {
    return "[Event GNode.AfterSiblingUpdate]";
  }
}
SymbolSiblingUpdateEvent.prototype.updated = null;
SymbolSiblingUpdateEvent.prototype.targetNode = null;
SymbolSiblingUpdateEvent.prototype.type = null;

const SymbolBase = LabelHolder(Reference(Layout(ElementStylable(TransformMixin(Container(Item))))));

/** The events a sibling update blocks on the container it changes. */
const INSERT_EVENTS = [
  BeforeInsertEvent,
  AfterInsertEvent,
  AfterPropertiesChangeEvent,
  BeforePropertiesChangeEvent,
];
const REMOVE_EVENTS = [
  BeforeRemoveEvent,
  AfterRemoveEvent,
  AfterPropertiesChangeEvent,
  BeforePropertiesChangeEvent,
];
const PROPERTY_EVENTS = [AfterPropertiesChangeEvent, BeforePropertiesChangeEvent];

function asSibling(node: unknown): Sibling {
  return node as Sibling;
}

export class Symbol extends SymbolBase {
  static {
    registerNodeClass(this, "symbol", "GSymbol");
  }

  /** Set by the editor while it edits an instance in place. */
  static BLOCK_EDITED = false;
  /** The key a master marks an event with so outer masters leave it alone. */
  static STOP_PROPAGATION = uuid(16);
  static UNSUPPORTED_NODES = ["[Object GPathsGraph]"];
  /** When set, removing a master unpacks and removes its instances. */
  static enableSweepInstances = false;
  static GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static override MetaProperties: Readonly<Record<string, unknown>> = MetaProperties;
  static AfterThumbnailUpdate = SymbolThumbnailEvent;
  static AfterSiblingUpdate = SymbolSiblingUpdateEvent;

  declare $trf: Transform | null;
  declare $frame: Rect | null;
  declare $masterRef: string | null;
  declare $masterMultiRef: string | null;
  declare $blockEv: boolean;
  declare $dsb: string[] | null;
  declare $sbl: string[] | null;
  declare $swp: string[] | null;
  declare $swpori: string[] | null;
  declare $name: string | null;

  declare _siblingMap: Record<string, Node>;
  declare _disabledSiblingMap: Record<string, Node>;
  declare _master: boolean;
  declare _blockEvents: number;
  declare _killEvents: boolean;
  declare _cachedImage: PaintCanvas | null;
  declare _cachedSymbolSiblings: Symbol[] | null;
  declare _shouldRepaintThumbnail: boolean;

  constructor() {
    super();
    this.temporaryReceiver = true;
    this._siblingMap = {};
    this._disabledSiblingMap = {};
    this.addEventListener(AfterInsertEvent, this._afterNodeInsert, this);
    this.addEventListener(BeforeRemoveEvent, this._beforeNodeRemove, this);
    this.addEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange, this);
    this.addEventListener(AfterFlagChangeEvent, this._afterFlagChange, this);
    this._setDefaultProperties(GeometryProperties, MetaProperties);
  }

  /**
   * Makes a master of `nodes` (those that can go into a symbol) named
   * `name`, inserted into `target` where the last of them was. Texts on
   * a path stay linked to their path.
   */
  static create(nodes: Node[], target?: ContainerNode | null, name?: string | null): Symbol {
    const symbol = new Symbol();
    symbol._master = true;
    symbol.$masterRef = symbol.getReferenceId();
    symbol.$masterMultiRef = symbol.getMultireferenceId();
    if (name) symbol.$name = xss(name);
    const accepted: Node[] = [];
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i] as Node;
      if (node.validateInsertion(symbol) && !Symbol.containsUnsupportedNodes(node))
        accepted.push(node);
    }
    if (accepted.length > 0) {
      let scene: SymbolScene | null | undefined;
      if (target && (target as unknown as SceneNode).getScene()) {
        scene = (target as unknown as SceneNode).getScene() as SymbolScene;
      } else {
        for (let i = 0; i < nodes.length && !scene; i++) {
          scene = (nodes[i] as unknown as SceneNode).getScene() as SymbolScene | null;
        }
      }
      const links: [Node, Node][] = [];
      if (scene) {
        for (let i = 0; i < accepted.length; ++i) {
          const node = accepted[i] as Node;
          if (node instanceof PathBase) {
            scene.visitReferences(node, (reference) => {
              if (reference instanceof Text) links.push([reference, node]);
            });
          }
        }
      }
      const next = (accepted[accepted.length - 1] as Node).getNext();
      if (target) {
        if (!target.isLocked() && symbol.validateInsertion(target)) {
          target.insertChild(symbol, next);
          for (let i = 0; i < accepted.length; ++i) {
            const node = accepted[i] as Node;
            if (node.getParent()) (node.getParent() as ContainerNode).removeChild(node);
            symbol.appendChild(node);
          }
        }
      } else {
        for (let i = 0; i < accepted.length; ++i) {
          const node = accepted[i] as Node;
          if (node.getParent()) (node.getParent() as ContainerNode).removeChild(node);
          symbol.appendChild(node);
        }
      }
      if (scene) {
        for (let i = 0; i < links.length; ++i) {
          const link = links[i] as [Node, Node];
          scene.link(link[0], link[1] as SceneNode);
        }
      }
    }
    symbol.setProperty("frame", symbol.getGeometryBBox());
    return symbol;
  }

  /** Whether `node` is or contains a node symbols can't hold (paths graphs); true for a non-node. */
  static containsUnsupportedNodes(node: unknown): boolean {
    if (node && node instanceof Node) {
      if (Symbol.UNSUPPORTED_NODES.indexOf(node.toString()) >= 0) return true;
      if (node.hasMixin(Container)) {
        let found = false;
        (node as ContainerNode).acceptChildren((child) => {
          if (Symbol.UNSUPPORTED_NODES.indexOf(child.toString()) >= 0) {
            found = true;
            return false;
          }
          return undefined;
        });
        return found;
      }
      return false;
    }
    return true;
  }

  /**
   * `transform` (a node's in its symbol `from`) re-based into the symbol
   * `to`: inverse(from) * transform * to. Null when `from` can't be inverted.
   */
  static _swapBaseTransforms(
    transform: Transform | null | undefined,
    from: Transform | null | undefined,
    to: Transform | null | undefined,
  ): Transform | null {
    let result: Transform | null = null;
    from = from || new Transform();
    const inverse = from.inverted();
    if (inverse) {
      result = transform ? inverse.preMultiplied(transform) : inverse;
      if (to) result = to.preMultiplied(result);
    }
    return result;
  }

  /** The [start, length] of the part of `next` that differs from `previous`. */
  static _getChangedText(next: string, previous: string): [number, number] {
    const nextLength = next.length;
    const previousLength = previous.length;
    const shorter = Math.min(nextLength, previousLength);
    let index = 0;
    while (index < shorter && next.charAt(index) == previous.charAt(index)) index++;
    const start = index;
    index = 0;
    while (
      start + index < shorter &&
      next.charAt(nextLength - index - 1) == previous.charAt(previousLength - index - 1)
    ) {
      index++;
    }
    let length = nextLength - index - start;
    if (length < 0) length = nextLength - start;
    else if (0 === length && nextLength > previousLength) length = 1;
    return [start, length];
  }

  /**
   * Copies into `target` the run properties that differ between `before`
   * and `after` (all three of the same length), skipping names `filter`
   * rejects. Returns whether anything was copied.
   */
  static _assignChangedTextContentProperties(
    before: RunRecord[],
    after: RunRecord[],
    target: RunRecord[],
    filter?: (name: string) => boolean,
  ): boolean {
    if (before.length !== after.length || after.length !== target.length) return false;
    let changed = false;
    for (let i = 0; i < before.length; i++) {
      for (const name in before[i]) {
        if ((before[i] as RunRecord)[name] !== (after[i] as RunRecord)[name]) {
          if (filter && !filter(name)) continue;
          (target[i] as RunRecord)[name] = (after[i] as RunRecord)[name];
          changed = true;
        }
      }
    }
    return changed;
  }

  /**
   * Per property of the first run of `after`: the first run range where
   * `before` and `after` disagree, with the old value. Null when none.
   */
  static _getChangedTextContentProperties(
    before: RunRecord[],
    after: RunRecord[],
  ): ChangedTextProperty[] | null {
    const changes: ChangedTextProperty[] = [];
    for (const property in after[0]) {
      let value = (after[0] as RunRecord)[property];
      let afterIndex = 0;
      let beforeIndex = 0;
      let start = 0;
      for (;;) {
        if (!(afterIndex < after.length)) {
          if (beforeIndex < before.length) {
            changes.push({
              property,
              value,
              oldValue: (before[beforeIndex] as RunRecord)[property],
              range: [start, afterIndex],
            });
            break;
          }
          break;
        }
        if (!(beforeIndex < before.length)) {
          if (0 == afterIndex) {
            while (
              afterIndex < after.length &&
              (after[afterIndex] as RunRecord)[property] === value
            )
              afterIndex++;
            changes.push({
              property,
              value,
              oldValue: before.length ? (before[beforeIndex - 1] as RunRecord)[property] : null,
              range: [0, afterIndex],
            });
            break;
          }
          changes.push({
            property,
            value,
            oldValue: before.length ? (before[beforeIndex - 1] as RunRecord)[property] : null,
            range: [start, afterIndex],
          });
          break;
        }
        if (
          (after[afterIndex] as RunRecord)[property] !==
          (before[beforeIndex] as RunRecord)[property]
        ) {
          const oldValue = (before[beforeIndex] as RunRecord)[property];
          if (0 == afterIndex) {
            while (
              afterIndex < after.length &&
              (after[afterIndex] as RunRecord)[property] === value
            )
              afterIndex++;
            changes.push({ property, value, oldValue, range: [0, afterIndex] });
            break;
          }
          changes.push({ property, value, oldValue, range: [start, afterIndex] });
          break;
        }
        value = (after[afterIndex] as RunRecord)[property];
        start = afterIndex;
        while (
          afterIndex < after.length &&
          ((after[afterIndex] as RunRecord)[property] === value ||
            !Object.prototype.hasOwnProperty.call(after[afterIndex], property))
        ) {
          afterIndex++;
        }
        while (
          beforeIndex < before.length &&
          ((before[beforeIndex] as RunRecord)[property] === value ||
            !Object.prototype.hasOwnProperty.call(before[beforeIndex], property))
        ) {
          beforeIndex++;
        }
      }
    }
    return changes.length ? changes : null;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GSymbol", "name", this.getNodeName()) as string;
  }

  /** The scene, typed as far as symbols use it. */
  _symbolScene(): SymbolScene {
    return this._scene as SymbolScene;
  }

  /**
   * Makes an instance match its master again. Without arguments: restores
   * every overridden sibling, the frame and the master's scale and skew.
   * With `node` only that sibling (and its subtree); `onlySiblings` and
   * `keepFrame` skip the frame and transform part. `synchronize(null,
   * true)` rebuilds the whole content from the master.
   */
  synchronize(node?: Node | null, onlySiblings?: boolean, keepFrame?: boolean): null | undefined {
    if (this.isMaster()) return;
    const master = this.getMasterSymbol();
    if (!master) {
      debugLog("gsymbol: No master symbol found.");
      return null;
    }
    if (
      !Symbol.BLOCK_EDITED &&
      node &&
      node !== this &&
      !this._siblingMap[asSibling(node).getMultireferenceId()]
    ) {
      for (let parent = this._symbolParent(); parent; parent = this._symbolParent(parent)) {
        if (parent._siblingMap[asSibling(node).getMultireferenceId()]) {
          return parent.synchronize(node, onlySiblings, keepFrame);
        }
      }
    }
    let restored = false;
    const anchorsByPath: Record<string, Node[]> = {};
    let nodes: Node[] = [];
    for (const id in this._disabledSiblingMap) {
      const disabled = this._disabledSiblingMap[id];
      if (disabled) {
        if (
          !node ||
          (node && (node === disabled || disabled.findParent((parent) => parent === node)))
        ) {
          this._siblingMap[id] = disabled;
          Reflect.deleteProperty(this._disabledSiblingMap, id);
          restored = true;
          if ((node || !onlySiblings) && disabled instanceof AnchorPoint) {
            const path = (disabled.getParent() as ContainerNode).getParent() as Node;
            if (nodes.indexOf(path) < 0) nodes.push(path);
          } else nodes.push(disabled);
          if (disabled instanceof Symbol) {
            disabled.acceptChildren((child) => {
              nodes.push(child);
            });
          }
        }
        if ((node || !onlySiblings) && disabled instanceof AnchorPoint) {
          const path = asSibling((disabled.getParent() as ContainerNode).getParent());
          let anchors: Node[];
          if (Object.prototype.hasOwnProperty.call(anchorsByPath, path.getMultireferenceId())) {
            anchors = anchorsByPath[path.getMultireferenceId()] as Node[];
          } else {
            anchorsByPath[path.getMultireferenceId()] = anchors = [];
          }
          anchors.push(disabled);
        }
      } else debugLog("gsymbol: disabled node was null");
    }
    if (!((node && node !== this) || onlySiblings || keepFrame)) {
      const masterFrame = master.getProperty("frame") as Rect | null;
      const frame = this.getProperty("frame") as Rect | null;
      if (masterFrame && !Rect.equals(frame, masterFrame)) {
        this.setProperty("frame", Rect.deserialize(Rect.serialize(masterFrame)));
      }
      this._matchScaleAndSkew((master.getProperty("trf") as Transform | null) || new Transform());
      const masterMultiRef = (node && asSibling(node).$masterMultiRef) || this.$masterMultiRef;
      const parent = this._symbolParent(node);
      if (parent && parent.$swp && parent.$swp.indexOf(masterMultiRef as string) % 2 == 1) {
        parent.synchronize(this);
      }
      if (!restored) return;
    }
    this.$blockEv = true;
    if (node || !onlySiblings) {
      nodes = this._sortByDepth(nodes);
      nodes.forEach((sibling) => {
        let current: Symbol | null = sibling as unknown as Symbol;
        const id = asSibling(sibling).getMultireferenceId();
        let original: Node | boolean | undefined;
        do {
          current = master._symbolParent(current);
          if (current) {
            const owner: Symbol = current === this ? master : (current.getMasterSymbol() as Symbol);
            original = owner._siblingMap[id];
            if (original) {
              const source = asSibling(original);
              const target = asSibling(sibling);
              let frameTransform: Transform | null | undefined;
              let imageTransform: Transform | null | undefined;
              if (target.hasProperty("trf")) {
                frameTransform = Symbol._swapBaseTransforms(
                  source.getTransform(),
                  owner.getTransform(),
                  current.getTransform(),
                );
              }
              if (sibling instanceof Image) {
                imageTransform = Symbol._swapBaseTransforms(
                  source.getImageTransform(),
                  owner.getTransform(),
                  current.getTransform(),
                );
              }
              if (owner === master) {
                target.assignFrom(source);
                const names = this._getStylableProperties(target);
                target.setProperties(names, target.getProperties(names));
                if (sibling instanceof PathBase) {
                  const anchors = anchorsByPath[target.getMultireferenceId()];
                  if (anchors) {
                    for (let i = 0; i < anchors.length; i++) {
                      const anchor = asSibling(anchors[i]);
                      const masterAnchor = owner._siblingMap[anchor.getMultireferenceId()];
                      if (masterAnchor) {
                        anchor.transferProperties(asSibling(masterAnchor), [
                          AnchorPoint.GeometryProperties,
                        ]);
                      }
                    }
                  }
                }
              }
              if (sibling instanceof Image)
                sibling.setProperties(["trf", "itrf"], [frameTransform, imageTransform]);
              else if (target.hasProperty("trf")) target.setProperty("trf", frameTransform);
            } else {
              const offset = this._translationSwapped(sibling);
              if (offset) {
                const target = asSibling(sibling);
                target.setProperty(
                  "trf",
                  (target.$trf || new Transform()).translated(-offset.getX(), -offset.getY()),
                );
                original = true;
              }
            }
          }
        } while (!original && current);
      });
    } else {
      const own = this.getTransform();
      this.assignFrom(master);
      const names = this._getStylableProperties(this as unknown as Sibling);
      this.setProperties(names, this.getProperties(names));
      this.setProperty("trf", own);
      this.clearChildren();
      master.acceptChildren((child) => {
        const copy = asSibling(child).clone({ symbolMasterReplicate: false } as SymbolCloneOptions);
        this.appendChild(copy as Node);
        // The master's child gets the re-based transform, not the copy (kept).
        if (child.hasMixin(Properties) && asSibling(child).hasProperty("trf")) {
          asSibling(child).setProperty(
            "trf",
            Symbol._swapBaseTransforms(
              asSibling(child).getTransform(),
              master.getTransform(),
              this.getTransform(),
            ),
          );
        }
      });
    }
    this.$blockEv = false;
  }

  /**
   * Scales and skews the symbol around its frame to match `target`'s
   * scale and skew, keeping its rotation and top left corner.
   */
  _matchScaleAndSkew(target: Transform): void {
    let own = (this.getProperty("trf") as Transform | null) || new Transform();
    const targetParts = target.decomposed() as TransformDecomposition;
    const parts = own.decomposed() as TransformDecomposition;
    const inverse = own.inverted() as Transform;
    if (
      !Transform.equals(parts.scale, targetParts.scale, 1e-4) ||
      !Transform.equals(parts.skew, targetParts.skew, 1e-4)
    ) {
      const frame = this.getFrame() as Rect;
      const center = frame.getSide(Rect.Side.CENTER);
      const topLeft = frame.getSide(Rect.Side.TOP_LEFT);
      own = own
        .translated(-center.getX(), -center.getY())
        .multiplied(parts.rotate.inverted() as Transform)
        .multiplied(parts.skew.inverted() as Transform);
      let box = Rect.fromPoints(...inverse.multiplied(own).mapQuadrilateral(frame));
      own = own
        .translated(box.getWidth() / 2, box.getHeight() / 2)
        .multiplied(parts.scale.inverted() as Transform)
        .multiplied(targetParts.scale);
      box = Rect.fromPoints(...inverse.multiplied(own).mapQuadrilateral(frame));
      own = own
        .translated(-box.getWidth() / 2, -box.getHeight() / 2)
        .multiplied(targetParts.skew)
        .multiplied(parts.rotate);
      box = Rect.fromPoints(...inverse.multiplied(own).mapQuadrilateral(frame));
      own = own
        .translated(box.getWidth() / 2, box.getHeight() / 2)
        .translated(topLeft.getX(), topLeft.getY());
      this.transform(inverse.multiplied(own));
    }
  }

  _sortByDepth(nodes: Node[]): Node[] {
    const entries: { node: Node; depth: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      let node: Node | null = nodes[i] as Node;
      let depth = 0;
      do {
        node = node.getParent();
        depth++;
      } while (node);
      entries.push({ node: nodes[i] as Node, depth });
    }
    entries.sort((a, b) => a.depth - b.depth);
    return entries.map((entry) => entry.node);
  }

  /**
   * For an instance swapped in place of another inside `parent` (or its
   * symbol parent): how far its top left is from where the original's was.
   */
  _translationSwapped(node: Node, parent?: Symbol | null): Point | null {
    if (!(node instanceof Symbol)) return null;
    if (node.isMaster()) return null;
    const owner = parent || this._symbolParent(node);
    if (!owner) return null;
    const masterMultiRef = node.$masterMultiRef;
    const index = owner.$swp && owner.$swp.indexOf(masterMultiRef as string);
    const ownerMaster = owner.getMasterSymbol();
    let original: Node | undefined;
    if (
      ownerMaster &&
      (index as number) % 2 == 1 &&
      (original =
        ownerMaster._siblingMap[(node.$swpori as string[])[(index as number) - 1] as string])
    ) {
      const transform = Symbol._swapBaseTransforms(
        asSibling(original).getTransform(),
        ownerMaster.getTransform(),
        owner.getTransform(),
      ) as Transform;
      const topLeft = node.getFrame().getSide(Rect.Side.TOP_LEFT);
      const originalTopLeft = transform
        .mapRect(asSibling(original).$frame as Rect)
        .getSide(Rect.Side.TOP_LEFT);
      return topLeft.subtract(originalTopLeft);
    }
    return null;
  }

  /** The overridden siblings, plus a copy of the frame and transform (to restore with desynchronize). */
  getDisabledSiblings(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const id in this._disabledSiblingMap) result[id] = this._disabledSiblingMap[id];
    result["SYMBOL_FRAME"] = Rect.deserialize(Rect.serialize(this.getProperty("frame") as Rect));
    result["SYMBOL_TRF"] = this.getTransform()
      ? (this.getTransform() as Transform).translated(0, 0)
      : null;
    return result;
  }

  /** Puts back the overrides `getDisabledSiblings` returned. */
  desynchronize(overrides: Record<string, unknown>): null | undefined {
    if (this.isMaster()) return;
    if (!this.getMasterSymbol()) {
      debugLog("gsymbol: No master symbol found.");
      return null;
    }
    const anchorsByPath: Record<string, Node[]> = {};
    let nodes: Node[] = [];
    for (const id in overrides) {
      const override = overrides[id];
      if (override) {
        if ("SYMBOL_FRAME" !== id && "SYMBOL_TRF" !== id) {
          let sibling: Node | undefined = this._siblingMap[id];
          if (sibling) {
            if (sibling instanceof AnchorPoint) {
              const path =
                sibling.getParent() && (sibling.getParent() as ContainerNode).getParent();
              if (path && nodes.indexOf(path) < 0) nodes.push(path);
            } else nodes.push(sibling);
          } else if ((sibling = this._disabledSiblingMap[id])) {
            if (sibling instanceof AnchorPoint) {
              const path =
                sibling.getParent() && (sibling.getParent() as ContainerNode).getParent();
              if (path && nodes.indexOf(path) < 0) nodes.push(path);
            } else nodes.push(sibling);
          } else debugLog("instance item was deleted");
          if (sibling instanceof AnchorPoint) {
            const path = asSibling((sibling.getParent() as ContainerNode).getParent());
            let anchors: Node[];
            if (Object.prototype.hasOwnProperty.call(anchorsByPath, path.getMultireferenceId())) {
              anchors = anchorsByPath[path.getMultireferenceId()] as Node[];
            } else anchorsByPath[path.getMultireferenceId()] = anchors = [];
            anchors.push(override as Node);
          }
        }
      } else debugLog("gsymbol: disabled node was null");
    }
    const frame = this.getProperty("frame") as Rect | null;
    const savedFrame = overrides["SYMBOL_FRAME"] as Rect | null | undefined;
    if (savedFrame && !Rect.equals(frame, savedFrame)) {
      this.setProperty("frame", Rect.deserialize(Rect.serialize(savedFrame)));
    }
    const savedTransform = overrides["SYMBOL_TRF"] as Transform | null | undefined;
    this._matchScaleAndSkew(savedTransform || new Transform());
    if (nodes.length) {
      nodes = this._sortByDepth(nodes);
      nodes.forEach((node) => {
        const target = asSibling(node);
        const id = target.getMultireferenceId();
        const override = overrides[id] as Sibling | undefined;
        if (override) {
          let transform: Transform | null | undefined;
          if (target.hasProperty("trf")) {
            transform = Symbol._swapBaseTransforms(
              override.getTransform(),
              savedTransform,
              this.getTransform(),
            );
          }
          target.assignFrom(override);
          const names = this._getStylableProperties(target);
          target.setProperties(names, target.getProperties(names));
          if (node instanceof PathBase) {
            const anchors = anchorsByPath[target.getMultireferenceId()];
            if (anchors) {
              for (let i = 0; i < anchors.length; i++) {
                const anchor = asSibling(anchors[i]);
                const saved = overrides[anchor.getMultireferenceId()] as Sibling | undefined;
                if (saved) anchor.transferProperties(saved, [AnchorPoint.GeometryProperties]);
              }
            }
          }
          if (target.hasProperty("trf")) target.setProperty("trf", transform);
        }
      });
    }
  }

  /**
   * Whether an instance matches its master: with no node, the frame, the
   * scale and no overrides; with a node, that it (and with `deep` its
   * subtree) isn't overridden here or in an enclosing instance.
   */
  inSync(node?: Node | null, deep?: boolean): boolean {
    if (this.isMaster()) return true;
    if (!this.getMasterSymbol()) return true;
    let subnodes: Record<string, Node> | undefined;
    let hasOverrides = false;
    if (!node || (deep && node === this.getMasterSymbol()) || node === this) {
      const masterFrame = (this.getMasterSymbol() as Symbol).getProperty("frame") as Rect | null;
      const frame = this.getProperty("frame") as Rect | null;
      if (masterFrame && !Rect.equals(frame, masterFrame)) return false;
      const masterParts = (
        ((this.getMasterSymbol() as Symbol).getProperty("trf") as Transform | null) ||
        new Transform()
      ).decomposed() as TransformDecomposition;
      const parts = (
        (this.getProperty("trf") as Transform | null) || new Transform()
      ).decomposed() as TransformDecomposition;
      if (!Transform.equals(parts.scale, masterParts.scale, 1e-4)) return false;
      for (const id in this._disabledSiblingMap) {
        void id;
        hasOverrides = true;
        break;
      }
      return !hasOverrides;
    }
    if (this._disabledSiblingMap[asSibling(node).getMultireferenceId()]) return false;
    if (deep && node && node.hasMixin(Container)) {
      subnodes = {};
      asSibling(node).getSubnodeIds(subnodes);
      for (const id in subnodes) {
        if (Object.prototype.hasOwnProperty.call(this._disabledSiblingMap, id)) return false;
      }
    }
    return (
      !deep ||
      !node ||
      node instanceof Symbol ||
      !node.findParent((parent) => {
        if (parent instanceof Symbol && !parent.isMaster()) {
          if (
            Object.prototype.hasOwnProperty.call(
              parent._disabledSiblingMap,
              asSibling(node).getMultireferenceId(),
            )
          ) {
            return true;
          }
          for (const id in subnodes) {
            const disabled = parent._disabledSiblingMap[id];
            if (disabled && !(disabled instanceof Element)) {
              if (
                disabled.findParent((ancestor) =>
                  ancestor instanceof Element ? true : undefined,
                ) === node
              ) {
                return true;
              }
            }
          }
        }
        return undefined;
      })
    );
  }

  override assignFrom(other: Node): void {
    if (other instanceof Symbol)
      this.transferProperties(other, [GeometryProperties, MetaProperties]);
    this._cachedImage = (other as Partial<Symbol>)._cachedImage as PaintCanvas | null;
    super.assignFrom(other);
  }

  /** A master is one whose multireference id is its `masterMultiRef`. */
  isMaster(): boolean {
    return this._master && this.getMultireferenceId() === this.$masterMultiRef;
  }

  /**
   * The cached thumbnail. When it needs repainting this renders a bitmap,
   * but returns the cache as it was (kept).
   */
  getSymbolImage(): PaintCanvas | null {
    if (!this._cachedImage || this._shouldRepaintThumbnail) {
      this.toBitmap(null, null, null, null, {
        paintMode: ScenePaintConfiguration.PaintMode.Fast,
        defaultEffectDetailLevel: 0.5 / Canvas2DPaintCanvas.getScreenDPI(),
      });
      return this._cachedImage;
    }
    return this._cachedImage;
  }

  /**
   * The master's node for the multireference `id`: in a master only with
   * `ownMap`; in an instance from its master, else (with `nested`) through
   * the masters of the enclosing instances.
   */
  _getMasterSibling(id: string, ownMap?: boolean, nested?: boolean): Node | null {
    if (this.isMaster()) {
      return ownMap && Object.prototype.hasOwnProperty.call(this._siblingMap, id)
        ? (this._siblingMap[id] as Node)
        : null;
    }
    const master = this.getMasterSymbol();
    if (master && Object.prototype.hasOwnProperty.call(master._siblingMap, id))
      return master._siblingMap[id] as Node;
    if (!nested) return null;
    const path: Symbol[] = [this];
    for (let current = this._symbolParent(); current; current = current._symbolParent()) {
      // From the enclosing instance's master down the path of nested instances.
      let outer: Node | Symbol | null | undefined = current.getMasterSymbol();
      if (outer) {
        for (let i = path.length; i > 0 && outer;) {
          const inner = path[--i] as Symbol;
          outer = (outer as Symbol)._siblingMap[inner.getMultireferenceId()];
        }
        if (outer && Object.prototype.hasOwnProperty.call((outer as Symbol)._siblingMap, id)) {
          return (outer as Symbol)._siblingMap[id] as Node;
        }
      }
      path.push(current);
    }
    return null;
  }

  /**
   * Turns a symbol without a master into a master named `name`. In a
   * scene it is reinserted so the scene sees a new master; outside one,
   * `scene`'s symbol dictionary is told directly.
   */
  convertToMaster(name?: string | null, scene?: SymbolDictionaryOwner | null): boolean {
    const ownScene = this._symbolScene();
    if (!this.getMasterSymbol() && (scene || ownScene)) {
      this._master = true;
      this.resetMultireference();
      const safeName = xss((name || this.getProperty("name")) as string);
      this.setProperties(
        ["masterMultiRef", "masterRef", "name"],
        [this.getMultireferenceId(), this.getReferenceId(), safeName],
      );
      if (ownScene) {
        const parent = this.getParent() as ContainerNode;
        const next = this.getNext();
        let selected = false;
        let highlighted = false;
        ownScene.startBlockReferenceChanges();
        if (this.hasFlag(NodeFlag.Selected)) {
          selected = true;
          this.removeFlag(NodeFlag.Selected);
        }
        if (this.hasFlag(NodeFlag.Highlighted)) {
          highlighted = true;
          this.removeFlag(NodeFlag.Highlighted);
        }
        parent.removeChild(this);
        parent.insertChild(this, next);
        if (selected) this.setFlag(NodeFlag.Selected);
        if (highlighted) this.setFlag(NodeFlag.Highlighted);
        ownScene.endBlockReferenceChanges();
      } else if (scene && scene._symbolDictionary) {
        scene._symbolDictionary._afterInsert({ node: this });
      }
      return true;
    }
    return false;
  }

  /** Cuts an instance loose from its master. */
  detach(): boolean {
    if (this.isMaster() || !this.getMasterSymbol() || !this.getScene()) return false;
    this._symbolScene().unlink(this.$masterRef as string, this);
    this.resetMultireference();
    this.setProperties(["masterMultiRef", "masterRef"], [null, null]);
    return true;
  }

  /**
   * Replaces this instance by an instance of `other`, at the same place
   * (top left) and with the same constraints. Inside an instance the swap
   * is recorded in the parent's `swp` (pairs of master ids, cycles removed)
   * and the new instance keeps the original's multireference id.
   */
  swapWith(other: Node): Symbol | undefined {
    if (other === this || !(other instanceof Symbol) || !this.getScene()) return undefined;
    const next = this.getNext();
    const parent = this.getParent();
    if (!parent) return undefined;
    const symbolParent = this._symbolParent();
    let id = this.getMultireferenceId();
    const parentMaster = symbolParent ? symbolParent.getMasterSymbol() : null;
    if (!this.$swpori) this.setProperty("swpori", [id, this.$masterMultiRef]);
    parent.removeChild(this);
    const copy = other.clone() as Symbol;
    copy.setProperty("swpori", (this.$swpori as string[]).slice());
    if (copy.$masterMultiRef === (this.$swpori as string[])[1]) {
      copy._multiReferenceId = (this.$swpori as string[])[0] as string;
      id = (this.$swpori as string[])[0] as string;
    }
    parent.insertChild(copy, next);
    if (parentMaster) {
      other._symbolParent();
      (symbolParent as Symbol)._siblingMap[id] = copy;
    }
    const topLeft = this.getFrame().getSide(Rect.Side.TOP_LEFT);
    const copyTopLeft = copy.getFrame().getSide(Rect.Side.TOP_LEFT);
    const delta = topLeft.subtract(copyTopLeft);
    copy.transform(new Transform().translated(delta.getX(), delta.getY()));
    const constraints = ["hacr", "vacr"];
    copy.setProperties(constraints, this.getProperties(constraints));
    const copyParent = this._symbolParent(copy);
    if (copyParent) {
      const swaps = ((copyParent.getProperty("swp") as string[] | null) || []).slice();
      debugLog("Swapped:");
      debugLog(swaps);
      swaps.push(this.$masterMultiRef as string);
      swaps.push(copy.$masterMultiRef as string);
      for (let i = 1; i < swaps.length; i += 2) {
        let to = swaps[i];
        const from = swaps[i - 1];
        if (to !== from) {
          const chain = [i - 1, i];
          for (let j = 0; j < swaps.length;) {
            if (chain.indexOf(j) >= 0) j += 2;
            else if (swaps[j] === to) {
              to = swaps[j + 1];
              chain.push(j, j + 1);
              j = 0;
              if (to === from) break;
            } else j += 2;
          }
          if (to === from) {
            chain.sort((a, b) => b - a);
            for (let j = 0; j < chain.length; j++) swaps.splice(chain[j] as number, 1);
            break;
          }
        } else {
          swaps.splice(0, 2);
          i -= 2;
          debugLog("Strange swap array!");
        }
      }
      debugLog("Swapped after:");
      debugLog(swaps);
      copyParent.setProperty("swp", swaps);
    }
    return copy;
  }

  /**
   * Replaces the content of this instance by a copy of `other`: its
   * children when `other` is this instance's master, else `other` itself.
   */
  swapWithNew(other: Node): Symbol | undefined {
    if (
      other !== this &&
      other instanceof Symbol &&
      this.getScene() &&
      this.getParent() &&
      !this.isMaster()
    ) {
      // Removing while iterating skips every other child (kept).
      for (let child = this.getFirstChild(); child; child = child.getNext())
        this.removeChild(child);
      const copy = other.clone() as Symbol;
      if (other === this.getMasterSymbol()) {
        for (let child = copy.getFirstChild(); child; child = child.getNext()) {
          copy.removeChild(child);
          this.appendChild(child);
        }
      } else this.appendChild(copy);
      return copy;
    }
    return undefined;
  }

  /**
   * The master: itself for a master, else the node the workspace knows
   * under `masterRef`, when it is in the same scene. Undefined when the
   * workspace doesn't know the id.
   */
  getMasterSymbol(): Symbol | null | undefined {
    if (this.isMaster()) return this;
    if (!this._workspace) return null;
    const master = this._workspace.getReference(this.$masterRef as string) as
      Symbol | null | undefined;
    if (master) {
      if (!master.isMaster()) debugLog("GSymbol.getMasterSymbol: returning slave as master");
      if (this.getScene() !== master.getScene()) return null;
    }
    return master;
  }

  override getStylePropertySets(): string[] {
    return [PropertySet.Style, PropertySet.Effects];
  }

  override getTransform(): Transform | null {
    return this.$trf;
  }

  /** The rotation of the bottom edge of the source box, in (-PI, PI]. */
  override getAngle(): number {
    let angle = 0;
    const box = this.getSourceBBox();
    if (box && !box.isEmpty()) {
      let left = box.getSide(Rect.Side.BOTTOM_LEFT);
      let right = box.getSide(Rect.Side.BOTTOM_RIGHT);
      if (this.$trf) {
        left = this.$trf.mapPoint(left);
        right = this.$trf.mapPoint(right);
      }
      angle = GMath.normalizeAngleRadians(
        -Math.atan2(right.getY() - left.getY(), right.getX() - left.getX()),
      );
      if (angle > Math.PI) angle -= GMath.PI2;
    }
    return angle;
  }

  override setTransform(transform: Transform | null): void {
    this.setProperty("trf", transform);
  }

  /**
   * Transforms the symbol and its content. Outside a master (or as a
   * master moving with its parent) `blockEv` is set meanwhile, so the
   * content's changes don't count as overrides. With constrained content
   * of a dependent move, only unconstrained children follow directly.
   */
  override transform(
    transform: Transform,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void {
    if (!transform || transform.isIdentity()) return;
    this._layoutTransform = transform;
    this._relayoutNow = !this._relayout;
    let blocked = false;
    this._relayout = true;
    let previousBlockEv: unknown;
    const inMaster = this._hasMasterParent();
    if (!inMaster || (inMaster && this.isMaster() && this.dependentUpdate)) {
      previousBlockEv = this.getProperty("blockEv");
      blocked = true;
      this.setProperty("blockEv", true);
    }
    this.setProperty("trf", this.$trf ? this.$trf.multiplied(transform) : transform);
    const anchored = this.hasAnchors();
    this.beginUpdate();
    try {
      if (anchored && this.dependentUpdate && !force) {
        for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
          if (
            child instanceof Element &&
            child.hasMixin(TransformMixin) &&
            !asSibling(child).getProperty("hacr") &&
            !asSibling(child).getProperty("vacr") &&
            (!exceptions || exceptions.indexOf(child) < 0)
          ) {
            child.dependentUpdate = true;
            asSibling(child).transform(transform, force, exceptions);
            child.dependentUpdate = false;
          }
        }
      } else this._transformChildren(transform, force);
    } finally {
      this.endUpdate();
    }
    if (this._relayoutNow) {
      this._layoutAnchorContents(null, null, this._layoutTransform);
      this._layoutTransform = null;
      this._relayoutNow = false;
    }
    if (blocked) this.setProperty("blockEv", previousBlockEv);
  }

  override preTransform(
    transform: Transform,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void {
    if (!transform || transform.isIdentity()) return;
    this._layoutTransform = this.$trf
      ? (this.$trf.inverted() as Transform).multiplied(transform).multiplied(this.$trf)
      : transform;
    this._relayoutNow = !this._relayout;
    this._relayout = true;
    this.setProperty("trf", this.$trf ? transform.multiplied(this.$trf) : transform);
    const inMaster = this._hasMasterParent();
    if (!inMaster) this._blockEvents++;
    // GElement.Transform's preTransform: the children, in the new own coordinates.
    if (this.isTransformChildren(transform, force)) {
      const own = this.getProperty("trf") as Transform | null;
      const mapped =
        own && own.invertible()
          ? (own.inverted() as Transform).multiplied(transform).multiplied(own)
          : transform;
      this._transformChildren(mapped, force, exceptions);
    }
    if (this._relayoutNow) {
      this._layoutAnchorContents(null, null, this._layoutTransform);
      this._layoutTransform = null;
      this._relayoutNow = false;
    }
    if (!inMaster) this._blockEvents--;
  }

  /** Whether the nearest enclosing symbol is a master (null without one). */
  _hasMasterParent(): boolean | null {
    const parent = this.findParent((node) =>
      node instanceof Symbol ? true : undefined,
    ) as Symbol | null;
    return parent && parent.isMaster();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override _calculateSourceBBox(includeInvisible?: unknown): Rect | null {
    return this.getProperty("frame") as Rect | null;
  }

  /** The content with effects, plus the label above the frame. */
  override _calculatePaintBBox(arg?: unknown, includeInvisible?: unknown): Rect | null {
    let bbox = this.getChildrenPaintBBox(null, null, includeInvisible);
    // The bbox doubles as the effects' scale argument, as in the old call.
    bbox =
      (bbox &&
        this.getEffects() &&
        (this.getEffects() as NonNullable<ReturnType<Symbol["getEffects"]>>).getEffectsBBox(
          bbox,
          null,
          bbox as unknown as number,
        )) ||
      bbox;
    const frame = this.getFrame();
    if (frame && this.getScene()) {
      let label = this._symbolScene().getLabelBBox(this.isScaleLabel() as unknown as number);
      label = new Rect(
        frame.getX(),
        frame.getY() - label.getHeight(),
        frame.getWidth(),
        label.getHeight(),
      );
      bbox = bbox && !bbox.isEmpty() ? bbox.united(label) : label;
    }
    return bbox;
  }

  override _getBitmapPaintArea(): Rect {
    let area = this.getChildrenPaintBBox();
    if (!area) return new Rect(0, 0, 0, 0);
    area = this.getEffects()
      ? (this.getEffects() as NonNullable<ReturnType<Symbol["getEffects"]>>).getEffectsBBox(
          area,
          null,
          area as unknown as number,
        )
      : area;
    const frame = this.getFrame();
    if (frame && this.getScene()) area = area.united(frame);
    return area;
  }

  override _calculateGeometryBBox(includeInvisible?: unknown): Rect | null {
    return this.getFrame() || super._calculateGeometryBBox(includeInvisible);
  }

  override _paintStyleContent(context: StylePaintContext): void {
    this._paintChildren(context as unknown as PaintContext);
  }

  /** Hits the frame (not the content), else the label. */
  override _detailHitTest(
    location: Point,
    transform?: Transform | null,
    tolerance?: number,
  ): ElementData<Element, unknown> | null {
    let frame = this.getFrame();
    if (!frame || frame.isEmpty()) return null;
    if (transform) frame = transform.mapRect(frame);
    const reach = tolerance as number;
    return frame.expanded(reach, reach, reach, reach).containsPoint(location)
      ? new ElementData<Element, unknown>(this, { label: false })
      : (this._hitTestLabel(location, reach, transform, true) as ElementData<
          Element,
          unknown
        > | null);
  }

  override _getLabelGeometryBBox(): Rect | null {
    return this.getFrame();
  }

  /** The label's box above the frame, for collisions. */
  override getCustomCollisionBBox(includeInvisible?: unknown): Rect | null {
    void includeInvisible;
    const frame = this.getFrame();
    const scene = this._symbolScene();
    if (frame && scene && this.isVisible()) {
      const label = scene.getLabelBBox(this.isScaleLabel() as unknown as number);
      return new Rect(
        frame.getX(),
        frame.getY() - label.getHeight(),
        frame.getWidth(),
        label.getHeight(),
      );
    }
    return null;
  }

  /** `frame` mapped by `trf`. */
  getFrame(): Rect {
    return (this.$frame && this.$trf ? this.$trf.mapRect(this.$frame) : this.$frame) as Rect;
  }

  /**
   * A copy is an instance of this symbol's master (a new reference id);
   * with `symbolMasterReplicate` a copy of a master is a master of its own.
   */
  override clone(options?: SymbolCloneOptions): this | null {
    const copy = super.clone(options);
    if (copy) {
      if (options && options.symbolMasterReplicate && this.isMaster()) {
        copy._master = this._master;
        copy.resetMultireference();
        copy.setProperties(
          ["masterRef", "masterMultiRef"],
          [copy.getReferenceId(), copy.getMultireferenceId()],
        );
      } else copy._referenceId = uuid();
    }
    return copy;
  }

  /** A container holding an instance of this symbol's master can't go in (it would nest itself). */
  override insertChild(child: Node, reference: Node | null | undefined): void {
    if (!(child instanceof Symbol) && child.hasMixin(Container)) {
      let allowed = true;
      const master = this.getMasterSymbol();
      if (master) {
        (child as ContainerNode).acceptChildren((node) => {
          if (node instanceof Symbol && node.getMasterSymbol() === master) {
            allowed = false;
            return false;
          }
          return undefined;
        });
        if (!allowed) return;
      }
    }
    super.insertChild(child, reference);
  }

  /** Like an item, but never into a symbol of the same master. */
  override validateInsertion(parent: ContainerNode, reference?: Node | null): boolean {
    void reference;
    if (super.validateInsertion(parent)) {
      const master = this.getMasterSymbol();
      if (null === master) return true;
      for (let node: Node | null = parent; node;) {
        if (node instanceof Symbol) return node.getMasterSymbol() !== master;
        node = node.getParent();
      }
      return true;
    }
    return false;
  }

  /**
   * Registers inserted nodes in the sibling maps; a master pushes a copy
   * of the new node into every instance (at the same place, re-based to
   * the instance's transform).
   */
  _afterNodeInsert(event: AfterInsertEvent): void {
    if (this._blockEvents > 0) return;
    const inserted = asSibling(event.node);
    const marks = event.customObj as Record<string, unknown>;
    if (this.isMaster() && inserted !== (this as unknown)) {
      if (Object.prototype.hasOwnProperty.call(marks, Symbol.STOP_PROPAGATION)) return;
      marks[Symbol.STOP_PROPAGATION] = true;
    }
    if (this.isMaster() || this._isRestoring) {
      let id = inserted.getMultireferenceId();
      if (this._siblingMap[id]) {
        debugLog("Multireference conflict detected in master symbol");
        inserted.resetMultireference();
        id = inserted.getMultireferenceId();
      }
      this._siblingMap[id] = inserted;
      if (inserted.hasMixin(Container)) {
        inserted.getSubnodeIds(this._siblingMap);
        if (!this._isRestoring) this._getDeadSiblingsFromNode(inserted);
      } else if (inserted.hasMixin(ElementStylable)) {
        throw new Error(
          "GSymbol: stylable without Container mixin. This corrupts some symbol principles.",
        );
      }
    }
    if (!this.isMaster() && !this._isRestoring) {
      const id = inserted.getMultireferenceId();
      this._siblingMap[id] = inserted;
      if (inserted.hasMixin(Container)) inserted.getSubnodeIds(this._siblingMap);
      else if (inserted.hasMixin(ElementStylable)) {
        throw new Error(
          "GSymbol: stylable without Container mixin. This corrupts some symbol principles.",
        );
      }
    }
    if (this.isMaster() && !this._isRestoring && inserted !== (this as unknown)) {
      const next = inserted.getNext();
      const id = inserted.getMultireferenceId();
      const parent = inserted.getParent() as Node;
      this._iterateSiblings(parent, (container, instance, owner) => {
        if (inserted instanceof Symbol && inserted.isRecordedTransaction()) {
          const swaps = instance.getProperty("swp") as string[] | null;
          if (swaps) {
            for (let i = 0; i < swaps.length; i += 2)
              if (swaps[i] === inserted.$masterMultiRef) return undefined;
          }
        }
        let reference: Node | undefined;
        let copy: Sibling | null | undefined;
        if (next) reference = instance._siblingMap[asSibling(next).getMultireferenceId()];
        if ("function" == typeof inserted.clone) copy = inserted.clone();
        if (copy) {
          let target: Symbol | null = instance;
          if (
            owner === this ||
            (target = instance.findParent(
              (node) => node instanceof Symbol && node.$masterRef === this.$masterRef,
            ) as Symbol | null)
          ) {
            target._siblingMap[id] = copy;
            if (copy.hasMixin(Container)) copy.getSubnodeIds(target._siblingMap);
            if (inserted.hasMixin(TransformMixin)) {
              const ownerTransform = owner.getTransform();
              const rebased = Symbol._swapBaseTransforms(
                inserted.getTransform(),
                ownerTransform,
                instance.getTransform(),
              );
              const current = inserted.getTransform() || new Transform();
              copy.transform((current.inverted() as Transform).multiplied(rebased as Transform));
            }
            let scene: SymbolScene | null = null;
            if (container instanceof Element) {
              scene = container.getScene() as SymbolScene | null;
              if (scene) scene._beginBlockEvents(PROPERTY_EVENTS);
            }
            container._beginBlockEvents(INSERT_EVENTS);
            (container as unknown as ContainerNode).insertChild(copy, reference);
            container._endBlockEvents(INSERT_EVENTS);
            if (scene) scene._endBlockEvents(PROPERTY_EVENTS);
            if (copy.hasMixin(Container)) target._getDeadSiblingsFromNode(copy);
            if (instance._canEventBeSent(SymbolSiblingUpdateEvent)) {
              instance._sendEvent(
                new SymbolSiblingUpdateEvent(copy, container, SymbolSiblingUpdateEvent.INSERT),
              );
            }
          } else debugLog("symbol insert: couldn't find right symbol with map");
        } else debugLog("symbol: Couldn't clone a node");
        return undefined;
      });
    }
  }

  /** Nested instances' children that have no master counterpart join this master's map. */
  _getDeadSiblingsFromNode(node: Node): void {
    node.accept((candidate) => {
      if (candidate instanceof Symbol && !candidate.isMaster()) {
        const master = candidate.findParent((parent) =>
          parent instanceof Symbol && parent.isMaster() ? true : undefined,
        );
        if (!master || master === (this as unknown)) {
          for (let child = candidate.getFirstChild(); child; child = child.getNext()) {
            const sibling = asSibling(child);
            if (!candidate._getMasterSibling(sibling.getMultireferenceId())) {
              this._siblingMap[sibling.getMultireferenceId()] = child;
              sibling.getSubnodeIds(this._siblingMap);
            }
          }
        }
      }
    });
  }

  /**
   * A master removes the counterpart from every instance; removed nodes
   * lose their multireference ids (so a later insert is a new sibling).
   */
  _beforeNodeRemove(event: BeforeRemoveEvent): void {
    if (this._blockEvents > 0) return;
    const marks = event.customObj as Record<string, unknown>;
    if (this.isMaster() && event.node !== (this as unknown)) {
      if (Object.prototype.hasOwnProperty.call(marks, Symbol.STOP_PROPAGATION)) return;
      marks[Symbol.STOP_PROPAGATION] = true;
    }
    const removed = asSibling(event.node);
    if (this.isMaster() && !this._isRestoring && removed !== (this as unknown)) {
      this._iterateSiblings(
        removed,
        (sibling, instance, owner) => {
          let target: Symbol | null = instance;
          if (
            owner === this ||
            (target = instance.findParent(
              (node) => node instanceof Symbol && node.$masterRef === this.$masterRef,
            ) as Symbol | null)
          ) {
            const id = sibling.getMultireferenceId();
            const container = sibling.getParent();
            if (!container) {
              Reflect.deleteProperty(target._siblingMap, id);
              Reflect.deleteProperty(target._disabledSiblingMap, id);
              return undefined;
            }
            const scene =
              container instanceof Element ? (container.getScene() as SymbolScene | null) : null;
            if (scene) scene._beginBlockEvents(PROPERTY_EVENTS);
            container._beginBlockEvents(REMOVE_EVENTS);
            container.removeChild(sibling);
            Reflect.deleteProperty(target._siblingMap, id);
            Reflect.deleteProperty(target._disabledSiblingMap, id);
            container._endBlockEvents(REMOVE_EVENTS);
            if (scene) scene._endBlockEvents(PROPERTY_EVENTS);
            if (instance._canEventBeSent(SymbolSiblingUpdateEvent)) {
              instance._sendEvent(
                new SymbolSiblingUpdateEvent(sibling, container, SymbolSiblingUpdateEvent.REMOVE),
              );
            }
          } else debugLog("symbol remove: couldn't find right symbol with map");
          return undefined;
        },
        true,
      );
    }
    if (this.isMaster()) {
      Reflect.deleteProperty(this._siblingMap, removed.getMultireferenceId());
      Reflect.deleteProperty(this._disabledSiblingMap, removed.getMultireferenceId());
    }
    if ((this.isMaster() && removed !== (this as unknown)) || !this._hasMasterParent()) {
      if (removed.hasMixin(Container)) {
        const subnodes: Record<string, Node> = {};
        removed.getSubnodeIds(subnodes);
        for (const id in subnodes) {
          const subnode = subnodes[id];
          if (!(subnode instanceof Symbol)) asSibling(subnode).resetMultireference();
        }
      } else removed.resetMultireference();
    }
  }

  /**
   * Whether `node` matches its master counterpart in every geometry,
   * visual and style property (and `extra`), its re-based transform and,
   * for texts, the content. A swapped instance without a counterpart
   * matches when it sits where the original did.
   */
  _comparePropertiesWithMaster(node: Node, extra?: readonly string[]): boolean {
    const sibling = asSibling(node);
    const id = sibling.getMultireferenceId();
    const original = this._getMasterSibling(id) as Sibling | null;
    if (!original) {
      const offset = this._translationSwapped(node, this);
      return !!(offset && offset.getX() * offset.getX() + offset.getY() * offset.getY() < 1e-4);
    }
    let names: string[] = [];
    let compareTransform = false;
    let compareContent = false;
    for (const cls of comparedClasses(node)) {
      if (cls.GeometryProperties) {
        for (const name in cls.GeometryProperties) {
          if ("trf" === name) compareTransform = true;
          else if ("content" === name && (cls as unknown) === Text) compareContent = true;
          else names.push(name);
        }
      }
      if (cls.VisualProperties) for (const name in cls.VisualProperties) names.push(name);
      // The old loop also looked at MetaProperties for a "refs" key of
      // GSymbol, which has none; nothing was ever added there.
    }
    names = names.concat(this._getStylableProperties(sibling));
    if (node.hasMixin(Anchor)) {
      for (const name in Anchor.MetaProperties)
        if ("vatrf" !== name && "hatrf" !== name) names.push(name);
    }
    if (extra) {
      extra.forEach((name) => {
        if (names.indexOf(name) < 0) names.push(name);
      });
    }
    if (original && original.arePropertiesEqual(sibling, names)) {
      if (compareTransform && !this._siblingTrfEqual(original, sibling)) return false;
      if (compareContent) {
        return equals(
          (original as unknown as Text).getContent(),
          (node as unknown as Text).getContent(),
          true,
        );
      }
      return true;
    }
    return false;
  }

  /** The style property names of the node's style property sets. */
  _getStylableProperties(node: Sibling): string[] {
    const names: string[] = [];
    if (node.hasMixin(Stylable)) {
      (node as unknown as { getStylePropertySets(): string[] })
        .getStylePropertySets()
        .forEach((set) => {
          const info = PropertySetInfo[set];
          if (info && info.visualProperties)
            for (const name in info.visualProperties) names.push(name);
          if (info && info.geometryProperties)
            for (const name in info.geometryProperties) names.push(name);
        });
    }
    return names;
  }

  /** Whether `node`'s transform is the master counterpart's, re-based to this instance. */
  _siblingTrfEqual(original: Sibling, node: Sibling): boolean {
    const master = this.getMasterSymbol();
    if (!master) return false;
    const rebased = Symbol._swapBaseTransforms(
      original.getTransform(),
      master.getTransform(),
      this.getTransform(),
    );
    return !!Transform.equals(rebased, node.$trf, 1e-4);
  }

  _hasAnchors(node: Node): unknown {
    return (
      node.hasMixin(TransformMixin) &&
      node.hasMixin(Anchor) &&
      (asSibling(node).getProperty("hacr") || asSibling(node).getProperty("vacr"))
    );
  }

  /** Whether any of the symbol's nodes has constraints. */
  hasAnchors(): boolean {
    return (
      Object.values(this._siblingMap).some(this._hasAnchors) ||
      Object.values(this._disabledSiblingMap).some(this._hasAnchors)
    );
  }

  /** A symbol doesn't expose its content to enclosing maps. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override getSubnodeIds(ids: Record<string, Node>): void {}

  /**
   * A master pushes property changes of its content to every instance's
   * counterpart (re-basing `trf`, merging text content, skipping
   * counterparts that were overridden); an instance checks whether the
   * changed node now differs from its master counterpart.
   */
  _afterPropertiesChange(event: AfterPropertiesChangeEvent): void {
    if (this._killEvents) {
      event.isImmediatePropagationStopped = true;
      return;
    }
    if (this._blockEvents > 0 || this.getProperty("blockEv")) return;
    const changed = asSibling(event.node);
    const marks = event.customObj as Record<string, unknown>;
    if (changed !== (this as unknown) && this.isMaster()) {
      if (Object.prototype.hasOwnProperty.call(marks, Symbol.STOP_PROPAGATION)) return;
      marks[Symbol.STOP_PROPAGATION] = true;
    }
    const properties = event.properties as string[];
    if (
      this.isMaster() &&
      changed !== (this as unknown) &&
      (!(changed instanceof Element) ||
        (changed instanceof Element && !changed.isRecordedTransaction()))
    ) {
      this._iterateSiblings(changed, (sibling, instance, owner) =>
        this._pushPropertiesToSibling(
          event,
          changed,
          properties,
          asSibling(sibling),
          instance,
          owner,
        ),
      );
    } else if (
      !event.temporary &&
      !(this._hasMasterParent() && changed !== this._siblingMap[changed.getMultireferenceId()])
    ) {
      this._updateDisabledSiblings(changed, properties);
    }
  }

  /** One instance's part of `_afterPropertiesChange`; false when nothing was left to set. */
  _pushPropertiesToSibling(
    event: AfterPropertiesChangeEvent,
    changed: Sibling,
    properties: string[],
    sibling: Sibling,
    instance: Symbol,
    owner: Symbol,
  ): boolean | undefined {
    const names = properties.slice();
    const values = changed.getProperties(
      properties,
      event.custom ?? undefined,
      null,
      event.temporary ?? undefined,
    );
    const trfIndex = names.indexOf("trf");
    const previous = (event.values as unknown[]).slice();
    const extraNames: string[] = [];
    const extraValues: unknown[] = [];
    let overridden = false;
    if (!Symbol.BLOCK_EDITED) {
      const parent = instance._symbolParent();
      if (
        parent &&
        Object.prototype.hasOwnProperty.call(
          parent._disabledSiblingMap,
          instance.getMultireferenceId(),
        )
      ) {
        overridden = true;
      }
    }
    if (
      !overridden &&
      changed.hasMixin(Properties) &&
      changed.hasProperty("trf") &&
      trfIndex >= 0
    ) {
      const toOwner = (owner.$trf || new Transform()).inverted();
      let keep = true;
      if (toOwner) {
        let next = values[trfIndex] as Transform | null;
        let old = previous[trfIndex] as Transform | null;
        const instanceTransform = instance.getTransform();
        next = next ? toOwner.preMultiplied(next) : toOwner;
        old = old ? toOwner.preMultiplied(old) : toOwner;
        if (instanceTransform) {
          next = instanceTransform.preMultiplied(next);
          old = instanceTransform.preMultiplied(old);
        }
        if (Symbol.BLOCK_EDITED) {
          previous[trfIndex] = old;
          values[trfIndex] = next;
        } else if (Transform.equals(old, sibling.getProperty("trf") as Transform | null, 1e-4)) {
          if (!overridden) {
            previous[trfIndex] = old;
            values[trfIndex] = next;
          }
        } else {
          names.splice(trfIndex, 1);
          values.splice(trfIndex, 1);
          previous.splice(trfIndex, 1);
          keep = false;
        }
        if (keep) {
          let frameless = false;
          if (
            (sibling instanceof Group || "layer" === Node.getName(sibling)) &&
            !sibling.getProperty("frm")
          ) {
            frameless = true;
          }
          if (!frameless) {
            sibling._relayout = true;
            sibling._layoutTransform =
              old && old.invertible() ? (old.inverted() as Transform).multiplied(next) : next;
          }
        }
      }
    } else if (trfIndex >= 0) {
      names.splice(trfIndex, 1);
      values.splice(trfIndex, 1);
      previous.splice(trfIndex, 1);
    }
    if (changed instanceof Text && names.indexOf("_we") >= 0) {
      const index = names.indexOf("_we");
      names.splice(index, 1);
      values.splice(index, 1);
      previous.splice(index, 1);
    }
    const contentIndex = changed instanceof Text ? names.indexOf("content") : -1;
    if (changed instanceof Text && contentIndex >= 0) {
      const content = previous[contentIndex] as string | null;
      names.splice(contentIndex, 1);
      values.splice(contentIndex, 1);
      previous.splice(contentIndex, 1);
      if (!changed.isRecordedTransaction()) {
        this._mergeTextContent(
          changed,
          sibling as unknown as Text,
          content,
          extraNames,
          extraValues,
        );
      }
    }
    if (!Symbol.BLOCK_EDITED) {
      const current = sibling.getProperties(
        names,
        event.custom ?? undefined,
        null,
        event.temporary ?? undefined,
      );
      for (let i = values.length - 1; i >= 0; i--) {
        if (values[i] instanceof Transform) {
          if (
            "trf" !== names[i] &&
            !Transform.equals(previous[i] as Transform, current[i] as Transform, 1e-4)
          ) {
            names.splice(i, 1);
            values.splice(i, 1);
          }
        } else if (!equals(previous[i], current[i], true, 1e-4)) {
          names.splice(i, 1);
          values.splice(i, 1);
        }
      }
    }
    for (const name in Anchor.MetaProperties) {
      if ("hacr" !== name && "vacr" !== name) {
        const index = names.indexOf(name);
        if (index >= 0) {
          names.splice(index, 1);
          values.splice(index, 1);
        }
      }
    }
    const swapIndex = names.indexOf("swpori");
    if (swapIndex >= 0) {
      names.splice(swapIndex, 1);
      values.splice(swapIndex, 1);
    }
    const subIndex = names.indexOf("subtrf");
    if (subIndex >= 0) {
      names.splice(subIndex, 1);
      values.splice(subIndex, 1);
    }
    if (!names.length && !extraNames.length) return false;
    instance._blockEvents++;
    sibling.dependentUpdate = changed.dependentUpdate;
    let skipBorderUpdate: boolean | undefined;
    if (sibling instanceof Item) {
      skipBorderUpdate = sibling.skipBorderUpdate;
      sibling.skipBorderUpdate = true;
    }
    const blockedChanges = [NodeChange.BeforePropertiesChange, NodeChange.AfterPropertiesChange];
    instance._beginBlockChanges(blockedChanges);
    if (names.length) {
      sibling._beginBlockEvents(PROPERTY_EVENTS_BEFORE_AFTER);
      sibling.setProperties(names, values, event.custom, false, event.temporary);
      sibling._endBlockEvents(PROPERTY_EVENTS_BEFORE_AFTER);
      if (changed._relayoutNow) sibling._relayout = false;
    }
    if (extraNames.length)
      sibling.setProperties(extraNames, extraValues, event.custom, false, event.temporary);
    instance._endBlockChanges(blockedChanges);
    sibling.dependentUpdate = false;
    instance._blockEvents--;
    if (sibling instanceof Item) sibling.skipBorderUpdate = skipBorderUpdate as boolean;
    if (!event.temporary) {
      if (sibling instanceof Symbol && !sibling.isMaster() && sibling !== instance) {
        instance._updateDisabledSiblings(sibling, names.concat(extraNames));
      } else if (!instance.isMaster() && instance.getMasterSymbol() !== this) {
        instance._updateDisabledSiblings(sibling, names.concat(extraNames));
      }
    }
    return undefined;
  }

  /**
   * Carries a master text's content change over to the instance's text
   * `target`, merging it with the instance's own edits: formatting of the
   * selection, a text change, or run properties (`previousContent` is the
   * master's content before the change). Results go to `names`/`values`.
   */
  _mergeTextContent(
    changed: Text,
    target: Text,
    previousContent: string | null,
    names: string[],
    values: unknown[],
  ): void {
    const core = changed.getTLCore();
    const targetCore = target.getTLCore();
    Part.DoMeasure = false;
    if (core) {
      const selection = core.getSelection() as { start: number; end: number };
      if (selection.start !== selection.end && changed._isEdited) {
        let previousRange: TLRange | undefined;
        let previousDocument: TLDocument | undefined;
        const range = core.getRange(selection.start, selection.end) as TLRange;
        const runs = range.save() as unknown as RunRecord[];
        const targetRange = (targetCore as NonNullable<typeof targetCore>).getRange(
          selection.start,
          selection.end,
        ) as TLRange;
        let previousRuns: RunRecord[] = [];
        if (previousContent) {
          const parsed = JSON.parse(previousContent) as Run[];
          previousDocument = new TLDocument();
          previousDocument.load(parsed);
          previousRange = previousDocument.range(selection.start, selection.end);
          previousRuns = previousRange.save() as unknown as RunRecord[];
        }
        const targetText = targetRange.plainText();
        let newText = range.plainText();
        let previousText = previousRange ? previousRange.plainText() : "";
        if (previousText === newText && runs && runs.length > 0) {
          const changes = Symbol._getChangedTextContentProperties(previousRuns, runs);
          if (changes) {
            const document = new TLDocument();
            document.load(
              JSON.parse((target.getProperty("content") as string | null) || "[]") as Run[],
            );
            let applied = false;
            for (let i = 0; i < changes.length; i++) {
              const change = changes[i] as ChangedTextProperty;
              const from = change.range[0];
              const to = change.range[1];
              let start: number | undefined;
              let end: number | undefined;
              for (let run = 0, offset = 0; run < runs.length; run++) {
                if (run === from) start = offset;
                offset += ((runs[run] as RunRecord)["text"] as string).length;
                if (run + 1 === to) {
                  end = offset;
                  break;
                }
              }
              const part = document.range(
                selection.start + (start as number),
                selection.start + (end as number),
              );
              const formatting = part.getFormatting() as unknown as RunRecord;
              if (
                change.oldValue === formatting[change.property] ||
                formatting[change.property] === Formatting.multipleValues
              ) {
                part.setFormatting([change.property], [change.value]);
                applied = true;
              }
            }
            if (applied) {
              names.push("content");
              values.push(JSON.stringify(document.save()));
            }
          }
        } else if (targetText === previousText) {
          newText = core.getDocumentRange().plainText();
          previousText = (previousDocument as TLDocument).documentRange().plainText();
          let changedPart = Symbol._getChangedText(newText, previousText);
          if (changedPart[1] < 0) changedPart[1] = 0;
          const newPart = core.getRange(changedPart[0], changedPart[0] + changedPart[1]) as TLRange;
          const document = new TLDocument();
          const targetContent = (target.getProperty("content") as string | null) || "[]";
          document.load(JSON.parse(targetContent) as Run[]);
          changedPart = Symbol._getChangedText(previousText, newText);
          document.range(changedPart[0], changedPart[0] + changedPart[1]).setText(newPart.save());
          const merged = JSON.stringify(document.save());
          if (merged !== targetContent) {
            names.push("content");
            values.push(merged);
          }
        } else if (runs && runs.length) debugLog("Text was changed while selection still on?");
        else debugLog("no content inside?");
      } else if (selection.start === selection.end || !changed._isEdited) {
        const runs = changed.getContent() as RunRecord[] | null;
        let previousRuns: RunRecord[] = [];
        if (previousContent) previousRuns = JSON.parse(previousContent) as RunRecord[];
        const targetRuns = JSON.parse(
          (target.getProperty("content") as string | null) || "[]",
        ) as RunRecord[];
        if (runs && runs.length > 0) {
          const targetText = runsText(
            (targetCore as NonNullable<typeof targetCore>)
              .getDocumentRange()
              .save() as unknown as RunRecord[],
          );
          const newText = runsText(core.getDocumentRange().save() as unknown as RunRecord[]);
          const previousText = runsText(previousRuns);
          if (previousText === newText) {
            const applied = Symbol._assignChangedTextContentProperties(
              previousRuns,
              runs,
              targetRuns,
              (name) => {
                if ("text" === name)
                  debugLog("cannot handle simultaneous change of text and other properties");
                return "text" !== name;
              },
            );
            if (applied) {
              names.push("content");
              values.push(JSON.stringify(targetRuns));
            }
          } else if (targetText === previousText) {
            let changedPart = Symbol._getChangedText(newText, previousText);
            const newPart = core.getRange(
              changedPart[0],
              changedPart[0] + changedPart[1],
            ) as TLRange;
            const document = new TLDocument();
            document.load(targetRuns as unknown as Run[]);
            changedPart = Symbol._getChangedText(previousText, newText);
            const start = changedPart[0];
            const end = changedPart[0] + changedPart[1];
            document.range(start, end).setText(newPart.save());
            const merged = JSON.stringify(document.save());
            if (merged !== JSON.stringify(targetRuns)) {
              names.push("content");
              values.push(merged);
            }
          }
        } else debugLog("no content inside?");
      }
    }
    Part.DoMeasure = true;
  }

  /**
   * Moves `node` between the sibling maps after its `properties` changed:
   * overridden when it no longer matches its master counterpart, back to
   * normal when it matches again. A nested instance's transform change
   * re-checks its own content.
   */
  _updateDisabledSiblings(node: Node, properties: string[]): void {
    if (this._isRestoring || this.isMaster() || node === (this as unknown)) return;
    const sibling = asSibling(node);
    const id = sibling.getMultireferenceId();
    check: if (Object.prototype.hasOwnProperty.call(this._disabledSiblingMap, id)) {
      if (this._comparePropertiesWithMaster(node)) {
        if (Symbol.BLOCK_EDITED) {
          // The old code looked the id up as a one-element array key (the same string).
          if (!Object.prototype.hasOwnProperty.call(this._siblingMap, id)) {
            this._siblingMap[id] = this._disabledSiblingMap[id] as Node;
          }
          Reflect.deleteProperty(this._disabledSiblingMap, id);
        } else Reflect.deleteProperty(this._disabledSiblingMap, id);
      }
    } else {
      const original = this._getMasterSibling(id) as Sibling | null;
      if (!original) {
        const trfIndex = properties.indexOf("trf");
        const frameIndex = properties.indexOf("frame");
        if (trfIndex >= 0 || frameIndex >= 0) {
          const offset = this._translationSwapped(node, this);
          if (offset) {
            if (offset.getX() * offset.getX() + offset.getY() * offset.getY() >= 1e-4) {
              this._disabledSiblingMap[id] = this._siblingMap[id] as Node;
              if (Symbol.BLOCK_EDITED) Reflect.deleteProperty(this._siblingMap, id);
            }
            properties = ["trf"];
            break check;
          }
        }
        debugLog("no original and swapped sibling available");
        return;
      }
      let transformEqual = true;
      let contentEqual = true;
      const names = properties.slice();
      const trfIndex = names.indexOf("trf");
      if (trfIndex >= 0) {
        transformEqual = this._siblingTrfEqual(original, sibling);
        names.splice(trfIndex, 1);
      }
      if (node instanceof Symbol) {
        const index = names.indexOf("swpori");
        if (index >= 0) names.splice(index, 1);
      }
      if (node instanceof SceneNode) {
        const index = names.indexOf("refs");
        if (index >= 0) names.splice(index, 1);
      }
      if (node.hasMixin(Anchor) && node.getParent() === (this as unknown)) {
        const horizontal = names.indexOf("hatrf");
        if (horizontal >= 0) names.splice(horizontal, 1);
        const vertical = names.indexOf("vatrf");
        if (vertical >= 0) names.splice(vertical, 1);
      }
      if (node instanceof Text) {
        for (const name in Text.MetaProperties) {
          const index = names.indexOf(name);
          if (index >= 0) names.splice(index, 1);
        }
        const contentIndex = names.indexOf("content");
        if (contentIndex >= 0) {
          contentEqual = equals(
            (original as unknown as Text).getContent(),
            node.getContent(),
            true,
          );
          names.splice(contentIndex, 1);
        }
      }
      if (!(
        original &&
        transformEqual &&
        contentEqual &&
        sibling.arePropertiesEqual(original, names)
      )) {
        if (Symbol.BLOCK_EDITED) {
          this._disabledSiblingMap[id] = this._siblingMap[id] as Node;
          if (!(
            original &&
            transformEqual &&
            node instanceof Text &&
            !contentEqual &&
            sibling.arePropertiesEqual(original, names)
          )) {
            Reflect.deleteProperty(this._siblingMap, id);
          }
        } else this._disabledSiblingMap[id] = this._siblingMap[id] as Node;
      }
    }
    if (node instanceof Symbol && properties.indexOf("trf") >= 0 && !node.$blockEv) {
      for (const key in node._siblingMap) {
        const child = node._siblingMap[key];
        if (child && child.hasMixin(Properties) && asSibling(child).hasProperty("trf")) {
          node._updateDisabledSiblings(child, ["trf"]);
        }
      }
      if (Symbol.BLOCK_EDITED) {
        for (const key in node._disabledSiblingMap) {
          // The old loop read the normal map here; kept.
          const child = node._siblingMap[key];
          if (child && child.hasMixin(Properties) && asSibling(child).hasProperty("trf")) {
            node._updateDisabledSiblings(child, ["trf"]);
          }
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old (empty) handler
  _afterFlagChange(event: AfterFlagChangeEvent): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old (empty) handler
  _afterSpecialChange(event: unknown): void {}

  /** The undo action of a master's special change: tells the scene again. */
  getTransactionAction(data?: { created?: boolean; scene: SymbolScene } | null): () => void {
    if (data) {
      const scene = data.scene;
      return () => {
        if (scene._canEventBeSent(AfterSpecialChangeEvent)) {
          scene._sendEvent(new AfterSpecialChangeEvent(this, { created: !!data.created, scene }));
        }
      };
    }
    return () => {};
  }

  getTransactionActionSerialized(data?: { created?: boolean } | null): { created: boolean } | null {
    return data ? { created: !!data.created } : null;
  }

  getTransactionActionDeserialized(data?: { created?: boolean } | null): () => void {
    if (!data) return () => {};
    const scene = this._symbolScene();
    if (scene) {
      return () => {
        if (scene._canEventBeSent(AfterSpecialChangeEvent)) {
          scene._sendEvent(new AfterSpecialChangeEvent(this, { created: !!data.created, scene }));
        }
      };
    }
    return () => {};
  }

  getTransactionRevertAction(data?: { created?: boolean; scene: SymbolScene } | null): () => void {
    if (data) {
      const scene = data.scene;
      return () => {
        if (scene._canEventBeSent(AfterSpecialChangeEvent)) {
          scene._sendEvent(new AfterSpecialChangeEvent(this, { created: !data.created, scene }));
        }
      };
    }
    return () => {};
  }

  /**
   * For a master: calls `visit(counterpart, instance, owner)` for the
   * counterpart of `node` in every instance linked to the master that
   * owns `node` (this master, or a nested master inside it). With
   * `includeDisabled`, overridden counterparts are visited too.
   */
  _iterateSiblings(
    node: Node | null,
    visit: (sibling: Sibling, instance: Symbol, owner: Symbol) => unknown,
    includeDisabled?: boolean,
    scenes?: SymbolScene[],
  ): void {
    if (!node) {
      debugLog("GSymbol._iterateSiblings: Supplied node is null");
      return;
    }
    if (!(node === (this as unknown) || node.hasMixin(Multireference))) {
      debugLog("GSymbol._iterateSiblings: Error: node is not a multireference");
      return;
    }
    if (!this.isMaster()) return;
    if (!scenes) scenes = [];
    if (!scenes.length) {
      const scene = this._symbolScene();
      if (!scene) return;
      scenes.push(scene);
    }
    const changed: Sibling | null = node === (this as unknown) ? null : asSibling(node);
    const isEffects = !!changed && changed === (this._effects as unknown);
    const isPaintLayers = !!changed && changed === (this._paintLayers as unknown);
    let symbol: Symbol | null =
      changed instanceof Symbol
        ? changed
        : changed
          ? (changed.findParent((parent) => parent instanceof Symbol) as Symbol | null)
          : this;
    if (!symbol) return;
    let owner: Symbol | null | undefined;
    if (symbol !== this && symbol.isMaster()) owner = symbol;
    else if (symbol !== this) {
      if (symbol._getMasterSibling((changed as Sibling).getMultireferenceId()))
        owner = symbol.getMasterSymbol();
      else {
        for (let parent = this._symbolParent(symbol); parent && !owner;) {
          if (parent.isMaster() && parent._siblingMap[(changed as Sibling).getMultireferenceId()]) {
            owner = parent;
            symbol = parent;
          }
          parent = this._symbolParent(parent);
        }
        if (!owner) return;
      }
    } else owner = symbol; // symbol is this here
    const nestedSymbol = symbol;
    const masterOwner = owner as Symbol;
    /** Whether the counterpart follows: always, unless the change is a dependent one that doesn't line up. */
    const canUpdate = (sibling: Node | null | undefined, instance: Symbol): boolean => {
      if (!sibling) return false;
      if (!(sibling instanceof Element)) return true;
      if (!changed) return true;
      if (!(changed instanceof Node)) return true;
      if (!changed.dependentUpdate) {
        if (!changed.isRecordedTransaction() || !changed.getProperty("subtrf", true, false)) {
          return true;
        }
        debugLog("ding!");
      }
      let ours: Node = sibling;
      let theirs: Node = changed;
      let aligned = true;
      do {
        if (ours !== instance) ours = ours.getParent() as Node;
        if (theirs !== nestedSymbol) theirs = theirs.getParent() as Node;
        if (!ours) {
          debugLog("some propagation errors might have occurred");
          ours = instance;
        }
        if (!theirs) {
          debugLog("some propagation errors might have occurred");
          theirs = nestedSymbol;
        }
        if (!theirs.hasMixin(Multireference) || !ours.hasMixin(Multireference)) return false;
        if (asSibling(theirs).getMultireferenceId() !== asSibling(ours).getMultireferenceId())
          aligned = false;
      } while (
        aligned &&
        (theirs as Sibling).dependentUpdate &&
        (ours !== instance || theirs !== nestedSymbol)
      );
      return aligned;
    };
    const visitInstance = (instance: Node) => {
      if (!(instance instanceof Symbol) || instance === nestedSymbol || instance.isMaster()) return;
      if (masterOwner !== this) {
        if (
          !instance.findParent(
            (parent) => parent instanceof Symbol && parent.$masterRef === this.$masterRef,
          )
        )
          return;
        if (nestedSymbol.getMultireferenceId() !== instance.getMultireferenceId()) return;
      }
      if (Symbol.BLOCK_EDITED && !includeDisabled) {
        const parent = instance._symbolParent();
        if (
          parent &&
          Object.prototype.hasOwnProperty.call(
            parent._disabledSiblingMap,
            instance.getMultireferenceId(),
          )
        ) {
          return;
        }
      }
      const counterpart: Node | null | undefined = isEffects
        ? (instance.getEffects() as unknown as Node | null)
        : isPaintLayers
          ? (instance.getPaintLayers() as unknown as Node | null)
          : changed
            ? instance._siblingMap[changed.getMultireferenceId()]
            : instance;
      if (counterpart) {
        if (canUpdate(counterpart, instance)) visit(asSibling(counterpart), instance, nestedSymbol);
      } else {
        const disabled = instance._disabledSiblingMap[(changed as Sibling).getMultireferenceId()];
        if (includeDisabled && canUpdate(disabled, instance) && disabled instanceof Node) {
          visit(asSibling(disabled), instance, nestedSymbol);
        } else if (!disabled) debugLog("GSymbol._iterateSiblings: Updating non existing sibling");
      }
    };
    scenes.forEach((scene) => {
      scene.visitLinks(masterOwner, visitInstance);
      // The old test compared with an unbound `this`, so it always passed.
      visitInstance(masterOwner);
    });
  }

  /** The nearest symbol above `node` (default: this). */
  _symbolParent(node?: Node | null): Symbol | null {
    return (node || this).findParent((parent) => parent instanceof Symbol) as Symbol | null;
  }

  /** A `trf` change that wasn't a layout pass becomes the layout transform. */
  override _handleGeometryChangeForProperties(
    change: number,
    args: unknown,
    properties: Readonly<Record<string, unknown>>,
  ): boolean {
    if (super._handleGeometryChangeForProperties(change, args, properties)) {
      const changeArgs = args as PropertiesChangeArgs;
      if (
        change == NodeChange.AfterPropertiesChange &&
        changeArgs.properties.indexOf("trf") >= 0 &&
        !this._relayout
      ) {
        let layout: Transform | null | undefined;
        const index = changeArgs.properties.indexOf("trf");
        const current = this.getProperty("trf") as Transform | null;
        const previous = changeArgs.values[index] as Transform | null;
        if (previous) layout = previous.inverted();
        if (current) layout = layout ? layout.multiplied(current) : current;
        this._layoutTransform = layout as Transform | null;
      }
      return true;
    }
    return false;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (
      !(change != NodeChange.BeforePropertiesChange && change !== NodeChange.BeforeChildRemove) &&
      !this.isMaster()
    ) {
      const master = this.getMasterSymbol();
      if (master && !this.hasFlag(NodeFlag.Selected) && master.isRecordedTransaction()) {
        this.recordedTransaction = true;
      }
    }
    this._handleGeometryChangeForProperties(change, args, GeometryProperties);
    let childGeometry = false;
    if (change == ElementChange.ChildGeometryUpdate) {
      const childArgs = args as [Node | null | undefined, unknown?, (Rect | null)?] | undefined;
      if (childArgs && childArgs[0] && childArgs[0].getParent() === (this as unknown)) {
        this._notifyChange(ElementChange.PrepareGeometryUpdate);
        childGeometry = true;
      }
    } else if (change === NodeChange.Store) {
      this._store(args as StoreChangeArgs);
    } else if (change === NodeChange.Restore) {
      this._restore(args as RestoreChangeArgs);
    } else if (change == NodeChange.BeforePropertiesChange) {
      this._blockEvents++;
    } else if (change == NodeChange.AfterPropertiesChange) {
      this._blockEvents--;
      if (this._blockEvents < 0) {
        this._blockEvents = 0;
        debugLog("too many afterpropertieschange events");
      }
    }
    super._handleChange(change, args);
    if (change == ElementChange.ChildGeometryUpdate && childGeometry) {
      this._beginBlockChanges([ElementChange.GeometrySizeChanged]);
      const childArgs = args as [Node | null | undefined, unknown?, (Rect | null)?];
      let paintBBox = childArgs[2];
      if (!paintBBox && childArgs[0] && childArgs[0] instanceof Element)
        paintBBox = childArgs[0].getPaintBBox();
      this._notifyChange(ElementChange.FinishGeometryUpdate, [2, paintBBox]);
      this._endBlockChanges([ElementChange.GeometrySizeChanged]);
    } else if (change === SceneNodeChange.SceneAttached && this._scene) {
      const scene = this._symbolScene();
      if (scene._isRestoring) {
        const oldReference = this.getOldReferenceId();
        this._master = !!(
          (this.$masterRef && oldReference === this.$masterRef) ||
          this.getReferenceId() === this.$masterRef
        );
        if (this._master) this.$masterRef = this.getReferenceId();
      } else if (!this._master && this.$masterRef) {
        if (this.getMasterSymbol()) {
          let unblocked = false;
          if (scene.$rb) {
            scene.endBlockReferenceChanges(true);
            unblocked = true;
          }
          scene.link(this.$masterRef, this);
          if (unblocked) scene.startBlockReferenceChanges();
        } else debugLog("Couldn't link slave to master");
      }
      if (this._master) {
        scene.addEventListener(
          sceneClassOf(scene).InvalidationFinishedEvent,
          this._invalidationFinishedHandler,
          this,
        );
      }
    } else if (change === SceneNodeChange.SceneDetached && this._scene) {
      const scene = this._symbolScene();
      if (!scene._isRestoring && this.getMasterSymbol() && !this._master && this.$masterRef) {
        let unblocked = false;
        if (scene.$rb) {
          scene.endBlockReferenceChanges(true);
          unblocked = true;
        }
        scene.unlink(this.$masterRef, this);
        if (unblocked) scene.startBlockReferenceChanges();
      }
      if (this._master) {
        scene.removeEventListener(
          sceneClassOf(scene).InvalidationFinishedEvent,
          this._invalidationFinishedHandler,
          this,
        );
      }
    } else if (
      change == NodeChange.AfterPropertiesChange ||
      change === NodeChange.AfterChildInsert
    ) {
      if (!this.isMaster()) {
        const master = this.getMasterSymbol();
        if (master && !this.hasFlag(NodeFlag.Selected) && master.isRecordedTransaction()) {
          this.recordedTransaction = false;
        }
      }
    } else if (change === NodeChange.Restore) {
      const map = this._siblingMap;
      if (this._effects) {
        map[this._effects.getMultireferenceId()] = this._effects as unknown as Node;
        this._effects.getSubnodeIds(map);
      }
      if (this._paintLayers) {
        map[this._paintLayers.getMultireferenceId()] = this._paintLayers as unknown as Node;
        this._paintLayers.getSubnodeIds(map);
      }
    } else if (change === ElementChange.FinishGeometryUpdate) {
      if (this.isPaintable()) this._shouldRepaintThumbnail = true;
    } else if (change === ElementChange.InvalidationRequested) {
      if (this.isPaintable()) this._shouldRepaintThumbnail = true;
    }
    if (
      (change === SceneNodeChange.SceneDetached || change === SceneNodeChange.SceneAttached) &&
      this._scene &&
      this.isMaster() &&
      change === SceneNodeChange.SceneDetached &&
      Symbol.enableSweepInstances
    ) {
      this._sweepInstances();
    }
  }

  /** Writes `trf`, `frame` and the sibling state (`dsb`, `sbl`); `swp` and `blockEv` are never saved. */
  _store(args: StoreChangeArgs): void {
    this.storeProperties(args.blob, GeometryProperties, (name, value) =>
      "trf" === name && value
        ? Transform.serialize(value as Transform)
        : "frame" === name && value
          ? Rect.serialize(value as Rect)
          : value,
    );
    const disabled = this._disabledSiblingMap;
    const siblings = this._siblingMap;
    this.storeProperties(args.blob, MetaProperties, (name, value) => {
      if ("dsb" === name) {
        const ids: string[] = [];
        for (const id in disabled) ids.push(id);
        return ids;
      }
      if ("swp" === name) return null;
      if ("blockEv" === name) return false;
      if ("sbl" === name) {
        const ids: string[] = [];
        for (const id in siblings) {
          const owner = (siblings[id] as Node).findParent((parent) => parent instanceof Symbol);
          if (owner && owner !== (this as unknown)) ids.push(id);
        }
        return ids;
      }
      return value;
    });
  }

  /**
   * Reads the properties and rebuilds the sibling state: `dsb` ids move
   * to the disabled map, `sbl` ids are taken over from nested symbols'
   * maps, `swp` ids become master ids again.
   */
  _restore(args: RestoreChangeArgs): void {
    const siblings = this._siblingMap;
    const disabled: Record<string, Node> = (this._disabledSiblingMap = {});
    this.restoreProperties(args.blob, GeometryProperties, (name, value) =>
      "trf" === name && value
        ? Transform.deserialize(value as number[]).makeInvertible()
        : "frame" === name && value
          ? Rect.deserialize(value as number[])
          : value,
    );
    this.restoreProperties(args.blob, MetaProperties, (name, value) => {
      if ("masterRef" === name && value) return value;
      if ("dsb" === name && value) {
        const ids = value as string[];
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i] as string;
          for (const key in siblings) {
            if (id === key && Object.prototype.hasOwnProperty.call(siblings, key)) {
              const sibling = siblings[key];
              if (Symbol.BLOCK_EDITED) Reflect.deleteProperty(siblings, key);
              if (sibling) disabled[key] = sibling;
              else debugLog("Nonexistent node in siblingMap");
            }
          }
        }
        return null;
      }
      if ("blockEv" === name) return false;
      if ("sbl" === name && value) {
        const findOwner = (symbol: Symbol, id: string): Symbol | null => {
          if (symbol._siblingMap[id]) return symbol;
          if (!symbol._cachedSymbolSiblings) {
            symbol._cachedSymbolSiblings = Object.values(symbol._siblingMap).filter(
              (node): node is Symbol => node instanceof Symbol,
            );
          }
          const nested = symbol._cachedSymbolSiblings;
          for (let i = 0, n = nested.length; i < n; i++) {
            const owner = findOwner(nested[i] as Symbol, id);
            if (owner) return owner;
          }
          return null;
        };
        const ids = value as string[];
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i] as string;
          const owner = findOwner(this, id);
          if (owner) {
            const sibling = owner._siblingMap[id] as Node;
            Reflect.deleteProperty(owner._siblingMap, id);
            if (owner._cachedSymbolSiblings) {
              owner._cachedSymbolSiblings.splice(
                owner._cachedSymbolSiblings.indexOf(sibling as Symbol),
                1,
              );
            }
            if (!Symbol.BLOCK_EDITED) this._siblingMap[id] = sibling;
          }
        }
      } else if ("swp" === name && value) {
        const ids = value as string[];
        for (let i = 0; i < ids.length; i++) {
          const sibling = this._siblingMap[ids[i] as string];
          if (sibling) ids[i] = (sibling as Symbol).$masterMultiRef as string;
          else debugLog("restore: couldn't repair swp array");
        }
      }
      return value;
    });
  }

  /** Unpacks and removes every instance (only with enableSweepInstances). */
  _sweepInstances(): void {
    const scene = this._symbolScene();
    Symbol.enableSweepInstances = false;
    this._iterateSiblings(this, (instance) => {
      const parent = instance.getParent();
      if (parent) {
        const children = (instance as unknown as ContainerNode).getChildren();
        scene.startBlockReferenceChanges();
        if (children.length > 1) parent.beginUpdate();
        children.forEach((child) => {
          (instance as unknown as ContainerNode).removeChild(child);
          parent.appendChild(child);
        });
        if (children.length > 1) parent.endUpdate();
        scene.endBlockReferenceChanges();
        instance.removeFlag(NodeFlag.Selected);
        parent.removeChild(instance);
      }
      return undefined;
    });
    Symbol.enableSweepInstances = true;
  }

  /** Takes the master's id as `masterRef` when the scene links this instance to a symbol. */
  override _referenceEvent(event: ReferenceEvent): void {
    if (event.target === (this as unknown) && "symbol" === Node.getName(event.reference)) {
      if (event.linked) this.$masterRef = asReferenceNode(event.reference).getReferenceId();
      super._referenceEvent(event);
    }
  }

  /** After a scene repaint, a master with a stale thumbnail repaints it. */
  _invalidationFinishedHandler(event: InvalidationFinished): void {
    if (this._shouldRepaintThumbnail && event.configuration.thumbnails) {
      this._shouldRepaintThumbnail = false;
      this._getSymbolThumbnail(
        event.configuration.thumbnailSize,
        event.configuration.thumbnailSize,
        (image) => {
          if (image) {
            this._cachedImage = image;
            setTimeout(() => {
              this.trigger(new SymbolThumbnailEvent(this, this._cachedImage));
            });
          }
        },
      );
    }
  }

  /** Paints; a master with a stale thumbnail repaints it afterwards. */
  override paint(context: PaintContext, arg?: unknown): void {
    if (!this._preparePaint(context)) return;
    this._paint(context);
    this._finishPaint(context);
    const configuration = context.configuration as unknown as ThumbnailConfiguration;
    if (this.isMaster() && this._shouldRepaintThumbnail && configuration.thumbnails) {
      this._shouldRepaintThumbnail = false;
      this._getSymbolThumbnail(
        configuration.thumbnailSize,
        configuration.thumbnailSize,
        (image) => {
          if (image) {
            this._cachedImage = image;
            setTimeout(() => {
              this.trigger(new SymbolThumbnailEvent(this, this._cachedImage));
            });
          }
        },
      );
    }
    void arg;
  }

  /** Renders the frame's content into a canvas of at most width x height. */
  _getSymbolThumbnail(
    width: number,
    height: number,
    done: (image: PaintCanvas | null) => void,
  ): null | undefined {
    const frame = this.getFrame();
    if (!frame) return null;
    const area = this._getBitmapPaintArea();
    if (!area || area.isEmpty()) return null;
    const frameWidth = frame.getWidth();
    const ratio = frame.getHeight() / frameWidth;
    let thumbWidth = width;
    let thumbHeight = thumbWidth * ratio;
    if (thumbHeight > height) thumbWidth = (thumbHeight = height) / ratio;
    const scaleX = thumbWidth / frame.getWidth();
    const scaleY = thumbHeight / frame.getHeight();
    const scale = 1 * Math.min(scaleX, scaleY);
    const pixelWidth = Math.round(1 * thumbWidth);
    const pixelHeight = Math.round(1 * thumbHeight);
    const canvas = new Canvas2DPaintCanvas();
    canvas.resize(pixelWidth, pixelHeight);
    const context = new PaintContext();
    context.canvas = canvas;
    const configuration = new ScenePaintConfiguration();
    configuration.paintMode = ScenePaintConfiguration.PaintMode.Full;
    configuration.paintSharp = false;
    configuration.annotations = false;
    context.configuration = configuration;
    configuration.clipArea = frame.intersected(area).scaled(1, 1);
    configuration.clipDirty = false;
    configuration.enableFxCache = false;
    configuration.defaultEffectDetailLevel = 1;
    canvas.prepare();
    canvas.setOrigin(new Point(frame.getX() * scale, frame.getY() * scale));
    canvas.setScale(scale);
    if (RenderScheduler.isRenderPhase()) {
      RenderScheduler.tryRunRendering(
        canvas,
        () => {
          try {
            this.paint(context);
          } finally {
            canvas.finish();
          }
        },
        done as unknown as (target: unknown) => void,
        false,
      );
    } else {
      try {
        this.paint(context);
      } finally {
        canvas.finish();
      }
      done(canvas);
    }
  }

  override toString(): string {
    return "[GSymbol]";
  }
}

/** The property events blocked on a counterpart while the master's values are set on it. */
const PROPERTY_EVENTS_BEFORE_AFTER = [BeforePropertiesChangeEvent, AfterPropertiesChangeEvent];

function asReferenceNode(node: unknown): { getReferenceId(): string } {
  return node as { getReferenceId(): string };
}

/** The scene's class (GScene), for its InvalidationFinishedEvent. */
function sceneClassOf(scene: SymbolScene): { InvalidationFinishedEvent: unknown } {
  const cls = Node.getClassFromId(getTypeId(scene) as number) as unknown as {
    InvalidationFinishedEvent: unknown;
  } | null;
  return cls || (scene.constructor as { InvalidationFinishedEvent: unknown });
}

/** A class as the comparison reads its property tables. */
interface PropertyTables {
  GeometryProperties?: Readonly<Record<string, unknown>>;
  VisualProperties?: Readonly<Record<string, unknown>>;
}

/**
 * The classes whose property tables `_comparePropertiesWithMaster`
 * compares, the way the old loop walked them: the node's own class, then
 * per level up the next node class, or where that has no node name the
 * first of GShape, GItem, GBlock, GStylable.Effect the level descends from
 * (so unnamed levels repeat GShape, then step to GItem and GBlock); it
 * stops at the first level that is none of these.
 */
function comparedClasses(node: Node): PropertyTables[] {
  const chain: (abstract new (...args: never[]) => unknown)[] = [];
  for (
    let cls = node.constructor as abstract new (...args: never[]) => unknown;
    cls && cls !== Object;
    cls = Object.getPrototypeOf(cls) as abstract new (...args: never[]) => unknown
  ) {
    if (getTypeId(cls) !== null) chain.push(cls);
  }
  const result: PropertyTables[] = [];
  const first = chain[0] ? Node.getClassFromId(getTypeId(chain[0]) as number) : null;
  if (!first || !node.hasMixin(Properties)) return result;
  result.push(first as unknown as PropertyTables);
  for (let level = 1; level < chain.length; level++) {
    const below = chain[level - 1] as abstract new (...args: never[]) => unknown;
    const prototype = below.prototype as object;
    if (!(prototype instanceof Node) || !hasMixinOnPrototype(prototype)) break;
    let next: unknown = Node.getClassFromId(getTypeId(chain[level]) as number);
    if (!next) {
      if (prototype instanceof Shape) next = Shape;
      else if (prototype instanceof Item) next = Item;
      else if (prototype instanceof Block) next = Block;
      else if (prototype instanceof Effect) next = Effect;
    }
    if (!next) break;
    result.push(next as PropertyTables);
  }
  return result;
}

function hasMixinOnPrototype(prototype: object): boolean {
  return (prototype as Node).hasMixin(Properties);
}

const symbolPrototype = Symbol.prototype;
symbolPrototype._siblingMap = null as unknown as Record<string, Node>;
symbolPrototype._disabledSiblingMap = null as unknown as Record<string, Node>;
symbolPrototype._master = false;
symbolPrototype._blockEvents = 0;
symbolPrototype._killEvents = false;
symbolPrototype._cachedImage = null;
symbolPrototype._cachedSymbolSiblings = null;
symbolPrototype._shouldRepaintThumbnail = true;
