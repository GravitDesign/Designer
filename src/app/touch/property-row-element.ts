/**
 * `$("<div>").addClass(className).gPropertyRow({ height, columns })`
 * (module 1725) for the touch bars whose buttons are plain elements
 * (virtual-key-bar.ts, touch-context-menu.ts): no row label, columns of
 * element content with a width, and the row height. The row itself is
 * built by the shared widgets/property-row.ts.
 */
import { propertyRow } from "../widgets/property-row.ts";

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
  if (options.className) row.className = options.className;
  return propertyRow(row, {
    ...(options.height !== undefined ? { height: options.height } : {}),
    columns: options.columns.map((column) => ({ content: column.content, width: column.width })),
  });
}
