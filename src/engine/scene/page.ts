// Old: chunk.vendor.js module 83 (GPage).
/**
 * The page, node "page": a child of the scene that holds layers and
 * items. A page with a width and height (`w`, `h`) is fixed sized: it has
 * a background (`bck`, `bop`), margins (`ml`..`mb`) and bleed (`bl`) and
 * clips its content when painting for output. Without a size it is an
 * infinite canvas whose boxes are its content's.
 *
 * In the multi-page view pages sit in a grid (`pgx` pages per row on the
 * scene) moved by their own offset `off`; getPosition computes where. A
 * page can show master pages: the scene links the master (a reference)
 * to the page, and the page paints the master's background and content
 * under its own. The annotations of a page live in an "annlst" child.
 */
import { Color } from "../color/color.ts";
import { Event } from "../core/event.ts";
import { Locale } from "../core/locale/locale.ts";
import { registerClass } from "../core/object.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform as Matrix } from "../math/transform.ts";
import { ElementData } from "../paint/element-data.ts";
import { PaintCanvas } from "../paint/paint-canvas.ts";
import { PaintContext } from "../paint/paint-context.ts";
import { RenderScheduler } from "../paint/render-scheduler.ts";
import { ScenePaintConfiguration } from "../paint/scene-paint-configuration.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import type { Effects } from "../style/effects.ts";
import { Pattern } from "../style/pattern.ts";
import { TexturePattern } from "../style/texture-pattern.ts";
import { Block, LabelHolder } from "./block.ts";
import { Accelerated } from "./element-accelerated.ts";
import { ElementChange } from "./element-change.ts";
import { Layout } from "./element-layout.ts";
import { Transform as TransformMixin } from "./element-transform.ts";
import { Element } from "./element.ts";
import { Item } from "./item.ts";
import { Layer } from "./layer.ts";
import { NodeChange, NodeFlag } from "./node-change.ts";
import { Container, type ContainerNode } from "./node-container.ts";
import { Reference } from "./node-identity.ts";
import type { PropertiesChangeArgs } from "./node-properties.ts";
import { Node, registerNodeClass } from "./node.ts";
import { SceneOptions } from "./scene-options.ts";
import type { SceneHooks } from "./scene-node.ts";
import type { ReferenceEvent } from "./reference-event.ts";
// The selector engine adds querySingle to nodes; getActiveLayer needs it
// (the old code loaded module 507 on demand there).
import "./selector.ts";

const GeometryProperties = {
  w: 800,
  h: 600,
  x: 0,
  y: 0,
  bl: 0,
  ml: 0,
  mt: 0,
  mr: 0,
  mb: 0,
  gp: 10,
  off: null,
};

const VisualProperties = {
  bck: null,
  bop: 1,
};

/**
 * What a page needs from GScene (engine-scene-document, scene.ts), which
 * implements it. Pages don't import the scene: it imports them.
 */
export interface PageSceneHooks extends SceneHooks {
  /** Label size and padding of the page labels. */
  $lbs: number;
  $lbp: number;
  getProperty(name: string, custom?: boolean, defaultValue?: unknown): unknown;
  /**
   * Calls `visitor` for each page (only visible ones unless
   * `includeInvisible`), last first when `reverse`; false stops.
   */
  iteratePages(
    visitor: (page: Page) => unknown,
    includeInvisible?: boolean,
    reverse?: boolean,
  ): void;
  /** The extra area page shadows paint, or null. */
  getShadowExpandArea(): { left: number; top: number; right: number; bottom: number } | null;
  getScreenBox(): Rect | null;
  /** Calls `visitor` with every reference `node` is linked to (its master pages). */
  visitReferences(node: Node, visitor: (reference: Node) => void): void;
  /** Whether `node` is linked to `reference`. */
  isLinked(node: Node, reference: unknown): boolean;
  setActivePage(page: Page | null): void;
  _notifyChange(change: number, args?: unknown): boolean;
}

/** What the old selector engine adds to nodes (selector.ts). */
interface Queryable {
  querySingle(selector: string): Node | null;
}

/** The arguments of ChildGeometryUpdate: the child, whether it counts, its old paint box. */
type ChildGeometryUpdateArgs = [Element | null | undefined, unknown?, (Rect | null)?];

/** The annotations list ("annlst", engine-annotations-model), as pages use it. */
interface AnnotationsListLike extends Node {
  getFirstChild(): Node | null;
  getGeometryBBox(): Rect | null;
  getPaintBBox(): Rect | null;
  isPaintable(): boolean;
  paint(context: PaintContext): void;
}

/** The symbol ("symbol", engine-symbols-images), as getContentBBox uses it. */
interface SymbolLike extends Element {
  getEffects(): Effects | null;
  getFrame(): Rect | null;
}

/** The page decoration the app sets on the paint configuration for page shadows. */
interface PageDecoration {
  shadow?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBackground?: string;
}

/**
 * GAnnotationsList is registered by engine-annotations-model under the
 * node name "annlst"; until it is loaded nothing is an annotations list.
 */
function isAnnotationsList(node: unknown): node is AnnotationsListLike {
  const cls = Node._nameToNodeClassMap.get("annlst");
  return !!cls && node instanceof cls;
}

function newAnnotationsList(): AnnotationsListLike {
  const cls = Node._nameToNodeClassMap.get("annlst");
  if (!cls) throw new Error("GAnnotationsList is not registered (engine-annotations-model)");
  return new cls() as AnnotationsListLike;
}

/** GPage.InvalidationRequestEvent: the page asks for `area` to be repainted. */
export class PageInvalidationRequestEvent extends Event {
  static {
    registerClass(this, "GPage.InvalidationRequestEvent");
  }

  declare area: Rect | null;

  constructor(area?: Rect | null) {
    super();
    this.area = area || null;
  }

  override toString(): string {
    return "[Event GPage.InvalidationRequestEvent]";
  }
}
(PageInvalidationRequestEvent.prototype as unknown as Record<string, unknown>)["area"] = null;

/** GPage.AfterThumbnailUpdate: a new thumbnail of the page was painted. */
export class AfterThumbnailUpdate extends Event {
  static {
    registerClass(this, "GPage.AfterThumbnailUpdate");
  }

  declare page: Page | null;
  declare image: PaintCanvas | null;

  constructor(page: Page, image: PaintCanvas | null) {
    super();
    this.page = page;
    this.image = image;
  }

  override toString(): string {
    return "[Event GPage.AfterThumbnailUpdate]";
  }
}
(AfterThumbnailUpdate.prototype as unknown as Record<string, unknown>)["page"] = null;
(AfterThumbnailUpdate.prototype as unknown as Record<string, unknown>)["image"] = null;

const PageBase = LabelHolder(Reference(Accelerated(Layout(TransformMixin(Container(Block))))));

export class Page extends PageBase {
  static {
    registerNodeClass(this, "page", "GPage");
  }

  static GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static override VisualProperties: Readonly<Record<string, unknown>> = VisualProperties;
  static InvalidationRequestEvent = PageInvalidationRequestEvent;
  static AfterThumbnailUpdate = AfterThumbnailUpdate;

  declare $w: number;
  declare $h: number;
  declare $x: number;
  declare $y: number;
  declare $bl: number;
  declare $ml: number;
  declare $mt: number;
  declare $mr: number;
  declare $mb: number;
  declare $gp: number;
  declare $off: Matrix | null;
  declare $bck: Pattern | null;
  declare $bop: number;

  /** Never set in the old code: getPosition always computes the position. */
  declare _cachedPosition: Point | null;
  declare _isInvalidating: boolean;
  declare _cachedImage: PaintCanvas | null;
  declare _shouldRepaintThumbnail: boolean;
  declare _annotations: AnnotationsListLike | null;
  /** The screen box remembered by the infinite-canvas paint box. */
  declare _screen: Rect | undefined;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties, VisualProperties);
  }

  private get _pageScene(): PageSceneHooks | null {
    return this._scene as PageSceneHooks | null;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GPage", "name", this.getNodeName()) as string;
  }

  /** Pages are moved through `off`, never transformed. */
  override transform(): void {}

  /** The translation to the page's position in the multi-page view. */
  override getTransform(): Matrix {
    const position = this.getPosition(1);
    return new Matrix(1, 0, 0, 1, position.getX(), position.getY());
  }

  override getTrackTempPropNames(): string[] {
    return this.getPatternPropNames();
  }

  getPatternPropNames(): string[] {
    return ["bck"];
  }

  hasAnnotations(): boolean {
    return (
      !!this._getAnnotations() && !!(this._getAnnotations() as AnnotationsListLike).getFirstChild()
    );
  }

  /** The annotations list, created when there is none. */
  getAnnotations(): AnnotationsListLike {
    const annotations = this._getAnnotations();
    if (annotations) return annotations;
    this._annotations = newAnnotationsList();
    this.appendChild(this._annotations);
    return this._annotations;
  }

  _getAnnotations(): AnnotationsListLike | null {
    if (!this._annotations) this._annotations = this._findAnnotations();
    return this._annotations;
  }

  _findAnnotations(): AnnotationsListLike | null {
    let found: AnnotationsListLike | null = null;
    for (let child = this.getLastChild(); null !== child; child = child.getPrevious()) {
      if (isAnnotationsList(child)) {
        found = child;
        break;
      }
    }
    return found;
  }

  /** Replaces the annotations list with `annotations`. */
  setAnnotations(annotations: AnnotationsListLike | null): void {
    const current = this._getAnnotations();
    this._annotations = annotations;
    if (current) {
      this.insertChild(annotations as Node, current);
      this.removeChild(current);
    } else this.appendChild(this._annotations as Node);
  }

  /** `w && h`: the width or height itself, not a boolean (0 when unbounded). */
  isFixedSized(): number {
    return this.$w && this.$h;
  }

  /** Sizes the page to its content and moves the content to the origin. */
  trimToContent(): void {
    const box = this.getContentBBox();
    if (box && !box.isEmpty()) {
      this.setProperties(["w", "h"], [box.getWidth(), box.getHeight()]);
      const move = new Matrix().translated(-box.getX(), -box.getY());
      this.getChildren().forEach((child) => {
        if (child instanceof Element && child.hasMixin(TransformMixin)) {
          (child as Element & { transform(transform: Matrix): void }).transform(move);
        }
      });
    }
  }

  /** The paint boxes of the content (a symbol counts with its frame). */
  getContentBBox(): Rect | null {
    let bbox: Rect | null = null;
    for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
      if (child instanceof Element) {
        let box: Rect | null;
        if ("symbol" === Node.getName(child)) {
          const symbol = child as SymbolLike;
          box = symbol.getChildrenPaintBBox();
          const effects = symbol.getEffects();
          // The old code passes the box where the effects expect a scale; kept.
          box =
            (effects && box && effects.getEffectsBBox(box, null, box as unknown as number)) || box;
          const frame = symbol.getFrame();
          if (frame && !frame.isEmpty()) box = (box && box.united(frame)) || frame;
        } else box = child.getPaintBBox();
        if (box && !box.isEmpty()) bbox = bbox ? bbox.united(box) : box;
      }
    }
    return bbox;
  }

  /**
   * Where the page sits: its grid position in the multi-page view
   * (`multiPage`), plus its offset `off` unless `ignoreOffset`.
   * `noCache` and `unscaled` are passed on to the grid computation.
   */
  getPosition(
    multiPage?: unknown,
    noCache?: unknown,
    unscaled?: unknown,
    ignoreOffset?: unknown,
  ): Point {
    if (!noCache && this._cachedPosition) return this._cachedPosition;
    const position = this._getGridPosition(multiPage, unscaled, ignoreOffset);
    return !ignoreOffset && this._scene && multiPage && this.$off && !SceneOptions.pagesPerRow
      ? position.add(this.$off.getTranslation())
      : position;
  }

  _getGridPosition(multiPage: unknown, unscaled: unknown, ignoreOffset: unknown): Point {
    const scene = this._pageScene;
    if (!scene) return new Point(0, 0);
    if (!multiPage) return new Point(0, 0);
    const gap = scene.$lbs + scene.$lbp + 5;
    let rowGap = gap;
    let columnGap = gap;
    if (SceneOptions.pageGap) rowGap = columnGap = SceneOptions.pageGap;
    else if (!this.isScaleLabel() && this.isFixedSized()) {
      const box = this.getGeometryBBox();
      const eighth = 0.125 * ((box && box.getWidth()) || 0);
      rowGap = columnGap = Math.max(
        eighth,
        scene.getLabelBBox(unscaled ? 1 : this.getScaleLabelFactor()).getHeight(),
      );
    }
    const perRow = SceneOptions.pagesPerRow || (scene.getProperty("pgx") as number);
    let count = 1;
    let rowHeight = Number.MAX_VALUE;
    const origin = new Point(0, 0);
    let offset: Point | null = null;
    let otherOffset: Point | null = null;
    let x = 0;
    let y = 0;
    if (ignoreOffset || !this.$off || SceneOptions.pagesPerRow) {
      scene.iteratePages((page) => {
        if (page === this) return false;
        const pageOffset = page.$off;
        if (pageOffset && !SceneOptions.pagesPerRow) {
          otherOffset = pageOffset.getTranslation();
          if (SceneOptions.pagesCanOverlap) {
            const dx = otherOffset.getX() - x;
            if (dx < 0 || (dx > 0 && dx <= page.$w)) return;
          }
        } else otherOffset = origin;
        if (count++ % perRow == 0) {
          x = 0;
          y += Math.min(rowHeight, page.$h + Math.min(0, otherOffset.getY())) + rowGap;
          rowHeight = Number.MAX_VALUE;
        } else {
          x += page.$w + columnGap + Math.min(0, otherOffset.getX());
          rowHeight = Math.min(rowHeight, page.$h + Math.min(0, otherOffset.getY()) + rowGap);
        }
      });
    }
    const left = x;
    let positionX = left;
    let positionY = y;
    if (this.$off) {
      offset = this.$off.getTranslation();
      positionX += offset.getX();
      positionY += offset.getY();
    }
    let box = new Rect(positionX, positionY, this.$w, this.$h);
    const avoidOverlaps = (resolve: (page: Page, area: Rect) => Rect | undefined) => {
      scene.iteratePages((page) => {
        if (page === this) return false;
        const at = page.getPosition(multiPage, true, unscaled);
        const area = new Rect(at.getX(), at.getY(), page.$w, page.$h).expanded(
          columnGap,
          rowGap,
          columnGap,
          rowGap,
        );
        if (area.intersectsRect(box)) box = resolve(page, area) || box;
      });
    };
    if (this.isScaleLabel()) {
      avoidOverlaps((page, area) => {
        const overlap = box.intersected(area);
        if (overlap.getWidth() > overlap.getHeight()) {
          return new Rect(
            positionX,
            area.getY() + page.$h + rowGap + rowGap + scene.$lbp * this.getScaleLabelFactor(),
            this.$w,
            this.$h,
          );
        }
        return undefined;
      });
    }
    x = box.getX();
    y = box.getY();
    if (offset) {
      x -= (offset as Point).getX();
      y -= (offset as Point).getY();
    }
    return new Point(x, y);
  }

  /**
   * `arg` is the screen box or flag passed on to `_calculatePaintBBox`;
   * `noReferences` leaves out the master pages.
   */
  override getPaintBBox(
    multiPageView?: unknown,
    arg?: unknown,
    includeInvisible?: unknown,
    noReferences?: unknown,
  ): Rect | null {
    void multiPageView;
    if (!(includeInvisible || this.isVisible())) return null;
    if (arg || includeInvisible)
      return this._calculatePaintBBox(arg, includeInvisible, noReferences);
    if (null == this._paintBBox) {
      this._paintBBox = this._calculatePaintBBox(null, includeInvisible, noReferences);
    }
    return this._paintBBox;
  }

  override _calculateGeometryBBox(includeInvisible?: unknown): Rect | null {
    if (this.isFixedSized()) return new Rect(this.$x, this.$y, this.$w, this.$h);
    let box = super._calculateGeometryBBox(includeInvisible);
    if (box && this.hasAnnotations()) {
      const annotations = (this._getAnnotations() as AnnotationsListLike).getGeometryBBox();
      if (annotations) box = box.united(annotations);
    }
    return box;
  }

  /** The page with its bleed and, unless `noShadow`, the scene's shadow area. */
  _calculatePageBBox(noShadow?: unknown): Rect {
    let box = this.getGeometryBBox(noShadow) as Rect;
    if (this.$bl && this.$bl > 0) box = box.expanded(this.$bl, this.$bl, this.$bl, this.$bl);
    const scene = this._pageScene;
    if (scene && !noShadow) {
      const shadow = scene.getShadowExpandArea();
      if (shadow) box = box.expanded(shadow.left, shadow.top, shadow.right, shadow.bottom);
    }
    return box;
  }

  override _calculatePaintBBox(
    arg?: unknown,
    includeInvisible?: unknown,
    noReferences?: unknown,
  ): Rect | null {
    let box = super._calculatePaintBBox(null, includeInvisible);
    if (box && this.hasAnnotations()) {
      const annotations = (this._getAnnotations() as AnnotationsListLike).getPaintBBox();
      if (annotations) box = box.united(annotations);
    }
    const scene = this._pageScene;
    if (!noReferences && scene) {
      scene.visitReferences(this, (reference) => {
        if (reference instanceof Page) {
          const master = reference.getPaintBBox(null, arg, includeInvisible, true);
          // Only widens a box that exists; kept.
          if (master) box = box ? box.united(master, true) : box;
        }
      });
    }
    if (this.isFixedSized()) {
      const page = this._calculatePageBBox(includeInvisible);
      return box ? box.united(page, true) : page;
    }
    if (arg && arg instanceof Rect) this._screen = arg;
    else if (arg && !this._screen && scene) this._screen = scene.getScreenBox() as Rect;
    return arg && this._screen ? this._screen : box;
  }

  /** The elements whose paint box `area` intersects (`intersect`) or contains. */
  getElementsByBBox(area: Rect, intersect?: boolean): Element[] {
    const found: Element[] = [];
    this.acceptChildren((node) => {
      if (node instanceof Element) {
        const box = node.getPaintBBox();
        if (
          box &&
          !box.isEmpty() &&
          ((intersect && area.intersectsRect(box)) || (!intersect && area.containsRect(box)))
        ) {
          found.push(node);
        }
      }
    });
    return found;
  }

  getActiveLayer(): Layer | null {
    return (this as unknown as Queryable).querySingle("layer:active") as Layer | null;
  }

  setActiveLayer(layer: Layer | null): void {
    this.acceptChildren((node) => {
      if (node instanceof Layer && node !== layer) node.removeFlag(NodeFlag.Active);
    });
    if (layer) layer.setFlag(NodeFlag.Active);
  }

  /** Activates the layer an element is in, or the layer itself. */
  updateActiveLayerForElem(element: Node): void {
    if (element instanceof Item) {
      const layer = element.findParent((node) => node instanceof Layer) as Layer | null;
      if (layer && !layer.hasFlag(NodeFlag.Active)) this.setActiveLayer(layer);
      else if (!layer) this.setActiveLayer(null);
    } else if (element instanceof Layer) {
      if (element.hasFlag(NodeFlag.Active) || element.hasFlag(NodeFlag.Selected)) {
        if (element !== this.getActiveLayer()) this.setActiveLayer(null);
      } else this.setActiveLayer(element);
    }
  }

  /** The layer to activate when `layer` goes: a sibling before, after, or the parent layer. */
  getSuccessorActiveLayer(layer: Node | null | undefined): Layer | null {
    let successor: Layer | null = null;
    if (layer instanceof Layer) {
      for (let node = layer.getPrevious(); null !== node; node = node.getPrevious()) {
        if (node instanceof Layer) {
          successor = node;
          break;
        }
      }
      if (!successor) {
        for (let node = layer.getNext(); null !== node; node = node.getNext()) {
          if (node instanceof Layer) {
            successor = node;
            break;
          }
        }
      }
      if (!successor) successor = layer.findParent((node) => node instanceof Layer) as Layer | null;
    }
    return successor;
  }

  deleteActiveLayer(layer?: Layer | null): void {
    const target = layer || this.getActiveLayer();
    if (target) {
      const successor = this.getSuccessorActiveLayer(target);
      this.setActiveLayer(successor || null);
      (target.getParent() as ContainerNode).removeChild(target);
    }
  }

  /** The page with its bleed, or null for an infinite canvas. */
  getClipBBox(): Rect | null {
    if (this.isFixedSized()) {
      const box = this.getGeometryBBox();
      if (box && !box.isEmpty()) {
        const bleed = this.$bl || 0;
        return box.expanded(bleed, bleed, bleed, bleed);
      }
      return box;
    }
    return null;
  }

  /** The page inside its margins, or null for an infinite canvas. */
  getMarginBBox(): Rect | null {
    if (this.isFixedSized()) {
      const box = this.getGeometryBBox();
      return box && !box.isEmpty() ? box.expanded(-this.$ml, -this.$mt, -this.$mr, -this.$mb) : box;
    }
    return null;
  }

  override _detailHitTest(
    location: Point,
    transform?: Matrix | null,
    tolerance?: number,
    force?: unknown,
    options?: unknown,
    multiPage?: unknown,
  ): ElementData<Element, unknown> | null {
    void force;
    void options;
    let box = this.getGeometryBBox();
    if (!box || box.isEmpty()) return null;
    const position = this.getPosition(multiPage);
    if (!(0 === position.getX() && 0 === position.getY())) {
      box = box.translated(position.getX(), position.getY());
    }
    if (transform) box = transform.mapRect(box);
    const width = tolerance as number;
    return box.expanded(width, width, width, width).containsPoint(location)
      ? new ElementData<Element, unknown>(this, { label: false })
      : (this._hitTestLabel(
          location,
          width,
          transform,
          !this.isScaleLabel(),
          position,
        ) as ElementData<Element, unknown> | null);
  }

  override validateInsertion(parent: ContainerNode, reference?: Node | null): boolean {
    void reference;
    return "scene" === Node.getName(parent);
  }

  _invalidateArea(area?: Rect | null): void {
    if (this.hasEventListeners(PageInvalidationRequestEvent)) {
      this.trigger(new PageInvalidationRequestEvent(area));
    }
  }

  override _paintChildren(context: PaintContext): void {
    const configuration = context.configuration as ScenePaintConfiguration;
    const canvas = context.canvas as PaintCanvas;
    let clipped = false;
    if (configuration.clipArea && canvas.hasClip()) {
      const area = configuration.clipArea as Rect;
      canvas.clipRect(area.getX(), area.getY(), area.getWidth(), area.getHeight());
      clipped = true;
    }
    for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
      if (child instanceof Element) child.paint(context);
    }
    if (this.hasAnnotations()) (this._getAnnotations() as AnnotationsListLike).paint(context);
    if (Accelerated.PAINT_QTREES) {
      // Debug drawing of the trees, colored by depth.
      this.paintQTree(context);
      this.acceptChildren((node) => {
        if (node.hasMixin(Accelerated)) {
          let depth = 1;
          for (let parent: Node = node; parent.getParent() !== this;) {
            parent = parent.getParent() as Node;
            depth++;
          }
          const color =
            (16711935 >>> (31 & depth)) | ((16711935 << ((24 - depth) & 31)) & 16777215);
          (node as unknown as Page).paintQTree(
            context,
            undefined,
            undefined,
            "#" + Number(color).toString(16),
          );
        }
      });
    }
    if (clipped) canvas.resetClip();
  }

  override _getBitmapPaintArea(): Rect {
    const clip = this.getClipBBox();
    return clip || super._getBitmapPaintArea();
  }

  override _paintToBitmap(context: PaintContext): ReturnType<Element["_paintToBitmap"]> {
    (context.configuration as ScenePaintConfiguration).clipToPage = true;
    return super._paintToBitmap(context);
  }

  /** The pages this one shows as masters (its `refs`); null without refs. */
  getMasterPages(): Page[] | null {
    const masters: Page[] = [];
    const scene = this._pageScene;
    if (!scene) return masters;
    if (!this.$refs) return null;
    scene.iteratePages((page) => {
      if (page !== this && this.$refs.indexOf(page.getReferenceId()) >= 0) masters.push(page);
    }, true);
    return masters;
  }

  /** The pages that show this one as master. */
  getSlavePages(): Page[] {
    const slaves: Page[] = [];
    const scene = this._pageScene;
    if (!scene) return slaves;
    scene.iteratePages((page) => {
      if (page !== this && page.$refs && page.$refs.indexOf(this.getReferenceId()) >= 0) {
        slaves.push(page);
      }
    }, true);
    return slaves;
  }

  /**
   * Whether the scene-wide master (mpg, else empg, else ompg) this page is
   * linked to paints anything: a background that isn't a plain color, or
   * content.
   */
  isSingleMasterBackgroundContent(): boolean {
    const scene = this._pageScene;
    if (!scene) return false;
    let result = false;
    let master: Page | null = null;
    let candidate = scene.getProperty("mpg") as Page | null;
    if (scene.isLinked(this, candidate)) master = candidate;
    else {
      candidate = scene.getProperty("empg") as Page | null;
      if (scene.isLinked(this, candidate)) master = candidate;
      else {
        candidate = scene.getProperty("ompg") as Page | null;
        if (scene.isLinked(this, candidate)) master = candidate;
      }
    }
    if (master) {
      const background = master.getProperty("bck");
      const opacity = master.getProperty("bop") as number;
      // A plain color doesn't count; kept from the old code.
      if (background && opacity > 0 && !(background instanceof Color)) result = true;
      else result = !!master.getChildrenGeometryBBox();
    }
    return result;
  }

  override _referenceEvent(event: ReferenceEvent): void {
    if (event.target === this && (!event.reference || event.reference instanceof Page)) {
      this._requestInvalidation();
      super._referenceEvent(event);
    }
  }

  override isPaintable(context?: PaintContext | null, arg?: unknown): boolean {
    if (!context) return super.isPaintable(context, arg);
    if (!this.isVisible()) return false;
    const configuration = context.configuration as ScenePaintConfiguration;
    const box =
      !configuration.multiPageView && configuration.isClipToPage() && this.isFixedSized()
        ? this._calculatePageBBox()
        : this.getPaintBBox(configuration.multiPageView, arg);
    if (null == box || box.isEmpty()) return false;
    if ("m" === this.$_sbl) return true;
    if (context) {
      if (context.dirtyMatcher && !context.dirtyMatcher.isDirty(box)) return false;
      if (
        context.configuration &&
        configuration.clipArea &&
        !(configuration.clipArea as Rect).intersectsRect(box)
      ) {
        return false;
      }
    }
    return true;
  }

  /** The page (or its paint box) united with its masters' paint boxes. */
  _getMasterPageClipRectForPage(arg?: unknown, includeInvisible?: unknown): Rect | null {
    let box: Rect | null = this.isFixedSized()
      ? new Rect(this.$x, this.$y, this.$w, this.$h)
      : this.getPaintBBox(null, arg, includeInvisible);
    const scene = this._pageScene;
    if (scene) {
      scene.visitReferences(this, (reference) => {
        if (reference instanceof Page) {
          const master = reference.getPaintBBox(null, arg, includeInvisible, true);
          if (master) box = box ? box.united(master, true) : box;
        }
      });
    }
    return box;
  }

  override _paint(context: PaintContext, arg?: unknown): void {
    const canvas = context.canvas as PaintCanvas;
    const configuration = context.configuration as ScenePaintConfiguration;
    let hasContent = false;
    for (let child = this.getFirstChild(); null !== child; child = child.getNext()) {
      if (child instanceof Element) {
        hasContent = true;
        break;
      }
    }
    if (
      !hasContent &&
      this._getAnnotations() &&
      (this._getAnnotations() as AnnotationsListLike).isPaintable()
    ) {
      hasContent = true;
    }
    const transform = canvas.resetTransform() as Matrix;
    const includeInvisible = context.isIncludingInvisible();
    if (this.isFixedSized()) {
      let clipped = false;
      const pageBox = new Rect(this.$x, this.$y, this.$w, this.$h);
      const screenBox = transform.mapRect(pageBox).toAlignedRect();
      const x = screenBox.getX();
      const y = screenBox.getY();
      const width = screenBox.getWidth();
      const height = screenBox.getHeight();
      if (
        configuration.sceneBackground &&
        !configuration.isOutline(context) &&
        this.$bck &&
        this.$bop > 0
      ) {
        let textureTransform: Matrix | undefined;
        if (this.$bck instanceof TexturePattern) {
          const own = this.getTransform() || new Matrix();
          const source =
            this.getSourceBBox(includeInvisible) || this.getGeometryBBox(includeInvisible);
          textureTransform = this.$bck.createTextureTransform(source, own);
        }
        const paint = canvas.createPatternPaint(
          this.$bck,
          this.$bck instanceof TexturePattern ? null : screenBox,
          textureTransform,
        );
        if (paint) {
          if (paint.transform) {
            canvas.putVertices(
              [
                new Point(x, y),
                new Point(x + width, y),
                new Point(x + width, y + height),
                new Point(x, y + height),
              ],
              true,
            );
            const previous = canvas.setTransform(
              canvas.getTransform(true).preMultiplied(paint.transform),
            );
            canvas.fillVertices(paint.paint, this.$bop, null, false);
            canvas.setTransform(previous);
          } else {
            if (configuration.multiPageView && SceneOptions.pagesCanOverlap) {
              if (
                "undefined" != typeof navigator &&
                navigator &&
                0 == navigator.userAgent.indexOf("Mozilla") &&
                0 == navigator.platform.indexOf("Win") &&
                navigator.userAgent.indexOf("Edge") < 0 &&
                navigator.userAgent.indexOf("Chrome") < 0 &&
                navigator.userAgent.indexOf("Safari") < 0
              ) {
                // Firefox on Windows: a thin frame instead of the shadow. The
                // old call passes 1 as the paint (and no width); kept.
                canvas.strokeRect(x - 0.5, y - 0.5, width + 1, height + 1, null, 1 as never, 0.4);
              } else {
                // Only the editor's paint configuration has pageDecoration;
                // with any other this throws a TypeError, as in the old code
                // (QUESTIONS.md, "The page shadow needs the editor's paint
                // configuration").
                const decoration = (configuration as unknown as { pageDecoration: PageDecoration })
                  .pageDecoration;
                const offsetX = decoration.shadowOffsetX || 0;
                const offsetY = decoration.shadowOffsetY || 0;
                const context2d = canvas._canvasContext as unknown as CanvasRenderingContext2D;
                context2d.shadowColor = decoration.shadowBackground || "rgba(0,0,0,0.5)";
                context2d.shadowBlur = decoration.shadow as number;
                context2d.shadowOffsetX = offsetX;
                context2d.shadowOffsetY = offsetY;
              }
            }
            canvas.fillRect(x, y, width, height, paint.paint, this.$bop);
            if (configuration.multiPageView && SceneOptions.pagesCanOverlap) {
              (canvas._canvasContext as unknown as CanvasRenderingContext2D).shadowColor =
                "rgba(0,0,0,0)";
            }
          }
        }
      }
      const scene = this._pageScene;
      if (scene && !this.getProperty("cdr", true)) {
        const masterBox = this._getMasterPageClipRectForPage(arg, true);
        if (masterBox && !masterBox.isEmpty()) {
          const masterScreenBox = transform.mapRect(masterBox).toAlignedRect();
          scene.visitReferences(this, (reference) => {
            if (reference instanceof Page) {
              if (canvas.hasClip() && !clipped) {
                clipped = true;
                if (configuration.isClipToPage()) {
                  const bleed = this.$bl || 0;
                  canvas.clipRect(x - bleed, y - bleed, width + 2 * bleed, height + 2 * bleed);
                } else {
                  canvas.clipRect(
                    masterScreenBox.getX(),
                    masterScreenBox.getY(),
                    masterScreenBox.getWidth(),
                    masterScreenBox.getHeight(),
                  );
                }
              }
              if (reference.$bck) {
                canvas.fillRect(x, y, width, height, reference.$bck as Color, reference.$bop);
              }
              reference._paintChildren(context);
            }
          });
        }
      }
      if (
        hasContent &&
        !clipped &&
        configuration.isClipToPage() &&
        canvas.hasClip() &&
        !configuration.multiPageView
      ) {
        const bleed = this.$bl || 0;
        canvas.clipRect(x - bleed, y - bleed, width + 2 * bleed, height + 2 * bleed);
        clipped = true;
      } else if (clipped) {
        canvas.resetClip();
        clipped = false;
      }
      if (hasContent) this._paintChildren(context);
      if (clipped) canvas.resetClip();
    } else {
      const box = this.getPaintBBox(null, arg, includeInvisible);
      if (box && !box.isEmpty()) {
        const screenBox = transform.mapRect(box).toAlignedRect();
        const x = screenBox.getX();
        const y = screenBox.getY();
        const width = screenBox.getWidth();
        const height = screenBox.getHeight();
        if (
          configuration.sceneBackground &&
          !configuration.isOutline(context) &&
          this.$bck &&
          this.$bop > 0 &&
          this.$bck instanceof Color
        ) {
          const paint = canvas.createPatternPaint(this.$bck, screenBox, null);
          if (paint) {
            if (paint.transform) {
              canvas.putVertices(
                [
                  new Point(x, y),
                  new Point(x + width, y),
                  new Point(x + width, y + height),
                  new Point(x, y + height),
                ],
                true,
              );
              const previous = canvas.setTransform(
                canvas.getTransform(true).preMultiplied(paint.transform),
              );
              canvas.fillVertices(paint.paint, this.$bop, null, false);
              canvas.setTransform(previous);
            } else canvas.fillRect(x, y, width, height, paint.paint, this.$bop);
          }
        }
      }
      if (hasContent) this._paintChildren(context);
    }
    canvas.setTransform(transform);
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      this.storeProperties(blob, GeometryProperties, (name, value) =>
        "off" === name && value ? Matrix.serialize(value as Matrix) : value,
      );
      this.storeProperties(blob, VisualProperties, (name, value) =>
        "bck" === name && value ? Pattern.serialize(value as Pattern) : value,
      );
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, GeometryProperties, (name, value) =>
        "off" === name && value ? Matrix.deserialize(value as never) : value,
      );
      this.restoreProperties(blob, VisualProperties, (name, value) =>
        "bck" === name && value ? Pattern.deserialize(value as string) : value,
      );
    } else if (change === NodeChange.BeforePropertiesChange) {
      const propertiesChange = args as PropertiesChangeArgs;
      let unbounded = false;
      const widthIndex = propertiesChange.properties.indexOf("w");
      const heightIndex = propertiesChange.properties.indexOf("h");
      // values[-1] is undefined, which is not == 0.
      if (widthIndex >= 0) {
        if ((propertiesChange.values[widthIndex] as number) > 0) {
          if (0 == (propertiesChange.values[heightIndex] as number)) unbounded = true;
        } else unbounded = true;
      } else if (0 == (propertiesChange.values[heightIndex] as number)) unbounded = true;
      if (this._scene) {
        if (propertiesChange.properties.indexOf("off") >= 0) this._requestInvalidation();
      }
      if (unbounded && this._pageScene) {
        // Only a single page can be made infinite, and only with w and h at once.
        let pages = 0;
        this._pageScene.iteratePages(() => {
          if (pages++) return false;
          return undefined;
        });
        if (pages > 1 && !(widthIndex >= 0 && heightIndex >= 0)) {
          if (widthIndex >= 0) {
            propertiesChange.properties.splice(widthIndex, 1);
            propertiesChange.values.splice(widthIndex, 1);
          }
          if (heightIndex >= 0) {
            propertiesChange.properties.splice(heightIndex, 1);
            propertiesChange.values.splice(heightIndex, 1);
          }
        }
      }
    } else if (change === NodeChange.AfterPropertiesChange) {
      if (this._scene) {
        const propertiesChange = args as PropertiesChangeArgs;
        if (propertiesChange.properties.indexOf("name") >= 0) this._requestInvalidation();
        const widthIndex = propertiesChange.properties.indexOf("w");
        const heightIndex = propertiesChange.properties.indexOf("h");
        if (!SceneOptions.pagesCanOverlap && (widthIndex >= 0 || heightIndex >= 0)) {
          const move = this.doCollisionlessTransform(new Matrix(), null, true).getTranslation();
          const offset = (this.getProperty("off") as Matrix | null) || new Matrix();
          this.setProperty("off", offset.translated(move.getX(), move.getY()));
        }
      }
    } else if (change === NodeChange.AfterFlagChange) {
      const scene = this.getScene() as PageSceneHooks | null;
      const flagArgs = args as { flag: number; set: boolean };
      if (scene && flagArgs.set && flagArgs.flag === NodeFlag.Active) scene.setActivePage(this);
    } else if (change == NodeChange.AfterChildInsert) {
      if (isAnnotationsList(args)) {
        this._notifyChange(ElementChange.ChildGeometryUpdate, [args, 1]);
        args._handleChange(ElementChange.InvalidationRequest);
      }
    } else if (change == NodeChange.BeforeChildRemove) {
      if (isAnnotationsList(args)) this._requestInvalidateNode(args as unknown as Element);
    } else if (change == NodeChange.AfterChildRemove) {
      if (isAnnotationsList(args)) this._notifyChange(ElementChange.ChildGeometryUpdate, [args, 1]);
    }
    this._handleGeometryChangeForProperties(change, args, GeometryProperties);
    this._handleVisualChangeForProperties(change, args, VisualProperties);
    super._handleChange(change, args);
    if (change !== ElementChange.InvalidationRequested || this._isInvalidating) {
      if (change === ElementChange.FinishGeometryUpdate) {
        if (this.isPaintable()) this._shouldRepaintThumbnail = true;
      } else if (change === ElementChange.ChildGeometryUpdate) {
        const childArgs = args as ChildGeometryUpdateArgs;
        const child = childArgs[0];
        if (
          (child instanceof Element || isAnnotationsList(child)) &&
          (child as Node).getParent() === this &&
          childArgs[1] &&
          this._scene
        ) {
          const box = childArgs[2] || (child as Element).getPaintBBox();
          (this._scene as PageSceneHooks)._notifyChange(ElementChange.ChildGeometryUpdate, [
            this,
            1,
            box,
          ]);
        }
      }
    } else {
      // The pages showing this one as master are repainted too.
      this._isInvalidating = true;
      const scene = this._pageScene;
      if (scene) {
        if (this.isPaintable()) this._shouldRepaintThumbnail = true;
        scene.visitLinks(this, (linked) => {
          if (linked instanceof Page) linked._requestInvalidation();
        });
      }
      this._isInvalidating = false;
    }
  }

  /**
   * `transform` moved on until the page (its geometry box, or the
   * uncached one with `uncached`) no longer overlaps another page plus
   * the label gap; `includeSelf` tests against this page too.
   */
  doCollisionlessTransform(transform: Matrix, includeSelf?: unknown, uncached?: unknown): Matrix {
    const scene = this.getScene() as PageSceneHooks | null;
    if (!scene) return transform;
    let direction: Point | undefined;
    let moved: boolean;
    let gapY: number;
    let gapX: number;
    let pageCount = 0;
    const box = uncached ? this._calculateGeometryBBox() : this.getGeometryBBox();
    if (!box) return transform;
    if (this.isScaleLabel()) {
      gapY = gapX = (7 + scene.$lbs + scene.$lbp) * PaintCanvas.getScreenDPI();
    } else {
      const eighth = 0.125 * box.getWidth();
      gapY = gapX = Math.max(
        eighth,
        (scene.getLabelBBox as (scale?: number) => Rect)().getHeight(),
      );
    }
    let rounds = 0;
    scene.iteratePages(() => {
      pageCount++;
    });
    const position = this.getPosition(true);
    const toPosition = new Matrix(1, 0, 0, 1, position.getX(), position.getY());
    let mapped = transform.multiplied(toPosition).mapRect(box);
    let left = mapped.getX();
    let right = mapped.getX() + mapped.getWidth();
    let top = mapped.getY();
    let bottom = mapped.getY() + mapped.getHeight();
    let center = mapped.getSide(Rect.Side.CENTER);
    do {
      moved = false;
      scene.iteratePages((page) => {
        if (includeSelf || page !== this) {
          let other = page.getGeometryBBox();
          if (other) {
            const at = page.getPosition(true);
            other = other.translated(at.getX(), at.getY()).expanded(gapX, gapY, gapY, gapY);
            const otherLeft = other.getX();
            const otherRight = other.getX() + other.getWidth();
            const otherTop = other.getY();
            const otherBottom = other.getY() + other.getHeight();
            if (other.intersectsRect(mapped)) {
              if (!direction) {
                const otherCenter = other.getSide(Rect.Side.CENTER);
                direction = center.subtract(otherCenter);
              }
              let dx = direction.getX() > 0 ? otherRight - left : otherLeft - right;
              let dy = direction.getY() > 0 ? otherBottom - top : otherTop - bottom;
              if (Math.abs(dx) < Math.abs(dy)) dy = 0;
              else dx = 0;
              transform = transform.multiplied(new Matrix(1, 0, 0, 1, dx, dy));
              mapped = transform.multiplied(toPosition).mapRect(box);
              left = mapped.getX();
              right = mapped.getX() + mapped.getWidth();
              top = mapped.getY();
              bottom = mapped.getY() + mapped.getHeight();
              center = mapped.getSide(Rect.Side.CENTER);
              moved = true;
              return false;
            }
          }
        }
        return undefined;
      });
      rounds++;
    } while (moved && rounds < pageCount);
    return transform;
  }

  /**
   * The cached thumbnail. When it is stale, a bitmap is painted first, but
   * that paint doesn't store a thumbnail (pageThumbnails is off), so the
   * old image comes back; kept.
   */
  getPageImage(): PaintCanvas | null {
    if (!this._cachedImage || this._shouldRepaintThumbnail) {
      this.toBitmap(null, null, null, null, {
        paintMode: ScenePaintConfiguration.PaintMode.Fast,
        defaultEffectDetailLevel: 0.5 / PaintCanvas.getScreenDPI(),
      });
      return this._cachedImage;
    }
    return this._cachedImage;
  }

  override assignFrom(other: Node): void {
    if (other instanceof Page)
      this.transferProperties(other, [GeometryProperties, VisualProperties]);
    this._cachedImage = (other as Page)._cachedImage;
    super.assignFrom(other);
  }

  /** Repaints the thumbnail after an invalidation when the configuration wants thumbnails. */
  _invalidationFinishedHandler(event: { configuration: ScenePaintConfiguration }): void {
    if (this._shouldRepaintThumbnail && event.configuration.pageThumbnails) {
      this._shouldRepaintThumbnail = false;
      this._getPageThumbnail(
        event.configuration.pageThumbnailSize,
        event.configuration.pageThumbnailSize,
        (image) => {
          if (image) {
            this._cachedImage = image;
            setTimeout(() => {
              this.trigger(new AfterThumbnailUpdate(this, this._cachedImage));
            });
          }
        },
      );
    }
  }

  override paint(context: PaintContext, arg?: unknown): void {
    if (this._preparePaint(context, arg)) {
      this._paint(context, arg);
      this._finishPaint(context);
      const configuration = context.configuration as ScenePaintConfiguration;
      if (this._shouldRepaintThumbnail && configuration.pageThumbnails) {
        this._shouldRepaintThumbnail = false;
        this._getPageThumbnail(
          configuration.pageThumbnailSize,
          configuration.pageThumbnailSize,
          (image) => {
            if (image) {
              this._cachedImage = image;
              setTimeout(() => {
                this.trigger(new AfterThumbnailUpdate(this, this._cachedImage));
              });
            }
          },
        );
      }
    }
  }

  /** Paints the page into a canvas of at most width x height; calls back with it. */
  _getPageThumbnail(
    maxWidth: number,
    maxHeight: number,
    callback: (image: PaintCanvas | null) => void,
  ): null | undefined {
    const box = this.getGeometryBBox();
    if (!box || box.isEmpty()) return null;
    const boxWidth = box.getWidth();
    const ratio = box.getHeight() / boxWidth;
    let width = maxWidth;
    let height = width * ratio;
    if (height > maxHeight) width = (height = maxHeight) / ratio;
    const scaleX = width / box.getWidth();
    const scaleY = height / box.getHeight();
    const scale = 1 * Math.min(scaleX, scaleY);
    const canvasWidth = Math.round(1 * width);
    const canvasHeight = Math.round(1 * height);
    const canvas = new PaintCanvas();
    canvas.resize(canvasWidth, canvasHeight);
    const context = new PaintContext();
    context.canvas = canvas;
    const configuration = new ScenePaintConfiguration();
    configuration.paintMode = ScenePaintConfiguration.PaintMode.Full;
    configuration.paintSharp = false;
    configuration.annotations = false;
    context.configuration = configuration;
    configuration.clipArea = box.scaled(1, 1);
    configuration.clipDirty = false;
    configuration.enableFxCache = false;
    configuration.defaultEffectDetailLevel = 1;
    canvas.prepare();
    canvas.setOrigin(new Point(box.getX() * scale, box.getY() * scale));
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
        callback as never,
        false,
      );
    } else {
      try {
        this.paint(context);
      } finally {
        canvas.finish();
      }
      callback(canvas);
    }
    return undefined;
  }
}

const pagePrototype = Page.prototype;
pagePrototype._cachedPosition = null;
pagePrototype._isInvalidating = false;
pagePrototype._cachedImage = null;
pagePrototype._shouldRepaintThumbnail = true;
pagePrototype._annotations = null;
