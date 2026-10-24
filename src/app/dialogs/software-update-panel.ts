// Old: designer.browser.dev.js module 1665 (GSoftwareUpdatePanel).
/**
 * The footer panel for software updates: it follows the update events
 * the SoftwareUpdateManager triggers on the designer (while active) and
 * shows "update available / downloading / ready / updated / none /
 * error". A forced update also opens a dialog that installs after a five
 * minute countdown. Silent events show nothing.
 *
 * With the release service gone (software-update-manager.ts) only a
 * non-silent "no update available" can still arrive in the browser. In
 * the desktop app the Electron updater's events arrive, and the runtime
 * switches take the Electron branch (updateRuntime): Update Now downloads
 * instead of reloading the page.
 */
import { createElement } from "react";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Panel } from "../inspector/panel.ts";
import { Runtime } from "../shell/container.ts";
import { container, designer } from "../shell/globals.ts";
import { View } from "../shell/view.ts";
import { renderInto, type Island } from "../state/islands.tsx";
import { Dialog } from "./dialog.ts";
import { SoftwareUpdateEvents } from "./software-update-events.ts";
import {
  SHOW_CHANGE_LOG,
  softwareUpdateManager,
  updateRuntime,
  type SoftwareUpdateManager,
} from "./software-update-manager.ts";
import {
  ForceUpdateDialogView,
  SoftwareUpdatePanelView,
  type UpdatePanelContent,
} from "./software-update-panel-view.tsx";
import { SystemDialog } from "./system-dialog.ts";

type AfterUpdate = InstanceType<typeof SoftwareUpdateEvents.AfterUpdate>;
type DownloadComplete = InstanceType<typeof SoftwareUpdateEvents.DownloadComplete>;
type Downloading = InstanceType<typeof SoftwareUpdateEvents.Downloading>;
type UpdateAvailable = InstanceType<typeof SoftwareUpdateEvents.UpdateAvailable>;
type UpdateError = InstanceType<typeof SoftwareUpdateEvents.UpdateError>;
type UpdateNotAvailable = InstanceType<typeof SoftwareUpdateEvents.UpdateNotAvailable>;

function text(key: string): string {
  return Locale.get(new LocaleKey("GSoftwareUpdatePanel", key)) as string;
}

/** gDesigner.getSoftwareUpdateManager(), once the designer has it; until then the started one. */
function manager(): SoftwareUpdateManager {
  const host = designer() as unknown as {
    getSoftwareUpdateManager?(): SoftwareUpdateManager | null;
  };
  const found = host.getSoftwareUpdateManager
    ? host.getSoftwareUpdateManager()
    : softwareUpdateManager();
  return found as SoftwareUpdateManager;
}

/** gDesigner.createCountdown (module 1491), not in the designer yet: a plain timeout. */
function createCountdown(done: () => void, ms: number): void {
  const host = designer() as unknown as { createCountdown?(done: () => void, ms: number): void };
  if (host.createCountdown) host.createCountdown(done, ms);
  else setTimeout(done, ms);
}

export class SoftwareUpdatePanel extends Panel {
  static {
    registerClass(this, "GSoftwareUpdatePanel");
  }

  static readonly ID = "software-update-panel";

  private _mustBeOpened: boolean | null = null;
  private _htmlElement: HTMLElement | null = null;
  private _island: Island | null = null;
  private _content: { value: UpdatePanelContent; serial: number } | null = null;
  private _serial = 0;

  override init(htmlElement: HTMLElement): void {
    this._htmlElement = htmlElement;
    htmlElement.classList.add("software-update-panel");
    this._island = renderInto(htmlElement, this._view());
    this._updatePanelState(false);
  }

  private _view() {
    return createElement(SoftwareUpdatePanelView, {
      onClose: () => this._hide(),
      content: this._content,
    });
  }

  private _hide(): void {
    this._updatePanelState(false);
  }

  private _changePanelVisibility(visible: boolean): void {
    const element = this._htmlElement as HTMLElement;
    if (visible) element.classList.remove("g-hide");
    else element.classList.add("g-hide");
  }

  private _updatePanelState(open: boolean): void {
    if (open !== this._mustBeOpened) {
      this._changePanelVisibility(open);
      this._mustBeOpened = open;
      this.trigger(View.UPDATE_EVENT);
    }
  }

  /** A new `.content` with this state (the old code replaced the element). */
  private _updateContent(value: UpdatePanelContent): void {
    this._content = { value, serial: ++this._serial };
    if (this._island) this._island.render(this._view());
  }

  override activate(): void {
    this._addEventListeners();
  }

  override deactivate(): void {
    this._removeEventListeners();
  }

  private _addEventListeners(): void {
    const d = designer();
    d.addEventListener(SoftwareUpdateEvents.AfterUpdate, this._handleAfterUpdate, this);
    d.addEventListener(SoftwareUpdateEvents.DownloadComplete, this._handleDownloadComplete, this);
    d.addEventListener(SoftwareUpdateEvents.Downloading, this._handleDownloadInProgress, this);
    d.addEventListener(SoftwareUpdateEvents.UpdateAvailable, this._handleUpdateAvailable, this);
    d.addEventListener(SoftwareUpdateEvents.UpdateError, this._handleUpdateError, this);
    d.addEventListener(
      SoftwareUpdateEvents.UpdateNotAvailable,
      this._handleUpdateNotAvailable,
      this,
    );
  }

  private _handleAfterUpdate(event: AfterUpdate): void {
    if (!this._shouldShowMessages(event)) return;
    const message = text("text.after-update").replace(
      "%currentVersion",
      String(event.currentVersion),
    );
    this._updateContent({
      kind: "after-update",
      text: message,
      releaseNotes: SHOW_CHANGE_LOG ? text("text.see-release-notes") : null,
      onReleaseNotes: () => {
        container().openExternalLink(null, manager().getReleaseNotesLink());
      },
    });
    this._updatePanelState(true);
  }

  private _handleUpdateNotAvailable(event: UpdateNotAvailable): void {
    if (!this._shouldShowMessages(event)) return;
    const message = text("text.update-not-available").replace(
      "%currentVersion",
      String(event.currentVersion),
    );
    this._updateContent({ kind: "plain", text: message });
    this._updatePanelState(true);
  }

  private _handleDownloadComplete(event: DownloadComplete): void {
    if (!this._shouldShowMessages(event)) return;
    const html = text("text.download-ready").replace("%newVersion", String(event.newVersion));
    let installing = false;
    this._updateContent({
      kind: "download-ready",
      html,
      onClick: async () => {
        if (installing) return;
        if (
          await container().canUnload(
            designer().hasModifiedDocuments(),
            designer().hasSynchronizingDocuments(),
          )
        ) {
          installing = true;
          void manager().installUpdate();
          this._updateContent({ kind: "updating", text: text("text.updating") });
        }
      },
    });
    this._updatePanelState(true);
    if (event.forceUpdate) this._createForceUpdateMessageDialog();
  }

  private _handleDownloadInProgress(event: Downloading): void {
    if (!this._shouldShowMessages(event)) return;
    const message = text("text.download-progress").replace("%newVersion", String(event.newVersion));
    const percent = String(event.percent);
    // The message is built once; later events only move the bar.
    if (this._content && this._content.value.kind === "progress") {
      this._content = {
        value: { ...this._content.value, percent },
        serial: this._content.serial,
      };
      if (this._island) this._island.render(this._view());
    } else this._updateContent({ kind: "progress", text: message, percent });
  }

  private _shouldShowMessages(event: { isSilent?: boolean }): boolean {
    return !event.isSilent;
  }

  private _handleUpdateAvailable(event: UpdateAvailable): void {
    if (!this._shouldShowMessages(event)) return;
    const force = event.forceUpdate;
    if (event.isSilent && !force) return;
    const runtime = updateRuntime();
    if (force && (runtime === Runtime.Browser || runtime === Runtime.PWA))
      this._createForceUpdateMessageDialog();
    const message = text("text.update-available")
      .replace("%newVersion", String(event.newVersion))
      .replace("%currentVersion", String(event.currentVersion));
    const content: Extract<UpdatePanelContent, { kind: "available" }> = {
      kind: "available",
      text: message,
      updateNow: text("text.update-now"),
      spinning: false,
      onUpdateNow: () => {
        if (this._content && this._content.value === content) {
          this._content = { value: { ...content, spinning: true }, serial: this._content.serial };
          if (this._island) this._island.render(this._view());
        }
        void this._installAfterDocumentUnload();
      },
    };
    this._updateContent(content);
    this._updatePanelState(true);
  }

  private async _installAfterDocumentUnload(): Promise<void> {
    if (
      await container().canUnload(
        designer().hasModifiedDocuments(),
        designer().hasSynchronizingDocuments(),
      )
    )
      switch (updateRuntime()) {
        case Runtime.Browser:
        case Runtime.PWA:
          void manager().installUpdate();
          break;
        case Runtime.Electron:
          manager().downloadUpdate();
      }
    else SystemDialog.alert(text("text.dialog-unsaved-documents"));
  }

  private _createForceUpdateMessageDialog(): void {
    let closed = false;
    const countdown = 5 * 60 * 1000;
    const close = (): void => {
      if (closed) return;
      closed = true;
      dialog.close();
      createCountdown(() => {
        void manager().installUpdate();
      }, countdown);
    };
    const dialog: Dialog = Dialog.create(
      createElement(ForceUpdateDialogView, {
        title: text("text.force-new-version-available").replace(
          "%newVersion",
          String(manager().getNewVersion()),
        ),
        subtitle: text("text.force-message-avoid-losing-progress"),
        information: text("text.force-update-information-time").replace("%minutes", "5"),
        ok: text("text.ok"),
        onClose: close,
      }),
      { releaseOnClose: true, className: "g-force-update-app-dialog", closeCallback: close },
    );
    dialog.open(false);
  }

  private _handleUpdateError(event: UpdateError): void {
    if (!this._shouldShowMessages(event)) return;
    this._updateContent({ kind: "plain", text: text("text.update-error") });
    this._updatePanelState(true);
  }

  /** Without a target: removes every registration of each handler. */
  private _removeEventListeners(): void {
    const d = designer();
    d.removeEventListener(SoftwareUpdateEvents.AfterUpdate, this._handleAfterUpdate);
    d.removeEventListener(SoftwareUpdateEvents.DownloadComplete, this._handleDownloadComplete);
    d.removeEventListener(SoftwareUpdateEvents.Downloading, this._handleDownloadInProgress);
    d.removeEventListener(SoftwareUpdateEvents.UpdateAvailable, this._handleUpdateAvailable);
    d.removeEventListener(SoftwareUpdateEvents.UpdateError, this._handleUpdateError);
    d.removeEventListener(SoftwareUpdateEvents.UpdateNotAvailable, this._handleUpdateNotAvailable);
  }

  override getTitle(): string {
    return text("title");
  }

  override isEnabled(): boolean {
    return !!this._mustBeOpened;
  }

  override toString(): string {
    return "[Object GSoftwareUpdatePanel]";
  }

  override getId(): string {
    return SoftwareUpdatePanel.ID;
  }
}
