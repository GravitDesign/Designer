// Old: designer.browser.dev.js module 1709 (the virtual list base of GVirtualTree).
/**
 * A scrolling list that only builds the rows near the visible part: a
 * `.vscroller` element gives the container its full height, and the rows
 * are absolutely placed `div.vrow`s rendered for three screens around the
 * scroll position. Rows that scroll out are hidden and marked
 * `data-clean`; a timer removes them later.
 *
 * It owns plain DOM: the virtual tree recycles row elements and writes
 * their inline styles in the old order, which the DOM snapshots record.
 */

/** A row element with the bookkeeping the virtual tree keeps on it. */
export interface VirtualRow extends HTMLElement {
  _specCounter?: number;
  _hasStyle?: boolean;
}

/** Renders the list row with this index into the row element. */
export type VirtualListRenderer = (index: number, row: HTMLElement) => void;

export class VirtualList {
  _rendererFn: ((...args: never[]) => void) | null = null;
  _rowHeight = 0;
  _rowCount = 0;
  _visibleRows = 0;
  _cachedRows = 0;
  _scrollCacheSize = 0;
  _scroller: HTMLElement;
  _container: HTMLElement;
  _updateCounter = 0;
  _lastRenderScrollTop = 0;
  _lastCleanedTime = 0;
  _cleanViewportTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    container: HTMLElement,
    renderer?: ((...args: never[]) => void) | null,
    rowCount?: number,
    rowHeight?: number,
  ) {
    rowCount = rowCount || 0;
    rowHeight = rowHeight || 30;
    this._scroller = document.createElement("div");
    this._scroller.classList.add("vscroller");
    this._container = container;
    this._container.style.overflow = "auto";
    this._container.style.position = "relative";
    this._container.classList.add("g-virtual-list");
    this._container.appendChild(this._scroller);
    this._container.addEventListener("scroll", this._onScroll.bind(this));
    this.beginUpdate();
    if (renderer) this.renderer(renderer);
    if (rowHeight) this.rowHeight(rowHeight);
    if (rowCount) this.rowCount(rowCount);
    this.endUpdate();
  }

  /** The old `_renderer(fn)`: sets the renderer and renders; without an argument returns it. */
  renderer(renderer?: ((...args: never[]) => void) | null): unknown {
    if (arguments.length) {
      this._rendererFn = renderer || null;
      this._render();
      return this;
    }
    return this._rendererFn;
  }

  rowHeight(height?: number): number | this {
    if (height !== undefined) {
      this._rowHeight = height;
      this._updateVisibleRows();
      this._updateScroller();
      this._render();
      return this;
    }
    return this._rowHeight;
  }

  rowCount(count?: number): number | this {
    if (count !== undefined) {
      this._rowCount = count;
      this._updateScroller();
      this._render();
      return this;
    }
    return this._rowCount;
  }

  beginUpdate(): void {
    this._updateCounter++;
  }

  // The tree's override takes an argument (render now instead of later).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the subclass signature
  endUpdate(_immediately?: boolean): void {
    if (0 == --this._updateCounter) this._render();
  }

  refresh(): unknown {
    this._updateVisibleRows();
    this._updateScroller();
    this._render();
    return this;
  }

  _render(): this {
    if (0 === this._updateCounter) {
      const scrollTop = this._container.scrollTop;
      // parseInt of the quotient, as the old code did (it truncates).
      const first = parseInt(String(scrollTop / this._rowHeight)) - this._visibleRows;
      this._renderViewport(first < 0 ? 0 : first);
    }
    return this;
  }

  _updateVisibleRows(): void {
    this._visibleRows = Math.floor(this._container.offsetHeight / this._rowHeight);
    this._cachedRows = 3 * this._visibleRows;
    this._scrollCacheSize = this._visibleRows * this._rowHeight;
  }

  _updateScroller(): void {
    this._scroller.style.height = (this._rowCount * this._rowHeight).toString() + "px";
  }

  _onScroll(event: globalThis.Event): void {
    event.preventDefault();
    this._requestViewportClean();
    const scrollTop = this._container.scrollTop;
    if (
      !this._lastRenderScrollTop ||
      Math.abs(scrollTop - this._lastRenderScrollTop) > this._scrollCacheSize
    ) {
      this._updateVisibleRows();
      this._render();
      this._lastRenderScrollTop = scrollTop;
    }
  }

  _renderViewport(first: number): void {
    const children = this._container.childNodes;
    for (let i = 1, n = children.length; i < n; i++) {
      const child = children[i] as HTMLElement;
      child.style.display = "none";
      child.setAttribute("data-clean", "");
    }
    const renderer = this._rendererFn as VirtualListRenderer | null;
    if (this._rowCount && renderer && this._rowHeight) {
      const last = Math.min(this._rowCount, first + this._cachedRows);
      const fragment = document.createDocumentFragment();
      for (let index = first; index < last; index++) {
        const row = document.createElement("div");
        row.classList.add("vrow");
        row.style.top = index * this._rowHeight + "px";
        renderer(index, row);
        fragment.appendChild(row);
      }
      this._container.appendChild(fragment);
    }
  }

  _requestViewportClean(): void {
    if (null === this._cleanViewportTimerId)
      this._cleanViewportTimerId = setTimeout(() => {
        if (Date.now() - this._lastCleanedTime > 100) {
          this._cleanViewport();
          this._lastCleanedTime = Date.now();
        }
        this._cleanViewportTimerId = null;
      }, 300);
  }

  /**
   * Removes the rows marked data-clean. The old code also ran jQuery's
   * cleanData over them to drop their jQuery handlers; the new rows have
   * only native listeners, which go with the elements.
   */
  _cleanViewport(): void {
    const rows = this._container.querySelectorAll("div[data-clean]");
    for (let i = 0, n = rows.length; i < n; i++) this._container.removeChild(rows[i] as Element);
  }
}
