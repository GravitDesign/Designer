// Old: designer.browser.dev.js module 1725 ($.fn.gPropertyRow).
/**
 * A labelled row of the inspector panels:
 *
 *     .g-property-row > label.property-label, .columns > .column*, .labels > label*
 *
 * `propertyRow(row, options)` is the plugin on plain DOM. It is the one
 * implementation of the row; the panels, the color chooser and the touch
 * bars build their rows with it.
 */

/** A column of propertyRow (the old gPropertyRow column options, with DOM content). */
export interface RowColumn {
  /** The field (one element or several, as a jQuery set appended). */
  content?: Element | Element[] | null;
  /** Markup (from the panels' own code) or an element, appended instead of content. */
  html?: string | Element;
  clazz?: string;
  /** "auto" grows the column; a number is pixels; a string is CSS. */
  width?: string | number;
  /** Markup before the field: a string (followed by a space) or { label, width }. */
  prefix?: string | { label: string; width?: string | number | null };
  /** False adds no-padding even with content. */
  padding?: boolean;
  /** The caption under the column: text, or an element. */
  label?: string | Element | null;
  labelClass?: string;
}

/** The old gPropertyRow options, with DOM content. */
export interface RowOptions {
  clazz?: string;
  label?: string | Element | Element[];
  /** An icon class, or an icon element; wins over label. */
  icon?: string | Element;
  /** Makes the label clickable with a down arrow. */
  click?: (event: MouseEvent) => void;
  justified?: boolean;
  clickable?: boolean;
  hoverable?: boolean;
  height?: string | number;
  columns: RowColumn[];
  /** A right arrow in every column that clicks its content. */
  isMenu?: boolean;
  rawClick?: (event: MouseEvent) => void;
  noPaddingRight?: boolean;
}

/** What `.html("&nbsp;")` leaves: one no-break space. */
const NBSP = " ";

const has = (object: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(object, key);

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

/** `addClass` with a space-separated list (empty adds nothing). */
function addClasses(element: Element, classes: string | null | undefined): void {
  if (!classes) return;
  const list = classes.split(/\s+/).filter(Boolean);
  if (list.length) element.classList.add(...list);
}

/** jQuery's `.css(name, value)`: numbers get px, null and undefined change nothing. */
function cssSize(
  element: HTMLElement,
  name: "width" | "height",
  value: string | number | null | undefined,
): void {
  if (value === null || value === undefined) return;
  element.style.setProperty(name, typeof value === "number" ? value + "px" : value);
}

function appendContent(target: Element, content: Element | Element[]): void {
  if (Array.isArray(content)) for (const c of content) target.appendChild(c);
  else target.appendChild(content);
}

/** `$(content).is(":input")`: any of the elements is a form control. */
function isInput(content: Element | Element[]): boolean {
  const list = Array.isArray(content) ? content : [content];
  return list.some((c) => /^(input|select|textarea|button)$/i.test(c.nodeName));
}

/**
 * `$(row).gPropertyRow(options)`: adds g-property-row to `row` and
 * appends the label, the columns and the captions in the old order.
 * Returns `row`. Called twice on one element it appends a second set, as
 * the old plugin did.
 */
export function propertyRow<T extends HTMLElement>(row: T, options: RowOptions): T {
  row.classList.add("g-property-row");
  if (has(options, "clazz")) addClasses(row, options.clazz);
  if (has(options, "label") || has(options, "icon")) {
    const label = el("label", "property-label");
    row.appendChild(label);
    if (has(options, "icon")) {
      row.classList.add("icon-label");
      label.classList.add("strict-line-height");
      if (typeof options.icon === "string") {
        const span = el("span");
        addClasses(span, options.icon);
        label.appendChild(span);
      } else if (options.icon) label.appendChild(options.icon);
    } else {
      const span = el("span", "vertical-align");
      label.appendChild(span);
      if (typeof options.label === "string") span.textContent = options.label;
      else if (options.label) appendContent(span, options.label);
    }
    if (options.click) {
      // Old: label.find("span").append(arrow).on("click", click): the
      // arrow goes into every span found, and those spans get the listener.
      label.classList.add("clickable");
      for (const span of label.querySelectorAll("span")) {
        span.appendChild(el("span", "gravit-icon-down click-arrow"));
        span.addEventListener("click", options.click);
      }
    }
  } else row.classList.add("no-label");
  if (has(options, "justified") && options.justified === true) row.classList.add("justified");
  const columns = el("div", "columns");
  row.appendChild(columns);
  if (has(options, "clickable") && options.clickable) columns.classList.add("clickable");
  if (has(options, "hoverable") && options.hoverable) columns.classList.add("hoverable");
  if (has(options, "height")) cssSize(columns, "height", options.height);
  let captions = false;
  for (const column of options.columns) {
    const tag = column.content && isInput(column.content) ? "label" : "div";
    const element = el(tag, "column");
    if (has(column, "clazz")) addClasses(element, column.clazz);
    if (column.width === "auto") element.classList.add("auto-grow");
    else if (column.width) cssSize(element, "width", column.width);
    if (column.prefix) {
      let html: string;
      let width: string | number | null = null;
      if (typeof column.prefix === "string") html = column.prefix + "&nbsp;";
      else {
        html = column.prefix.label;
        width = column.prefix.width || null;
      }
      const prefix = el("div", "prefix");
      cssSize(prefix, "width", width);
      // Markup from the panels' own code, as the old .html(prefix).
      prefix.innerHTML = html;
      element.appendChild(prefix);
    }
    if (column.content) {
      const content = el("div", "content");
      appendContent(content, column.content);
      element.appendChild(content);
    } else if (column.html && typeof column.html !== "string") element.appendChild(column.html);
    else if (column.html) {
      const holder = document.createElement("div");
      holder.innerHTML = column.html;
      for (const child of [...holder.childNodes]) element.appendChild(child);
    }
    // Old: column.html("&nbsp;"), which also wipes a prefix added above.
    else element.textContent = NBSP;
    if (!column.content || (has(column, "padding") && column.padding === false))
      element.classList.add("no-padding");
    if (column.label) captions = true;
    if (options.isMenu) {
      const arrow = el("div", "gravit-icon-right");
      arrow.addEventListener("click", () => {
        const content = column.content;
        const list = Array.isArray(content) ? content : content ? [content] : [];
        for (const c of list) (c as HTMLElement).click?.();
      });
      element.appendChild(arrow);
      columns.classList.add("no-padding-left");
    }
    if (has(options, "rawClick") && options.rawClick)
      element.addEventListener("click", options.rawClick as EventListener);
    if (options.noPaddingRight) columns.classList.add("no-padding-right");
    columns.appendChild(element);
  }
  if (captions) {
    const labels = el("div", "labels");
    row.appendChild(labels);
    for (const column of options.columns) {
      const label = el("label");
      if (column.label) {
        if (typeof column.label === "string") {
          const span = el("span");
          span.textContent = column.label;
          addClasses(span, column.labelClass);
          label.appendChild(span);
        } else label.appendChild(column.label);
      } else label.textContent = NBSP;
      if (column.width === "auto") label.classList.add("auto-grow");
      else if (column.width) cssSize(label, "width", column.width);
      if (!column.content || (has(column, "padding") && column.padding === false))
        label.classList.add("no-padding");
      labels.appendChild(label);
    }
  }
  return row;
}
