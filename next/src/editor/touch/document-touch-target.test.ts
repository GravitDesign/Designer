import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentTouchTarget } from "./document-touch-target.ts";
import { FakeTarget, installTouchGlobals, touchAt, touchEvent } from "./touch-testing.ts";

/** A focusable element that records focus and blur calls. */
class FocusableElement extends FakeTarget {
  calls: string[] = [];
  type?: string;
  tabIndex = -1;
  constructor(private readonly page: FakePage) {
    super();
  }
  focus(): void {
    this.calls.push("focus");
    this.page.activeElement = this;
  }
  blur(): void {
    this.calls.push("blur");
    if (this.page.activeElement === this) this.page.activeElement = null;
  }
}

type FakePage = FakeTarget & { activeElement: unknown; hasFocus(): boolean };

let page: FakePage;
const defaultIsInputBox = DocumentTouchTarget.isInputBox;
beforeEach(() => {
  page = Object.assign(installTouchGlobals(), {
    activeElement: null as unknown,
    hasFocus: () => true,
  });
  vi.useFakeTimers();
});
afterEach(() => {
  DocumentTouchTarget.isInputBox = defaultIsInputBox;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Lifts a finger on `element` (after a move of 30 pixels when `moved`). */
function tap(element: FocusableElement, moved = false): void {
  const down = touchAt(1, 100, 100, element);
  page.fire(touchEvent("touchstart", [down], [down]));
  const up = moved ? touchAt(1, 130, 100, element) : down;
  if (moved) page.fire(touchEvent("touchmove", [up], [up]));
  page.fire(touchEvent("touchend", [], [up]));
}

function setup(): { input: FocusableElement; other: FocusableElement } {
  new DocumentTouchTarget(page as unknown as EventTarget);
  const input = new FocusableElement(page);
  input.type = "text";
  const other = new FocusableElement(page);
  other.type = "button";
  return { input, other };
}

describe("DocumentTouchTarget focus on touch end", () => {
  it("blurs the focused element and focuses the lifted finger's target", () => {
    const { input, other } = setup();
    page.activeElement = other;
    tap(input);
    expect(other.calls).toEqual(["blur"]);
    expect(input.calls).toEqual(["focus"]);
  });

  it("leaves an element that already has the focus alone", () => {
    const { input } = setup();
    page.activeElement = input;
    tap(input);
    expect(input.calls).toEqual([]);
  });

  it("focuses an active element that isn't focusable again, without blurring it", () => {
    const { input } = setup();
    // No type, href or tab index: jQuery's :focus doesn't match it.
    input.type = undefined;
    page.activeElement = input;
    tap(input);
    expect(input.calls).toEqual(["focus"]);
  });

  it("focuses again when the document doesn't have the focus", () => {
    const { input } = setup();
    page.activeElement = input;
    page.hasFocus = () => false;
    tap(input);
    expect(input.calls).toEqual(["focus"]);
  });

  it("focuses after a move when the hook says it isn't an input box (the default)", () => {
    const { input, other } = setup();
    page.activeElement = other;
    tap(input, true);
    expect(other.calls).toEqual(["blur"]);
    expect(input.calls).toEqual(["focus"]);
  });

  // The hook's contract: it gets the lifted touch's target and answers
  // whether that element is an input box (the old gInputBox data on it).
  it("doesn't focus or blur when a finger moved on an input box and lifted", () => {
    const { input, other } = setup();
    const asked: unknown[] = [];
    DocumentTouchTarget.isInputBox = (element) => {
      asked.push(element);
      return element === (input as unknown as EventTarget);
    };
    page.activeElement = other;
    tap(input, true);
    expect(asked).toEqual([input]);
    expect(other.calls).toEqual([]);
    expect(input.calls).toEqual([]);
    // Tapped without a move, the input box takes the focus.
    tap(input);
    expect(other.calls).toEqual(["blur"]);
    expect(input.calls).toEqual(["focus"]);
  });
});
