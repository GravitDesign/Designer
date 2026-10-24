import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { setDesigner } from "../shell/globals.ts";
import { Presets } from "./presets.ts";
import { ShowWelcomeSetting } from "./show-welcome-setting.ts";
import {
  PresetListView,
  RecentDocumentsView,
  WelcomeScreenView,
  type WelcomeScreenViewProps,
} from "./welcome-screen-view.tsx";

const noop = () => undefined;

afterEach(() => setDesigner(null));

describe("presets (UI-NEWDOC-005 to UI-NEWDOC-011)", () => {
  it("has the six categories in the old order with their sizes", () => {
    const presets = Presets.getPresets(true);
    expect(presets.map((p) => [p.id, p.layouts.length])).toEqual([
      ["preset-uiux", 15],
      ["preset-social", 17],
      ["preset-print", 12],
      ["preset-presentation", 8],
      ["preset-web", 12],
      ["preset-video", 10],
    ]);
    const print = presets[2];
    expect(print?.layouts[1]).toEqual({
      id: expect.any(String),
      name: "A4",
      localeClass: null,
      unit: "mm",
      width: 210,
      height: 297,
      dpi: 300,
    });
    expect(presets[0]?.layouts[0]).toMatchObject({
      name: "iPhone 16 Pro",
      width: 393,
      height: 852,
    });
  });

  it("keeps one table unless asked for a fresh one", () => {
    const first = Presets.getPresets(true);
    expect(Presets.getPresets()).toBe(first);
    expect(Presets.getPresets(true)).not.toBe(first);
  });
});

describe("show welcome setting (UI-WELCOME-001)", () => {
  it("is on unless the setting is false", () => {
    const with_ = (value: unknown) => setDesigner({ getSetting: () => value } as never);
    with_(undefined);
    expect(ShowWelcomeSetting.isEnabled()).toBe(true);
    with_("no");
    expect(ShowWelcomeSetting.isEnabled()).toBe(true);
    with_(false);
    expect(ShowWelcomeSetting.isEnabled()).toBe(false);
    expect(ShowWelcomeSetting.getSetting()).toBe("show_welcome_screen");
  });
});

function props(changes: Partial<WelcomeScreenViewProps> = {}): WelcomeScreenViewProps {
  return {
    entries: [
      { kind: "separator", className: "start-option", index: 0 },
      {
        kind: "option",
        option: { className: "start-option", title: "New", subtitle: "Start", onClick: noop },
      },
      { kind: "separator", className: "local-option", index: 1 },
      { kind: "separator", className: "", index: 2 },
    ],
    links: [
      { text: "Tutorials", onClick: noop },
      { text: "User Guide", onClick: noop },
    ],
    presets: Presets.getPresets(true).slice(0, 1),
    texts: {
      width: "Width",
      height: "Height",
      createCanvas: "Create!",
      leaveEmpty: "Leave it empty",
      dontShow: "Don't show",
    },
    state: {
      activeOption: "start-option",
      activeSeparators: new Set([0, 1]),
      footer: { serial: 1, checked: true },
      version: "Version i015.3 Web",
    },
    widthRef: null,
    heightRef: null,
    onSizeKeyDown: noop,
    onCreate: noop,
    onPresetClick: noop,
    onDontShowChange: noop,
    onVersionClick: noop,
    ...changes,
  };
}

describe("welcome screen content (UI-WELCOME-002 to UI-WELCOME-007, UI-NEWDOC-001, UI-NEWDOC-003)", () => {
  const html = renderToStaticMarkup(<WelcomeScreenView {...props()} />);

  it("marks the active option and the separators around it", () => {
    expect(html).toContain(
      '<div class="sidebar-options"><div class="option-separator start-option active"></div>' +
        '<div class="option start-option active">',
    );
    expect(html).toContain('<div class="option-separator local-option active"></div>');
    expect(html).toContain('<div class="option-separator"></div></div>');
  });

  it("deals the links into three columns", () => {
    expect(html).toContain(
      '<div class="links-container"><div class="links-column"><div class="link">' +
        '<div class="link-icon"></div><a>Tutorials</a></div></div><div class="links-column">' +
        '<div class="link"><div class="link-icon"></div><a>User Guide</a></div></div>' +
        '<div class="links-column"></div></div>',
    );
    expect(html).toContain('<div class="version">Version i015.3 Web</div>');
  });

  it("builds the custom size row with untyped width and height boxes", () => {
    expect(html).toContain(
      '<div class="input-holder"><div><input placeholder="Width" name="width"/>' +
        '<img class="versus" src="assets/icon/versus.svg"/><input placeholder="Height" name="height"/>',
    );
    expect(html).toContain('<select name="unit"><option value="px" selected="">');
    expect(html).toContain('<button class="cloud-button active"><span>Create!</span></button>');
  });

  it("shows a preset tile with both icons", () => {
    expect(html).toContain(
      '<div class="preset"><p class="title">UI/UX Design</p><div class="icon">' +
        '<img src="assets/img/new-document/preset-uiux-white.svg"/>' +
        '<img src="assets/img/new-document/preset-uiux-black.svg" class="hover"/></div>' +
        '<div class="select-container"><p class="name">App &amp; device screens</p></div></div>',
    );
  });

  it("puts the don't-show row after the presets, only once the start page was shown", () => {
    expect(html).toMatch(
      /<\/div><div class="footer-section"><label>Don&#x27;t show<input type="checkbox" checked=""\/><\/label><\/div><\/div>$/,
    );
    const before = renderToStaticMarkup(
      <WelcomeScreenView {...props({ state: { ...props().state, footer: null } })} />,
    );
    expect(before).not.toContain("footer-section");
  });

  it("lists preset sizes and recent files", () => {
    expect(renderToStaticMarkup(<PresetListView items={["A4 (210x297 mm)"]} onPick={noop} />)).toBe(
      '<li data-value="0">A4 (210x297 mm)</li>',
    );
    expect(renderToStaticMarkup(<RecentDocumentsView items={null} empty="No Recent Files" />)).toBe(
      '<div class="menu"><div class="item">No Recent Files</div></div>',
    );
    expect(
      renderToStaticMarkup(
        <RecentDocumentsView
          items={[{ iconClass: "", name: "a.gvdesign", onClick: noop }]}
          empty="-"
        />,
      ),
    ).toBe(
      '<div class="menu"><div class="item file"><div class="icon"></div><div class="name">a.gvdesign</div></div></div>',
    );
  });
});

describe("welcome screen sidebar in the next look", () => {
  it("puts the brand head first in the sidebar, and nothing in the classic look", () => {
    const next = renderToStaticMarkup(
      <WelcomeScreenView {...props({ brandHead: <div className="gd-welcome-lockup" /> })} />,
    );
    expect(next).toContain(
      '<div class="sidebar"><div class="gd-welcome-lockup"></div><div class="sidebar-options">',
    );
    const classic = renderToStaticMarkup(<WelcomeScreenView {...props()} />);
    expect(classic).toContain('<div class="sidebar"><div class="sidebar-options">');
  });
});
