// Old: designer.browser.dev.js module 1491 (GDesigner._setTheme and _updateTheme).
/**
 * The light and dark themes are the two old stylesheets
 * (designer.browser.light.css and .dark.css in public/). Switching
 * rewrites the theme link's href; once the stylesheet text has been
 * fetched again (the old code used jQuery's $(link).load(url, done)), the
 * guide line colours follow the theme, every view recreates its rulers
 * (they read their colours from the stylesheet) and the label colour is
 * picked to read on #windows' background.
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Platform } from "../../engine/core/platform.ts";
import { PaintContext } from "../../engine/paint/paint-context.ts";
import { EditorOptions } from "../../editor/editor-options.ts";

/** What the theme code needs of the windows (GWindows). */
export interface ThemedWindows {
  getWindows(): readonly { getView(): ThemedView | null }[];
  getActiveWindow(): { getView(): ThemedView | null } | null;
  getHtmlElement(): HTMLElement;
}

export interface ThemedView {
  hasRulers(): boolean;
  setRulers(visible: boolean): void;
  invalidate(): void;
}

/** The theme's stylesheet link: the first stylesheet link in head, as before. */
export function themeLink(): HTMLLinkElement | null {
  return document.querySelector<HTMLLinkElement>('head > link[href$=".css"]');
}

/** "designer.browser.light.css" with the theme put in as the third dot-separated part. */
export function themeHref(href: string, theme: string): string {
  const parts = href.split(".");
  parts[2] = theme;
  return parts.join(".");
}

/** The theme a setting value means ("default" and empty mean light). */
export function themeName(value: unknown): string {
  return !value || "default" === value ? "light" : String(value);
}

/**
 * GDesigner._setTheme. `relayout` is the designer's relayout, which
 * _updateTheme runs at the end.
 */
export function setTheme(value: unknown, windows: ThemedWindows, relayout: () => void): void {
  const theme = themeName(value);
  const link = themeLink();
  if (!link) return;
  const href = themeHref(link.getAttribute("href") as string, theme);
  const changed = link.getAttribute("href") !== href || !link.sheet;
  // The rulers read their colours from the stylesheet, so wait until the
  // new one applies as well. The old code raced the link against the
  // request; waiting for both takes the race out.
  const applied = new Promise<void>((resolve) => {
    if (!changed) resolve();
    else {
      link.addEventListener("load", () => resolve(), { once: true });
      link.addEventListener("error", () => resolve(), { once: true });
    }
  });
  link.setAttribute("href", href);
  const done = (): void => {
    EditorOptions.guideLineColor =
      "light" === theme ? new RGBColor([107, 156, 228]) : new RGBColor([227, 0, 97]);
    EditorOptions.guideLineHintColor = "light" === theme ? "blue" : "#F790B6";
    for (const window of windows.getWindows()) {
      const view = window.getView();
      if (view) {
        view.setRulers(!view.hasRulers());
        view.setRulers(!view.hasRulers());
      }
    }
    updateTheme(windows, relayout);
  };
  // $(link).load(href, done): the callback runs when the request
  // completes, successfully or not.
  const fetched = fetch(href)
    .then((response) => response.text())
    .catch(() => "");
  Promise.all([fetched, applied]).then(done, done);
}

/** GDesigner._updateTheme: black or white labels, whichever reads on #windows. */
export function updateTheme(windows: ThemedWindows, relayout: () => void): void {
  const active = windows.getActiveWindow();
  if (active && active.getView())
    Platform.scheduleFrame(() => {
      let color = RGBColor.BLACK;
      const background = getComputedStyle(windows.getHtmlElement()).getPropertyValue(
        "background-color",
      );
      const parsed = RGBColor.fromCSSColor(background);
      if (parsed) {
        const screen = parsed.toScreen();
        color =
          (299 * (screen[0] as number) +
            587 * (screen[1] as number) +
            114 * (screen[2] as number)) /
            1e3 >=
          128
            ? RGBColor.BLACK
            : RGBColor.WHITE;
      }
      PaintContext.prototype.labelColor = color;
      const view = active.getView();
      if (view) view.invalidate();
    });
  relayout();
}
