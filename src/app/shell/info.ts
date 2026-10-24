// Old: designer.browser.dev.js module 1522 (GInfo).
/**
 * The #info strip above the header. It only ever showed the cloud
 * account's "please confirm your e-mail" notice, which is gone with the
 * account, so the strip stays hidden; document events hide it again, as
 * before.
 */
import { DocumentEvent } from "../document/document-event.ts";
import { designer } from "./globals.ts";
import { Layout } from "./layout-ids.ts";

export class Info {
  private readonly _htmlElement: HTMLElement;
  /** Set by the e-mail notice, which can't happen any more. */
  private readonly _needToShow = false;

  constructor(htmlElement: HTMLElement) {
    this._htmlElement = htmlElement;
  }

  init(): void {
    this.update();
    designer().addEventListener(DocumentEvent, this._documentEvent, this);
  }

  update(): void {
    this._togglePanel(false);
  }

  private _togglePanel(show: boolean): void {
    if ((!show && !this._needToShow) || show) designer().setPartVisible(Layout.Info, show);
  }

  private _documentEvent(): void {
    this._togglePanel(false);
  }

  getHtmlElement(): HTMLElement {
    return this._htmlElement;
  }

  toString(): string {
    return "[Object GInfo]";
  }
}
