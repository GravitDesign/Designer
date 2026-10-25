/**
 * The brand follows the theme: index.html's script links
 * /brand/accent.<theme>.css for the stored theme and sets
 * html[data-gd-theme]; when the designer switches the theme stylesheet
 * (themes/theme.ts rewrites its href), both switch with it, and so does
 * the page shadow on the canvas (the view repaints after the switch).
 */
import { EditorPaintConfiguration } from "../../editor/editor-paint-configuration.ts";
import { DARK_SCHEME_QUERY, isDefaultTheme, themeLink } from "../themes/theme.ts";

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

/**
 * The page shadow on the canvas in the next look: the classic 25 % black
 * tinted with ink on the light canvas, and deeper on the dark one, where
 * the classic shadow hardly shows. Blur and offset stay the classic ones,
 * so the area a page repaints doesn't change.
 */
export function pageShadowColor(theme: string): string {
  return theme === "dark" ? "rgba(0,0,0,0.5)" : "rgba(27,27,36,0.25)";
}

/** The page shadow for the theme index.html's script or the watcher last set. */
export function currentPageShadowColor(doc: Document = document): string {
  return pageShadowColor(doc.documentElement.getAttribute(THEME_ATTRIBUTE) ?? "light");
}

/** Keeps the accent link, the theme attribute and the page shadow on the theme link's theme; returns the function that stops it. */
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
    EditorPaintConfiguration.prototype.pageDecoration.shadowBackground = pageShadowColor(name);
  };
  sync();
  const observer = new MutationObserver(sync);
  observer.observe(theme, { attributes: true, attributeFilter: ["href"] });
  return () => observer.disconnect();
}

/**
 * With no theme chosen, the next look takes the device's (themes/theme.ts);
 * this switches it when the device switches. `themeSetting` reads the
 * stored setting, `apply` sets the theme again. Returns the function that
 * stops it.
 */
export function followDeviceTheme(
  themeSetting: () => unknown,
  apply: () => void,
  win: Pick<Window, "matchMedia"> = window,
): () => void {
  const query = win.matchMedia?.(DARK_SCHEME_QUERY);
  if (!query) return () => {};
  const onChange = (): void => {
    if (isDefaultTheme(themeSetting())) apply();
  };
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
