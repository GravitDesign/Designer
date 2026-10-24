// Old: designer.browser.dev.js module 163 (the functions Q, Y and X and the
// property list q after GDocument).
/**
 * The import optimiser (FMT-IMPORT-030), run on PDF pages and EPS groups:
 * a path followed by a sibling path of the same class with the same
 * geometry, the same anchor points and the same style, which has children
 * of its own, is merged into the first one: the second path is removed and
 * its children move into the first. PDF clipping comes out of the importer
 * as one path per clipped run, so this joins them again. Works depth
 * first, with update changes blocked on every container it visits.
 */
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import type { AnyConstructor } from "../../engine/core/object.ts";
import { Anchor } from "../../engine/scene/element-anchor.ts";
import { Block } from "../../engine/scene/block.ts";
import { Item } from "../../engine/scene/item.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { PropertiesNode } from "../../engine/scene/node-properties.ts";
import { Path } from "../../engine/scene/path.ts";
import { PathBase } from "../../engine/scene/path-base.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { Stylable, type StylableNode } from "../../engine/style/stylable.ts";

/** The properties two shapes must share (the old list q). */
const SHAPE_PROPERTIES = Object.keys(Shape.GeometryProperties)
  .concat(Object.keys(Shape.MetaProperties))
  .concat(Object.keys(Item.MetaProperties))
  .concat(Object.keys(Block.VisualProperties))
  .concat(Object.keys(Block.MetaProperties))
  .concat(Object.keys(Anchor.MetaProperties));

type EqualsStyle = (this: StylableNode, style?: StylableNode | null) => boolean;

let baseEqualsStyle: EqualsStyle | null = null;

/**
 * GStylable.prototype.equalsStyle: the mixin's own comparison, not the
 * element override that compares with the referenced style. The mixin
 * has no prototype of its own here, so it is applied to an empty base
 * once to get at the method.
 */
function stylableEqualsStyle(): EqualsStyle {
  if (!baseEqualsStyle) {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- an empty base for the mixin
    const Base = Stylable(class {} as unknown as AnyConstructor<PropertiesNode>);
    baseEqualsStyle = (Base.prototype as unknown as { equalsStyle: EqualsStyle }).equalsStyle;
  }
  return baseEqualsStyle;
}

/** The nodes as the optimiser handles them. */
type OptimizedNode = Node &
  ContainerApi & {
    _blockUpdateChanges(arg?: unknown): void;
    _releaseUpdateChanges(arg?: unknown): void;
  };

/** Y: same class, a shape, `next` has children, same properties and style. */
function isSameShape(node: Node, next: Node): boolean {
  if (node.constructor !== next.constructor) return false;
  if (!(node instanceof Shape)) return false;
  if (!(next as OptimizedNode).getFirstChild()) return false;
  if (!node.arePropertiesEqual(next as unknown as PropertiesNode, SHAPE_PROPERTIES)) return false;
  // equalsStyle reads the property sets of its argument; compare with this
  // node's sets for the moment, like the old code.
  const other = next as unknown as { $ps: unknown };
  const sets = other.$ps;
  other.$ps = (node as unknown as StylableNode).getStylePropertySets();
  const same = stylableEqualsStyle().call(
    node as unknown as StylableNode,
    next as unknown as StylableNode,
  );
  other.$ps = sets;
  return same;
}

/** X: same path geometry and the same anchor points. */
function isSamePath(path: Path, next: Path): boolean {
  if (!path.arePropertiesEqual(next, Object.keys(Path.GeometryProperties))) return false;
  const names = Object.keys(PathBase.AnchorPoint.GeometryProperties);
  let mine: Node | null = path.getAnchorPoints().getFirstChild();
  let theirs: Node | null = next.getAnchorPoints().getFirstChild();
  for (; mine && theirs; mine = mine.getNext(), theirs = theirs.getNext()) {
    if (
      !(mine as unknown as PropertiesNode).arePropertiesEqual(
        theirs as unknown as PropertiesNode,
        names,
      )
    )
      return false;
  }
  return null === mine && null === theirs;
}

/** Statistics of the last run (the old counter z, logged outside production). */
export const optimizerStats = { removed: 0 };

/** Q: merges equal sibling paths below `container`, depth first. */
export function optimizeImport(container: Node): void {
  const parent = container as OptimizedNode;
  parent._blockUpdateChanges();
  let node = parent.getFirstChild();
  while (node) {
    const next = node.getNext();
    if (next) {
      if (!isSameShape(node, next)) {
        node = next;
        continue;
      }
      if (!(node instanceof Path)) {
        node = next;
        continue;
      }
      if (!isSamePath(node, next as Path)) {
        node = next;
        continue;
      }
      parent.removeChild(next);
      (node as unknown as OptimizedNode)._blockUpdateChanges();
      // Moves every child of `next`; the old loop read getNext() of a child
      // it had just moved and dropped all but the first ("Merging equal clip
      // paths on import keeps only the first child of the second" in
      // BUGS-FIXED.md).
      const merged = next as OptimizedNode;
      for (let child = merged.getFirstChild(); null !== child; child = merged.getFirstChild()) {
        merged.removeChild(child);
        node.appendChild(child);
      }
      (node as unknown as OptimizedNode)._releaseUpdateChanges();
      optimizerStats.removed++;
    } else node = next;
  }
  for (let child = parent.getFirstChild(); null !== child; child = child.getNext()) {
    optimizeImport(child);
  }
  parent._releaseUpdateChanges();
}
