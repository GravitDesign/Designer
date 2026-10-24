/** The content of the introduction (brand/intro-dialog.ts). */
import type { MouseEvent, ReactNode } from "react";
import { BrandLockup } from "./brand-mark.tsx";
import { brandString } from "./brand-strings.ts";
import { ISSUES_URL } from "./branding.ts";

export interface IntroDialogViewProps {
  onLink: (event: MouseEvent<HTMLAnchorElement>, url: string) => void;
}

export function IntroDialogView({ onLink }: IntroDialogViewProps): ReactNode {
  const [before, after = ""] = brandString("intro.report").split("%link");
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
      <p>
        {before}
        <a href={ISSUES_URL} onClick={(event) => onLink(event, ISSUES_URL)}>
          {brandString("intro.report-link")}
        </a>
        {after}
      </p>
      <p className="gd-intro-reopen">{brandString("intro.reopen")}</p>
    </div>
  );
}

export function IntroDialogButton({ onClick }: { onClick: () => void }): ReactNode {
  return (
    <button className="primary" onClick={onClick}>
      {brandString("intro.ok")}
    </button>
  );
}
