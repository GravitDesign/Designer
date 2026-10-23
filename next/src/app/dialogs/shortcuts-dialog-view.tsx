/** The content of the keyboard shortcuts dialog (dialogs/shortcuts-dialog.ts). */
import type { ReactNode } from "react";

export interface ShortcutRow {
  title: string;
  shortcut: string;
}

export function ShortcutsDialogView({
  title,
  rows,
  onClose,
}: {
  title: string;
  rows: readonly ShortcutRow[];
  onClose: () => void;
}): ReactNode {
  return (
    <>
      <div className="g-btn-close" onClick={onClose}>
        <span className="gravit-icon-close" />
      </div>
      <div className="title">{title}</div>
      <div className="wrapper">
        <table>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td>{row.title}</td>
                <td>{row.shortcut}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
