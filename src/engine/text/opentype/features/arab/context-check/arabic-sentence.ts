// Old: chunk.vendor.js module 990 (opentype.js features/arab/contextCheck/arabicSentence.js, unchanged).

import { isArabicChar, isTashkeelArabicChar, isWhiteSpace } from "../../../char.ts";
import type { ContextParams } from "../../../tokenizer.ts";

/** An Arabic letter or mark after a non-Arabic character. */
export function arabicSentenceStartCheck(contextParams: ContextParams<string>): boolean {
  const char = contextParams.current;
  const prevChar = contextParams.get(-1);
  return (isArabicChar(char) || isTashkeelArabicChar(char)) && !isArabicChar(prevChar);
}

/**
 * The end of an Arabic run: the last character, or one followed by a
 * non-Arabic character that is not white space with more Arabic after it.
 * Gives undefined (no end) when white space is followed by more Arabic.
 */
export function arabicSentenceEndCheck(contextParams: ContextParams<string>): boolean | undefined {
  const nextChar = contextParams.get(1);
  switch (true) {
    case nextChar === null:
      return true;
    case !isArabicChar(nextChar) && !isTashkeelArabicChar(nextChar): {
      const nextIsWhitespace = isWhiteSpace(nextChar);
      if (!nextIsWhitespace) return true;
      if (nextIsWhitespace) {
        const arabicCharAhead = contextParams.lookahead.some(
          (c) => isArabicChar(c) || isTashkeelArabicChar(c),
        );
        if (!arabicCharAhead) return true;
      }
      break;
    }
    default:
      return false;
  }
  return undefined;
}
