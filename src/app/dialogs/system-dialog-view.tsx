/**
 * The content of the system dialogs (dialogs/system-dialog.ts), as the
 * old module built it with jQuery. Messages are HTML: the old code
 * inserted them with .html(), and the callers pass strings from the
 * string tables. A caller that puts a document title or file name in
 * escapes it first (the close prompt, BUGS-FIXED BUG-146).
 */
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** `$("<div>").addClass("message").html(text)`. */
export function MessageView({ html }: { html: string }): ReactNode {
  // Old: GSystemDialog alert/confirm/advanced, .message .html(e).
  return <div className="message" dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * The "don't show again" label a confirm and a one-time dialog put in
 * their footer; `onChange` gets the checkbox state.
 */
export function DontShowAgainLabel({
  text,
  onChange,
  spanClassName,
}: {
  text: string;
  onChange: (checked: boolean) => void;
  spanClassName?: string;
}): ReactNode {
  return (
    <label>
      <input type="checkbox" onChange={(event) => onChange(event.currentTarget.checked)} />
      <span className={spanClassName}>{text}</span>
    </label>
  );
}

/** Puts a caller-built element into the element React renders. */
function ElementSlot({ element }: { element: HTMLElement }): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = ref.current;
    if (host && element.parentNode !== host) host.appendChild(element);
  }, [element]);
  return <div className="input" ref={ref} />;
}

/** The prompt's message and its text field (or a caller's own field). */
export function PromptView({
  html,
  value,
  input,
  onKeyPress,
}: {
  html: string;
  value: string;
  input: HTMLElement | null;
  onKeyPress: (event: KeyboardEvent, element: HTMLInputElement) => void;
}): ReactNode {
  const ref = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const listener = (event: KeyboardEvent) => onKeyPress(event, element);
    element.addEventListener("keypress", listener);
    return () => element.removeEventListener("keypress", listener);
  }, [onKeyPress]);
  return (
    <>
      <MessageView html={html} />
      {input ? (
        <ElementSlot element={input} />
      ) : (
        <div className="input">
          <input ref={ref} className="max-width" type="text" defaultValue={value} />
        </div>
      )}
    </>
  );
}

/** A text button of the confirm, prompt and alert dialogs. */
export function TextButton({
  text,
  primary,
  disabled,
  onClick,
  title,
}: {
  text: string;
  primary?: boolean;
  /** Adds `g-disabled` (the confirm's disabled OK button). */
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}): ReactNode {
  const classes = [primary ? "primary" : "", disabled ? "g-disabled" : ""].filter(Boolean);
  return (
    <button
      className={classes.length ? classes.join(" ") : undefined}
      data-title={title}
      onClick={onClick}
    >
      {text}
    </button>
  );
}

/** A button of custom() and advanced(): its label in a span. */
export function SpanButton({
  label,
  className,
  float,
  onClick,
}: {
  label: string;
  className: string;
  float?: string;
  onClick: () => void;
}): ReactNode {
  const style: CSSProperties | undefined = float
    ? { float: float as CSSProperties["float"] }
    : undefined;
  return (
    <button className={className || undefined} style={style} onClick={onClick}>
      <span>{label}</span>
    </button>
  );
}

/** The close cross of custom() and the v1 dialogs. */
export function CloseButton({ onClick }: { onClick: () => void }): ReactNode {
  return (
    <div className="g-btn-close" onClick={onClick}>
      <span className="gravit-icon-close" />
    </div>
  );
}

export interface CustomViewProps {
  closeable: boolean;
  onClose: () => void;
  icon?: string;
  title: string;
  subtitle: string;
  footer?: string;
  /** null: no `.buttons` box at all. */
  buttons: ReactNode[] | null;
  buttonsStyle?: CSSProperties;
  dontShowAgain?: ReactNode;
}

/** GSystemDialog.custom's content. */
export function CustomView(props: CustomViewProps): ReactNode {
  return (
    <>
      {props.closeable ? <CloseButton onClick={props.onClose} /> : null}
      {props.icon ? (
        <div className="icon">
          <div className={props.icon} />
        </div>
      ) : null}
      <div className="content">
        <span className="title" dangerouslySetInnerHTML={{ __html: props.title }} />
        <span className="subtitle" dangerouslySetInnerHTML={{ __html: props.subtitle }} />
        {props.footer ? (
          <span className="footer" dangerouslySetInnerHTML={{ __html: props.footer }} />
        ) : null}
        {props.buttons ? (
          <div className="buttons" style={props.buttonsStyle}>
            {props.dontShowAgain}
            {props.buttons}
          </div>
        ) : null}
      </div>
    </>
  );
}

export interface DialogV1ViewProps {
  title: string;
  label: string;
  message: string;
  icon: string;
  closeable: boolean;
  onClose: () => void;
  details?: { label: string; items: readonly string[]; onClick?: () => void };
  options?: {
    values: readonly string[];
    tooltips?: readonly string[];
    /** Whether the radios start checked (see "One-time radio options" in QUESTIONS.md). */
    checked: boolean;
    onChange: () => void;
  };
  /** The "don't show again" checkbox's data-property. */
  setting?: string;
  dontShowAgainText: string;
  buttons: ReactNode[];
}

/** The details list of a v1 dialog: a label that folds the list open. */
function Details({ details }: { details: NonNullable<DialogV1ViewProps["details"]> }): ReactNode {
  const toggle = (event: { target: EventTarget }) => {
    if (details.onClick) details.onClick();
    const box = (event.target as Element).closest(".details");
    if (!box) return;
    for (const panel of box.querySelectorAll(".panel")) panel.classList.toggle("collapsed");
    for (const icon of box.querySelectorAll(".icon")) {
      icon.classList.toggle("gravit-icon-down");
      icon.classList.toggle("gravit-icon-up");
    }
  };
  return (
    <div className="details">
      <label onClick={toggle}>
        <span>{details.label}</span>
        <span className="gravit-icon-down icon" />
      </label>
      <div className="panel collapsed">
        <ul>
          {details.items.map((item, index) => (
            <li key={index}>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** GSystemDialog._dialogV1's content: header, icon, texts, options, footer. */
export function DialogV1View(props: DialogV1ViewProps): ReactNode {
  const { options } = props;
  return (
    <>
      <header>
        <span className="title">{props.title}</span>
        {props.closeable ? <CloseButton onClick={props.onClose} /> : null}
      </header>
      <main>
        <img src={props.icon} style={{ display: props.icon ? "" : "none" }} />
        <div className="container">
          <div className="content">
            <span className="label">{props.label}</span>
            <pre className="message">{props.message}</pre>
            {props.details ? <Details details={props.details} /> : null}
            {options ? (
              <div className="options">
                {options.values.map((value, index) => (
                  <label key={index}>
                    <input
                      type="radio"
                      name="options"
                      value={index}
                      defaultChecked={options.checked}
                      onChange={options.onChange}
                    />
                    <span>{value}</span>
                    {options.tooltips && options.tooltips[index] ? (
                      <span className="tooltip" data-title={options.tooltips[index]}>
                        ?
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
          <footer>
            {props.setting ? (
              <label>
                <input type="checkbox" data-property={props.setting} />
                <span>{props.dontShowAgainText}</span>
              </label>
            ) : null}
            {props.buttons.length ? <div className="buttons">{props.buttons}</div> : null}
          </footer>
        </div>
      </main>
    </>
  );
}

/** GSystemDialog.messageWithInfo's content. */
export function MessageWithInfoView({
  mainMessage,
  infoMessage,
}: {
  mainMessage?: string;
  infoMessage?: string;
}): ReactNode {
  return (
    <div className="content">
      {mainMessage ? (
        <div className="main-message" dangerouslySetInnerHTML={{ __html: mainMessage }} />
      ) : null}
      {infoMessage ? (
        <div className="info-message">
          <div className="info-message-icon">
            <img src="assets/icon/dialog/info.svg" />
          </div>
          <div className="info-message-content" dangerouslySetInnerHTML={{ __html: infoMessage }} />
        </div>
      ) : null}
    </div>
  );
}
