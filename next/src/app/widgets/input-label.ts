// Old: designer.browser.dev.js module 1730 ($.fn.gInputLabel).
/**
 * A small label inside a field: a `span.g-input-label` before the input,
 * whose left padding makes room for it.
 */

export interface InputLabelOptions {
  /** The label's markup. */
  label?: string;
  /** A class for the span when there is no label (an icon). */
  class?: string;
  /** Padding by label length (21px + 1px per character) instead of 20px. */
  autoPadding?: boolean;
}

/** The input's left padding the plugin set. */
export function inputLabelPadding(options: InputLabelOptions): string {
  return options.autoPadding ? 21 + (options.label || "").length + "px" : "20px";
}

/** `$(container).gInputLabel(options)` for a container built in code. */
export function initInputLabel(container: Element, options: InputLabelOptions): void {
  const span = document.createElement("span");
  span.classList.add("g-input-label");
  if (options.label) span.innerHTML = options.label;
  else if (options.class) span.classList.add(options.class);
  for (const input of container.querySelectorAll<HTMLInputElement>("input")) {
    input.style.paddingLeft = "20px";
    input.style.width = "100%";
  }
  if (options.autoPadding)
    for (const input of container.querySelectorAll<HTMLInputElement>("input"))
      input.style.paddingLeft = inputLabelPadding(options);
  container.prepend(span);
}
