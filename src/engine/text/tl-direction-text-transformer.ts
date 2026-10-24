// Old: chunk.vendor.js module 266 (GTLDirectionTextTransformer).
import { registerClass } from "../core/object.ts";
import { Point } from "../math/point.ts";
import type { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import {
  TextTransformer,
  type GlyphPlacement,
  type TransformerCore,
} from "./gtl/transformer-util.ts";
import {
  VERTICAL_ORIENTATION_RANGE_ENDS,
  verticalOrientationAt,
} from "./gtl/vertical-orientation-data.ts";

/** The parameters the direction transformer is made with. */
export interface DirectionTransformerParams {
  direction: number;
}

/** What getPreTransform reads from the text it belongs to (GText). */
interface WidthOwner {
  _getWidth(): number;
}

/**
 * The vertical orientation of a code point ("R", "U", "Tu", "Tr"): a
 * binary search over the range ends, halving with parseInt like the old
 * code.
 */
export function verticalOrientationOf(codePoint: number): string {
  const search = (code: number, low: number, high: number): string => {
    if (low === high) return verticalOrientationAt(low);
    const middle = parseInt(String((high + low) / 2));
    const end = VERTICAL_ORIENTATION_RANGE_ENDS[middle] as number;
    return code <= end ? search(code, low, middle) : search(code, middle + 1, high);
  };
  return search(codePoint, 0, VERTICAL_ORIENTATION_RANGE_ENDS.length - 1);
}

/**
 * Lays text out right to left, top to bottom or bottom to top by mirroring
 * or rotating each glyph's outline; the rest of the layout stays left to
 * right.
 */
export class TLDirectionTextTransformer extends TextTransformer {
  static {
    registerClass(this, "GTLDirectionTextTransformer");
  }

  static TYPE = "direction";
  static LTR = 0;
  static RTL = 1;
  static TTB = 2;
  static BTT = 3;
  static TransformerParams: DirectionTransformerParams = {
    direction: TLDirectionTextTransformer.RTL,
  };

  _direction: number;

  constructor(core: TransformerCore | null, params: DirectionTransformerParams) {
    super(core);
    this._type = TLDirectionTextTransformer.TYPE;
    this._direction = params.direction;
  }

  // The old code switched over the directions here without doing anything.
  override _inverseTransform(point: Point, first?: boolean): Point {
    return super._inverseTransform(point, first);
  }

  override getMatrix(
    x: number,
    y: number,
    bounds: Rect,
    placement?: GlyphPlacement,
    matrix?: Transform | null,
  ): Transform | null {
    let result: Transform | null = new Transform();
    // RTL and TTB hand the glyph's advance (a number), not the placement,
    // down the chain; the old code reused one variable for both.
    let downstream: GlyphPlacement | undefined;
    switch (this._direction) {
      case TLDirectionTextTransformer.LTR:
        break;
      case TLDirectionTextTransformer.RTL: {
        if (void 0 !== placement) {
          const next = placement.next;
          downstream = next as unknown as GlyphPlacement;
          let offset = void 0 !== placement.xoff ? placement.xoff : bounds.getX();
          const rest = (next as number) - offset - bounds.getWidth();
          if (void 0 === placement.xoff) offset /= 2;
          const center = x + offset + (bounds.getWidth() + rest) / 2;
          result = result.translated(-center, 0).scaled(-1, 1).translated(center, 0);
        }
        break;
      }
      case TLDirectionTextTransformer.TTB: {
        const rest = 0;
        if (void 0 !== placement) {
          const unicode = placement.unicode as number;
          if (unicode >= 0) {
            const orientation = verticalOrientationOf(unicode);
            downstream = placement.next as unknown as GlyphPlacement;
            const centerX = x + (bounds.getX() + bounds.getWidth() + rest) / 2;
            const centerY = y + (bounds.getY() + bounds.getHeight()) / 2;
            result =
              "U" === orientation || "Tu" === orientation
                ? result
                    .translated(-centerX, -centerY)
                    .rotated(Math.PI / 2)
                    .scaled(-1, 1)
                    .translated(centerX, centerY)
                    .translated(bounds.getHeight() / 2, -bounds.getWidth() / 2)
                : result.translated(-centerX, -centerY).scaled(-1, 1).translated(centerX, centerY);
          }
        }
        break;
      }
      case TLDirectionTextTransformer.BTT: {
        const renderBounds = (this._tlCore as TransformerCore).getRenderBounds();
        if (renderBounds) {
          result = result.translated(-x + y, -y + x + renderBounds.getHeight() - y);
        }
      }
    }
    const origin = new Point(x, y);
    if (result) {
      if (matrix) result = matrix.multiplied(result);
    } else {
      result = matrix ?? null;
    }
    return super.getMatrix(origin.getX(), origin.getY(), bounds, downstream, result);
  }

  override getPreTransform(owner?: unknown): Transform | null {
    switch (this._direction) {
      case TLDirectionTextTransformer.LTR:
        return new Transform();
      case TLDirectionTextTransformer.RTL:
        return new Transform().scaled(-1, 1).translated((owner as WidthOwner)._getWidth(), 0);
      case TLDirectionTextTransformer.TTB:
        return new Transform().rotated(Math.PI / 2).scaled(-1, 1);
      case TLDirectionTextTransformer.BTT:
        return new Transform();
    }
    return null;
  }

  setDirection(direction: number): void {
    this._direction = direction;
  }

  getDirection(): number {
    return this._direction;
  }
}
