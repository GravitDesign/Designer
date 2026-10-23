/**
 * `<UnitBoxView>`: an `<input class="g-unitbox">` with the UnitBox
 * behaviour (unit-box.ts). `value` (a Length, or null for empty) is shown
 * through the box whenever it changes; `onChange` gets the typed Length.
 * `ref` gives the UnitBox.
 */
import {
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import type { Length } from "../../engine/math/length.ts";
import { UnitBox, type UnitBoxOptions } from "./unit-box.ts";

export interface UnitBoxViewProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "defaultValue" | "ref"
> {
  options?: UnitBoxOptions;
  value?: Length | null;
  onChange?: (value: Length, box: UnitBox) => void;
  ref?: Ref<UnitBox | null>;
}

export function UnitBoxView({
  options,
  value,
  onChange,
  ref,
  className,
  ...attributes
}: UnitBoxViewProps): ReactNode {
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<UnitBox | null>(null);
  const changed = useRef(onChange);
  useLayoutEffect(() => {
    changed.current = onChange;
  });
  useLayoutEffect(() => {
    const element = input.current as HTMLInputElement;
    const attached = new UnitBox(element, { ...options, classRendered: true });
    box.current = attached;
    const listener = () => {
      if (changed.current) changed.current(attached.value(), attached);
    };
    element.addEventListener("change", listener);
    return () => {
      element.removeEventListener("change", listener);
      attached.box.detach();
      box.current = null;
    };
    // The options are read once, as the old plugin's init did.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useImperativeHandle(ref, () => box.current as UnitBox, []);
  useLayoutEffect(() => {
    if (value !== undefined && box.current) box.current.value(value);
  }, [value]);
  return (
    <input
      type="text"
      {...attributes}
      className={className ? className + " g-unitbox" : "g-unitbox"}
      ref={input}
    />
  );
}
