/** The content of the software update panel and its dialog (dialogs/software-update-panel.ts). */
import type { ReactNode } from "react";

/** What the panel shows, one state per update event. */
export type UpdatePanelContent =
  | { kind: "after-update"; text: string; releaseNotes: string | null; onReleaseNotes: () => void }
  | { kind: "plain"; text: string }
  | { kind: "download-ready"; html: string; onClick: () => void }
  | { kind: "updating"; text: string }
  | { kind: "progress"; text: string; percent: string }
  | {
      kind: "available";
      text: string;
      updateNow: string;
      spinning: boolean;
      onUpdateNow: () => void;
    };

const ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/**
 * A localized message as jQuery's append(string) showed it: a string with
 * markup or an entity (the `&nbsp;` at the end of "text.update-available"
 * and "text.after-update") was parsed as HTML, anything else became a
 * text node. Entities alone are decoded into the text node, so no wrapper
 * element appears; real tags need a span.
 */
export function appendedText(text: string): ReactNode {
  if (!/<|&#?\w+;/.test(text)) return text;
  if (text.indexOf("<") < 0)
    return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (entity: string, name: string) => {
      if (name[0] === "#")
        return String.fromCodePoint(
          name[1] === "x" || name[1] === "X"
            ? parseInt(name.slice(2), 16)
            : parseInt(name.slice(1)),
        );
      return ENTITIES[name] ?? entity;
    });
  return <span dangerouslySetInnerHTML={{ __html: text }} />;
}

function Message({ content }: { content: UpdatePanelContent }): ReactNode {
  switch (content.kind) {
    case "after-update":
      return (
        <div className="message featured">
          {appendedText(content.text)}
          {content.releaseNotes !== null ? (
            <a onClick={content.onReleaseNotes}>{content.releaseNotes}</a>
          ) : null}
        </div>
      );
    case "plain":
      return <div className="message">{appendedText(content.text)}</div>;
    case "download-ready":
      // Old: .html() of the string table entry with the version in it.
      return (
        <div
          className="message featured"
          onClick={content.onClick}
          dangerouslySetInnerHTML={{ __html: content.html }}
        />
      );
    case "updating":
      return (
        <div className="message featured">
          <span className="gravit-icon-rotate-right-flat icon spin" />
          {content.text}
        </div>
      );
    case "progress":
      return (
        <div className="message">
          {content.text}
          <div className="progress-content">
            <div className="progress-element">
              <div className="progress-bar" style={{ width: `${content.percent}%` }} />
            </div>
            <div className="percent">{content.percent}</div>
          </div>
        </div>
      );
    case "available":
      return (
        <div className="message featured">
          <span
            className={`gravit-icon-rotate-right-flat icon${content.spinning ? " spin" : ""}`}
          />
          {appendedText(content.text)}
          <a onClick={content.onUpdateNow}>{content.updateNow}</a>
        </div>
      );
  }
}

export function SoftwareUpdatePanelView({
  onClose,
  content,
}: {
  onClose: () => void;
  content: { value: UpdatePanelContent; serial: number } | null;
}): ReactNode {
  return (
    <>
      <div className="g-btn-close" onClick={onClose}>
        <span className="gravit-icon-close" />
      </div>
      {content ? (
        <div className="content" key={content.serial}>
          <Message content={content.value} />
        </div>
      ) : null}
    </>
  );
}

/** The forced update dialog: logo, texts (string table HTML) and OK. */
export function ForceUpdateDialogView({
  title,
  subtitle,
  information,
  ok,
  onClose,
}: {
  title: string;
  subtitle: string;
  information: string;
  ok: string;
  onClose: () => void;
}): ReactNode {
  return (
    <>
      <div className="g-btn-close" onClick={onClose}>
        <span className="gravit-icon-close" />
      </div>
      <div className="logo" />
      <div className="content">
        <span className="title" dangerouslySetInnerHTML={{ __html: title }} />
        <span className="subtitle" dangerouslySetInnerHTML={{ __html: subtitle }} />
        <span className="update-information" dangerouslySetInnerHTML={{ __html: information }} />
        <div className="buttons">
          <button onClick={onClose}>
            <span>{ok}</span>
          </button>
        </div>
      </div>
    </>
  );
}
