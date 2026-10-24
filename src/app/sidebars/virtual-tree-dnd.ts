// Old: designer.browser.dev.js module 1710 (GVirtualTree._DragAndDropHelper).
/**
 * The animated drag of the touch layout: while a row is dragged, the tree
 * moves the dragged node above or below the row it passes (or marks a
 * row to drop into), and on release reports the move to the panel.
 */
import type { VirtualTree, VirtualTreeNode } from "./virtual-tree.ts";

export class DragAndDropHelper {
  _vtree: VirtualTree;
  _droppableNodeUpper: VirtualTreeNode | null = null;
  _droppableNodeLower: VirtualTreeNode | null = null;
  _droppableNodeInside: VirtualTreeNode | null = null;

  constructor(tree: VirtualTree) {
    this._vtree = tree;
  }

  setDroppableNodeInside(node: VirtualTreeNode | null): void {
    if (!(node && node === this._droppableNodeInside) && this._droppableNodeInside)
      (this._droppableNodeInside.row as HTMLElement).classList.remove(this._vtree._insertIntoStyle);
    this._droppableNodeInside = node;
    if (node) (node.row as HTMLElement).classList.add(this._vtree._insertIntoStyle);
  }

  setDroppableNodeLower(node: VirtualTreeNode): void {
    this._droppableNodeLower = node;
    this._droppableNodeUpper = null;
    const dragged = this._vtree._dragNode as VirtualTreeNode;
    this._vtree.beginUpdate();
    this._vtree.removeNode(dragged);
    this._vtree.insertNodeAfter(node, dragged);
    this._vtree.endUpdate(true);
  }

  setDroppableNodeUpper(node: VirtualTreeNode): void {
    this._droppableNodeUpper = node;
    this._droppableNodeLower = null;
    const dragged = this._vtree._dragNode as VirtualTreeNode;
    this._vtree.beginUpdate();
    this._vtree.removeNode(dragged);
    this._vtree.insertNodeBefore(node, dragged);
    this._vtree.endUpdate(true);
  }

  drop(): void {
    const dragged = this._vtree._dragNode as VirtualTreeNode;
    const root = this._vtree._root;
    const callback = this._vtree._dropCallback;
    if (this._droppableNodeInside) {
      const target = this._droppableNodeInside;
      this._vtree.beginUpdate();
      this._vtree.removeNode(dragged);
      this._vtree.appendNode(target, dragged);
      this._vtree.endUpdate(true);
      if (callback) callback(target, null, null, [dragged]);
    } else if (this._droppableNodeUpper) {
      const target = this._droppableNodeUpper;
      if (callback) {
        if (target !== root)
          callback(target.parent as VirtualTreeNode, dragged.next, dragged.previous, [dragged]);
        else callback(root, null, null, [dragged]);
      }
    } else if (this._droppableNodeLower) {
      const target = this._droppableNodeLower;
      if (callback)
        callback(target.parent as VirtualTreeNode, dragged.next, dragged.previous, [dragged]);
    }
  }

  toString(): string {
    return "[Object GVirtualTree._DragAndDropHelper]";
  }
}
