// Old: designer.browser.dev.js module 1200 (local font helpers).
/**
 * Helpers for fonts that come as files with their own names: grouping by
 * display name for the font list, reading the fonts of the Local Font
 * Access API, and finding a family by a name with style words appended.
 */
import { OpenTypeUtil } from "../../engine/text/fonts/open-type-util.ts";
import type { FontStyle } from "../../engine/text/fonts/font.ts";
import type { FontFace, FontFamilyEntry } from "./fonts-provider.ts";

/** A font as a provider stores it: weight may be a string. */
export interface NamedFont {
  family: string;
  weight: number | string;
  style: FontStyle;
  subfamily?: string | null;
  displayname?: string | null;
}

/** A font read from a local font file, with its file. */
export interface ParsedNativeFont {
  weight: number;
  style: FontStyle;
  family: string;
  blob: ArrayBuffer;
  displayname: string | undefined;
  subfamily: string | undefined;
}

/** The part of the Local Font Access API's FontData the helpers use. */
export interface LocalFontData {
  family: string;
  blob(): Promise<Blob>;
}

declare global {
  interface Window {
    queryLocalFonts?: () => Promise<LocalFontData[]>;
  }
}

/** " variant <n>" at the end, which parseNativeFonts appends. */
const VARIANT_SUFFIX = /\svariant\s[0-9]+$/;

/**
 * Groups fonts by display name (else family). Each group lists its faces
 * and every family name in it; its family is the first name containing
 * "regular", else the shortest one (the first when the first is empty).
 */
export function generateFormattedList(
  fonts: readonly NamedFont[] | null,
): FontFamilyEntry[] | null {
  if (!fonts) return null;
  const groups: FontFamilyEntry[] = [];
  const rest = fonts.slice();
  const face = (font: NamedFont): FontFace => ({
    weight: parseInt(font.weight as string),
    style: font.style,
    family: font.family,
    subfamily: font.subfamily || null,
    displayname: font.displayname || null,
  });
  for (let i = 0; i < rest.length; i++) {
    const font = rest[i] as NamedFont;
    const name = font.displayname || font.family;
    const faces = [face(font)];
    const families = [font.family];
    groups.push({ family: null, displayname: name, fonts: faces, families });
    for (let j = rest.length - 1; j > i; j--) {
      const other = rest[j] as NamedFont;
      if (name === (other.displayname || other.family)) {
        if (families.indexOf(other.family) < 0) families.push(other.family);
        faces.push(face(other));
        rest.splice(j, 1);
      }
    }
    let chosen = 0;
    let shortest = (families[0] as string).length;
    if (shortest > 0) {
      for (let j = 1; j < families.length; j++) {
        if ((families[j] as string).toLowerCase().indexOf("regular") >= 0) {
          chosen = j;
          break;
        }
        if (shortest > (families[j] as string).length) {
          shortest = (families[j] as string).length;
          chosen = j;
        }
      }
    }
    (groups[groups.length - 1] as FontFamilyEntry).family = families[chosen] as string;
  }
  return groups;
}

/**
 * Reads every font of the given local fonts. A font whose family, weight
 * and style are taken already gets its subfamily appended, or else a
 * "variant <n>" subfamily.
 */
export async function parseNativeFonts(
  fonts: readonly LocalFontData[] | null | undefined,
): Promise<ParsedNativeFont[]> {
  if (!fonts || !Array.isArray(fonts) || !fonts.length) return [];
  const parsed: ParsedNativeFont[] = [];
  for (const local of fonts) {
    const blob = await local.blob();
    const data = await blob.arrayBuffer();
    if (!data) continue;
    // With `all` the family, style and weight don't filter.
    const entries = OpenTypeUtil.getFont(null as unknown as string, null, null, data, true, true);
    if (!entries || !entries.length) continue;
    for (const entry of entries) {
      let variant = 2;
      while (
        parsed.find(
          (known) =>
            known.family === entry.family &&
            known.weight === entry.weight &&
            known.style === entry.style,
        )
      ) {
        if (entry.subfamily && entry.family.indexOf(entry.subfamily) < 0) {
          entry.family = entry.family + " " + entry.subfamily;
        } else {
          entry.subfamily = "variant " + variant++;
          entry.family = entry.family.replace(VARIANT_SUFFIX, "") + " " + entry.subfamily;
        }
      }
      parsed.push({
        weight: entry.weight,
        style: entry.style,
        family: entry.family,
        blob: data,
        displayname: entry.displayname,
        subfamily: entry.subfamily,
      });
    }
  }
  return parsed;
}

/**
 * The fonts of the Local Font Access API, or none when it is missing or
 * refuses (it needs a user gesture; the error is logged).
 */
export async function getLocalFontsData(): Promise<LocalFontData[]> {
  const fonts: LocalFontData[] = [];
  try {
    const query = window.queryLocalFonts as () => Promise<LocalFontData[]>;
    for await (const font of await query()) fonts.push(font);
  } catch (error) {
    console.error(">>>error getting local fonts data:", error);
  }
  return fonts;
}

/**
 * Looks a family up by name; failing that without a "variant <n>"
 * suffix, then dropping one word after the other from the end.
 */
export function getFontFamily<T>(
  name: string,
  find: (family: string) => T | undefined,
): T | undefined {
  let family = name;
  let found = find(family);
  if (!found) {
    family = family.replace(VARIANT_SUFFIX, "");
    found = find(family);
  }
  if (!found) {
    const words = family.split(" ");
    while (words.length > 0) {
      words.pop();
      family = words.join(" ");
      found = find(family);
      if (found) break;
    }
  }
  return found;
}
