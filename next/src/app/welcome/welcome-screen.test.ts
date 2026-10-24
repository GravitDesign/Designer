import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Length } from "../../engine/math/length.ts";
import { setContainer, setDesigner } from "../shell/globals.ts";
import { BrandLockup } from "../brand/brand-mark.tsx";
import { setActiveBranding } from "../brand/branding.ts";
import { APP_VERSION } from "../brand/version.ts";
import { Presets } from "./presets.ts";

// The dialog only needs to hold the view; the controller is what is tested.
vi.mock("../dialogs/dialog.ts", () => ({
  Dialog: {
    create: () => ({
      renderContent: vi.fn(),
      isOpen: () => true,
      close: vi.fn(),
      getContent: () => ({ querySelector: () => null }),
    }),
  },
}));

vi.mock("../document/document.ts", () => ({
  Document: class {
    constructor(readonly scene: unknown) {}
  },
}));

const { WelcomeScreen } = await import("./welcome-screen.ts");

interface Created {
  scene: Record<string, unknown>;
  page: Record<string, unknown>;
}

function fakeDesigner(settings: Record<string, unknown> = {}) {
  const created: Created[] = [];
  const designer = {
    created,
    setSetting: vi.fn(),
    getSetting: (key: string) => settings[key],
    getEnv: () => "production",
    getVersionFriendlyName: () => "3.15.0",
    createScene() {
      const page: Record<string, unknown> = {};
      const scene: Record<string, unknown> = {};
      created.push({ scene, page });
      return {
        setProperties(names: string[], values: unknown[]) {
          names.forEach((name, i) => (scene[name] = values[i]));
        },
        getActivePage: () => ({
          setProperties(names: string[], values: unknown[]) {
            names.forEach((name, i) => (page[name] = values[i]));
          },
        }),
      };
    },
    addDocument: vi.fn(),
  };
  return designer;
}

type Screen = InstanceType<typeof WelcomeScreen>;

/** The screen with the two size boxes and the unit select filled in. */
function screenWith(screen: Screen, widthText: string, heightText: string, unit: string): void {
  Object.assign(screen, {
    _widthBox: { value: () => widthText },
    _heightBox: { value: () => heightText },
    getDialogElement: () => ({ querySelector: () => ({ value: unit }) }),
    close: () => Promise.resolve(),
  });
}

function createCustom(screen: Screen): void {
  (screen as unknown as { _newDocumentCustomSize(): void })._newDocumentCustomSize();
}

let designer: ReturnType<typeof fakeDesigner>;

beforeEach(() => {
  vi.stubGlobal("document", { addEventListener: vi.fn() });
  designer = fakeDesigner();
  setDesigner(designer as never);
  setContainer({ getRuntime: () => "browser" } as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setDesigner(null);
  setContainer(null);
});

describe("welcome screen custom size (UI-NEWDOC-001 to UI-NEWDOC-004)", () => {
  it("creates an infinite canvas when both sizes are empty", () => {
    const screen = new WelcomeScreen();
    screenWith(screen, "", "", "px");
    createCustom(screen);
    expect(designer.created).toHaveLength(1);
    const { scene, page } = designer.created[0] as Created;
    expect(scene).toEqual({ ut: "px", dpi: Length.DPI });
    expect(page.w).toBe(0);
    expect(page.h).toBe(0);
    expect(designer.addDocument).toHaveBeenCalledOnce();
  });

  it("does nothing for a zero or a non-number", () => {
    const screen = new WelcomeScreen();
    for (const [w, h] of [
      ["0", "100"],
      ["100", "0"],
      ["abc", "100"],
      ["100", "abc"],
    ] as const) {
      screenWith(screen, w, h, "px");
      createCustom(screen);
    }
    expect(designer.created).toHaveLength(0);
    // Only one side empty passes, as in the old check: that side is 0 wide.
    screenWith(screen, "", "100", "px");
    createCustom(screen);
    expect((designer.created[0] as Created).page).toMatchObject({ w: 0, h: 100 });
  });

  it("converts the typed size from the unit to points at the default dpi", () => {
    const screen = new WelcomeScreen();
    screenWith(screen, "210", "297", "mm");
    createCustom(screen);
    const { scene, page } = designer.created[0] as Created;
    expect(scene).toEqual({ ut: "mm", dpi: Length.DPI });
    expect(page.w).toBeCloseTo(new Length(210, "mm").toPoint(), 9);
    expect(page.h).toBeCloseTo(new Length(297, "mm").toPoint(), 9);
    screenWith(screen, "100", "50", "px");
    createCustom(screen);
    expect((designer.created[1] as Created).page).toMatchObject({ w: 100, h: 50 });
  });

  it("reads the preset table once, not on every state change", () => {
    const spy = vi.spyOn(Presets, "getPresets");
    const screen = new WelcomeScreen();
    const calls = spy.mock.calls.length;
    (screen as unknown as { _setState(change: object): void })._setState({ version: "x" });
    (screen as unknown as { _setState(change: object): void })._setState({ version: "y" });
    expect(spy.mock.calls.length).toBe(calls);
  });
});

describe("welcome screen in the two looks (CHANGES.md)", () => {
  function view(screen: Screen): { props: { brandHead?: unknown; state: { version: string } } } {
    return (
      screen as unknown as {
        _view(): { props: { brandHead?: unknown; state: { version: string } } };
      }
    )._view();
  }

  afterEach(() => setActiveBranding("classic"));

  it("keeps the old sidebar and version line in the classic look", () => {
    setActiveBranding("classic");
    const screen = new WelcomeScreen();
    expect(view(screen).props.brandHead).toBeUndefined();
    expect(view(screen).props.state.version).toBe("Version 3.15.0 Web");
  });

  it("shows the brand and the new app's version in the next look", () => {
    setActiveBranding("next");
    const screen = new WelcomeScreen();
    const head = view(screen).props.brandHead as { type: unknown; props: { className: string } };
    expect(head.type).toBe(BrandLockup);
    expect(head.props.className).toBe("gd-welcome-lockup");
    expect(view(screen).props.state.version).toBe(`GravitDesign Next ${APP_VERSION} Web`);
  });
});
