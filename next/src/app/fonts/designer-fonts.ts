/**
 * The font setup of the browser app, as GContainer/GBrowserContainer
 * (modules 85 and 1374) and GDesigner.init (module 1491) did it:
 *
 * - registerBrowserFontProviders: the browser container's
 *   registerFontProviders. The bundled fonts (GContainer's part), the
 *   imported fonts, the Google fonts and, with LOCAL_FONTS_API_ENABLED,
 *   the local fonts, in that order.
 * - initDesignerFonts: GDesigner.init's part. FontsProviderManager.init,
 *   the workspace font manager's ResolveFontEvent and
 *   QueryFontFamilyEvent handed to the providers, and the default font:
 *   Open Sans Regular with styles normal and italic and weights 300 to 800
 *   (setOpenSansDefaultFont), or Noto Sans CJK JP for Japanese. For
 *   Chinese the old code checked for "Noto Sans CS", which the bundled
 *   list doesn't have, so Chinese keeps Open Sans too (see "The Chinese
 *   default font checks for a family the app doesn't ship" in
 *   QUESTIONS.md).
 *
 * Both run once; a second call does nothing.
 *
 * Left out: window.GSystemFontsProvider (the old font launcher of
 * module 1380, which nothing registers in the browser) and the network
 * listener.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleLanguage } from "../../engine/core/locale/locale-language.ts";
import { Font } from "../../engine/text/fonts/font.ts";
import {
  FontManager,
  type QueryFontFamilyEvent,
  type ResolveFontEvent,
} from "../../engine/text/fonts/font-manager.ts";
import { config } from "../config.ts";
import { FontsProviderManager, type FontRequest } from "./font-manager.ts";
import { ImportedFontsProvider } from "./imported-fonts-provider.ts";
import { LocalFontsProvider } from "./local-font-list.ts";
import { NotoFontsProvider } from "./noto-fonts-provider.ts";
import { WebFontsProvider } from "./web-fonts-provider.ts";

let providersRegistered = false;
let designerFontsInstalled = false;

/** GBrowserContainer.supportsLocalFonts. */
export function browserSupportsLocalFonts(): boolean {
  return !!config.LOCAL_FONTS_API_ENABLED;
}

/** GBrowserContainer.registerFontProviders, with GContainer's part first. */
export function registerBrowserFontProviders(): void {
  if (providersRegistered) return;
  providersRegistered = true;
  FontsProviderManager.registerProvider(NotoFontsProvider);
  FontsProviderManager.registerProvider(ImportedFontsProvider);
  FontsProviderManager.registerProvider(WebFontsProvider);
  if (browserSupportsLocalFonts()) {
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

/**
 * GDesigner.init's font part, right after the container registered its
 * providers.
 */
export function initDesignerFonts(fontManager: FontManager): void {
  if (designerFontsInstalled) return;
  designerFontsInstalled = true;
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
