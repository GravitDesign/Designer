// Old: designer.browser.dev.js module 1677 (GElectronUpdateServiceClient).
/**
 * Talks to the Electron updater in the main process over IPC. The old app
 * reached ipcRenderer through Node integration; the new Electron window
 * runs with context isolation, and its preload hands the page a channel
 * that desktop/update-transport.ts installs with setTransport. Without one
 * (in a browser) the commands are logged and go nowhere. Listeners added
 * before the channel is installed are kept and handed to it then.
 */
import { UpdateEventNames } from "./update-event-names.ts";

/** The part of ipcRenderer the client used. */
export interface UpdateTransport {
  send(channel: string): void;
  on(channel: string, listener: (event: unknown, data?: unknown) => void): void;
}

type UpdateListener = (event: unknown, data?: unknown) => void;

export class ElectronUpdateServiceClient {
  private _transport: UpdateTransport | null = null;
  /** Every listener added with on(), for a channel installed later. */
  private _listeners: [string, UpdateListener][] = [];

  setTransport(transport: UpdateTransport | null): void {
    this._transport = transport;
    if (transport)
      for (const [channel, listener] of this._listeners) transport.on(channel, listener);
  }

  /** True when the desktop app's update channel is installed. */
  hasTransport(): boolean {
    return !!this._transport;
  }

  installUpdate(): void {
    console.info(this.toString() + " Firing install update");
    this._send(UpdateEventNames.CommandInstallUpdate);
  }

  checkForUpdates(): void {
    console.info(this.toString() + " Firing checking update");
    this._send(UpdateEventNames.CommandCheckForUpdates);
  }

  downloadUpdate(): void {
    console.info(this.toString() + " Firing download update");
    this._send(UpdateEventNames.CommandDownloadUpdate);
  }

  on(channel: string, listener: UpdateListener): void {
    this._listeners.push([channel, listener]);
    if (this._transport) this._transport.on(channel, listener);
  }

  private _send(channel: string): void {
    if (this._transport) this._transport.send(channel);
  }

  toString(): string {
    return "[Object GElectronUpdateServiceClient]";
  }
}

/** The old module exported one instance. */
export const electronUpdateClient = new ElectronUpdateServiceClient();
