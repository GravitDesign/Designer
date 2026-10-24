// Old: chunk.vendor.js module 518 (GNoisePattern).
import { registerClass } from "../core/object.ts";
import { RGBColor } from "../color/rgb-color.ts";
import type { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import type { Bitmap } from "../paint/bitmap.ts";
import type { PaintCanvas } from "../paint/paint-canvas.ts";
import { Node } from "../scene/node.ts";
import { Background } from "./background.ts";
import { FillPaintLayer } from "./fill-paint-layer.ts";
import { registerNoisePattern } from "./late-bound.ts";
import { Pattern } from "./pattern.ts";
import { TexturePattern, type TextureNode, type TexturePatternBlob } from "./texture-pattern.ts";
import { GLNoiseEffect } from "./webgl/effects/gl-noise-effect.ts";

const NoiseType = {
  Original: "original",
  Black: "black",
  White: "white",
  Color: "color",
} as const;

export type NoiseTypeValue = (typeof NoiseType)[keyof typeof NoiseType];

/** The rectangle the noise is rendered on, as this class uses it (GRectangle). */
interface NoiseNode extends TextureNode {
  transform(transform: Transform, flag?: boolean): void;
  getEffects(): { appendChild(node: Node): void; getFirstChild(): Node | null };
  getPaintLayers(): {
    clearFillLayers(): void;
    appendChild(node: Node): void;
    insertChild(node: Node, reference: Node | null): void;
    getFirstChild(): Node | null;
  };
  clone(): NoiseNode;
  toBitmap(...args: unknown[]): Bitmap;
}

type NoiseBlob = TexturePatternBlob & { amount?: number; type?: NoiseTypeValue };

/**
 * A noise texture: a 5 x 5 rectangle with the GL noise effect, stretched
 * over the shape. "original" noises the pixels under the shape, the others
 * noise a white (black, color) or black (white) fill.
 *
 * GRectangle belongs to a later cluster; it is looked up by its node name
 * ("rectangle") when a noise pattern is made.
 */
export class NoisePattern extends TexturePattern {
  static {
    registerClass(this, "GNoisePattern");
    Pattern.register("N", this);
    registerNoisePattern(this);
  }

  static Type = NoiseType;

  static override equals(
    a: NoisePattern | null | undefined,
    b: NoisePattern | null | undefined,
  ): boolean {
    return (
      (!a && a === b) ||
      (TexturePattern.equals(a, b) &&
        (a as NoisePattern)._amount === (b as NoisePattern)._amount &&
        (a as NoisePattern)._type === (b as NoisePattern)._type)
    );
  }

  declare _type: NoiseTypeValue;
  declare _amount: number;

  constructor(amount?: number) {
    super();
    TexturePattern.ScaleSettings["stretch"]?.(this);
    const Rectangle = Node._nameToNodeClassMap.get("rectangle") as unknown as
      (new () => NoiseNode) | undefined;
    if (!Rectangle) {
      throw new Error("GRectangle is not registered (engine-shapes-primitives registers it)");
    }
    const node = new Rectangle();
    this._node = node;
    node.transform(new Transform().scaled(5, 5));
    node.getEffects().appendChild(new GLNoiseEffect());
    this.setType(NoiseType.Original);
    this.setAmount(amount);
  }

  private get _noiseNode(): NoiseNode {
    return this._node as NoiseNode;
  }

  setType(type: NoiseTypeValue): void {
    this._type = type;
    this._noiseNode.getPaintLayers().clearFillLayers();
    switch (type) {
      case NoiseType.Original:
        this._noiseNode.getPaintLayers().appendChild(new FillPaintLayer(new Background()));
        break;
      case NoiseType.Black:
      case NoiseType.Color:
        this._noiseNode.getPaintLayers().appendChild(new FillPaintLayer(RGBColor.WHITE));
        break;
      case NoiseType.White:
        this._noiseNode.getPaintLayers().appendChild(new FillPaintLayer(RGBColor.BLACK));
    }
    (this._noiseNode.getEffects().getFirstChild() as GLNoiseEffect).setProperty("shp", {
      amount: this.getAmount(),
      colored: this._type === NoiseType.Color,
      transparency: true,
    });
  }

  getType(): NoiseTypeValue {
    return this._type;
  }

  override getAverageColor(): number[] {
    return [128, 128, 128, 1];
  }

  setAmount(amount?: number): void {
    this._amount = void 0 === amount ? 1 : amount;
    (this._noiseNode.getEffects().getFirstChild() as GLNoiseEffect).setProperty("shp", {
      amount: this._amount,
      colored: this._type === NoiseType.Color,
      transparency: true,
    });
  }

  getAmount(): number {
    return this._amount;
  }

  /**
   * The noise rendered at the pattern's scale. "original" puts what `canvas`
   * shows under `rect` below the noise.
   */
  override getTexture(canvas?: PaintCanvas, rect?: Rect): Bitmap {
    const node = this._noiseNode.clone();
    node.transform(new Transform().scaled(this._scaleX, this._scaleY), true);
    if (this._type === NoiseType.Original) {
      const paintCanvas = canvas as PaintCanvas;
      const bitmap = paintCanvas
        .getBitmap()
        .clone(paintCanvas.getTransform().mapRect(rect as Rect));
      if (bitmap) {
        const texture = new TexturePattern(bitmap.getHTMLElement() as HTMLCanvasElement);
        TexturePattern.ScaleSettings["stretch"]?.(texture);
        const layers = node.getPaintLayers();
        const first = layers.getFirstChild();
        layers.insertChild(new FillPaintLayer(texture), first);
      }
    }
    return node.toBitmap(void 0, void 0, void 0, void 0, void 0, void 0, void 0, void 0, false);
  }

  override clone(): NoisePattern {
    const blob = this.serialize();
    const copy = new NoisePattern();
    copy.deserialize(blob);
    return copy;
  }

  /**
   * The old override called the texture blob without the options, so a
   * saved noise pattern keeps its stored url (surl) too.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the overridden signature
  override _serializeToBlob(_options?: { save?: boolean } | null): NoiseBlob {
    const blob = super._serializeToBlob() as NoiseBlob;
    blob.amount = this.getAmount();
    blob.type = this.getType();
    return blob;
  }

  override _deserializeFromBlob(blob: NoiseBlob): void {
    super._deserializeFromBlob(blob);
    this.setAmount(blob.amount);
    this.setType(blob.type || NoiseType.Original);
  }

  override _getRotatedTransform(): Transform {
    return null as unknown as Transform;
  }

  override isWebGL(): boolean {
    return true;
  }

  override toString(): string {
    return "[Object GNoisePattern]";
  }
}

NoisePattern.prototype._type = NoiseType.Original;
NoisePattern.prototype._amount = 1;
