// Old: designer.browser.dev.js module 1737 ($.fn.gToolbarShadow).
/**
 * In the touch layout a sidebar toolbar casts a shadow that grows with
 * the scroll position of the list under it (up to 20px), in the theme's
 * shadow colour.
 */
import { useEffect, type RefObject } from "react";
import { designer } from "../shell/globals.ts";

/** The box-shadow for a scroll position, or null outside the touch layout. */
export function toolbarShadow(scrollTop: number, touch: boolean, theme: unknown): string | null {
  if (!touch) return null;
  const color = "light" == theme ? "DFDFDF" : "2E2E2E";
  const offset = scrollTop > 20 ? 20 : scrollTop;
  return `0 ${offset}px 20px -5px #${color}`;
}

/** $(scroller).gToolbarShadow(toolbar); returns the function that detaches it. */
export function attachToolbarShadow(scroller: HTMLElement, toolbar: HTMLElement): () => void {
  const onScroll = (): void => {
    const shadow = toolbarShadow(
      scroller.scrollTop,
      designer().isTouchEnabled(),
      designer().getSetting("theme"),
    );
    if (shadow !== null) toolbar.style.setProperty("box-shadow", shadow);
  };
  scroller.addEventListener("scroll", onScroll);
  return () => scroller.removeEventListener("scroll", onScroll);
}

/** The same for components: the toolbar's shadow follows the scroller. */
export function useToolbarShadow(
  scroller: RefObject<HTMLElement | null>,
  toolbar: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!scroller.current || !toolbar.current) return undefined;
    return attachToolbarShadow(scroller.current, toolbar.current);
  }, [scroller, toolbar]);
}
