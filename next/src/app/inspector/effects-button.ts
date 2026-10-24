// Old: designer.browser.dev.js module 1527 (GEffectsButton).
/**
 * One tile of the add-effect panel (effects-panel.ts): an icon and a
 * caption that add the effect when clicked. Without arguments it is an
 * empty filler tile that keeps the grid rows full.
 *
 * Dropped with the licence: the Pro badge (gPro toggled the `pro`,
 * `trial` and `legacy-feature` classes) and the watchdog that kept a
 * non-Pro user from adding a Pro effect. Every effect is added.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import type { ClassId } from "../../engine/core/locale/locale-runtime.ts";
import { designer } from "../shell/globals.ts";
import { el } from "./paint-dom.ts";

/** What the button hands back to the add callback (an entry of the effect table). */
export interface EffectsButtonEntry {
  i18n?: string;
  category?: string;
}

export type EffectsButtonCallback<C, E> = (clazz: C, entry: E) => void;

export class EffectsButton<C = unknown, E extends EffectsButtonEntry = EffectsButtonEntry> {
  _htmlElement: HTMLLIElement;

  /**
   * `caption`, `icon`, `clazz`, `callback` and `translateCategory` must all
   * be given for a working tile. `pro` only chose the statistics name.
   */
  constructor(
    caption?: string,
    icon?: string,
    clazz?: C,
    callback?: EffectsButtonCallback<C, E>,
    pro?: boolean,
    entry?: E,
    translateCategory?: (category: string) => string,
  ) {
    const complete = caption && icon && clazz && callback && translateCategory;
    this._htmlElement = el("li", "g-effects-button");
    if (complete) {
      let prefix = "";
      if (entry && entry.category) prefix = translateCategory(entry.category) + "/";
      const iconSpan = el("span", "g-effects-button-icon");
      iconSpan.appendChild(el("i", icon));
      const captionSpan = el("span", "g-effects-button-caption");
      // Old: .append(caption); the captions are plain strings from the tables.
      captionSpan.append(caption);
      this._htmlElement.append(iconSpan, captionSpan);
      this._htmlElement.addEventListener("click", () => {
        const name =
          (clazz &&
            Locale.getValue(((entry && entry.i18n) || clazz) as ClassId, "name", "unknown", 0)) ||
          "unkn";
        if (pro) designer().stats("effects_add_proeffectdefault", prefix + name);
        else designer().stats("effects_add_effectdefault", prefix + name);
        callback(clazz, entry as E);
      });
      this._htmlElement.addEventListener("mouseover", () => {
        this._htmlElement.classList.add("active");
      });
      this._htmlElement.addEventListener("mouseout", () => {
        this._htmlElement.classList.remove("active");
      });
    }
  }

  toString(): string {
    return "[Object GEffectsButton]";
  }
}
