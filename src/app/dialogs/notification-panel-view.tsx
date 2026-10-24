/** The content of the footer's notification panel (dialogs/notification-panel.ts). */
import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * What jQuery's .append() put in: a DOM node as it is, a string as HTML
 * (jQuery parsed every string it appended), nothing for undefined.
 */
export type PanelContent = Node | string | null | undefined;

export interface NotificationContent {
  /** Wrapped in `.message` (plain and builder notifications) or not (custom). */
  wrap: boolean;
  content: PanelContent;
  /** Changes with every notification, so the `.content` element is a new one. */
  serial: number;
}

/** Appends the content into the element React leaves empty. */
function useAppended(content: PanelContent) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    if (content instanceof Node) host.appendChild(content);
    else if (typeof content === "string" && content) host.insertAdjacentHTML("beforeend", content);
  }, [content]);
  return ref;
}

function Content({ content }: { content: NotificationContent }): ReactNode {
  const ref = useAppended(content.content);
  return content.wrap ? (
    <div className="content">
      <div className="message" ref={ref} />
    </div>
  ) : (
    <div className="content" ref={ref} />
  );
}

export function NotificationPanelView({
  onClose,
  content,
}: {
  onClose: () => void;
  content: NotificationContent | null;
}): ReactNode {
  return (
    <>
      <div className="g-btn-close" onClick={onClose}>
        <span className="gravit-icon-close" />
      </div>
      {content ? <Content key={content.serial} content={content} /> : null}
    </>
  );
}
