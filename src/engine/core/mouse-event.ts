// Old: chunk.vendor.js module 77 (GMouseEvent).
/**
 * Mouse events of the scene views and tools. Each kind is its own class
 * and event type (`MouseEvent.Down`, `MouseEvent.Drag`, ...). DragEnd
 * extends Drag, so `instanceof MouseEvent.Drag` is true for both, but a
 * listener for Drag doesn't receive DragEnd (they have different type ids).
 *
 * The name shadows the DOM `MouseEvent` in files that import it; use
 * `globalThis.MouseEvent` there for the DOM one.
 */
import { InputEvent } from "./input-event.ts";
import type { Point } from "../math/point.ts";
import { registerClass } from "./object.ts";

export class MouseEvent extends InputEvent {
  static {
    registerClass(this, "GMouseEvent");
  }

  static readonly BUTTON_LEFT = 0;
  static readonly BUTTON_MIDDLE = 1;
  static readonly BUTTON_RIGHT = 2;

  static readonly BUTTONS_UNDEF = 0;
  static readonly BUTTONS_LEFT = 1;
  static readonly BUTTONS_RIGHT = 2;
  static readonly BUTTONS_MIDDLE = 4;

  declare static Wheel: typeof MouseWheelEvent;
  declare static Move: typeof MouseMoveEvent;
  declare static Enter: typeof MouseEnterEvent;
  declare static Leave: typeof MouseLeaveEvent;
  declare static Down: typeof MouseDownEvent;
  declare static Release: typeof MouseReleaseEvent;
  declare static Click: typeof MouseClickEvent;
  declare static DblClick: typeof MouseDblClickEvent;
  declare static DragStart: typeof MouseDragStartEvent;
  declare static Drag: typeof MouseDragEvent;
  declare static DragEnd: typeof MouseDragEndEvent;

  /**
   * Whether `value` is a drag event or one of the three drag event classes.
   */
  static isDragEvent(value: unknown): boolean {
    return (
      (value instanceof MouseEvent &&
        (value instanceof MouseEvent.DragStart ||
          value instanceof MouseEvent.Drag ||
          value instanceof MouseEvent.DragEnd)) ||
      value == MouseEvent.DragStart ||
      value == MouseEvent.Drag ||
      value == MouseEvent.DragEnd
    );
  }

  /**
   * The position in view coordinates. The views always set a point; the
   * old prototype default was the number 0, set below the class.
   */
  declare client: Point;
  button = 0;
  /** Set on Drag and DragEnd; the old code declared both on every mouse event. */
  declare clientStart: Point;
  declare clientDelta: Point;

  override toString(): string {
    return "[Object GMouseEvent(" + this._paramsToString() + ")]";
  }

  protected override _paramsToString(): string {
    return "client=" + String(this.client) + ", " + super._paramsToString();
  }
}

export class MouseWheelEvent extends MouseEvent {
  static {
    registerClass(this, "GMouseEvent.Wheel");
  }

  deltaX = 0;
  deltaY = 0;
  zoom = false;

  override toString(): string {
    return "[Object GMouseEvent.Wheel(" + this._paramsToString() + ")]";
  }
}

export class MouseMoveEvent extends MouseEvent {
  static {
    registerClass(this, "GMouseEvent.Move");
  }

  override toString(): string {
    return "[Object GMouseEvent.Move(" + this._paramsToString() + ")]";
  }
}

export class MouseEnterEvent extends MouseEvent {
  static {
    registerClass(this, "GMouseEvent.Enter");
  }

  override toString(): string {
    return "[Object GMouseEvent.Enter(" + this._paramsToString() + ")]";
  }
}

export class MouseLeaveEvent extends MouseEvent {
  static {
    registerClass(this, "GMouseEvent.Leave");
  }

  override toString(): string {
    return "[Object GMouseEvent.Leave(" + this._paramsToString() + ")]";
  }
}

export class MouseDownEvent extends MouseEvent {
  static {
    registerClass(this, "GMouseEvent.Down");
  }

  clickCount = 0;

  override toString(): string {
    return "[Object GMouseEvent.Down(" + this._paramsToString() + ")]";
  }
}

export class MouseReleaseEvent extends MouseEvent {
  static {
    registerClass(this, "GMouseEvent.Release");
  }

  clickCount = 0;

  override toString(): string {
    return "[Object GMouseEvent.Release(" + this._paramsToString() + ")]";
  }
}

export class MouseClickEvent extends MouseEvent {
  static {
    registerClass(this, "GMouseEvent.Click");
  }

  clickCount = 0;

  override toString(): string {
    return "[Object GMouseEvent.Click(" + this._paramsToString() + ")]";
  }
}

export class MouseDblClickEvent extends MouseEvent {
  static {
    registerClass(this, "GMouseEvent.DblClick");
  }

  override toString(): string {
    return "[Object GMouseEvent.DblClick(" + this._paramsToString() + ")]";
  }
}

export class MouseDragStartEvent extends MouseEvent {
  static {
    registerClass(this, "GMouseEvent.DragStart");
  }

  override toString(): string {
    return "[Object GMouseEvent.DragStart(" + this._paramsToString() + ")]";
  }
}

export class MouseDragEvent extends MouseEvent {
  static {
    registerClass(this, "GMouseEvent.Drag");
  }

  override toString(): string {
    return "[Object GMouseEvent.Drag(" + this._paramsToString() + ")]";
  }
}

export class MouseDragEndEvent extends MouseDragEvent {
  static {
    registerClass(this, "GMouseEvent.DragEnd");
  }

  override toString(): string {
    return "[Object GMouseEvent.DragEnd(" + this._paramsToString() + ")]";
  }
}

// The old defaults (the number 0) for the points, until a view sets them.
const unsetPoint = 0 as unknown as Point;
MouseEvent.prototype.client = unsetPoint;
MouseEvent.prototype.clientStart = unsetPoint;
MouseEvent.prototype.clientDelta = unsetPoint;

MouseEvent.Wheel = MouseWheelEvent;
MouseEvent.Move = MouseMoveEvent;
MouseEvent.Enter = MouseEnterEvent;
MouseEvent.Leave = MouseLeaveEvent;
MouseEvent.Down = MouseDownEvent;
MouseEvent.Release = MouseReleaseEvent;
MouseEvent.Click = MouseClickEvent;
MouseEvent.DblClick = MouseDblClickEvent;
MouseEvent.DragStart = MouseDragStartEvent;
MouseEvent.Drag = MouseDragEvent;
MouseEvent.DragEnd = MouseDragEndEvent;
