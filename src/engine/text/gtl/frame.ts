// Old: chunk.vendor.js module 653 (a frame of lines, carota's frame.js).
import type { TextCode } from "./inline.ts";
import { LineBuffer } from "./line-buffer.ts";
import type { Line } from "./line.ts";
import { TLNode } from "./node.ts";
import { TLRect } from "./rect.ts";
import type { Word } from "./word.ts";

/** A line or a block node (a list) in a frame. */
type FrameItem = TLNode &
  Partial<Pick<Line, "baseline" | "minY" | "maxY" | "minX" | "maxX">> & {
    rightPadding?: number;
    actualWidth?: number | (() => number);
    ascent?: number | (() => number);
    descent?: number | (() => number);
    getLastValidCharSpacing(): number;
  };

/**
 * The lines of the document (or of a list item). Feed it with
 * frame(done, word) per word; it calls `done` with itself once the eof
 * word (or the item's terminator) was laid out.
 */
export class Frame extends TLNode {
  _currLength = 0;
  _currHeight = 0;
  lines: FrameItem[];
  wrapper = null;
  _wrapper: LineBuffer;
  _parent: TLNode | null = null;
  declare height: number | undefined;
  _realBounds: TLRect | null = null;
  _bboxSpacing: number | null | undefined = null;
  _topMargin: number | undefined = void 0;
  _bottomMargin: number | undefined = void 0;
  _bounds?: TLRect;
  _actualWidth?: number;

  constructor(
    left: number,
    top: number,
    width: number,
    ordinal: number,
    parent: TLNode | null,
    includeTerminator?: (code: TextCode) => boolean,
    initialAscent?: number,
    initialDescent?: number,
    noWrap?: boolean,
    bboxSpacing?: number | null,
  ) {
    super();
    this.lines = [];
    this._parent = parent;
    this.ordinal = ordinal;
    this._currLength = 0;
    this._currHeight = 0;
    this._wrapper = new LineBuffer(
      left,
      top,
      width,
      ordinal,
      this,
      includeTerminator,
      initialAscent,
      initialDescent,
      noWrap,
    );
    this._bboxSpacing = bboxSpacing;
  }

  /** Lays out one word; when done, sets length and height, calls `done` and returns true. */
  frame(done: (frame: Frame) => unknown, word: Word): true | undefined {
    if (
      this._wrapper.wrap(
        (item) => {
          if ("number" == typeof item) {
            this._currHeight = item;
          } else {
            this._currLength = item.ordinal + item.length - this.ordinal;
            this.lines.push(item as FrameItem);
          }
        },
        word,
        this._bboxSpacing,
      )
    ) {
      this.length = this._currLength;
      this.height = this._currHeight;
      done(this);
      return true;
    }
    return undefined;
  }

  /** The ink bounds of all lines and blocks, or 0,0,0,0 without ink. */
  realBounds(): TLRect {
    if (null === this._realBounds) {
      let left = Number.MAX_VALUE;
      let top = Number.MAX_VALUE;
      let right = -Number.MAX_VALUE;
      let bottom = -Number.MAX_VALUE;
      for (let i = 0; i < this.lines.length; i++) {
        const line = this.lines[i] as FrameItem;
        if ("line" === line.type) {
          top = Math.min(top, (line.baseline as number) + (line.minY as number));
          left = Math.min(left, line.minX as number);
          bottom = Math.max(bottom, (line.baseline as number) + (line.maxY as number));
          right = Math.max(right, line.maxX as number);
        } else {
          const bounds = line.bounds(true);
          top = Math.min(top, bounds.t);
          left = Math.min(left, bounds.l);
          bottom = Math.max(bottom, bounds.b);
          right = Math.max(right, bounds.r);
        }
      }
      this._realBounds =
        left === Number.MAX_VALUE ||
        top === Number.MAX_VALUE ||
        right === -Number.MAX_VALUE ||
        bottom === -Number.MAX_VALUE
          ? new TLRect(0, 0, 0, 0)
          : new TLRect(left, top, right - left, bottom - top);
    }
    return this._realBounds;
  }

  /** The top of the highest ink, or NaN. */
  topMargin(): number {
    if (void 0 === this._topMargin) {
      this._topMargin = NaN;
      let top = Number.MAX_VALUE;
      for (let i = 0; i < this.lines.length; i++) {
        const line = this.lines[i] as FrameItem;
        const minY = line.minY as number;
        if (minY !== Number.MAX_VALUE) {
          const baseline = line.baseline as number;
          top = Math.min(top, baseline + minY);
        }
      }
      if (top !== Number.MAX_VALUE) this._topMargin = top;
    }
    return this._topMargin;
  }

  /** The space between the last ink and the frame's bottom, or NaN. */
  bottomMargin(): number {
    if (void 0 === this._bottomMargin) {
      this._bottomMargin = NaN;
      if (this.lines.length) {
        const bounds = this.bounds();
        const bottom = bounds.t + bounds.h;
        for (let i = this.lines.length - 1; i >= 0; i--) {
          const line = this.lines[i] as FrameItem;
          const maxY = line.maxY as number;
          if (Number.isNaN(maxY)) {
            console.log();
          } else if (maxY !== -Number.MAX_VALUE) {
            this._bottomMargin = bottom - (line.baseline as number) - maxY;
            break;
          }
        }
      }
    }
    return this._bottomMargin;
  }

  /**
   * The union of the line boxes (cached), or with `actual` of the ink
   * boxes (not cached). The first line sets top and left; without
   * `actual` later lines only extend right and bottom. An empty frame is
   * as high as its height.
   */
  override bounds(actual?: boolean): TLRect {
    if (!this._bounds || actual) {
      let left = 0;
      let top = 0;
      let right = 0;
      let bottom = 0;
      for (let i = 0; i < this.lines.length; ++i) {
        const bounds = (this.lines[i] as FrameItem).bounds(actual);
        if (0 === i) {
          left = bounds.l;
          top = bounds.t;
          right = bounds.l + bounds.w;
          bottom = bounds.t + bounds.h;
        } else {
          if (actual) {
            left = Math.min(left, bounds.l);
            top = Math.min(top, bounds.t);
          }
          right = Math.max(right, bounds.l + bounds.w);
          bottom = Math.max(bottom, bounds.t + bounds.h);
        }
      }
      let height = bottom - top;
      if (!height && !actual) height = this.height as number;
      const result = new TLRect(left, top, right - left, height);
      if (actual) return result;
      this._bounds = result;
    }
    return this._bounds;
  }

  leftPadding(): number {
    const bounds = this.realBounds();
    return (bounds && bounds.l) || 0;
  }

  rightPadding(): number {
    let padding = 0;
    this.lines.forEach((line) => {
      padding = Math.max(padding, line.rightPadding || 0);
    });
    return padding;
  }

  ascent(): number {
    let ascent = 0;
    this.lines.forEach((line) => {
      if ("number" == typeof line.ascent) ascent = Math.max(ascent, line.ascent);
    });
    return ascent;
  }

  descent(): number {
    let descent = 0;
    this.lines.forEach((line) => {
      if ("number" == typeof line.descent) descent = Math.max(descent, line.descent);
    });
    return descent;
  }

  baseline(): number {
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i] as FrameItem;
      if ("number" == typeof line.baseline) return line.baseline;
    }
    return 0;
  }

  /** The widest line (cached once non-zero). */
  actualWidth(): number {
    if (!this._actualWidth) {
      let width = 0;
      this.lines.forEach((line) => {
        if ("number" == typeof line.actualWidth) width = Math.max(width, line.actualWidth);
      });
      this._actualWidth = width;
    }
    return this._actualWidth;
  }

  override children(): TLNode[] {
    return this.lines;
  }

  override parent(): TLNode | null {
    return this._parent;
  }

  /** Draws the lines that overlap the viewport's vertical range; stops below it. */
  override draw(context: unknown, viewport?: TLRect | null): void {
    const top = viewport ? viewport.t : 0;
    const bottom = viewport ? viewport.t + viewport.h : Number.MAX_VALUE;
    this.lines.some((line) => {
      const bounds = line.bounds();
      if (bounds.t + bounds.h < top) return false;
      if (bounds.t > bottom) return true;
      line.draw(context, viewport);
      return undefined;
    });
  }

  /**
   * The letter spacing at the end of the widest line; among lines of the
   * same width the largest one.
   */
  getBBoxSpacing(): number {
    let spacing = 0;
    const lines = this.children() as FrameItem[];
    if (lines && lines.length) {
      let widest: FrameItem | null = null;
      lines.forEach((line) => {
        if (!widest) widest = line;
        if ((widest.actualWidth as number) < (line.actualWidth as number)) {
          widest = line;
        } else if (widest.actualWidth === line.actualWidth) {
          const current = widest.getLastValidCharSpacing();
          const candidate = line.getLastValidCharSpacing();
          if (candidate > current) {
            widest = line;
            spacing = candidate;
          }
        }
      });
      if (widest && !spacing) spacing = (widest as FrameItem).getLastValidCharSpacing();
    }
    return spacing;
  }

  getMinX(): number {
    let minX = 0;
    const lines = this.children() as FrameItem[];
    if (lines && lines.length) {
      minX = (lines[0] as FrameItem).minX as number;
      lines.forEach((line) => {
        minX = Math.min(minX, line.minX as number);
      });
    }
    return minX;
  }
}

Frame.prototype.type = "frame";
