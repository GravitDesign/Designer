// Old: chunk.vendor.js module 989 (opentype.js features/arab/contextCheck/arabicWord.js, unchanged).

import { isArabicChar } from "../../../char.ts";
import type { ContextParams } from "../../../tokenizer.ts";

/** An Arabic letter at the start of the text or after a non-Arabic character. */
export function arabicWordStartCheck(contextParams: ContextParams<string>): boolean {
  const char = contextParams.current;
  const prevChar = contextParams.get(-1);
  return (
    (prevChar === null && isArabicChar(char)) || (!isArabicChar(prevChar) && isArabicChar(char))
  );
}

/** The last character, or one followed by a non-Arabic character. */
export function arabicWordEndCheck(contextParams: ContextParams<string>): boolean {
  const nextChar = contextParams.get(1);
  return nextChar === null || !isArabicChar(nextChar);
}
