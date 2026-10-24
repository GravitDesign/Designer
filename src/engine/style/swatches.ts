// Old: chunk.vendor.js module 662 (GSwatches).
import { Node, registerNodeClass } from "../scene/node.ts";
import { Container } from "../scene/node-container.ts";
import { Store } from "../scene/node-store.ts";
import { SceneNode } from "../scene/scene-node.ts";

/** The document's swatches, a child of the scene. */
export class Swatches extends Store(Container(SceneNode)) {
  static {
    registerNodeClass(this, "swatches", "GSwatches");
  }

  override validateInsertion(parent: Node): boolean {
    return "scene" === Node.getName(parent);
  }
}
