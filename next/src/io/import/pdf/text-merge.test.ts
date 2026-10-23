import { describe, expect, it } from "vitest";
import { Point } from "../../../engine/math/point.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Line, TextMerger, type TextBlock, type Word } from "./text-merge.ts";

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
