// Old: chunk.vendor.js module 991 (opentype.js features/arab/arabicPresentationForms.js, unchanged).

import type { Bidi } from "../../bidi.ts";
import { isIsolatedArabicChar, isTashkeelArabicChar } from "../../char.ts";
import { ContextParams } from "../../tokenizer.ts";
import type { ContextRange, Token } from "../../tokenizer.ts";
import type { Feature, SubstitutionResult } from "../feature-query.ts";

/** Whether the character can join the one before it. */
function willConnectPrev(charContextParams: ContextParams<string>): boolean {
  const backtrack = ([] as string[]).concat(charContextParams.backtrack);
  for (let i = backtrack.length - 1; i >= 0; i--) {
    const prevChar = backtrack[i] as string;
    const isolated = isIsolatedArabicChar(prevChar);
    const tashkeel = isTashkeelArabicChar(prevChar);
    if (!isolated && !tashkeel) return true;
    if (isolated) return false;
  }
  return false;
}

/** Whether the character can join the one after it. */
function willConnectNext(charContextParams: ContextParams<string>): boolean {
  if (isIsolatedArabicChar(charContextParams.current)) return false;
  for (let i = 0; i < charContextParams.lookahead.length; i++) {
    const nextChar = charContextParams.lookahead[i] as string;
    const tashkeel = isTashkeelArabicChar(nextChar);
    if (!tashkeel) return true;
  }
  return false;
}

/** The substitute glyphs when the lookup gave exactly one single substitution, else false. */
function getSubstitutionIndex(substitution: SubstitutionResult[]): number[] | false {
  const first = substitution[0] as SubstitutionResult;
  return substitution.length === 1 && first.id === 12 && first.substitution;
}

/** Gives each letter of an Arabic word its init, medi or fina form. */
export function arabicPresentationForms(this: Bidi, range: ContextRange): void {
  const features = this.features.arab as Record<string, Feature>;
  const rangeTokens = this.tokenizer.getRangeTokens(range);
  if (rangeTokens.length === 1) return;
  const applyForm = (tag: string, token: Token, params: ContextParams<Token>): void => {
    if (!Object.prototype.hasOwnProperty.call(features, tag)) return;
    const substitution = (features[tag] as Feature).lookup(params) || null;
    // false[0] is undefined, so a lookup without a single result sets nothing.
    const substIndex = (getSubstitutionIndex(substitution) as number[])[0] as number;
    if (substIndex >= 0) {
      token.setState(tag, substIndex);
    }
  };
  const tokensParams = new ContextParams(rangeTokens, 0);
  const charContextParams = new ContextParams(
    rangeTokens.map((t) => t.char),
    0,
  );
  rangeTokens.forEach((token, i) => {
    if (isTashkeelArabicChar(token.char)) return;
    tokensParams.setCurrentIndex(i);
    charContextParams.setCurrentIndex(i);
    // Two bits: 1 joins the previous letter, 2 joins the next one.
    let CONNECT = 0;
    if (willConnectPrev(charContextParams)) CONNECT |= 1;
    if (willConnectNext(charContextParams)) CONNECT |= 2;
    switch (CONNECT) {
      case 0:
        // Isolated: keep the original form.
        return;
      case 1:
        applyForm("fina", token, tokensParams);
        break;
      case 2:
        applyForm("init", token, tokensParams);
        break;
      case 3:
        applyForm("medi", token, tokensParams);
        break;
    }
  });
}
