// Old: designer.browser.dev.js module 1697 ($.fn.gCornerTypePicker).
/**
 * The corner type picker of the rectangle and polygon panels: a row of
 * buttons (rounded, inverse rounded, bevel, inset, fancy), either inline
 * (`notOverlay`) or in a `.corner-picker-overlay` that a click on the
 * element opens. A pick sets the value and dispatches a bubbling
 * "cornertypechange" CustomEvent on the element with the type as
 * `detail` (the old jQuery trigger("cornertypechange", type)); the
 * overlay's open and close are dispatched as "open" and "close".
 *
 * Usage:
 *
 *     const picker = new CornerTypePicker(element, { notOverlay: true });
 *     element.addEventListener("cornertypechange", (e) => ...(e as CustomEvent<string>).detail);
 *     picker.value(PathBase.CornerType.Bevel);
 *     CornerTypePicker.of(element)?.value();
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { PathBase } from "../../engine/scene/path-base.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { propertyRow } from "./property-row.ts";
import { designerOrNull } from "../shell/globals.ts";

export interface CornerTypePickerOptions {
  /** Show the buttons inline instead of in an overlay. */
  notOverlay?: boolean;
  /** Rotation of the icons in degrees (default 0). */
  rotate?: number;
}

interface CornerTypeEntry {
  type: string;
  title: string;
  icon: string;
}

/** The types with their titles and icons, built on first use as before. */
let types: CornerTypeEntry[] | null = null;

function cornerTypes(): CornerTypeEntry[] {
  if (!types) {
    const title = (key: string) => Locale.get(new LocaleKey("GPathBase", key)) ?? "";
    const T = PathBase.CornerType;
    types = [
      { type: T.Rounded, title: title("corner.rounded"), icon: "gravit-icon-corner-rounded" },
      {
        type: T.InverseRounded,
        title: title("corner.inverse-rounded"),
        icon: "gravit-icon-corner-inverse-rounded",
      },
      { type: T.Bevel, title: title("corner.bevel"), icon: "gravit-icon-corner-bevel" },
      { type: T.Inset, title: title("corner.inset"), icon: "gravit-icon-corner-inset" },
      { type: T.Fancy, title: title("corner.fancy"), icon: "gravit-icon-corner-fancy" },
    ];
  }
  return types;
}

/** The icon class of a corner type, or null. */
export function cornerTypeIcon(type: string | null): string | null {
  const list = cornerTypes();
  for (let t = 0; t < list.length; ++t)
    if ((list[t] as CornerTypeEntry).type === type) return (list[t] as CornerTypeEntry).icon;
  return null;
}

/** Marks the button of `type` active in every picker of the page (the old code queried globally). */
function markActive(type: string | null): void {
  const list = cornerTypes();
  for (let t = 0; t < list.length; ++t)
    for (const button of document.querySelectorAll(
      'button[data-corner-type="' + (list[t] as CornerTypeEntry).type + '"]',
    ))
      button.classList.toggle("g-active", (list[t] as CornerTypeEntry).type === type);
}

const pickers = new WeakMap<Element, CornerTypePicker>();

export class CornerTypePicker {
  /** The picker attached to an element (`$(el).data("gcornertype")`). */
  static of(element: Element): CornerTypePicker | null {
    return pickers.get(element) || null;
  }

  readonly element: HTMLElement;
  cornerType: string | null = null;
  readonly notOverlay: boolean;
  readonly rotate: number;

  /** `$(element).gCornerTypePicker(options)`. */
  constructor(element: HTMLElement, options: CornerTypePickerOptions = {}) {
    const rotate = options.rotate !== undefined ? options.rotate : 0;
    cornerTypes();
    this.element = element;
    this.notOverlay = !!options.notOverlay;
    this.rotate = rotate;
    pickers.set(element, this);
    if (options.notOverlay) this._build();
    else {
      element.appendChild(document.createElement("span"));
      element.addEventListener("click", () => {
        designerOrNull()?.stats("cornertypes_click_open");
        this._build();
      });
    }
  }

  private _build(): void {
    const list = cornerTypes();
    const columns = [];
    const width = 100 / list.length;
    let overlay: Overlay | null = null;
    for (let l = 0; l < list.length; ++l) {
      const entry = list[l] as CornerTypeEntry;
      const button = document.createElement("button");
      button.classList.add("g-flat");
      button.classList.toggle("g-active", entry.type === this.cornerType);
      button.setAttribute("data-corner-type", entry.type);
      button.setAttribute("data-title", entry.title);
      const icon = document.createElement("span");
      icon.classList.add(entry.icon);
      icon.style.transform = "rotate(" + this.rotate + "deg)";
      button.appendChild(icon);
      button.addEventListener("click", () => {
        const type = button.getAttribute("data-corner-type") as string;
        this.value(type);
        this.element.dispatchEvent(
          new CustomEvent("cornertypechange", { detail: type, bubbles: true }),
        );
        let name = "unkn";
        const keys = Object.keys(PathBase.CornerType) as (keyof typeof PathBase.CornerType)[];
        for (const key of keys)
          if (type === PathBase.CornerType[key]) {
            name = key;
            break;
          }
        designerOrNull()?.stats("cornertypes_click_change", name);
        if (!this.notOverlay && overlay) overlay.close();
      });
      columns.push({ width: Math.round(width) + "%", content: button });
    }
    const row = document.createElement("div");
    row.style.width = this.notOverlay ? "100%" : "200px";
    propertyRow(row, { columns });
    if (this.notOverlay) this.element.appendChild(row);
    else {
      overlay = new Overlay(row, { releaseOnClose: true, clazz: "corner-picker-overlay" });
      overlay.on("open", () => this.element.dispatchEvent(new Event("open", { bubbles: true })));
      overlay.on("close", () => this.element.dispatchEvent(new Event("close", { bubbles: true })));
      overlay.open(this.element);
    }
  }

  /** `gCornerTypePicker("value")`. */
  value(): string | null;
  /** `gCornerTypePicker("value", type)`: shows the type (active button, or the icon). */
  value(type: string | null): this;
  value(...args: (string | null)[]): string | null | this {
    if (args.length) {
      this.cornerType = args[0] as string | null;
      if (this.notOverlay) markActive(this.cornerType);
      else
        for (const span of this.element.querySelectorAll("span")) {
          // jQuery's attr("class", null) removed the attribute.
          const icon = cornerTypeIcon(this.cornerType);
          if (icon === null) span.removeAttribute("class");
          else span.setAttribute("class", icon);
          span.style.transform = "rotate(" + this.rotate + "deg)";
        }
      return this;
    }
    return this.cornerType;
  }

  /** `gCornerTypePicker("update", type)`: marks the type's buttons active. */
  update(type: string | null): void {
    markActive(type);
  }
}
