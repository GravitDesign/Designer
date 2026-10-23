/**
 * `<InputSelectView>`: `div.g-input-select > input + button` with the
 * InputSelect behaviour (input-select.ts). `onChange` runs for every
 * change event of the container (twice per change, as the old container
 * listeners heard it; see input-select.ts). `ref` gives the InputSelect.
 */
import {
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { InputSelect, type InputSelectOptions } from "./input-select.ts";

export interface InputSelectViewProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "ref"
> {
  options?: InputSelectOptions;
  value?: unknown;
  onChange?: (value: string, select: InputSelect) => void;
  ref?: Ref<InputSelect | null>;
}

export function InputSelectView({
  options,
  value,
  onChange,
  ref,
  className,
  ...attributes
}: InputSelectViewProps): ReactNode {
  const element = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const select = useRef<InputSelect | null>(null);
  const changed = useRef(onChange);
  useLayoutEffect(() => {
    changed.current = onChange;
  });
  const list = (options && options.list) || [];
  useLayoutEffect(() => {
    const host = element.current as HTMLDivElement;
    const attached = new InputSelect(host, options, {
      input: input.current as HTMLInputElement,
      button: button.current as HTMLButtonElement,
    });
    select.current = attached;
    const listener = () => {
      if (changed.current) changed.current(attached.value(), attached);
    };
    host.addEventListener("change", listener);
    return () => {
      host.removeEventListener("change", listener);
      attached.box.detach();
      select.current = null;
    };
    // The options are read once, as the old plugin's init did.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useImperativeHandle(ref, () => select.current as InputSelect, []);
  useLayoutEffect(() => {
    if (value !== undefined && select.current) select.current.value(value);
  }, [value]);
  return (
    <div
      {...attributes}
      className={className ? className + " g-input-select" : "g-input-select"}
      ref={element}
    >
      <input type="text" ref={input} />
      <button style={list.length ? undefined : { display: "none" }} ref={button} />
    </div>
  );
}
