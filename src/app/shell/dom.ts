/**
 * The few jQuery calls the shell controllers used on the part elements,
 * with jQuery 3.6's results (public/jquery.js), so inline styles and
 * measured sizes come out as before. See docs/rewrite/UI.md, section 5:
 * controllers write the geometry of elements that components render
 * without a style prop.
 */

/** CSS properties jQuery does not suffix with "px" when given a number. */
const UNITLESS = new Set([
  "opacity",
  "zIndex",
  "z-index",
  "fontWeight",
  "font-weight",
  "lineHeight",
  "line-height",
  "order",
  "flexGrow",
  "flex-grow",
  "flexShrink",
  "flex-shrink",
  "zoom",
]);

function cssName(name: string): string {
  return name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
}

/**
 * $(el).css(name, value): a number gets "px" for length properties; an
 * empty string removes the property (leaving style="" when it was the
 * last one, as jQuery did).
 */
export function css(element: HTMLElement, name: string, value: string | number): void {
  const text = typeof value === "number" && !UNITLESS.has(name) ? value + "px" : String(value);
  element.style.setProperty(cssName(name), text);
}

/** $(el).css({ ... }): the properties in object order. */
export function cssAll(element: HTMLElement, values: Record<string, string | number>): void {
  for (const name of Object.keys(values)) css(element, name, values[name] as string | number);
}

/** $(el).css(name): the computed value. */
export function computed(element: Element, name: string): string {
  return getComputedStyle(element).getPropertyValue(cssName(name));
}

/** $(el).is(":visible") as the shell used it: "display" is not "none". */
export function isDisplayed(element: Element): boolean {
  return computed(element, "display") !== "none";
}

function px(element: Element, name: string): number {
  return parseFloat(computed(element, name)) || 0;
}

function isBorderBox(element: Element): boolean {
  return computed(element, "box-sizing") === "border-box";
}

/**
 * jQuery's base size for width/height: the computed value, with
 * border-box sizes reduced to the content box. jQuery 3.6 falls back to
 * offsetWidth/Height for "auto" (and for display:none it gives 0 here,
 * which is what the shell's hidden parts measured).
 */
function contentSize(element: HTMLElement, dimension: "width" | "height"): number {
  if (computed(element, "display") === "none") return 0;
  const raw = computed(element, dimension);
  const horizontal = dimension === "width";
  const padding = horizontal
    ? px(element, "padding-left") + px(element, "padding-right")
    : px(element, "padding-top") + px(element, "padding-bottom");
  const border = horizontal
    ? px(element, "border-left-width") + px(element, "border-right-width")
    : px(element, "border-top-width") + px(element, "border-bottom-width");
  let value = parseFloat(raw);
  if (raw === "auto" || Number.isNaN(value)) {
    value = horizontal ? element.offsetWidth : element.offsetHeight;
    return value - padding - border;
  }
  if (isBorderBox(element)) value -= padding + border;
  return value;
}

/** $(el).height(). */
export function height(element: HTMLElement): number {
  return contentSize(element, "height");
}

/** $(el).width(). */
export function width(element: HTMLElement): number {
  return contentSize(element, "width");
}

/** $(el).outerHeight(): content, padding and border. */
export function outerHeight(element: HTMLElement): number {
  if (computed(element, "display") === "none") return 0;
  return (
    contentSize(element, "height") +
    px(element, "padding-top") +
    px(element, "padding-bottom") +
    px(element, "border-top-width") +
    px(element, "border-bottom-width")
  );
}

/** $(el).outerWidth(). */
export function outerWidth(element: HTMLElement): number {
  if (computed(element, "display") === "none") return 0;
  return (
    contentSize(element, "width") +
    px(element, "padding-left") +
    px(element, "padding-right") +
    px(element, "border-left-width") +
    px(element, "border-right-width")
  );
}

/** $(el).height(value): the content height, written as the box-sizing needs it. */
export function setHeight(element: HTMLElement, value: number): void {
  const extra = isBorderBox(element)
    ? px(element, "padding-top") +
      px(element, "padding-bottom") +
      px(element, "border-top-width") +
      px(element, "border-bottom-width")
    : 0;
  css(element, "height", value + extra);
}

/** $(el).outerWidth(value): the width that gives this outer width. */
export function setOuterWidth(element: HTMLElement, value: number): void {
  const extra = isBorderBox(element)
    ? 0
    : -(
        px(element, "padding-left") +
        px(element, "padding-right") +
        px(element, "border-left-width") +
        px(element, "border-right-width")
      );
  css(element, "width", value + extra);
}

/** $(el).toggleClass(name, state). */
export function toggleClass(element: Element, name: string, state?: boolean): void {
  element.classList.toggle(name, state);
}
