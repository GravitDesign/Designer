// Old: designer.browser.dev.js module 590 (the bundled fonts provider).
/**
 * The fonts the app ships in assets/font: Open Sans, the simplified and
 * traditional Chinese Noto Sans CJK, and the Noto families of
 * noto-fonts.json (module 1075). Always the first provider, so these
 * resolve before any other.
 */
import { Font, type FontStyle } from "../../engine/text/fonts/font.ts";
import { OpenTypeFont } from "../../engine/text/fonts/open-type-font.ts";
import { uuid } from "../../engine/core/util.ts";
import {
  downloadFontFile,
  findListedFont,
  FontsProvider,
  type ListedFamily,
  type LoadCallbacks,
  type ResolveCallbacks,
} from "./fonts-provider.ts";
import { parsePreviewSvg, type PreviewFamily, type PreviewReceiver } from "./font-preview.ts";
import notoFonts from "./noto-fonts.json";

const PROVIDER_ID = uuid();

/** Font files on their way, by url, with the requests waiting for them. */
const pendingDownloads = new Map<string, ResolveCallbacks[]>();

const openSans: ListedFamily = {
  family: "Open Sans",
  fonts: [
    { weight: Font.Weight.Light, style: Font.Style.Normal, url: "assets/font/OpenSans-Light.ttf" },
    {
      weight: Font.Weight.Light,
      style: Font.Style.Italic,
      url: "assets/font/OpenSans-LightItalic.ttf",
    },
    {
      weight: Font.Weight.Regular,
      style: Font.Style.Normal,
      url: "assets/font/OpenSans-Regular.ttf",
    },
    {
      weight: Font.Weight.Regular,
      style: Font.Style.Italic,
      url: "assets/font/OpenSans-Italic.ttf",
    },
    {
      weight: Font.Weight.SemiBold,
      style: Font.Style.Normal,
      url: "assets/font/OpenSans-SemiBold.ttf",
    },
    {
      weight: Font.Weight.SemiBold,
      style: Font.Style.Italic,
      url: "assets/font/OpenSans-SemiBoldItalic.ttf",
    },
    { weight: Font.Weight.Bold, style: Font.Style.Normal, url: "assets/font/OpenSans-Bold.ttf" },
    {
      weight: Font.Weight.Bold,
      style: Font.Style.Italic,
      url: "assets/font/OpenSans-BoldItalic.ttf",
    },
    {
      weight: Font.Weight.ExtraBold,
      style: Font.Style.Normal,
      url: "assets/font/OpenSans-ExtraBold.ttf",
    },
    {
      weight: Font.Weight.ExtraBold,
      style: Font.Style.Italic,
      url: "assets/font/OpenSans-ExtraBoldItalic.ttf",
    },
  ],
  preview: "assets/font/OpenSans.svg",
  scripts: ["LATIN"],
};

const chineseSimplified: ListedFamily = {
  family: "Noto Sans CJK SC",
  fonts: [
    {
      weight: Font.Weight.Regular,
      style: Font.Style.Normal,
      url: "assets/font/chinese-simplified/NotoSansCJKsc-Regular.otf",
    },
    {
      weight: Font.Weight.Bold,
      style: Font.Style.Normal,
      url: "assets/font/chinese-simplified/NotoSansCJKsc-Bold.otf",
    },
  ],
  preview: "assets/font/chinese-simplified/NotoSans.svg",
  scripts: ["HAN"],
};

const chineseTraditional: ListedFamily = {
  family: "Noto Sans CJK TC",
  fonts: [
    {
      weight: Font.Weight.Regular,
      style: Font.Style.Normal,
      url: "assets/font/chinese-traditional/NotoSansCJKtc-Regular.otf",
    },
    {
      weight: Font.Weight.Bold,
      style: Font.Style.Normal,
      url: "assets/font/chinese-traditional/NotoSansCJKtc-Bold.otf",
    },
  ],
  preview: "assets/font/chinese-traditional/NotoSans.svg",
  scripts: ["HAN"],
};

/** Every bundled family, in the order the font list shows them. */
const BUNDLED_FAMILIES: readonly ListedFamily[] = [
  openSans,
  chineseSimplified,
  chineseTraditional,
  ...(notoFonts as ListedFamily[]),
];

export class NotoFontsProvider extends FontsProvider {
  /** The list in use, set by the first init. */
  private static families: readonly ListedFamily[] | null = null;

  /** The bundled family for the script of a text, or null. */
  getDefaultFamilyForString(text: string): string | null {
    const script = OpenTypeFont.getScriptForString(text);
    if ("CYRILLIC" === script || "GREEK" === script) return "Noto Sans";
    const entry = BUNDLED_FAMILIES.find(
      (family) => family.scripts && family.scripts.indexOf(script as string) >= 0,
    );
    return (entry && entry.family) || null;
  }

  /** Each family's preview is its SVG file (`preview`), fetched when the panel asks. */
  override addPreviews(families: ListedFamily[]): void {
    const parser = new DOMParser();
    for (const family of families as PreviewFamily[]) {
      if (family.cachedPreview) continue;
      family.addPreviewCallback = function (receiver) {
        const request = new XMLHttpRequest();
        request.open("GET", this.preview as string);
        request.onload = function () {
          if (this.status >= 200 && this.status < 300) {
            try {
              const svg = parsePreviewSvg(parser, this.response as string);
              if (svg) (receiver as PreviewReceiver)(svg);
            } catch {
              // The old code warned only in its debug build.
            }
          }
        };
        request.send();
      };
    }
  }

  init(): void {
    if (!NotoFontsProvider.families) NotoFontsProvider.families = BUNDLED_FAMILIES;
  }

  private list(): readonly ListedFamily[] {
    this.init();
    return NotoFontsProvider.families as readonly ListedFamily[];
  }

  override load(query: string, start: number, count: number, callbacks: LoadCallbacks): void {
    callbacks.done(
      this.list()
        .filter((entry) =>
          query.indexOf("%") >= 0
            ? entry.family.toLowerCase().startsWith(query.replace(/%/g, ""))
            : entry.family.toLowerCase() == query.toLowerCase(),
        )
        .slice(start, start + count),
      true,
      null,
    );
  }

  override getTotalFonts(query?: string): number {
    const families = this.list();
    return query ? families.filter(this._searchFilter(query)).length : families.length;
  }

  hasFont(family: string): boolean {
    return BUNDLED_FAMILIES.some((entry) => entry.family === family);
  }

  override resolveFont(
    family: string,
    style: FontStyle | null | undefined,
    weight: number | string | null | undefined,
    callbacks: ResolveCallbacks,
  ): void {
    const font = findListedFont(this.list(), family, style, weight);
    if (font) downloadFontFile(pendingDownloads, font.url as string, callbacks);
    else callbacks.fail();
  }

  override getProviderId(): string {
    return PROVIDER_ID;
  }
}
