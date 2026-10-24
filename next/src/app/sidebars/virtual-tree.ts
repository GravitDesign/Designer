// Old: designer.browser.dev.js module 451 (GVirtualTreeNode, GVirtualTreeNodeNamed, GVirtualTree).
/**
 * The tree the layers, pages and selected panels show: a virtual list
 * whose rows are the visible nodes of a tree (expanded parents show their
 * children). Rows are draggable; while a row is dragged over another,
 * separators above or below it, or the insert-into style, show where it
 * would go, and a drop calls back the panel, which moves the scene nodes.
 *
 * On touch the drag is "animated": the dragged row moves between the
 * others while the finger moves (the drag and drop helper,
 * virtual-tree-dnd.ts) instead of showing separators.
 */
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { designer } from "../shell/globals.ts";
import { DragAndDropHelper } from "./virtual-tree-dnd.ts";
import { VirtualList, type VirtualRow } from "./virtual-list.ts";

const Change = { ExpandedSet: 1, ExpandedRemoved: 2 } as const;

/** What a tree node visitor returns: false stops the walk. */
export type TreeVisitor = (node: VirtualTreeNode) => unknown;

/** What a node's change goes up to at the top: the tree. */
interface ChangeHost {
  handleChange(change: number, node: VirtualTreeNode): void;
}

export class VirtualTreeNode {
  static _Change = Change;

  parent: VirtualTreeNode | null = null;
  previous: VirtualTreeNode | null = null;
  next: VirtualTreeNode | null = null;
  firstChild: VirtualTreeNode | null = null;
  lastChild: VirtualTreeNode | null = null;
  expanded: boolean | undefined = false;
  dragging = false;
  row: VirtualRow | null = null;
  /**
   * The tree, for the root node only. The old root had the tree as its
   * parent; the walks that go up stop at the first parent that isn't a
   * node, so keeping the tree apart changes nothing they see.
   */
  _host: ChangeHost | null = null;

  acceptChildren(
    visitor: TreeVisitor,
    expandedOnly?: boolean,
    reverse?: boolean,
    any?: boolean,
  ): boolean {
    let result: boolean;
    let out = !any;
    if (!expandedOnly || this.expanded) {
      if (reverse) {
        for (let child = this.lastChild; null != child; child = child.previous) {
          if (false === (result = child.accept(visitor, expandedOnly, reverse, any)) && !any)
            return false;
          if (true === result && any) out = true;
        }
      } else {
        for (let child = this.firstChild; null != child; child = child.next) {
          if (false === (result = child.accept(visitor, expandedOnly, reverse, any)) && !any)
            return false;
          if (true === result && any) out = true;
        }
      }
    }
    return out;
  }

  accept(visitor: TreeVisitor, expandedOnly?: boolean, reverse?: boolean, any?: boolean): boolean {
    return false !== visitor(this) && this.acceptChildren(visitor, expandedOnly, reverse, any);
  }

  getNestLevel(): number {
    let level = 0;
    for (let parent = this.parent; null != parent; parent = parent.parent) ++level;
    return level;
  }

  isVisible(): boolean {
    for (let parent = this.parent; parent; parent = parent.parent) {
      if (!parent.expanded) return false;
    }
    return true;
  }

  handleChange(change: number, node: VirtualTreeNode): void {
    if (change == Change.ExpandedSet || change == Change.ExpandedRemoved) {
      if (this.parent) this.parent.handleChange(change, node);
      else if (this._host) this._host.handleChange(change, node);
    }
  }

  /**
   * A click on the arrow. The change names are swapped (collapsing
   * reports ExpandedSet); both only make the tree render again.
   */
  handleExpand(event: { target: unknown }): void {
    const id = (event.target as { id?: string } | null)?.id;
    if (id === VirtualTree.COLLAPSE_ID && this.expanded) {
      this.expanded = false;
      this.handleChange(Change.ExpandedSet, this);
    } else if (id === VirtualTree.EXPAND_ID && !this.expanded) {
      this.expanded = true;
      this.handleChange(Change.ExpandedRemoved, this);
    }
  }

  getNodeCount(): number {
    let count = 0;
    this.accept(() => {
      ++count;
      return true;
    }, false);
    return count;
  }

  getBBox(): Rect {
    if (this.row) {
      const box = this.row.getBoundingClientRect();
      return new Rect(box.x, box.y, box.width, box.height);
    }
    return new Rect(0, 0, 0, 0);
  }

  /** The next row for Tab: the first child, the next sibling, or wrapping around. */
  getNextFocusableNode(): VirtualTreeNode | null {
    const parent = this.parent as VirtualTreeNode;
    return this.expanded
      ? this.firstChild
      : this.next ||
          (parent && parent.next) ||
          (parent.row ? (parent.parent as VirtualTreeNode).firstChild : parent.firstChild);
  }

  getPreviousFocusableNode(): VirtualTreeNode | null {
    const parent = this.parent as VirtualTreeNode;
    if (this.previous && this.previous.expanded) return this.previous.lastChild;
    if (!this.previous && parent.expanded && parent.row) return parent;
    const last = parent.lastChild as VirtualTreeNode;
    return this.previous || (last.expanded ? last.lastChild : last);
  }

  setDragging(dragging: boolean): void {
    this.accept((node) => {
      node.dragging = dragging;
    });
  }

  toString(): string {
    return "[GVirtualTreeNode]";
  }
}

/** A node with the panel's id for it; `expanded` starts undefined unless given. */
export class VirtualTreeNodeNamed extends VirtualTreeNode {
  id: string | null;

  constructor(id: string, expanded?: boolean) {
    super();
    this.id = id;
    this.expanded = expanded;
  }
}

/** The events the tree's row and drop handlers read. */
export interface TreeDropEvent {
  readonly layerY: number;
  readonly altKey?: boolean;
  readonly currentTarget: globalThis.EventTarget | null;
  readonly target: globalThis.EventTarget | null;
  preventDefault(): void;
  stopPropagation(): void;
}

/**
 * Whether the dragged nodes may go into parent before next (after
 * previous); `out` collects the indices the panel accepted.
 */
export type DropAllowedCallback = (
  parent: VirtualTreeNode,
  next: VirtualTreeNode | null,
  previous: VirtualTreeNode | null,
  dragNodes: VirtualTreeNode[],
  out: VirtualTreeNode[] | null,
) => boolean;

/** The nodes were dropped into parent, before next (after previous). */
export type DropCallback = (
  parent: VirtualTreeNode,
  next: VirtualTreeNode | null,
  previous: VirtualTreeNode | null,
  nodes: VirtualTreeNode[],
) => void;

export type TreeRenderer = (node: VirtualTreeNode, row: VirtualRow) => void;

const AutoScrollY = { OFF: 0, UP: 1, DOWN: 2 } as const;
const AutoScrollX = { OFF: 0, LEFT: 1, RIGHT: 2 } as const;
const ScrollAxisFlag = { X: 1, Y: 2 } as const;

/** Scrolls an element while a drag is near one of its edges. */
export class AutoScroll {
  static AUTO_SCROLL_Y = AutoScrollY;
  static AUTO_SCROLL_X = AutoScrollX;
  static SCROLL_AXIS_FLAG = ScrollAxisFlag;

  _elem: HTMLElement;
  _timerId: ReturnType<typeof setInterval> | null = null;
  _scrollDelay: number;
  _step: number;
  _axisFlag: number;
  _scAreaWidth: number;
  _aScrollEnabled = false;
  _aScrollY: number = AutoScrollY.OFF;
  _aScrollX: number = AutoScrollX.OFF;

  constructor(
    element: HTMLElement,
    scrollDelay?: number,
    step?: number,
    axisFlag?: number | null,
    areaWidth?: number,
  ) {
    this._elem = element;
    this._scrollDelay = scrollDelay || 30;
    this._step = step || 1;
    this._axisFlag = axisFlag || ScrollAxisFlag.Y | ScrollAxisFlag.X;
    this._scAreaWidth = areaWidth || 5;
    this._fixupHandler("onmouseout", this.offScrolls.bind(this));
    this._fixupHandler("ondragleave", this.offScrolls.bind(this));
  }

  enableAScroll(): void {
    this._aScrollEnabled = true;
    this._timerId = setInterval(this._tryScroll.bind(this), this._scrollDelay);
  }

  disableAScroll(): void {
    this._aScrollEnabled = false;
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }

  /** Starts or stops scrolling from where the drag is (layerX/Y up to the element). */
  takeOnOffAction(event: {
    layerX?: number;
    layerY: number;
    clientX?: number;
    clientY?: number;
    target: globalThis.EventTarget | null;
  }): void {
    if (!this._aScrollEnabled) return;
    if (event.layerY == event.clientY || event.layerX == event.clientX) {
      this._aScrollY = AutoScrollY.OFF;
      this._aScrollX = AutoScrollX.OFF;
      return;
    }
    let y = event.layerY;
    let x = event.layerX as number;
    let element = event.target as HTMLElement | null;
    for (
      ;
      element != this._elem && element;
      element = (element.offsetParent ? element.offsetParent : element.parentNode) as HTMLElement
    ) {
      if (element.offsetParent) {
        y += element.offsetTop;
        x += element.offsetLeft;
      }
    }
    if (!element) return;
    y -= this._elem.scrollTop;
    x -= this._elem.scrollLeft;
    if (this._axisFlag & ScrollAxisFlag.Y && x > 0 && x < this._elem.offsetWidth)
      this._aScrollY =
        y <= this._scAreaWidth
          ? AutoScrollY.UP
          : y >= this._elem.offsetHeight - this._scAreaWidth
            ? AutoScrollY.DOWN
            : AutoScrollY.OFF;
    if (this._axisFlag & ScrollAxisFlag.X && y > 0 && y < this._elem.offsetHeight)
      this._aScrollX =
        x <= this._scAreaWidth
          ? AutoScrollX.LEFT
          : x >= this._elem.offsetWidth - this._scAreaWidth
            ? AutoScrollX.RIGHT
            : AutoScrollX.OFF;
  }

  offScrolls(event: globalThis.Event): void {
    if (event.target === this._elem) {
      this._aScrollY = AutoScrollY.OFF;
      this._aScrollX = AutoScrollX.OFF;
    }
  }

  _tryScroll(): void {
    if (this._aScrollY !== AutoScrollY.OFF || this._aScrollX !== AutoScrollX.OFF) {
      if (this._aScrollY) {
        const direction = this._aScrollY == AutoScrollY.UP ? -1 : 1;
        this._elem.scrollTop += this._step * direction;
      }
      if (this._aScrollX) {
        const direction = this._aScrollX == AutoScrollX.LEFT ? -1 : 1;
        this._elem.scrollLeft += this._step * direction;
      }
    }
  }

  /** Sets elem[on...] to the handler, chained before one that is already there. */
  _fixupHandler(
    name: "onmouseout" | "ondragleave",
    handler: (event: globalThis.Event) => void,
  ): void {
    const element = this._elem as unknown as Record<string, unknown>;
    const existing = element[name] as ((this: unknown, ...args: unknown[]) => unknown) | null;
    if (existing) {
      element[name] = function (this: unknown, ...args: unknown[]) {
        handler.apply(this, args as [globalThis.Event]);
        return existing.apply(this, args);
      };
    } else element[name] = handler;
  }
}

/** Walks the visible rows (or all nodes) by 1-based index. */
class IdxIterator {
  _vtree: VirtualTree;
  _firstIdx: number;
  _lastIdx: number;
  _visibleOnly: boolean;
  _curNode: VirtualTreeNode | null = null;
  _curIdx = 0;

  constructor(tree: VirtualTree, first?: number, last?: number, visibleOnly?: boolean) {
    this._vtree = tree;
    this._firstIdx = first || 1;
    this._lastIdx = visibleOnly
      ? last && last <= this._vtree._rowCount
        ? last
        : this._vtree._rowCount
      : last && last <= this._vtree._nodeCount
        ? last
        : this._vtree._nodeCount;
    this._visibleOnly = !!visibleOnly;
  }

  getFirstNode(): VirtualTreeNode | null {
    if (this._firstIdx <= this._lastIdx) {
      this._curIdx = this._firstIdx;
      this._curNode = this._vtree._getNodeByIdx(this._curIdx, this._visibleOnly);
    } else {
      this._curIdx = this._lastIdx + 1;
      this._curNode = null;
    }
    return this._curNode;
  }

  getNext(): VirtualTreeNode | null {
    if (!this._curIdx) return this.getFirstNode();
    this._curIdx = this._curIdx <= this._lastIdx ? this._curIdx + 1 : this._curIdx;
    this._curNode =
      this._curIdx <= this._lastIdx && this._curNode
        ? this._vtree.getNextNode(this._curNode, this._visibleOnly)
        : null;
    return this._curNode;
  }
}

export class VirtualTree extends VirtualList {
  static DEFAULT_ROW_STYLE = "vrow";
  static DEFAULT_INSERTINTO_STYLE = "insertInto";
  static DEFAULT_LINE_HEIGHT = 30;
  static DEFAULT_FREEZONE_HEIGHT = 7;
  static DEFAULT_UP_SEPARATOR_SPAN1_STYLE = "up-separator-span1";
  static DEFAULT_DOWN_SEPARATOR_SPAN1_STYLE = "down-separator-span1";
  static COLLAPSE_ID = "clpsId";
  static EXPAND_ID = "xpndId";
  static ROW_ID = "rowId";
  static LOWER_SEP_ID = "lsepId";
  static UPPER_SEP_ID = "usepId";
  static IdxIterator = IdxIterator;
  static _DragAndDropHelper = DragAndDropHelper;

  _root!: VirtualTreeNode;
  _nodeCount = 0;
  _rowStyle!: string;
  _rootIndentation!: number;
  _indentation!: number;
  _bottomPadding!: number;
  _containerWidth = 0;
  _expandedWidth = 0;
  _expandStyle: string | null = null;
  _dragNodes: VirtualTreeNode[] | null = null;
  _freeHeight!: number;
  _upSeparatorStyle: string | null = null;
  /** Never set (the old code measured a class "undefined"); see _initComputedVals. */
  _downSeparatorStyle: string | undefined = undefined;
  _insertIntoStyle!: string;
  _upSeparatorSpan1Style!: string;
  _upSeparatorSpan2Style: string | null = null;
  _downSeparatorSpan1Style!: string;
  _downSeparatorSpan2Style: string | null = null;
  _downSepHeight = 0;
  _dropAllowedCallback: DropAllowedCallback | null = null;
  _dropCallback: DropCallback | null = null;
  _renderFinishCallback: (() => void) | null = null;
  _dragStartPt: Point | null = null;
  _dragLastPt: Point | null = null;
  _dragBBox: Rect | null = null;
  _dragOffset: Point | null = null;
  _dragNode: VirtualTreeNode | null = null;
  _dragAndDropHelper: DragAndDropHelper | null = null;
  _animatedDragEnabled = false;
  _dragByMouse = false;
  _isDuplicateEffectCallback: ((event: TreeDropEvent) => boolean) | null = null;
  _duplicateCallback: DropCallback | null = null;
  _clickCallback: ((node: VirtualTreeNode) => void) | null = null;
  _expandCallback: ((node: VirtualTreeNode) => void) | null = null;
  _putLastChildWhenInside = false;
  _invalidationRequestTimerId: ReturnType<typeof setTimeout> | null = null;
  _focusTimerId: ReturnType<typeof setTimeout> | null = null;
  _updateMarksTimerId: ReturnType<typeof setTimeout> | null = null;
  _aScroll!: AutoScroll;
  _freeZone: VirtualRow | null = null;
  _lastVisitedDroppable: VirtualRow | null = null;

  /**
   * The old constructor's 23 positional arguments, in their order: the
   * container, the row renderer, the row class, the arrow renderer and
   * class, the separator renderer, the drop zone height, the insert-into
   * class, the drop-allowed and drop callbacks, the duplicate test and
   * callback, the click and expand callbacks, the four separator span
   * classes, whether a drop inside appends, the root and per-level
   * indentation, the bottom padding of a row and the render-finished
   * callback.
   */
  constructor(
    container: HTMLElement,
    renderer: TreeRenderer,
    rowStyle?: string | null,
    expandRenderer?: ((element: HTMLElement) => void) | null,
    expandStyle?: string | null,
    separatorRenderer?: ((element: HTMLElement, level: number) => void) | null,
    freeHeight?: number,
    insertIntoStyle?: string | null,
    dropAllowedCallback?: DropAllowedCallback | null,
    dropCallback?: DropCallback | null,
    isDuplicateEffectCallback?: ((event: TreeDropEvent) => boolean) | null,
    duplicateCallback?: DropCallback | null,
    clickCallback?: ((node: VirtualTreeNode) => void) | null,
    expandCallback?: ((node: VirtualTreeNode) => void) | null,
    upSeparatorSpan1Style?: string | null,
    upSeparatorSpan2Style?: string | null,
    downSeparatorSpan1Style?: string | null,
    downSeparatorSpan2Style?: string | null,
    putLastChildWhenInside?: boolean,
    rootIndentation?: number,
    indentation?: number,
    bottomPadding?: number,
    renderFinishCallback?: (() => void) | null,
  ) {
    // The old code set up the root and the indentation before the list
    // constructor ran; that constructor renders nothing for an empty tree,
    // so setting them right after it gives the same result.
    super(container, renderer as (...args: never[]) => void, 0, 0);
    this._root = new VirtualTreeNode();
    this._root.expanded = true;
    this._root._host = this;
    this._rootIndentation = rootIndentation || 15;
    this._indentation = indentation || 15;
    this._bottomPadding = bottomPadding || 0;
    this._container.classList.add("g-virtual-tree");
    this._rowStyle = rowStyle || VirtualTree.DEFAULT_ROW_STYLE;
    this._freeHeight = isNaN(freeHeight as number)
      ? VirtualTree.DEFAULT_FREEZONE_HEIGHT
      : (freeHeight as number);
    this._insertIntoStyle = insertIntoStyle || VirtualTree.DEFAULT_INSERTINTO_STYLE;
    this._upSeparatorSpan1Style =
      upSeparatorSpan1Style || VirtualTree.DEFAULT_UP_SEPARATOR_SPAN1_STYLE;
    this._downSeparatorSpan1Style =
      downSeparatorSpan1Style || VirtualTree.DEFAULT_DOWN_SEPARATOR_SPAN1_STYLE;
    this._initComputedVals();
    if (expandStyle) this._expandStyle = expandStyle;
    if (expandRenderer) this._expandRenderer = expandRenderer;
    if (separatorRenderer) this._separatorRenderer = separatorRenderer;
    if (upSeparatorSpan2Style) this._upSeparatorSpan2Style = upSeparatorSpan2Style;
    if (downSeparatorSpan2Style) this._downSeparatorSpan2Style = downSeparatorSpan2Style;
    if (dropAllowedCallback) this._dropAllowedCallback = dropAllowedCallback;
    if (dropCallback) this._dropCallback = dropCallback;
    if (isDuplicateEffectCallback && duplicateCallback) {
      this._isDuplicateEffectCallback = isDuplicateEffectCallback;
      this._duplicateCallback = duplicateCallback;
    }
    if (clickCallback) this._clickCallback = clickCallback;
    if (expandCallback) this._expandCallback = expandCallback;
    if (renderFinishCallback) this._renderFinishCallback = renderFinishCallback;
    this._putLastChildWhenInside = !!putLastChildWhenInside;
    this._aScroll = new AutoScroll(this._container, 200, 10, null, 7);
  }

  /** The row renderer as the tree calls it (node and row). */
  get _renderer(): TreeRenderer | null {
    return this._rendererFn as TreeRenderer | null;
  }

  override endUpdate(immediately?: boolean): void {
    if (0 == --this._updateCounter) this.requestInvalidation(immediately);
  }

  override refresh(): unknown {
    this._initComputedVals();
    this.requestInvalidation(true);
    return undefined;
  }

  /**
   * Expands the node's parents and scrolls it into view. False when a
   * scroll is still pending from an earlier call.
   */
  expandAndFocus(node: VirtualTreeNode, noInvalidate?: boolean): boolean {
    let index = 0;
    for (let parent: VirtualTreeNode = node; parent.parent && parent.parent !== this._root;) {
      parent = parent.parent;
      if (!parent.expanded) {
        parent.expanded = true;
        if (this._expandCallback) this._expandCallback(parent);
      }
    }
    if (this._focusTimerId) return false;
    this._root.acceptChildren((other) => other !== node && (index++, true), true);
    if (!noInvalidate) this.invalidate();
    const top = index * this._rowHeight;
    const scrollTop = this._container.scrollTop;
    if (0 === this._visibleRows) this._updateVisibleRows();
    if (scrollTop > top || top - scrollTop >= this._rowHeight * this._visibleRows)
      // The old code bound 50 as an argument of the callback instead of
      // passing it as the delay; see "Layer rows scroll into view on the
      // next tick, not after 50 ms" in QUESTIONS.md.
      this._focusTimerId = setTimeout(() => {
        this._container.scrollTop = top;
        this._focusTimerId = null;
      });
    return true;
  }

  requestInvalidation(immediately?: boolean): void {
    if (immediately) {
      if (!this._updateCounter) {
        this.invalidate();
        if (this._renderFinishCallback) this._renderFinishCallback();
      }
    } else if (!this._updateCounter && null === this._invalidationRequestTimerId) {
      this._invalidationRequestTimerId = setTimeout(() => {
        this.requestInvalidation(true);
        this._invalidationRequestTimerId = null;
      }, 25);
    }
  }

  handleChange(change: number): void {
    if (change == Change.ExpandedSet || change == Change.ExpandedRemoved)
      this.requestInvalidation(true);
  }

  invalidate(): void {
    this._updateRowCount();
    this._updateVisibleRows();
    this._updateScroller();
    this._requestViewportClean();
    this._render();
    this._lastRenderScrollTop = this._container.scrollTop;
  }

  getNextNode(node: VirtualTreeNode, visibleOnly?: boolean): VirtualTreeNode | null {
    let current = node;
    let next: VirtualTreeNode | null = null;
    if (visibleOnly) for (; current.parent && !current.parent.expanded;) current = current.parent;
    if (current.firstChild && !(visibleOnly && !current.expanded)) next = current.firstChild;
    if (!next && current.next) next = current.next;
    if (!next)
      for (
        let parent = current.parent;
        !next && parent && parent !== this._root;
        parent = parent.parent
      )
        if (parent.next) next = parent.next;
    return next;
  }

  appendNode(parent: VirtualTreeNode | null, node: VirtualTreeNode): this {
    return this._insertNodeBefore(parent || this._root, null, node);
  }

  prependNode(parent: VirtualTreeNode | null, node: VirtualTreeNode): this {
    return this._insertNodeBefore(
      parent || this._root,
      parent ? parent.firstChild : this._root.firstChild,
      node,
    );
  }

  insertNodeBefore(reference: VirtualTreeNode, node: VirtualTreeNode): this {
    return this._insertNodeBefore(reference.parent as VirtualTreeNode, reference, node);
  }

  insertNodeAfter(reference: VirtualTreeNode, node: VirtualTreeNode): this {
    return this._insertNodeBefore(
      reference.parent as VirtualTreeNode,
      reference.next ? reference.next : null,
      node,
    );
  }

  removeNode(node: VirtualTreeNode): void {
    if (node.parent) {
      if (node.parent.firstChild == node) node.parent.firstChild = node.next;
      if (node.parent.lastChild == node) node.parent.lastChild = node.previous;
    }
    if (null != node.previous) node.previous.next = node.next;
    if (null != node.next) node.next.previous = node.previous;
    const parent = node.parent;
    if (parent) {
      node.parent = null;
      node.previous = null;
      node.next = null;
      if (node.firstChild) this._nodeCount -= node.getNodeCount();
      else --this._nodeCount;
      if (node.expanded && node.firstChild) this._updateRowCount();
      else if (parent.expanded) --this._rowCount;
      if (parent.expanded && !parent.firstChild && parent !== this._root && parent.expanded) {
        parent.handleChange(Change.ExpandedRemoved, parent);
        parent.expanded = false;
        if (this._expandCallback) this._expandCallback(parent);
      }
      if (parent.expanded) this.requestInvalidation();
    }
  }

  clean(): void {
    this._nodeCount = 0;
    this._rowCount = 0;
    this._root = new VirtualTreeNode();
    this._root.expanded = true;
    this._root._host = this;
    this._dragNodes = null;
    this.requestInvalidation(true);
  }

  acceptChildren(
    visitor: TreeVisitor,
    expandedOnly?: boolean,
    reverse?: boolean,
    any?: boolean,
  ): boolean {
    return this._root.acceptChildren(visitor, expandedOnly, reverse, any);
  }

  getLastVisitedDroppable(): VirtualRow | null {
    return this._lastVisitedDroppable;
  }

  override _updateScroller(): void {
    this._scroller.style.height =
      (this._rowCount * this._rowHeight + this._freeHeight).toString() + "px";
    if (this._scroller.scrollHeight < this._container.clientHeight)
      this._scroller.style.borderRight = "none";
    else this._scroller.style.borderRight = "";
  }

  _isDragging(): boolean {
    return !!this._dragNode;
  }

  override _renderViewport(first: number): void {
    const fresh = !this.isAnimatedDragEnabled() || !this._isDragging();
    const children = this._container.childNodes;
    if (fresh) {
      this._freeZone = null;
      this._lastVisitedDroppable = null;
      for (let i = 1, n = children.length; i < n; i++) {
        const child = children[i] as HTMLElement;
        child.style.display = "none";
        child.setAttribute("data-clean", "");
      }
    }
    const renderer = this._renderer;
    if (!(this._rowCount && renderer && this._rowHeight)) return;
    const last = Math.min(this._rowCount, first + this._cachedRows);
    const fragment = document.createDocumentFragment();
    const iterator = new IdxIterator(this, first + 1, last, true);
    let index = first;
    for (let node = iterator.getFirstNode(); null != node; node = iterator.getNext(), ++index) {
      const existing = node.row;
      const row: VirtualRow = !fresh && existing ? existing : document.createElement("div");
      row.id = VirtualTree.ROW_ID;
      row.classList.add(this._rowStyle);
      row.style.top = (index * this._rowHeight).toString() + "px";
      const padding = this._rootIndentation + this._indentation * (node.getNestLevel() - 1);
      row.style.paddingLeft = padding.toString() + "px";
      if (node.expanded || node.firstChild) {
        const arrow = document.createElement("span");
        arrow.id = node.expanded ? VirtualTree.COLLAPSE_ID : VirtualTree.EXPAND_ID;
        if (this._expandStyle) arrow.classList.add(this._expandStyle);
        this._expandRenderer(arrow);
        if (fresh || !existing) row.appendChild(arrow);
      }
      if (this.isAnimatedDragEnabled()) {
        row.classList.add("g-drag-vrow");
        row.classList.toggle("g-drag-mouse", !!this._dragByMouse);
        row.classList.toggle("g-dragging", !!node.dragging);
      } else {
        row.classList.remove("g-drag-vrow");
        row.classList.remove("g-drag-mouse");
        row.classList.remove("g-dragging");
      }
      if (fresh || !existing) {
        const target = node;
        row.addEventListener("click", (event) => this._nodeClick(target, event));
        row.setAttribute("draggable", "true");
        row.addEventListener("draginit", (event) =>
          this._nodeDragInit(target, event as unknown as PointerLike),
        );
        row.addEventListener("dragstart", (event) => this._nodeDragStart(target, event));
        row.addEventListener("dragend", (event) => this._nodeDragEnd(target, event));
        if (!this.isAnimatedDragEnabled()) {
          row.addEventListener("dragenter", (event) => this._nodeDragEnter(target, event));
          row.addEventListener("dragover", (event) => this._nodeDragOver(target, event));
          row.addEventListener("dragleave", (event) => this._nodeDragLeave(target, event));
          row.addEventListener("dragexit", () => this._nodeDragExit());
          row.addEventListener("drop", (event) => this._nodeDrop(target, event as TreeDropEvent));
        }
        row._specCounter = 0;
        row._hasStyle = false;
        node.row = row;
        renderer(node, row);
        fragment.appendChild(row);
      } else if (!fresh) {
        if (row.hasAttribute("data-clean")) {
          row.removeAttribute("data-clean");
          row.style.display = "";
        }
        if (!row.parentNode) fragment.appendChild(row);
      }
    }
    if (last == this._rowCount && !this.isAnimatedDragEnabled()) {
      const zone: VirtualRow = document.createElement("div");
      zone.style.position = "absolute";
      zone.style.height = this._freeHeight.toString() + "px";
      zone.style.top = (last * this._rowHeight).toString() + "px";
      const root = this._root;
      zone.addEventListener("dragenter", (event) => this._nodeDragEnter(root, event));
      zone.addEventListener("dragover", (event) => this._nodeDragOver(root, event));
      zone.addEventListener("dragleave", (event) => this._nodeDragLeave(root, event));
      zone.addEventListener("drop", (event) => this._nodeDrop(root, event as TreeDropEvent));
      fragment.appendChild(zone);
      this._freeZone = zone;
    }
    this._container.appendChild(fragment);
    this._expandedWidth = this._container.scrollWidth;
    for (let i = 1, n = children.length; i < n; i++) {
      const child = children[i] as HTMLElement;
      if ("none" !== child.style.display) {
        // The old code read the computed style first (it forced a style pass).
        getComputedStyle(child);
        child.style.width = this._expandedWidth + "px";
      }
    }
  }

  /** Measures the row height from the row class (20px when it has none). */
  _initComputedVals(): void {
    this._containerWidth = parseInt(String(this._container.clientWidth));
    const probe = document.createElement("div");
    probe.classList.add(this._rowStyle);
    probe.style.visibility = "hidden";
    this._container.appendChild(probe);
    const height = parseInt(getComputedStyle(probe).height);
    this._rowHeight = (height || 20) + this._bottomPadding;
    const separator = document.createElement("div");
    // _downSeparatorStyle is never set, so this adds the class "undefined",
    // as the old code did.
    separator.classList.add(String(this._downSeparatorStyle));
    separator.style.display = "none";
    probe.appendChild(separator);
    this._downSepHeight = parseInt(getComputedStyle(separator).height);
    this._expandedWidth = this._container.scrollWidth;
    this._container.removeChild(probe);
  }

  _insertNodeBefore(
    parent: VirtualTreeNode,
    before: VirtualTreeNode | null,
    node: VirtualTreeNode,
  ): this {
    node.parent = parent;
    if (null != before) {
      node.next = before;
      node.previous = before.previous;
      before.previous = node;
      if (null == node.previous) parent.firstChild = node;
      else node.previous.next = node;
    } else {
      if (null != parent.lastChild) {
        node.previous = parent.lastChild;
        parent.lastChild.next = node;
        parent.lastChild = node;
      }
      node.next = null;
    }
    if (null == parent.firstChild) {
      parent.firstChild = node;
      node.previous = null;
      node.next = null;
    }
    if (null == node.next) parent.lastChild = node;
    if (node.firstChild) this._nodeCount += node.getNodeCount();
    else ++this._nodeCount;
    if (node.expanded && node.firstChild) this._updateRowCount();
    else if (parent.expanded) ++this._rowCount;
    if (parent.expanded || (!parent.expanded && parent.firstChild == parent.lastChild))
      this.requestInvalidation();
    return this;
  }

  _expandRenderer(element: HTMLElement): void {
    if (element.id === VirtualTree.COLLAPSE_ID) element.innerHTML = "&#9660;";
    else if (element.id === VirtualTree.EXPAND_ID) element.innerHTML = "&#9658;";
  }

  // The level is the old second argument; the default renderer ignores it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the renderer signature
  _separatorRenderer(element: HTMLElement, _level: number): void {
    const width = this._expandedWidth || this._container.scrollWidth;
    element.style.width = width.toString() + "px";
    element.style.height = this._freeHeight.toString() + "px";
    element.style.position = "absolute";
    element.style.pointerEvents = "none";
    const first = document.createElement("span");
    let second: string | null;
    if (element.id == VirtualTree.UPPER_SEP_ID) {
      first.classList.add(this._upSeparatorSpan1Style);
      second = this._upSeparatorSpan2Style ? this._upSeparatorSpan2Style : null;
      element.style.top = "0px";
    } else {
      first.classList.add(this._downSeparatorSpan1Style);
      second = this._downSeparatorSpan2Style ? this._downSeparatorSpan2Style : null;
      element.style.top = (this._rowHeight - this._freeHeight).toString() + "px";
    }
    element.appendChild(first);
    getComputedStyle(first);
    if (second) {
      const span = document.createElement("span");
      span.classList.add(second);
      element.appendChild(span);
    }
  }

  _updateRowCount(): void {
    let count = 0;
    this._root.acceptChildren(() => {
      ++count;
      return true;
    }, true);
    this._rowCount = count;
  }

  _getNodeByIdx(index: number, visibleOnly?: boolean): VirtualTreeNode | null {
    let count = 0;
    let found: VirtualTreeNode | null = null;
    this._root.acceptChildren((node) => {
      if (++count != index) return true;
      found = node;
      return false;
    }, visibleOnly);
    return found;
  }

  _nodeHasSomeParent(node: VirtualTreeNode, parent: VirtualTreeNode): boolean {
    let found = false;
    for (let current = node.parent; current && !found; current = current.parent)
      found = current === parent;
    return found;
  }

  _nodeClick(node: VirtualTreeNode, event: globalThis.Event): void {
    const id = (event.target as { id?: string } | null)?.id;
    if (
      (!node.expanded && !node.firstChild) ||
      (id !== VirtualTree.COLLAPSE_ID && id !== VirtualTree.EXPAND_ID)
    ) {
      if (this._clickCallback) {
        event.stopPropagation();
        this._clickCallback(node);
      }
    } else {
      event.stopPropagation();
      node.handleExpand(event);
      if (this._expandCallback) this._expandCallback(node);
    }
  }

  setDragNodes(nodes: VirtualTreeNode[] | null): void {
    if (nodes && nodes.length) this._dragNodes = nodes.slice();
  }

  setAnimatedDragEnabled(enabled: boolean): void {
    if (this._animatedDragEnabled !== enabled) {
      this._animatedDragEnabled = enabled;
      this.requestInvalidation(true);
    }
  }

  isAnimatedDragEnabled(): boolean {
    return this._animatedDragEnabled;
  }

  override _onScroll(event: globalThis.Event): void {
    if (this.isAnimatedDragEnabled() && this._isDragging()) event.preventDefault();
    else super._onScroll(event);
  }

  _nodeDragInit(node: VirtualTreeNode, event: PointerLike): void {
    if (!this.isAnimatedDragEnabled()) return;
    this._dragNode = node;
    this._dragBBox = node.getBBox();
    this._dragStartPt = new Point(event.clientX, event.clientY);
    this._dragOffset = this._dragStartPt.subtract(this._dragBBox.getSide(Rect.Side.TOP_LEFT));
    this._dragAndDropHelper = new DragAndDropHelper(this);
  }

  _nodeDragStart(node: VirtualTreeNode, event: globalThis.Event): void {
    const drag = event as DragEvent;
    if (!this._dragNodes) this._dragNodes = [node];
    drag.dataTransfer?.setData("text/plain", "some_dummy_data");
    (drag.target as Element).classList.add("g-drag");
    if (this.isAnimatedDragEnabled()) {
      this._dragByMouse = !!drag.isTrusted;
      if (!this._dragNode) this._nodeDragInit(node, drag);
      document.addEventListener("drag", this._drag, true);
      node.setDragging(true);
      this.requestInvalidation(true);
    } else this._aScroll.enableAScroll();
  }

  _moveDown(node: VirtualTreeNode, offset: Point): void {
    if (node === this._dragNode || !this._dragAndDropHelper) return;
    if (Math.abs(offset.getY()) > this._freeHeight) {
      if (this._canDropInside(node)) this._dragAndDropHelper.setDroppableNodeInside(node);
    } else if (this._canDropLower(node)) this._dragAndDropHelper.setDroppableNodeLower(node);
  }

  _moveUp(node: VirtualTreeNode, offset: Point): void {
    if (node === this._dragNode || !this._dragAndDropHelper) return;
    if (offset.getY() > this._freeHeight) {
      if (this._canDropInside(node)) this._dragAndDropHelper.setDroppableNodeInside(node);
    } else if (this._canDropUpper(node)) this._dragAndDropHelper.setDroppableNodeUpper(node);
  }

  _canDropUpper(node: VirtualTreeNode): boolean {
    const free = (this._dragNode as VirtualTreeNode).row === this._freeZone;
    return this._dropHereAllowed(node) && this._dropUpperAllowed(node, 0, null, free);
  }

  _canDropLower(node: VirtualTreeNode): boolean {
    return this._dropHereAllowed(node) && this._dropLowerAllowed(node, this._rowHeight);
  }

  _canDropInside(node: VirtualTreeNode): boolean {
    return this._dropHereAllowed(node) && node !== this._root && this._dropInsideAllowed(node);
  }

  _getOffset(node: VirtualTreeNode, box: Rect): Point {
    const topLeft = node.getBBox().getSide(Rect.Side.TOP_LEFT);
    return box.getSide(Rect.Side.TOP_LEFT).subtract(topLeft);
  }

  /** The animated drag: which row the dragged one overlaps now. */
  _drag = (event: globalThis.Event): void => {
    if (!this._dragAndDropHelper) return;
    const { clientX, clientY } = event as DragEvent;
    const point = new Point(clientX, clientY);
    const delta = point.subtract((this._dragLastPt || this._dragStartPt) as Point);
    const dy = parseInt(String(delta.getY()));
    if (0 === dy) return;
    this._dragLastPt = new Point(clientX, clientY);
    const topLeft = point.subtract(this._dragOffset as Point);
    const dragBox = this._dragBBox as Rect;
    const box = new Rect(topLeft.getX(), topLeft.getY(), dragBox.getWidth(), dragBox.getHeight());
    const hits: VirtualTreeNode[] = [];
    this._root.acceptChildren((node) => {
      if (this._dragNode !== node) {
        if (node.getBBox().intersectsRect(box)) hits.push(node);
        else if (hits.length > 0) return false;
      }
      return undefined;
    }, true);
    this._dragAndDropHelper.setDroppableNodeInside(null);
    const down = dy > 0;
    if (1 === hits.length) {
      const hit = hits[0] as VirtualTreeNode;
      const offset = this._getOffset(hit, box);
      if (down) this._moveDown(hit, offset);
      else this._moveUp(hit, offset);
    } else if (2 === hits.length) {
      if (down) {
        const hit = hits[1] as VirtualTreeNode;
        this._moveDown(hit, this._getOffset(hit, box));
      } else {
        const hit = hits[0] as VirtualTreeNode;
        this._moveUp(hit, this._getOffset(hit, box));
      }
    }
  };

  _nodeDragEnd(node: VirtualTreeNode, event: globalThis.Event): void {
    document.removeEventListener("drag", this._drag, true);
    designer().setItemDraggingState(false);
    const target = event.target as Element | null;
    const dragged = target && target.closest ? target.closest(".g-drag") : null;
    if (dragged) dragged.classList.remove("g-drag");
    if (this.isAnimatedDragEnabled()) {
      node.setDragging(false);
      (this._dragAndDropHelper as DragAndDropHelper).drop();
      this._dragNode = null;
      this._dragAndDropHelper = null;
      this.expandAndFocus(node, true);
      this.requestInvalidation(true);
    }
  }

  _nodeDragEnter(node: VirtualTreeNode, event: globalThis.Event): boolean {
    const drag = event as DragEvent;
    drag.preventDefault();
    drag.stopPropagation();
    designer().setItemDraggingState(true);
    if (this._updateMarksTimerId) clearTimeout(this._updateMarksTimerId);
    const row = drag.currentTarget as VirtualRow;
    if (designer().isTouchEnabled()) this._updateMarks(node, row, drag.layerY, true);
    else {
      const layerY = drag.layerY;
      this._updateMarksTimerId = setTimeout(() => this._updateMarks(node, row, layerY, true), 10);
    }
    this._lastVisitedDroppable = row;
    return false;
  }

  _nodeDragOver(node: VirtualTreeNode, event: globalThis.Event): boolean {
    const drag = event as DragEvent;
    drag.preventDefault();
    drag.stopPropagation();
    if (this._updateMarksTimerId) clearTimeout(this._updateMarksTimerId);
    const row = drag.currentTarget as VirtualRow;
    if (designer().isTouchEnabled()) this._updateMarks(node, row, drag.layerY, false);
    else {
      const layerY = drag.layerY;
      this._updateMarksTimerId = setTimeout(() => this._updateMarks(node, row, layerY, false), 10);
    }
    this._aScroll.takeOnOffAction(drag);
    return false;
  }

  _nodeDragExit(): void {
    for (const element of this._container.querySelectorAll(".g-drag"))
      element.classList.remove("g-no-drop");
  }

  _nodeDragLeave(_node: VirtualTreeNode, event: globalThis.Event): boolean {
    const drag = event as DragEvent;
    drag.preventDefault();
    drag.stopPropagation();
    const row = drag.currentTarget as VirtualRow;
    if (row._hasStyle) {
      if (!row._specCounter || row._specCounter <= 1) {
        row._specCounter = 0;
        row.classList.remove(this._insertIntoStyle);
        this._rowRemoveSep(row, VirtualTree.LOWER_SEP_ID);
        this._rowRemoveSep(row, VirtualTree.UPPER_SEP_ID);
        this._aScroll.takeOnOffAction(drag);
      } else --row._specCounter;
    }
    return false;
  }

  _nodeDrop(node: VirtualTreeNode, event: TreeDropEvent): boolean {
    event.preventDefault();
    event.stopPropagation();
    const row = (
      this._lastVisitedDroppable ? this._lastVisitedDroppable : event.currentTarget
    ) as VirtualRow;
    const y = event.layerY;
    row._specCounter = 0;
    if (this._dropHereAllowed(node)) {
      row.classList.remove(this._insertIntoStyle);
      this._rowRemoveSep(row, VirtualTree.LOWER_SEP_ID);
      this._rowRemoveSep(row, VirtualTree.UPPER_SEP_ID);
      row._hasStyle = false;
      let nodes: VirtualTreeNode[] = [];
      const free = row === this._freeZone;
      const duplicate = () =>
        !!this._isDuplicateEffectCallback && this._isDuplicateEffectCallback(event);
      if (this._dropUpperAllowed(node, y, nodes, free)) {
        if (!nodes.length) nodes = this._dragNodes as VirtualTreeNode[];
        if (duplicate()) {
          const callback = this._duplicateCallback as DropCallback;
          if (node !== this._root)
            callback(
              node.parent as VirtualTreeNode,
              node,
              node.previous ? node.previous : null,
              nodes,
            );
          else callback(this._root, null, free ? node.lastChild : null, nodes);
        } else {
          this.beginUpdate();
          for (let i = 0; i < nodes.length; ++i) this.removeNode(nodes[i] as VirtualTreeNode);
          if (node !== this._root) {
            if (this._dropCallback)
              this._dropCallback(
                node.parent as VirtualTreeNode,
                node,
                node.previous ? node.previous : null,
                nodes,
              );
            for (let i = 0; i < nodes.length; ++i)
              this.insertNodeBefore(node, nodes[i] as VirtualTreeNode);
          } else {
            if (this._dropCallback)
              this._dropCallback(this._root, null, free ? node.lastChild : null, nodes);
            for (let i = 0; i < nodes.length; ++i)
              this.appendNode(node, nodes[i] as VirtualTreeNode);
          }
          this._dragNodes = null;
          this.endUpdate();
        }
      } else if (this._dropLowerAllowed(node, y, nodes)) {
        if (!nodes.length) nodes = this._dragNodes as VirtualTreeNode[];
        if (duplicate())
          (this._duplicateCallback as DropCallback)(
            node.parent as VirtualTreeNode,
            node.next ? node.next : null,
            node,
            nodes,
          );
        else {
          this.beginUpdate();
          for (let i = 0; i < nodes.length; ++i) this.removeNode(nodes[i] as VirtualTreeNode);
          if (this._dropCallback)
            this._dropCallback(
              node.parent as VirtualTreeNode,
              node.next ? node.next : null,
              node,
              nodes,
            );
          for (let i = nodes.length; i > 0; --i)
            this.insertNodeAfter(node, nodes[i - 1] as VirtualTreeNode);
          this._dragNodes = null;
          this.endUpdate();
        }
      } else if (this._dropInsideAllowed(node, nodes, free)) {
        if (!nodes.length) nodes = this._dragNodes as VirtualTreeNode[];
        if (duplicate()) (this._duplicateCallback as DropCallback)(node, null, null, nodes);
        else {
          this.beginUpdate();
          for (let i = 0; i < nodes.length; ++i) this.removeNode(nodes[i] as VirtualTreeNode);
          if (this._dropCallback)
            this._dropCallback(node, null, free ? node.lastChild : null, nodes);
          if (this._putLastChildWhenInside || free)
            for (let i = 0; i < nodes.length; ++i)
              this.appendNode(node, nodes[i] as VirtualTreeNode);
          else
            for (let i = nodes.length; i > 0; --i)
              this.prependNode(node, nodes[i - 1] as VirtualTreeNode);
          this._dragNodes = null;
          this.endUpdate();
        }
      }
    }
    this._dragNodes = null;
    this._aScroll.disableAScroll();
    return false;
  }

  _dropHereAllowed(node: VirtualTreeNode): boolean {
    const dragNodes = this._dragNodes;
    let allowed: boolean | number | null = dragNodes && dragNodes.length;
    for (let i = 0; allowed && dragNodes && i < dragNodes.length; ++i) {
      const dragged = dragNodes[i] as VirtualTreeNode;
      allowed = dragged !== node && !this._nodeHasSomeParent(node, dragged);
    }
    return !!allowed;
  }

  _dropUpperAllowed(
    node: VirtualTreeNode,
    y: number,
    out: VirtualTreeNode[] | null,
    free?: boolean,
  ): boolean {
    const dragNodes = this._dragNodes as VirtualTreeNode[];
    let allowed =
      y <= this._freeHeight &&
      (dragNodes.length > 1 || node !== (dragNodes[0] as VirtualTreeNode).next);
    if (allowed && this._dropAllowedCallback)
      allowed =
        (node !== this._root &&
          this._dropAllowedCallback(
            node.parent as VirtualTreeNode,
            node,
            node.previous ? node.previous : null,
            dragNodes,
            out,
          )) ||
        (node === this._root && this._dropInsideAllowed(node, out, free));
    return allowed;
  }

  _dropLowerAllowed(node: VirtualTreeNode, y: number, out?: VirtualTreeNode[] | null): boolean {
    const dragNodes = this._dragNodes as VirtualTreeNode[];
    let allowed =
      y >= this._rowHeight - this._freeHeight &&
      !node.expanded &&
      node !== this._root &&
      (dragNodes.length > 1 || dragNodes[0] !== node.next);
    if (allowed && this._dropAllowedCallback)
      allowed = this._dropAllowedCallback(
        node.parent as VirtualTreeNode,
        node.next ? node.next : null,
        node,
        dragNodes,
        out === undefined ? null : out,
      );
    return allowed;
  }

  _dropInsideAllowed(
    node: VirtualTreeNode,
    out?: VirtualTreeNode[] | null,
    free?: boolean,
  ): boolean {
    const last = free || this._putLastChildWhenInside;
    const dragNodes = this._dragNodes as VirtualTreeNode[];
    const first = dragNodes[0] as VirtualTreeNode;
    let allowed =
      dragNodes.length > 1 ||
      !(
        first.parent === node &&
        ((last && node.lastChild === first) || (!last && node.firstChild === first))
      );
    if (allowed && this._dropAllowedCallback)
      allowed = this._dropAllowedCallback(
        node,
        last ? null : node.firstChild,
        last ? node.lastChild : null,
        dragNodes,
        out === undefined ? null : out,
      );
    return allowed;
  }

  _drawUpperSeparator(node: VirtualTreeNode, row: VirtualRow): void {
    const level = node === this._root ? 0 : node.getNestLevel() - 1;
    this._rowAddSep(row, VirtualTree.UPPER_SEP_ID, level);
  }

  _drawLowerSeparator(node: VirtualTreeNode, row: VirtualRow): void {
    const level = node.getNestLevel() - 1;
    this._rowAddSep(row, VirtualTree.LOWER_SEP_ID, level);
  }

  /** Shows where a drop at this height of the row would go. */
  _updateMarks(node: VirtualTreeNode, row: VirtualRow, y: number, entering: boolean): void {
    let noDrop = true;
    if (this._dropHereAllowed(node)) {
      const free = row === this._freeZone;
      if (this._dropUpperAllowed(node, y, null, free)) {
        noDrop = false;
        if (!this._rowHasSep(row, VirtualTree.UPPER_SEP_ID)) {
          this._rowRemoveSep(row, VirtualTree.LOWER_SEP_ID);
          row._specCounter = 0;
          row.classList.remove(this._insertIntoStyle);
          this._drawUpperSeparator(node, row);
        }
      } else if (this._dropLowerAllowed(node, y)) {
        noDrop = false;
        if (!this._rowHasSep(row, VirtualTree.LOWER_SEP_ID)) {
          this._rowRemoveSep(row, VirtualTree.UPPER_SEP_ID);
          row._specCounter = 0;
          row.classList.remove(this._insertIntoStyle);
          this._drawLowerSeparator(node, row);
        }
      } else if (node !== this._root && this._dropInsideAllowed(node)) {
        noDrop = false;
        this._rowRemoveSep(row, VirtualTree.LOWER_SEP_ID);
        this._rowRemoveSep(row, VirtualTree.UPPER_SEP_ID);
        row.classList.add(this._insertIntoStyle);
        row._hasStyle = true;
        if (entering) row._specCounter = row._specCounter ? row._specCounter + 1 : 1;
      }
    }
    for (const element of this._container.querySelectorAll(".g-drag"))
      element.classList.toggle("g-no-drop", noDrop);
  }

  _rowHasSep(row: HTMLElement, id: string): boolean {
    for (let i = 1, n = row.childNodes.length; i < n; i++)
      if ((row.childNodes[i] as Element).id === id) return true;
    return false;
  }

  _rowAddSep(row: VirtualRow, id: string, level: number): void {
    const separator = document.createElement("div");
    separator.id = id;
    this._separatorRenderer(separator, level);
    if (id == VirtualTree.UPPER_SEP_ID) row.insertBefore(separator, row.firstChild);
    else row.appendChild(separator);
    row._hasStyle = true;
  }

  _rowRemoveSep(row: HTMLElement, id: string): void {
    for (let i = row.childNodes.length - 1; i >= 0; --i)
      if ((row.childNodes[i] as Element).id === id) row.removeChild(row.childNodes[i] as ChildNode);
  }

  /**
   * The panels pass the height as a string ("34", "48"); see "The layers
   * and pages lists keep their row height as a string" in QUESTIONS.md.
   */
  resetRowHeight(height: number | string): void {
    this._rowHeight = height as number;
  }

  setFreeHeight(height: number): void {
    this._freeHeight = height;
  }

  override toString(): string {
    return "[GVirtualTree]";
  }
}

/** What the drag init event (touch press and hold) and a drag event carry. */
interface PointerLike {
  clientX: number;
  clientY: number;
}
