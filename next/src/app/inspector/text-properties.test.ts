import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTypeId } from "../../engine/core/object.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Style } from "../../engine/style/style.ts";
import { Font } from "../../engine/text/fonts/font.ts";
import { Text } from "../../engine/text/text.ts";
import type { Document } from "../document/document.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import type { InspectedElements } from "./properties.ts";
import {
  lineHeightPercent,
  paragraphSpacingPercent,
  percentToLength,
  TextProperties,
  weightOptions,
} from "./text-properties.ts";

const SEP = "#2635#";

/** An element whose inline style the panel writes (the advanced settings button). */
function styledElement(): HTMLButtonElement {
  const declarations: Record<string, string> = {};
  return {
    style: {
      setProperty: (name: string, value: string) => {
        declarations[name] = value;
      },
      getPropertyValue: (name: string) => declarations[name] ?? "",
    },
  } as unknown as HTMLButtonElement;
}

interface FakeFonts {
  defaultFamily: string;
  weights: number[];
  styles: string[];
}

function installDesigner(
  fonts: FakeFonts = { defaultFamily: "Open Sans", weights: [], styles: [] },
) {
  const listeners: string[] = [];
  const manager = {
    getDefaultFont: () => ({ getFamily: () => fonts.defaultFamily }),
    getDefaultFontWeights: () => fonts.weights,
    getDefaultFontStyles: () => fonts.styles,
    getFont: () => null,
  };
  setDesigner({
    addEventListener: (type: { name?: string }) => listeners.push("add " + String(type.name)),
    removeEventListener: (type: { name?: string }) => listeners.push("remove " + String(type.name)),
    getWorkspace: () => ({ getFontManager: () => manager }),
    isTouchEnabled: () => false,
    getSetting: () => undefined,
  } as unknown as Designer);
  return listeners;
}

interface Commit {
  name: unknown;
  data: unknown;
}

function fakeDocument(commits: Commit[] = [], log: string[] = []): Document {
  const target = {
    addEventListener: () => log.push("listen"),
    removeEventListener: () => log.push("unlisten"),
  };
  const editor = {
    ...target,
    beginTransaction: () => log.push("begin"),
    commitTransaction: (name: unknown, data: unknown) => {
      log.push("commit");
      commits.push({ name, data });
    },
    isInlineEditing: () => false,
  };
  return { getScene: () => target, getEditor: () => editor } as unknown as Document;
}

/** A panel with the advanced settings button but no other DOM; updates are recorded. */
function panel(): { properties: TextProperties; updates: unknown[] } {
  const properties = new TextProperties();
  properties._advancedSettingsButton = styledElement();
  const updates: unknown[] = [];
  vi.spyOn(properties, "_updateProperties").mockImplementation(async (data) => {
    updates.push(data);
  });
  return { properties, updates };
}

/** A property holder that records setProperties calls. */
function recorder(values: Record<string, unknown> = {}) {
  const calls: unknown[][] = [];
  return {
    calls,
    getProperty: (name: string) => values[name],
    setProperties: (...args: unknown[]) => calls.push(args),
  };
}

beforeEach(() => {
  installDesigner();
});

afterEach(() => {
  resetGlobals();
  vi.restoreAllMocks();
});

describe("TextProperties.update", () => {
  it("shows for texts only when every element is a text", () => {
    const { properties, updates } = panel();
    const document = fakeDocument();
    const text = new Text();
    expect(properties.update(document, [text] as unknown as InspectedElements)).toBe(true);
    expect(properties._text).toEqual([text]);
    expect(properties._advancedSettingsButton?.style.getPropertyValue("display")).toBe("");
    expect(updates).toHaveLength(1);

    const mixed = [new Text(), new Rectangle()] as unknown as InspectedElements;
    expect(properties.update(document, mixed)).toBe(false);
    expect(properties._advancedSettingsButton?.style.getPropertyValue("display")).toBe("none");
    expect(updates).toHaveLength(1);
  });

  it("shows for the text tool's default style even among other elements", () => {
    const { properties } = panel();
    const textStyle = new Style();
    textStyle.setProperty("_sdf", getTypeId(Text));
    const shapeStyle = new Style();
    shapeStyle.setProperty("_sdf", getTypeId(Rectangle));
    const document = fakeDocument();
    expect(
      properties.update(document, [textStyle, new Rectangle()] as unknown as InspectedElements),
    ).toBe(true);
    expect(properties._text).toEqual([textStyle]);
    expect(properties.update(document, [shapeStyle] as unknown as InspectedElements)).toBe(false);
  });

  it("hides without a document and keeps its state during its own changes", () => {
    const { properties, updates } = panel();
    expect(properties.update(null, null)).toBe(false);
    properties._ownChange = true;
    expect(properties.update(null, null)).toBe(true);
    expect(updates).toHaveLength(0);
  });

  it("hands the storage update data to the field update", () => {
    const { properties, updates } = panel();
    const data = { evtType: 2, chooserOn: true, textPattern: true };
    properties.update(fakeDocument(), [new Text()] as unknown as InspectedElements, data);
    expect(updates).toEqual([data]);
  });
});

describe("TextProperties._getProperty", () => {
  const properties = new TextProperties();
  const list = (...values: unknown[]) =>
    values.map((value) => recorder({ p: value })) as unknown as Parameters<
      TextProperties["_getProperty"]
    >[1];

  it("is the shared value, or null when the texts differ", () => {
    expect(properties._getProperty("p", list(3, 3))).toBe(3);
    expect(properties._getProperty("p", list(3, 4))).toBe(null);
    expect(properties._getProperty("p", list())).toBe(null);
  });

  it("gives the fallback only for undefined and NaN, not for null, 0 or false", () => {
    expect(properties._getProperty("p", list(undefined), 7)).toBe(7);
    expect(properties._getProperty("p", list(NaN), 7)).toBe(7);
    expect(properties._getProperty("p", list(null), 7)).toBe(null);
    expect(properties._getProperty("p", list(0), 7)).toBe(0);
    expect(properties._getProperty("p", list(false), 7)).toBe(false);
    expect(properties._getProperty("p", list(undefined))).toBe(undefined);
  });
});

describe("TextProperties._assignProperties", () => {
  it("writes every text in one transaction with the old name and the related data", () => {
    const commits: Commit[] = [];
    const log: string[] = [];
    const properties = new TextProperties();
    properties._document = fakeDocument(commits, log);
    const a = recorder();
    const b = recorder();
    properties._text = [a, b] as unknown as TextProperties["_text"];
    properties._assignProperties(["_tfi"], [12], undefined, { chooserOn: true });
    expect(a.calls).toEqual([[["_tfi"], [12], false, false, undefined]]);
    expect(b.calls).toEqual([[["_tfi"], [12], false, false, undefined]]);
    expect(log).toEqual(["begin", "commit"]);
    expect(commits).toEqual([{ name: "Modify Text Properties", data: { chooserOn: true } }]);
    expect(properties._ownChange).toBe(false);
  });

  it("writes temporary values without a transaction", () => {
    const log: string[] = [];
    const properties = new TextProperties();
    properties._document = fakeDocument([], log);
    const a = recorder();
    properties._text = [a] as unknown as TextProperties["_text"];
    properties._assignProperties(["_fc"], ["red"], true);
    expect(log).toEqual([]);
    expect(a.calls).toEqual([[["_fc"], ["red"], false, false, true]]);
  });

  it("goes through the element editor of an edited text and repaints it for autoscale", () => {
    const properties = new TextProperties();
    properties._document = fakeDocument();
    const text = recorder();
    const editorCalls: unknown[][] = [];
    let invalidated = 0;
    (text as unknown as { __editor__: unknown }).__editor__ = {
      setProperties: (...args: unknown[]) => editorCalls.push(args),
      requestInvalidation: () => invalidated++,
    };
    properties._text = [text] as unknown as TextProperties["_text"];
    properties._assignProperties(["sc"], [true]);
    expect(text.calls).toEqual([]);
    expect(editorCalls).toEqual([[["sc"], [true], undefined]]);
    expect(invalidated).toBe(1);
  });

  it("does nothing without a document", () => {
    const properties = new TextProperties();
    const a = recorder();
    properties._text = [a] as unknown as TextProperties["_text"];
    properties._assignProperties(["_tfi"], [12]);
    expect(a.calls).toEqual([]);
  });
});

describe("TextProperties._toggleFormatting", () => {
  function boldPanel(weight: number, available: number[]) {
    const properties = new TextProperties();
    properties._document = fakeDocument();
    properties._text = [recorder({ _tfw: weight })] as unknown as TextProperties["_text"];
    properties._weightsAvailable = available;
    const assigned: unknown[][] = [];
    vi.spyOn(properties, "_assignProperties").mockImplementation((names, values) => {
      assigned.push([names, values]);
    });
    vi.spyOn(properties, "_updateProperties").mockImplementation(async () => undefined);
    return { properties, assigned };
  }

  it("makes regular text bold", () => {
    const { properties, assigned } = boldPanel(400, [400, 700]);
    properties._toggleFormatting("bold");
    expect(assigned).toEqual([[["_tfw"], [700]]]);
  });

  it("makes bold text regular, or the lightest weight when there is no regular", () => {
    let { properties, assigned } = boldPanel(700, [300, 400, 700]);
    properties._toggleFormatting("bold");
    expect(assigned).toEqual([[["_tfw"], [400]]]);
    ({ properties, assigned } = boldPanel(700, [600, 300, 700]));
    properties._toggleFormatting("bold");
    expect(assigned).toEqual([[["_tfw"], [300]]]);
  });

  it("writes Infinity for bold text when no weights are known (old quirk)", () => {
    const { properties, assigned } = boldPanel(700, []);
    properties._toggleFormatting("bold");
    expect(assigned).toEqual([[["_tfw"], [Infinity]]]);
  });

  it("switches italic on and off", () => {
    const properties = new TextProperties();
    properties._document = fakeDocument();
    properties._text = [
      recorder({ _tfs: Font.Style.Italic }),
    ] as unknown as TextProperties["_text"];
    const assigned: unknown[][] = [];
    vi.spyOn(properties, "_assignProperties").mockImplementation((names, values) => {
      assigned.push([names, values]);
    });
    vi.spyOn(properties, "_updateProperties").mockImplementation(async () => undefined);
    properties._toggleFormatting("italic");
    expect(assigned).toEqual([[["_tfs"], [Font.Style.Normal]]]);
  });
});

describe("TextProperties._correctStyleAndWeight", () => {
  it("moves the weight to the nearest one the default family has", async () => {
    installDesigner({ defaultFamily: "Open Sans", weights: [300, 400, 700], styles: ["N", "I"] });
    const properties = new TextProperties();
    properties._panel = { querySelector: () => null } as unknown as HTMLElement;
    const styles = ["N"];
    const weights = [600];
    expect(await properties._correctStyleAndWeight("Open Sans", styles, weights)).toBe(true);
    expect(weights).toEqual([700]);
    expect(styles).toEqual(["N"]);
    const kept = [400];
    expect(await properties._correctStyleAndWeight("Open Sans", ["I"], kept)).toBe(false);
    expect(kept).toEqual([400]);
  });

  it("switches a style the weight doesn't have", async () => {
    installDesigner({ defaultFamily: "Open Sans", weights: [400], styles: ["I"] });
    const properties = new TextProperties();
    properties._panel = { querySelector: () => null } as unknown as HTMLElement;
    const styles = ["N"];
    expect(await properties._correctStyleAndWeight("Open Sans", styles, [400])).toBe(true);
    expect(styles).toEqual(["I"]);
  });
});

describe("TextProperties._intersectArrays", () => {
  it("keeps the common values; null means no constraint", () => {
    const properties = new TextProperties();
    expect(properties._intersectArrays([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
    expect(properties._intersectArrays(null, [5])).toEqual([5]);
    expect(properties._intersectArrays([5], null)).toEqual([5]);
  });
});

describe("weightOptions", () => {
  it("lists the weights in order with their styles, named after the weight", () => {
    const options = weightOptions(
      [700, 400],
      [
        { weight: 400, styles: ["N" + SEP + "Open Sans" + SEP, "I" + SEP + "Open Sans" + SEP] },
        { weight: 700, styles: ["N" + SEP + "Open Sans" + SEP] },
      ],
    );
    expect(options).toEqual([
      { value: "400" + SEP + "N" + SEP + "Open Sans", label: "Regular" },
      { value: "400" + SEP + "I" + SEP + "Open Sans", label: "Regular Italic" },
      { value: "700" + SEP + "N" + SEP + "Open Sans", label: "Bold" },
    ]);
  });

  it("puts a subfamily before the name unless the name starts with it", () => {
    const options = weightOptions(
      [400],
      [
        {
          weight: 400,
          styles: ["N" + SEP + "Fam" + SEP + "Condensed", "I" + SEP + "Fam" + SEP + "Regular"],
        },
      ],
    );
    expect(options.map((o) => o.label)).toEqual(["Condensed Regular", "Regular Italic"]);
  });

  it("skips weights not every text has and weights without styles", () => {
    expect(weightOptions([400], [{ weight: 700, styles: ["N" + SEP + SEP] }])).toEqual([]);
    expect(weightOptions([700], [{ weight: 700, styles: ["N"] }])).toEqual([
      { value: "700" + SEP + "N" + SEP, label: "Bold" },
    ]);
  });
});

describe("the line height and paragraph spacing unit switch", () => {
  it("turns a percentage into a length at 4/3 of the size", () => {
    expect(percentToLength(150, 20)).toBe("40");
    expect(percentToLength(100, 12)).toBe("16");
  });

  it("turns a length back into a factor with two decimals", () => {
    expect(lineHeightPercent(40, 20)).toBe(1.5);
    expect(lineHeightPercent(10, 7)).toBe(1.07);
    expect(paragraphSpacingPercent(40, 20)).toBe(1.5);
  });

  it("keeps the line height at 0.01 or more, but not the paragraph spacing", () => {
    expect(lineHeightPercent(0, 20)).toBe(0.01);
    expect(paragraphSpacingPercent(0, 20)).toBe(0);
  });
});
