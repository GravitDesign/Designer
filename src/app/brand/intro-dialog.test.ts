import type { ReactElement } from "react";
import type { Container } from "../shell/container.ts";
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
const { OpenLegacyAction } = await import("./open-legacy-action.ts");
const { brandActions } = await import("./brand-actions.ts");
const { setActiveBranding } = await import("./branding.ts");
const { Category } = await import("../actions/category.ts");
const { setContainer } = await import("../shell/globals.ts");

function openIntros(): unknown[] {
  return dom.document.querySelectorAll(".g-dialog.gd-intro-dialog");
}

/** The markup of the island rendered into the element with this class. */
function islandHtml(className: string): string {
  const island = islands.rendered.findLast((r) =>
    (r.element as FakeElement).classList.contains(className),
  );
  return renderToStaticMarkup(island?.content as ReactElement);
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

  it("can't be closed on the first start until the box is ticked", () => {
    const intro = IntroDialog.showOnFirstStart();
    const dialog = intro?.getDialog();
    // Escape and the backdrop only close closable dialogs.
    expect(dialog?.closable).toBe(false);
    const footer = islandHtml("g-dialog-footer");
    expect(footer).toContain('<input type="checkbox"/>');
    expect(footer).toContain("I understand that this is a different app");
    expect(footer).toContain('<button class="primary" disabled="">Got it</button>');
    intro?.confirm(true);
    expect(dialog?.closable).toBe(true);
    intro?.confirm(false);
    expect(dialog?.closable).toBe(false);
  });

  it("counts Escape and the backdrop as read too (any close)", () => {
    const intro = IntroDialog.showOnFirstStart();
    intro?.confirm();
    intro?.getDialog().close(true);
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
    const html = islandHtml("g-dialog-content");
    expect(html).toContain("This is not the Gravit you know");
    expect(html).toContain("community rebuild of Gravit Designer");
    expect(html).toContain("no account, no cloud and no subscription");
    for (const gone of ["cloud sync", "sharing and comments", "templates from the cloud", "Pro"])
      expect(html).toContain(gone);
    expect(html).toContain('href="https://github.com/GravitDesign/designer/issues"');
    expect(html).toContain('href="https://legacy.gravitdesign.com"');
    expect(html).toContain("Help &gt; About GravitDesign Next");
  });
});

describe("Help > About GravitDesign Next", () => {
  it("is an action only in the next look", () => {
    expect(brandActions().map((a) => a.getId())).toEqual([ShowIntroAction.ID, OpenLegacyAction.ID]);
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
    // Read before: closable, no box to tick.
    expect(IntroDialog.current()?.getDialog().closable).toBe(true);
    expect(islandHtml("g-dialog-footer")).toBe(
      '<div class="buttons"><button class="primary">Got it</button></div>',
    );
    expect(action.isEnabled()).toBe(false);
    action.execute();
    expect(openIntros()).toHaveLength(1);
    IntroDialog.current()?.close();
    vi.runAllTimers();
    expect(action.isEnabled()).toBe(true);
  });
});

describe("Help > Open the Old Gravit Designer", () => {
  it("opens legacy.gravitdesign.com outside the app", () => {
    const opened: string[] = [];
    setContainer({
      openExternalLink: (_event: unknown, url: string) => opened.push(url),
    } as unknown as Container);
    const action = new OpenLegacyAction();
    expect(action.getTitle()).toBe("Open the Old Gravit Designer");
    expect(action.getCategory()).toBe(Category.CATEGORY_HELP);
    action.execute();
    expect(opened).toEqual(["https://legacy.gravitdesign.com"]);
    setContainer(null);
  });
});
