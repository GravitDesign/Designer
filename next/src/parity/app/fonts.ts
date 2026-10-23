/**
 * Interim font setup for the parity app: what GDesigner.init and the
 * browser container did for fonts, until the app shell exists (phase 7,
 * app-shell-storage and app-fonts-ui).
 *
 * What it ports:
 * - GContainer.registerFontProviders and GBrowserContainer's override:
 *   the bundled fonts, the imported fonts, the Google fonts and (as
 *   LOCAL_FONTS_API_ENABLED is set) the local fonts provider, in that
 *   order;
 * - GDesigner.init's font part: FontsProviderManager.init, the listeners
 *   for the workspace font manager's ResolveFontEvent and
 *   QueryFontFamilyEvent, and the default font: Open Sans Regular with
 *   styles normal and italic and weights 300 to 800
 *   (setOpenSansDefaultFont), or Noto Sans CJK JP for Japanese. For
 *   Chinese the old code checked for "Noto Sans CS", which the bundled
 *   list doesn't have, so Chinese keeps Open Sans too (see "The Chinese
 *   default font checks for a family the app doesn't ship" in
 *   QUESTIONS.md).
 *
 * What it leaves out: window.GSystemFontsProvider (the font launcher of
 * native-fonts.ts, which nothing registers in the browser), the
 * missing-fonts dialog after a failed font or an opened document, and the
 * network listener.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleLanguage } from "../../engine/core/locale/locale-language.ts";
import { Font } from "../../engine/text/fonts/font.ts";
import {
  FontManager,
  type QueryFontFamilyEvent,
  type ResolveFontEvent,
} from "../../engine/text/fonts/font-manager.ts";
import { FontsProviderManager, type FontRequest } from "../../app/fonts/font-manager.ts";
import { ImportedFontsProvider } from "../../app/fonts/imported-fonts-provider.ts";
import { LocalFontsProvider } from "../../app/fonts/local-font-list.ts";
import { NotoFontsProvider } from "../../app/fonts/noto-fonts-provider.ts";
import { WebFontsProvider } from "../../app/fonts/web-fonts-provider.ts";

/** The browser container's flag (module 10): the local fonts provider is on. */
const LOCAL_FONTS_API_ENABLED = true;

/** GBrowserContainer.registerFontProviders, with GContainer's part first. */
function registerFontProviders(): void {
  FontsProviderManager.registerProvider(NotoFontsProvider);
  FontsProviderManager.registerProvider(ImportedFontsProvider);
  FontsProviderManager.registerProvider(WebFontsProvider);
  if (LOCAL_FONTS_API_ENABLED) {
    try {
      FontsProviderManager.registerProvider(LocalFontsProvider);
    } catch {
      console.error("Local Fonts Access API is not available");
    }
  }
}

/**
 * GDesigner._fontManagerResolveFontEvent: passes a copy of the request
 * on; a provider that throws fails it.
 */
function resolveFontEvent(event: ResolveFontEvent): void {
  const request: FontRequest = {
    family: event.family,
    style: event.style,
    weight: event.weight,
    resolved: event.resolved,
    failed: event.failed,
    tryToResolveMissingFont: event.tryToResolveMissingFont,
    sender: event.sender,
  };
  try {
    FontsProviderManager.resolveFont(request);
  } catch (error) {
    event.failed();
    throw error;
  }
}

/**
 * GDesigner._fontManagerQueryFontFamilyEvent. The old code called
 * `event.failed()` on errors, which the event doesn't have (it is never
 * set), so an error there throws a TypeError instead.
 */
function queryFontFamilyEvent(event: QueryFontFamilyEvent): void {
  try {
    FontsProviderManager.resolveQueryFontFamily(event);
  } catch (error) {
    (event.failed as () => void)();
    throw error;
  }
}

/** GDesigner.setOpenSansDefaultFont. */
function setOpenSansDefaultFont(fontManager: FontManager): void {
  fontManager.setDefaultFont(
    fontManager.getFont("Open Sans", Font.Style.Normal, Font.Weight.Regular) as Font,
  );
  fontManager.setDefaultFontStyles([Font.Style.Normal, Font.Style.Italic]);
  fontManager.setDefaultFontWeights([300, 400, 600, 700, 800]);
}

let installed = false;

/** Sets up the app's fonts for the workspace's font manager, once. */
export function installAppFonts(fontManager: FontManager): void {
  if (installed) return;
  // Engine unit tests load the parity hooks in Node, which has no
  // XMLHttpRequest for the providers' downloads; they run without them.
  if (typeof XMLHttpRequest === "undefined") return;
  installed = true;
  registerFontProviders();
  FontsProviderManager.getInstance().init();
  fontManager.addEventListener(FontManager.ResolveFontEvent, resolveFontEvent);
  fontManager.addEventListener(FontManager.QueryFontFamilyEvent, queryFontFamilyEvent);
  setOpenSansDefaultFont(fontManager);
  const noto = FontsProviderManager.getProviderInstance(NotoFontsProvider) as NotoFontsProvider;
  const language = Locale.getLanguage();
  if (language === LocaleLanguage.Chinese || language === LocaleLanguage.ChineseTaiwan) {
    if (noto.hasFont("Noto Sans CS")) {
      fontManager.setDefaultFont(
        fontManager.getFont("Noto Sans CS", Font.Style.Normal, Font.Weight.Regular) as Font,
      );
      fontManager.setDefaultFontStyles([Font.Style.Normal]);
      fontManager.setDefaultFontWeights([100, 200, 300, 400, 500, 600, 800]);
    }
  } else if (language === LocaleLanguage.Japanese) {
    if (noto.hasFont("Noto Sans CJK JP")) {
      fontManager.setDefaultFont(
        fontManager.getFont("Noto Sans CJK JP", Font.Style.Normal, Font.Weight.Regular) as Font,
      );
      fontManager.setDefaultFontStyles([Font.Style.Normal]);
      fontManager.setDefaultFontWeights([400, 700]);
    }
  }
}
