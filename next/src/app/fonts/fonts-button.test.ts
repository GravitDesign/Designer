import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import type { Container } from "../shell/container.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setContainer, setDesigner } from "../shell/globals.ts";
import {
  fake,
  FakeElement,
  fire,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import { FontsProviderManager, type QueryResult } from "./font-manager.ts";
import type { PreviewFamily } from "./font-preview.ts";
import { FontsButton } from "./fonts-button.ts";
import { ImportedFontsProvider } from "./imported-fonts-provider.ts";
import { LocalFontsProvider } from "./local-font-list.ts";

let dom: FakeDomHandle;
let localFonts = true;
let answer: QueryResult = { faces: [] };
const manager = FontsProviderManager.getInstance();

const tabText = (key: string) => Locale.get(new LocaleKey("GFontsButton", key)) as string;

function input(): HTMLInputElement {
  const element = document.createElement("input") as unknown as HTMLInputElement;
  element.setAttribute("type", "button");
  document.body.appendChild(element);
  return element;
}

/** The font list overlay's wrapper of an input's panel. */
function wrapper(list: { getElement(): HTMLElement }): FakeElement {
  return fake(list.getElement()).parentElement?.parentElement as FakeElement;
}

beforeEach(() => {
  dom = installFakeDom();
  vi.stubGlobal("Element", FakeElement);
  localFonts = true;
  answer = { faces: [] };
  setDesigner({
    getWorkspace: () => ({
      getFontManager: () => ({ getDefaultFont: () => ({ getFamily: () => "Open Sans" }) }),
    }),
    isTouchEnabled: () => false,
    getSetting: () => true,
  } as unknown as Designer);
  setContainer({
    getRuntime: () => "browser",
    supportsLocalFonts: () => localFonts,
    getSystemFontsProvider: () => null,
  } as unknown as Container);
  vi.spyOn(manager, "query").mockImplementation((callback) => callback(answer));
  vi.spyOn(FontsProviderManager, "enableProviders").mockImplementation(() => {});
  vi.spyOn(FontsProviderManager, "disableProviders").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  dom.uninstall();
  resetGlobals();
});

describe("FontsButton list (UI-FONT-001)", () => {
  it("builds the tabs and the panel in the font list overlay", () => {
    const field = input();
    FontsButton.attach(field);
    const list = FontsButton.getFontList(field);
    if (!list) throw new Error("no list");
    expect(FontsButton.getFontList(field)).toBe(list);
    const overlay = wrapper(list);
    expect(overlay.className).toBe("g-overlay g-font-list-overlay no-padding");
    const content = overlay.children[0] as FakeElement;
    expect(content.children.map((child) => child.className)).toEqual([
      "g-fonts-panel no-overflow",
      "g-fonts-panel",
    ]);
    const tabs = content.querySelectorAll("li");
    // No Pro badge classes on the imported fonts tab: the licence is gone.
    expect(tabs.map((tab) => tab.className)).toEqual(["tablink", "tablink", "tablink"]);
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      tabText("text.web-fonts"),
      tabText("text.imported-fonts"),
      tabText("text.system-fonts"),
    ]);
    expect(content.querySelectorAll(".tablinks").map((a) => a.className)).toEqual([
      "tablinks active",
      "tablinks",
      "tablinks",
    ]);
    // The web fonts tab came up first: the other tabs' providers are off.
    expect(FontsProviderManager.disableProviders).toHaveBeenCalledWith([
      ImportedFontsProvider,
      LocalFontsProvider,
    ]);
  });

  it("leaves out the system fonts tab without local font access", () => {
    localFonts = false;
    const field = input();
    FontsButton.attach(field);
    const list = FontsButton.getFontList(field) as NonNullable<
      ReturnType<typeof FontsButton.getFontList>
    >;
    expect(wrapper(list).querySelectorAll("li").length).toBe(2);
    expect(FontsProviderManager.disableProviders).toHaveBeenCalledWith([ImportedFontsProvider]);
  });

  it("turns on a tab's own provider when it is clicked", () => {
    const field = input();
    FontsButton.attach(field);
    const list = FontsButton.getFontList(field) as NonNullable<
      ReturnType<typeof FontsButton.getFontList>
    >;
    const links = wrapper(list).querySelectorAll(".tablinks");
    fire(links[1], "click");
    expect(FontsProviderManager.enableProviders).toHaveBeenLastCalledWith([ImportedFontsProvider]);
    expect(links.map((a) => a.classList.contains("active"))).toEqual([false, true, false]);
  });

  it("is no button for an input it wasn't attached to", () => {
    expect(FontsButton.getFontList(input())).toBeNull();
  });
});

describe("FontsButton input (UI-FONT-002)", () => {
  it("is a text box while it has the focus", () => {
    const field = input();
    FontsButton.attach(field);
    fire(field, "focusin");
    expect(field.getAttribute("type")).toBe("text");
    fire(field, "focusout");
    expect(field.getAttribute("type")).toBe("button");
  });

  it("writes the picked family into the input and hands it on", () => {
    vi.useFakeTimers();
    answer = { faces: [{ family: "Lato", fonts: [] } as PreviewFamily] };
    const field = input();
    (field as unknown as { select(): void }).select = () => {};
    const assigned: (string | null)[] = [];
    FontsButton.attach(field, {
      assignFontCallback: (family, target) => {
        expect(target).toBe(field);
        assigned.push(family);
      },
    });
    const list = FontsButton.getFontList(field) as NonNullable<
      ReturnType<typeof FontsButton.getFontList>
    >;
    list.reload();
    fire(fake(list.getElement()).querySelector(".fonts-row"), "mousedown");
    expect(field.value).toBe("Lato");
    expect(assigned).toEqual(["Lato"]);
    vi.useRealTimers();
  });
});
