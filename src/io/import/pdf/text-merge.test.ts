import { describe, expect, it } from "vitest";
import cases from "./__fixtures__/text-merge-cases.json" with { type: "json" };
import recorded from "./__fixtures__/text-merge-recorded.json" with { type: "json" };
import { Point } from "../../../engine/math/point.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Line, TextMerger, type MergedText, type TextBlock, type Word } from "./text-merge.ts";

/** A word as the canvas bridge records it, for a character at (x, y) on an identity transform. */
function word(text: string, x: number, y: number, width: number, extra: Partial<Word> = {}): Word {
  const transform = new Transform();
  return {
    text,
    ascent: 10,
    descent: 2,
    width,
    fontSize: 12,
    fontSizeScale: 1,
    wordSpacing: 0,
    charSpacing: 0,
    x,
    y,
    transform,
    startPoint: new Point(x, y),
    endPoint: new Point(x + width, y),
    fontColor: { name: "black" },
    ...extra,
  };
}

describe("TextMerger.createTexts", () => {
  it("joins characters on one baseline into one line and consumes the input", () => {
    const words = [word("a", 0, 10, 5), word("b", 5, 10, 5), word("c", 10, 10, 5)];
    const blocks = new TextMerger().createTexts(words);
    expect(words).toHaveLength(0);
    expect(blocks).toHaveLength(1);
    expect((blocks[0] as TextBlock).toString()).toBe("abc");
    expect((blocks[0] as TextBlock).lines).toHaveLength(1);
  });

  it("puts a gap into the previous character's letter spacing", () => {
    const blocks = new TextMerger().createTexts([word("a", 0, 10, 5), word("b", 8, 10, 5)]);
    const content = (blocks[0] as TextBlock).getContent();
    expect(content.map((w) => w.text)).toEqual(["a", "b"]);
    expect((content[0] as Word).charSpacing).toBe(3);
  });

  it("splits the last character off a longer word to carry the gap", () => {
    const blocks = new TextMerger().createTexts([word("ab", 0, 10, 10), word("c", 14, 10, 5)]);
    const content = (blocks[0] as TextBlock).getContent();
    expect(content.map((w) => w.text)).toEqual(["a", "b", "c"]);
    expect((content[1] as Word).charSpacing).toBe(4);
  });

  it("starts a new text for another baseline, a gradient fill or a step back", () => {
    const merger = new TextMerger();
    expect(merger.createTexts([word("a", 0, 10, 5), word("b", 5, 20, 5)])).toHaveLength(2);
    const gradient = { __pdfimportgradtype__: null };
    expect(
      merger.createTexts([word("a", 0, 10, 5), word("b", 5, 10, 5, { fontColor: gradient })]),
    ).toHaveLength(2);
    expect(merger.createTexts([word("a", 10, 10, 5), word("b", 5, 10, 5)])).toHaveLength(2);
  });

  it("keeps characters of different plain colors together (only gradients split)", () => {
    const blocks = new TextMerger().createTexts([
      word("a", 0, 10, 5),
      word("b", 5, 10, 5, { fontColor: { name: "red" } }),
    ]);
    expect(blocks).toHaveLength(1);
  });
});

describe("Line", () => {
  it("takes its box from the words and keeps the largest ascent", () => {
    const line = new Line(word("a", 0, 10, 5));
    line.add(word("b", 5, 10, 5, { ascent: 14 }));
    expect(line.ascent).toBe(14);
    expect(line.getWidth()).toBe(10);
    expect(line.isEmpty()).toBe(false);
    expect(new Line(word("  ", 0, 0, 1)).isEmpty()).toBe(true);
  });
});

interface WordSpec {
  text: string;
  x: number;
  y: number;
  width: number;
  ascent?: number;
  descent?: number;
  fontSize?: number;
  wordSpacing?: number;
  charSpacing?: number;
  transform?: number[];
  color?: string;
}

const COLORS: Record<string, unknown> = {
  black: { name: "black" },
  red: { name: "red" },
  gradient: { __pdfimportgradtype__: 1, createGPattern: () => null },
};

/**
 * Runs one case the way the canvas bridge's endText does: each text object
 * becomes blocks, each block a text, which merges into the previous text
 * or is added. __fixtures__/text-merge-recorded.json holds the same steps
 * and summary run on old module 1396 in the old app's page (a scratch
 * Playwright script; it built the words with the old GTransform and GPoint
 * exactly as below).
 */
function runCase(c: { name: string; texts: WordSpec[][] }): unknown {
  const num = (v: number) => (Object.is(v, -0) ? 0 : v);
  try {
    const children: MergedText[] = [];
    const merges: boolean[] = [];
    for (const specs of c.texts) {
      const words = specs.map((s): Word => {
        const m = s.transform || [1, 0, 0, 1, 0, 0];
        const transform = new Transform(...(m as [number, number, number, number, number, number]));
        return {
          text: s.text,
          ascent: s.ascent ?? 10,
          descent: s.descent ?? 2,
          width: s.width,
          fontSize: s.fontSize ?? 12,
          fontSizeScale: 1,
          wordSpacing: s.wordSpacing ?? 0,
          charSpacing: s.charSpacing ?? 0,
          x: s.x,
          y: s.y,
          transform,
          startPoint: transform
            .preMultiplied(new Transform().translated(s.x, s.y))
            .getTranslation(),
          endPoint: transform
            .preMultiplied(new Transform().translated(s.x + s.width, s.y))
            .getTranslation(),
          fontColor: COLORS[s.color ?? "black"],
        };
      });
      const merger = new TextMerger();
      for (const block of merger.createTexts(words)) {
        const text = block.toGText();
        if (!text) continue;
        const last = children[children.length - 1];
        if (last && merger.mergeTexts(last, text)) {
          merges.push(true);
          continue;
        }
        merges.push(false);
        children.push(text);
      }
    }
    return {
      name: c.name,
      merges,
      texts: children.map((t) => {
        const transform = t.getTransform() as Transform | null;
        return {
          matrix: transform ? transform.getMatrix().map(num) : null,
          words: t._$itext.getContent().map((w) => ({
            text: w.text,
            charSpacing: w.charSpacing,
            wordSpacing: w.wordSpacing,
            lineSpacing: w.lineSpacing ?? null,
            align: w.align ?? null,
          })),
        };
      }),
    };
  } catch (e) {
    return { name: c.name, threw: String(e) };
  }
}

describe("TextMerger.mergeTexts against the old app", () => {
  const byName = new Map((recorded as { name: string }[]).map((r) => [r.name, r]));
  for (const c of cases as { name: string; texts: WordSpec[][] }[]) {
    it(c.name, () => {
      expect(byName.has(c.name), "recorded").toBe(true);
      expect(runCase(c)).toEqual(byName.get(c.name));
    });
  }
});
