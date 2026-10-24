/**
 * `<InputBoxView>`: an `<input>` with the InputBox behaviour (input-box.ts)
 * attached, the way panels used `$("<input>").gInputBox(options)`.
 *
 * The box is not a React-controlled input: the text belongs to the box,
 * which normalises it and steps it. `value` is written through the box
 * (`gInputBox("value", v)`) whenever it changes, and `onChange` fires on the
 * box's change events (commit, step, scrub move) with the normalised value.
 * `ref` gives the InputBox itself, for the old imperative calls.
 */
import {
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { InputBox, type InputBoxOptions } from "./input-box.ts";

export interface InputBoxViewProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "defaultValue" | "ref"
> {
  /** The plugin options; read when the box is attached. */
  options?: InputBoxOptions;
  /** Shown through the box whenever it changes; undefined leaves the text alone. */
  value?: unknown;
  /** The box's change events, with the normalised value. */
  onChange?: (value: string, box: InputBox) => void;
  ref?: Ref<InputBox | null>;
}

export function InputBoxView({
  options,
  value,
  onChange,
  ref,
  ...attributes
}: InputBoxViewProps): ReactNode {
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<InputBox | null>(null);
  const changed = useRef(onChange);
  useLayoutEffect(() => {
    changed.current = onChange;
  });
  useLayoutEffect(() => {
    const element = input.current as HTMLInputElement;
    const attached = new InputBox(element, options);
    box.current = attached;
    const listener = () => {
      if (changed.current) changed.current(attached.value(), attached);
    };
    element.addEventListener("change", listener);
    return () => {
      element.removeEventListener("change", listener);
      attached.detach();
      box.current = null;
    };
    // The options are read once, as the old plugin's init did.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // After the attach effect, so the handle is the attached box.
  useImperativeHandle(ref, () => box.current as InputBox, []);
  useLayoutEffect(() => {
    if (value !== undefined && box.current) box.current.value(value);
  }, [value]);
  return <input type="text" {...attributes} ref={input} />;
}
