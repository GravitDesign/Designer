import "../window.testing.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Container } from "../../shell/container.ts";
import { setContainer } from "../../shell/globals.ts";
import { setupDesigner } from "../actions.testing.ts";
import { setActionDesigner } from "../host.ts";
import { EnhancedTooltipsAction } from "../view/enhanced-tooltips-action.ts";
import { OpenLinkAction } from "./open-link-action.ts";
import { OpenWelcomeScreenAction } from "./open-welcome-screen-action.ts";
import { known } from "../view/view-host.ts";

let opened: unknown[][];
let stored: Map<string, unknown>;

beforeEach(() => {
  opened = [];
  stored = new Map();
  setContainer({
    openExternalLink: (...args: unknown[]) => opened.push(args),
    getProperty: (key: string) => Promise.resolve(stored.get(key)),
    setProperty: (key: string, value: unknown) => stored.set(key, value),
  } as unknown as Container);
});

afterEach(() => {
  setContainer(null);
  setActionDesigner(null);
  vi.unstubAllGlobals();
});

describe("Open link", () => {
  it("has one action per help link, in the old order, opening its address", () => {
    const actions = OpenLinkAction.Links.map((link) => new OpenLinkAction(link));
    expect(actions.map((action) => action.getId())).toEqual([
      "open-link.contact-us",
      "open-link.user-guide",
      "open-link.tutorials",
      "open-link.request-new-feature",
    ]);
    expect(actions.map((action) => action.getGroup())).toEqual([
      "help/support",
      "help/learn",
      "help/learn",
      "help",
    ]);
    known(actions[1]).execute();
    expect(opened).toEqual([[null, "/docs/index.html"]]);
  });

  it("prefers the builder's address and opens nothing without one", () => {
    const base = known(OpenLinkAction.Links[0]);
    new OpenLinkAction({ ...base, builder: () => "https://example.org/built" }).execute();
    new OpenLinkAction({ ...base, link: null }).execute();
    expect(opened).toEqual([[null, "https://example.org/built"]]);
  });
});

describe("Enhanced tooltips", () => {
  it("reads the stored state once, then flips and stores it", async () => {
    stored.set(EnhancedTooltipsAction.StoragePropertyName, false);
    const action = new EnhancedTooltipsAction();
    await Promise.resolve();
    expect(action.isChecked()).toBe(false);
    action.execute();
    expect(action.isChecked()).toBe(true);
    expect(stored.get("designer.settings.enhanced-tooltips.enabled")).toBe(true);
    expect(action.statsValue()).toBe("help.tooltip-visibility.on");
  });
});

describe("Open welcome screen", () => {
  it("is disabled while the welcome screen is open", () => {
    const fixture = setupDesigner();
    let open = false;
    const calls: unknown[] = [];
    Object.assign(fixture.designer, {
      getNewDocumentDialog: () => ({ isOpen: () => open }),
      getLicense: () => ({ canAccessFreemium: () => true }),
      openNewDocumentDialog: (options: unknown) => calls.push(options),
    });
    const action = new OpenWelcomeScreenAction();
    expect(action.isEnabled()).toBe(true);
    open = true;
    expect(action.isEnabled()).toBe(false);
    action.execute();
    expect(calls).toEqual([{ closable: true }]);
  });
});
