// Old: designer.browser.dev.js module 1699 (an unnamed draggable-point helper).
/**
 * Lets the user drag an element with the mouse: a press on it starts the
 * drag, every move calls `onMove` with the pointer and the element's
 * place, mouse up ends it, removes every listener (also the press
 * listener, so it works once) and calls `onUp`. The eye dropper uses it
 * for its touch-mode loupe. The element is made `position: absolute`.
 *
 *     const helper = new DragHelper(element, (p) => place(p.elementX, p.elementY), done);
 *     helper.moveTo(x, y, true);   // as if the pointer were at x, y
 */

/** Where the pointer and the dragged element are, in page coordinates. */
export interface DragPosition {
  /** The element's left/top for this pointer position. */
  elementX: number;
  elementY: number;
  /** The pointer minus half the press offset (what the old code called the centre). */
  centerX: number;
  centerY: number;
  pageX: number;
  pageY: number;
}

export class DragHelper {
  readonly element: HTMLElement;
  readonly mouseMoveCallback: (position: DragPosition) => void;
  readonly mouseUpCallback: (event: MouseEvent) => void;
  private _offsetX = 0;
  private _offsetY = 0;

  constructor(
    element: HTMLElement,
    onMove?: ((position: DragPosition) => void) | null,
    onUp?: ((event: MouseEvent) => void) | null,
  ) {
    this.element = element;
    this.mouseMoveCallback = onMove || (() => undefined);
    this.mouseUpCallback = onUp || (() => undefined);
    this.init();
  }

  init(): void {
    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._onDragStart = this._onDragStart.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this.element.addEventListener("mousedown", this._handleMouseDown);
    this.element.style.position = "absolute";
  }

  private _updateElementOffset(x: number, y: number): void {
    const rect = this.element.getBoundingClientRect();
    this._offsetX = x - rect.left;
    this._offsetY = y - rect.top;
  }

  private _resetElementOffset(): void {
    this._offsetX = 0;
    this._offsetY = 0;
  }

  /** Both offsets must be non-zero to count (a press on the left or top edge measures again). */
  private _hasElementOffset(): boolean {
    return !!this._offsetX && !!this._offsetY;
  }

  private _handleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this._resetElementOffset();
    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("mouseup", this._onMouseUp);
    this.element.addEventListener("dragstart", this._onDragStart);
    this.moveTo(event.pageX, event.pageY);
  }

  /**
   * Reports the pointer at `x`, `y`. The press offset is measured on the
   * first move; `resetOffset` drops it, so the element's corner follows
   * the point.
   */
  moveTo(x: number, y: number, resetOffset?: boolean): void {
    if (resetOffset) this._resetElementOffset();
    else if (!this._hasElementOffset()) this._updateElementOffset(x, y);
    this.mouseMoveCallback({
      elementX: x - this._offsetX,
      elementY: y - this._offsetY,
      centerX: x - this._offsetX / 2,
      centerY: y - this._offsetY / 2,
      pageX: x,
      pageY: y,
    });
  }

  private _onMouseMove(event: MouseEvent): void {
    this.moveTo(event.pageX, event.pageY);
  }

  private _onDragStart(): boolean {
    // Returned false to a native listener, which cancels nothing; kept.
    return false;
  }

  private _onMouseUp(event: MouseEvent): void {
    this.unmount();
    this.mouseUpCallback(event);
  }

  unmount(): void {
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("mouseup", this._onMouseUp);
    this.element.removeEventListener("mousedown", this._handleMouseDown);
    this.element.removeEventListener("dragstart", this._onDragStart);
  }
}
