import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Style } from "../../engine/style/style.ts";
import { Text } from "../../engine/text/text.ts";
import { DocumentStatus } from "../document/document-status.ts";
import { DocumentStatusEvent } from "../document/document-status-event.ts";
import { FontsProviderManager } from "../fonts/font-manager.ts";
import { setDesigner } from "../shell/globals.ts";
import type { MissingFontsDocument } from "./missing-fonts-dialog.ts";

interface FakeDialog {
  renderContent: ReturnType<typeof vi.fn>;
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  className: string;
}

const dialogs: FakeDialog[] = [];

vi.mock("./dialog.ts", () => ({
  Dialog: {
    create: (_content: unknown, options: { className: string }) => {
      const dialog = {
        renderContent: vi.fn(),
        open: vi.fn(),
        close: vi.fn(),
        className: options.className,
      };
      dialogs.push(dialog);
      return dialog;
    },
  },
}));

const { MissingFontsDialog, handleMissingFont, currentMissingFontsDialog } =
  await import("./missing-fonts-dialog.ts");

type Visitor = (node: unknown) => boolean | undefined;

/** A scene holding the given nodes and a property map. */
function fakeScene(nodes: unknown[], properties: Record<string, unknown> = {}) {
  return {
    properties,
    getProperty: (name: string) => properties[name] ?? null,
    setProperty: (name: string, value: unknown) => {
      properties[name] = value;
    },
    acceptChildren(visitor: Visitor) {
      for (const node of nodes) if (visitor(node) === false) return;
    },
  };
}

let session = 0;

function fakeDocument(
  scene: ReturnType<typeof fakeScene>,
  status: number = DocumentStatus.Ready,
): MissingFontsDocument {
  // The scene visits the fake nodes, which aren't engine Nodes.
  return {
    getScene: () => scene,
    getStatus: () => status,
    sessionId: "s" + ++session,
  } as unknown as MissingFontsDocument;
}

interface TextOptions {
  fake?: boolean;
  embedded?: boolean;
  runs?: { fontFamily?: string }[];
  fontFamilies?: string[];
}

/** A Text (for instanceof) with only what the dialog calls; `calls` records them. */
function fakeText(options: TextOptions): Text & { calls: unknown[][] } {
  const text = Object.create(Text.prototype) as Text & { calls: unknown[][] };
  const calls: unknown[][] = [];
  Object.assign(text, {
    calls,
    $fontFamilies: options.fontFamilies,
    isFakeText: () => !!options.fake,
    hasEmbeddedFonts: () => !!options.embedded,
    replaceFonts: (...args: unknown[]) => calls.push(["replaceFonts", ...args]),
    getContent: () => options.runs ?? null,
    setText: (runs: unknown) => calls.push(["setText", runs]),
    repaint: () => calls.push(["repaint"]),
  });
  return text;
}

function fakeStyle(family: string | null): Style & { properties: Record<string, unknown> } {
  const style = Object.create(Style.prototype) as Style & { properties: Record<string, unknown> };
  const properties: Record<string, unknown> = { _tff: family };
  Object.assign(style, {
    properties,
    getProperty: (name: string) => properties[name] ?? null,
    setProperty: (name: string, value: unknown) => {
      properties[name] = value;
    },
  });
  return style;
}

function installDesigner(active: unknown = null): void {
  setDesigner({
    getWorkspace: () => ({
      getFontManager: () => ({ getDefaultFont: () => ({ getFamily: () => "Open Sans" }) }),
    }),
    getActiveDocument: () => active,
  } as never);
}

type Dialog = InstanceType<typeof MissingFontsDialog>;

function replace(dialog: Dialog): void {
  (dialog as unknown as { _replaceFonts(): void })._replaceFonts();
}

function rows(dialog: Dialog): { font: string; value: string }[] {
  return (dialog as unknown as { _rows: { font: string; value: string }[] })._rows;
}

beforeEach(() => installDesigner());

afterEach(() => {
  // Close the handler's dialog so the next test starts without one.
  currentMissingFontsDialog()?.close();
  dialogs.length = 0;
  setDesigner(null);
});

describe("missing fonts dialog replace and keep (UI-FONT-011)", () => {
  it("rewrites the runs of a text with $fontFamilies and the _tff of a style", () => {
    const runs = [{ fontFamily: "x" }, { fontFamily: "Here" }, { fontFamily: "Gone" }];
    // The third run has no $fontFamilies entry: its own family counts.
    const text = fakeText({ runs, fontFamilies: ["Gone", "Here"] });
    const style = fakeStyle("Gone");
    const otherStyle = fakeStyle("Here");
    const doc = fakeDocument(fakeScene([text, style, otherStyle]));
    const callback = vi.fn();
    const dialog = new MissingFontsDialog(doc, { Gone: "Roboto" }, null, callback);
    replace(dialog);
    expect(runs.map((run) => run.fontFamily)).toEqual(["Roboto", "Here", "Roboto"]);
    expect(text.$content).toBe(JSON.stringify(runs));
    expect(text._runsDirty).toBe(true);
    expect(text.calls).toEqual([["setText", runs], ["repaint"]]);
    expect(style.properties._tff).toBe("Roboto");
    expect(otherStyle.properties._tff).toBe("Here");
    expect(callback).toHaveBeenCalledWith({ Gone: "Roboto" });
    expect(dialogs[0]?.close).toHaveBeenCalledOnce();
  });

  it("hands the map to replaceFonts for a fake text or one without $fontFamilies", () => {
    const fake = fakeText({ fake: true, embedded: true });
    const plain = fakeText({});
    const doc = fakeDocument(fakeScene([fake, plain]));
    const dialog = new MissingFontsDialog(doc, ["Gone"], null);
    replace(dialog);
    const map = { Gone: "Open Sans" };
    expect(fake.calls).toEqual([["replaceFonts", map, true]]);
    expect(plain.calls).toEqual([["replaceFonts", map, false]]);
  });

  it("appends the families to the scene's cst on Keep, duplicates included (Q-260)", () => {
    const scene = fakeScene([fakeText({ fake: true })], { cst: ["Gone"] });
    const dialog = new MissingFontsDialog(fakeDocument(scene), ["Gone", "Also"], null);
    expect(dialog.isKeepDisabled()).toBe(false);
    dialog.keepFonts();
    expect(scene.properties.cst).toEqual(["Gone", "Gone", "Also"]);
  });

  it("disables Keep without fake or embedded texts", () => {
    const dialog = new MissingFontsDialog(fakeDocument(fakeScene([fakeText({})])), ["A"], null);
    expect(dialog.isKeepDisabled()).toBe(true);
  });

  it("shows Keep for a list and hides it for a map; rows are not repeated", () => {
    const dialog = new MissingFontsDialog(fakeDocument(fakeScene([])), ["A"], null);
    expect(dialog.getButtons().keepHidden).toBe(false);
    dialog.setMissingFonts(["A", "B"]);
    expect(rows(dialog)).toEqual([
      { font: "A", value: "Open Sans" },
      { font: "B", value: "Open Sans" },
    ]);
    dialog.setMissingFonts({ C: "Lato" });
    expect(dialog.getButtons().keepHidden).toBe(true);
    expect(dialog.getMissingFonts()).toEqual(["A", "B", "C"]);
  });
});

describe("missing fonts handler (module 255 function g)", () => {
  const request = (family: string, tryToResolveMissingFont = true): never =>
    ({ family, tryToResolveMissingFont }) as never;

  it("opens one dialog for a ready document and skips families already asked", () => {
    installDesigner(fakeDocument(fakeScene([])));
    handleMissingFont(request("A"));
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]?.open).toHaveBeenCalledOnce();
    const dialog = currentMissingFontsDialog() as Dialog;
    handleMissingFont(request("B"));
    handleMissingFont(request("A"));
    expect(dialogs).toHaveLength(1);
    expect(dialog.getMissingFonts()).toEqual(["A", "B"]);
  });

  it("builds a new dialog for the next missing font after a reset (R7-B-033)", () => {
    installDesigner(fakeDocument(fakeScene([])));
    handleMissingFont(request("A"));
    const first = currentMissingFontsDialog();
    expect(first).not.toBeNull();
    // The old FontsProviderManager.reset dropped its open dialog.
    FontsProviderManager.getInstance().reset();
    expect(currentMissingFontsDialog()).toBeNull();
    handleMissingFont(request("B"));
    expect(dialogs).toHaveLength(2);
    expect(currentMissingFontsDialog()).not.toBe(first);
    expect(currentMissingFontsDialog()?.getMissingFonts()).toEqual(["B"]);
  });

  it("skips families in the scene's cst", () => {
    installDesigner(fakeDocument(fakeScene([], { cst: ["A"] })));
    handleMissingFont(request("A"));
    expect(dialogs).toHaveLength(0);
  });

  it("builds the dialog without opening it when the request doesn't ask to resolve", () => {
    installDesigner(fakeDocument(fakeScene([])));
    handleMissingFont(request("A", false));
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]?.open).not.toHaveBeenCalled();
  });

  it("waits for a loading document: Ready continues, LoadFailed gives up", () => {
    const manager = FontsProviderManager.getInstance();
    installDesigner(fakeDocument(fakeScene([]), DocumentStatus.Loading));
    handleMissingFont(request("A"));
    expect(dialogs).toHaveLength(0);
    manager.trigger(new DocumentStatusEvent(DocumentStatus.Loading));
    expect(dialogs).toHaveLength(0);
    manager.trigger(new DocumentStatusEvent(DocumentStatus.Ready));
    expect(dialogs).toHaveLength(1);
    // The listener is gone: another Ready opens nothing more.
    currentMissingFontsDialog()?.close();
    manager.trigger(new DocumentStatusEvent(DocumentStatus.Ready));
    expect(dialogs).toHaveLength(1);

    installDesigner(fakeDocument(fakeScene([]), DocumentStatus.Loading));
    handleMissingFont(request("B"));
    manager.trigger(new DocumentStatusEvent(DocumentStatus.LoadFailed));
    manager.trigger(new DocumentStatusEvent(DocumentStatus.Ready));
    expect(dialogs).toHaveLength(1);
  });
});
