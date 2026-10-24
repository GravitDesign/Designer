// Old: chunk.vendor.js module 650 (the GTL text transformer base).
import { VertexTransformer } from "../../geometry/vertex-transformer.ts";
import type { VertexReader } from "../../geometry/vertex-source.ts";
import type { Point } from "../../math/point.ts";
import type { Rect } from "../../math/rect.ts";
import type { Transform } from "../../math/transform.ts";

/** Where a glyph sits among its neighbours, for transformers that place glyphs one by one. */
export interface GlyphPlacement {
  /** Advance to the next glyph. */
  next?: number;
  /** Advance from the previous glyph (or from the run start). */
  prev?: number;
  unicode?: number;
  /** HarfBuzz x offset of the glyph. */
  xoff?: number;
}

/** What a transformer asks of the core that owns it (TLCore). */
export interface TransformerCore {
  getLines(): { baseline: number; ascent: number; descent: number }[];
  getRenderBounds(): Rect | null;
  _calculateRenderBounds(): Rect;
}

/**
 * A link in the chain of text transformers (path, direction) that map
 * glyph outlines. Each transformer adds its matrix and hands on to the
 * next; the inverse runs from the last one back.
 */
export class TextTransformer {
  _tlCore: TransformerCore | null = null;
  _type: string | null = null;
  _next: TextTransformer | null = null;
  _prev: TextTransformer | null = null;

  constructor(core: TransformerCore | null) {
    this._tlCore = core;
  }

  /** The outline mapped through the chain's matrix for a glyph at (x, y). */
  transform(
    source: VertexReader,
    x: number,
    y: number,
    bounds: Rect,
    placement?: GlyphPlacement,
  ): VertexReader {
    const matrix = this.getMatrix(x, y, bounds, placement);
    return matrix ? new VertexTransformer(source, matrix) : source;
  }

  inverseTransform(point: Point, first?: boolean): Point {
    return this.getLast()._inverseTransform(point, first);
  }

  _inverseTransform(point: Point, first?: boolean): Point {
    return this._prev ? this._prev._inverseTransform(point, first) : point;
  }

  getMatrix(
    x: number,
    y: number,
    bounds: Rect,
    placement?: GlyphPlacement,
    matrix?: Transform | null,
  ): Transform | null {
    return this._next ? this._next.getMatrix(x, y, bounds, placement, matrix) : matrix || null;
  }

  /** The first box origin a later transformer in the chain reports. */
  getBoxOrigin(): Point | null {
    for (let next = this._next; next;) {
      const origin = next.getBoxOrigin();
      if (origin) return origin;
      next = next._next;
    }
    return null;
  }

  getType(): string | null {
    return this._type;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses read the owning text
  getPreTransform(owner?: unknown): Transform | null {
    return null;
  }

  /**
   * The transformer of a type in the chain. Like the old code it searches
   * from the first transformer's successor on; when no transformer has the
   * type it recurses without end (only reachable with a chain that lacks it).
   */
  get(type: string): TextTransformer | null {
    if (type !== this._type) {
      const first = this.getFirst();
      return first._next ? first._next.get(type) : null;
    }
    return this;
  }

  append(transformer: TextTransformer): this {
    const next = this._next;
    this._next = transformer;
    transformer._prev = this;
    transformer._next = next;
    if (next) next._prev = transformer;
    return this;
  }

  prepend(transformer: TextTransformer): this {
    const previous = this._prev;
    if (previous) previous._next = transformer;
    transformer._prev = previous;
    this._prev = transformer;
    transformer._next = this;
    return this;
  }

  /** Unlinks this transformer; returns its neighbour (next first). */
  remove(): TextTransformer | null {
    if (this._next) this._next._prev = this._prev;
    if (this._prev) this._prev._next = this._next;
    return this._next || this._prev;
  }

  getLast(): TextTransformer {
    let last = this._next;
    if (!last) return this;
    while (last._next) last = last._next;
    return last;
  }

  getFirst(): TextTransformer {
    let first = this._prev;
    if (!first) return this;
    while (first._prev) first = first._prev;
    return first;
  }
}
