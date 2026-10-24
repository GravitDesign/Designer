// Old: designer.browser.dev.js module 1705 ($.fn.gUnitBox).
/**
 * A length box: an InputBox whose postfix is its unit and whose value is a
 * Length. Typed text is an equation in the box's unit ("10mm + 2"). With
 * a `list`, a click opens an overlay with preset values.
 */
import { formatNumber } from "../../engine/core/util.ts";
import { Length } from "../../engine/math/length.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { designerOrNull } from "../shell/globals.ts";
import { outerWidth } from "../shell/dom.ts";
import { InputBox, type InputBoxOptions } from "./input-box.ts";

export interface UnitBoxOptions extends InputBoxOptions {
  /** The box's unit (default px); also its postfix. */
  unit?: string;
  /** Preset values shown in a list on click. */
  list?: readonly (number | string)[] | null;
  /** A name for the statistics event the list click sent. */
  source?: string;
  /**
   * The input already has the g-unitbox class because a component rendered
   * it; attach normally instead of treating it as an existing unit box.
   */
  classRendered?: boolean;
}

const unitBoxes = new WeakMap<Element, UnitBox>();

/** Marks the list item whose value is the box's value. */
function markSelected(box: InputBox): void {
  const value = box.value();
  const items = document.querySelectorAll(".g-unitbox.option-list .option-item");
  for (const item of items) item.classList.remove("g-selected");
  if (value)
    for (const item of items) {
      // The old code compared $(item).data("value") == value, loosely.
      if (String(itemValues.get(item)) == value) item.classList.add("g-selected");
    }
}

const itemValues = new WeakMap<Element, number | string>();

export class UnitBox {
  static of(input: Element): UnitBox | null {
    return unitBoxes.get(input) || null;
  }

  readonly box: InputBox;

  /** `$(input).gUnitBox(options)`. */
  constructor(input: HTMLInputElement, options: UnitBoxOptions = {}) {
    const resolved: UnitBoxOptions = { unit: Length.Unit.PX, created: false };
    for (const key of Object.keys(options)) {
      const value = options[key];
      if (value !== undefined) resolved[key] = value;
    }
    resolved.postfix = resolved.unit;
    if (!resolved.classRendered && input.classList.contains("g-unitbox")) resolved.created = true;
    else {
      if (!resolved.classRendered) input.classList.add("g-unitbox");
      input.setAttribute("type", "text");
    }
    this.box = InputBox.of(input) || new InputBox(input, resolved);
    unitBoxes.set(input, this);
    const box = this.box;
    input.addEventListener("change", () => markSelected(box));
    if (resolved.list) {
      box.unbindClick();
      input.addEventListener("click", () => this._openList());
    }
  }

  get input(): HTMLInputElement {
    return this.box.input;
  }

  /** `gUnitBox("options")`: the box's options (shared with the InputBox). */
  options(): UnitBoxOptions {
    return this.box.options as UnitBoxOptions;
  }

  /** `gUnitBox("value")`: the typed length in the box's unit (0 when it doesn't parse). */
  value(): Length;
  /** `gUnitBox("value", length)`: shows the length in the box's unit; null empties it. */
  value(length: Length | null | undefined): this;
  value(...args: unknown[]): Length | this {
    const unit = this.options().unit as string;
    if (args.length > 0) {
      const length = args[0] as Length | null | undefined;
      if (length) {
        const designer = designerOrNull();
        const document = designer ? designer.getActiveDocument() : null;
        const scene = document
          ? (document.getScene() as unknown as {
              getOptimalDecimalsCount(unit?: string): number;
            } | null)
          : null;
        this.box.value(
          formatNumber(length.toUnit(unit), scene ? scene.getOptimalDecimalsCount(unit) : 2),
        );
      } else this.input.value = "";
      return this;
    }
    const parsed = Length.parseEquation(this.input.value, unit);
    return parsed ? parsed.convert(unit) : new Length(0, unit);
  }

  /** `gUnitBox("list", values)`. */
  list(values: readonly (number | string)[] | null): void {
    this.options().list = values;
  }

  private _openList(): void {
    const options = this.options();
    const list = (options.list || []) as readonly (number | string)[];
    const designer = designerOrNull();
    if (designer) designer.stats("unitbox_" + (options.source || "") + "_button");
    const box = document.createElement("div");
    box.classList.add("g-unitbox", "option-list");
    const content = document.createElement("div");
    let overlay: Overlay | null = null;
    const pick = (value: number | string) => {
      this.value(new Length(value as number, options.unit as string));
      this.input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    for (let c = 0; c < list.length; c++) {
      const item = document.createElement("div");
      item.className = "option-item";
      item.textContent = list[c] + " " + String(options.postfix);
      itemValues.set(item, list[c] as number | string);
      item.addEventListener("mousedown", () => {
        pick(itemValues.get(item) as number | string);
        if (overlay) overlay.close();
      });
      box.appendChild(item);
    }
    content.appendChild(box);
    overlay = new Overlay(content, {
      releaseOnClose: true,
      padding: false,
      enterCallback: () => {
        const hovered = document.querySelector(".g-unitbox.option-list .option-item:hover");
        if (hovered) pick(itemValues.get(hovered) as number | string);
        if (overlay) overlay.close();
      },
    });
    content.style.minWidth = outerWidth(this.input) + "px";
    overlay.open(this.input);
    markSelected(this.box);
    this.box.requestFocus();
  }
}
