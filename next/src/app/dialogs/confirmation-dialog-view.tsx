/** The content of the confirmation dialog (dialogs/confirmation-dialog.ts). */
import type { ReactNode } from "react";

export function ConfirmationDialogView({
  info,
  buttonText,
  onConfirm,
}: {
  info: string;
  buttonText: string;
  onConfirm: () => void;
}): ReactNode {
  return (
    <>
      <div className="header">
        <span className="gravit-icon-thanks" />
      </div>
      <div className="content">
        <span>{info}</span>
      </div>
      <hr />
      <div className="footer">
        <button className="highlight" onClick={onConfirm}>
          {buttonText}
        </button>
      </div>
    </>
  );
}
