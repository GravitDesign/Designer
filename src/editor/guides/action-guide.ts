// Old: chunk.vendor.js module 1076 (GActionGuide).
import { GObject, registerClass } from "../../engine/core/object.ts";
import { QuadTree } from "../../engine/geometry/quadtree.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import type { ActionItem } from "../../engine/scene/annotations/action-item.ts";
import { Actionable, type ActionableApi } from "../../engine/scene/annotations/actionable.ts";
import { Accelerated, type AcceleratedApi } from "../../engine/scene/element-accelerated.ts";
import { Element } from "../../engine/scene/element.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { Container, type ContainerNode } from "../../engine/scene/node-container.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Guide, GuideVisual, guidePaintContext } from "./guide.ts";

/** An action button with the view transform it paints at. */
interface PlacedAction {
  action: ActionItem;
  transform: Transform;
}

const ACTIONABLE = 1;
/** An element with children the walk goes into. */
const CONTAINER = 2;
/** A container asked for its visible children through its quadtree. */
const ACCELERATED = 4;

/** The walk's answers per prototype (see kindOf). */
const kinds = new WeakMap<object, number>();
const stockHasMixin = GObject.prototype.hasMixin;

/**
 * What the action walk needs to know about `node`, as bits. hasMixin and
 * instanceof answer per prototype, so the answer is kept per prototype;
 * a node with its own hasMixin (test fakes) is asked every time. The
 * prototype is read on every call, so a node whose prototype is swapped
 * (GCollabText in text mode) gets the answer of its current class.
 */
function kindOf(node: Node): number {
  const proto =
    node.hasMixin === stockHasMixin ? (Object.getPrototypeOf(node) as object | null) : null;
  if (proto) {
    const known = kinds.get(proto);
    if (undefined !== known) return known;
  }
  let kind = 0;
  if (node.hasMixin(Actionable)) kind |= ACTIONABLE;
  if (node instanceof Element && node.hasMixin(Container)) {
    kind |= CONTAINER;
    if (node.hasMixin(Accelerated)) kind |= ACCELERATED;
  }
  if (proto) kinds.set(proto, kind);
  return kind;
}

/**
 * Paints the action buttons of actionable elements (`guide.action`) in
 * the dirty areas; never snaps.
 */
export class ActionGuide extends GuideVisual(Guide) {
  static {
    registerClass(this, "GActionGuide");
  }

  static ID = "guide.action";

  override getId(): string {
    return ActionGuide.ID;
  }

  override paint(transform: Transform, paintContext: PaintContext): void {
    const actions = this._gatherActions(transform, paintContext);
    if (actions) {
      actions.forEach((placed) => {
        placed.action.paint(paintContext, placed.transform);
      });
    }
  }

  map(): null {
    return null;
  }

  /** The actions of the visible actionable elements, placed in a row 5 px apart. */
  _gatherActions(transform: Transform, paintContext: PaintContext): PlacedAction[] | undefined {
    const context = guidePaintContext(paintContext);
    const dirty = context.dirtyMatcher.getDirtyRectangles() as Rect[];
    const scene = this._scene;
    const canvas = context.canvas;
    const visible = (transform.inverted() as Transform).mapRect(
      new Rect(0, 0, canvas.getWidth(), canvas.getHeight()),
    );
    let pages = scene.retrieveChildrenInPaintBBox(visible, QuadTree.RETRIEVE_MODE_INTERSECT);
    if (!pages) return undefined;
    let page: Node | undefined;
    if (!context.configuration.multiPageView) {
      pages = pages.filter((node) => node.hasFlag(NodeFlag.Active));
    }
    const actionables: Node[] = [];
    const actionablePages: (Node | undefined)[] = [];
    const collect = (node: Node): void => {
      const kind = kindOf(node);
      if (kind & ACTIONABLE) {
        actionables.push(node);
        actionablePages.push(page);
      }
      if (kind & CONTAINER) {
        if (kind & ACCELERATED) {
          const children = (node as unknown as AcceleratedApi).retrieveChildrenInPaintBBox(
            visible,
            QuadTree.RETRIEVE_MODE_INTERSECT,
          );
          if (children) children.forEach(collect);
        } else {
          for (
            let child = (node as unknown as ContainerNode).getLastChild();
            null != child;
            child = child.getPrevious()
          ) {
            collect(child);
          }
        }
      }
    };
    pages.forEach((node) => {
      collect((page = node));
    });
    const placed: PlacedAction[] = [];
    for (let y = 0; y < dirty.length; ++y) {
      const area = dirty[y] as Rect;
      for (let v = actionables.length - 1; v >= 0; v--) {
        const owner = actionablePages[v] as Page;
        const actionable = actionables[v] as unknown as ActionableApi;
        let box = actionable.getActionsBBox();
        if (box) {
          const scale = transform.getScaleFactor();
          const position = owner.getPosition(context.configuration.multiPageView);
          box = box.translated(position.getX(), position.getY());
          if (area.containsRect(box) || box.intersectsRect(area)) {
            const corner = transform.mapRect(box).getSide(Rect.Side.TOP_LEFT);
            let shift = 0;
            actionable.getActions().forEach((action) => {
              placed.push({
                action,
                transform: new Transform()
                  .scaled(scale, scale)
                  .translated(corner.getX() + shift, corner.getY()),
              });
              shift -= 5;
            });
            actionables.splice(v, 1);
            actionablePages.splice(v, 1);
          }
        }
      }
    }
    return placed;
  }

  override toString(): string {
    return "[Object GActionGuide]";
  }
}
