import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Key } from "../../engine/core/key.ts";
import { WebBrowser } from "../../engine/core/platform.ts";
import { Hardware, OperatingSystem, System } from "../../engine/core/system.ts";
import { SoftwareUpdateEvents } from "../dialogs/software-update-events.ts";
import * as fileTypes from "../document/file-types.ts";
import {
  FakeEvent,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import { SUPPORTED_BROWSERS, SUPPORTED_TABLET_BROWSERS } from "./bootstrap.ts";
import { Runtime } from "./container.ts";
import { Designer } from "./designer.ts";
import { resetGlobals, setContainer, setDesigner } from "./globals.ts";
import { setLateModules } from "./late.ts";
import { Layout } from "./layout-ids.ts";
import { setShortcutBinder, SingleKeyBinder } from "./shortcut-binder.ts";

const saved = { hardware: System.hardware, operatingSystem: System.operatingSystem };
let dom: FakeDomHandle;
let shown: [string, string][];
let alerts: string[];

function useContainer(runtime: string): void {
  setContainer({
    registerFontProviders() {},
    getProperty: () => Promise.resolve(null),
    getRuntime: () => runtime,
  } as never);
}

/**
 * Runs Designer.init on plain elements until it needs the app registry,
 * which comes right after the unsupported-browser check.
 */
function initUntilRegistry(designer: Designer): void {
  setDesigner(designer);
  Designer.shellBuilder = () => {
    const parts: Record<string, HTMLElement> = {};
    for (const layout of Object.values(Layout)) parts[layout.id] = document.createElement("div");
    return {
      mainframe: document.createElement("div"),
      frame: document.createElement("div"),
      parts,
    };
  };
  expect(() => designer.init()).toThrow("the app registry is not built yet");
}

beforeEach(() => {
  dom = installFakeDom();
  // initDesignerFonts asks for the web font list.
  (globalThis as Record<string, unknown>).XMLHttpRequest = class {
    open() {}
    send() {}
    setRequestHeader() {}
    addEventListener() {}
    overrideMimeType() {}
  };
  shown = [];
  alerts = [];
  setLateModules({
    "dialogs/system-dialog.ts": {
      SystemDialog: {
        alert: (message: string) => alerts.push(message),
        showOneTimeDialog: (message: string, setting: string) => shown.push([message, setting]),
      },
    },
  });
  useContainer(Runtime.Browser);
});

afterEach(() => {
  System.hardware = saved.hardware;
  System.operatingSystem = saved.operatingSystem;
  Designer.shellBuilder = null;
  delete (globalThis as Record<string, unknown>).XMLHttpRequest;
  setLateModules({});
  resetGlobals();
  dom.uninstall();
});

describe("Designer: the unsupported-browser notice (module 1491)", () => {
  function designerWithBootLists(): Designer {
    const designer = new Designer();
    designer.setSupportedBrowsers(SUPPORTED_BROWSERS);
    designer.setSupportedTabletBrowsers(SUPPORTED_TABLET_BROWSERS);
    return designer;
  }

  it("shows it once from init on a phone, with the setting that hides it", () => {
    System.hardware = Hardware.Phone;
    initUntilRegistry(designerWithBootLists());
    expect(shown).toEqual([
      [
        "Gravit Designer is optimized for the latest versions of Chrome, Firefox, Safari, and (new) Edge. Please try a supported web browser for an optimal experience.",
        "designer.settings.dont_show_unsupported_browser_dialog",
      ],
    ]);
  });

  it("accepts the four desktop browsers and nothing else", () => {
    System.hardware = Hardware.Desktop;
    const designer = designerWithBootLists();
    for (const browser of [
      WebBrowser.Chrome,
      WebBrowser.Firefox,
      WebBrowser.Safari,
      WebBrowser.Edge,
    ]) {
      designer._initBrowserSupported(browser);
      expect(designer.isBrowserSupported(), String(browser)).toBe(true);
    }
    for (const browser of [WebBrowser.Opera, WebBrowser.Edge_OLD, WebBrowser.MSIE]) {
      designer._initBrowserSupported(browser);
      expect(designer.isBrowserSupported(), String(browser)).toBe(false);
    }
    designer._showUnsupportedBrowserNotice();
    expect(shown.map((entry) => entry[1])).toEqual([
      "designer.settings.dont_show_unsupported_browser_dialog",
    ]);
  });

  it("accepts Chrome on Android and Safari on iOS tablets, with the touch text otherwise", () => {
    System.hardware = Hardware.Tablet;
    const designer = designerWithBootLists();
    System.operatingSystem = OperatingSystem.Unix;
    designer._initBrowserSupported(WebBrowser.Chrome);
    expect(designer.isBrowserSupported()).toBe(true);
    System.operatingSystem = OperatingSystem.OSX_IOS;
    designer._initBrowserSupported(WebBrowser.Safari);
    expect(designer.isBrowserSupported()).toBe(true);
    designer._initBrowserSupported(WebBrowser.Chrome);
    expect(designer.isBrowserSupported()).toBe(false);
    designer._showUnsupportedBrowserNotice();
    expect(shown).toHaveLength(1);
    expect(shown[0]?.[0]).toContain("Safari on iOS and Chrome on Android");
  });

  it("supports every browser on the iPad runtime and none without the boot lists", () => {
    System.hardware = Hardware.Desktop;
    const designer = new Designer();
    designer._initBrowserSupported(WebBrowser.Chrome);
    expect(designer.isBrowserSupported()).toBe(false);
    useContainer(Runtime.IPad);
    expect(designer.isBrowserSupported()).toBe(true);
    designer._showUnsupportedBrowserNotice();
    expect(shown).toEqual([]);
  });
});

describe("Designer: reloading for an update (module 1491)", () => {
  it("is reloading once a software update is about to install", () => {
    const designer = new Designer();
    expect(designer.isReloading()).toBe(false);
    designer.trigger(new SoftwareUpdateEvents.BeforeInstallUpdate());
    expect(designer.isReloading()).toBe(true);
  });
});

describe("Designer._processOpenDocument (module 1491)", () => {
  type Opener = {
    _initialized: boolean;
    openDocument(item: { getExtension(): string | null; getUniqueId(): string | null }): unknown;
  };

  function opener(): Opener {
    setLateModules({
      "dialogs/system-dialog.ts": { SystemDialog: { alert: (m: string) => alerts.push(m) } },
      "document/file-types.ts": fileTypes,
      "document/document.ts": {
        Document: class {
          isExtensionAvailableForLoading(): boolean {
            return false;
          }
        },
      },
    });
    const designer = new Designer() as unknown as Opener;
    designer._initialized = true;
    return designer;
  }

  it("says an unknown extension is not supported", () => {
    opener().openDocument({ getExtension: () => "xyz", getUniqueId: () => null });
    expect(alerts).toEqual(["This file format isn’t supported by Gravit Designer."]);
  });

  it("throws for a file without an extension, as the old app did", () => {
    const designer = opener();
    expect(() =>
      designer.openDocument({ getExtension: () => null, getUniqueId: () => null }),
    ).toThrow(TypeError);
    expect(alerts).toEqual([]);
  });
});

describe("Designer: keys and context menus over form fields (module 1491)", () => {
  /** A fake element with the nodeName the old :editable test reads. */
  function field(tag: string, type?: string): HTMLElement {
    const element = document.createElement(tag);
    Object.defineProperty(element, "nodeName", { value: tag.toUpperCase() });
    if (type) element.setAttribute("type", type);
    document.body.appendChild(element);
    return element;
  }

  function withView(designer: Designer): { focused: number } {
    const view = { focused: 0, focus: () => view.focused++ };
    (designer as unknown as { _windows: unknown })._windows = {
      getActiveWindow: () => ({ getView: () => view }),
    };
    return view;
  }

  it("moves the focus to the view on a key over a checkbox, not over a text field", () => {
    const designer = new Designer();
    const view = withView(designer);
    const keyDown = (event: unknown): void =>
      (designer as unknown as { _documentKeyDown(e: unknown): void })._documentKeyDown(event);
    field("input", "checkbox").focus();
    keyDown({ keyCode: 65, preventDefault() {} });
    expect(view.focused).toBe(1);
    field("input", "text").focus();
    keyDown({ keyCode: 65, preventDefault() {} });
    expect(view.focused).toBe(1);
  });

  it("prevents the browser context menu on a select, not on a text field", () => {
    new Designer();
    const menu = (target: HTMLElement): boolean => {
      const event = new FakeEvent("contextmenu");
      (target as unknown as { dispatchEvent(e: FakeEvent): boolean }).dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(menu(field("select"))).toBe(true);
    expect(menu(field("textarea"))).toBe(false);
  });
});

describe("Designer.canUnloadDocument (module 1491)", () => {
  it("asks with the system dialog's buttons for a modified document", async () => {
    const asked: { title: string; buttons: { label: string; onclick(): void }[] }[] = [];
    setLateModules({
      "dialogs/system-dialog.ts": {
        SystemDialog: { alert() {}, advanced: (options: never) => asked.push(options) },
      },
    });
    const designer = new Designer();
    const document = { isModified: () => true, getTitle: () => "Poster" } as never;
    const result = designer.canUnloadDocument(document, { changeActiveDocument: false });
    expect(asked).toHaveLength(1);
    expect(asked[0]?.title).toContain("Poster");
    expect(asked[0]?.buttons.map((b) => b.label)).toEqual(["Don't save", "Cancel", "Save..."]);
    // Without a registered save action the old code resolved true before
    // asking, so the answer is already given.
    await expect(result).resolves.toBe(true);
  });
});

describe("Designer.start: the stored global swatches (module 1491)", () => {
  it("skips a stored swatch it can't read and keeps the others (BUG-132)", async () => {
    setContainer({
      getProperty: (key: string) =>
        Promise.resolve("swatches" === key ? ["Q#[1]", "C#[255,0,0]"] : null),
      getRuntime: () => Runtime.Browser,
    } as never);
    const designer = new Designer();
    await expect(designer.start()).resolves.toBeDefined();
    expect(designer.getSwatches("global")).toHaveLength(1);
  });
});

describe("Designer.registerShortcut (module 1491)", () => {
  it("binds [META, +] to the numpad +, mod+= and mod+shift+= (BUG-136)", () => {
    const bound: string[] = [];
    const record = (combo: string, _callback: unknown, phase?: string) =>
      bound.push(combo + " " + (phase ?? "-"));
    setShortcutBinder({ bind: record, bindGlobal: record, reset() {} });
    try {
      new Designer().registerShortcut(
        [Key.Constant.META, "+"],
        () => true,
        true,
        () => true,
      );
    } finally {
      setShortcutBinder(new SingleKeyBinder());
    }
    expect(bound.slice(1)).toEqual([
      "mod+= keydown",
      "mod+shift+= keydown",
      "mod+= keyup",
      "mod+shift+= keyup",
    ]);
    expect(bound[0]?.endsWith("+ -")).toBe(true);
  });
});
