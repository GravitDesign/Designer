/**
 * `$(el).gPropertyRow({ columns })` (module 1725) as plain DOM, for the
 * touch bars whose buttons are plain elements (virtual-key-bar.ts,
 * touch-context-menu.ts). Only what those use: no row label, columns of
 * element content with a width, and the row height. The classes come
 * from the widget's own helpers in widgets/property-row.ts, so they match
 * the React view.
 */
import { css } from "../shell/dom.ts";
import { columnClasses, columnsClasses, rowClasses } from "../widgets/property-row.ts";

export interface PropertyRowElementColumn {
  /** The column's content; none gives an empty `no-padding` spacer. */
  content?: HTMLElement;
  /** "auto" grows the column; anything else is its CSS width. */
  width?: string;
}

export interface PropertyRowElementOptions {
  /** Classes the element had before gPropertyRow ran. */
  className?: string;
  height?: string;
  columns: PropertyRowElementColumn[];
}

export function propertyRowElement(options: PropertyRowElementOptions): HTMLElement {
  const row = document.createElement("div");
  const rowClass = rowClasses({ className: options.className || undefined, columns: [] });
  row.className = rowClass;
  const columns = document.createElement("div");
  columns.className = columnsClasses({ columns: [] });
  if (options.height !== undefined) css(columns, "height", options.height);
  row.appendChild(columns);
  for (const column of options.columns) {
    const element = document.createElement("div");
    // The content stands in as "some content" for the class decision.
    element.className = columnClasses(
      { width: column.width, content: column.content ? "content" : undefined },
      false,
    );
    if (column.width && "auto" !== column.width) css(element, "width", column.width);
    if (column.content) {
      const content = document.createElement("div");
      content.className = "content";
      content.appendChild(column.content);
      element.appendChild(content);
    } else element.textContent = " "; // Old: .html("&nbsp;").
    columns.appendChild(element);
  }
  return row;
}
