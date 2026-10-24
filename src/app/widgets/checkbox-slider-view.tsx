/**
 * `<CheckboxSliderView>`: a checkbox with the slider classes of
 * checkbox-slider.ts. `slider` mounts and unmounts the slider look;
 * `checked` is the box's state, owned by the parent. The `checked` class
 * is taken from the box at mount and on user changes only, as before.
 */
import { useState, type InputHTMLAttributes, type ReactNode } from "react";

export interface CheckboxSliderViewProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "onChange"
> {
  checked: boolean;
  /** The slider look (default on). */
  slider?: boolean;
  onChange?: (checked: boolean) => void;
}

/** The class list: the caller's, the slider class while mounted, then `checked`. */
export function checkboxSliderClass(
  className: string | undefined,
  slider: boolean,
  checkedClass: boolean,
): string | undefined {
  const classes = [className, slider ? "g-checkbox-slider" : "", checkedClass ? "checked" : ""]
    .filter(Boolean)
    .join(" ");
  return classes || undefined;
}

export function CheckboxSliderView({
  checked,
  slider = true,
  onChange,
  className,
  ...attributes
}: CheckboxSliderViewProps): ReactNode {
  const [checkedClass, setCheckedClass] = useState(slider && checked);
  const [mounted, setMounted] = useState(slider);
  // The old change listener stayed after an unmount.
  const [listening, setListening] = useState(slider);
  if (slider !== mounted) {
    // A mount takes the box's state into the class; an unmount keeps it.
    setMounted(slider);
    if (slider) {
      setCheckedClass(checked);
      setListening(true);
    }
  }
  return (
    <input
      {...attributes}
      type="checkbox"
      className={checkboxSliderClass(className, slider, checkedClass)}
      checked={checked}
      onChange={(event) => {
        const now = event.currentTarget.checked;
        if (listening) setCheckedClass(now);
        if (onChange) onChange(now);
      }}
    />
  );
}
