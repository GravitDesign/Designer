import { afterEach, describe, expect, it } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { ScenePaintConfiguration } from "../../engine/paint/scene-paint-configuration.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { Page } from "../../engine/scene/page.ts";
import { LinearGradient } from "../../engine/style/linear-gradient.ts";
import type { Document } from "../document/document.ts";
import { PageClip } from "../export/page-clip.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { PageProperties } from "./page-properties.ts";

const { Output, Full } = ScenePaintConfiguration.PaintMode;

/** A button with the bits _manageClipButtonState touches. */
function fakeButton(classes: string[] = [], disabled = false) {
  const set = new Set(classes);
  const attributes = new Map<string, string>();
  if (disabled) attributes.set("disabled", "disabled");
  return {
    classList: {
      contains: (name: string) => set.has(name),
      add: (name: string) => set.add(name),
      remove: (name: string) => set.delete(name),
    },
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    state: () => ({ classes: [...set].sort(), disabled: attributes.has("disabled") }),
  };
}

interface Env {
  modes: string[];
  activePage: Page;
  view: { getViewConfiguration(): { paintMode: string } };
}

/** A designer with one window whose view is in `mode`; setPaintMode is recorded. */
function fakeDesigner(mode: string, activePage: Page): Env {
  const configuration = { paintMode: mode };
  const view = { getViewConfiguration: () => configuration };
  const env: Env = { modes: [], activePage, view };
  setDesigner({
    addEventListener() {},
    removeEventListener() {},
    stats() {},
    getWindows: () => ({ getActiveWindow: () => ({ getView: () => view }) }),
    // No view, so the panel doesn't schedule its own repaint frame.
    getActiveView: () => null,
    setPaintMode: (value: string) => {
      env.modes.push(value);
      configuration.paintMode = value;
    },
    getActiveDocument: () => ({ getScene: () => ({ getActivePage: () => env.activePage }) }),
  } as unknown as Designer);
  return env;
}

function sizedPage(w: number, h: number): Page {
  const page = new Page();
  page.setProperties(["w", "h"], [w, h]);
  return page;
}

/** A panel whose field updates are left out (no DOM here). */
function panel(): PageProperties {
  const p = new PageProperties();
  p.updatePropertiesAvailability = () => {};
  return p;
}

afterEach(() => resetGlobals());

describe("PageProperties._manageClipButtonState", () => {
  it("enables the button for a fixed-size page and shows the clip state", () => {
    const p = panel();
    const button = fakeButton(["g-disabled"], true);
    p._clipContentButton = button as unknown as HTMLButtonElement;
    p._manageClipButtonState(true, true);
    expect(button.state()).toEqual({ classes: ["g-active"], disabled: false });
    p._manageClipButtonState(false, true);
    expect(button.state()).toEqual({ classes: [], disabled: false });
  });

  it("disables it for an infinite page, and leaves a disabled one alone", () => {
    const p = panel();
    const button = fakeButton(["g-active"]);
    p._clipContentButton = button as unknown as HTMLButtonElement;
    p._manageClipButtonState(true, false);
    expect(button.state()).toEqual({ classes: ["g-disabled"], disabled: true });
    // Already disabled: the active flag doesn't add g-active.
    p._manageClipButtonState(true, false);
    expect(button.state()).toEqual({ classes: ["g-disabled"], disabled: true });
  });
});

describe("PageProperties._pageActivationEventHandler", () => {
  it("clips a fixed-size page by default (PAGE_CLIP_DEFAULT)", () => {
    const page = sizedPage(100, 50);
    const env = fakeDesigner(Full, page);
    panel()._pageActivationEventHandler({ node: page, flag: NodeFlag.Active });
    expect(env.modes).toEqual([Output]);
  });

  it("follows the page's cce setting", () => {
    const page = sizedPage(100, 50);
    page.setProperty(PageClip.PAGE_CLIP_PROPERTY_NAME, PageClip.PAGE_CLIP_CONTENT_DISABLED, true);
    const env = fakeDesigner(Output, page);
    panel()._pageActivationEventHandler({ node: page, flag: NodeFlag.Active });
    expect(env.modes).toEqual([Full]);
  });

  it("turns clipping off for an infinite page and stores that on the active page", () => {
    const page = sizedPage(0, 0);
    const env = fakeDesigner(Output, page);
    panel()._pageActivationEventHandler({ node: page, flag: NodeFlag.Active });
    expect(env.modes).toEqual([Full]);
    expect(page.getProperty(PageClip.PAGE_CLIP_PROPERTY_NAME, true)).toBe(
      PageClip.PAGE_CLIP_CONTENT_DISABLED,
    );
  });

  it("ignores other flags and leaves an infinite page in Full alone", () => {
    const page = sizedPage(0, 0);
    const env = fakeDesigner(Full, page);
    panel()._pageActivationEventHandler({ node: page, flag: NodeFlag.Active });
    panel()._pageActivationEventHandler({ node: sizedPage(10, 10), flag: NodeFlag.Selected });
    expect(env.modes).toEqual([]);
  });
});

describe("PageProperties._setClipContent", () => {
  it("switches between Output and Full and stores cce on the active page", () => {
    const page = sizedPage(100, 50);
    const env = fakeDesigner(Output, page);
    const p = panel();
    p._setClipContent(false, false);
    expect(env.modes).toEqual([Full]);
    expect(page.getProperty(PageClip.PAGE_CLIP_PROPERTY_NAME, true)).toBe(
      PageClip.PAGE_CLIP_CONTENT_DISABLED,
    );
    p._setClipContent(true, false);
    expect(env.modes).toEqual([Full, Output]);
    expect(page.getProperty(PageClip.PAGE_CLIP_PROPERTY_NAME, true)).toBe(
      PageClip.PAGE_CLIP_CONTENT_ENABLED,
    );
    // Only-when-off with clip on does nothing.
    p._setClipContent(true, true);
    expect(env.modes).toEqual([Full, Output]);
  });
});

describe("PageProperties._assignProperties", () => {
  function withPages(pages: Page[], log: string[]): PageProperties {
    const p = panel();
    p._pages = pages;
    p._document = {
      getEditor: () => ({
        beginTransaction: () => log.push("begin"),
        commitTransaction: (name: string, related: unknown) =>
          log.push("commit " + name + " " + JSON.stringify(related)),
      }),
    } as unknown as Document;
    return p;
  }

  it("sets every page in one transaction", () => {
    const log: string[] = [];
    const a = sizedPage(10, 10);
    const b = sizedPage(20, 20);
    withPages([a, b], log)._assignProperties(["w", "h"], [5, 6], "size");
    expect([a.getProperty("w"), a.getProperty("h"), b.getProperty("w")]).toEqual([5, 6, 5]);
    expect(log).toEqual(["begin", "commit size null"]);
  });

  it("gives a page with a gradient background white at full opacity when going infinite", () => {
    const log: string[] = [];
    const gradient = sizedPage(10, 10);
    gradient.setProperties(["bck", "bop"], [new LinearGradient(), 0.5]);
    const colored = sizedPage(10, 10);
    colored.setProperties(["bck", "bop"], [new RGBColor([255, 0, 0]), 0.5]);
    withPages([gradient, colored], log)._assignProperties(["w", "h"], [0, 0], "size", null, true);
    expect(gradient.getProperty("bck")).toBe(RGBColor.WHITE);
    expect(gradient.getProperty("bop")).toBe(1);
    expect(colored.getProperty("bop")).toBe(0.5);
    expect(gradient.isFixedSized()).toBeFalsy();
  });
});

describe("PageProperties._updateSlavePages", () => {
  it("copies only the master's margins, bleed and background properties that changed", () => {
    const master = sizedPage(10, 10);
    const slave = sizedPage(20, 20);
    const calls: unknown[] = [];
    master.getSlavePages = () => [slave];
    slave.setProperties = ((names: string[], values: unknown[]) => {
      calls.push([names, values]);
      return true;
    }) as Page["setProperties"];
    master.setProperties(["mt", "bl"], [4, 2]);
    const p = panel();
    p._updateSlavePages(master, ["mt", "w", "bl"]);
    p._updateSlavePages(master, ["w"]);
    expect(calls).toEqual([
      [
        ["mt", "bl"],
        [4, 2],
      ],
    ]);
  });
});
