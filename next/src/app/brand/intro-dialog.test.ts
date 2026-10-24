import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeElement, installFakeDom } from "../menus/testing/fake-dom.testing.ts";

/** What the React islands of the dialog rendered. */
const islands = vi.hoisted(() => ({ rendered: [] as { element: unknown; content: unknown }[] }));

vi.mock("../state/islands.tsx", () => ({
  renderInto: (element: unknown, content: unknown) => {
    islands.rendered.push({ element, content });
    return {
      render: (next: unknown) => islands.rendered.push({ element, content: next }),
      unmount: () => {},
    };
  },
}));

const dom = installFakeDom();
(globalThis as Record<string, unknown>).HTMLElement ??= FakeElement;
const store = new Map<string, string>();
Object.assign(globalThis.window as unknown as Record<string, unknown>, {
  location: { host: "127.0.0.1", search: "" },
  localStorage: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  },
});

const { IntroDialog, INTRO_SHOWN_KEY, introWasShown } = await import("./intro-dialog.ts");
const { ShowIntroAction } = await import("./show-intro-action.ts");
const { brandActions } = await import("./brand-actions.ts");
const { setActiveBranding } = await import("./branding.ts");
const { Category } = await import("../actions/category.ts");

function openIntros(): unknown[] {
  return dom.document.querySelectorAll(".g-dialog.gd-intro-dialog");
}

beforeEach(() => {
  vi.useFakeTimers();
  store.clear();
  setActiveBranding("next");
});

afterEach(() => {
  IntroDialog.current()?.close();
  vi.runAllTimers();
  vi.useRealTimers();
  dom.document.body.replaceChildren();
  islands.rendered.length = 0;
  setActiveBranding("classic");
});

describe("the introduction", () => {
  it("opens on the first start in the next look and not again once closed", () => {
    const intro = IntroDialog.showOnFirstStart();
    expect(intro).not.toBeNull();
    expect(openIntros()).toHaveLength(1);
    expect(introWasShown()).toBe(false);
    intro?.close();
    vi.runAllTimers();
    expect(openIntros()).toHaveLength(0);
    expect(store.get(INTRO_SHOWN_KEY)).toBe("true");
    expect(IntroDialog.showOnFirstStart()).toBeNull();
    expect(openIntros()).toHaveLength(0);
  });

  it("counts Escape and the backdrop as read too (any close)", () => {
    IntroDialog.showOnFirstStart()?.getDialog().close(true);
    expect(introWasShown()).toBe(true);
  });

  it("never opens by itself in the classic look", () => {
    setActiveBranding("classic");
    expect(IntroDialog.showOnFirstStart()).toBeNull();
    expect(openIntros()).toHaveLength(0);
    expect(store.size).toBe(0);
  });

  it("says plainly what this app is, what's gone and where to report problems", () => {
    IntroDialog.show();
    const view = islands.rendered.find((r) =>
      (r.element as FakeElement).classList.contains("g-dialog-content"),
    );
    const html = renderToStaticMarkup(view?.content as ReactElement);
    expect(html).toContain("This is not the Gravit you know");
    expect(html).toContain("community rebuild of Gravit Designer");
    expect(html).toContain("no account, no cloud and no subscription");
    for (const gone of ["cloud sync", "sharing and comments", "templates from the cloud", "Pro"])
      expect(html).toContain(gone);
    expect(html).toContain('href="https://github.com/GravitDesign/designer/issues"');
    expect(html).toContain("Help &gt; About GravitDesign Next");
  });
});

describe("Help > About GravitDesign Next", () => {
  it("is an action only in the next look", () => {
    expect(brandActions().map((a) => a.getId())).toEqual([ShowIntroAction.ID]);
    setActiveBranding("classic");
    expect(brandActions()).toEqual([]);
  });

  it("opens the introduction again after it was read, and is disabled while it is open", () => {
    store.set(INTRO_SHOWN_KEY, "true");
    expect(IntroDialog.showOnFirstStart()).toBeNull();
    const action = new ShowIntroAction();
    expect(action.getTitle()).toBe("About GravitDesign Next");
    expect(action.getCategory()).toBe(Category.CATEGORY_HELP);
    expect(action.isEnabled()).toBe(true);
    action.execute();
    expect(openIntros()).toHaveLength(1);
    expect(action.isEnabled()).toBe(false);
    action.execute();
    expect(openIntros()).toHaveLength(1);
    IntroDialog.current()?.close();
    vi.runAllTimers();
    expect(action.isEnabled()).toBe(true);
  });
});
