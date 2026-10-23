/** The content of the missing-fonts dialog (dialogs/missing-fonts-dialog.ts). */
import { useLayoutEffect, useRef, type ReactNode } from "react";

export interface MissingFontRow {
  /** The missing family, as the document names it. */
  font: string;
  /** What the font button shows first. */
  value: string;
}

/** Attaches the font chooser behaviour to a row's button (fonts/fonts-button.ts). */
export type AttachFontsButton = (input: HTMLInputElement, font: string) => void;

function FontRow({ row, attach }: { row: MissingFontRow; attach: AttachFontsButton }): ReactNode {
  const ref = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (ref.current) attach(ref.current, row.font);
    // Once per row, as the old code made each row once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="font-row">
      <div className="postscriptname">{row.font}</div>
      <input ref={ref} className="g-select" type="button" defaultValue={row.value} />
    </div>
  );
}

export function MissingFontsDialogView({
  title,
  subtitle,
  rows,
  enablerGroups,
  enablersTitle,
  attach,
}: {
  title: string;
  subtitle: string;
  rows: readonly MissingFontRow[];
  /** One group per setProviderEnablers call that had any. */
  enablerGroups: readonly (readonly Node[])[];
  enablersTitle: string;
  attach: AttachFontsButton;
}): ReactNode {
  return (
    <>
      <div className="title">{title}</div>
      <div className="subtitle">{subtitle}</div>
      <div className="fonts-container">
        {rows.map((row) => (
          <FontRow key={row.font} row={row} attach={attach} />
        ))}
      </div>
      {enablerGroups.map((elements, index) => (
        <EnablerGroup key={index} title={enablersTitle} elements={elements} />
      ))}
    </>
  );
}

/**
 * The subtitle React renders, then the elements the font providers built
 * (their enable switches), put in right after it as they are. A later
 * group is appended by React after them, so the order is the old one.
 */
function EnablerGroup({
  title,
  elements,
}: {
  title: string;
  elements: readonly Node[];
}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.after(...elements);
  }, [elements]);
  return (
    <div ref={ref} className="subtitle" style={{ marginTop: "5px" }}>
      {title}
    </div>
  );
}

/** A footer button; `hidden` is the old .hide(), `disabled` adds g-disabled too. */
export function MissingFontsButton({
  label,
  disabled,
  hidden,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  hidden?: boolean;
  onClick: () => void;
}): ReactNode {
  return (
    <button
      className={disabled ? "g-disabled" : undefined}
      disabled={disabled}
      style={hidden ? { display: "none" } : undefined}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
