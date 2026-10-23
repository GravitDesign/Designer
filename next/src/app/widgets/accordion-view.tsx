/**
 * `<AccordionButton>`: the fold button and ghost the accordion (accordion.ts)
 * puts in a header, for headers React renders. The parent owns the state:
 * it gives the header `collapsed`/`expanded` (accordionHeaderClass) and
 * hides the body with `display: none` while collapsed.
 */
import type { ReactNode } from "react";

/** The class the old plugin gave a header after a toggle. */
export function accordionHeaderClass(collapsed: boolean): string {
  return collapsed ? "collapsed" : "expanded";
}

export function AccordionButton({
  collapsed,
  hovered,
  onToggle,
}: {
  collapsed: boolean;
  /** The title is hovered (the old plugin toggled `hovered` on the button). */
  hovered?: boolean;
  onToggle: () => void;
}): ReactNode {
  return (
    <>
      <button className={hovered ? "g-accordion hovered" : "g-accordion"} onClick={onToggle}>
        <span className={collapsed ? "gravit-icon-right" : "gravit-icon-down"} />
      </button>
      <div className="g-accordion-ghost" />
    </>
  );
}
