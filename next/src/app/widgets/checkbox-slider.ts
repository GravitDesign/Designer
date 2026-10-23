// Old: designer.browser.dev.js module 1704 ($.fn.gCheckboxSlider).
/**
 * A checkbox drawn as a slider switch: the `g-checkbox-slider` class, and
 * `checked` while it is on. The touch layout mounts it on the panels'
 * checkboxes and unmounts it (only the slider class goes) on the desktop.
 *
 * The `checked` class follows the box only at mount and on user changes;
 * setting `checked` from code leaves it as it was (the old plugin did the
 * same, see "Checkbox slider class lags behind" in QUESTIONS.md).
 */

export interface CheckboxSliderOptions {
  onChange?: (checked: boolean) => void;
}

/** `gCheckboxSlider(options)`: mounts the slider on a checkbox. */
export function mountCheckboxSlider(
  input: HTMLInputElement,
  options: CheckboxSliderOptions = {},
): void {
  const onChange = options.onChange || function () {};
  const checked = isChecked(input);
  input.classList.add("g-checkbox-slider");
  input.type = "checkbox";
  input.checked = checked;
  input.classList.toggle("checked", checked);
  // Every mount adds a listener, as the old plugin's did.
  input.addEventListener("change", function (this: HTMLInputElement) {
    const now = isChecked(this);
    this.classList.toggle("checked", now);
    onChange(now);
  });
}

/** `gCheckboxSlider("unmount")`: drops the slider class (the rest stays). */
export function unmountCheckboxSlider(input: HTMLInputElement): HTMLInputElement {
  input.classList.remove("g-checkbox-slider");
  return input;
}

/** `gCheckboxSlider("isChecked")`. */
export function isChecked(input: HTMLInputElement): boolean {
  return input.matches(":checked");
}

/** `gCheckboxSlider("value", v)`: sets the box (not the class). */
export function setCheckboxSliderValue(input: HTMLInputElement, value: unknown): void {
  input.checked = !!value;
}
