// Old: chunk.vendor.js module 289 (GSlice).
/**
 * The export slice, node "slice": a box (`x`, `y`, `w`, `h`) on a page
 * or layer that exports what lies below it. It paints only as a marker
 * (a translucent fill, or a frame in outline mode) when slices are shown.
 * `trm` trims transparent edges from the exported bitmap, `cls` fills it
 * with a background first.
 */
import type { Color } from "../color/color.ts";
import { Locale } from "../core/locale/locale.ts";
import { Rect } from "../math/rect.ts";
import type { Bitmap } from "../paint/bitmap.ts";
import { ElementData } from "../paint/element-data.ts";
import type { PaintCanvas } from "../paint/paint-canvas.ts";
import type { PaintContext } from "../paint/paint-context.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { Pattern } from "../style/pattern.ts";
import type { Element } from "./element.ts";
import { Item } from "./item.ts";
import { NodeChange } from "./node-change.ts";
import type { ContainerNode } from "./node-container.ts";
import { Node, registerNodeClass } from "./node.ts";

const MetaProperties = {
  trm: true,
  cls: null,
};

const GeometryProperties = {
  x: 0,
  y: 0,
  w: 100,
  h: 100,
};

/** What painting a slice reads from the scene paint configuration. */
interface SliceConfiguration {
  sceneBackground: boolean;
  isSlicesVisible(context: PaintContext): boolean;
  isOutline(context: PaintContext): boolean;
}

/** The scene's paint entry point (engine-scene-document). */
interface PaintableScene {
  paint(context: PaintContext): void;
}

/**
 * Whether `parent` is an instance of the node class registered as
 * `name`. GLayer and GPage belong to engine-scene-document; they are
 * found through the registry once loaded, until then nothing matches.
 */
function isInstanceOfNode(parent: Node, name: string): boolean {
  const cls = Node._nameToNodeClassMap.get(name);
  return !!cls && parent instanceof cls;
}

export class Slice extends Item {
  static {
    registerNodeClass(this, "slice", "GSlice");
  }

  static override MetaProperties: Readonly<Record<string, unknown>> = MetaProperties;
  static GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;

  declare $trm: boolean;
  declare $cls: Pattern | null;
  declare $x: number;
  declare $y: number;
  declare $w: number;
  declare $h: number;

  constructor() {
    super();
    // GSlice has no VisualProperties of its own; the old call passed undefined first.
    this._setDefaultProperties(GeometryProperties, MetaProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GSlice", "name", this.getNodeName()) as string;
  }

  override validateInsertion(parent: ContainerNode, reference?: Node | null): boolean {
    void reference;
    return isInstanceOfNode(parent, "layer") || isInstanceOfNode(parent, "page");
  }

  /** Paints the whole scene without its background into the bitmap of this slice. */
  override _paintToBitmap(context: PaintContext): Bitmap | null {
    if (!this._scene) throw new Error("Not part of a scene.");
    const configuration = context.configuration as unknown as SliceConfiguration;
    const background = configuration.sceneBackground;
    configuration.sceneBackground = false;
    try {
      const canvas = context.canvas as PaintCanvas;
      if (this.$cls) canvas.fillCanvas(this.$cls as never);
      (this._scene as unknown as PaintableScene).paint(context);
      const bitmap = canvas.getBitmap();
      if (this.getProperty("trm")) bitmap.trim();
      return bitmap;
    } finally {
      configuration.sceneBackground = background;
    }
  }

  override _paint(context: PaintContext): void {
    const configuration = context.configuration as unknown as SliceConfiguration;
    if (configuration.isSlicesVisible(context)) {
      const box = (this.getGeometryBBox() as Rect).toAlignedRect();
      const canvas = context.canvas as PaintCanvas;
      if (configuration.isOutline(context)) {
        canvas.strokeRect(
          box.getX(),
          box.getY(),
          box.getWidth(),
          box.getHeight(),
          1,
          context.getOutlineColor() as Color,
        );
      } else {
        canvas.fillRect(
          box.getX(),
          box.getY(),
          box.getWidth(),
          box.getHeight(),
          context.sliceColor,
          0.25,
        );
      }
    }
  }

  override _calculateGeometryBBox(includeInvisible?: unknown): Rect | null {
    return this.getSourceBBox(includeInvisible);
  }

  override _calculatePaintBBox(arg?: unknown, includeInvisible?: unknown): Rect | null {
    void arg;
    return this.getGeometryBBox(includeInvisible);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override _calculateSourceBBox(includeInvisible?: unknown): Rect | null {
    return new Rect(this.$x, this.$y, this.$w, this.$h);
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      this.storeProperties(blob, MetaProperties, (name, value) =>
        "cls" === name && value ? Pattern.serialize(value as Pattern) : value,
      );
      this.storeProperties(blob, GeometryProperties);
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, MetaProperties, (name, value) =>
        "cls" === name && value ? Pattern.deserialize(value as string) : value,
      );
      this.restoreProperties(blob, GeometryProperties);
    }
    this._handleGeometryChangeForProperties(change, args, GeometryProperties);
    super._handleChange(change, args);
  }

  /** Any hit inside the box hits the slice. */
  override _detailHitTest(): ElementData<Element, unknown> | null {
    return new ElementData(this as Element, undefined);
  }
}
