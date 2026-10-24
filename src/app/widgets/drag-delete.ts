// Old: designer.browser.dev.js module 1161 (handleDragForDeleteIcon).
/**
 * While a row (paint layer, effect) is dragged outside its panel, shows
 * the trash drag image beside the pointer. Returns whether the row would
 * be deleted on drop.
 */
import { computed, css, cssAll, outerWidth } from "../shell/dom.ts";
import { designer } from "../shell/globals.ts";

export function handleDragForDeleteIcon(
  event: { clientX: number; clientY: number },
  image: HTMLElement,
  panelOffset: { top: number; left: number } | null | undefined,
  panelHeight: number,
  dx: number,
  dy: number,
): boolean {
  if (!panelOffset) return false;
  let deleting: boolean;
  if (
    event.clientX < panelOffset.left ||
    event.clientY < panelOffset.top ||
    event.clientY > panelOffset.top + panelHeight
  ) {
    const gap = designer().isTouchEnabled() ? 30 : 10;
    const left = event.clientX - dx - outerWidth(image) - gap;
    const top = event.clientY - dy;
    if ("none" === computed(image, "display")) css(image, "display", "block");
    cssAll(image, { top, left });
    deleting = true;
  } else {
    css(image, "display", "none");
    deleting = false;
  }
  return deleting;
}
