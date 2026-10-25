/** The content of the introduction (brand/intro-dialog.ts). */
import { useState, type MouseEvent, type ReactNode } from "react";
import { BrandLockup } from "./brand-mark.tsx";
import { brandString, type BrandStringKey } from "./brand-strings.ts";
import { ISSUES_URL, LEGACY_URL } from "./branding.ts";

export interface IntroDialogViewProps {
  onLink: (event: MouseEvent<HTMLAnchorElement>, url: string) => void;
}

/** A paragraph whose "%link" is a link to `url`. */
function LinkParagraph({
  text,
  label,
  url,
  onLink,
}: {
  text: BrandStringKey;
  label: BrandStringKey;
  url: string;
} & IntroDialogViewProps): ReactNode {
  const [before, after = ""] = (brandString(text) as string).split("%link");
  return (
    <p>
      {before}
      <a href={url} onClick={(event) => onLink(event, url)}>
        {brandString(label) as string}
      </a>
      {after}
    </p>
  );
}

export function IntroDialogView({ onLink }: IntroDialogViewProps): ReactNode {
  return (
    <div className="gd-intro">
      <BrandLockup className="gd-intro-lockup" />
      <h2 className="gd-intro-title">{brandString("intro.title")}</h2>
      <p>{brandString("intro.lead")}</p>
      <p>{brandString("intro.local")}</p>
      <p>{brandString("intro.files")}</p>
      <p className="gd-intro-gone-title">{brandString("intro.gone-title")}</p>
      <ul className="gd-intro-gone">
        {brandString("intro.gone").map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <LinkParagraph
        text="intro.report"
        label="intro.report-link"
        url={ISSUES_URL}
        onLink={onLink}
      />
      <LinkParagraph
        text="intro.legacy"
        label="intro.legacy-link"
        url={LEGACY_URL}
        onLink={onLink}
      />
      <p className="gd-intro-reopen">{brandString("intro.reopen")}</p>
    </div>
  );
}

export interface IntroDialogFooterProps {
  /** Whether the box has to be ticked before "Got it" works (first start). */
  needsConfirm: boolean;
  onConfirm: (confirmed: boolean) => void;
  onClick: () => void;
}

export function IntroDialogFooter({
  needsConfirm,
  onConfirm,
  onClick,
}: IntroDialogFooterProps): ReactNode {
  const [confirmed, setConfirmed] = useState(!needsConfirm);
  return (
    <>
      {needsConfirm && (
        <label className="gd-intro-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              setConfirmed(checked);
              onConfirm(checked);
            }}
          />
          <span>{brandString("intro.confirm")}</span>
        </label>
      )}
      <button className="primary" disabled={!confirmed} onClick={onClick}>
        {brandString("intro.ok")}
      </button>
    </>
  );
}
