import { describe, expect, it } from "vitest";
import { Window } from "./window.ts";

/** An overlay element that keeps its click listeners and counts remove(). */
function fakeOverlay() {
  const listeners: (() => void)[] = [];
  const holder = { replaceChildren() {} };
  return {
    listeners,
    removed: 0,
    addEventListener(type: string, listener: () => void) {
      if ("click" === type) listeners.push(listener);
    },
    removeEventListener(type: string, listener: () => void) {
      const index = listeners.indexOf(listener);
      if ("click" === type && index >= 0) listeners.splice(index, 1);
    },
    querySelector: () => holder,
    remove() {
      this.removed++;
    },
    click() {
      for (const listener of [...listeners]) listener();
    },
  };
}

/** Window._setOverlayContent on a window that has only its overlay parts. */
function overlayWindow() {
  const overlay = fakeOverlay();
  const window = Object.create(Window.prototype) as Record<string, unknown>;
  Object.assign(window, { _overlay: overlay, _container: { appendChild() {} } });
  const show = (content: unknown, closeOnClick?: boolean) =>
    (window._setOverlayContent as (c: unknown, close?: boolean) => unknown).call(
      window,
      content,
      closeOnClick,
    );
  return { overlay, show };
}

describe("Window overlay (module 1503)", () => {
  it("closes a cancelable overlay on a click", () => {
    const { overlay, show } = overlayWindow();
    show({}, true);
    overlay.click();
    expect(overlay.removed).toBe(1);
  });

  it("keeps a later overlay open on a click after a cancelable one (BUG-143)", () => {
    const { overlay, show } = overlayWindow();
    show({}, true);
    show(null);
    show({});
    overlay.click();
    expect(overlay.removed).toBe(1);
    expect(overlay.listeners).toHaveLength(0);
  });

  it("keeps a later overlay open after a cancelable one closed on a click (BUG-143)", () => {
    const { overlay, show } = overlayWindow();
    show({}, true);
    overlay.click();
    show({});
    overlay.click();
    expect(overlay.removed).toBe(1);
  });
});
