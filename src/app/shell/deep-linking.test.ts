import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { beforeUnload, openStartDialogs } from "./bootstrap.ts";
import { BrowserContainer } from "./browser-container.ts";
import { DeepLinking } from "./container.ts";

const g = globalThis as unknown as Record<string, unknown>;
let pushState: ReturnType<typeof vi.fn>;
let savedWindow: unknown;

function at(href: string): void {
  const url = new URL(href);
  pushState = vi.fn();
  g.window = { location: { href, pathname: url.pathname }, history: { pushState } };
}

beforeEach(() => {
  savedWindow = g.window;
});

afterEach(() => {
  g.window = savedWindow;
});

describe("GContainer.handleDeepLinking (module 85, module 1374)", () => {
  it("finds the first known link and keeps every parameter as an option", () => {
    at("http://localhost/app?x=1&pwainstall&directlink=abc");
    expect(new BrowserContainer().handleDeepLinking()).toEqual({
      link: DeepLinking.DirectLink,
      options: { x: "1", pwainstall: "", directlink: "abc" },
    });
  });

  it("takes the query off the address except for directlink, annot and create_share", () => {
    at("http://localhost/app/?pwainstall");
    expect(new BrowserContainer().handleDeepLinking()?.link).toBe("pwainstall");
    expect(pushState).toHaveBeenCalledWith(null, "", "/app/");
    for (const link of ["directlink=1", "annot=2", "create_share=3"]) {
      at("http://localhost/?" + link);
      expect(new BrowserContainer().handleDeepLinking()).not.toBeNull();
      expect(pushState).not.toHaveBeenCalled();
    }
  });

  it("leaves an address without a known link alone", () => {
    at("http://localhost/?foo=1");
    expect(new BrowserContainer().handleDeepLinking()).toBeNull();
    expect(pushState).not.toHaveBeenCalled();
    expect(new BrowserContainer().handleDeepLinking("http://localhost/?reset-password=1")).toEqual({
      link: "reset-password",
      options: { "reset-password": "1" },
    });
  });
});

describe("boot: the start URL and leaving the page (module 1483)", () => {
  it("opens the install dialog for ?pwainstall once the app is ready", () => {
    const calls: string[] = [];
    const designer = {
      executeWhenReady: (callback: () => void) => {
        calls.push("when ready");
        callback();
      },
      showInstallPwaDialog: () => calls.push("install dialog"),
    };
    openStartDialogs(designer, new URLSearchParams("pwainstall"));
    expect(calls).toEqual(["when ready", "install dialog"]);
    calls.length = 0;
    openStartDialogs(designer, new URLSearchParams("directlink=1"));
    expect(calls).toEqual([]);
  });

  it("asks before leaving with modified documents, but not while reloading for an update", () => {
    const event = { preventDefault: vi.fn(), returnValue: "unset" as unknown };
    const container = { canUnload: vi.fn(() => false) };
    const designer = {
      isReloading: () => false,
      hasModifiedDocuments: () => true,
      hasSynchronizingDocuments: () => false,
    };
    beforeUnload(designer, container as never, event as never);
    expect(container.canUnload).toHaveBeenCalledWith(true, false, false);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.returnValue).toBe("");
    const reloading = { ...designer, isReloading: () => true };
    const quiet = { preventDefault: vi.fn(), returnValue: "unset" as unknown };
    beforeUnload(reloading, container as never, quiet as never);
    expect(quiet.preventDefault).not.toHaveBeenCalled();
    expect(quiet.returnValue).toBe("unset");
  });
});
