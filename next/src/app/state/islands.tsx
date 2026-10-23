/**
 * React content inside elements a controller owns (docs/rewrite/UI.md,
 * section 5): a sidebar's container, a footer panel's container, the
 * header and the toolbar parts. Each gets its own root; the shared state
 * lives in the Zustand stores, so no context crosses the roots.
 *
 * Rendering is synchronous when React allows it, so the old code that
 * looked at the DOM right after init() keeps working.
 */
import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";

export interface Island {
  /** Renders new content into the element. */
  render(content: ReactNode): void;
  unmount(): void;
}

/** Renders `content` into `element` (replacing what React rendered there before). */
export function renderInto(element: HTMLElement, content: ReactNode): Island {
  const root: Root = createRoot(element);
  let mounted = true;
  const render = (next: ReactNode): void => {
    if (!mounted) return;
    flushSync(() => root.render(next));
  };
  render(content);
  return {
    render,
    unmount() {
      if (!mounted) return;
      mounted = false;
      root.unmount();
    },
  };
}
