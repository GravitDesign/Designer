// Old: designer.browser.dev.js module 1677 (GElectronUpdateServiceClient).
/**
 * Talks to the Electron updater in the main process over IPC. The old app
 * reached ipcRenderer through Node integration; the new Electron window
 * runs with context isolation and no preload, so there is no channel
 * until one is installed with setTransport. Without one the commands are
 * logged and go nowhere, and no update event arrives.
 */
import { UpdateEventNames } from "./update-event-names.ts";

/** The part of ipcRenderer the client used. */
export interface UpdateTransport {
  send(channel: string): void;
  on(channel: string, listener: (event: unknown, data?: unknown) => void): void;
}

export class ElectronUpdateServiceClient {
  private _transport: UpdateTransport | null = null;

  setTransport(transport: UpdateTransport | null): void {
    this._transport = transport;
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

  on(channel: string, listener: (event: unknown, data?: unknown) => void): void {
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
