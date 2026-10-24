// Old: designer.browser.dev.js module 1700 (GFontsButton, $.fn.gFontsButton).
/**
 * The font chooser on an `<input type="button">` (the text panel's font
 * field, the missing-fonts dialog's replacement fields). Clicking it
 * turns it into a search box and opens the font list overlay below it:
 * tabs for the web fonts, the imported fonts and the system fonts (the
 * Local Font Access API), then the fonts panel (fonts-panel.ts). Picking
 * a family writes its name into the input and calls assignFontCallback.
 *
 * The input stays the caller's element; this attaches the old behaviour
 * to it, like the other widgets in src/app/widgets. The overlay is plain
 * DOM (Overlay), built on the first click.
 *
 * Dropped with the licence: the Pro badge classes of the imported fonts
 * tab (gPro, module 1733) and the usage stats.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { PlatformType, WebBrowser } from "../../engine/core/platform.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { SystemDialog } from "../dialogs/system-dialog.ts";
import { Runtime } from "../shell/container.ts";
import { container, designer } from "../shell/globals.ts";
import { watchDog } from "../util/designer-util.ts";
import { FontsProviderManager } from "./font-manager.ts";
import type { FontsProvider } from "./fonts-provider.ts";
import { ImportedFontsProvider } from "./imported-fonts-provider.ts";
import { LocalFontsProvider } from "./local-font-list.ts";
import { FontsPanel } from "./fonts-panel.ts";

export interface FontsButtonOptions {
  /** After the list closed (Enter, a pick outside touch mode). */
  closeCallback?: (this: HTMLInputElement) => void;
  /** A family was picked: its name ("" becomes null) and the input. */
  assignFontCallback?: (family: string | null, input: HTMLInputElement) => void;
}

type ProviderClass = new (manager: FontsProviderManager) => FontsProvider;

/** What the old code kept in $(input).data("gfontsbutton"). */
interface ButtonData {
  options: Required<FontsButtonOptions>;
  /** Never set, as before; focusout would put it back into an empty input. */
  tempFontName: string | undefined;
  tempFontFamily: string | undefined;
  fontList: FontsPanel | undefined;
  fontListContainer: HTMLElement | undefined;
  mouseMoved: boolean;
}

const buttons = new WeakMap<HTMLInputElement, ButtonData>();
/** The provider class of each tab link ($(a).data("provider")). */
const tabProviders = new WeakMap<Element, ProviderClass>();

function text(group: string, key: string): string {
  return Locale.get(new LocaleKey(group, key)) as string;
}

/** Not a browser runtime (the desktop app), where the container has its own system fonts. */
function isNativeRuntime(): boolean {
  const runtime = container().getRuntime();
  return runtime !== Runtime.Browser && runtime !== Runtime.Chrome && runtime !== Runtime.PWA;
}

/** The tab links' handlers, for the first tab's jQuery-triggered click. */
const tabHandlers = new WeakMap<Element, (target: HTMLElement) => void>();

/** A tab of the font list (old `g`). */
function createTab(title: LocaleKey, provider: ProviderClass | null = null): HTMLLIElement {
  const link = document.createElement("a");
  if (provider) tabProviders.set(link, provider);
  link.className = "tablinks";
  link.append(Locale.get(title) as string);
  const handler = watchDog.trap((target: HTMLElement) => {
    const tabs = target.closest(".tab") as HTMLElement;
    for (const other of tabs.querySelectorAll(".tablinks")) other.classList.remove("active");
    target.classList.add("active");
    const own = tabProviders.get(target);
    if (own) {
      if (own === LocalFontsProvider) void FontsButton._showLocalFontsAccessDialog();
      FontsProviderManager.enableProviders([own]);
    } else {
      const others: ProviderClass[] = [];
      for (const other of tabs.querySelectorAll(".tablinks")) {
        if (other.classList.contains("active")) continue;
        const otherProvider = tabProviders.get(other);
        if (otherProvider) others.push(otherProvider);
      }
      // Outside the desktop app the old code also pushed the container's
      // system fonts provider here, but only when there was none
      // (`d || c.push(d)`); the browser container always had one, so
      // nothing was pushed (see "The web fonts tab adds a missing system
      // fonts provider" in QUESTIONS.md).
      if (others.length) FontsProviderManager.disableProviders(others);
    }
  });
  link.addEventListener("click", (event) => {
    handler(event.target as HTMLElement);
  });
  tabHandlers.set(link, handler as (target: HTMLElement) => void);
  const item = document.createElement("li");
  item.className = "tablink";
  item.appendChild(link);
  return item;
}

/** The tab row (old inner function of `m`): the first tab is clicked right away. */
function createTabs(): HTMLUListElement {
  const list = document.createElement("ul");
  list.className = "tab";
  list.appendChild(createTab(new LocaleKey("GFontsButton", "text.web-fonts")));
  list.appendChild(
    createTab(new LocaleKey("GFontsButton", "text.imported-fonts"), ImportedFontsProvider),
  );
  if (container().supportsLocalFonts())
    list.appendChild(
      createTab(new LocaleKey("GFontsButton", "text.system-fonts"), LocalFontsProvider),
    );
  if (isNativeRuntime()) {
    const system = container().getSystemFontsProvider() as ProviderClass | null;
    if (system)
      list.appendChild(createTab(new LocaleKey("GFontsButton", "text.system-fonts"), system));
  }
  // jQuery's trigger("click") on a link runs only its handlers, not the
  // browser's click.
  const first = list.querySelector<HTMLElement>(".tablinks");
  if (first) {
    const handler = tabHandlers.get(first);
    if (handler) handler(first);
  }
  return list;
}

/** Closes the list and calls closeCallback (old `f`, called with the input). */
function closeList(input: HTMLInputElement): void {
  const data = buttons.get(input);
  if (!data) return;
  if (data.fontListContainer) {
    const overlay = Overlay.of(data.fontListContainer);
    if (overlay) overlay.close(input);
  }
  if (data.options && data.options.closeCallback) data.options.closeCallback.call(input);
}

/** Searches the list for `query`, keeping the input's family selected (old `h`). */
function searchList(input: HTMLInputElement, query: string): void {
  const data = buttons.get(input);
  if (data && data.fontList) data.fontList.search(query, input.value);
}

/** Builds the list overlay of an input on first use (old `m`). */
function createList(input: HTMLInputElement): void {
  const data = buttons.get(input) as ButtonData;
  if (data.fontList) return;
  const header = document.createElement("div");
  header.className = "header";
  const listElement = document.createElement("div");
  listElement.addEventListener("mousedown", () => {
    data.mouseMoved = false;
  });
  listElement.addEventListener("mousemove", () => {
    if (!data.mouseMoved) data.mouseMoved = true;
  });
  listElement.addEventListener("mouseup", (event) => {
    const target = event.target as HTMLElement & { name?: unknown };
    if ("_SPECIAL_" === target.name || "g-fonts-panel" === target.className || data.mouseMoved)
      data.mouseMoved = false;
    else if (!designer().isTouchEnabled()) closeList(input);
  });
  data.fontList = new FontsPanel(listElement, {
    preview: header,
    changeCallback: (font) => {
      const name = (font as { displayName?: string }).displayName || font.family;
      input.value = name;
      const current = buttons.get(input) as ButtonData;
      current.tempFontFamily = name;
      current.options.assignFontCallback("" === font.family ? null : font.family, input);
      setTimeout(() => {
        input.select();
      }, 1);
      if (designer().isTouchEnabled()) closeList(input);
    },
  });
  const tabsPanel = document.createElement("div");
  tabsPanel.className = "g-fonts-panel no-overflow";
  tabsPanel.appendChild(createTabs());
  const listContainer = document.createElement("div");
  data.fontListContainer = listContainer;
  listContainer.appendChild(tabsPanel);
  listContainer.appendChild(listElement);
  const overlay = new Overlay(listContainer, {
    releaseOnClose: false,
    padding: false,
    enterCallback: (event) => {
      FontsPanel.triggerKeydown(event.which || event.keyCode);
    },
    clazz: "g-font-list-overlay",
  });
  overlay.on("close", (prevent) => {
    const manager = FontsProviderManager.getInstance();
    if (manager && manager.getLock()) prevent();
  });
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the old GFontsButton, whose statics other modules look up by name
export class FontsButton {
  static DISABLE_LOCAL_FONTS_ACCESS_WARING = "disable-local-fonts-access-warning";

  /**
   * Before the system fonts tab lists anything: says why it can't, once
   * the browser refused the permission or has no Local Font Access API.
   * Always false.
   */
  static async _showLocalFontsAccessDialog(): Promise<boolean> {
    if (designer().getSetting(FontsButton.DISABLE_LOCAL_FONTS_ACCESS_WARING, false)) return false;
    const api = window as unknown as { queryLocalFonts?: unknown };
    if (!api.queryLocalFonts) {
      SystemDialog.alert(text("GLocalFontsProvider", "text.current-browser-unsupported"));
      return false;
    }
    const permission = await navigator.permissions.query({
      name: "local-fonts" as PermissionName,
    });
    if ("denied" === permission.state) {
      const closeButton = [
        {
          label: text("GLocale", "close"),
          highlighted: true,
          shortcut: SystemDialog.Shortcut.Enter,
          closeOnClick: true,
        },
      ];
      let subtitle = text("GLocalFontsProvider", "text.permission-required-subtitle-others");
      if (PlatformType.webBrowser === WebBrowser.Edge)
        subtitle = text("GLocalFontsProvider", "text.permission-required-subtitle-edge");
      SystemDialog.custom({
        icon: "error",
        className: "g-local-fonts-warning-dialog",
        closeable: true,
        title: text("GLocalFontsProvider", "text.permission-required-title"),
        subtitle,
        buttons: closeButton,
        dontShowAgainCb: (checked) => {
          designer().setSetting(FontsButton.DISABLE_LOCAL_FONTS_ACCESS_WARING, !!checked);
        },
      });
    }
    return false;
  }

  /** $(input).gFontsButton(options). */
  static attach(input: HTMLInputElement, options: FontsButtonOptions = {}): void {
    const data: ButtonData = {
      options: {
        closeCallback: options.closeCallback || function () {},
        assignFontCallback: options.assignFontCallback || function () {},
      },
      tempFontName: undefined,
      tempFontFamily: undefined,
      fontList: undefined,
      fontListContainer: undefined,
      mouseMoved: false,
    };
    buttons.set(input, data);
    input.addEventListener("focusin", () => {
      input.setAttribute("type", "text");
    });
    input.addEventListener("focusout", () => {
      input.setAttribute("type", "button");
      const name = (buttons.get(input) as ButtonData).tempFontName;
      if (name && name.length && !input.value.length) input.value = name;
    });
    input.addEventListener("input", () => {
      searchList(input, input.value);
    });
    input.addEventListener("keydown", (event) => {
      const current = buttons.get(input);
      if (current && current.fontList) {
        const list = current.fontList;
        const listContainer = current.fontListContainer;
        const code = event.which || event.keyCode;
        if (40 === code) list.selectLower();
        else if (38 === code) list.selectUpper();
        else if (13 === code && listContainer) {
          const overlay = Overlay.of(listContainer);
          if (overlay) overlay.close(input);
          (buttons.get(input) as ButtonData).options.closeCallback.call(input);
        }
      }
    });
    input.addEventListener("click", () => {
      searchList(input, "");
      if ("text" !== input.getAttribute("type")) {
        input.setAttribute("type", "text");
        input.select();
      }
      const current = buttons.get(input) as ButtonData;
      current.tempFontFamily = input.value;
      let list = current.fontList;
      if (list) {
        (Overlay.of(current.fontListContainer as HTMLElement) as Overlay).open(input, input);
        list.refresh(true);
      } else {
        createList(input);
        list = current.fontList as FontsPanel;
        (Overlay.of(current.fontListContainer as HTMLElement) as Overlay).open(input, input);
        list.refresh();
      }
      const panel = list;
      const select = (): void => {
        panel.selection(input.value);
        panel.focusCurrent();
        input.select();
      };
      if (0 === panel.fontsLength())
        setTimeout(() => {
          select();
        }, 100);
      else select();
    });
  }

  /** $(input).gFontsButton("getFontList"): the input's fonts panel, built on first use. */
  static getFontList(input: HTMLInputElement): FontsPanel | null {
    const data = buttons.get(input);
    if (!data) return null;
    if (!data.fontList) createList(input);
    return data.fontList as FontsPanel;
  }
}
