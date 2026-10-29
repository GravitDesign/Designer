/**
 * Late numbering of `_elementIndex`, the stacking order GElement.Accelerated
 * keeps on the children of a container.
 *
 * The old code renumbered a child and every sibling after it on each
 * remove, re-insert and first tree entry, so removing the first of n
 * children n times (an import moving the parser's group onto the page,
 * deleting or cutting many objects) cost n x n. Here a renumbering is
 * written down on the container instead: `_indexAnchor` and every node
 * after it are owed `_indexStart`, `_indexStart` + 1 and so on. The
 * numbers are written out when they are read (`settleElementIndex` for
 * one node, `settleElementIndices` for all) and before the sibling list
 * changes in a way that would move a node relative to the anchor
 * (Container's insertChild and removeChild), so every read sees the
 * numbers the old code wrote, at the time it wrote them.
 */
import type { ContainerNode } from "./node-container.ts";
import type { Node } from "./node.ts";

type Numbered = Node & { _elementIndex: number };

/** How far `node` is after `anchor` among their siblings (0: the anchor), or -1 when before it. */
function distanceFrom(anchor: Node, node: Node): number {
  // Both walk forward: one reaches `node` if it is after the anchor, the
  // other the anchor if it is before, so this costs the distance between
  // them, not the length of the list.
  let fromAnchor: Node | null = anchor;
  let fromNode: Node | null = node;
  for (let distance = 0; null !== fromAnchor || null !== fromNode; distance++) {
    if (fromAnchor === node) return distance;
    if (fromNode === anchor) return -1;
    if (null !== fromAnchor) fromAnchor = fromAnchor.getNext();
    if (null !== fromNode) fromNode = fromNode.getNext();
  }
  return -1;
}

/** Writes the owed numbers from the anchor up to and including `last`. */
function writeThrough(list: ContainerNode, last: Node | null): void {
  let index = list._indexStart;
  let node = list._indexAnchor;
  for (; null !== node; node = node.getNext()) {
    (node as Numbered)._elementIndex = index++;
    if (node === last) {
      node = node.getNext();
      break;
    }
  }
  list._indexAnchor = node;
  list._indexStart = index;
}

/** Makes `node`'s `_elementIndex` current (and those of the siblings between it and the anchor). */
export function settleElementIndex(node: Node | null | undefined): void {
  if (!node) return;
  const list = node._parent;
  if (!list || null === list._indexAnchor) return;
  if (distanceFrom(list._indexAnchor, node) >= 0) writeThrough(list, node);
}

/** Makes the `_elementIndex` of every child of `list` current. */
export function settleElementIndices(list: Node | null | undefined): void {
  const container = list as ContainerNode | null | undefined;
  if (container && container._indexAnchor) writeThrough(container, null);
}

/** Numbers `element` and the siblings after it from `start`, once they are read. */
export function renumberElementIndices(element: Node, start: number): void {
  const list = element._parent;
  if (!list) {
    (element as Numbered)._elementIndex = start;
    return;
  }
  // A renumbering from before the old anchor replaces it; from after
  // it, the old one still holds for the nodes in between.
  const anchor = list._indexAnchor;
  if (null !== anchor && anchor !== element) settleElementIndex(element.getPrevious());
  list._indexAnchor = element;
  list._indexStart = start;
}
