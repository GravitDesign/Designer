// Old: chunk.vendor.js module 992 (opentype.js features/arab/arabicRequiredLigatures.js, unchanged).

import type { Bidi } from "../../bidi.ts";
import { ContextParams } from "../../tokenizer.ts";
import type { ContextRange, Token } from "../../tokenizer.ts";
import type { Feature, SubstitutionResult } from "../feature-query.ts";

/** Applies the rlig feature to an Arabic word. */
export function arabicRequiredLigatures(this: Bidi, range: ContextRange): void {
  const features = this.features.arab as Record<string, Feature>;
  if (!Object.prototype.hasOwnProperty.call(features, "rlig")) return;
  const tokens = this.tokenizer.getRangeTokens(range);
  for (let i = 0; i < tokens.length; i++) {
    const lookupParams = new ContextParams(tokens, i);
    const substitution = (features.rlig as Feature).lookup(lookupParams) || null;
    const first = substitution[0] as SubstitutionResult;
    const chainingContext = substitution.length === 1 && first.id === 63 && first.substitution;
    const ligature = substitution.length === 1 && first.id === 41 && first.substitution[0];
    const token = tokens[i] as Token;
    if (ligature) {
      token.setState("rlig", [ligature.ligGlyph]);
      for (let c = 0; c < ligature.components.length; c++) {
        const component = ligature.components[c];
        const lookaheadToken = lookupParams.get(c + 1) as Token;
        if ((lookaheadToken.activeState as { value: unknown }).value === component) {
          lookaheadToken.state.deleted = true;
        }
      }
    } else if (chainingContext) {
      const nested = chainingContext[0] as SubstitutionResult;
      const substIndex =
        chainingContext && chainingContext.length === 1 && nested.id === 12 && nested.substitution;
      // The array compares as a number ([n] >= 0 is n >= 0), and the token
      // gets the whole array as its state, like a ligature.
      if (substIndex && (substIndex as unknown as number) >= 0) {
        token.setState("rlig", substIndex);
      }
    }
  }
}
