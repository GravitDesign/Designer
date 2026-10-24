import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DragHelper, type DragPosition } from "./drag-helper.ts";
import { fire, installFakeDom, type FakeElement } from "./fake-dom.testing.ts";

let body: FakeElement;

beforeEach(() => {
  body = installFakeDom().body;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup() {
  const element = document.createElement("canvas") as unknown as FakeElement;
  body.appendChild(element);
  element.rect = { left: 100, top: 50, width: 40, height: 40 };
  const moves: DragPosition[] = [];
  const ups: unknown[] = [];
  const helper = new DragHelper(
    element as unknown as HTMLElement,
    (position) => moves.push(position),
    (event) => ups.push(event),
  );
  return { element, helper, moves, ups };
}

describe("DragHelper (UI-FIELD-172)", () => {
  it("makes the element absolute and measures the press offset on the first move", () => {
    const { element, helper, moves } = setup();
    expect(element.style.getPropertyValue("position")).toBe("absolute");
    helper.moveTo(110, 70);
    expect(moves[0]).toEqual({
      elementX: 100,
      elementY: 50,
      centerX: 105,
      centerY: 60,
      pageX: 110,
      pageY: 70,
    });
    // The offset stays for later moves.
    helper.moveTo(210, 170);
    expect(moves[1]).toMatchObject({ elementX: 200, elementY: 150 });
  });

  it("drops the offset with resetOffset, so the corner follows the point", () => {
    const { helper, moves } = setup();
    helper.moveTo(110, 70);
    helper.moveTo(300, 300, true);
    expect(moves[1]).toMatchObject({ elementX: 300, elementY: 300, centerX: 300 });
  });

  it("measures again when one offset is 0 (a press on the left edge)", () => {
    const { element, helper, moves } = setup();
    helper.moveTo(100, 70);
    element.rect = { left: 0, top: 0, width: 40, height: 40 };
    helper.moveTo(30, 30);
    expect(moves[1]).toMatchObject({ elementX: 0, elementY: 0 });
  });

  it("follows the mouse from a press until mouse up, then stops listening", () => {
    const { element, moves, ups } = setup();
    const down = fire(element, "mousedown", { pageX: 120, pageY: 60 });
    expect(down.defaultPrevented).toBe(true);
    fire(document, "mousemove", { pageX: 130, pageY: 80 });
    expect(moves.map((m) => [m.elementX, m.elementY])).toEqual([
      [100, 50],
      [110, 70],
    ]);
    fire(document, "mouseup", { pageX: 130, pageY: 80 });
    expect(ups.length).toBe(1);
    fire(document, "mousemove", { pageX: 400, pageY: 400 });
    // The press listener is gone too.
    fire(element, "mousedown", { pageX: 120, pageY: 60 });
    expect(moves.length).toBe(2);
  });
});
