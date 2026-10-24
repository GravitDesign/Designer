import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventTarget } from "../../engine/core/event-target.ts";
import { Runtime } from "../shell/container.ts";
import { setContainer, setDesigner } from "../shell/globals.ts";
import { electronUpdateClient, type UpdateTransport } from "./electron-update-client.ts";
import { SoftwareUpdateEvents } from "./software-update-events.ts";
import { SoftwareUpdateManager, updateRuntime } from "./software-update-manager.ts";
import { SoftwareUpdatePanelView, type UpdatePanelContent } from "./software-update-panel-view.tsx";

const rendered: ReactElement[] = [];

vi.mock("../state/islands.tsx", () => ({
  renderInto: (_element: unknown, content: ReactElement) => {
    rendered.push(content);
    return {
      render: (next: ReactElement) => rendered.push(next),
      unmount: () => undefined,
    };
  },
}));

const { SoftwareUpdatePanel } = await import("./software-update-panel.ts");

class FakeDesigner extends EventTarget {
  triggered: object[] = [];
  override trigger(event: Parameters<EventTarget["trigger"]>[0]): void {
    this.triggered.push(event);
    super.trigger(event);
  }
  getVersion = () => "3.15.0";
  getVersionFriendlyName = () => "i015.3";
  hasModifiedDocuments = () => false;
  hasSynchronizingDocuments = () => false;
}

/** The preload's channel: what was sent, and a way to answer as the main process. */
function fakeTransport() {
  const sent: string[] = [];
  const listeners = new Map<string, ((event: unknown, data?: unknown) => void)[]>();
  const transport: UpdateTransport = {
    send: (channel) => sent.push(channel),
    on: (channel, listener) =>
      listeners.set(channel, [...(listeners.get(channel) ?? []), listener]),
  };
  const emit = (channel: string, data?: unknown) => {
    for (const listener of listeners.get(channel) ?? []) listener(null, data);
  };
  return { transport, sent, emit, listeners };
}

/** The panel's current content, from the last render of its view. */
function panelContent(): UpdatePanelContent | null {
  const last = rendered[rendered.length - 1] as ReactElement<{
    content: { value: UpdatePanelContent } | null;
  }>;
  return last.props.content ? last.props.content.value : null;
}

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

let designer: FakeDesigner;
const reload = vi.fn();

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  designer = new FakeDesigner();
  setDesigner(designer as never);
  // The desktop app loads the browser build: its container says "browser".
  setContainer({
    getRuntime: () => Runtime.Browser,
    canUnload: () => Promise.resolve(true),
  } as never);
  vi.stubGlobal("location", { reload });
  rendered.length = 0;
  reload.mockClear();
});

afterEach(() => {
  electronUpdateClient.setTransport(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setDesigner(null);
  setContainer(null);
});

describe("update client channel (R7-B-037)", () => {
  it("hands listeners added before the channel to it once installed", () => {
    const { transport, emit } = fakeTransport();
    const got: unknown[] = [];
    expect(electronUpdateClient.hasTransport()).toBe(false);
    electronUpdateClient.on("update-downloaded", (_event, data) => got.push(data));
    electronUpdateClient.setTransport(transport);
    expect(electronUpdateClient.hasTransport()).toBe(true);
    emit("update-downloaded", "ready");
    expect(got).toEqual(["ready"]);
  });
});

describe("software update in the desktop app", () => {
  it("takes the Electron path when the desktop channel is installed", () => {
    expect(updateRuntime()).toBe(Runtime.Browser);
    electronUpdateClient.setTransport(fakeTransport().transport);
    expect(updateRuntime()).toBe(Runtime.Electron);
  });

  it("asks the updater instead of reporting no update", async () => {
    const { transport, sent } = fakeTransport();
    electronUpdateClient.setTransport(transport);
    await new SoftwareUpdateManager().checkForUpdates(false);
    expect(sent).toEqual(["check-for-updates"]);
    expect(designer.triggered).toEqual([]);
  });

  it("checks, downloads and installs through the updater from the panel", async () => {
    const { transport, sent, emit } = fakeTransport();
    electronUpdateClient.setTransport(transport);
    const manager = new SoftwareUpdateManager();
    await manager.start();
    const panel = new SoftwareUpdatePanel();
    panel.init({ classList: { add: () => undefined, remove: () => undefined } } as never);
    panel.activate();

    await manager.checkForUpdates(false);
    emit("checking-for-update");
    emit("update-available", { version: "3.16.0", files: [] });
    const available = designer.triggered.find(
      (event) => event instanceof SoftwareUpdateEvents.UpdateAvailable,
    ) as InstanceType<typeof SoftwareUpdateEvents.UpdateAvailable>;
    expect(available.newVersion).toBe("3.16.0");
    expect(manager.getNewVersion()).toBe("3.16.0");
    const content = panelContent() as Extract<UpdatePanelContent, { kind: "available" }>;
    expect(content.kind).toBe("available");
    expect(content.text).toBe(
      "There's a new version available (3.16.0). You're currently using i015.3.&nbsp;",
    );

    // Update Now downloads instead of reloading the page.
    content.onUpdateNow();
    await flush();
    expect(reload).not.toHaveBeenCalled();
    expect(sent).toEqual(["check-for-updates", "donwload-update"]);

    emit("download-progress", { percent: 50 });
    expect(panelContent()).toMatchObject({ kind: "progress", percent: "50.00" });
    emit("update-downloaded", { version: "3.16.0" });
    const ready = panelContent() as Extract<UpdatePanelContent, { kind: "download-ready" }>;
    expect(ready.kind).toBe("download-ready");
    expect(ready.html).toContain("install Gravit Designer 3.16.0 now!");
    ready.onClick();
    await flush();
    expect(reload).not.toHaveBeenCalled();
    expect(sent).toEqual(["check-for-updates", "donwload-update", "install-update"]);
    panel.deactivate();
  });

  it("still reloads the page in a browser", async () => {
    const manager = new SoftwareUpdateManager();
    await manager.installUpdate();
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe("update panel messages (R7-B-036)", () => {
  const render = (value: UpdatePanelContent) =>
    renderToStaticMarkup(
      <SoftwareUpdatePanelView onClose={() => undefined} content={{ value, serial: 1 }} />,
    );

  it("shows the entity of an available update as a no-break space", () => {
    const html = render({
      kind: "available",
      text: "There's a new version available (3.16.0). You're currently using i015.3.&nbsp;",
      updateNow: "Update Now!",
      spinning: false,
      onUpdateNow: () => undefined,
    });
    expect(html).toContain(
      '<div class="message featured"><span class="gravit-icon-rotate-right-flat icon"></span>' +
        "There&#x27;s a new version available (3.16.0). You&#x27;re currently using i015.3. " +
        "<a>Update Now!</a></div>",
    );
  });

  it("shows the after-update entity the same way and plain text as it is", () => {
    expect(
      render({
        kind: "after-update",
        text: "You are now running Gravit Designer i015.3.&nbsp;",
        releaseNotes: "See release notes",
        onReleaseNotes: () => undefined,
      }),
    ).toContain("i015.3. <a>See release notes</a>");
    expect(render({ kind: "plain", text: "No update (i015.3)" })).toContain(
      '<div class="message">No update (i015.3)</div>',
    );
    expect(render({ kind: "plain", text: "<b>x</b>" })).toContain(
      '<div class="message"><span><b>x</b></span></div>',
    );
  });
});
