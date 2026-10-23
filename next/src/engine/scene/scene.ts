// Old: chunk.vendor.js module 160 (GScene).
/**
 * The document, node "scene": the root of the tree. Its children are the
 * pages, the styles container ("styles") and the swatches; anything else
 * inserted into the scene goes into the active page. It holds the
 * document settings (units, grid, guides, colour mode, labels), the
 * master pages (`mpg`, `ompg`, `empg`, kept outside the page list) and
 * the links between referenceable nodes (styles, masters, symbols, text
 * paths) and the nodes that use them.
 *
 * Links are saved as `_links`: reference id → scene ids of the linked
 * nodes. `_linksLookup` maps the same reference ids to the node objects;
 * `_refreshLinks` rebuilds it from `_links` and tells nodes they were
 * linked or unlinked (GReferenceEvent). While the two disagree the links
 * are "not sane" and visits are queued as pending actions until they
 * agree again.
 */
import { Color } from "../color/color.ts";
import { Event } from "../core/event.ts";
import { Locale } from "../core/locale/locale.ts";
import { LocaleKey } from "../core/locale/locale-key.ts";
import { registerClass } from "../core/object.ts";
import { formatNumber } from "../core/util.ts";
import { QuadTree } from "../geometry/quadtree.ts";
import type { VertexReader } from "../geometry/vertex-source.ts";
import { VertexInfo } from "../geometry/vertex-info.ts";
import { VertexTransformer } from "../geometry/vertex-transformer.ts";
import { Length } from "../math/length.ts";
import { GMath } from "../math/math.ts";
import type { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { PaintCanvas } from "../paint/paint-canvas.ts";
import type { PaintContext } from "../paint/paint-context.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { DefaultStyles } from "../style/default-styles.ts";
import { Pattern } from "../style/pattern.ts";
import { SceneDictionary, type DictionaryScene } from "../style/scene-dictionary.ts";
import { isDestroyable } from "../style/stylable-sets.ts";
import { Style } from "../style/style.ts";
import { Swatch } from "../style/swatch.ts";
import { Swatches } from "../style/swatches.ts";
import { SymbolDictionary, type SymbolDictionaryScene } from "../style/symbol-dictionary.ts";
import { Text } from "../text/text.ts";
import { Block } from "./block.ts";
import { Accelerated } from "./element-accelerated.ts";
import { CollisionFlag, ElementChange } from "./element-change.ts";
import { Element, type ElementHit } from "./element.ts";
import { Item } from "./item.ts";
import type { Layer } from "./layer.ts";
import { NodeChange, NodeFlag } from "./node-change.ts";
import { Container, type ContainerNode } from "./node-container.ts";
import { Reference, type ReferenceNode } from "./node-identity.ts";
import { Properties, type PropertiesChangeArgs } from "./node-properties.ts";
import { Store } from "./node-store.ts";
import { Node, registerNodeClass, type NodeClass, type NodeWorkspace } from "./node.ts";
import { Page } from "./page.ts";
import { PathBase } from "./path-base.ts";
import { ReferenceEvent } from "./reference-event.ts";
import { SceneNode, type SceneHooks } from "./scene-node.ts";
import { SceneOptions } from "./scene-options.ts";
import type { Workspace } from "./workspace.ts";
// queryCount, queryAll and querySingle on nodes (the old scene required it the same way).
import "./selector.ts";

const AXONO_ANGLE1 = Math.PI / 6;

const GridMode = {
  Boxed: "box",
  Axonometric: "axo",
} as const;

// The defaults tables are mutable on purpose: restoring a document that
// has page properties adds them to VisualProperties (see Restore).
const MetaProperties: Record<string, unknown> = {
  v: 10,
  lmd: 0,
  cid: null,
  cfs: false,
  can: false,
  asec: null,
  ut: Length.Unit.PX,
  ur: 1,
  gx: 10,
  gy: 10,
  gm: null,
  lgm: null,
  gaw: 20,
  gah: null,
  ga1: null,
  ga2: null,
  hgl: null,
  vgl: null,
  name: null,
  _links: {},
  __ids: [],
  rb: false,
  cst: null,
  dpi: Length.DPI,
  pi: 0,
  cm: Color.ColorModes.RGB,
};

/** Page properties the scene reads and writes on its active page. */
const inheritedPageProps = ["w", "h", "ml", "mt", "mr", "mb", "bl", "bck", "bop"];

const GeometryProperties: Record<string, unknown> = {
  pgx: 2,
  mp: false,
};

const VisualProperties: Record<string, unknown> = {
  lbs: 10,
  lbp: 7,
  lbc: null,
  mve: null,
};

const SingleMasterProperties: Record<string, unknown> = {
  mpg: null,
  ompg: null,
  empg: null,
};

/** GScene.InvalidationRequestEvent: `area` of `page` (null: everything) needs a repaint. */
export class InvalidationRequestEvent extends Event {
  static {
    registerClass(this, "GScene.InvalidationRequestEvent");
  }

  declare area: Rect | null;
  declare page: Page | null;

  constructor(area?: Rect | null, element?: Node | null) {
    super();
    this.area = area || null;
    for (let node: Node | null | undefined = element; node;) {
      if (node instanceof Page) {
        this.page = node;
        break;
      }
      node = node.getParent();
    }
  }

  override toString(): string {
    return "[Event GScene.InvalidationRequestEvent]";
  }
}
(InvalidationRequestEvent.prototype as unknown as Record<string, unknown>)["area"] = null;
(InvalidationRequestEvent.prototype as unknown as Record<string, unknown>)["page"] = null;

/** GScene.InvalidationFinishedEvent: a paint of the scene finished. */
export class InvalidationFinishedEvent extends Event {
  static {
    registerClass(this, "GScene.InvalidationFinishedEvent");
  }

  declare scene: Scene | null;
  declare configuration: unknown;
  declare wasDirty: boolean | null;

  constructor(scene: Scene, configuration: unknown, wasDirty: boolean) {
    super();
    this.scene = scene;
    this.configuration = configuration;
    this.wasDirty = wasDirty;
  }

  override toString(): string {
    return "[Event GScene.InvalidationFinishedEvent]";
  }
}
(InvalidationFinishedEvent.prototype as unknown as Record<string, unknown>)["scene"] = null;
(InvalidationFinishedEvent.prototype as unknown as Record<string, unknown>)["configuration"] = null;
(InvalidationFinishedEvent.prototype as unknown as Record<string, unknown>)["wasDirty"] = null;

/** GScene.RecordedTransactionStartedEvent (sent by the editor around undo and redo). */
export class RecordedTransactionStartedEvent extends Event {
  static {
    registerClass(this, "GScene.RecordedTransactionStartedEvent");
  }

  declare scene: Scene | null;

  constructor(scene: Scene) {
    super();
    this.scene = scene;
  }

  override toString(): string {
    return "[Event GScene.RecordedTransactionStartedEvent]";
  }
}
(RecordedTransactionStartedEvent.prototype as unknown as Record<string, unknown>)["scene"] = null;

/** GScene.RecordedTransactionFinishedEvent (sent by the editor around undo and redo). */
export class RecordedTransactionFinishedEvent extends Event {
  static {
    registerClass(this, "GScene.RecordedTransactionFinishedEvent");
  }

  declare scene: Scene | null;

  constructor(scene: Scene) {
    super();
    this.scene = scene;
  }

  override toString(): string {
    return "[Event GScene.RecordedTransactionFinishedEvent]";
  }
}
(RecordedTransactionFinishedEvent.prototype as unknown as Record<string, unknown>)["scene"] = null;

/** Reference id → scene ids of the linked nodes (the saved `_links`). */
type Links = Record<string, string[]>;
/** Reference id → the linked nodes. */
type LinksLookup = Record<string, SceneNode[]>;

/** The scene's transform settings (GEditorOptions copies its options here). */
export interface SceneTransformSettingsValues {
  borderScale: boolean | null;
  scaleCorners: boolean | null;
}

/** A text that refers to paths by reference id (`rtxt`), as old files stored it. */
interface ReferringText extends SceneNode {
  $rtxt?: string[];
}

/** The annotations list of a page, as the scene uses it (engine-annotations-model). */
type AnnotationsList = ReturnType<Page["getAnnotations"]>;

/** A symbol master as the scene's symbol methods use it (engine-symbols-images). */
interface SymbolLike extends Node {
  getMultireferenceId(): string;
  getSymbolImage(): unknown;
}

type StoreFilter = (name: string, value: unknown) => unknown;

const hasOwn = (object: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(object, key);

const SceneBase = Accelerated(Store(Properties(Container(Element))));

export class Scene extends SceneBase implements SceneHooks {
  static {
    registerNodeClass(this, "scene", "GScene");
  }

  static AXONO_ANGLE1 = AXONO_ANGLE1;
  static AXONO_ANGLE2 = -AXONO_ANGLE1;
  static AXONO_GX = 20;
  static MIN_GRID_SIZE = 1;
  /** Set to force a number of decimals everywhere (null: per unit). */
  static decimalsNum: number | null = null;
  static GridMode = GridMode;
  static MetaProperties = MetaProperties;
  static inheritedPageProps = inheritedPageProps;
  static GeometryProperties = GeometryProperties;
  static VisualProperties: Record<string, unknown> = VisualProperties;
  static SingleMasterProperties = SingleMasterProperties;
  static InvalidationRequestEvent = InvalidationRequestEvent;
  static InvalidationFinishedEvent = InvalidationFinishedEvent;
  static RecordedTransactionStartedEvent = RecordedTransactionStartedEvent;
  static RecordedTransactionFinishedEvent = RecordedTransactionFinishedEvent;

  declare $v: number;
  declare $lmd: number;
  declare $cid: string | null;
  declare $cfs: boolean;
  declare $can: boolean;
  declare $asec: unknown;
  declare $ut: string;
  declare $ur: number;
  declare $gx: number;
  declare $gy: number;
  declare $gm: string | null;
  declare $lgm: string | null;
  declare $gaw: number;
  declare $gah: number | null;
  declare $ga1: number | null;
  declare $ga2: number | null;
  declare $hgl: number[] | null;
  declare $vgl: number[] | null;
  declare $name: string | null;
  declare $_links: Links;
  declare $__ids: string[];
  declare $rb: boolean;
  declare $cst: unknown;
  declare $dpi: number;
  declare $pi: number;
  declare $cm: string;
  declare $pgx: number;
  declare $mp: boolean;
  declare $lbs: number;
  declare $lbp: number;
  declare $lbc: Pattern | null;
  declare $mve: unknown;
  declare $mpg: Page | null;
  declare $ompg: Page | null;
  declare $empg: Page | null;
  /** Never a property: hasGrid reads it and gets undefined, as the old code did. */
  declare $ga: unknown;

  declare _activePage: Page | null;
  declare _linksLookup: LinksLookup | null;
  declare _temporarilyDisabledLinks: Links | null;
  declare _linksAreSane: boolean;
  declare _invalidateFrom: number;
  declare _pendingActions: (() => void)[];
  declare _callingPendingActions: boolean;
  declare _styles: DefaultStyles | null;
  declare _swatches: Swatches | null;
  declare _duringRecordedTransaction: boolean;
  declare _lastInvalidationFinishedEvent: unknown;
  /** Set while restoring a document saved before 3.10 (no `dictionary`). */
  declare _pre310: boolean;
  declare _trfSettings: SceneTransformSettingsValues | null;
  declare _dictionary: SceneDictionary | null;
  declare _symbolDictionary: SymbolDictionary | null;
  declare _destroyables: unknown[];
  declare _savedScreenBBox: Rect | null;
  declare _referenceCounter: number;
  declare _released: boolean;
  declare _lastTimeAnnotationsFromCloudModified: number;
  declare _shadowExpand: { left: number; top: number; right: number; bottom: number } | null;

  /**
   * A new scene in `workspace` with one page, unless `noPage`. The old
   * constructor stored the workspace as given (undefined when omitted).
   */
  constructor(workspace?: NodeWorkspace | null, noPage?: boolean) {
    super();
    this._scene = this;
    this.$_links = {};
    this._pendingActions = [];
    this._destroyables = [];
    this._workspace = workspace as NodeWorkspace | null;
    // The dictionaries type their listeners and recorder more narrowly than
    // the event target and the recorder do; the calls match at runtime.
    this._dictionary = new SceneDictionary(this as unknown as DictionaryScene);
    this._symbolDictionary = new SymbolDictionary(this as unknown as SymbolDictionaryScene);
    this._trfSettings = { borderScale: null, scaleCorners: null };
    this._setDefaultProperties(MetaProperties, GeometryProperties, VisualProperties);
    if (!noPage) this.insertPage();
  }

  override getWorkspace(): Workspace | null {
    return this._workspace as Workspace | null;
  }

  getDictionary(): SceneDictionary {
    return this._dictionary as SceneDictionary;
  }

  getSymbols(): ReturnType<SymbolDictionary["getSymbols"]> {
    return (this._symbolDictionary as SymbolDictionary).getSymbols();
  }

  isReleased(): boolean {
    return this._released;
  }

  /** Lets go of the dictionaries and the workspace references (the document closes). */
  releaseDictionaries(): void {
    this._released = true;
    (this._dictionary as SceneDictionary).release();
    (this._symbolDictionary as SymbolDictionary).release();
    (this.getWorkspace() as Workspace).cleanReferences(this);
  }

  /** The annotations list of every page (creating the missing ones). */
  getAnnotations(): AnnotationsList[] {
    const lists: AnnotationsList[] = [];
    this.iteratePages((page) => {
      const list = page.getAnnotations();
      if (list) lists.push(list);
    }, true);
    return lists;
  }

  hasAnnotations(): boolean {
    let has = false;
    this.iteratePages((page) => {
      has = has || page.hasAnnotations();
    }, true);
    return has;
  }

  /** One annotations list per page, in page order. */
  setAnnotations(lists: (AnnotationsList | null)[]): void {
    const pages: Page[] = [];
    this.iteratePages((page) => {
      pages.push(page);
    }, true);
    if (lists.length !== pages.length) {
      // The old code threw a plain string.
      throw "Invalid number of pages or annotations";
    }
    for (let i = 0; i < pages.length; i++) {
      (pages[i] as Page).setAnnotations(lists[i] as AnnotationsList);
    }
  }

  cleanAnnotations(): void {
    this.iteratePages((page) => {
      page.setAnnotations(null);
    }, true);
  }

  getLastTimeAnnotationsFromCloudModified(): number {
    return this._lastTimeAnnotationsFromCloudModified;
  }

  setLastTimeAnnotationsFromCloudModified(time: number): void {
    this._lastTimeAnnotationsFromCloudModified = time;
  }

  /** Removes a symbol master, its instances and its dictionary entry. */
  removeSymbol(symbol: SymbolLike): void {
    (this._symbolDictionary as SymbolDictionary).removeEntry(symbol.getMultireferenceId(), true);
    this.visitLinks(symbol, (linked) => {
      if ("symbol" === Node.getName(linked))
        (linked.getParent() as ContainerNode).removeChild(linked);
    });
    if (symbol.getParent()) (symbol.getParent() as ContainerNode).removeChild(symbol);
  }

  getSymbolImage(symbol: SymbolLike): unknown {
    const entry = (this._symbolDictionary as SymbolDictionary).getEntry(
      symbol.getMultireferenceId(),
    );
    return (
      (entry && entry.value && (entry.value as { image?: unknown }).image) ||
      symbol.getSymbolImage()
    );
  }

  /** Whether an image entry in use points to a local file (file://). */
  hasLinkedFiles(): boolean {
    const entries = (this._dictionary as SceneDictionary).getEntries();
    let linked = false;
    for (let i = 0, n = entries.length; i < n; i++) {
      const entry = entries[i] as (typeof entries)[number];
      const value = entry.value as string | null;
      linked = !!value && 0 === value.indexOf("file://") && entry.hasReferences();
      if (linked) break;
    }
    return linked;
  }

  setCloudSynchronization(id: string | null): void {
    this.setProperties(["cid", "cfs"], [id, !!id]);
  }

  isCloudSynchronization(): boolean {
    return !!this.$cid && this.$cfs;
  }

  setCloudAnnotations(id: string | null): void {
    if (id) this.setProperties(["cid", "can"], [id, true]);
    else this.setProperties(["can"], [false]);
  }

  isCloudAnnotations(): boolean {
    return !!this.$cid && (this.$can || this.$cfs);
  }

  lastModifiedDate(): Date {
    return new Date(this.$lmd);
  }

  getLastSavedTime(): number {
    return this.$lmd;
  }

  /** The box of a page label line: as wide as the scene, `lbs + lbp` high at `scale`. */
  getLabelBBox(scale?: number | null): Rect {
    const box = this.getGeometryBBox();
    const height = (this.$lbs + this.$lbp) * (scale || 1) * PaintCanvas.getScreenDPI();
    return new Rect(0, 0, box ? box.getWidth() : 0, height);
  }

  /**
   * Rebuilds `_linksLookup` after a restore: moves links of re-identified
   * references to their new ids, links texts to the paths they name in
   * `rtxt`, links nodes to styles by their `sref`, and maps the saved
   * scene ids (by position in `__ids`) to the restored nodes.
   */
  _recreateLinksLookup(): void {
    if (!(this.$_links && this.$__ids)) return;
    const textLinks: LinksLookup = {};
    const visit = (node: Node): void => {
      const reference = node as ReferenceNode;
      const text = node as ReferringText;
      if (
        node.hasMixin(Reference) &&
        reference.getOldReferenceId() &&
        hasOwn(this.$_links, reference.getOldReferenceId() as string)
      ) {
        this.$_links[reference._referenceId as string] = this.$_links[
          reference.getOldReferenceId() as string
        ] as string[];
        Reflect.deleteProperty(this.$_links, reference.getOldReferenceId() as string);
      } else if (text.$rtxt) {
        const paths = text.$rtxt;
        let found = 0;
        this.acceptChildren((child: Node) => {
          const target = child as ReferenceNode;
          if (
            child.hasMixin(Reference) &&
            (target.getOldReferenceId() || target._referenceId) &&
            paths.indexOf((target.getOldReferenceId() || target._referenceId) as string) >= 0
          ) {
            const id = target._referenceId as string;
            const existing = this.$_links[id];
            this.$_links[id] = (existing || []).concat([text.getSceneId()]);
            if (text.hasEventListeners(ReferenceEvent)) {
              const resolved = (this._workspace as NodeWorkspace).getReference(id) as Node;
              text.trigger(new ReferenceEvent(resolved, text, true));
            }
            let list = textLinks[id];
            if (!list) list = [];
            list.push(text);
            textLinks[id] = list;
            if (++found === paths.length) return false;
          }
          return undefined;
        });
        Reflect.deleteProperty(text, "$rtxt");
      }
      if (node instanceof PathBase && node.getAnchorPoints()) node.getAnchorPoints().accept(visit);
    };
    let master = this.getProperty("mpg") as Page | null;
    if (master) master.accept(visit);
    master = this.getProperty("empg") as Page | null;
    if (master) master.accept(visit);
    master = this.getProperty("ompg") as Page | null;
    if (master) master.accept(visit);
    this.acceptChildren(visit);

    const savedIds = this.$__ids;
    const sceneNodes: SceneNode[] = [];
    this.acceptChildren((node: Node) => {
      if (node instanceof SceneNode) sceneNodes.push(node);
    });
    for (const id in this.$_links) {
      const found: SceneNode[] = [];
      const linked = this.$_links[id];
      if (!linked) continue;
      const reference = (this._workspace as NodeWorkspace).getReference(id) as ReferenceNode | null;
      if (reference) {
        if (reference instanceof Style) {
          linked.length = 0;
          for (let nodeIndex = 0; nodeIndex < sceneNodes.length; nodeIndex++) {
            const node = sceneNodes[nodeIndex] as SceneNode;
            if (
              node instanceof Element &&
              (node as Element & { hasProperty(name: string): boolean }).hasProperty("sref") &&
              (node as Element & { getProperty(name: string): unknown }).getProperty("sref")
            ) {
              const styled = node as Element & {
                $sref: unknown;
                getProperty(name: string): unknown;
              };
              if (reference.getOldReferenceId() === styled.getProperty("sref")) {
                styled.$sref = reference.getReferenceId();
              }
              if (reference.getReferenceId() === styled.getProperty("sref")) {
                found.push(styled);
                linked.push(styled.getSceneId());
                if (styled.hasEventListeners(ReferenceEvent)) {
                  styled.trigger(new ReferenceEvent(reference, styled, true));
                }
              }
            }
          }
        } else {
          const missing: number[] = [];
          for (let linkIndex = 0; linkIndex < linked.length; linkIndex++) {
            let matched = false;
            for (let nodeIndex = 0; nodeIndex < sceneNodes.length; nodeIndex++) {
              if (savedIds[nodeIndex] === linked[linkIndex]) {
                const node = sceneNodes[nodeIndex] as SceneNode;
                if (node.getWorkspace()) {
                  found.push(node);
                  linked[linkIndex] = node.getSceneId();
                  if (node.hasEventListeners(ReferenceEvent)) {
                    node.trigger(new ReferenceEvent(reference, node, true));
                  }
                  matched = true;
                  break;
                }
              }
            }
            if (!matched) missing.push(linkIndex);
          }
          if (missing.length) {
            console.warn("Inexistent links found, cleaning up...");
            for (let missingIndex = missing.length - 1; missingIndex >= 0; missingIndex--)
              linked.splice(missing[missingIndex] as number, 1);
          }
        }
        if (!this._linksLookup) this._linksLookup = {};
        this._linksLookup[id] = found;
      } else {
        console.warn("Invalid reference id.");
        Reflect.deleteProperty(this.$_links, id);
      }
    }
    // Throws when there were text links but no other link (the old code
    // assumed the lookup exists).
    for (const id in textLinks)
      (this._linksLookup as LinksLookup)[id] = textLinks[id] as SceneNode[];
    this._linksAreSane = this._checkLinksSanity();
    if (this._isRestoring) {
      for (const id in this.$_links) {
        this.visitLinks(id, (linked) => {
          if (linked instanceof Page) linked._invalidatePaintBoxForChildUpdate();
        });
      }
    }
  }

  /** A scene node leaves the scene: its links as a reference go away. */
  _unsetSceneNode(node: SceneNode): void {
    if (this.$rb) return;
    node._scene = this;
    if (!this._isRestoring && node.hasMixin(Reference)) {
      const unlinkAll = (): void => {
        if (this.hasLinks(node)) {
          this.visitLinks(node, (linked) => {
            this.unlink(node, linked);
          });
        }
      };
      if (this._linksAreSane) unlinkAll();
      else this._pendingActions.push(unlinkAll);
    }
  }

  /** Links `target` to `reference` (a node or its reference id). */
  link(reference: Node | string, target: SceneNode): void {
    if (this._isRestoring || this.$rb) return;
    this._refreshLinks();
    if (this.isLinked(target, reference)) {
      this.setProperty("_links", JSON.parse(JSON.stringify(this.$_links || {})));
    } else {
      const id =
        "string" != typeof reference ? (reference as ReferenceNode).getReferenceId() : reference;
      const links = JSON.parse(JSON.stringify(this.$_links || {})) as Links;
      if (!this._linksLookup) this._linksLookup = {};
      if (!hasOwn(links, id)) {
        links[id] = [];
        this._linksLookup[id] = [];
      }
      (links[id] as string[]).push(target.getSceneId());
      this.setProperty("_links", links);
      if (target instanceof Page) {
        target._invalidatePaintBoxForChildUpdate();
        this._invalidateArea(null, target);
      }
    }
  }

  unlink(reference: Node | string | null | undefined, target: SceneNode): void {
    if (this._isRestoring || this.$rb || !reference) return;
    this._refreshLinks();
    const id =
      "string" != typeof reference ? (reference as ReferenceNode).getReferenceId() : reference;
    const links = JSON.parse(JSON.stringify(this.$_links || {})) as Links;
    if (!this._linksLookup) this._linksLookup = {};
    let list: string[] | undefined;
    let index: number;
    let changed = false;
    if (hasOwn(links, id)) {
      list = links[id] as string[];
      index = list.indexOf(target.getSceneId());
      if (index >= 0) {
        list.splice(index, 1);
        if (0 === list.length) Reflect.deleteProperty(links, id);
        changed = true;
      }
    }
    // Edits the copy without saving it; kept as in the old code.
    if (!changed && this._temporarilyDisabledLinks) {
      if (hasOwn(this._temporarilyDisabledLinks, id)) {
        list = links[id];
        if (list) {
          index = list.indexOf(target.getSceneId());
          if (index >= 0) {
            list.splice(index, 1);
            if (0 === list.length) Reflect.deleteProperty(links, id);
          }
        }
      }
    }
    if (changed) this.setProperty("_links", links);
  }

  /** Calls `visitor` with every reference `node` (or the node with that scene id) is linked to. */
  visitReferences(
    node: Node | string | null | undefined,
    visitor: (reference: Node) => void,
  ): void {
    if (this._linksAreSane) {
      if (this._linksLookup) {
        const workspace = this._workspace as NodeWorkspace;
        if ("string" == typeof node) {
          for (const id in this._linksLookup) {
            if ((this.$_links[id] as string[]).indexOf(node) >= 0) {
              visitor(workspace.getReference(id) as Node);
            }
          }
        } else if (node) {
          for (const id in this._linksLookup) {
            if (this._linkLookupHasSceneNode(id, node as SceneNode))
              visitor(workspace.getReference(id) as Node);
          }
        }
      }
    } else {
      this._pendingActions.push(() => {
        this.visitReferences(node, visitor);
      });
    }
  }

  /** Whether `node` (or a scene id) is linked to `reference` (a node or reference id). */
  isLinked(node: unknown, reference: unknown): boolean {
    const sceneId = node instanceof SceneNode ? node.getSceneId() : node;
    let id: string;
    if ("string" == typeof reference) id = reference;
    else {
      if (!reference || !(reference as Node).hasMixin(Reference)) return false;
      id = (reference as ReferenceNode).getReferenceId();
    }
    return hasOwn(this.$_links, id) && !((this.$_links[id] as unknown[]).indexOf(sceneId) < 0);
  }

  /** Calls `visitor` with each node linked to `reference`; false stops. */
  visitLinks(
    reference: Node | string | null | undefined,
    visitor: (linked: SceneNode) => unknown,
  ): void {
    if (this._linksAreSane) {
      if (this._linksLookup) {
        let id: string;
        if ("string" == typeof reference) id = reference;
        else {
          if (!reference) return;
          id = (reference as ReferenceNode).getReferenceId();
        }
        let linked = this._linksLookup[id];
        if (linked) {
          linked = linked.slice();
          for (let i = 0; i < linked.length; ++i) {
            if (false === visitor(linked[i] as SceneNode)) return;
          }
        }
      }
    } else {
      this._pendingActions.push(() => {
        this.visitLinks(reference, visitor);
      });
    }
  }

  hasLinks(reference: Node | string | null | undefined): boolean {
    if (!reference) return false;
    const id =
      "string" == typeof reference ? reference : (reference as ReferenceNode).getReferenceId();
    return hasOwn(this.$_links, id);
  }

  _linkLookupHasSceneNode(id: string, node: SceneNode): boolean {
    const linked = (this._linksLookup as LinksLookup)[id];
    if (linked) {
      const sceneId = node.getSceneId();
      const count = linked.length;
      for (let i = 0; i < count; i++) {
        const entry = linked[i];
        if (entry && entry instanceof SceneNode && entry.getSceneId() === sceneId) return true;
      }
    }
    return false;
  }

  /** Whether `node` (or a scene id) is linked to any reference. */
  hasReferences(node: SceneNode | string | null | undefined): boolean {
    if (!node) return false;
    if ("string" == typeof node) {
      for (const id in this.$_links)
        if ((this.$_links[id] as string[]).indexOf(node) >= 0) return true;
    } else if (this._linksLookup) {
      for (const id in this.$_links) if (this._linkLookupHasSceneNode(id, node)) return true;
    }
    return false;
  }

  /** How many nodes are linked to `reference`; -1 while links are not sane. */
  linkCount(reference: Node | string | null | undefined): number {
    let id: string;
    if (!this._linksAreSane) return -1;
    if ("string" == typeof reference) id = reference;
    else {
      if (!reference) return 0;
      id = (reference as ReferenceNode).getReferenceId();
    }
    const linked = this.$_links[id];
    return linked ? linked.length : 0;
  }

  /**
   * How many references `node` is linked to; -1 while links are not sane.
   * For a node (not a scene id) the old test was `boolean >= 0`, so it
   * counts every reference that has links; kept.
   */
  refCount(node: SceneNode | string | null | undefined): number {
    let count = 0;
    if (!this._linksAreSane) return -1;
    if ("string" == typeof node) {
      for (const id in this.$_links) if ((this.$_links[id] as string[]).indexOf(node) >= 0) count++;
    } else if (node && this._linksLookup) {
      for (const id in this.$_links)
        if (Number(this._linkLookupHasSceneNode(id, node)) >= 0) count++;
    }
    return count;
  }

  startBlockReferenceChanges(): void {
    this.setProperty("rb", true);
  }

  endBlockReferenceChanges(keepDisabled?: boolean): void {
    this.setProperty("rb", false);
    if (!keepDisabled) {
      this._cleanupLinks(this.$_links);
      this._temporarilyDisabledLinks = null;
    }
  }

  /**
   * Takes the scene ids that have no node in the lookup out of `links`
   * (and references without lookup entirely); returns what it took.
   */
  _cleanupLinks(links: Links): Links {
    const removed: Links = {};
    for (const id in links) {
      const linked = (this._linksLookup as LinksLookup)[id];
      if (linked) {
        const ids = links[id] as string[];
        for (let idIndex = ids.length - 1; idIndex >= 0; idIndex--) {
          const sceneId = ids[idIndex];
          let found = false;
          for (let nodeIndex = 0; nodeIndex < linked.length; nodeIndex++) {
            if ((linked[nodeIndex] as SceneNode).getSceneId() === sceneId) {
              found = true;
              break;
            }
          }
          if (!found) {
            if (!removed[id]) removed[id] = [];
            removed[id].push(ids[idIndex] as string);
            ids.splice(idIndex, 1);
          }
        }
        if (0 === ids.length) Reflect.deleteProperty(links, id);
      } else {
        removed[id] = links[id] as string[];
        Reflect.deleteProperty(links, id);
      }
    }
    return removed;
  }

  /** The active page's isFixedSized (its `w && h`), or false. */
  isFixedSized(): number | boolean {
    const page = this.getActivePage();
    return !!page && page.isFixedSized();
  }

  hasGrid(): unknown {
    return this.$ga && this.$gx && this.$gy;
  }

  stringToLength(text: string): Length | null {
    return Length.parseEquation(text, this.$ut);
  }

  stringToPoint(text: string): number | null {
    const length = this.stringToLength(text);
    return length ? length.toPoint() : null;
  }

  lengthToString(length: Length, decimals?: number): string {
    return formatNumber(length.toUnit(this.$ut), decimals);
  }

  getOptimalDecimalsCount(unit?: string | null): number {
    if (null !== Scene.decimalsNum) return Scene.decimalsNum;
    let decimals: number;
    switch (unit || this.$ut) {
      case Length.Unit.IN:
        decimals = 4;
        break;
      case Length.Unit.CM:
        decimals = 3;
        break;
      case Length.Unit.PT:
      case Length.Unit.PX:
        decimals = 1;
        break;
      default:
        decimals = 2;
    }
    return decimals;
  }

  getIncrementValue(unit?: string | null): number {
    let increment = 1;
    unit = unit || this.$ut;
    if (unit == Length.Unit.IN || unit == Length.Unit.CM) increment = 0.1;
    return increment;
  }

  pointToString(value: number, decimals?: number): string {
    return this.lengthToString(new Length(value), decimals);
  }

  /** Elements whose paint box `area` intersects (or contains). */
  getElementsByBBox(area: Rect, intersect?: boolean): Element[] {
    const result: Element[] = [];
    this.acceptChildren((node: Node) => {
      if (node instanceof Element) {
        const box = node.getPaintBBox();
        if (
          box &&
          !box.isEmpty() &&
          ((intersect && area.intersectsRect(box)) || (!intersect && area.containsRect(box)))
        ) {
          result.push(node);
        }
      }
      return undefined;
    });
    return result;
  }

  /**
   * Drops the cached boxes of all children and asks each to refresh its
   * position. Pages have no refreshPosition, so this throws once a page
   * is reached outside a restore; kept (QUESTIONS.md, "Changing the
   * scene's ms throws").
   */
  refreshPagesPositions(): void {
    try {
      this.beginUpdate();
      this._childrenPaintBBox = null;
      for (let child = this.getFirstChild(); null !== child; child = child.getNext()) {
        const element = child as Element;
        element._paintBBox = null;
        element._childrenPaintBBox = null;
        element._geometryBBox = null;
        element._preTransformRect = null;
        if (!this._isRestoring) {
          (child as unknown as { refreshPosition(): void }).refreshPosition();
        }
      }
    } finally {
      this.endUpdate();
    }
  }

  /**
   * Appends a new page named "Page <n>", with the size, margins and
   * background of the master it gets (odd/even/single) or of the active
   * page, and links it to that master.
   */
  insertPage(): Page {
    const count = this.queryCount("page");
    let names = ["name"];
    let values: unknown[] = [
      Locale.get(new LocaleKey("GScene", "page")) + " " + (count + 1).toString(),
    ];
    let master: Page | null = null;
    if (this.$mpg || this.$ompg || this.$empg) {
      master =
        (count + 1) % 2 == 0
          ? this.$empg
            ? this.$empg
            : this.$mpg
          : this.$ompg
            ? this.$ompg
            : this.$mpg;
    }
    const source = master || this.getActivePage();
    const page = new Page();
    if (source) {
      [Page.VisualProperties, Page.GeometryProperties].forEach((defaults) => {
        const keys = Object.keys(defaults);
        names = names.concat(keys);
        values = values.concat(source.getProperties(keys));
      });
    }
    const offset = names.indexOf("off");
    if (-1 !== offset) {
      names.splice(offset, 1);
      values.splice(offset, 1);
    }
    page.setProperties(names, values);
    this.appendChild(page);
    if (master) this.link(master, page);
    return page;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GScene", "name", this.getNodeName()) as string;
  }

  /** Calls `visitor` for each (visible, unless `includeInvisible`) page, last first when `reverse`; false stops. */
  iteratePages(
    visitor: (page: Page) => unknown,
    includeInvisible?: boolean,
    reverse?: boolean,
  ): void {
    if (reverse) {
      for (let node = this.getLastChild(); null !== node; node = node.getPrevious()) {
        if (node instanceof Page && (includeInvisible || node.$vis) && false === visitor(node))
          return;
      }
    } else {
      for (let node = this.getFirstChild(); null !== node; node = node.getNext()) {
        if (node instanceof Page && (includeInvisible || node.$vis) && false === visitor(node))
          return;
      }
    }
  }

  getActivePage(): Page | null {
    if (this._activePage && !this._activePage.hasFlag(NodeFlag.Active)) {
      for (let node = this.getFirstChild(); null !== node; node = node.getNext()) {
        if (node instanceof Page && node.hasFlag(NodeFlag.Active)) {
          this._activePage = node;
          break;
        }
      }
    }
    return this._activePage;
  }

  /**
   * Makes `page` the active page. With null the old page loses its flag
   * but stays `_activePage`; kept.
   */
  setActivePage(page: Page | null): void {
    const previous = this._activePage;
    if (previous === page) return;
    if (previous) {
      previous.removeFlag(NodeFlag.Active);
      previous.setActiveLayer(null);
    }
    if (page && page instanceof Page) {
      const from = previous ? this.getIndexOfChild(previous) : 0;
      const to = this.getIndexOfChild(page);
      this._activePage = page;
      page.setFlag(NodeFlag.Active);
      this.setProperty("pi", to);
      // Indices where pages are expected: the area comes out null (repaint all).
      this._invalidateArea(this._getInvalidationArea([from, to]), null);
    }
  }

  deleteActivePage(): void {
    const page = this.getActivePage();
    if (page) {
      const successor = this.getSuccessorActivePage(page);
      if (successor) {
        this.setActivePage(successor);
        (page.getParent() as ContainerNode).removeChild(page);
      }
    }
  }

  /** The page before `page`, else the one after it. */
  getSuccessorActivePage(page: unknown): Page | null {
    let successor: Page | null = null;
    if (page instanceof Page) {
      for (let node = page.getPrevious(); null !== node; node = node.getPrevious()) {
        if (node instanceof Page) {
          successor = node;
          break;
        }
      }
      if (!successor) {
        for (let node = page.getNext(); null !== node; node = node.getNext()) {
          if (node instanceof Page) {
            successor = node;
            break;
          }
        }
      }
    }
    return successor;
  }

  updateActivePageForElem(element: Node): void {
    if (element instanceof Item) {
      const page = element.findParent((node) => node instanceof Page) as Page | null;
      if (page && !page.hasFlag(NodeFlag.Active)) this.setActivePage(page);
    } else if (element instanceof Page) {
      if (!(element.hasFlag(NodeFlag.Active) || element.hasFlag(NodeFlag.Selected))) {
        this.setActivePage(element);
      }
    }
  }

  getActiveLayer(): Layer | null {
    const page = this.getActivePage();
    return page ? page.getActiveLayer() : null;
  }

  setActiveLayer(layer: Layer | null): void {
    if (layer) {
      const page = layer.findParent((node) => node instanceof Page) as Page | null;
      if (page) page.setActiveLayer(layer);
    } else if (this.getActiveLayer()) {
      const page = this.getActivePage();
      if (page) page.setActiveLayer(null);
    }
  }

  updateActiveLayerForElem(element: Node): void {
    const page = element.findParent((node) => node instanceof Page) as Page | null;
    if (page) page.updateActiveLayerForElem(element);
    for (let node = this.getFirstChild(); null !== node; node = node.getNext()) {
      if (node instanceof Page && node !== page) node.setActiveLayer(null);
    }
  }

  getSuccessorActiveLayer(layer?: Layer | null): Layer | null {
    const page = this.getActivePage();
    return page ? page.getSuccessorActiveLayer(layer) : null;
  }

  deleteActiveLayer(layer?: Layer | null): void {
    const page = this.getActivePage();
    if (page) page.deleteActiveLayer(layer);
  }

  getClipBBox(): Rect | null {
    const page = this.getActivePage();
    return page ? page.getClipBBox() : null;
  }

  /** The styles container, created (and given the colour mode) when missing. */
  getStyles(): DefaultStyles {
    if (this._styles) return this._styles;
    for (let node = this.getLastChild(); null !== node; node = node.getPrevious()) {
      if (node instanceof DefaultStyles) {
        this._styles = node;
        break;
      }
    }
    if (!this._styles) {
      this._styles = new DefaultStyles();
      this.appendChild(this._styles);
    }
    const mode = this.getProperty("cm") as string | null;
    if (mode) this._styles.setColorMode(mode);
    return this._styles;
  }

  getMarginBBox(): null {
    return null;
  }

  setScreenBox(box: Rect | null): void {
    this._savedScreenBBox = box;
  }

  getScreenBox(): Rect | null {
    return this._savedScreenBBox;
  }

  setShadowExpandArea(left: number | null, top?: number, right?: number, bottom?: number): void {
    this._shadowExpand =
      null !== left
        ? { left, top: top as number, right: right as number, bottom: bottom as number }
        : null;
  }

  getShadowExpandArea(): { left: number; top: number; right: number; bottom: number } | null {
    return this._shadowExpand;
  }

  _invalidateArea(area?: Rect | null, element?: Node | null): void {
    if (this.hasEventListeners(InvalidationRequestEvent)) {
      this.trigger(new InvalidationRequestEvent(area, element));
    }
  }

  override _finishPaint(context: PaintContext): void {
    if (this.hasEventListeners(InvalidationFinishedEvent)) {
      this.trigger(new InvalidationFinishedEvent(this, context.configuration, true));
    }
  }

  /**
   * Paints the active page, or in the multi-page view every page in the
   * dirty area at its position (the active page last when pages overlap).
   */
  override _paintChildren(context: PaintContext, arg?: unknown): void {
    let clipped = false;
    const configuration = context.configuration as PaintContext["configuration"] & {
      clipArea?: Rect | null;
      multiPageView?: unknown;
    };
    if (configuration.clipArea && (context.canvas as PaintCanvas).hasClip()) {
      const area = configuration.clipArea;
      (context.canvas as PaintCanvas).clipRect(
        area.getX(),
        area.getY(),
        area.getWidth(),
        area.getHeight(),
      );
      clipped = true;
    }
    const origin = (context.canvas as PaintCanvas).getOrigin();
    const scale = (context.canvas as PaintCanvas).getScale();
    let previous: Transform | null = null;
    let shift: Transform;
    let position: Point;
    if (configuration.multiPageView) {
      let pages = this.retrieveChildrenInPaintBBox(
        (context.dirtyMatcher as NonNullable<PaintContext["dirtyMatcher"]>).getDirtyArea() as Rect,
        2,
      ) as Element[];
      if (SceneOptions.pagesCanOverlap) {
        pages = pages
          .filter((node) => node instanceof Page)
          .sort((a, b) =>
            a.hasFlag(NodeFlag.Active) && !b.hasFlag(NodeFlag.Active)
              ? 1
              : b.hasFlag(NodeFlag.Active) && !a.hasFlag(NodeFlag.Active)
                ? -1
                : a.getElementIndex() - b.getElementIndex(),
          );
      }
      // The old loop assigned an undeclared `node` (a global); a local here.
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const node = pages[pageIndex];
        if (node instanceof Page) {
          position = node.getPosition(true);
          (context.canvas as PaintCanvas).setOrigin(
            (origin as Point).subtract(position.scale(scale as number)),
          );
          if (context.dirtyMatcher) {
            shift = new Transform(1, 0, 0, 1, -position.getX(), -position.getY());
            if (previous)
              context.dirtyMatcher.transform(shift.preMultiplied(previous.inverted() as Transform));
            else context.dirtyMatcher.transform(shift);
            previous = shift;
          }
          node.paint(context);
        }
      }
    } else (this.getActivePage() as Page).paint(context, arg);
    if (clipped) (context.canvas as PaintCanvas).resetClip();
  }

  override _getBitmapPaintArea(): Rect {
    const clip = this.getClipBBox();
    return clip || super._getBitmapPaintArea();
  }

  override _paintToBitmap(context: PaintContext): ReturnType<Element["_paintToBitmap"]> {
    (context.configuration as { clipToPage?: boolean }).clipToPage = true;
    return super._paintToBitmap(context);
  }

  override getPaintBBox(
    multiPageView?: unknown,
    arg?: unknown,
    includeInvisible?: unknown,
  ): Rect | null {
    if (!includeInvisible && !this.isVisible()) return null;
    return multiPageView
      ? this.getChildrenPaintBBox(multiPageView, null, includeInvisible)
      : arg
        ? this._calculatePaintBBox(arg, includeInvisible)
        : super.getPaintBBox(null, arg, includeInvisible);
  }

  /**
   * Hit-tests the active page (or its annotations), or in the multi-page
   * view the pages under the point, the active page first.
   */
  override hitTest(
    location: Point,
    transform?: Transform | null,
    acceptor?: ((element: Element) => unknown) | null,
    stacked?: boolean,
    level?: number | null,
    tolerance?: number | null,
    force?: unknown,
    filter?: ((element: Element) => unknown) | null,
    options?: unknown,
    preferSelected?: boolean,
    multiPage?: unknown,
    annotations?: unknown,
  ): ElementHit[] | null {
    const active = this.getActivePage();
    if (!multiPage && active) {
      return annotations
        ? Element.prototype.hitTest.call(
            active.getAnnotations() as unknown as Element,
            location,
            transform,
            acceptor,
            stacked,
            level,
            tolerance,
            force,
            filter,
            options,
            preferSelected,
          )
        : Element.prototype.hitTest.call(
            active,
            location,
            transform,
            acceptor,
            stacked,
            level,
            tolerance,
            force,
            filter,
            options,
            preferSelected,
          );
    }
    const width = tolerance as number;
    let box = this.getPaintBBox(multiPage);
    if (!box || box.isEmpty()) return null;
    if (transform) box = transform.mapRect(box);
    if (
      SceneOptions.pagesCanOverlap &&
      !box.expanded(width, width, width, width).containsPoint(location)
    ) {
      return null;
    }
    if (!SceneOptions.pagesCanOverlap && !box.containsPoint(location)) return null;
    let result = null as ElementHit[] | null;
    const point = transform ? (transform.inverted() as Transform).mapPoint(location) : location;
    const area = new Rect(point.getX() - width / 2, point.getY() - width / 2, width, width);
    let candidates = this.retrieveChildrenInPaintBBox(area, QuadTree.RETRIEVE_MODE_INTERSECT);
    if (SceneOptions.pagesCanOverlap) {
      if (candidates && null != candidates[0] && candidates.length > 1) {
        const index = candidates.indexOf(active as Element);
        if (index >= 0) candidates.splice(index, 1);
        candidates = candidates.sort((a, b) => b.getElementIndex() - a.getElementIndex());
        if (index >= 0) candidates.unshift(active as Element);
      }
    }
    if (candidates && 0 == candidates.length) candidates = null;
    if (candidates) {
      for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
        const page = candidates[candidateIndex] as Page;
        const at = page.getPosition(multiPage);
        const pageTransform = transform
          ? transform.preMultiplied(new Transform(1, 0, 0, 1, at.getX(), at.getY()))
          : new Transform(1, 0, 0, 1, at.getX(), at.getY());
        if (annotations) {
          return (page.getAnnotations() as unknown as Element).hitTest(
            location,
            pageTransform,
            acceptor,
            stacked,
            level,
            tolerance,
            force,
            filter,
            options,
            preferSelected,
          );
        }
        const hits = page.hitTest(
          location,
          pageTransform,
          acceptor,
          stacked,
          level,
          tolerance,
          force,
          filter,
          options,
          preferSelected,
        );
        if (hits) {
          result = (result || []).concat(hits || []);
          break;
        }
      }
      if (!result && SceneOptions.pagesCanOverlap) {
        result = candidates && candidates.length ? [candidates[0] as unknown as ElementHit] : null;
      }
    }
    return result;
  }

  /** Collisions on the active page, or in the multi-page view on every page under `area`. */
  override getCollisions(
    area: VertexReader,
    flags: number,
    acceptor?: ((element: Element) => unknown) | null,
    filter?: ((element: Element) => unknown) | null,
    childrenFilter?: ((element: Element) => unknown) | null,
    multiPage?: unknown,
    annotations?: unknown,
  ): Element[] {
    const active = this.getActivePage();
    let result: Element[] = [];
    if (annotations) return [];
    if (!multiPage && active) {
      return Element.prototype.getCollisions.call(
        this.getActivePage() as Page,
        area,
        flags,
        acceptor,
        filter,
        childrenFilter,
      );
    }
    if (multiPage) {
      const byPaint = flags & CollisionFlag.PaintBBox;
      const mode = QuadTree.RETRIEVE_MODE_INTERSECT;
      const bounds = VertexInfo.calculateBounds(area, true) as Rect;
      const pages = byPaint
        ? this.retrieveChildrenInPaintBBox(bounds, mode)
        : this.retrieveChildrenInGeometryBBox(bounds, mode);
      if (pages) {
        pages.forEach((page) => {
          const at = (page as Page).getPosition(multiPage);
          const shift = new Transform(1, 0, 0, 1, -at.getX(), -at.getY());
          result = result.concat(
            Element.prototype.getCollisions.call(
              page,
              new VertexTransformer(area, shift),
              flags,
              acceptor,
              filter,
              childrenFilter,
            ),
          );
        });
      }
    }
    return result;
  }

  override _getAccelElementOffset(element: Element): Point | null {
    return element instanceof Page ? element.getPosition(true) : null;
  }

  override getGeometryBBox(includeInvisible?: unknown, multiPage?: unknown): Rect | null {
    return multiPage
      ? this.getChildrenGeometryBBox(includeInvisible, multiPage)
      : super.getGeometryBBox(includeInvisible);
  }

  override _calculateChildrenPaintBBox(
    multiPage?: unknown,
    arg?: unknown,
    includeInvisible?: unknown,
  ): Rect | null {
    if (!includeInvisible && !this.isVisible()) return null;
    let box: Rect | null = null;
    for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
      if (child instanceof Page) {
        let pageBox = child.getPaintBBox(null, arg, includeInvisible);
        if (pageBox) {
          if (multiPage) {
            const at = child.getPosition(true);
            if (!(0 === at.getX() && 0 === at.getY())) {
              pageBox = pageBox.translated(at.getX(), at.getY());
            }
          }
          box = box ? box.united(pageBox) : pageBox;
        }
      }
    }
    return box || new Rect(0, 0, 0, 0);
  }

  override getChildrenGeometryBBox(includeInvisible?: unknown, multiPage?: unknown): Rect | null {
    if (!includeInvisible && !this.isVisible()) return null;
    let box: Rect | null = null;
    for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
      if (child instanceof Element) {
        let childBox = child.getGeometryBBox(includeInvisible);
        if (childBox && (childBox.getHeight() > 0 || childBox.getWidth() > 0)) {
          if (multiPage) {
            const at = (child as Page).getPosition(true);
            if (!(0 === at.getX() && 0 === at.getY())) {
              childBox = childBox.translated(at.getX(), at.getY());
            }
          }
          box = box ? box.united(childBox) : childBox;
        }
      }
    }
    return box || null;
  }

  /**
   * Pages, styles and swatches become children of the scene; anything
   * else goes into the active page (made when there is none), before
   * `reference` unless that is a page.
   */
  override insertChild(child: Node, reference?: Node | null): void {
    if (child instanceof DefaultStyles) {
      if (this._isRestoring) {
        if (this._styles && this._styles.getParent() === this) {
          this.removeChild(this._styles);
          this._styles = child;
        }
        child.repairSdf();
      }
      super.insertChild(child, reference);
      return;
    }
    if (child instanceof Swatches) {
      super.insertChild(child, reference);
      return;
    }
    if (child instanceof Page) {
      super.insertChild(child, reference);
      if (this.isEvenOddMaster()) this.reassignMasterPages();
      else if (this.$mpg) this._fixSingleMpg(child, this.$mpg);
      if (!this.getActivePage()) this.setActivePage(child);
      return;
    }
    if (!this._activePage) {
      this._activePage = this.insertPage();
      if (this.isEvenOddMaster()) this.reassignMasterPages();
      this._activePage.setFlag(NodeFlag.Active);
    }
    if (reference instanceof Page) reference = null;
    this._activePage.insertChild(child, reference);
  }

  /**
   * Gives `clone` the name of `original` with the next free number:
   * "Page" → "Page 1", "Page 1" → "Page 1.1", "Page 1.2" → "Page 1.2.1",
   * counting up past the names other pages already use.
   */
  renameClone(original: unknown, clone: unknown): void {
    if (!(original instanceof Page && clone instanceof Page)) return;
    const name = (original.getProperty("name") as string | null) || "";
    const pattern = /\s([0-9]+)(?:\.([0-9]+))?(?:\.([0-9]+))?$/;
    const match = name.match(pattern);
    const base = name.slice(0, match ? match.index : name.length);
    const numbers = match
      ? match[3]
        ? [parseInt(match[1] as string), parseInt(match[2] as string), parseInt(match[3]) + 1]
        : match[2]
          ? [parseInt(match[1] as string), parseInt(match[2]), 1]
          : [parseInt(match[1] as string), 1]
      : [1];
    this.iteratePages((page) => {
      if (page === original || page === clone) return;
      const other = (page.$name as string | null) || "";
      const found = other.match(pattern);
      if (other.slice(0, found ? found.index : other.length) === base && found) {
        if (1 === numbers.length)
          numbers[0] = Math.max(numbers[0] as number, parseInt(found[1] as string) + 1);
        else if (2 === numbers.length) {
          if (!(
            numbers[0] !== parseInt(found[1] as string) ||
            Number.isNaN(parseInt(found[2] as string))
          )) {
            numbers[1] = Math.max(numbers[1] as number, parseInt(found[2] as string) + 1);
          }
        } else if (3 === numbers.length) {
          if (!(
            numbers[0] !== parseInt(found[1] as string) ||
            numbers[1] !== parseInt(found[2] as string) ||
            Number.isNaN(parseInt(found[3] as string))
          )) {
            numbers[2] = Math.max(numbers[2] as number, parseInt(found[3] as string) + 1);
          }
        }
      }
    }, true);
    clone.setProperty("name", base + " " + numbers.join("."));
  }

  override removeChild(child: Node): void {
    super.removeChild(child);
    if (child instanceof Page && this.isEvenOddMaster()) this.reassignMasterPages();
  }

  /** The page properties (w, h, margins, bleed, background) are the active page's. */
  override getProperty(
    name: string,
    custom?: boolean,
    defaultValue?: unknown,
    temporary?: boolean,
  ): unknown {
    const page = this.getActivePage();
    return inheritedPageProps.indexOf(name) >= 0
      ? (page as Page).getProperty(name, custom, defaultValue, temporary)
      : super.getProperty(name, custom, defaultValue, temporary);
  }

  isEvenOddMaster(): boolean {
    return !(!this.$ompg && !this.$empg);
  }

  /** Links every page to its master: odd pages to `ompg`, even ones to `empg`, else `mpg`. */
  reassignMasterPages(): void {
    if (this.$rb || this._isRestoring) return;
    let odd = true;
    for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
      if (child instanceof Page) {
        const master = odd
          ? this.$ompg
            ? this.$ompg
            : this.$mpg
          : this.$empg
            ? this.$empg
            : this.$mpg;
        this._fixSingleMpg(child, master);
        odd = !odd;
      }
    }
  }

  /** Links `page` to `master` alone (unless it is locked against edits). */
  _fixSingleMpg(page: Page, master: Page | null): void {
    if (this.$rb || this._isRestoring) return;
    const lock = page.getProperty("plkt") as number | null;
    if (lock && lock & Block.ProgramLck.NoEdit) return;
    if (!!master && this.isLinked(page, master)) return;
    this.visitReferences(page, (reference) => {
      if (reference instanceof Page) this.unlink(reference, page);
    });
    if (master) this.link(master, page);
  }

  /**
   * Brings `_linksLookup` in line with `_links`: tells newly linked and
   * unlinked nodes (ReferenceEvent), drops references that are gone and
   * sets aside the scene ids that have no node yet.
   */
  _refreshLinks(): void {
    if (this.$rb || !this._linksLookup) return;
    const lookup = this._linksLookup;
    const disabled = this._temporarilyDisabledLinks;
    if (disabled) {
      for (const id in disabled) {
        const linked = this.$_links[id];
        if (linked) {
          (disabled[id] as string[]).forEach((sceneId) => {
            if (linked.indexOf(sceneId) < 0) linked.push(sceneId);
          });
        } else this.$_links[id] = disabled[id] as string[];
      }
    }
    let bySceneId: Record<string, SceneNode> | null = null;
    const nodesBySceneId = (): Record<string, SceneNode> => {
      if (!bySceneId) {
        const map: Record<string, SceneNode> = {};
        this.acceptChildren((node: Node) => {
          if (node instanceof SceneNode) {
            const sceneId = node.getSceneId();
            if (sceneId) map[sceneId] = node;
          }
          return undefined;
        });
        bySceneId = map;
      }
      return bySceneId;
    };
    const workspace = this._workspace as NodeWorkspace;
    for (const id in this.$_links) {
      const reference = workspace.getReference(id);
      let previousIds: string[] = [];
      let previous: SceneNode[] = [];
      if (hasOwn(lookup, id)) {
        previous = lookup[id] as SceneNode[];
        previousIds = previous.map((node) => node.getSceneId());
      }
      const sceneIds = this.$_links[id] as string[];
      sceneIds.forEach((sceneId) => {
        if (previousIds.indexOf(sceneId) < 0) {
          const node = nodesBySceneId()[sceneId];
          if (node && reference && node.hasEventListeners(ReferenceEvent)) {
            node.trigger(new ReferenceEvent(reference, node, true));
          }
        }
      });
      previous.forEach((node) => {
        if (
          (!node._scene || sceneIds.indexOf(node.getSceneId()) < 0) &&
          reference &&
          node.hasEventListeners(ReferenceEvent)
        ) {
          node.trigger(new ReferenceEvent(reference, node, false));
        }
      });
      lookup[id] = sceneIds
        .map((sceneId) => {
          const node: SceneNode | null | undefined = nodesBySceneId()[sceneId];
          // A missing id is undefined, never null: this never runs; kept.
          if (null === node && reference) {
            const old = previous[previousIds.indexOf(sceneId)];
            if (old && old.hasEventListeners(ReferenceEvent)) {
              old.trigger(new ReferenceEvent(reference, old, false));
            }
          }
          return node;
        })
        .filter((node): node is SceneNode => !!node);
    }
    for (const id in lookup) {
      if (hasOwn(this.$_links, id)) {
        const linked = lookup[id];
        if (!(linked && linked.length)) Reflect.deleteProperty(lookup, id);
      } else {
        const linked = lookup[id] as SceneNode[];
        const reference = workspace.getReference(id);
        if (reference) {
          linked.forEach((node) => {
            if (node.hasEventListeners(ReferenceEvent)) {
              node.trigger(new ReferenceEvent(reference, node, false));
            }
          });
        }
        Reflect.deleteProperty(lookup, id);
      }
    }
    this._temporarilyDisabledLinks = this._cleanupLinks(this.$_links);
  }

  /** Whether `_links` and `_linksLookup` hold the same links. */
  _checkLinksSanity(): boolean {
    const links = this.$_links;
    const lookup = this._linksLookup;
    if (!lookup) return true;
    for (const id in links) {
      if (!hasOwn(lookup, id)) return false;
      const ids = links[id];
      const nodes = lookup[id];
      if (!ids || !nodes) return false;
      if (!ids.length) return false;
      if (ids.length !== nodes.length) {
        console.warn("Links: prop len != dyn len");
        return false;
      }
      const nodeIds = nodes.map((node) =>
        node && node instanceof SceneNode ? node.getSceneId() : null,
      );
      for (let s = 0; s < ids.length; s++) {
        const sceneId = ids[s];
        if (!sceneId) return false;
        if (nodeIds.indexOf(sceneId) < 0) return false;
      }
    }
    for (const id in lookup) if (!hasOwn(links, id)) return false;
    return true;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.PrepareRestore) {
      const blob = (args as RestoreChangeArgs).blob;
      if (this._activePage) {
        this.removeChild(this.getActivePage() as Page);
        this._activePage = null;
      }
      if (hasOwn(blob, "dictionary")) {
        (this._dictionary as SceneDictionary).deserialize(
          blob["dictionary"] as Parameters<SceneDictionary["deserialize"]>[0],
        );
      } else this._pre310 = true;
      (this._symbolDictionary as SymbolDictionary).deserialize(
        blob["symbolDictionary"] as Parameters<SymbolDictionary["deserialize"]>[0],
      );
      const customFonts = blob["cst"];
      if (customFonts && customFonts instanceof Array) this.$cst = customFonts;
      this._isRestoring = true;
    } else if (change === NodeChange.Store) {
      const { blob, options } = args as StoreChangeArgs;
      this.storeProperties(blob, MetaProperties, this._storeMetaFilter(options));
      this.storeProperties(blob, GeometryProperties);
      this.storeProperties(blob, VisualProperties, (name, value) =>
        "lbc" === name && value ? Pattern.serialize(value as Pattern) : value,
      );
      blob["dictionary"] = (this._dictionary as SceneDictionary).serialize();
      blob["symbolDictionary"] = (this._symbolDictionary as SymbolDictionary).serialize();
      if (null != this.$mpg) blob["mpg"] = Node.serialize(this.$mpg);
      if (null != this.$empg) blob["empg"] = Node.serialize(this.$empg);
      if (null != this.$ompg) blob["ompg"] = Node.serialize(this.$ompg);
    } else if (change === NodeChange.Restore) {
      this._restoreFromBlob((args as RestoreChangeArgs).blob);
    } else if (change === NodeChange.BeforePropertiesChange) {
      this._beforePropertiesChange(args as PropertiesChangeArgs);
    } else if (change === NodeChange.AfterPropertiesChange) {
      const { properties } = args as PropertiesChangeArgs;
      let master: Page | null;
      if (properties.indexOf("mpg") >= 0) {
        master = this.getProperty("mpg") as Page | null;
        if (master) master._attachToParent(this);
      }
      if (properties.indexOf("ompg") >= 0) {
        master = this.getProperty("ompg") as Page | null;
        if (master) master._attachToParent(this);
      }
      if (properties.indexOf("empg") >= 0) {
        master = this.getProperty("empg") as Page | null;
        if (master) master._attachToParent(this);
      }
      const ms = properties.indexOf("ms");
      const links = properties.indexOf("_links");
      if (ms >= 0) {
        this.refreshPagesPositions();
        // The old code read an undeclared `mpIdx` here (chunk.vendor.js
        // line 34950); it threw this ReferenceError. Kept (QUESTIONS.md,
        // "Changing the scene's ms throws").
        throw new ReferenceError("mpIdx is not defined");
      }
      if (links >= 0) this._checkSanityIfNecessary();
      if (this._styles && properties.indexOf("cm") >= 0) {
        this._styles.setColorMode(
          (this.getProperty("cm") as string | null) || Color.ColorModes.RGB,
        );
      }
    } else if (change === NodeChange.BeforeChildRemove) {
      if (this.isFixedSized()) {
        this._invalidateFrom = this.getIndexOfChild(args as Node);
        this._invalidateArea(this._getInvalidationArea(this._invalidateFrom), null);
      }
    } else if (change === NodeChange.AfterChildInsert || change === NodeChange.AfterChildRemove) {
      const child = args as Node;
      this._checkSanityIfNecessary();
      if (this.isFixedSized()) {
        // The areas are computed (filling the page box caches) and dropped, as in the old code.
        if (change === NodeChange.AfterChildRemove) this._getInvalidationArea(this._invalidateFrom);
        else this._getInvalidationArea(this.getIndexOfChild(child));
      }
      if (child instanceof Page && !child.$off && !SceneOptions.pagesPerRow) {
        const at = child.getPosition(true, true, true);
        child.setProperty("off", new Transform().translated(at.getX(), at.getY()));
      }
    } else if (change == ElementChange.ChildGeometryUpdate) {
      const update = args as [Node | null | undefined, unknown?, (Rect | null)?] | null;
      if (update && update[0] instanceof Page) {
        update[1] = true;
        this._invalidateArea(
          update[2] || this._getInvalidationArea(this.getIndexOfChild(update[0])),
        );
      }
    } else if (change === NodeChange.WorkspaceAttached || change === NodeChange.WorkspaceDetach) {
      const workspace = change === NodeChange.WorkspaceDetach ? null : this._workspace;
      let master = this.getProperty("mpg") as Page | null;
      if (master) master._setWorkspace(workspace);
      master = this.getProperty("ompg") as Page | null;
      if (master) master._setWorkspace(workspace);
      master = this.getProperty("empg") as Page | null;
      if (master) master._setWorkspace(workspace);
    }
    this._handleGeometryChangeForProperties(change, args, GeometryProperties);
    this._handleVisualChangeForProperties(change, args, VisualProperties);
    super._handleChange(change, args);
  }

  /** The Store filter for the meta properties. */
  _storeMetaFilter(options: StoreChangeArgs["options"] | undefined): StoreFilter {
    return (name, value) => {
      if ("__ids" === name) {
        const ids: string[] = [];
        this.acceptChildren((node: Node) => {
          if (node instanceof SceneNode) ids.push(node.getSceneId());
          return undefined;
        });
        return ids;
      }
      if ("lmd" === name) {
        if (options && options.save) {
          this.$lmd = isNaN(options.lastModifiedDate as number)
            ? Date.now()
            : (options.lastModifiedDate as number);
          return this.$lmd;
        }
        return null;
      }
      if ("cfs" === name || "cid" === name) {
        if (options && options.singleton) return null;
      } else if ("cst" === name) {
        if (Text.dontStorePaths) return null;
      } else if ("pi" === name) {
        if (options && options.save) {
          return this._activePage ? this.getIndexOfChild(this._activePage) : 0;
        }
      }
      return value;
    };
  }

  _restoreFromBlob(blob: RestoreChangeArgs["blob"]): void {
    if (hasOwn(blob, "$")) {
      const children = blob.$ as NonNullable<typeof blob.$>;
      let hasPage = false;
      if (children.length) {
        for (let childIndex = 0; childIndex < children.length; ++childIndex) {
          const child = children[childIndex] as (typeof children)[number];
          // Throws for an unknown node name, as the old code did.
          const cls = Node._nameToNodeClassMap.get(child["@"] as string) as NodeClass;
          if (cls.toString() === Page.toString()) hasPage = true;
        }
      }
      if (!hasPage) {
        if (!hasOwn(blob, "h")) blob["h"] = 0;
        if (!hasOwn(blob, "w")) blob["w"] = 0;
      }
    }
    this.restoreProperties(blob, MetaProperties);
    this.restoreProperties(blob, GeometryProperties);
    // Adds the page properties the blob has to VisualProperties itself
    // (not a copy), so they stay in the table for every later scene; kept
    // (QUESTIONS.md, "Restoring a scene adds page keys to GScene.VisualProperties").
    const visual = inheritedPageProps.reduce((table, name) => {
      if (hasOwn(blob, name)) table[name] = null;
      return table;
    }, VisualProperties);
    this.restoreProperties(blob, visual, (name, value) =>
      ("bck" !== name && "lbc" !== name) || !value ? value : Pattern.deserialize(value as string),
    );
    if (hasOwn(blob, "mpg")) {
      const master = Node.deserialize(blob["mpg"] as string);
      if (master && master instanceof Page) this.setProperty("mpg", master);
    }
    if (hasOwn(blob, "ompg")) {
      const master = Node.deserialize(blob["ompg"] as string);
      if (master && master instanceof Page) this.setProperty("ompg", master);
    }
    if (hasOwn(blob, "empg")) {
      const master = Node.deserialize(blob["empg"] as string);
      if (master && master instanceof Page) this.setProperty("empg", master);
    }
    this._recreateLinksLookup();
    this._isRestoring = false;
    const active = this.getChildByIndex(this.getProperty("pi") as number);
    this.setActivePage(active as Page | null);
    if (!SceneOptions.pagesPerRow) {
      this.iteratePages((page) => {
        if (!page.$off) {
          const at = page.getPosition(true, true, true);
          page.$off = new Transform().translated(at.getX(), at.getY());
        }
      }, true);
    }
    this._pre310 = false;
  }

  /**
   * Keeps the grid sizes at least MIN_GRID_SIZE, fills in the axonometric
   * grid's angles and height, sends page properties to the active page
   * and detaches master pages that are being replaced.
   */
  _beforePropertiesChange(args: PropertiesChangeArgs): void {
    const { properties, values } = args;
    ["gaw", "gx", "gy"].forEach((name) => {
      const index = properties.indexOf(name);
      if (index >= 0 && (values[index] as number) < Scene.MIN_GRID_SIZE)
        values[index] = Scene.MIN_GRID_SIZE;
    });
    const gmIndex = properties.indexOf("gm");
    let angle1: unknown;
    let angle2: unknown;
    let width: unknown;
    let i1: number;
    let i2: number;
    let iw: number;
    let height: number | null;
    let ih: number;
    if (gmIndex >= 0) {
      const mode = values[gmIndex] as string | null;
      this.$lgm = mode || this.$gm;
      if (mode === GridMode.Axonometric && this.$gm !== GridMode.Axonometric) {
        angle1 = Scene.AXONO_ANGLE1;
        angle2 = Scene.AXONO_ANGLE2;
        width = Scene.AXONO_GX;
        i1 = properties.indexOf("ga1");
        i2 = properties.indexOf("ga2");
        iw = properties.indexOf("gaw");
        // With ga1 already set and not in the change, angle1 reads
        // values[-1] (undefined); kept.
        if (i1 < 0 && !this.$ga1) {
          properties.push("ga1");
          values.push(Scene.AXONO_ANGLE1);
        } else angle1 = values[i1];
        if (i2 < 0 && !this.$ga2) {
          properties.push("ga2");
          values.push(Scene.AXONO_ANGLE2);
        } else angle2 = values[i2];
        if (!this.$gaw && iw < 0) {
          properties.push("gaw");
          values.push(Scene.AXONO_GX);
        } else if (iw >= 0) width = values[iw];
        height = this._getAxonoGYVal(width as number, angle1 as number, angle2 as number);
        ih = properties.indexOf("gah");
        if (null !== height) {
          if (ih < 0 && this.$gah !== height) {
            properties.push("gah");
            values.push(height);
          } else if (ih >= 0 && !GMath.isEqualEps(height, values[ih] as number, 1e-9)) {
            values[ih] = height;
          }
        }
      } else if (mode !== GridMode.Axonometric && this.$gm === GridMode.Axonometric) {
        if (!this.$gy) {
          properties.push("gy");
          values.push(this.$gx);
        }
      }
    } else if (
      this.$gm === GridMode.Axonometric &&
      (properties.indexOf("ga1") >= 0 ||
        properties.indexOf("ga2") >= 0 ||
        properties.indexOf("gaw") >= 0)
    ) {
      angle1 = (i1 = properties.indexOf("ga1")) >= 0 ? values[i1] : this.$ga1;
      angle2 = (i2 = properties.indexOf("ga2")) >= 0 ? values[i2] : this.$ga2;
      width = (iw = properties.indexOf("gaw")) >= 0 ? values[iw] : this.$gaw;
      height = this._getAxonoGYVal(width as number, angle1 as number, angle2 as number);
      ih = properties.indexOf("gah");
      if (null !== height) {
        if (ih < 0 && this.$gah !== height) {
          properties.push("gah");
          values.push(height);
        } else if (ih >= 0 && !GMath.isEqualEps(height, values[ih] as number, 1e-9)) {
          values[ih] = height;
        }
      }
    }
    const pageIndices: number[] = [];
    properties.forEach((name) => {
      pageIndices.push(inheritedPageProps.indexOf(name));
    });
    if (pageIndices.some((index) => index >= 0)) {
      let pageNames: string[] = [];
      let pageValues: unknown[] = [];
      for (let propertyIndex = properties.length - 1; propertyIndex >= 0; propertyIndex--) {
        if ((pageIndices[propertyIndex] as number) >= 0) {
          pageNames = pageNames.concat(properties.splice(propertyIndex, 1));
          pageValues = pageValues.concat(values.splice(propertyIndex, 1));
        }
      }
      const page = this.getActivePage();
      if (page) page.setProperties(pageNames, pageValues);
    }
    const links = properties.indexOf("_links");
    if (links >= 0 && this.$rb) {
      values.splice(links, 1);
      properties.splice(links, 1);
    }
    let master: Page | null;
    if (properties.indexOf("mpg") >= 0) {
      master = this.getProperty("mpg") as Page | null;
      if (master) master._detachFromParent(this);
    }
    if (properties.indexOf("ompg") >= 0) {
      master = this.getProperty("ompg") as Page | null;
      if (master) master._detachFromParent(this);
    }
    if (properties.indexOf("empg") >= 0) {
      master = this.getProperty("empg") as Page | null;
      if (master) master._detachFromParent(this);
    }
  }

  /** Re-checks the links and, once sane, runs the queued visits. */
  _checkSanityIfNecessary(): void {
    if (this._isRestoring || this.$rb) return;
    this._refreshLinks();
    if (this._callingPendingActions) return;
    const wasSane = this._linksAreSane;
    this._linksAreSane = this._checkLinksSanity();
    if (this._linksAreSane) {
      this._callingPendingActions = true;
      this._pendingActions.forEach((action) => {
        action.call(this);
      });
      this._pendingActions = [];
      this._callingPendingActions = false;
      if (!wasSane) console.log("Links became sane.");
    } else console.warn("links are not sane!");
  }

  /**
   * The area of the pages from index `from` on (or of the given pages),
   * with their labels. Numbers in an array have no `$vis`, so an array of
   * indices gives null.
   */
  _getInvalidationArea(from: number | unknown[], firstOnly?: boolean): Rect | null {
    let started = false;
    let area: Rect | null = null;
    const pages: Page[] = [];
    if (from instanceof Array) {
      from.forEach((page) => {
        if ((page as Page).$vis) pages.push(page as Page);
      });
    } else {
      this.iteratePages((page) => {
        if (from === this.getIndexOfChild(page)) started = true;
        if (started) pages.push(page);
      }, false);
    }
    pages.forEach((page) => {
      let box = page.getPaintBBox() as Rect;
      const at = page.getPosition(!firstOnly);
      box = box.translated(at.getX(), at.getY());
      const label = this.getLabelBBox(page.getScaleLabelFactor()).getHeight();
      area = area ? area.united(box.expanded(0, label, 0, 0)) : box.expanded(0, label, 0, 0);
    });
    return area;
  }

  /** The height of an axonometric grid cell, or null for angles outside the valid range. */
  _getAxonoGYVal(width: number, angle1: number, angle2: number): number | null {
    let height: number | null = null;
    if (
      angle1 != angle2 &&
      angle1 >= 0 &&
      angle1 < Math.PI / 2 &&
      angle2 <= 0 &&
      angle2 > -Math.PI / 2
    ) {
      height = width * (Math.tan(angle1) + Math.tan(-angle2));
    }
    return height;
  }

  /**
   * The swatches container, created when missing; swatches older files
   * kept in the custom `swatches` property move into it.
   */
  getSwatches(): Swatches {
    if (this._swatches) return this._swatches;
    for (let node = this.getFirstChild(); null !== node; node = node.getNext()) {
      if (node instanceof Swatches) {
        this._swatches = node;
        break;
      }
    }
    if (!this._swatches) {
      this._swatches = new Swatches();
      this.appendChild(this._swatches);
    }
    const stored = this.getProperty("swatches", true) as string | null;
    if (stored) {
      const list = JSON.parse(stored) as string[];
      for (let r = 0; r < list.length; ++r) {
        const swatch = new Swatch(Pattern.deserialize(list[r]));
        this._swatches.appendChild(swatch);
      }
      this.setProperty("swatches", null, true);
    }
    return this._swatches;
  }

  getTransformSettings(): SceneTransformSettingsValues | null {
    return this._trfSettings;
  }

  setBorderScale(scale: boolean | null): void {
    (this._trfSettings as SceneTransformSettingsValues).borderScale = scale;
  }

  setCornersScale(scale: boolean | null): void {
    (this._trfSettings as SceneTransformSettingsValues).scaleCorners = scale;
  }

  /**
   * Keeps `destroyable` (canvas, effect, image) to destroy with the scene.
   * The old code also took renderer contexts (GRendererCtx, RendererCanvas)
   * and destroyed them through the renderer; those branches went with the
   * dropped recorder. It required the GDestroyable mixin (and threw on an
   * object without hasMixin); this accepts anything with a destroy method,
   * which every current caller has.
   */
  addDestroyable(destroyable: unknown): void {
    if (destroyable && isDestroyable(destroyable)) this._destroyables.push(destroyable);
  }

  addDestroyableIfAbsent(destroyable: unknown): void {
    if (-1 === this._destroyables.indexOf(destroyable)) this.addDestroyable(destroyable);
  }

  increaseReferenceCounter(): void {
    this._referenceCounter++;
  }

  /** The last user gone: destroys everything added with addDestroyable. */
  decreaseReferenceCounter(): void {
    if (0 === this._referenceCounter) return;
    this._referenceCounter = this._referenceCounter - 1;
    if (0 === this._referenceCounter) {
      for (let index = 0; index < this._destroyables.length; index++) {
        const destroyable = this._destroyables[index];
        if (isDestroyable(destroyable)) destroyable.destroy();
      }
      this._destroyables = [];
    }
  }

  getSymbolDictionary(): SymbolDictionary {
    return this._symbolDictionary as SymbolDictionary;
  }

  /** Destroys the given destroyables now and forgets them. */
  destroy(destroyables: unknown[] | null | undefined): void {
    if (!destroyables) return;
    for (let i = 0; i < destroyables.length; i++) {
      const destroyable = destroyables[i];
      const index = this._destroyables.indexOf(destroyable);
      if (index >= 0) this._destroyables[index] = null;
      if (isDestroyable(destroyable)) destroyable.destroy();
    }
    this._destroyables = this._destroyables.filter((entry) => !!entry);
  }
}

const scenePrototype = Scene.prototype;
scenePrototype._activePage = null;
scenePrototype._linksLookup = null;
scenePrototype._temporarilyDisabledLinks = null;
scenePrototype._linksAreSane = true;
scenePrototype._invalidateFrom = 0;
(scenePrototype as unknown as Record<string, unknown>)["_pendingActions"] = null;
scenePrototype._callingPendingActions = false;
scenePrototype._styles = null;
scenePrototype._swatches = null;
scenePrototype._duringRecordedTransaction = false;
scenePrototype._lastInvalidationFinishedEvent = null;
scenePrototype._pre310 = false;
scenePrototype._trfSettings = null;
scenePrototype._dictionary = null;
scenePrototype._symbolDictionary = null;
(scenePrototype as unknown as Record<string, unknown>)["_destroyables"] = null;
scenePrototype._savedScreenBBox = null;
scenePrototype._referenceCounter = 0;
scenePrototype._released = false;
scenePrototype._lastTimeAnnotationsFromCloudModified = 0;
