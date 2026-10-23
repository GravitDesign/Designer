// Old: designer.browser.dev.js module 1725 ($.fn.gPropertyRow).
/**
 * A labelled row of the inspector panels:
 *
 *     .g-property-row > label.property-label, .columns > .column*, .labels > label*
 *
 * The view is property-row-view.tsx; this file has the option types and
 * the decisions the old plugin made from them.
 */
import { isValidElement, type CSSProperties, type ReactNode } from "react";

export interface PropertyRowColumn {
  /** The field; a form control makes the column a `<label>`. */
  content?: ReactNode;
  /** Markup instead of content (the old `html` string). */
  html?: string;
  clazz?: string;
  /** "auto" grows the column; anything else is its CSS width. */
  width?: string | number;
  /** Text before the field: a string (followed by a space) or { label, width }. */
  prefix?: string | { label: string; width?: string | number | null };
  /** False adds no-padding even with content. */
  padding?: boolean;
  /** The caption under the column. */
  label?: ReactNode;
  labelClass?: string;
  /** Whether `content` counts as a form control (detected for plain elements and marked views). */
  input?: boolean;
}

export interface PropertyRowOptions {
  /** Classes the row has before g-property-row (the element the old plugin was called on). */
  className?: string;
  clazz?: string;
  label?: ReactNode;
  /** An icon class, or an icon node; wins over label. */
  icon?: ReactNode;
  /** Makes the label clickable with a down arrow. */
  click?: (event: { currentTarget: EventTarget }) => void;
  justified?: boolean;
  clickable?: boolean;
  hoverable?: boolean;
  height?: string | number;
  columns: PropertyRowColumn[];
  /** A right arrow in every column that clicks its content. */
  isMenu?: boolean;
  rawClick?: (event: { currentTarget: EventTarget }) => void;
  noPaddingRight?: boolean;
  [extra: string]: unknown;
}

const FORM_TAGS = new Set(["input", "select", "textarea", "button"]);
const FORM_CONTROL = Symbol("formControl");

/** Marks a component that renders a single form control (InputBoxView, ...). */
export function markFormControl<T extends object>(component: T): T {
  (component as Record<symbol, boolean>)[FORM_CONTROL] = true;
  return component;
}

/** `$(column.content).is(":input")`. */
export function isFormControlContent(column: PropertyRowColumn): boolean {
  if (column.input !== undefined) return column.input;
  const content = column.content;
  if (!isValidElement(content)) return false;
  const type = content.type as unknown;
  if ("string" == typeof type) return FORM_TAGS.has(type);
  return !!type && !!(type as Record<symbol, boolean>)[FORM_CONTROL];
}

/** The classes of the row element, in the old order. */
export function rowClasses(options: PropertyRowOptions): string {
  const classes: string[] = [];
  if (options.className) classes.push(options.className);
  classes.push("g-property-row");
  if (Object.prototype.hasOwnProperty.call(options, "clazz") && options.clazz)
    classes.push(options.clazz);
  if (hasLabel(options)) {
    if (Object.prototype.hasOwnProperty.call(options, "icon")) classes.push("icon-label");
  } else classes.push("no-label");
  if (options.justified === true) classes.push("justified");
  return classes.join(" ");
}

export function hasLabel(options: PropertyRowOptions): boolean {
  return (
    Object.prototype.hasOwnProperty.call(options, "label") ||
    Object.prototype.hasOwnProperty.call(options, "icon")
  );
}

/** The classes of `.columns`, in the old order. */
export function columnsClasses(options: PropertyRowOptions): string {
  const classes = ["columns"];
  if (options.clickable) classes.push("clickable");
  if (options.hoverable) classes.push("hoverable");
  if (options.columns.length) {
    if (options.isMenu) classes.push("no-padding-left");
    if (options.noPaddingRight) classes.push("no-padding-right");
  }
  return classes.join(" ");
}

/** The classes of a column (`.column` or its caption label). */
export function columnClasses(column: PropertyRowColumn, caption: boolean): string {
  const classes = caption ? [] : ["column"];
  if (!caption && column.clazz) classes.push(column.clazz);
  if ("auto" === column.width) classes.push("auto-grow");
  if (
    !column.content ||
    (Object.prototype.hasOwnProperty.call(column, "padding") && false === column.padding)
  )
    classes.push("no-padding");
  return classes.join(" ");
}

/** The inline width of a column, unless it grows. */
export function columnStyle(column: PropertyRowColumn): CSSProperties | undefined {
  if ("auto" === column.width || !column.width) return undefined;
  return { width: column.width };
}
