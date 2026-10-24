import { afterEach, describe, expect, it, vi } from "vitest";
import { electronUpdateClient } from "../dialogs/electron-update-client.ts";
import { desktopUpdateTransport, installDesktopUpdateTransport } from "./update-transport.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  electronUpdateClient.setTransport(null);
});

describe("desktop update transport", () => {
  it("is absent in a browser", () => {
    vi.stubGlobal("window", {});
    expect(desktopUpdateTransport()).toBeNull();
    expect(installDesktopUpdateTransport()).toBe(false);
  });

  it("routes the update client's commands and events through the preload's channel", () => {
    const sent: string[] = [];
    const listeners = new Map<string, (event: unknown, data?: unknown) => void>();
    vi.stubGlobal("window", {
      gravitDesktop: {
        updates: {
          send: (channel: string) => sent.push(channel),
          on: (channel: string, listener: (event: unknown, data?: unknown) => void) =>
            listeners.set(channel, listener),
        },
      },
    });
    vi.spyOn(console, "info").mockImplementation(() => {});
    expect(installDesktopUpdateTransport()).toBe(true);
    electronUpdateClient.checkForUpdates();
    electronUpdateClient.downloadUpdate();
    electronUpdateClient.installUpdate();
    expect(sent).toEqual(["check-for-updates", "donwload-update", "install-update"]);
    const progress: unknown[] = [];
    electronUpdateClient.on("download-progress", (_e, data) => progress.push(data));
    listeners.get("download-progress")?.(null, { percent: 50 });
    expect(progress).toEqual([{ percent: 50 }]);
  });
});
