// Old: designer.browser.dev.js module 1726 ($.fn.gUnit).
/**
 * The unit options of a `<select>`: px, mm, cm, in, pc, pt, with their
 * long names in the current language or their short names in English.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { LocaleLanguage } from "../../engine/core/locale/locale-language.ts";
import { Length } from "../../engine/math/length.ts";

export interface UnitOption {
  unit: string;
  name: string;
  short: string;
}

const UNITS = [
  [Length.Unit.PX, "px"],
  [Length.Unit.MM, "mm"],
  [Length.Unit.CM, "cm"],
  [Length.Unit.IN, "in"],
  [Length.Unit.PC, "pc"],
  [Length.Unit.PT, "pt"],
] as const;

/** The options in order, with the strings resolved now (the old init did it per call). */
export function unitOptions(): UnitOption[] {
  return UNITS.map(([unit, key]) => ({
    unit,
    name: Locale.get(new LocaleKey("GLength", "unit." + key)) as string,
    short: Locale.get(
      new LocaleKey("GLength", "unit." + key + ".short"),
      undefined,
      LocaleLanguage.English,
    ) as string,
  }));
}

/** `$(select).gUnit({ short })`: appends the options to a select element. */
export function fillUnitSelect(element: Element, short = false): void {
  if (element.nodeName.toLowerCase() !== "select") return;
  for (const option of unitOptions()) {
    const item = document.createElement("option");
    item.setAttribute("value", option.unit);
    item.textContent = short ? option.short : option.name;
    element.appendChild(item);
  }
}
