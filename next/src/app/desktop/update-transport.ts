/**
 * The desktop app's software update channel, as the client sees it: the
 * main window's preload (electron/preload.cjs) puts
 * window.gravitDesktop.updates on the page, which has the two ipcRenderer
 * methods the update client uses (UpdateTransport). In a browser there is
 * no such object.
 */
import { electronUpdateClient, type UpdateTransport } from "../dialogs/electron-update-client.ts";

interface DesktopBridge {
  updates?: UpdateTransport;
}

/** The desktop update channel, or null outside the desktop app. */
export function desktopUpdateTransport(): UpdateTransport | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as unknown as { gravitDesktop?: DesktopBridge }).gravitDesktop;
  const updates = bridge?.updates;
  return updates && typeof updates.send === "function" && typeof updates.on === "function"
    ? updates
    : null;
}

/**
 * Connects the update client to the desktop channel when there is one;
 * true when it did. Runs when the module loads (boot loads every app
 * module before the update manager starts), so the manager finds the
 * channel in place.
 */
export function installDesktopUpdateTransport(): boolean {
  const transport = desktopUpdateTransport();
  if (!transport) return false;
  electronUpdateClient.setTransport(transport);
  return true;
}

installDesktopUpdateTransport();
