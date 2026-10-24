// Old: designer.browser.dev.js module 1701 ($.fn.gFontsPanel).
/**
 * The list of fonts in the font chooser (fonts-button.ts): one
 * `.fonts-row` per family with its name and, once a provider sent it,
 * its preview. It lists what the designer's font manager answers for the
 * current search and pages in more as the list is scrolled.
 *
 * A controller over plain DOM, like the overlay it sits in: the rows are
 * added and the previews dropped in one by one as the providers answer,
 * and the font button and the text panel call its methods directly
 * (the old plugin methods, same names).
 *
 * The text panel also asks it about families of the full font cache
 * (stylesForFont, weightsForFont, ...); those answer undefined while the
 * cache is empty and start filling it.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { designer } from "../shell/globals.ts";
import { height, outerHeight } from "../shell/dom.ts";
import { iterateAroundIndex } from "../util/designer-util.ts";
import { FontsProviderManager, ResetEvent, type QueryResult } from "./font-manager.ts";
import type { FontFace } from "./fonts-provider.ts";
import type { PreviewFamily } from "./font-preview.ts";
import { getFontFamily, parseNativeFonts, type LocalFontData } from "./font-style-naming.ts";

export interface FontsPanelOptions {
  search?: string | null;
  /** The header element the font button made; unused, as before. */
  preview?: HTMLElement | null;
  /** A family was picked (click, Enter, arrow keys). */
  changeCallback?: ((font: PreviewFamily) => void) | null;
}

/** The event the row handlers get: a DOM event, or the font button's Enter. */
interface PanelEvent {
  stopPropagation(): void;
  preventDefault(): void;
}

type KeydownHandler = (event: PanelEvent, code?: number) => void;

/** $(el).outerHeight(true): with the margins. */
function outerHeightWithMargins(element: HTMLElement): number {
  const style = getComputedStyle(element);
  return (
    outerHeight(element) +
    (parseFloat(style.marginTop) || 0) +
    (parseFloat(style.marginBottom) || 0)
  );
}

/** $(el).position().top: from the offset parent's padding edge to the margin edge. */
function positionTop(element: HTMLElement): number {
  const parent = (element.offsetParent as HTMLElement | null) || document.documentElement;
  const parentTop =
    parent === document.documentElement
      ? 0
      : parent.getBoundingClientRect().top +
        (parseFloat(getComputedStyle(parent).borderTopWidth) || 0);
  return (
    element.getBoundingClientRect().top -
    parentTop -
    (parseFloat(getComputedStyle(element).marginTop) || 0)
  );
}

/** Previews waiting for the next timer turn, appended together. */
let previewTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPreviews: { what: HTMLElement; where: HTMLElement }[] = [];

function queuePreview(what: HTMLElement, where: HTMLElement): void {
  if (null === previewTimer) {
    previewTimer = setTimeout(() => {
      for (const entry of pendingPreviews) entry.where.append(entry.what);
      pendingPreviews = [];
      previewTimer = null;
    });
  }
  pendingPreviews.push({ what, where });
}

const panels = new WeakMap<Element, FontsPanel>();

export class FontsPanel {
  /** The panel of an element ($(el).data("g-fonts-panel")). */
  static of(element: Element | null | undefined): FontsPanel | null {
    return (element && panels.get(element)) || null;
  }

  /**
   * $(".g-fonts-panel").trigger("keydown", [code]): runs the keydown
   * handlers of every panel in the document with the key code.
   */
  static triggerKeydown(code: number): void {
    for (const element of document.querySelectorAll(".g-fonts-panel")) {
      const panel = panels.get(element);
      if (panel) panel._triggerKeydown(code);
    }
  }

  readonly options: FontsPanelOptions;
  private readonly _element: HTMLElement;
  private readonly _manager: FontsProviderManager;
  private _lastPreviewPosition = 0;
  private _search: string | null;
  private _previousQuery: string | null | undefined;
  /** Font of each row ($(row).data("font")). */
  private readonly _fonts = new WeakMap<Element, PreviewFamily>();
  private readonly _keydownHandlers: KeydownHandler[] = [];

  /** $(element).gFontsPanel(options). */
  constructor(element: HTMLElement, options: FontsPanelOptions = {}) {
    this.options = { search: null, preview: null, changeCallback: null, ...options };
    this._element = element;
    const fontManager = designer().getWorkspace().getFontManager() as unknown as {
      getDefaultFont(): { getFamily(): string };
    };
    let selected: string | undefined = fontManager.getDefaultFont().getFamily();
    this._manager = FontsProviderManager.getInstance();
    element.replaceChildren();
    element.classList.add("g-fonts-panel");
    this._search = this.options.search || null;
    panels.set(element, this);
    // Never removed, as before. The text panel's font field lives as long
    // as the app, but every replacement field of the missing-fonts dialog
    // builds its own panel too, and those keep querying and rendering
    // their detached element on each reset after the dialog has closed.
    this._manager.addEventListener(ResetEvent, () => {
      element.classList.add("g-loading");
      this._manager.query((result) => {
        this._render(result, selected);
        element.classList.remove("g-loading");
        selected = undefined;
      }, "%");
    });
    element.addEventListener("scroll", () => {
      const top = element.scrollTop;
      const position = this._lastPreviewPosition;
      const visible = height(element);
      if (!this._manager.isLoading() && top / Math.max(1, position - visible) > 0.7)
        this._manager.loadMore((result) => {
          this._append(result, "Open Sans");
        }, this._search as string);
    });
    element.addEventListener("focusin", (event) => {
      event.preventDefault();
    });
  }

  getElement(): HTMLElement {
    return this._element;
  }

  private _rows(): HTMLElement[] {
    return [...this._element.querySelectorAll<HTMLElement>(".fonts-row")];
  }

  private _fontOf(row: Element | null | undefined): PreviewFamily | undefined {
    return row ? this._fonts.get(row) : undefined;
  }

  /** Replaces the rows with a result (old `s`). */
  private _render(result: QueryResult, selected?: string | null): void {
    this._element.replaceChildren();
    this._lastPreviewPosition = 0;
    this._append(result, selected);
  }

  /** Picks the row's font, or `font` (old inner `s`). */
  private _pick(event: PanelEvent, target: Element | null, font?: PreviewFamily): void {
    if (target && "_SPECIAL_" === target.getAttribute("name")) {
      event.stopPropagation();
      return;
    }
    if (target && !font) font = this._fontOf(target.closest(".fonts-row"));
    // As before, a click outside a row (no font) throws here.
    if ((font as PreviewFamily).special) {
      event.stopPropagation();
      return;
    }
    this.selection((font as PreviewFamily).family);
    if (this.options.changeCallback) this.options.changeCallback(font as PreviewFamily);
    event.preventDefault();
  }

  /** Appends the rows of a result and asks for their previews (old `l`). */
  private _append(result: QueryResult, selected?: string | null): void {
    const faces = result.faces as PreviewFamily[] | undefined;
    if (!faces) return;
    const touch = (): boolean => designer().isTouchEnabled();
    const around = selected && selected.length ? selected : null;
    const rows: HTMLElement[] = [];
    const waiting: PreviewFamily[] = [];
    for (const face of faces) {
      const row = document.createElement("div");
      row.className = "fonts-row";
      this._fonts.set(row, face);
      row.addEventListener("mousedown", (event) => {
        if (!(touch() && !event.isTrusted)) this._pick(event, event.target as Element);
      });
      row.addEventListener("click", (event) => {
        if (touch()) this._pick(event, event.target as Element);
      });
      const info = document.createElement("div");
      info.className = "info";
      info.textContent = (face.displayname as string | undefined) || face.family;
      row.appendChild(info);
      rows.push(row);
      if (face.cachedPreview) {
        const preview = document.createElement("div");
        preview.className = "preview";
        preview.append(face.cachedPreview);
        row.appendChild(preview);
        this._lastPreviewPosition += 22;
      } else if (face.addPreviewCallback) {
        face.row = row;
        waiting.push(face);
      }
    }
    let start = 0;
    if (around)
      for (let e = 0; e < waiting.length; e++) {
        const face = waiting[e] as PreviewFamily;
        if (((face.displayname as string | undefined) || face.family).localeCompare(around) >= 0) {
          start = e;
          break;
        }
      }
    iterateAroundIndex(waiting, start, (face) => {
      (face.addPreviewCallback as NonNullable<PreviewFamily["addPreviewCallback"]>).call(
        face,
        (preview: Element) => {
          if (face.cachedPreview) return;
          if (!(preview instanceof Element)) return;
          face.cachedPreview = preview;
          this._lastPreviewPosition += 22;
          const holder = document.createElement("div");
          holder.className = "preview";
          holder.append(preview);
          queuePreview(holder, face.row as HTMLElement);
        },
      );
    });
    this._element.append(...rows);
    // Added again with every batch of rows, as before (jQuery .on), so
    // Enter picks the hovered font once per batch (see "Enter in the font
    // list picks the font once per loaded page" in QUESTIONS.md).
    const handler: KeydownHandler = (event, code) => {
      const key = code || (event as KeyboardEvent).which || (event as KeyboardEvent).keyCode;
      if (13 === key) {
        const hovered = document.querySelector(".g-fonts-panel .fonts-row:hover");
        const font = hovered ? this._fontOfAny(hovered) : undefined;
        if (font && font.family) this._pick(event, null, font);
      }
    };
    this._keydownHandlers.push(handler);
    this._element.addEventListener("keydown", (event) => handler(event));
  }

  /** The font of a row of any panel. */
  private _fontOfAny(row: Element): PreviewFamily | undefined {
    const panel = FontsPanel.of(row.closest(".g-fonts-panel"));
    return panel ? panel._fontOf(row) : undefined;
  }

  private _triggerKeydown(code: number): void {
    const event: PanelEvent = { stopPropagation() {}, preventDefault() {} };
    for (const handler of this._keydownHandlers.slice()) handler(event, code);
  }

  /** Runs the query unless it is the one shown (old `u`). */
  private _query(query: string, selected?: string | null): void {
    if (query !== this._previousQuery) {
      this._previousQuery = query;
      this._manager.query((result) => {
        this._render(result, selected);
      }, query);
    }
  }

  /** The selected family, or null. */
  selection(): string | null;
  /** Selects the row of `family` and loads previews up to it. */
  selection(family: string | null): this;
  selection(...args: [] | [string | null]): string | null | this {
    if (!args.length) {
      const selected = this._element.querySelector(".fonts-row.g-selected");
      return selected ? (this._fontOf(selected) as PreviewFamily).family : null;
    }
    const family = args[0];
    const rows = this._rows();
    rows.forEach((row, index) => {
      const matches = (this._fontOf(row) as PreviewFamily).family === family;
      row.classList.toggle("g-selected", matches);
      if (matches) {
        const previous = index > 0 ? this._fontOf(rows[index - 1]) : undefined;
        if (
          !(this._fontOf(row) as PreviewFamily).cachedPreview ||
          (index > 0 && !(previous as PreviewFamily).cachedPreview)
        ) {
          const more = (result: QueryResult): void => this._append(result);
          let loaded = this._manager.loadMore(more, this._search as string);
          while (0 !== loaded && (loaded as number) < index) {
            const before = loaded as number;
            loaded = this._manager.loadMore(more, this._search as string);
            if (before >= (loaded as number)) break;
          }
        }
      }
    });
    return this;
  }

  /** The first row whose top is at most its own height down (the first visible one). */
  private _firstVisibleFont(): PreviewFamily | undefined {
    const row = this._rows().find((candidate) => positionTop(candidate) <= outerHeight(candidate));
    return this._fontOf(row);
  }

  private _selectSibling(next: boolean): void {
    const selected = this._element.querySelector(".fonts-row.g-selected");
    const sibling = selected
      ? next
        ? selected.nextElementSibling
        : selected.previousElementSibling
      : null;
    let font = this._fontOf(sibling);
    if (!font) font = this._firstVisibleFont();
    if (font) {
      this.selection(font.family);
      this.focusCurrent();
      if (this.options.changeCallback) this.options.changeCallback(font);
    }
  }

  selectUpper(): void {
    this._selectSibling(false);
  }

  selectLower(): void {
    this._selectSibling(true);
  }

  search(): string | null;
  search(query: string | null, selected?: string | null): this;
  search(...args: [] | [string | null, (string | null)?]): string | null | this {
    if (!args.length) return this._search;
    const [query, selected] = args;
    if (query !== this._search) {
      this._search = query;
      this.refresh(false, selected);
    }
    return this;
  }

  /** Scrolls the selected row into view. */
  focusCurrent(): void {
    const element = this._element;
    const selected = element.querySelector<HTMLElement>(".fonts-row.g-selected");
    if (!selected) return;
    const top = positionTop(selected);
    const before = (): number => {
      const index = [...(selected.parentElement as HTMLElement).children].indexOf(selected);
      let sum = 0;
      for (const row of this._rows().slice(0, index)) sum += outerHeightWithMargins(row);
      return sum;
    };
    if (top > height(element) - outerHeight(selected))
      element.scrollTop = before() - height(element) + outerHeightWithMargins(selected);
    else if (top < 0) element.scrollTop = before();
  }

  reload(selected?: string | null): void {
    this._previousQuery = null;
    this.refresh(false, selected);
  }

  /** Lists the current search again; `clear` drops the search after picking the query. */
  refresh(clear?: boolean, selected?: string | null): void {
    const query = this._search ? this._search + "%" : "%";
    if (query !== this._previousQuery) {
      this._element.replaceChildren();
      this._lastPreviewPosition = 0;
      this._element.textContent =
        (Locale.get(new LocaleKey("GCommonNames", "text.loading")) as string) + "...";
      if (clear) this._search = null;
      this._query(query, selected);
    }
  }

  private _family(name: string): PreviewFamily | null | undefined {
    return getFontFamily(name, (family) => this._manager.searchFamilyInCache(family)) as
      PreviewFamily | null | undefined;
  }

  /** Starts filling the empty cache; `callback` gets the answer. */
  private _cacheEmpty(callback?: ((result: QueryResult) => void) | null): boolean {
    if (!this._manager.isCacheEmpty()) return false;
    if (callback) this._manager.query(callback, "%", true);
    return true;
  }

  stylesForFont(family: string, callback?: (() => void) | null): string[] | null | undefined {
    if (this._cacheEmpty(callback)) return undefined;
    let styles: string[] | null = null;
    const entry = this._family(family);
    if (entry && entry.fonts && entry.fonts.length) {
      styles = [];
      for (const font of entry.fonts) styles.push(font.style);
    }
    return styles;
  }

  stylesForWeight(
    weight: number,
    family: string,
    callback?: (() => void) | null,
    exact?: boolean,
  ): string[] | null | undefined {
    if (this._cacheEmpty(callback)) return undefined;
    let styles: string[] | null = null;
    const entry = this._family(family);
    if (entry && entry.fonts && entry.fonts.length) {
      styles = [];
      for (const font of entry.fonts)
        if (font.weight === weight) {
          if (exact && Object.prototype.hasOwnProperty.call(font, "family")) {
            if (font.family === family) styles.push(font.style);
          } else styles.push(font.style);
        }
    }
    return styles;
  }

  subfamiliesForWeight(
    weight: number,
    family: string,
    callback?: (() => void) | null,
  ): { realName: string; subFamily: string | null | undefined }[] | null | undefined {
    if (this._cacheEmpty(callback)) return undefined;
    let subfamilies: { realName: string; subFamily: string | null | undefined }[] | null = null;
    const entry = this._family(family);
    if (entry && entry.fonts && entry.fonts.length) {
      subfamilies = [];
      for (const font of entry.fonts)
        if (font.weight === weight)
          subfamilies.push({ realName: font.family || entry.family, subFamily: font.subfamily });
    }
    return subfamilies;
  }

  /**
   * The weights of a family; a local family's fonts are read first. As
   * before, a family that isn't in the cache throws (see "The weights of
   * a family the font cache doesn't have throw" in QUESTIONS.md), and
   * with `exact` a font of that very family counts twice.
   */
  async weightsForFont(
    family: string,
    callback?: (() => void) | null,
    exact?: boolean,
  ): Promise<number[] | null | undefined> {
    if (this._cacheEmpty(callback)) return undefined;
    let weights: number[] | null = null;
    const entry = this._family(family) as PreviewFamily & { isLocalFont?: boolean };
    if (entry.isLocalFont) {
      entry.fonts = (await parseNativeFonts(
        entry.fonts as unknown as LocalFontData[],
      )) as unknown as FontFace[];
      delete entry.isLocalFont;
    }
    if (entry && entry.fonts && entry.fonts.length) {
      weights = [];
      for (const font of entry.fonts) {
        if (exact && Object.prototype.hasOwnProperty.call(font, "family") && font.family === family)
          weights.push(font.weight);
        weights.push(font.weight);
      }
    }
    return weights;
  }

  /** The name the list shows for a family, or the family itself. */
  fontDisplayName(family: string, callback?: (() => void) | null): string | undefined {
    if (this._cacheEmpty(callback)) return undefined;
    const entry = this._family(family);
    return (entry && ((entry.displayname as string | undefined) || entry.family)) || family;
  }

  fontsLength(): number {
    return this._element.querySelectorAll(".fonts-row").length;
  }
}
