// Old: designer.browser.dev.js module 1604 (the touch layout of GPageProperties).
/**
 * The page panel's rows in the touch layout: the color swatch next to
 * the preset select and the size boxes, then a row with the bleed box
 * and the rotate, trim and clip buttons. PageProperties._updateUI builds
 * these instead of the desktop rows while touch is on, before the hr
 * that follows the bleed row.
 */
import { el, propertyRow, text } from "./properties.ts";

/** What the touch layout needs of the page panel (GPageProperties' own fields). */
export interface PageTouchLayoutHost {
  _hrAfterbleedRow: HTMLElement | null;
  _canvasPropertiesRowInTouch: HTMLElement | null;
  _bleedRowInTouch: HTMLElement | null;
  _createInput(property: string): HTMLElement;
}

/** `$(row).insertBefore(target)`. */
function insertBefore(row: HTMLElement, target: HTMLElement | null): void {
  if (target && target.parentNode) target.parentNode.insertBefore(row, target);
}

function wrap(className: string, child: HTMLElement): HTMLDivElement {
  const wrapper = el("div", className);
  wrapper.appendChild(child);
  return wrapper;
}

/** The old module's _reInitLayout, called with the panel as `this`. */
export function reInitTouchLayout(host: PageTouchLayoutHost): void {
  const canvas = el("div", "canvas-properties-touch");
  canvas.setAttribute("data-property-row", "canvas-size");
  // In the old order: the swatch first, then the select and the boxes.
  const color = host._createInput("bck");
  const sizes = el("div", "canvas-properties-type-and-size-wrapper");
  sizes.appendChild(wrap("preset-size-wrapper", host._createInput("preset-size")));
  sizes.appendChild(wrap("width-wrapper", host._createInput("w")));
  sizes.appendChild(wrap("height-wrapper", host._createInput("h")));
  propertyRow(canvas, {
    columns: [
      { clazz: "canvas-properties-color-column", content: color },
      { clazz: "canvas-properties-type-and-size-column", content: sizes },
    ],
  });
  host._canvasPropertiesRowInTouch = canvas;
  insertBefore(canvas, host._hrAfterbleedRow);
  const bleed = el("div", "page-size-and-bleed-properties-touch");
  const caption = el("span");
  caption.innerHTML = text("GPageProperties", "text.bleed");
  propertyRow(bleed, {
    columns: [
      { content: caption },
      { clazz: "bleed-selector-column", content: host._createInput("bl") },
      {
        clazz: "page-size-and-bleed-separator-column",
        content: el("div", "page-size-and-bleed-separator"),
      },
      { clazz: "canvas-rotate-btn-column", content: host._createInput("rotate-canvas") },
      { clazz: "canvas-trim-btn-column", content: host._createInput("trim-canvas") },
      { clazz: "canvas-clip-btn-column", content: host._createInput("clip-content") },
    ],
  });
  host._bleedRowInTouch = bleed;
  insertBefore(bleed, host._hrAfterbleedRow);
}
