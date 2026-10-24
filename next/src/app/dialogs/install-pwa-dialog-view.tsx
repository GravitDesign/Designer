/** The content of the install-PWA dialog (dialogs/install-pwa-dialog.ts). */
import type { ReactNode } from "react";

export interface InstallPwaTexts {
  title: string;
  description: string;
  dot: string;
  install: string;
  notNow: string;
  /** HTML from the string table (old .html()). */
  requires: string;
  footerMain: string;
  footerLink: string;
  moreInformation: string;
}

export function InstallPwaDialogView({
  texts,
  supported,
  onClose,
  onInstall,
  onNotNow,
}: {
  texts: InstallPwaTexts;
  supported: boolean;
  onClose: () => void;
  onInstall: () => void;
  onNotNow: () => void;
}): ReactNode {
  return (
    <>
      <div className="g-btn-close" onClick={onClose}>
        <span className="gravit-icon-close" />
      </div>
      <div className="content">
        <div className="header" />
        <div className="main-content">
          <div className="title">{texts.title}</div>
          {/* The old "(subscription required)" link after the description
              is left out: there are no subscriptions (REMOVED.md). */}
          <div className="description">
            <span>{texts.description}</span>
            <span>{texts.dot}</span>
          </div>
          {supported ? (
            <div className="buttons">
              <button className="primary g-button" onClick={onInstall}>
                {texts.install}
              </button>
              <button className="g-button" onClick={onNotNow}>
                {texts.notNow}
              </button>
            </div>
          ) : (
            <div className="chromium-section">
              <div
                className="chromium-content"
                dangerouslySetInnerHTML={{ __html: texts.requires }}
              />
            </div>
          )}
          <div className="footer">
            <span>{texts.footerMain}</span>
            <span>{texts.footerLink}</span>
            <span>{texts.dot}</span>
            <span> </span>
            <a href="" target="_blank">
              {texts.moreInformation}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
