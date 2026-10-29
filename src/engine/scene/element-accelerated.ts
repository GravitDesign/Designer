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
import { hasContainer, type ContainerNode } from "./node-container.ts";
import type { Node } from "./node.ts";

export interface AcceleratedApi {
  _childrenPaintQTree: QuadTree | null;
  _childrenGeometryQTree: QuadTree | null;
  /** Set on a removed child: its index needs refreshing when it is inserted again. */
  _dirtyIndex: boolean;
  /**
   * Children whose entries wait for the next read of the trees, in the
   * order of their last update; true for a geometry update (both trees),
   * false for a visual one (the paint tree). See `_deferAccelUpdate`.
   */
  _pendingAccelUpdates: Map<Element, boolean> | null;
  /** Moves the waiting children's entries to their current boxes. */
  _applyPendingAccelUpdates(): void;
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
  return new QuadTree({ x: -5e3, y: -5e3, width: 1e4, height: 1e4 }, 10, 50, 0, true);
}

const acceleratedBody = <TBase extends AnyConstructor<Element>>(Base: TBase) => {
  abstract class AcceleratedMixin extends Base implements AcceleratedApi {
    declare _childrenPaintQTree: QuadTree | null;
    declare _childrenGeometryQTree: QuadTree | null;
    declare _dirtyIndex: boolean;
    declare _pendingAccelUpdates: Map<Element, boolean> | null;

    /**
     * Whether the entries of `child` (in the trees already) can wait for
     * the next read of the trees instead of moving now. They wait when the
     * child is a container whose box is not measured: a page or layer
     * after one of its own children moved. Measuring it goes over all its
     * children, so moving n children of a page with N children made the
     * scene measure the page n times, n x N. The trees are read only
     * through `retrieveChildrenIn*BBox`, `paintQTree` and `_updateQTree`,
     * and every other change to them applies the waiting entries first, so
     * the trees get the same operations in the same order as before, with
     * the boxes the children have then; a child updated several times in
     * between is moved once, to its last box.
     */
    _deferAccelUpdate(child: Element, geometry: boolean): boolean {
      const pending = this._pendingAccelUpdates;
      if (pending && pending.has(child)) {
        const both = pending.get(child) || geometry;
        pending.delete(child);
        pending.set(child, both);
        return true;
      }
      if (!hasContainer(child) || !child.isVisible()) return false;
      if (null !== child._paintBBox && (!geometry || null !== child._geometryBBox)) return false;
      (pending || (this._pendingAccelUpdates = new Map())).set(child, geometry);
      return true;
    }

    _applyPendingAccelUpdates(): void {
      const pending = this._pendingAccelUpdates;
      if (!pending || !pending.size) return;
      // Emptied, not dropped: a copy of this node (the PDF export's
      // proxies copy the own fields) shares the map along with the trees.
      const updates = Array.from(pending);
      pending.clear();
      updates.forEach(([child, geometry]) => {
        if (geometry) {
          this._removeAccelElement(child);
          this._insertAccelElement(child);
        } else {
          this._removeAccelElement(child, false, true);
          this._insertAccelElement(child, false, true);
        }
      });
    }

    _updateQTree(): void {
      this._applyPendingAccelUpdates();
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
      if (this._pendingAccelUpdates && this._pendingAccelUpdates.size) {
        if (
          change === ElementChange.ChildGeometryUpdate ||
          change === ElementChange.ChildVisualUpdate
        ) {
          // Updates of deeper descendants pass by here too; only those of
          // the children touch the trees.
          const child = (args as unknown[])[0];
          if (isElement(child) && child.getParent() === (this as unknown)) {
            if (this._pendingAccelUpdates.has(child)) {
              this._deferAccelUpdate(child, change === ElementChange.ChildGeometryUpdate);
              return;
            }
            this._applyPendingAccelUpdates();
          }
        } else if (
          change === NodeChange.Restore ||
          ((change === NodeChange.BeforeChildRemove ||
            change === NodeChange.AfterChildRemove ||
            change === NodeChange.AfterChildInsert) &&
            isElement(args))
        ) {
          this._applyPendingAccelUpdates();
        }
      }
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
            if (this._deferAccelUpdate(child, true)) return;
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
            if (this._deferAccelUpdate(child, false)) return;
            this._removeAccelElement(child, false, true);
            this._insertAccelElement(child, false, true);
          } else {
            this._insertAccelElement(child, false, true);
            const previous = this._getIndexOfPrevious(child);
            // Not + 1 here, unlike the geometry case (old behaviour; see
            // QUESTIONS.md "Accelerated index after a visual update of a
            // child not in the tree").
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
      this._applyPendingAccelUpdates();
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
      this._applyPendingAccelUpdates();
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
      this._applyPendingAccelUpdates();
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
  AcceleratedMixin.prototype._pendingAccelUpdates = null;
  return AcceleratedMixin;
};

const AcceleratedMixin = defineMixin("GElement.Accelerated", acceleratedBody);

export const Accelerated = Object.assign(AcceleratedMixin, {
  /** Debug switch of the old code: paint the trees. */
  PAINT_QTREES: false,
});
