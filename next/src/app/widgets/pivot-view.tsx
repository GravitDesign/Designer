/**
 * `<PivotView value onChange>`: the pivot picker (pivot.ts). A click marks
 * the side right away (as the old value() call did before "pivotchange")
 * and reports it; a new `value` from the parent replaces the mark.
 */
import { useState, type HTMLAttributes, type ReactNode } from "react";
import { designerOrNull } from "../shell/globals.ts";
import { PIVOT_CLICK_STATS, pivotSides } from "./pivot.ts";

export interface PivotViewProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** The active side ("tl", "cc", ...), or null for none. */
  value: string | null;
  onChange?: (side: string) => void;
}

export function PivotView({
  value,
  onChange,
  className,
  ...attributes
}: PivotViewProps): ReactNode {
  const [active, setActive] = useState(value);
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setActive(value);
  }
  return (
    <div {...attributes} className={className ? className + " g-pivot" : "g-pivot"}>
      <div className="borderline" />
      {pivotSides().map((side) => (
        <div
          key={side}
          className={side === active ? "side g-active" : "side"}
          data-side={side}
          onClick={() => {
            const designer = designerOrNull();
            if (designer) designer.stats(PIVOT_CLICK_STATS);
            setActive(side);
            if (onChange) onChange(side);
          }}
        />
      ))}
    </div>
  );
}
