// The text panel built with init() over real texts (Open Sans loaded):
// the field update (_updateProperties), font assignment, the Noto switch,
// the fake-text editor flow, the unit switches, formatting and markers.
// Expected values follow the old module 1273 (designer.browser.dev.js
// 91560-93786).
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { FakeCanvas, installFakeCanvas } from "../../engine/paint/testing/fake-canvas.ts";
import { Font } from "../../engine/text/fonts/font.ts";
import { OpenTypeFont } from "../../engine/text/fonts/open-type-font.ts";
import { TextTransformation } from "../../engine/style/stylable-sets.ts";
import { defaultFontMeasure } from "../../engine/text/gtl/default-font-measure.ts";
import { openTypeMeasure } from "../../engine/text/gtl/measure.ts";
import { Formatting } from "../../engine/text/gtl/formatting.ts";
import { Text } from "../../engine/text/text.ts";
import { TLDirectionTextTransformer } from "../../engine/text/tl-direction-text-transformer.ts";
import { InlineEditorEvent, ModifiedEvent } from "../../editor/editor.ts";
import { textSetup, type TextSetup } from "../../editor/element-editors/text-editor.testing.ts";
import type { Document } from "../document/document.ts";
import { SystemDialog } from "../dialogs/system-dialog.ts";
import { FontsProviderManager } from "../fonts/font-manager.ts";
import { NotoFontsProvider } from "../fonts/noto-fonts-provider.ts";
import { FakeDocument, FakeElement, fire } from "../menus/testing/fake-dom.testing.ts";
import { installPaintTestDom, type PaintTestDom } from "./paint-dom.testing.ts";
import type { InspectedElements } from "./properties.ts";
import { TextProperties } from "./text-properties.ts";

const SEP = "#2635#";

const state = vi.hoisted(() => ({
  fontList: null as unknown,
  previewClicks: 0,
}));

// The real color field builds the chooser popup, which needs a browser DOM.
vi.mock("../color/color-chooser.ts", () => {
  const widgets = new WeakMap<object, unknown>();
  class PatternChooserWidget {
    current: unknown = null;
    constructor(element: { appendChild(child: unknown): void; ownerDocument: FakeDocument }) {
      widgets.set(element, this);
      const preview = element.ownerDocument.createElement("div");
      preview.classList.add("preview");
      (preview as unknown as { click(): void }).click = () => {
        state.previewClicks++;
      };
      element.appendChild(preview);
    }
    static of(element: object): unknown {
      return widgets.get(element) ?? null;
    }
    value(...args: unknown[]): unknown {
      if (args.length) this.current = args[0];
      return this.current;
    }
    close(): void {}
    openEyeDropper(): void {}
  }
  return { PatternChooserWidget };
});

// The font list panel answers through state.fontList.
vi.mock("../fonts/fonts-button.ts", () => ({
  FontsButton: { attach() {}, getFontList: () => state.fontList },
}));

let uninstallCanvas: () => void;
beforeAll(() => {
  uninstallCanvas = installFakeCanvas();
});
afterAll(() => uninstallCanvas());

const g = globalThis as unknown as Record<string, unknown>;
const savedHTMLElement = g.HTMLElement;
const savedCreate = FakeDocument.prototype.createElement;

/**
 * Gives fake selects the value/selectedIndex of a real one: setting a
 * value without an option selects nothing; adding options while nothing
 * is selected selects the first one again.
 */
function patchSelects(): void {
  FakeDocument.prototype.createElement = function (this: FakeDocument, tag: string): FakeElement {
    if (tag === "canvas") return new FakeCanvas() as unknown as FakeElement;
    const element = savedCreate.call(this, tag);
    if (tag.toLowerCase() !== "select") return element;
    let selected: number | null = null;
    const options = () => element.children.filter((c) => c.tagName === "OPTION");
    const index = () => {
      if (selected !== null) return selected;
      const all = options();
      return all.findIndex((o) => o.getAttribute("disabled") === null);
    };
    Object.defineProperty(element, "selectedIndex", {
      get: index,
      set: (value: number) => {
        selected = value;
      },
    });
    Object.defineProperty(element, "value", {
      get: () => {
        const option = options()[index()];
        return option ? (option.getAttribute("value") ?? option.textContent) : "";
      },
      set: (value: string) => {
        selected = options().findIndex((o) => o.getAttribute("value") === value);
      },
    });
    const append = element.appendChild.bind(element);
    element.appendChild = (child: FakeElement) => {
      append(child);
      if (selected === -1) selected = null;
      return child;
    };
    const replace = element.replaceChildren.bind(element);
    element.replaceChildren = (...nodes: (FakeElement | string)[]) => {
      replace(...nodes);
      selected = null;
    };
    return element;
  };
}

const fontFile = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../assets/font/OpenSans-Regular.ttf",
);

/** Registers Open Sans Regular under other family names (the font list knows the rest). */
function addFamilies(...families: string[]): void {
  const bytes = readFileSync(fontFile);
  for (const family of families) {
    const buffer = new ArrayBuffer(bytes.length);
    new Uint8Array(buffer).set(bytes);
    setup.fontManager._fonts.push(
      OpenTypeFont.create(family, Font.Style.Normal, 400, buffer) as OpenTypeFont,
    );
  }
}

const innerHTML = Object.getOwnPropertyDescriptor(FakeElement.prototype, "innerHTML");

/** The panel sets string-table markup with innerHTML; the fake keeps it as text. */
function patchInnerHTML(): void {
  if (innerHTML && innerHTML.set) return;
  Object.defineProperty(FakeElement.prototype, "innerHTML", {
    configurable: true,
    get(this: FakeElement) {
      return this.textContent;
    },
    set(this: FakeElement, value: string) {
      this.textContent = value;
    },
  });
}

function restoreInnerHTML(): void {
  if (innerHTML) Object.defineProperty(FakeElement.prototype, "innerHTML", innerHTML);
  else delete (FakeElement.prototype as unknown as Record<string, unknown>).innerHTML;
}

let t: PaintTestDom;
let setup: TextSetup;

beforeEach(() => {
  state.fontList = null;
  state.previewClicks = 0;
  t = installPaintTestDom({
    getWorkspace: () => ({ getFontManager: () => setup.fontManager }),
    getSetting: () => undefined,
  });
  g.HTMLElement = {
    [Symbol.hasInstance]: (value: unknown) => value instanceof FakeElement,
  };
  patchSelects();
  patchInnerHTML();
  // After the fake DOM: the texts measure on its (fake) canvases.
  setup = textSetup("Hello");
  setup.fontManager.setDefaultFontStyles([Font.Style.Normal, Font.Style.Italic]);
  setup.fontManager.setDefaultFontWeights([400, 700]);
  // A selected text has its element editor open.
  (setup.text as unknown as { __editor__: unknown }).__editor__ = setup.editor;
  // The text meter keeps the font manager of the first core ever made.
  openTypeMeasure.fontManager = setup.fontManager;
  defaultFontMeasure.fontManager = setup.fontManager;
});

afterEach(() => {
  t.uninstall();
  g.HTMLElement = savedHTMLElement;
  FakeDocument.prototype.createElement = savedCreate;
  restoreInnerHTML();
  vi.restoreAllMocks();
});

const str = (table: string, key: string) => Locale.get(new LocaleKey(table, key)) ?? "";
const MODIFY = () => str("GTextProperties", "action.modify-text-properties");

/** GEditor as the panel uses it, on top of the text editors' recording host. */
function documentFor(s: TextSetup): Document {
  const host = s.host as unknown as Record<string, unknown>;
  host.addEventListener = () => undefined;
  host.removeEventListener = () => undefined;
  host.isInlineEditing = () => false;
  host.getCurrentInlineEditorNode = () => null;
  host.hideSelection = () => undefined;
  host.resetHideSelection = () => undefined;
  return {
    getScene: () => s.scene,
    getEditor: () => s.host,
    getActiveWindow: () => null,
  } as unknown as Document;
}

interface Panel {
  properties: TextProperties;
  panel: FakeElement;
  advanced: FakeElement;
  q(selector: string): FakeElement;
}

function initPanel(): Panel {
  const panel = t.dom.document.createElement("div");
  const toolbar = t.dom.document.createElement("div");
  const properties = new TextProperties();
  properties.init(panel as unknown as HTMLElement, toolbar as unknown as HTMLElement);
  const advanced = properties._advancedSettings as unknown as FakeElement;
  const q = (selector: string) =>
    (panel.querySelector(selector) ?? advanced.querySelector(selector)) as FakeElement;
  return { properties, panel, advanced, q };
}

/** Shows `texts` in the panel and waits for the async field update. */
async function show(p: Panel, texts: Text[], data?: unknown): Promise<void> {
  p.properties._document = null;
  p.properties.update(documentFor(setup), texts as unknown as InspectedElements);
  await p.properties._updateProperties(data as never);
}

const optionsOf = (select: FakeElement) =>
  select.children.map((o) => [o.getAttribute("value"), o.textContent]);

/** A font list panel for families the font manager doesn't have. */
function fontList(families: Record<string, Record<number, { style: string; sub?: string }[]>>) {
  const calls: string[] = [];
  return {
    calls,
    fontDisplayName: (family: string) => (family.startsWith("Lato") ? "Lato" : family),
    weightsForFont: async (family: string) => {
      calls.push("weights " + family);
      return Object.keys(families[family] ?? {}).map(Number);
    },
    stylesForWeight: (weight: number, family: string) =>
      (families[family]?.[weight] ?? []).map((entry) => entry.style),
    subfamiliesForWeight: (weight: number, family: string) =>
      (families[family]?.[weight] ?? []).map((entry) => ({
        realName: family,
        subFamily: entry.sub ?? null,
      })),
  };
}

/** Replaces the main text's content with runs that differ from its first run in `changes`. */
function setRuns(changes: Record<string, unknown>[]): void {
  const first = (setup.text.getContent() as Record<string, unknown>[])[0] as Record<
    string,
    unknown
  >;
  setup.text.setText(changes.map((change) => ({ ...first, ...change })));
}

function secondText(content: string, family?: string): Text {
  const text = new Text();
  setup.scene.getActivePage()?.appendChild(text);
  text.setText(content);
  if (family) {
    const runs = (text.getContent() as Record<string, unknown>[]).map((run) => ({
      ...run,
      fontFamily: family,
    }));
    text.setText(runs);
  }
  return text;
}

describe("TextProperties._updateProperties", () => {
  it("lists the default family's weights and styles for one text", async () => {
    const p = initPanel();
    await show(p, [setup.text]);
    expect((p.q('input[data-property="_tff"]') as unknown as { value: string }).value).toBe(
      "Open Sans",
    );
    const weight = p.q('select[data-property="style"]');
    expect(optionsOf(weight)).toEqual([
      ["400" + SEP + "N" + SEP + "Open Sans", "Regular"],
      ["400" + SEP + "I" + SEP + "Open Sans", "Regular Italic"],
      ["700" + SEP + "N" + SEP + "Open Sans", "Bold"],
      ["700" + SEP + "I" + SEP + "Open Sans", "Bold Italic"],
    ]);
    expect(weight.value).toBe("400" + SEP + "N" + SEP + "Open Sans");
    expect(p.properties._weightsAvailable).toEqual([400, 700]);
    const bold = p.q('[data-property="decoration-bold"]') as unknown as HTMLButtonElement;
    expect([bold.disabled, bold.classList.contains("g-active")]).toEqual([false, false]);
  });

  it("keeps only the weights and styles every text has, and blanks a mixed family", async () => {
    addFamilies("Lato");
    state.fontList = fontList({ Lato: { 300: [{ style: "N" }], 400: [{ style: "N" }] } });
    const p = initPanel();
    await show(p, [setup.text, secondText("Two", "Lato")]);
    expect((p.q('input[data-property="_tff"]') as unknown as { value: string }).value).toBe("");
    expect(optionsOf(p.q('select[data-property="style"]'))).toEqual([
      ["400" + SEP + "N" + SEP, "Regular"],
    ]);
    expect(p.properties._weightsAvailable).toEqual([400]);
    const bold = p.q('[data-property="decoration-bold"]') as unknown as HTMLButtonElement;
    const italic = p.q('[data-property="decoration-italic"]') as unknown as HTMLButtonElement;
    expect([bold.disabled, italic.disabled]).toEqual([true, true]);
  });

  it("drops the family of a style two families share under one display name", async () => {
    // Both families show as "Lato": the first text's style entry keeps only
    // its "N" prefix (the old `prefix##` rewrite) since the second differs.
    state.fontList = fontList({
      Lato: { 400: [{ style: "N" }] },
      "Lato Alt": { 400: [{ style: "N" }] },
    });
    addFamilies("Lato", "Lato Alt");
    const p = initPanel();
    await show(p, [secondText("One", "Lato"), secondText("Two", "Lato Alt")]);
    expect((p.q('input[data-property="_tff"]') as unknown as { value: string }).value).toBe("Lato");
    expect(optionsOf(p.q('select[data-property="style"]'))).toEqual([
      ["400" + SEP + "N" + SEP, "Regular"],
    ]);
  });

  it("shows mixed when the runs have different weights", async () => {
    const p = initPanel();
    const core = setup.text.getTLCore() as NonNullable<ReturnType<Text["getTLCore"]>>;
    const weightKey = Text.PropertyMapping._tfw as string;
    setRuns([{ text: "He", [weightKey]: 700 }, { text: "llo" }]);
    expect(core.getDocumentRange().getFormatting()[weightKey]).toBe(Formatting.multipleValues);
    await show(p, [setup.text]);
    const weight = p.q('select[data-property="style"]');
    expect(weight.value).toBe("mixed");
    expect(weight.children[weight.children.length - 1]?.textContent).toBe(
      str("GTextProperties", "text.mixed"),
    );
  });

  it("shows the missing family of a fake text", async () => {
    const p = initPanel();
    const missing = { getFamily: () => "Missing Sans" };
    Object.assign(setup.text, {
      _fontsToResolve: [missing],
      _isVirgin: true,
      _deserializedBackupPaths: [{}],
    });
    expect(setup.text.isFakeText()).toBeTruthy();
    await show(p, [setup.text]);
    expect((p.q('input[data-property="_tff"]') as unknown as { value: string }).value).toBe(
      "Missing Sans",
    );
  });

  it("disables small caps and fractions when the font has neither", async () => {
    const p = initPanel();
    await show(p, [setup.text]);
    const font = setup.fontManager.getDefaultFont() as Font;
    const smallCaps = p.q(
      `[data-property="_ttrf-${TextTransformation.SmallCaps}"]`,
    ) as unknown as HTMLButtonElement;
    const fractions = p.q('[data-property="typography-fractions"]') as unknown as HTMLButtonElement;
    expect(smallCaps.disabled).toBe(!font.hasFeature(Font.Features.SmallCaps));
    expect(fractions.disabled).toBe(!font.hasFeature(Font.Features.Fractions));
    // An unresolved placeholder font disables fractions.
    vi.spyOn(Font.prototype, "isResolved").mockReturnValue(false);
    vi.spyOn(OpenTypeFontProto(), "isResolved").mockReturnValue(false);
    await show(p, [setup.text]);
    expect(fractions.disabled).toBe(true);
    expect(smallCaps.disabled).toBe(false);
  });

  it("stops before the language and list fields when the font isn't known", async () => {
    const p = initPanel();
    p.properties._weightsAvailable = [123];
    setup.text.setProperty("_tff", "Unknown Family");
    vi.spyOn(setup.fontManager, "getFont").mockReturnValue(null);
    await show(p, [setup.text]);
    expect(p.properties._weightsAvailable).toEqual([123]);
    expect(p.q('[data-property="_pm"] > span').textContent).toBe("");
  });

  it("shows the list marker and selects its option", async () => {
    const p = initPanel();
    await show(p, [setup.text]);
    expect(p.q('[data-property="_pm"] > span').textContent).toBe(
      str("GTextProperties", "text.marker-none"),
    );
    const settings = p.properties._listTypeSettings as unknown as FakeElement;
    expect(settings.querySelector(".list-type-group.g-selected")?.getAttribute("value")).toBe(
      "none",
    );
    p.properties._assignMarker(Text.Markers.Check);
    await p.properties._updateProperties();
    expect(p.q('[data-property="_pm"] > span').textContent).toBe(
      str("GTextProperties", "text.marker-bulleted"),
    );
    expect(settings.querySelector(".list-type-option.g-selected")?.getAttribute("value")).toBe(
      Text.Markers.Check,
    );
    expect(settings.querySelector(".list-type-group.g-selected")?.getAttribute("value")).toBe(
      "bulleted",
    );
  });

  it("shows line height and paragraph spacing as percent or in the document unit", async () => {
    const p = initPanel();
    setup.text.setProperties(["_plh", "_pas"], [1.5, 0.25]);
    await show(p, [setup.text]);
    expect(p.q('button[data-property="_plh_unit"]').textContent).toBe("%");
    expect((p.q('input[data-property="_plh"]') as unknown as { value: string }).value).toBe("150");
    expect(p.q('button[data-property="_pas_unit"]').textContent).toBe("%");
    expect((p.q('[data-property="_pas"]') as unknown as { value: string }).value).toBe("25");
    setup.text.setProperties(["_plh", "_pas"], ["24", "6"]);
    await show(p, [setup.text]);
    expect(p.q('button[data-property="_plh_unit"]').textContent).toBe("px");
    expect((p.q('input[data-property="_plh"]') as unknown as { value: string }).value).toBe("24");
    expect(p.q('button[data-property="_pas_unit"]').textContent).toBe("px");
    expect((p.q('[data-property="_pas"]') as unknown as { value: string }).value).toBe("6");
  });

  it("swaps the alignment and sizing rows for the path rows on a text on a path", async () => {
    const p = initPanel();
    const row = (selector: string) => p.q(selector).closest(".g-property-row") as FakeElement;
    const shown = () =>
      [
        'input[data-property="tptho"]',
        'button[data-property^="_pal"]',
        'button[data-property^="va"]',
        '[data-property="aw"] button',
      ].map((selector) => row(selector).style.display !== "none");
    await show(p, [setup.text]);
    // The vertical alignment row also hides for auto height (the default).
    expect(shown()).toEqual([false, true, false, true]);
    setup.text.setProperty("ah", false);
    await show(p, [setup.text]);
    expect(shown()).toEqual([false, true, true, true]);
    vi.spyOn(setup.text, "hasPathAttached").mockReturnValue(true);
    await show(p, [setup.text]);
    expect(shown()).toEqual([true, false, false, false]);
    expect((p.q('button[data-property^="va"]') as unknown as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("reopens the color chooser only after undo or redo of a chooser change", async () => {
    const p = initPanel();
    await show(p, [setup.text], {
      evtType: ModifiedEvent.Type.Undo,
      chooserOn: true,
      textPattern: true,
    });
    expect(state.previewClicks).toBe(1);
    await show(p, [setup.text], {
      evtType: ModifiedEvent.Type.Redo,
      chooserOn: true,
      textPattern: true,
    });
    expect(state.previewClicks).toBe(2);
    await show(p, [setup.text], { evtType: ModifiedEvent.Type.Undo, chooserOn: true });
    await show(p, [setup.text], { chooserOn: true, textPattern: true });
    expect(state.previewClicks).toBe(2);
  });
});

function OpenTypeFontProto(): Font {
  return Object.getPrototypeOf(setup.fontManager.getDefaultFont()) as Font;
}

/** The names of the outermost transactions committed on the scene's editor (undo steps). */
function commits(): unknown[] {
  const names: unknown[] = [];
  let depth = 0;
  for (const call of setup.host.calls) {
    if (call[0] === "begin") depth++;
    else if (call[0] === "commit" && --depth <= 0) {
      names.push(call[1]);
      depth = 0;
    }
  }
  return names;
}

/** Lets the panel's async work (font list answers, field updates) finish. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((done) => setTimeout(done, 0));
}

const STYLE = Text.PropertyMapping._tfs as string;
const WEIGHT = Text.PropertyMapping._tfw as string;
const runsOf = (text: Text) =>
  (text.getContent() as Record<string, unknown>[]).map((run) => [
    run.text,
    run.fontFamily,
    run[WEIGHT],
    run[STYLE],
  ]);

describe("the language select", () => {
  function withLanguages(tags: string[]): void {
    const font = setup.fontManager.getDefaultFont() as Font;
    const has = font.hasFeature.bind(font);
    vi.spyOn(font, "hasFeature").mockImplementation(
      (feature) => feature === Font.Features.LocalizedForm || has(feature),
    );
    vi.spyOn(font, "getAvailableLanguageSystemTags").mockReturnValue(tags);
  }

  it("lists the font's languages by name after Default", async () => {
    const p = initPanel();
    withLanguages(["DEU ", "ARA "]);
    await show(p, [setup.text]);
    const select = p.q('select[data-property="_tlocl"]');
    expect(optionsOf(select)).toEqual([
      ["", str("GCommonNames", "text.default")],
      ["ARA ", "Arabic"],
      ["DEU ", "German"],
    ]);
    expect(select.getAttribute("disabled")).toBe(null);
  });

  it("gives an unknown tag an empty label when it sorts on the right", async () => {
    const p = initPanel();
    withLanguages(["XXXX", "DEU "]);
    await show(p, [setup.text]);
    expect(optionsOf(p.q('select[data-property="_tlocl"]'))).toEqual([
      ["", str("GCommonNames", "text.default")],
      ["DEU ", "German"],
      ["XXXX", ""],
    ]);
  });

  it("stops the update when an unknown tag's missing name is compared (old quirk)", async () => {
    const p = initPanel();
    await show(p, [setup.text]);
    withLanguages(["DEU ", "XXXX"]);
    const stylistic = vi.spyOn(p.properties, "_updateStylisticSetSelector");
    await expect(p.properties._updateProperties()).rejects.toThrow(TypeError);
    const select = p.q('select[data-property="_tlocl"]');
    expect(optionsOf(select)).toEqual([["", str("GCommonNames", "text.default")]]);
    expect(select.getAttribute("disabled")).toBe(null);
    expect(stylistic).not.toHaveBeenCalled();
  });
});

describe("the whole-text formatting of one update", () => {
  const LANGUAGE = Text.PropertyMapping._tlocl as string;
  const SET = Text.PropertyMapping._tstyls as string;
  const coreOf = (text: Text) => text.getTLCore() as NonNullable<ReturnType<Text["getTLCore"]>>;

  it("is merged once per text for the language and the stylistic set select", async () => {
    const font = setup.fontManager.getDefaultFont() as Font;
    const has = font.hasFeature.bind(font);
    vi.spyOn(font, "hasFeature").mockImplementation(
      (feature) =>
        feature === Font.Features.LocalizedForm ||
        feature === Font.Features.StylisticSet ||
        has(feature),
    );
    vi.spyOn(font, "getAvailableLanguageSystemTags").mockReturnValue(["DEU "]);
    vi.spyOn(font, "getAvailableStylisticSets").mockReturnValue(["ss01"]);
    // The first text is German with ss01 throughout, the second only in
    // its first run: the texts disagree, so the panel reads no language or
    // set, and both selects ask whether the runs of a text disagree.
    setRuns([{ [LANGUAGE]: "DEU ", [SET]: "ss01" }]);
    const second = secondText("Two");
    const base = (second.getContent() as Record<string, unknown>[])[0] as Record<string, unknown>;
    second.setText([
      { ...base, text: "T", [LANGUAGE]: "DEU ", [SET]: "ss01" },
      { ...base, text: "wo" },
    ]);
    expect(coreOf(second).getDocumentRange().getFormatting()[LANGUAGE]).toBe(
      Formatting.multipleValues,
    );
    const p = initPanel();
    await show(p, [setup.text, second]);

    const first = vi.spyOn(coreOf(setup.text), "getDocumentRange");
    const other = vi.spyOn(coreOf(second), "getDocumentRange");
    const counts = (): [number, number] => [first.mock.calls.length, other.mock.calls.length];
    let before: [number, number] = [0, 0];
    let after: [number, number] = [0, 0];
    const language = p.properties._updateLanguageSelector;
    const stylistic = p.properties._updateStylisticSetSelector;
    vi.spyOn(p.properties, "_updateLanguageSelector").mockImplementation((...args) => {
      before = counts();
      language.apply(p.properties, args);
    });
    vi.spyOn(p.properties, "_updateStylisticSetSelector").mockImplementation((...args) => {
      stylistic.apply(p.properties, args);
      after = counts();
    });
    await p.properties._updateProperties();

    // Before, each select merged the runs of both texts again.
    expect([after[0] - before[0], after[1] - before[1]]).toEqual([1, 1]);
    expect(p.q('select[data-property="_tlocl"]').value).toBe("mixed");
    expect(p.q('select[data-property="_tstyls"]').value).toBe("mixed");
  });

  it("is merged once per text for the run formatting reads that share a map", async () => {
    const p = initPanel();
    setRuns([{ text: "He", underline: true }, { text: "llo" }]);
    await show(p, [setup.text]);
    const list = [setup.text] as unknown as Parameters<TextProperties["_getFormatting"]>[1];
    const underline = p.properties._getFormatting("underline", list);
    const ligatures = p.properties._getFormatting("ligatures", list);
    const range = vi.spyOn(coreOf(setup.text), "getDocumentRange");
    const known = new Map();
    expect(p.properties._getFormatting("underline", list, known)).toBe(underline);
    expect(p.properties._getFormatting("ligatures", list, known)).toBe(ligatures);
    expect(underline).toBe(Formatting.multipleValues);
    expect(range).toHaveBeenCalledTimes(1);
  });
});

describe("TextProperties font assignment", () => {
  it("moves each run to a weight and style the family has, in one undo step", async () => {
    addFamilies("Lato");
    state.fontList = fontList({ Lato: { 400: [{ style: "N" }] } });
    setRuns([
      { text: "He", [WEIGHT]: 700 },
      { text: "llo", [STYLE]: "italic" },
      { text: "!", [WEIGHT]: 700 },
    ]);
    const p = initPanel();
    await show(p, [setup.text]);
    const set = vi.spyOn(setup.editor, "setProperties");
    setup.host.calls.length = 0;
    await p.properties._assignFont("Lato");
    await settle();
    // The bold run moves the weight to 400, the italic run the style to
    // normal; with both changed the loop stops.
    expect(set.mock.calls).toEqual([
      [
        ["_tff", "_tfw", "_tfs"],
        ["Lato", 400, Font.Style.Normal],
      ],
    ]);
    expect(runsOf(setup.text)).toEqual([["Hello!", "Lato", 400, "normal"]]);
    expect(commits()).toEqual([MODIFY()]);
  });

  it("keeps the style and weight a family has", async () => {
    addFamilies("Lato");
    state.fontList = fontList({ Lato: { 400: [{ style: "N" }] } });
    const p = initPanel();
    await show(p, [setup.text]);
    const set = vi.spyOn(setup.editor, "setProperties");
    await p.properties._assignFont("Lato");
    await settle();
    expect(set.mock.calls).toEqual([[["_tff"], ["Lato"]]]);
  });

  it("waits for the font list to know the family's weights", async () => {
    addFamilies("Lato");
    const list = fontList({ Lato: { 400: [{ style: "N" }] } });
    let later: (() => void) | null = null;
    state.fontList = {
      ...list,
      weightsForFont: async (family: string, callback: () => void, sync?: boolean) => {
        if (sync) return list.weightsForFont(family);
        later = callback;
        return undefined;
      },
    };
    const p = initPanel();
    await show(p, [setup.text]);
    setup.host.calls.length = 0;
    await p.properties._assignFont("Lato");
    await settle();
    expect(commits()).toEqual([]);
    expect(later).not.toBe(null);
    (later as unknown as () => void)();
    await settle();
    expect(commits()).toEqual([MODIFY()]);
    expect(setup.text.getProperty("_tff")).toBe("Lato");
  });

  it("assigns the default family without asking the font list", async () => {
    const list = fontList({});
    state.fontList = list;
    const p = initPanel();
    await show(p, [setup.text]);
    setup.host.calls.length = 0;
    list.calls.length = 0;
    await p.properties._assignFont("Open Sans");
    await settle();
    expect(list.calls).toEqual([]);
    expect(commits()).toEqual([MODIFY()]);
  });

  it("replaces every run family of a fake text with the picked one", async () => {
    addFamilies("Lato");
    state.fontList = fontList({ Lato: { 400: [{ style: "N" }] } });
    const p = initPanel();
    await show(p, [setup.text]);
    Object.assign(setup.text, {
      _fontsToResolve: [{ getFamily: () => "Missing Sans" }],
      _isVirgin: true,
      _deserializedBackupPaths: [{}],
    });
    const replace = vi.spyOn(setup.text, "replaceFonts").mockImplementation(() => undefined);
    const set = vi.spyOn(setup.editor, "setProperties");
    setup.host.calls.length = 0;
    await p.properties._assignFont("Lato");
    await settle();
    expect(replace.mock.calls).toEqual([[{ "Open Sans": "Lato" }, true]]);
    expect(set).not.toHaveBeenCalled();
    expect(commits()).toEqual([MODIFY()]);
  });
});

describe("the Noto family switch after the first edit", () => {
  function prepare(content: string): { p: Panel; calls: unknown[][] } {
    const provider = new NotoFontsProvider(null);
    vi.spyOn(FontsProviderManager, "getProviderInstance").mockReturnValue(provider as never);
    setup.text.setText(content);
    const p = initPanel();
    p.properties._document = documentFor(setup);
    p.properties._text = [setup.text];
    const calls: unknown[][] = [];
    vi.spyOn(setup.text, "setProperties").mockImplementation((names, values) => {
      calls.push([names, values]);
      return true;
    });
    vi.spyOn(setup.text, "setProperty").mockImplementation((name, value) => {
      calls.push([name, value]);
      return true;
    });
    return { p, calls };
  }

  const edited = (p: Panel, wasModifiedBefore = false) =>
    p.properties._inlineEditorEvent(
      new InlineEditorEvent(null, InlineEditorEvent.Type.TextEdited, { wasModifiedBefore }),
    );

  it("switches an Arabic or Hebrew text to its Noto family, right to left", () => {
    for (const [content, family] of [
      ["مرحبا", "Noto Sans Arabic"],
      ["שלום", "Noto Sans Hebrew"],
    ]) {
      const { p, calls } = prepare(content as string);
      edited(p);
      expect(calls).toEqual([
        [
          ["_tff", "dir"],
          [family, TLDirectionTextTransformer.RTL],
        ],
      ]);
      vi.restoreAllMocks();
    }
  });

  it("switches a Cyrillic text to Noto Sans without a direction", () => {
    const { p, calls } = prepare("Привет");
    edited(p);
    expect(calls).toEqual([["_tff", "Noto Sans"]]);
  });

  it("leaves a Latin text and a text that was edited before alone", () => {
    let { p, calls } = prepare("Hello");
    edited(p);
    expect(calls).toEqual([]);
    vi.restoreAllMocks();
    ({ p, calls } = prepare("مرحبا"));
    edited(p, true);
    expect(calls).toEqual([]);
  });

  it("leaves a text alone whose family was set by hand (_we)", () => {
    const { p, calls } = prepare("مرحبا");
    const get = setup.text.getProperty.bind(setup.text);
    vi.spyOn(setup.text, "getProperty").mockImplementation((name: string) =>
      name === "_we" ? true : get(name),
    );
    edited(p);
    expect(calls).toEqual([]);
  });

  it("switches when the editor closes after an edit", () => {
    const { p, calls } = prepare("مرحبا");
    const core = setup.text.getTLCore() as NonNullable<ReturnType<Text["getTLCore"]>>;
    const wasEdited = vi.spyOn(core, "getWasEdited").mockReturnValue(false);
    const close = new InlineEditorEvent(null, InlineEditorEvent.Type.BeforeClose);
    p.properties._inlineEditorEvent(close);
    expect(calls).toEqual([]);
    wasEdited.mockReturnValue(true);
    p.properties._inlineEditorEvent(close);
    expect(calls).toEqual([
      [
        ["_tff", "dir"],
        ["Noto Sans Arabic", TLDirectionTextTransformer.RTL],
      ],
    ]);
  });
});

describe("opening the inline editor on a fake text", () => {
  function prepare(answer: boolean) {
    const p = initPanel();
    const document = documentFor(setup);
    const opened: unknown[][] = [];
    Object.assign(document, { getActiveWindow: () => ({ getView: () => "view" }) });
    (setup.host as unknown as Record<string, unknown>).openInlineEditor = (
      node: unknown,
      view: unknown,
    ) => {
      opened.push([node, view, p.properties._openingInlineEditor]);
      // A second TryOpen while it opens asks nothing.
      p.properties._tryOpenInlineEditor();
    };
    p.properties._document = document;
    p.properties._text = [setup.text];
    Object.assign(setup.text, {
      _fontsToResolve: [{ getFamily: () => "Missing Sans" }],
      _isVirgin: true,
      _deserializedBackupPaths: [{}],
    });
    const replace = vi.spyOn(setup.text, "replaceFonts").mockImplementation(() => undefined);
    const confirm = vi
      .spyOn(SystemDialog, "confirm")
      .mockImplementation(async (_message, done) => done?.(answer));
    return { p, opened, replace, confirm };
  }

  it("asks, then replaces the fonts in one undo step and opens the editor", () => {
    const { p, opened, replace, confirm } = prepare(true);
    setup.host.calls.length = 0;
    p.properties._inlineEditorEvent(new InlineEditorEvent(null, InlineEditorEvent.Type.TryOpen));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0]?.slice(0, 1)).toEqual([str("GTextProperties", "text.edit")]);
    expect(replace.mock.calls).toEqual([[setup.fontManager.getDefaultFont(), false]]);
    expect(commits()).toEqual(["Replace fonts"]);
    expect(opened).toEqual([[setup.text, "view", true]]);
    expect(p.properties._openingInlineEditor).toBe(false);
  });

  it("does nothing when the answer is no", () => {
    const { p, opened, replace } = prepare(false);
    p.properties._tryOpenInlineEditor();
    expect([replace.mock.calls.length, opened.length]).toEqual([0, 0]);
  });

  it("doesn't ask for a text that has its fonts", () => {
    const { p, confirm } = prepare(true);
    Object.assign(setup.text, { _fontsToResolve: null });
    p.properties._tryOpenInlineEditor();
    expect(confirm).not.toHaveBeenCalled();
  });
});

describe("the unit switches of line height and paragraph spacing", () => {
  it("turns a line height percentage into a length and back, one undo step each", async () => {
    setup.text.setProperties(["_plh"], [1.5]);
    const p = initPanel();
    await show(p, [setup.text]);
    const unit = p.q('button[data-property="_plh_unit"]');
    setup.host.calls.length = 0;
    fire(unit, "click");
    expect(unit.textContent).toBe("px");
    expect(setup.text.getProperty("_plh")).toBe("40");
    expect(commits()).toEqual([MODIFY()]);
    await settle();
    expect((p.q('input[data-property="_plh"]') as unknown as { value: string }).value).toBe("40");
    fire(unit, "click");
    expect(unit.textContent).toBe("%");
    expect(setup.text.getProperty("_plh")).toBe(1.5);
    expect(commits()).toEqual([MODIFY(), MODIFY()]);
  });

  it("writes NaN for a percentage box that isn't a number (old bug)", async () => {
    setup.text.setProperties(["_plh"], [1.5]);
    const p = initPanel();
    await show(p, [setup.text]);
    const unit = p.q('button[data-property="_plh_unit"]');
    const box = p.q('input[data-property="_plh"]') as unknown as { value: string };
    box.value = "abc";
    setup.host.calls.length = 0;
    fire(unit, "click");
    expect(unit.textContent).toBe("px");
    expect(setup.text.getProperty("_plh")).toBe("NaN");
    expect(commits()).toEqual([MODIFY()]);
    // From a length, text in the box only flips the label.
    box.value = "abc";
    fire(unit, "click");
    expect(unit.textContent).toBe("%");
    expect(commits()).toEqual([MODIFY()]);
  });

  it("turns a paragraph spacing percentage into a length and back", async () => {
    setup.text.setProperties(["_pas"], [0.25]);
    const p = initPanel();
    await show(p, [setup.text]);
    const unit = p.q('button[data-property="_pas_unit"]');
    setup.host.calls.length = 0;
    fire(unit, "click");
    expect(unit.textContent).toBe("px");
    expect(setup.text.getProperty("_pas")).toBe(String(((25 / 100) * 20 * 4) / 3));
    expect(commits()).toEqual([MODIFY()]);
    await settle();
    fire(unit, "click");
    expect(unit.textContent).toBe("%");
    expect(setup.text.getProperty("_pas")).toBe(0.25);
    expect(commits()).toEqual([MODIFY(), MODIFY()]);
  });

  it("ignores text in a percentage box but sets 0 for text in a length box (old quirk)", async () => {
    setup.text.setProperties(["_pas"], [0.25]);
    const p = initPanel();
    await show(p, [setup.text]);
    const unit = p.q('button[data-property="_pas_unit"]');
    const box = p.q('[data-property="_pas"]') as unknown as { value: string };
    box.value = "abc";
    setup.host.calls.length = 0;
    fire(unit, "click");
    expect(unit.textContent).toBe("px");
    expect(commits()).toEqual([]);
    box.value = "abc";
    fire(unit, "click");
    expect(unit.textContent).toBe("%");
    expect(setup.text.getProperty("_pas")).toBe(0);
    expect(commits()).toEqual([MODIFY()]);
  });
});

describe("formatting and list markers", () => {
  const underlines = () =>
    (setup.text.getContent() as Record<string, unknown>[]).map((run) => [run.text, run.underline]);

  it("underlines only the inline selection while the text is edited", async () => {
    const p = initPanel();
    await show(p, [setup.text]);
    const core = setup.text.getTLCore() as NonNullable<ReturnType<Text["getTLCore"]>>;
    vi.spyOn(setup.editor, "isInlineEdit").mockReturnValue(true);
    core.select(0, 2);
    setup.host.calls.length = 0;
    fire(p.q('[data-property="decoration-underline"]'), "click");
    expect(underlines()).toEqual([
      ["He", true],
      ["llo", false],
    ]);
    expect(commits()).toEqual([MODIFY()]);
  });

  it("underlines the whole text otherwise", async () => {
    const p = initPanel();
    await show(p, [setup.text]);
    fire(p.q('[data-property="decoration-underline"]'), "click");
    expect(underlines()).toEqual([["Hello", true]]);
  });

  it("sets and removes a list marker from the list type overlay, as its own change", async () => {
    const p = initPanel();
    await show(p, [setup.text]);
    const owned: boolean[] = [];
    const commit = setup.host.commitTransaction.bind(setup.host);
    setup.host.commitTransaction = (name: unknown) => {
      owned.push(p.properties._ownChange);
      commit(name);
    };
    const settings = p.properties._listTypeSettings as unknown as FakeElement;
    const marker = () =>
      (setup.text.getTLCore() as NonNullable<ReturnType<Text["getTLCore"]>>)
        .getDocumentRange()
        .getFormatting().listMarker;
    setup.host.calls.length = 0;
    fire(settings.querySelector(`.list-type-option[value="${Text.Markers.Number}"]`), "click");
    expect(marker()).toBe(Text.Markers.Number);
    fire(settings.querySelector('.list-type-group[value="none"]'), "click");
    expect(marker() ?? null).toBe(null);
    expect(commits()).toEqual([MODIFY(), MODIFY()]);
    expect(owned.length).toBeGreaterThan(0);
    expect(owned).not.toContain(false);
    expect(p.properties._ownChange).toBe(false);
  });
});
