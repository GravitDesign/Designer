import { Block } from "../../engine/scene/block.ts";
import { Element } from "../../engine/scene/element.ts";
import { Item } from "../../engine/scene/item.ts";
import { Node } from "../../engine/scene/node.ts";
import { SceneOptions } from "../../engine/scene/scene-options.ts";

// Only the names the old G barrel (vendor module 1) had. GHitResult is in
// engine-geometry-vertex.ts; the scene node base, GAnchor, GAnchorLink and
// GReferenceEvent were not in the barrel.
export const engineSceneNode = {
  GNode: Node,
  GElement: Element,
  GBlock: Block,
  GItem: Item,
  GSceneOptions: SceneOptions,
};
