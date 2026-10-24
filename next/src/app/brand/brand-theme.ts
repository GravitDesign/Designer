/**
 * The brand follows the theme: index.html's script links
 * /brand/accent.<theme>.css for the stored theme and sets
 * html[data-gd-theme]; when the designer switches the theme stylesheet
 * (themes/theme.ts rewrites its href), both switch with it.
 */
import { themeLink } from "../themes/theme.ts";

/** The id of the accent stylesheet link index.html's script adds. */
export const ACCENT_LINK_ID = "brand-accent";

/** The attribute on <html> that next.css reads for theme-dependent colours. */
export const THEME_ATTRIBUTE = "data-gd-theme";

/** "dark" for "/designer.browser.dark.css" (the third dot-separated part, as themes/theme.ts writes it). */
export function themeOfHref(themeHref: string): string {
  return themeHref.split(".")[2] || "light";
}

/** "/brand/accent.dark.css" for the dark theme. */
export function accentHref(theme: string): string {
  return `/brand/accent.${theme}.css`;
}

/** Keeps the accent link and the theme attribute on the theme link's theme; returns the function that stops it. */
export function watchBrandTheme(doc: Document = document): () => void {
  const theme = themeLink();
  const accent = doc.getElementById(ACCENT_LINK_ID);
  if (!theme || !accent) return () => {};
  const sync = (): void => {
    const name = themeOfHref(theme.getAttribute("href") ?? "");
    const href = accentHref(name);
    if (accent.getAttribute("href") !== href) accent.setAttribute("href", href);
    if (doc.documentElement.getAttribute(THEME_ATTRIBUTE) !== name)
      doc.documentElement.setAttribute(THEME_ATTRIBUTE, name);
  };
  sync();
  const observer = new MutationObserver(sync);
  observer.observe(theme, { attributes: true, attributeFilter: ["href"] });
  return () => observer.disconnect();
}
