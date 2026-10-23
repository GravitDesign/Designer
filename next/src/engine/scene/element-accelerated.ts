// Old: chunk.vendor.js module 912 (GElement.Accelerated).
/**
 * Containers with many children (layers, pages) keep two quadtrees over
 * their element children, by paint box and by geometry box, so hit tests
 * and collisions only look at the children near the point or area.
 * `_elementIndex` keeps the children's stacking order for sorting hits.
 */
import { defineMixin, type AnyConstructor } from "../core/object.ts";
import { QuadTree, type QuadTreeElement } from "../geometry/quadtree.ts";
import type { Point } from "../math/point.ts";
import type { Rect } from "../math/rect.ts";
import type { PaintContext } from "../paint/paint-context.ts";
import type { PaintCanvas } from "../paint/paint-canvas.ts";
import { ElementChange, isElement } from "./element-change.ts";
import type { Element } from "./element.ts";
import { NodeChange } from "./node-change.ts";
import type { ContainerNode } from "./node-container.ts";
import type { Node } from "./node.ts";

export interface AcceleratedApi {
  _childrenPaintQTree: QuadTree | null;
  _childrenGeometryQTree: QuadTree | null;
  /** Set on a removed child: its index needs refreshing when it is inserted again. */
  _dirtyIndex: boolean;
  _updateQTree(): void;
  _createQTreeIfNotExists(): void;
  _removeAccelElement(element: Element, keepPaint?: boolean, keepGeometry?: boolean): void;
  /** An offset for a child's boxes in the trees (null: none). */
  _getAccelElementOffset(element: Element): Point | null;
  _insertAccelElement(element: Element, skipPaint?: boolean, skipGeometry?: boolean): void;
  _handleChildrenStructureChange(change: number, args: unknown): void;
  _refreshIndicesForward(element: Node, startIndex: unknown): void;
  _getIndexOfPrevious(element: Node | null | undefined): number;
  retrieveChildrenInPaintBBox(area: Rect, mode?: number): Element[] | null;
  retrieveChildrenInGeometryBBox(area: Rect, mode?: number): Element[] | null;
  /** Debug drawing of the tree's boxes. */
  paintQTree(context: PaintContext, tree?: QuadTree | null, opacity?: number, color?: string): void;
}

function newTree(): QuadTree {
  return new QuadTree({ x: -5e3, y: -5e3, width: 1e4, height: 1e4 }, 10, 50);
}

const acceleratedBody = <TBase extends AnyConstructor<Element>>(Base: TBase) => {
  abstract class AcceleratedMixin extends Base implements AcceleratedApi {
    declare _childrenPaintQTree: QuadTree | null;
    declare _childrenGeometryQTree: QuadTree | null;
    declare _dirtyIndex: boolean;

    _updateQTree(): void {
      this._createQTreeIfNotExists();
      let index = 0;
      const self = this as unknown as ContainerNode;
      for (let child = self.getFirstChild(); null !== child; child = child.getNext()) {
        if (isElement(child)) {
          child._elementIndex = index++;
          if (child._containingPaintQTreeElement || child._containingGeometryQTreeElement) {
            this._removeAccelElement(child);
            this._insertAccelElement(child);
          } else this._insertAccelElement(child);
        }
      }
    }

    _createQTreeIfNotExists(): void {
      if (!this._childrenPaintQTree) this._childrenPaintQTree = newTree();
      if (!this._childrenGeometryQTree) this._childrenGeometryQTree = newTree();
    }

    _removeAccelElement(element: Element, keepPaint?: boolean, keepGeometry?: boolean): void {
      if (!keepGeometry && element._containingGeometryQTreeElement) {
        (this._childrenGeometryQTree as QuadTree).remove(element._containingGeometryQTreeElement);
        element._containingGeometryQTreeElement = null;
      }
      if (!keepPaint && element._containingPaintQTreeElement) {
        (this._childrenPaintQTree as QuadTree).remove(element._containingPaintQTreeElement);
        element._containingPaintQTreeElement = null;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden with the argument
    _getAccelElementOffset(element: Element): Point | null {
      return null;
    }

    _insertAccelElement(element: Element, skipPaint?: boolean, skipGeometry?: boolean): void {
      let offset: Point | null | undefined;
      let offsetKnown: boolean | undefined;
      if (!skipPaint) {
        let box = element.getPaintBBox();
        if (box && (box.getWidth() > 0 || box.getHeight() > 0)) {
          const custom = element.getCustomCollisionBBox();
          if (custom) box = (box && box.united(custom)) || custom;
          offsetKnown = true;
          offset = this._getAccelElementOffset(element);
          if (offset) box = box.translated(offset.getX(), offset.getY());
          const entry = new QuadTree.Element(
            box.getX(),
            box.getY(),
            box.getWidth(),
            box.getHeight(),
          );
          entry.data = element;
          (this._childrenPaintQTree as QuadTree).insert(entry);
          element._containingPaintQTreeElement = entry;
        }
      }
      if (!skipGeometry) {
        let box = element.getGeometryBBox();
        if (box && (box.getWidth() > 0 || box.getHeight() > 0)) {
          if (!offsetKnown) offset = this._getAccelElementOffset(element);
          if (offset) box = box.translated(offset.getX(), offset.getY());
          const entry = new QuadTree.Element(
            box.getX(),
            box.getY(),
            box.getWidth(),
            box.getHeight(),
          );
          entry.data = element;
          (this._childrenGeometryQTree as QuadTree).insert(entry);
          element._containingGeometryQTreeElement = entry;
        }
      }
    }

    _handleChildrenStructureChange(change: number, args: unknown): void {
      if (change === NodeChange.Restore) {
        this._createQTreeIfNotExists();
        let index = 0;
        const self = this as unknown as ContainerNode;
        for (let child = self.getFirstChild(); null !== child; child = child.getNext()) {
          if (isElement(child)) {
            child._elementIndex = index++;
            if (!(child._containingGeometryQTreeElement && child._containingPaintQTreeElement)) {
              this._insertAccelElement(child);
            }
          }
        }
      } else if (change === NodeChange.BeforeChildRemove) {
        if (isElement(args)) this._refreshIndicesForward(args, args._elementIndex - 1);
      } else if (change === NodeChange.AfterChildRemove) {
        if (isElement(args)) {
          this._removeAccelElement(args);
          (args as Element & AcceleratedApi)._dirtyIndex = true;
        }
      } else if (change === NodeChange.AfterChildInsert) {
        if (isElement(args) && (args as Element & AcceleratedApi)._dirtyIndex) {
          const previous = this._getIndexOfPrevious(args);
          this._refreshIndicesForward(args, previous + 1);
          (args as Element & AcceleratedApi)._dirtyIndex = false;
        }
      } else if (change === ElementChange.ChildGeometryUpdate) {
        const child = (args as unknown[])[0];
        if (isElement(child) && child.getParent() === (this as unknown)) {
          this._createQTreeIfNotExists();
          if (child._containingPaintQTreeElement || child._containingGeometryQTreeElement) {
            this._removeAccelElement(child);
            this._insertAccelElement(child);
          } else {
            this._insertAccelElement(child);
            const previous = this._getIndexOfPrevious(child);
            this._refreshIndicesForward(child, previous + 1);
          }
        }
      } else if (change === ElementChange.ChildVisualUpdate) {
        const child = (args as unknown[])[0];
        if (isElement(child) && child.getParent() === (this as unknown)) {
          this._createQTreeIfNotExists();
          if (child._containingPaintQTreeElement) {
            this._removeAccelElement(child, false, true);
            this._insertAccelElement(child, false, true);
          } else {
            this._insertAccelElement(child, false, true);
            const previous = this._getIndexOfPrevious(child);
            // Not + 1 here, unlike the geometry case (old behaviour).
            this._refreshIndicesForward(child, previous);
          }
        }
      }
    }

    /** Numbers `element` and the siblings after it from `startIndex` (0 if not a number). */
    _refreshIndicesForward(element: Node, startIndex: unknown): void {
      if (!isElement(element)) return;
      let index = "number" != typeof startIndex || isNaN(startIndex) ? 0 : startIndex;
      for (let node: Node | null = element; null !== node; node = node.getNext()) {
        (node as Element)._elementIndex = index++;
      }
    }

    _getIndexOfPrevious(element: Node | null | undefined): number {
      if (!element) return -1;
      for (let node = element.getPrevious(); null !== node; node = node.getPrevious()) {
        if (isElement(node)) return node._elementIndex;
      }
      return -1;
    }

    retrieveChildrenInPaintBBox(area: Rect, mode?: number): Element[] | null {
      return this._childrenPaintQTree
        ? this._childrenPaintQTree
            .retrieve(
              { x: area.getX(), y: area.getY(), width: area.getWidth(), height: area.getHeight() },
              mode,
            )
            .map((entry) => entry.data as Element)
        : null;
    }

    retrieveChildrenInGeometryBBox(area: Rect, mode?: number): Element[] | null {
      return this._childrenGeometryQTree
        ? this._childrenGeometryQTree
            .retrieve(
              { x: area.getX(), y: area.getY(), width: area.getWidth(), height: area.getHeight() },
              mode,
            )
            .map((entry) => entry.data as Element)
        : null;
    }

    paintQTree(
      context: PaintContext,
      tree?: QuadTree | null,
      opacity?: number,
      color?: string,
    ): void {
      const node = tree || this._childrenPaintQTree || this._childrenGeometryQTree;
      if (!node) return;
      const canvas = context.canvas as PaintCanvas;
      const strokeColor = color || "#f0f";
      const strokeOpacity = opacity || 0.9;
      for (let i = 0; i < node.objects.length; i++) {
        const box = node.objects[i] as QuadTreeElement;
        canvas.strokeRect(box.x, box.y, box.width, box.height, 1, strokeColor, strokeOpacity);
      }
      // The color isn't passed down and the opacity is the argument's, not
      // the default's (NaN without one); kept.
      if (node.nodes) {
        for (let i = 0; i < node.nodes.length; i++) {
          this.paintQTree(context, node.nodes[i], 0.6 * (opacity as number));
        }
      }
    }
  }
  AcceleratedMixin.prototype._childrenPaintQTree = null;
  AcceleratedMixin.prototype._childrenGeometryQTree = null;
  AcceleratedMixin.prototype._dirtyIndex = false;
  return AcceleratedMixin;
};

const AcceleratedMixin = defineMixin("GElement.Accelerated", acceleratedBody);

export const Accelerated = Object.assign(AcceleratedMixin, {
  /** Debug switch of the old code: paint the trees. */
  PAINT_QTREES: false,
});
