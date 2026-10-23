// Old: chunk.vendor.js module 511 (GStyle).
import { Node, registerNodeClass } from "../scene/node.ts";
import { NodeChange } from "../scene/node-change.ts";
import { Reference } from "../scene/node-identity.ts";
import { Properties } from "../scene/node-properties.ts";
import { Store } from "../scene/node-store.ts";
import { SceneNode } from "../scene/scene-node.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { ElementStylable } from "./element-stylable.ts";
import { Stylable, type StylableNode } from "./stylable.ts";
import { PropertySet } from "./stylable-sets.ts";

/** A linked element as the style pushes to it. */
interface LinkedNode {
  hasMixin(mixin: unknown): boolean;
  assignStyleFrom(source: StylableNode, blockChildChanges?: boolean): void;
  setProperty(name: string, value: unknown): boolean;
}

/**
 * A shared style in the document's styles. Elements link to it through
 * `sref`; changing the style with assignStyleFrom pushes the change to every
 * linked element. `ps` limits which property sets the style carries.
 */
export class Style extends Stylable(Reference(Store(Properties(SceneNode)))) {
  static {
    registerNodeClass(this, "style", "GStyle");
  }

  /**
   * Quirk: the default `ps` array is one array shared by every style (the
   * old defaults only copied plain objects).
   */
  static MetaProperties: Record<string, unknown> = {
    name: null,
    ps: [
      PropertySet.Style,
      PropertySet.Effects,
      PropertySet.Text,
      PropertySet.Paragraph,
      PropertySet.BorderPaintLayers,
      PropertySet.FillPaintLayers,
    ],
    defaultStyle: true,
  };

  declare $ps: string[];

  constructor() {
    super();
    this._setDefaultProperties(Style.MetaProperties);
    this._setStyleDefaultProperties();
  }

  /** Takes the style from `source` and pushes it to every linked node but `source`. */
  override assignStyleFrom(source: StylableNode): void {
    super.assignStyleFrom(source, true);
    const scene = this._scene;
    if (scene) {
      scene.visitLinks(this, (linked) => {
        const node = linked as unknown as LinkedNode;
        if ((node as unknown) !== source && node.hasMixin(Stylable)) {
          node.assignStyleFrom(this as unknown as StylableNode, true);
        }
      });
    }
  }

  /** Unlinks every linked element (sets their `sref` to null). */
  disconnectStyle(): void {
    const scene = this._scene;
    if (scene) {
      scene.visitLinks(this, (linked) => {
        const node = linked as unknown as LinkedNode;
        if (node.hasMixin(ElementStylable)) node.setProperty("sref", null);
      });
    }
  }

  override getStylePropertySets(): string[] {
    return this.$ps;
  }

  override validateInsertion(parent: Node): boolean {
    return "styles" === Node.getName(parent);
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      this.storeProperties((args as StoreChangeArgs).blob, Style.MetaProperties);
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, Style.MetaProperties);
    }
    this._handleStyleChange(change, args);
    // The old code skipped the scene node's handler here.
    Node.prototype._handleChange.call(this, change, args);
  }

  override toString(): string {
    return "[Mixin GStyle]";
  }
}
