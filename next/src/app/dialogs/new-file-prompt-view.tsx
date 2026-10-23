/** The content of the new file name prompt (dialogs/new-file-prompt.ts). */
import { useLayoutEffect, useRef, type ReactNode } from "react";

export function NewFilePromptView({
  labelHtml,
  value,
  onKeyPress,
}: {
  labelHtml: string;
  value: string;
  onKeyPress: (event: KeyboardEvent) => void;
}): ReactNode {
  const ref = useRef<HTMLInputElement>(null);
  // Old: $(".name").keypress(handler), a native listener on the input.
  useLayoutEffect(() => {
    const input = ref.current;
    if (!input) return;
    input.addEventListener("keypress", onKeyPress);
    return () => input.removeEventListener("keypress", onKeyPress);
  }, [onKeyPress]);
  return (
    <div style={{ display: "grid" }}>
      {/* Old: .html() of the string table entry. */}
      <span style={{ display: "block" }} dangerouslySetInnerHTML={{ __html: labelHtml }} />
      <input
        ref={ref}
        type="text"
        style={{ marginTop: "10px", width: "100%" }}
        defaultValue={value}
        className="name"
      />
    </div>
  );
}

/** A footer button with the old optional class. */
export function PromptButton({
  label,
  className,
  onClick,
}: {
  label: string;
  className?: string;
  onClick: () => void;
}): ReactNode {
  return (
    <button className={className} onClick={onClick}>
      {label}
    </button>
  );
}
