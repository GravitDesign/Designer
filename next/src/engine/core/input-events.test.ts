import { describe, expect, it } from "vitest";
import { Point } from "../math/point.ts";
import { EventTarget } from "./event-target.ts";
import { KeyEvent } from "./key-event.ts";
import { ModifiersChangedEvent } from "./modifiers-changed-event.ts";
import { MouseEvent } from "./mouse-event.ts";
import { getTypeId } from "./object.ts";

describe("MouseEvent", () => {
  it("recognizes drag events and drag event classes", () => {
    expect(MouseEvent.isDragEvent(new MouseEvent.DragStart())).toBe(true);
    expect(MouseEvent.isDragEvent(new MouseEvent.Drag())).toBe(true);
    expect(MouseEvent.isDragEvent(new MouseEvent.DragEnd())).toBe(true);
    expect(MouseEvent.isDragEvent(MouseEvent.DragEnd)).toBe(true);
    expect(MouseEvent.isDragEvent(new MouseEvent.Down())).toBe(false);
    expect(MouseEvent.isDragEvent(MouseEvent.Move)).toBe(false);
    expect(MouseEvent.isDragEvent(null)).toBe(false);
  });

  it("keeps DragEnd a Drag but a separate event type", () => {
    const end = new MouseEvent.DragEnd();
    expect(end).toBeInstanceOf(MouseEvent.Drag);
    expect(getTypeId(MouseEvent.DragEnd)).not.toBe(getTypeId(MouseEvent.Drag));
    const target = new EventTarget();
    const log: string[] = [];
    target.addEventListener(MouseEvent.Drag, () => log.push("drag"));
    target.addEventListener(MouseEvent.DragEnd, () => log.push("end"));
    target.trigger(end);
    expect(log).toEqual(["end"]);
  });

  it("gives every event class its own type id", () => {
    const classes = [
      MouseEvent,
      MouseEvent.Wheel,
      MouseEvent.Move,
      MouseEvent.Enter,
      MouseEvent.Leave,
      MouseEvent.Down,
      MouseEvent.Release,
      MouseEvent.Click,
      MouseEvent.DblClick,
      MouseEvent.DragStart,
      MouseEvent.Drag,
      MouseEvent.DragEnd,
      KeyEvent,
      KeyEvent.Down,
      KeyEvent.Release,
      KeyEvent.Press,
      ModifiersChangedEvent,
    ];
    const ids = new Set(classes.map((c) => getTypeId(c)));
    expect(ids.size).toBe(classes.length);
    expect(ids.has(null)).toBe(false);
  });

  it("prints the old toString", () => {
    const down = new MouseEvent.Down();
    down.client = new Point(1, 2);
    expect(String(down)).toBe(
      "[Object GMouseEvent.Down(client=" + String(new Point(1, 2)) + ", )]",
    );
    expect(String(new MouseEvent())).toBe("[Object GMouseEvent(client=0, )]");
    const key = new KeyEvent.Press();
    key.key = "A";
    key.keyUTF = "a";
    key.timestamp = 5;
    expect(String(key)).toBe("[Object GKeyEvent.Press(key=A keyUTF:a timestamp:5)]");
    expect(String(new KeyEvent())).toBe("[Object GKeyEvent(key=null)]");
    expect(String(new ModifiersChangedEvent())).toBe("[Object GModifiersChangedEvent]");
  });

  it("has the old button constants", () => {
    expect([MouseEvent.BUTTON_LEFT, MouseEvent.BUTTON_MIDDLE, MouseEvent.BUTTON_RIGHT]).toEqual([
      0, 1, 2,
    ]);
    expect([MouseEvent.BUTTONS_LEFT, MouseEvent.BUTTONS_RIGHT, MouseEvent.BUTTONS_MIDDLE]).toEqual([
      1, 2, 4,
    ]);
    expect(new MouseEvent.Wheel().deltaY).toBe(0);
    expect(new MouseEvent.Click().clickCount).toBe(0);
  });
});
