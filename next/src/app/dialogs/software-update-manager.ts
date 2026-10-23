// Old: designer.browser.dev.js module 1676 (GSoftwareUpdateManager).
/**
 * Checks for a newer release and drives the update, triggering the
 * software update events on the designer for the footer panel.
 *
 * What is left of it: the old manager asked the cloud release service
 * (gApi.software.getRelease) and kept "last_update_check", "old_version"
 * and "install_update_on_start" in localStorage. The release service is
 * dropped with the cloud and those keys must not be written any more
 * (platform/dropped), so:
 *
 * - start() only connects the Electron updater channel, in Electron. It
 *   no longer schedules the daily check, records the version or installs
 *   a pending update (see "Software update check without a release
 *   service" in QUESTIONS.md).
 * - The release status is what the old code fell back to when the
 *   release service failed: silent, no forced update, no version. A check
 *   therefore never finds an update; a non-silent check reports "no update
 *   available", as before when the service was unreachable.
 */
import { System, OperatingSystem } from "../../engine/core/system.ts";
import type { Event } from "../../engine/core/event.ts";
import { Runtime } from "../shell/container.ts";
import { container, designer } from "../shell/globals.ts";
import { sleep } from "../util/designer-util.ts";
import { electronUpdateClient } from "./electron-update-client.ts";
import { SoftwareUpdateEvents } from "./software-update-events.ts";
import { UpdateEventNames } from "./update-event-names.ts";

/** What the release service answered (only the fallback is reachable now). */
export interface ReleaseStatus {
  version?: string;
  tagVersion?: string;
  forceUpdate: boolean;
  silent?: boolean;
}

/** GConfig.SOFTWARE_UPDATE (module 10). */
const SOFTWARE_UPDATE = { SHOW_CHANGE_LOG: false, CHANGE_LOG_LINK: "" } as const;

const started: { manager: SoftwareUpdateManager | null } = { manager: null };

/**
 * The manager boot created (the old gDesigner._softwareUpdateManager,
 * read through gDesigner.getSoftwareUpdateManager()); null before.
 */
export function softwareUpdateManager(): SoftwareUpdateManager | null {
  return started.manager;
}

export class SoftwareUpdateManager {
  constructor() {
    started.manager = this;
  }

  private _intervalPID: ReturnType<typeof setTimeout> | null = null;
  private _releaseStatus: ReleaseStatus = { version: undefined, forceUpdate: false };
  private _downloadCompleted = false;

  private _trigger(event: Event): void {
    designer().trigger(event);
  }

  getNewVersion(): string | undefined {
    return this._releaseStatus.version;
  }

  getCurrentVersion(): string | null {
    return designer().getVersion();
  }

  getCurrentFriendlyVersion(): string | null {
    return designer().getVersionFriendlyName();
  }

  /** "a.b.c" > "x.y.z"; throws (a string, as before) on anything else. */
  _isVersionGeneralFormatHigherThan(release: string, current: string): boolean {
    const r = release.split(".");
    const c = current.split(".");
    if (3 !== r.length || r.some((part) => isNaN(Number(part))))
      throw "Incorrect release version argument";
    if (3 !== c.length || c.some((part) => isNaN(Number(part))))
      throw "Incorrect current version argument";
    const rMajor = +(r[0] as string);
    const rMinor = +(r[1] as string);
    const rPatch = +(r[2] as string);
    const cMajor = +(c[0] as string);
    const cMinor = +(c[1] as string);
    const cPatch = +(c[2] as string);
    return (
      rMajor > cMajor ||
      (rMajor === cMajor && rMinor > cMinor) ||
      (rMajor === cMajor && rMinor === cMinor && rPatch > cPatch)
    );
  }

  _isVersionHigherThan(release: string | undefined, current: string): boolean {
    return !!release && this._isVersionGeneralFormatHigherThan(release, current);
  }

  /** The old service call failed into this status; there is no service any more. */
  async initializeReleaseStatus(): Promise<void> {
    this._releaseStatus = { silent: true, forceUpdate: false };
  }

  async initializeReleaseStatusWithNotifications(): Promise<void> {
    await this.initializeReleaseStatus();
    this._releaseStatus.silent = false;
  }

  async checkForUpdates(silent?: boolean): Promise<void> {
    // GDesigner.isOffline followed the dropped network availability
    // event; the local app is never offline.
    try {
      const current = this.getCurrentVersion() as string;
      if (silent) await this.initializeReleaseStatus();
      else await this.initializeReleaseStatusWithNotifications();
      if (this._isVersionHigherThan(this._releaseStatus.tagVersion, current)) {
        if (this._isElectron()) electronUpdateClient.checkForUpdates();
        else
          this._trigger(
            new SoftwareUpdateEvents.UpdateAvailable({
              currentVersion: this.getCurrentFriendlyVersion(),
              newVersion: this._releaseStatus.version,
              forceUpdate: this._releaseStatus.forceUpdate,
              isSilent: this._releaseStatus.silent,
            }),
          );
      } else if (!silent)
        this._trigger(
          new SoftwareUpdateEvents.UpdateNotAvailable({
            currentVersion: this.getCurrentFriendlyVersion(),
          }),
        );
    } catch (error) {
      console.error(this.toString(), "exception", error);
    }
  }

  downloadUpdate(): void {
    console.info(this.toString(), " - Downloading update");
    if (this._isElectron()) electronUpdateClient.downloadUpdate();
  }

  async installElectronUpdate(): Promise<void> {
    if (System.operatingSystem === OperatingSystem.OSX_IOS) {
      console.info(this.toString(), " - Waiting install - OSX");
      await sleep(5e3);
    }
    console.info(this.toString(), " - Installing update - Call");
    electronUpdateClient.installUpdate();
  }

  async installUpdate(): Promise<void> {
    console.info(this.toString(), " - Installing update - Start");
    if (!this._releaseStatus.silent) this._trigger(new SoftwareUpdateEvents.BeforeInstallUpdate());
    switch (container().getRuntime()) {
      case Runtime.Browser:
      case Runtime.PWA:
        location.reload();
        break;
      case Runtime.Electron:
        console.info(this.toString(), " - Checking download");
        if (this._downloadCompleted) {
          // A silent update used to be stored as "install_update_on_start"
          // for the next start; that key is dropped, so it waits for a
          // non-silent install instead.
          if (!this._releaseStatus.silent) void this.installElectronUpdate();
        } else console.warn(this.toString() + " The download has not been finished yet!");
        break;
    }
  }

  private _isElectron(): boolean {
    return container().getRuntime() === Runtime.Electron;
  }

  async start(): Promise<void> {
    const runtime = container().getRuntime();
    if (![Runtime.Electron, Runtime.Browser, Runtime.PWA].includes(runtime as never)) {
      console.warn(this.toString() + " Runtime not available for auto update!");
      return;
    }
    if (this._isElectron()) {
      const client = electronUpdateClient;
      client.on(UpdateEventNames.UpdateDownloaded, this._handleDownloadComplete.bind(this));
      client.on(UpdateEventNames.DownloadProgress, (event, data) =>
        this._handleDownloadInProgress(event, data as { percent?: unknown } | undefined),
      );
      client.on(UpdateEventNames.UpdateAvailable, this._handleUpdateAvailable.bind(this));
      client.on(UpdateEventNames.Error, this._handleUpdateError.bind(this));
      client.on(UpdateEventNames.UpdateNotAvailable, this._handleUpdateNotAvailable.bind(this));
      client.on(UpdateEventNames.CheckingForUpdate, this._handleCheckingForUpdate.bind(this));
    }
  }

  private _handleDownloadComplete(): void {
    console.info(this.toString() + " Download complete");
    this._downloadCompleted = true;
    this._trigger(
      new SoftwareUpdateEvents.DownloadComplete({
        newVersion: this._releaseStatus.version,
        forceUpdate: this._releaseStatus.forceUpdate,
        isSilent: this._releaseStatus.silent,
      }),
    );
  }

  private _handleUpdateNotAvailable(): void {
    console.info(this.toString() + " Update not available");
    this._trigger(
      new SoftwareUpdateEvents.UpdateNotAvailable({
        currentVersion: this.getCurrentFriendlyVersion(),
        isSilent: this._releaseStatus.silent,
      }),
    );
  }

  private _handleCheckingForUpdate(): void {
    console.info(this.toString() + " Checking for update");
    this._trigger(
      new SoftwareUpdateEvents.CheckingForUpdate({ isSilent: this._releaseStatus.silent }),
    );
  }

  private _handleDownloadInProgress(_event: unknown, data?: { percent?: unknown }): void {
    console.info(this.toString() + " Download in progress:" + JSON.stringify(data));
    const percent = (data as { percent?: unknown }).percent;
    this._trigger(
      new SoftwareUpdateEvents.Downloading({
        percent: parseFloat(String(percent)).toFixed(2),
        newVersion: this._releaseStatus.version,
        isSilent: this._releaseStatus.silent,
      }),
    );
  }

  private _handleUpdateAvailable(_event: unknown, data?: unknown): void {
    console.info(this.toString() + " Update available:" + JSON.stringify(data));
    this._trigger(
      new SoftwareUpdateEvents.UpdateAvailable({
        currentVersion: this.getCurrentFriendlyVersion(),
        newVersion: this._releaseStatus.version,
        forceUpdate: this._releaseStatus.forceUpdate,
        isSilent: this._releaseStatus.silent,
      }),
    );
    if (this._releaseStatus.forceUpdate && this._isElectron())
      electronUpdateClient.downloadUpdate();
  }

  private _handleUpdateError(_event: unknown, data?: unknown): void {
    console.info(this.toString() + " Update error:" + JSON.stringify(data));
    this._trigger(
      new SoftwareUpdateEvents.UpdateError({ error: data, isSilent: this._releaseStatus.silent }),
    );
  }

  stop(): void {
    if (this._intervalPID) clearInterval(this._intervalPID);
  }

  getReleaseNotesLink(): string {
    return SOFTWARE_UPDATE.CHANGE_LOG_LINK;
  }

  toString(): string {
    return "[Object GSoftwareUpdateManager]";
  }
}

/** GConfig.SOFTWARE_UPDATE.SHOW_CHANGE_LOG, for the panel. */
export const SHOW_CHANGE_LOG: boolean = SOFTWARE_UPDATE.SHOW_CHANGE_LOG;
