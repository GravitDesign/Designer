// Old: designer.browser.dev.js module 1526 (GEffectsPanel).
/**
 * The add-effect popup of the effects panel: a category select and a grid
 * of effect tiles (EffectsButton), in an overlay next to the button that
 * opened it.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import type { ClassId } from "../../engine/core/locale/locale-runtime.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { EffectsButton, type EffectsButtonCallback } from "./effects-button.ts";
import { el } from "./paint-dom.ts";

/** An effect table entry as the panel shows it. */
export interface EffectsPanelEntry<C = unknown> {
  clazz: C;
  i18n: string;
  icon?: string;
  category?: string;
  mostUsed?: boolean;
  cb?: EffectsButtonCallback<C, EffectsPanelEntry<C>>;
}

/** A tile or an effect entry to make one from. */
export type EffectsPanelItem<C = unknown> = EffectsPanelEntry<C> | EffectsButton;

export class EffectsPanel {
  _htmlElement: HTMLDivElement;
  _content: HTMLDivElement | null = null;
  _htmlElementSelector: HTMLDivElement | null = null;
  readonly _catTranslate: (category: string) => string;
  _parent: Element | null = null;
  private readonly _overlay: Overlay;

  constructor(translateCategory: (category: string) => string) {
    this._htmlElement = el("div", "g-effects-panel");
    this._overlay = new Overlay(this._htmlElement, { releaseOnClose: false, padding: false });
    this._catTranslate = translateCategory;
  }

  addItem(item: EffectsButton): void {
    (this._content as HTMLDivElement).appendChild(item._htmlElement);
  }

  /** Adds the category select above the tiles and returns it. */
  createSelector(): HTMLSelectElement {
    const select = el("select", "g-effects-select active");
    this._htmlElementSelector = el("div", "g-effects-selector");
    this._htmlElementSelector.appendChild(select);
    this._htmlElement.appendChild(this._htmlElementSelector);
    return select;
  }

  /**
   * Replaces the tiles with `items`. The list is padded with empty tiles
   * to a multiple of three in place (the caller's array keeps them).
   */
  addItems<C>(items: EffectsPanelItem<C>[]): void {
    if (!this._content) {
      this._content = el("div", "g-effects-content");
      this._htmlElement.appendChild(this._content);
    }
    while (items.length % 3 != 0) items.push(new EffectsButton());
    for (const child of Array.from(this._content.children))
      if (child.matches(".g-effects-button")) child.remove();
    for (let n = 0; n < items.length; ++n) {
      const item = items[n] as EffectsPanelItem<C>;
      if (item instanceof EffectsButton) this.addItem(item);
      else {
        this.addItem(
          new EffectsButton<C, EffectsPanelEntry<C>>(
            Locale.getValue(item.i18n as ClassId, "name"),
            item.icon,
            item.clazz,
            item.cb,
            !item.mostUsed,
            item,
            this._catTranslate,
          ),
        );
      }
    }
  }

  open(target: Element): void {
    this._parent = target;
    this._overlay.open(target);
  }

  close(event?: unknown): void {
    this._overlay.close(event || this._parent);
  }

  toString(): string {
    return "[Object GEffectsPanel]";
  }
}
