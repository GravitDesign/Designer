// Old: chunk.vendor.js module 1001 (GSceneUtil).
import { Element } from "./element.ts";
import { Group } from "./group.ts";
import { Layer } from "./layer.ts";
import type { ContainerNode } from "./node-container.ts";
import type { Node } from "./node.ts";

/**
 * Moves `node` into `target`, flattening layers and groups on the way: a
 * layer becomes a new group, a group dissolves into `target` when that is
 * a group too. Elements that aren't containers throw on getFirstChild, as
 * in the old code.
 */
function flattenInto(node: Node, target: ContainerNode | null): void {
  if (!(node instanceof Element)) return;
  let current: Node = node;
  let child = (current as unknown as ContainerNode).getFirstChild();
  if (current instanceof Layer) current = new Group();
  else (current.getParent() as ContainerNode).removeChild(current);
  if (target) {
    if (current instanceof Group && target instanceof Group) current = target;
    else target.appendChild(current);
  }
  while (child) {
    const next = child.getNext();
    if (current instanceof Layer || current instanceof Group) flattenInto(child, current);
    child = next;
  }
}

// A class (not functions) because it is GSceneUtil in the G namespace.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- old static-only class
export class SceneUtil {
  constructor() {
    throw new Error("This class cannot be instantiated");
  }

  /**
   * The content of `page` as one element: a group holding every element
   * with layers and nested groups flattened away, or the only element
   * itself when there is just one. The elements are taken out of `page`.
   */
  static asFlattenElement(page: ContainerNode): Node {
    let result: Node = new Group();
    for (let child = page.getFirstChild(); child;) {
      const next = child.getNext();
      flattenInto(child, result as Group);
      child = next;
    }
    const group = result as Group;
    if (group.getFirstChild() && null === (group.getFirstChild() as Node).getNext()) {
      const only = group.getFirstChild() as Node;
      group.removeChild(only);
      result = only;
    }
    return result;
  }
}
