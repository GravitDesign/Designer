/** The content of the linked-image warning (dialogs/warn-linked-image-dialog.ts). */
import type { ReactNode } from "react";

export function WarnLinkedImageDialogView({
  message,
  neverRemindHtml,
  neverRemind,
  onToggle,
  onClose,
}: {
  message: string;
  neverRemindHtml: string;
  neverRemind: boolean;
  onToggle: () => void;
  onClose: () => void;
}): ReactNode {
  return (
    <>
      <div className="text-content">{message}</div>
      <div className="checkbox-content">
        {/* Old: .attr("checked", false) set no attribute; the box starts unchecked. */}
        <input
          type="checkbox"
          name="never-remind"
          defaultChecked={neverRemind}
          onChange={onToggle}
        />
        {/* Old: .html() of the string table entry. */}
        <span className="checkbox-text" dangerouslySetInnerHTML={{ __html: neverRemindHtml }} />
      </div>
      <div className="g-btn-close" onClick={onClose}>
        <span className="gravit-icon-close" />
      </div>
    </>
  );
}

/** A footer button whose caption is string-table HTML. */
export function HtmlButton({
  html,
  type,
  onClick,
}: {
  html: string;
  type?: "submit";
  onClick: () => void;
}): ReactNode {
  return (
    <button
      className="native-button"
      type={type}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
