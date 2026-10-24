// Old: chunk.vendor.js module 331 (GPageEditor).
/**
 * The editor of a page. On a fixed-size scene (pages with a size) the
 * page label above the page is a part: dragging it moves the page
 * (around the other pages when collision-less transforms are on, or with
 * shift), which writes the page's `off` property. The resize handles
 * change `w`, `h` and `off`. Outside the multi-page view only the active
 * page's editor paints.
 */
import type { Color } from "../../engine/color/color.ts";
import { Platform } from "../../engine/core/platform.ts";
import { registerClass } from "../../engine/core/object.ts";
import { GMath } from "../../engine/math/math.ts";
import type { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { EditorOptions } from "../editor-options.ts";
import { BaseEditor, PartInfo, type EditorHost, type EditorPaintContext } from "./base-editor.ts";
import { BlockEditor, LabelHolder } from "./block-editor.ts";
import { BoxEditor, EdTransformOptions } from "./box-editor.ts";
import type { EditedElement } from "./element-editor.ts";

/** A page as its editor drives it. */
export type EditedPage = EditedElement & {
  getPosition(multiPage?: unknown): Point;
  doCollisionlessTransform(transform: Transform, includeSelf?: unknown): Transform;
  isScaleLabel(): boolean;
};

/** The scene as the page editor asks it. */
interface PageScene {
  isFixedSized(): unknown;
  hasLinks(node: Node): boolean;
  getLabelBBox(scale: number): Rect;
  getActivePage(): Node | null;
  iteratePages(visitor: (page: EditedPage) => unknown): void;
  getIndexOfChild(child: Node): number;
  startBlockReferenceChanges(): void;
  endBlockReferenceChanges(): void;
  beginUpdate(): void;
  endUpdate(): void;
  removeChild(child: Node): void;
  insertChild(child: Node, reference: Node | null): void;
  appendChild(child: Node): void;
}

/** PartInfo data of the label. */
interface LabelPartData {
  point: Point;
  origTrf: Transform;
}

export class PageEditor extends BlockEditor<EditedPage> {
  static {
    registerClass(this, "GPageEditor");
    BlockEditor.exports(this, Page);
  }

  static FIRST_PAGE = 57005;
  /** Dropping a dragged page swaps it with the nearest page (off in the app). */
  static SWITCH_ORDER = false;
  /** Whether a page that others link to (a master) can be moved by its label. */
  static MOVE_MASTER = true;

  /** Read from GEditorOptions.pageCollisionTransform when the module loads. */
  declare _collisionlessTransform: unknown;

  constructor(element: EditedPage) {
    super(element);
    this._flags = BoxEditor.Flag.ResizeAll;
  }

  setCollisionlessTransform(collisionless: unknown): void {
    this._collisionlessTransform = collisionless;
  }

  _getLabelBBox(transform: Transform | null): Rect | null {
    return LabelHolder._getLabelBBox.call(this as never, transform);
  }

  /** A label drag in the multi-page view moves the page (see the class comment). */
  override movePart(
    partId: unknown,
    partData: unknown,
    position: Point,
    viewToWorld: Transform,
    guides: unknown,
    shift?: unknown,
    option?: unknown,
    multiPage?: unknown,
  ): unknown {
    const result = super.movePart(
      partId,
      partData,
      position,
      viewToWorld,
      guides,
      shift,
      option,
      multiPage,
    );
    if (partId === LabelHolder.LABEL_PART_ID && multiPage) {
      const to = viewToWorld.mapPoint(position);
      const from = viewToWorld.mapPoint((partData as LabelPartData).point);
      let transform: Transform;
      if (this._collisionlessTransform) {
        transform = this.getElement().doCollisionlessTransform(
          new Transform(1, 0, 0, 1, to.getX() - from.getX(), to.getY() - from.getY()),
        );
      } else if (Platform.modifiers.shiftKey) {
        transform = this.getElement().doCollisionlessTransform(
          new Transform(1, 0, 0, 1, to.getX() - from.getX(), to.getY() - from.getY()),
          option,
        );
      } else
        transform = new Transform(1, 0, 0, 1, to.getX() - from.getX(), to.getY() - from.getY());
      const options = new EdTransformOptions();
      options.isMultiPage = true;
      options.fullContentsTransform = true;
      BlockEditor.prototype.edTransform.call(this, transform, null, null, options);
    }
    return result;
  }

  override _getPartInfoAt(
    location: Point,
    transform: Transform,
    tolerance: number,
  ): PartInfo | null {
    const hit = super._getPartInfoAt(location, transform, tolerance);
    const scene = this.getElement().getScene() as unknown as PageScene | null;
    if (!hit && scene && scene.isFixedSized()) {
      if (!EditorOptions.pageSelectable) return null;
      const label = this._getLabelBBox(transform);
      if (
        label &&
        label.expanded(tolerance, tolerance, tolerance, tolerance).containsPoint(location)
      ) {
        if (PageEditor.MOVE_MASTER || !scene.hasLinks(this.getElement())) {
          const data: LabelPartData = { point: location, origTrf: transform };
          const labelPart = new PartInfo(this, LabelHolder.LABEL_PART_ID, data, true, true);
          if (labelPart) return labelPart;
        }
      }
    }
    return hit;
  }

  override allowPartSelection(): boolean {
    return true;
  }

  /** On a fixed-size scene the box grows up by the label height (or is the label). */
  override getCustomBBox(transform: Transform | null, includeTransform?: unknown): Rect | null {
    let box = super.getCustomBBox(transform, includeTransform);
    const scene = this.getElement().getScene() as unknown as PageScene | null;
    if (scene && scene.isFixedSized()) {
      if (box) {
        const scale = (transform as Transform).getScaleFactor();
        const height =
          scene.getLabelBBox(this.getElement().isScaleLabel() ? scale : 1 / scale).getHeight() + 1;
        box = box.expanded(0, height, 0, 0);
      } else if (scene.isFixedSized()) box = this._getLabelBBox(transform);
    }
    return box;
  }

  override canApplyTransform(): unknown {
    return !EditorOptions.pageCollisionTransform || this._collisionlessTransform;
  }

  /** Only a scale relayouts the page contents. */
  override _prepareApplyTransform(target: unknown): void {
    const page = target as EditedPage;
    page._layoutTransform = null;
    if (this._transform && !this._transform.isIdentity()) {
      const matrix = this._transform.getMatrix();
      const scaleX = matrix[0] as number;
      const scaleY = matrix[3] as number;
      if (!(GMath.isEqualEps(scaleX, 1) && GMath.isEqualEps(scaleY, 1))) {
        page._layoutTransform = new Transform().scaled(scaleX, scaleY);
        page._relayout = true;
      }
    }
  }

  /** A page moves by its `off` property, not by its transform. */
  override applyTransform(target: unknown, ...rest: unknown[]): void {
    if (this._transform && (!target || this._element === target)) {
      const translation = this._transform.getTranslation();
      const offset = (this.getElement().getProperty("off") as Transform | null) || new Transform();
      this.getElement().setProperty(
        "off",
        offset.translated(translation.getX(), translation.getY()),
      );
    }
    super.applyTransform(target, ...rest);
  }

  /** Another page (moved along) gets this page's offset plus the move. */
  override _applyTransform(target: unknown): void {
    const page = target as EditedPage | null;
    if (page && this._element && this._element !== page) {
      const distance = this._element.getPosition(true).subtract(page.getPosition(true));
      const move = (this._transform as Transform)
        .getTranslation()
        .translated(distance.getX(), distance.getY());
      const offset = (this._element.getProperty("off") as Transform | null) || new Transform();
      page.setProperty("off", offset.translated(move.getX(), move.getY()));
    }
    this.resetTransform();
  }

  override _applyPartMove(
    partId: unknown,
    partData: unknown,
    option?: unknown,
    extra?: unknown,
  ): void {
    const scene = this.getElement().getScene() as unknown as PageScene;
    if (partId === LabelHolder.LABEL_PART_ID) {
      const editor = BaseEditor.getEditor<EditorHost>(scene) as EditorHost;
      const center = (this._transform as Transform)
        .mapRect(this.getElement().getGeometryBBox() as Rect)
        .getSide(Rect.Side.CENTER);
      let first: EditedPage | undefined;
      let nearest: EditedPage | null = null;
      let distance = Number.MAX_VALUE;
      if (PageEditor.SWITCH_ORDER) {
        scene.iteratePages((page) => {
          if (!first) first = page;
          const delta = (page.getGeometryBBox() as Rect).getSide(Rect.Side.CENTER).subtract(center);
          const squared = delta.dot(delta);
          if (squared < distance) {
            distance = squared;
            nearest = page;
          }
          return page;
        });
      }
      const target = nearest as EditedPage | null;
      if (target && target !== this.getElement()) {
        const index = scene.getIndexOfChild(this.getElement());
        const targetIndex = scene.getIndexOfChild(target);
        scene.startBlockReferenceChanges();
        scene.beginUpdate();
        scene.removeChild(this.getElement());
        if (index < targetIndex) {
          if (target.getNext()) scene.insertChild(this.getElement(), target.getNext());
          else scene.appendChild(this.getElement());
        } else scene.insertChild(this.getElement(), target);
        editor.updateSelection(false, [this.getElement()]);
        scene.endBlockReferenceChanges();
        scene.endUpdate();
      } else if (PageEditor.SWITCH_ORDER) this.resetTransform();
      else {
        const translation = (this._transform as Transform).getTranslation();
        const offset =
          (this.getElement().getProperty("off") as Transform | null) || new Transform();
        this.getElement().setProperty(
          "off",
          offset.translated(translation.getX(), translation.getY()),
        );
        BlockEditor.prototype.applyTransform.call(this, this.getElement(), extra, option);
      }
    } else if (
      partId === BoxEditor.RESIZE_HANDLE_PART_ID &&
      !PageEditor.SWITCH_ORDER &&
      this.canApplyTransform()
    ) {
      const before = this.getElement().getGeometryBBox() as Rect;
      const after = (this._transform as Transform).mapRect(
        this.getElement().getGeometryBBox() as Rect,
      );
      const scaleX = after.getWidth() / before.getWidth();
      const scaleY = after.getHeight() / before.getHeight();
      const dx = after.getX() - before.getX();
      const dy = after.getY() - before.getY();
      const offset = (
        (this.getElement().getProperty("off") as Transform | null) || new Transform()
      ).translated(dx, dy);
      const width = this.getElement().getProperty("w") as number;
      const height = this.getElement().getProperty("h") as number;
      if (scaleX * scaleY != 0) {
        this.getElement().setProperties(
          ["w", "h", "off"],
          [width * scaleX, height * scaleY, offset],
        );
      }
    }
    BlockEditor.prototype._applyPartMove.call(this, partId, partData, option, extra);
  }

  /**
   * Collision-less transforms (or options asking for one) move the page
   * around the others. Without options and without collision-less
   * transforms this throws, as the old code read `options` unchecked (see
   * "Page edTransform reads its options unchecked" in QUESTIONS.md).
   */
  override edTransform(
    transform: Transform,
    partId?: unknown,
    partData?: unknown,
    options?: unknown,
  ): void {
    if (this._collisionlessTransform || (options as EdTransformOptions).doCollisionlessTransform) {
      transform = this.getElement().doCollisionlessTransform(transform);
    }
    super.edTransform(transform, partId, partData, options);
  }

  override resetTransform(): void {
    for (let i = this._editors ? this._editors.length : 0; i > 0; --i) {
      ((this._editors as BaseEditor[])[i - 1] as BaseEditor).resetTransform();
    }
    super.resetTransform();
  }

  override paint(transform: Transform, context: EditorPaintContext): void {
    if (!(context.configuration as unknown as { multiPageView: unknown }).multiPageView) {
      const scene = this.getElement().getScene() as unknown as PageScene;
      if (scene.getActivePage() && scene.getActivePage() !== this.getElement()) return;
    }
    super.paint(transform, context);
  }

  override _paintResizeBoxOutline(
    transform: Transform,
    context: EditorPaintContext,
    noVertices: unknown,
    color: Color | null,
  ): void {
    super._paintResizeBoxOutline(
      transform,
      context,
      noVertices,
      color,
      EditorOptions.pageOutlineWidth,
    );
  }

  override toString(): string {
    return "[Object GPageEditor]";
  }

  override _showEditor(context?: EditorPaintContext): boolean {
    return !!EditorOptions.pageSelectable && super._showEditor(context);
  }
}

PageEditor.prototype._collisionlessTransform = EditorOptions.pageCollisionTransform;
