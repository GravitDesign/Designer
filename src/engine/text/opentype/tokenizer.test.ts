import { describe, expect, it } from "vitest";
import * as chr from "./char.ts";
import { readFixture } from "./test-fonts.ts";
import { ContextParams, Token, Tokenizer } from "./tokenizer.ts";
import type { ContextChecker, ContextRange, ContextCheck } from "./tokenizer.ts";

// Reference values: the old bundle's tokenizer run through the same steps
// (scratch script layout-dump.cjs).

type Fixture = Record<string, unknown>;

describe("Tokenizer", () => {
  const expected = readFixture<Fixture>("layout-tokenizer.json");

  it("tokenizes, checks contexts, applies modifiers and edits tokens like the old code", () => {
    const got: Fixture = {};
    const log: unknown[] = [];
    const t = new Tokenizer({
      start: function () {
        log.push("start");
      },
    });
    for (const ev of [
      "end",
      "next",
      "newToken",
      "contextStart",
      "contextEnd",
      "insertToken",
      "removeToken",
      "removeRange",
      "replaceToken",
      "replaceRange",
      "composeRUD",
      "updateContextsRanges",
    ]) {
      t.on(ev, function (...args: unknown[]) {
        log.push([ev, args.length]);
      });
    }
    got.badSubscribe = t.events.start.subscribe(5 as never);
    got.onMissing = t.on("nope", () => {});
    got.reg = [
      !!(
        t.registerContextChecker(
          "digits",
          (p) => /\d/.test(p.current) && !/\d/.test(p.get(-1) as string),
          (p) => !/\d/.test(p.get(1) as string),
        ) as ContextChecker
      ).ranges,
      t.registerContextChecker(
        "digits",
        () => true,
        () => true,
      ),
      t.registerContextChecker("x", 1 as unknown as ContextCheck, () => true),
      t.registerContextChecker("y", () => true, 1 as unknown as ContextCheck),
    ];
    t.registerModifier(
      "upper",
      (tok) => tok.char !== " ",
      (tok, p) => (tok.char.toUpperCase().charCodeAt(0) as number) + p.index,
    );
    t.tokenize("ab 12 c345 😀");
    got.after = t.tokens.map((x) => [
      x.char,
      x.activeState,
      x.getState("upper"),
      x.getState("none"),
    ]);
    got.ranges = (t.getContextRanges("digits") as ContextRange[]).map((x) => [
      x.startIndex,
      x.endOffset,
      x.rangeId,
      t.rangeToText(x),
    ]);
    got.missing = t.getContextRanges("zzz");
    got.text = t.getText();
    got.ops = [
      (t.insertToken([new Token("Z")], 1) as Token[]).length,
      t.insertToken(["x" as unknown as Token], 1),
      t.removeToken(99),
      (t.removeToken(0) as Token[]).map((x) => x.char),
      (t.replaceToken(0, new Token("Q")) as [Token, Token])[1].char,
      t.replaceToken(0, "no" as unknown as Token),
      (t.replaceRange(1, 2, [new Token("R")]) as [Token[], Token[]])[0].map((x) => x.char),
      t.replaceRange(99, 1, []),
      t.removeRange(5, 2).map((x) => x.char),
      t.removeRange(8).map((x) => x.char),
    ];
    got.textAfterOps = t.getText();
    got.rangesAfterOps = (t.getContextRanges("digits") as ContextRange[]).map((x) => [
      x.startIndex,
      x.endOffset,
    ]);
    got.rud = t.composeRUD([
      ["removeToken", 99],
      ["replaceToken", 99, null],
    ]);
    got.rud2 = t.composeRUD([
      ["insertToken", [new Token("9")], 0],
      ["removeToken", 99],
    ]);
    got.textRud = t.getText();
    got.log = log;
    const cp = new ContextParams(["a", "b", "c", "d"], 1);
    got.cp = [-2, -1, 0, 1, 2, 3, 5].map((o) => cp.get(o));
    cp.setCurrentIndex(3);
    got.cp2 = [cp.current, cp.backtrack, cp.lookahead, cp.get(-3), cp.get(1)];
    const samples = [
      "a",
      "ب",
      "ِ",
      "ء",
      "ا",
      " ",
      "\n",
      "١",
      "ۀ",
      "؟",
      null,
      undefined,
      "",
      "ـ",
      "ٰ",
    ];
    got.chars = samples.map((c) => [
      chr.isArabicChar(c),
      chr.isIsolatedArabicChar(c),
      chr.isTashkeelArabicChar(c),
      chr.isWhiteSpace(c),
    ]);
    // undefined members (rud2) are dropped by JSON like in the fixture.
    expect(JSON.parse(JSON.stringify(got))).toEqual(expected);
  });

  it("updates the context ranges after each token edit", () => {
    const t = new Tokenizer();
    t.registerContextChecker(
      "x",
      (p) => p.current === "x" && p.get(-1) !== "x",
      (p) => p.get(1) !== "x",
    );
    t.tokenize("axxb");
    expect((t.getContextRanges("x") as ContextRange[]).map((r) => r.endOffset)).toEqual([2]);
    t.insertToken([new Token("x")], 1);
    expect((t.getContextRanges("x") as ContextRange[]).map((r) => r.endOffset)).toEqual([3]);
    t.removeRange(1, 3, true);
    expect((t.getContextRanges("x") as ContextRange[]).map((r) => r.endOffset)).toEqual([3]);
  });
});
