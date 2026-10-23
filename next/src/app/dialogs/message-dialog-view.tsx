/** The content of a MessageDialog (dialogs/message-dialog.ts). */
import type { ReactNode } from "react";

/**
 * `.message` with the text as HTML in a span. The old code inserted the
 * text with .html(); callers pass strings from the string tables.
 */
export function MessageDialogView({ html }: { html: string }): ReactNode {
  return (
    <div className="message" style={{ lineHeight: "1.5em" }}>
      <span dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/**
 * The OK button. The old code built it from an HTML string with the
 * label in it, so the label is HTML too.
 */
export function MessageDialogButton({
  html,
  onClick,
}: {
  html: string;
  onClick: () => void;
}): ReactNode {
  return <button onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}
