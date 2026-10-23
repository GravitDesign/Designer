// Old: designer.browser.dev.js module 1521 (the footer, GFooter).
/**
 * The #footer part: one container per footer panel (the notification
 * panel and the software update panel), shown only while one of them is
 * enabled. The part gets the class "document-loading" while the active
 * document loads or saves, which is where the port-map file name comes
 * from.
 */
import type { EventClass } from "../../engine/core/event.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { DocumentStatusEvent } from "../document/document-status-event.ts";
import { DocumentStatus } from "../document/document-status.ts";
import { css } from "./dom.ts";
import { appRegistry, designer } from "./globals.ts";
import { lateExport } from "./late.ts";
import type { HostedView } from "./part.ts";

/** The parts of a document the footer follows (GDocument). */
interface FooterDocument {
  addEventListener(
    eventClass: typeof DocumentStatusEvent,
    listener: (event: DocumentStatusEvent) => void,
    target?: object | null,
  ): void;
  removeEventListener(
    eventClass: typeof DocumentStatusEvent,
    listener: unknown,
    target?: object | null,
  ): boolean;
  isCloudFile?(): boolean;
  isExternalFile?(): boolean;
}

interface FooterPanel {
  container: HTMLElement;
  panel: HostedView;
}

export class Footer {
  private readonly _htmlElement: HTMLElement;
  private _root: HTMLElement | null = null;
  private readonly _panels: FooterPanel[] = [];
  private _activePanel: string | null = null;
  private _document: FooterDocument | null = null;

  constructor(htmlElement: HTMLElement) {
    this._htmlElement = htmlElement;
  }

  init(): void {
    const root = document.createElement("div");
    root.className = "root";
    this._htmlElement.appendChild(root);
    this._root = root;
    const updateEvent = lateExport<{ UpdateEvent?: EventClass }>(
      "shell/view.ts",
      "View",
    )?.UpdateEvent;
    for (const panel of appRegistry().footer) {
      const container = document.createElement("div");
      container.className = "panel-container";
      root.appendChild(container);
      panel.init(container);
      this._panels.push({ container, panel });
      if (!this._activePanel) this.setActivePanel(panel.getId());
      if (updateEvent)
        panel.addEventListener(updateEvent, () => {
          this._updateFooter();
          designer().relayout();
        });
    }
    this._updateFooter();
    designer().addEventListener(DocumentEvent, this._documentEvent, this);
  }

  private _documentEvent(event: DocumentEvent): void {
    const document = event.document as FooterDocument;
    switch (event.type) {
      case DocumentEvent.Type.Activated:
        document.addEventListener(DocumentStatusEvent, this._documentStatusChanged, this);
        this._document = document;
        break;
      case DocumentEvent.Type.Deactivated:
        document.removeEventListener(DocumentStatusEvent, this._documentStatusChanged, this);
        this._document = null;
        break;
    }
  }

  private _documentStatusChanged(event: DocumentStatusEvent): void {
    const document = this._document;
    if (!document || designer().getActiveDocument() !== document) return;
    const loading = (state: boolean): void => {
      this._htmlElement.classList.toggle("document-loading", state);
    };
    switch (event.status) {
      case DocumentStatus.Loading:
      case DocumentStatus.Saving:
      case DocumentStatus.Syncing:
      case DocumentStatus.Downloading:
        if (
          ((document.isCloudFile && document.isCloudFile()) ||
            (document.isExternalFile && document.isExternalFile())) &&
          event.status === DocumentStatus.Saving
        )
          return;
        loading(true);
        break;
      case DocumentStatus.LoadCancelled:
      case DocumentStatus.DownloadCancelled:
      case DocumentStatus.SaveCancelled:
      case DocumentStatus.Saved:
      case DocumentStatus.SyncFailed:
      case DocumentStatus.Downloaded:
      case DocumentStatus.DownloadFailed:
      case DocumentStatus.Loaded:
      case DocumentStatus.LoadFailed:
        loading(false);
        break;
    }
  }

  /** Shown while any panel is enabled. */
  private _updateFooter(): void {
    const enabled = this._panels.some((entry) => entry.panel.isEnabled());
    css(this._htmlElement, "display", enabled ? "" : "none");
  }

  setActivePanel(id: string): void {
    for (const entry of this._panels) {
      const panelId = entry.panel.getId();
      if (panelId === id) {
        css(entry.container, "display", "");
        entry.panel.activate();
      } else {
        css(entry.container, "display", "none");
        if (panelId === this._activePanel) entry.panel.deactivate();
      }
    }
    this._activePanel = id;
  }

  relayout(): void {}

  getHeight(): number {
    return this._htmlElement.clientHeight;
  }

  toString(): string {
    return "[Object GFooter]";
  }
}
