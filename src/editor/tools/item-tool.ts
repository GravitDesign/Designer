// Old: chunk.vendor.js module 332 (GItemTool).
/**
 * The base of the tools that create items. New items take the scene's
 * default style for their item class: the style tagged with the class's
 * type id (`_sdf`).
 */
import { getTypeId, registerClass, type AnyConstructor } from "../../engine/core/object.ts";
import type { Node } from "../../engine/scene/node.ts";
import "../element-editors/item-editor.ts";
import { Tool } from "./tool.ts";

export class ItemTool extends Tool {
  static {
    registerClass(this, "GItemTool");
  }

  /** The scene's default style for the items this tool makes, or null. */
  getDefaultStyle(): Node | null {
    const style = this._scene
      ? this._scene
          .getStyles()
          .querySingle('style[_sdf="' + String(getTypeId(this._getRelatedItemClass())) + '"]')
      : null;
    return style || null;
  }

  /** The class of the items this tool creates. */
  _getRelatedItemClass(): AnyConstructor<Node> | null {
    throw new Error("GItemTool.getRelatedItemClass: virtual method");
  }

  override toString(): string {
    return "[Object GItemTool]";
  }
}
