import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installFakeCanvas } from "../../paint/testing/fake-canvas.ts";
import { FontManager, type ResolveFontEvent } from "../fonts/font-manager.ts";
import { OpenTypeFont } from "../fonts/open-type-font.ts";
import { Formatting, type Run } from "./formatting.ts";
import { registerStylable } from "./late-bound.ts";
import { Per } from "./list-util.ts";
import type { TLRange } from "./range.ts";
import { TLCore } from "./tl-core.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fontFile = resolve(here, "../../../../assets/font/OpenSans-Regular.ttf");

let fontManager: FontManager;
let uninstall: () => void;

beforeAll(() => {
  uninstall = installFakeCanvas();
  registerStylable({
    PropertySetInfo: {
      T: { geometryProperties: { _tfi: 20, _fc: undefined, _tcs: null, _tws: null } },
      P: { geometryProperties: { _plh: 1, _pal: null } },
    },
    PropertySet: { Text: "T", Paragraph: "P" },
    ParagraphAlignment: { Left: "l", Center: "c", Right: "r", Justify: "j" },
    BorderAlignment: { Inside: "I", Outside: "O" },
  });
  const bytes = readFileSync(fontFile);
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  fontManager = new FontManager();
  const font = OpenTypeFont.create("Open Sans", "N", 400, buffer) as OpenTypeFont;
  fontManager._fonts.push(font);
  fontManager.setDefaultFont(font);
  fontManager.addEventListener(FontManager.ResolveFontEvent, (event: ResolveFontEvent) => {
    event.failed();
  });
});

afterAll(() => {
  uninstall();
});

function make(text: string): TLCore {
  const core = new TLCore();
  core.initialize(1, 1, fontManager, () => {});
  core.setWrap(true);
  core.setText([{ text, fontFamily: "Open Sans" }]);
  core.setWidth(220);
  return core;
}

function range(core: TLCore, start: number, end: number): TLRange {
  return core.getRange(start, end) as TLRange;
}

/** What save gives without the document's cache (the old TLRange.save). */
function freshSave(r: TLRange): Run[] {
  return Per.create<Run>(r.runs, r).per<Run>(Formatting.consolidate()).all();
}

/** What getFormatting gives without the document's cache (the old fold). */
function freshFormatting(r: TLRange): Run | undefined {
  return Per.create<Run>(r.runs, r)
    .reduce<Run>((a, b) => Formatting.merge(a, b))
    .last();
}

const plain = (runs: Run[]): string => runs.map(Formatting.getPlainText).join("");

/** Reads the range through the cache, so that the next read can find it there. */
function prime(core: TLCore, start: number, end: number): void {
  range(core, start, end).save();
  range(core, start, end).getFormatting();
}

/** The cached reads of the range are those of a fresh fold over its runs. */
function expectFresh(core: TLCore, start: number, end: number): void {
  expect(range(core, start, end).save()).toEqual(freshSave(range(core, start, end)));
  expect(range(core, start, end).getFormatting()).toEqual(freshFormatting(range(core, start, end)));
}

describe("the saved runs and formatting of a range", () => {
  it("are those of a fresh fold until something changes", () => {
    const core = make("abcdef");
    range(core, 0, 4).setFormatting("underline", true);
    prime(core, 0, 6);
    expectFresh(core, 0, 6);
    expect(range(core, 0, 6).getFormatting().underline).toBe(Formatting.multipleValues);
  });

  it("are copies the caller may change", () => {
    const core = make("abcdef");
    range(core, 0, 2).setFormatting("underline", true);
    const saved = range(core, 0, 4).save();
    (saved[0] as Run).text = "changed";
    (saved[0] as Run).underline = false;
    saved.pop();
    const formatting = range(core, 0, 4).getFormatting();
    formatting.underline = false;
    formatting.fontSize = 99;
    expect(plain(range(core, 0, 4).save())).toBe("abcd");
    expect(range(core, 0, 4).save()).toHaveLength(2);
    expect(range(core, 0, 4).getFormatting().underline).toBe(Formatting.multipleValues);
    expect(range(core, 0, 4).getFormatting().fontSize).not.toBe(99);
  });

  it("follow a text edit", () => {
    const core = make("abcdef");
    prime(core, 0, 4);
    range(core, 1, 2).setText("X");
    expect(plain(range(core, 0, 4).save())).toBe("aXcd");
    expectFresh(core, 0, 4);
  });

  it("follow a formatting change", () => {
    const core = make("abcdef");
    prime(core, 0, 4);
    range(core, 0, 2).setFormatting("underline", true);
    expect(range(core, 0, 4).getFormatting().underline).toBe(Formatting.multipleValues);
    expect(range(core, 0, 4).save()).toHaveLength(2);
    expectFresh(core, 0, 4);
  });

  it("follow a paragraph split", () => {
    const core = make("abcdef");
    prime(core, 0, 4);
    range(core, 2, 2).setText("\n");
    expect(plain(range(core, 0, 4).save())).toBe("ab\nc");
    expectFresh(core, 0, 4);
  });

  it("follow a paragraph merge", () => {
    const core = make("ab\ncdef");
    prime(core, 0, 4);
    range(core, 2, 3).setText("");
    expect(plain(range(core, 0, 4).save())).toBe("abcd");
    expectFresh(core, 0, 4);
  });

  it("follow a paragraph format", () => {
    const core = make("ab\ncdef");
    prime(core, 0, 6);
    range(core, 4, 4).setFormatting("align", "center");
    expect(range(core, 0, 6).getFormatting().align).toBe(Formatting.multipleValues);
    expectFresh(core, 0, 6);
  });

  it("follow undo and redo", () => {
    const core = make("abcdef");
    range(core, 1, 2).setText("X");
    prime(core, 0, 4);
    core.undo();
    expect(plain(range(core, 0, 4).save())).toBe("abcd");
    expectFresh(core, 0, 4);
    core.redo();
    expect(plain(range(core, 0, 4).save())).toBe("aXcd");
    expectFresh(core, 0, 4);
  });

  it("follow a new text", () => {
    const core = make("abcdef");
    prime(core, 0, 4);
    core.setText([{ text: "uvwxyz", fontFamily: "Open Sans", underline: true }]);
    expect(plain(range(core, 0, 4).save())).toBe("uvwx");
    expect(range(core, 0, 4).getFormatting().underline).toBe(true);
    expectFresh(core, 0, 4);
  });
});
