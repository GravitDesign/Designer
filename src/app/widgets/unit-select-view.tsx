/** `<UnitSelectView>`: a `<select>` with the unit options of unit-select.ts. */
import type { ReactNode, SelectHTMLAttributes } from "react";
import { unitOptions } from "./unit-select.ts";

export interface UnitSelectViewProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** English short names ("px") instead of the long names. */
  short?: boolean;
  /** Options that come before the units (the old code appended to what was there). */
  before?: ReactNode;
}

/** The unit `<option>`s alone, for a select that has other options too. */
export function UnitOptions({ short = false }: { short?: boolean }): ReactNode {
  return unitOptions().map((option) => (
    <option key={option.unit} value={option.unit}>
      {short ? option.short : option.name}
    </option>
  ));
}

export function UnitSelectView({
  short = false,
  before,
  ...attributes
}: UnitSelectViewProps): ReactNode {
  return (
    <select {...attributes}>
      {before}
      <UnitOptions short={short} />
    </select>
  );
}
