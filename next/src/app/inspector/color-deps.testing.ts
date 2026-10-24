/**
 * A stand-in for color-deps.ts in the panel unit tests: the real paint
 * field builds the whole pattern chooser popup on first use, which needs a
 * browser DOM. Use with
 *
 *     vi.mock("./color-deps.ts", () => import("./color-deps.testing.ts"));
 *
 * Fields and sliders keep their values here, so tests can read what the
 * panels wrote.
 */
export const OPACITY_DEFAULT = { min: 0, max: 100, custom: true, cssClass: "opacity" };

interface FakeSlider {
  value(...args: unknown[]): unknown;
  minValue(): number;
  maxValue(): number;
  disabled(...args: unknown[]): unknown;
}

const sliders = new WeakMap<Element, FakeSlider>();

export function inputSlider<T extends HTMLElement>(
  element: T,
  options: { min: number; max: number; cssClass?: string },
): T {
  let value: unknown = 50;
  element.classList.add("g-input-slider");
  if (options.cssClass) element.classList.add(options.cssClass);
  sliders.set(element, {
    value: (...args: unknown[]) => {
      if (args.length) {
        value = args[0];
        return undefined;
      }
      return value;
    },
    minValue: () => options.min,
    maxValue: () => options.max,
    disabled: () => undefined,
  });
  return element;
}

export function sliderOf(element: Element | null | undefined): FakeSlider | null {
  return element ? sliders.get(element) || null : null;
}

export function sliderValue(element: Element | null | undefined): number | string {
  const slider = sliderOf(element);
  return slider ? (slider.value() as number) : NaN;
}

export function setSliderValue(element: Element | null | undefined, value: unknown): void {
  const slider = sliderOf(element);
  if (slider) slider.value(value);
}

export interface FakeChooser {
  pattern: unknown;
  opacityValue: number;
  closed: number;
  value(...args: unknown[]): unknown;
  opacity(...args: number[]): unknown;
  setPattern(pattern: unknown): unknown;
  nullValue(...args: unknown[]): unknown;
  close(): void;
  openEyeDropper(): void;
  updateSettings(): unknown;
}

const choosers = new WeakMap<Element, FakeChooser>();

export function patternChooser<T extends HTMLElement>(element: T, options: object): T {
  void options;
  element.classList.add("g-pattern-chooser");
  const preview = document.createElement("span");
  preview.classList.add("preview");
  preview.classList.add("g-button");
  element.appendChild(preview);
  const chooser: FakeChooser = {
    pattern: null,
    opacityValue: 1,
    closed: 0,
    value(...args) {
      if (args.length) {
        chooser.pattern = args[0];
        return chooser;
      }
      return chooser.pattern;
    },
    opacity(...args) {
      if (args.length) {
        chooser.opacityValue = args[0] as number;
        return chooser;
      }
      return chooser.opacityValue;
    },
    setPattern: () => chooser,
    nullValue: () => null,
    close() {
      chooser.closed++;
    },
    openEyeDropper() {},
    updateSettings: () => chooser,
  };
  choosers.set(element, chooser);
  return element;
}

export function chooserOf(element: Element | null | undefined): FakeChooser | null {
  return element ? choosers.get(element) || null : null;
}

export const clickedPreviews: [Element, number | null][] = [];

export function clickPreview(preview: Element, stopIndex: number | null): void {
  clickedPreviews.push([preview, stopIndex]);
}

let popupPattern: unknown = null;

/** What the fake chooser popup returns as its pattern (null: no popup). */
export function setPopupPattern(pattern: unknown): void {
  popupPattern = pattern;
}

export function patternChooserPopup(): { getPattern(): unknown; isOpenned(): boolean } | null {
  return popupPattern === null ? null : { getPattern: () => popupPattern, isOpenned: () => true };
}

export function eventArgs(event: Event): unknown[] {
  return event instanceof CustomEvent && Array.isArray(event.detail)
    ? (event.detail as unknown[])
    : [];
}
