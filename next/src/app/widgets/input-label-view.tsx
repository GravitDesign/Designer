/**
 * `<InputLabel>`: the `span.g-input-label` of input-label.ts. The input it
 * labels gets `inputLabelStyle(options)` (padding and width, in the old
 * order) and comes after it in the same container.
 */
import type { CSSProperties, ReactNode } from "react";
import { inputLabelPadding, type InputLabelOptions } from "./input-label.ts";

export function inputLabelStyle(options: InputLabelOptions): CSSProperties {
  return { paddingLeft: inputLabelPadding(options), width: "100%" };
}

export function InputLabel(options: InputLabelOptions): ReactNode {
  if (options.label)
    // Old: o.html(e.label); the labels are the panels' own strings.
    return <span className="g-input-label" dangerouslySetInnerHTML={{ __html: options.label }} />;
  return <span className={options.class ? "g-input-label " + options.class : "g-input-label"} />;
}
