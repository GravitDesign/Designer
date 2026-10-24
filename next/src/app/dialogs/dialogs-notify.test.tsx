import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Runtime } from "../shell/container.ts";
import { setContainer, setDesigner } from "../shell/globals.ts";
import { MissingFontsButton, MissingFontsDialogView } from "./missing-fonts-dialog-view.tsx";
import { NotificationEvent } from "./notification-event.ts";
import { NotificationPanelView } from "./notification-panel-view.tsx";
import { ShortcutsDialogView } from "./shortcuts-dialog-view.tsx";
import { SoftwareUpdateEvents } from "./software-update-events.ts";
import { SoftwareUpdateManager, softwareUpdateManager } from "./software-update-manager.ts";
import { SoftwareUpdatePanelView } from "./software-update-panel-view.tsx";

const noop = () => undefined;

function fakeContainer(runtime: string) {
  return {
    getRuntime: () => runtime,
    getProperty: vi.fn(() => Promise.resolve(null)),
    setProperty: vi.fn(),
    removeProperty: vi.fn(),
  };
}

function fakeDesigner() {
  const triggered: object[] = [];
  return {
    triggered,
    trigger: (event: object) => triggered.push(event),
    getVersion: () => "3.15.0",
    getVersionFriendlyName: () => "i015.3",
  };
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(noop);
  vi.spyOn(console, "warn").mockImplementation(noop);
});

afterEach(() => {
  vi.restoreAllMocks();
  setDesigner(null);
  setContainer(null);
});

describe("software update manager (UI-STORAGE-010, UI-NOTIFY-005)", () => {
  it("compares a.b.c versions and rejects other formats", () => {
    const manager = new SoftwareUpdateManager();
    expect(manager._isVersionGeneralFormatHigherThan("3.15.1", "3.15.0")).toBe(true);
    expect(manager._isVersionGeneralFormatHigherThan("3.16.0", "3.15.9")).toBe(true);
    expect(manager._isVersionGeneralFormatHigherThan("4.0.0", "3.99.99")).toBe(true);
    expect(manager._isVersionGeneralFormatHigherThan("3.15.0", "3.15.0")).toBe(false);
    expect(manager._isVersionGeneralFormatHigherThan("3.14.9", "3.15.0")).toBe(false);
    expect(() => manager._isVersionGeneralFormatHigherThan("3.15", "3.15.0")).toThrow();
    expect(manager._isVersionHigherThan(undefined, "3.15.0")).toBe(false);
  });

  it("writes none of the dropped update keys when it starts", async () => {
    for (const runtime of [Runtime.Browser, Runtime.PWA, Runtime.Electron]) {
      const container = fakeContainer(runtime);
      setContainer(container as never);
      setDesigner(fakeDesigner() as never);
      await new SoftwareUpdateManager().start();
      expect(container.setProperty).not.toHaveBeenCalled();
      expect(container.getProperty).not.toHaveBeenCalled();
      expect(container.removeProperty).not.toHaveBeenCalled();
    }
  });

  it("is what softwareUpdateManager() returns once created", () => {
    const manager = new SoftwareUpdateManager();
    expect(softwareUpdateManager()).toBe(manager);
  });

  it("reports no update for a check the user asked for, nothing for a silent one", async () => {
    setContainer(fakeContainer(Runtime.Browser) as never);
    const designer = fakeDesigner();
    setDesigner(designer as never);
    const manager = new SoftwareUpdateManager();
    await manager.checkForUpdates(true);
    expect(designer.triggered).toEqual([]);
    await manager.checkForUpdates(false);
    expect(designer.triggered).toHaveLength(1);
    const event = designer.triggered[0] as InstanceType<
      typeof SoftwareUpdateEvents.UpdateNotAvailable
    >;
    expect(event).toBeInstanceOf(SoftwareUpdateEvents.UpdateNotAvailable);
    expect(event.currentVersion).toBe("i015.3");
    expect(event.isSilent).toBeUndefined();
  });
});

describe("notification event (UI-NOTIFY-001)", () => {
  it("fills in the old defaults, spelling included", () => {
    const event = new NotificationEvent({ message: "hi" });
    expect(event.notification).toEqual({ popup: false, annonymous: false, message: "hi" });
    expect(new NotificationEvent().notification).toEqual({ popup: false, annonymous: false });
    expect(new NotificationEvent({ popup: true }).notification.popup).toBe(true);
  });
});

describe("dialog content", () => {
  it("notification panel: close button, then the content (UI-NOTIFY-001)", () => {
    expect(renderToStaticMarkup(<NotificationPanelView onClose={noop} content={null} />)).toBe(
      '<div class="g-btn-close"><span class="gravit-icon-close"></span></div>',
    );
    expect(
      renderToStaticMarkup(
        <NotificationPanelView onClose={noop} content={{ wrap: true, content: "x", serial: 1 }} />,
      ),
    ).toContain('<div class="content"><div class="message"></div></div>');
    expect(
      renderToStaticMarkup(
        <NotificationPanelView onClose={noop} content={{ wrap: false, content: "x", serial: 1 }} />,
      ),
    ).toContain('<div class="content"></div>');
  });

  it("shortcuts dialog: close, title, one table row per shortcut (UI-DIALOG-013)", () => {
    expect(
      renderToStaticMarkup(
        <ShortcutsDialogView
          title="Keyboard Shortcuts"
          rows={[
            { title: "Save", shortcut: "Ctrl + S" },
            { title: "Pen", shortcut: "P" },
          ]}
          onClose={noop}
        />,
      ),
    ).toBe(
      '<div class="g-btn-close"><span class="gravit-icon-close"></span></div>' +
        '<div class="title">Keyboard Shortcuts</div><div class="wrapper"><table><tbody>' +
        "<tr><td>Save</td><td>Ctrl + S</td></tr><tr><td>Pen</td><td>P</td></tr>" +
        "</tbody></table></div>",
    );
  });

  it("missing fonts: a row per font and the disabled keep button (UI-FONT-011)", () => {
    const html = renderToStaticMarkup(
      <MissingFontsDialogView
        title="T"
        subtitle="S"
        rows={[{ font: "No Such Font", value: "Open Sans" }]}
        enablerGroups={[]}
        enablersTitle="E:"
        attach={noop}
      />,
    );
    expect(html).toBe(
      '<div class="title">T</div><div class="subtitle">S</div><div class="fonts-container">' +
        '<div class="font-row"><div class="postscriptname">No Such Font</div>' +
        '<input class="g-select" type="button" value="Open Sans"/></div></div>',
    );
    expect(
      renderToStaticMarkup(<MissingFontsButton label="Keep Fonts" disabled onClick={noop} />),
    ).toBe('<button class="g-disabled" disabled="">Keep Fonts</button>');
    expect(renderToStaticMarkup(<MissingFontsButton label="K" hidden onClick={noop} />)).toBe(
      '<button style="display:none">K</button>',
    );
  });

  it("software update panel: progress bar and percent (UI-NOTIFY-005)", () => {
    const html = renderToStaticMarkup(
      <SoftwareUpdatePanelView
        onClose={noop}
        content={{ value: { kind: "progress", text: "Downloading", percent: "42.00" }, serial: 1 }}
      />,
    );
    expect(html).toContain(
      '<div class="content"><div class="message">Downloading<div class="progress-content">' +
        '<div class="progress-element"><div class="progress-bar" style="width:42.00%"></div></div>' +
        '<div class="percent">42.00</div></div></div></div>',
    );
  });
});
