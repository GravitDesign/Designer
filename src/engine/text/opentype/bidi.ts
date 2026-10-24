// Old: chunk.vendor.js module 988 (opentype.js bidi.js).
// Gravit changes:
// - processText doesn't reverse Arabic sentences (opentype.js 0.11.0 does,
//   in reverseArabicSentences); the text keeps its logical order and the
//   caller lays it out.
// - getTextGlyphs(text, chars) also fills chars with the character of each
//   glyph that wasn't deleted by a ligature.

import * as arabicSentenceCheck from "./features/arab/context-check/arabic-sentence.ts";
import * as arabicWordCheck from "./features/arab/context-check/arabic-word.ts";
import { arabicPresentationForms } from "./features/arab/arabic-presentation-forms.ts";
import { arabicRequiredLigatures } from "./features/arab/arabic-required-ligatures.ts";
import type { Feature } from "./features/feature-query.ts";
import { Tokenizer } from "./tokenizer.ts";
import type { ContextParams, ContextRange, Token, TokenValue } from "./tokenizer.ts";

/** What applyFeatures accepts: FeatureQuery results, holes allowed. */
type FeatureInput = Feature | { FAIL: string } | null | undefined;

const contextChecks = {
  arabicWordCheck: arabicWordCheck,
  arabicSentenceCheck: arabicSentenceCheck,
};

function registerArabicWordCheck(this: Bidi): void {
  const checks = this.contextChecks.arabicWordCheck;
  this.tokenizer.registerContextChecker(
    "arabicWord",
    checks.arabicWordStartCheck,
    checks.arabicWordEndCheck,
  );
}

function registerArabicSentenceCheck(this: Bidi): void {
  const checks = this.contextChecks.arabicSentenceCheck;
  this.tokenizer.registerContextChecker(
    "arabicSentence",
    checks.arabicSentenceStartCheck,
    checks.arabicSentenceEndCheck,
  );
}

function tokenizeText(this: Bidi): Token[] {
  registerArabicWordCheck.call(this);
  registerArabicSentenceCheck.call(this);
  return this.tokenizer.tokenize(this.text as string);
}

function checkGlyphIndexStatus(this: Bidi): void {
  if (this.tokenizer.registeredModifiers.indexOf("glyphIndex") === -1) {
    throw new Error("glyphIndex modifier is required to apply arabic presentation features.");
  }
}

function applyArabicPresentationForms(this: Bidi): void {
  if (!Object.prototype.hasOwnProperty.call(this.features, "arab")) return;
  checkGlyphIndexStatus.call(this);
  const ranges = this.tokenizer.getContextRanges("arabicWord") as ContextRange[];
  ranges.forEach((range) => {
    arabicPresentationForms.call(this, range);
  });
}

function applyArabicRequireLigatures(this: Bidi): void {
  if (!Object.prototype.hasOwnProperty.call(this.features, "arab")) return;
  if (!Object.prototype.hasOwnProperty.call(this.features.arab as Record<string, Feature>, "rlig"))
    return;
  checkGlyphIndexStatus.call(this);
  const ranges = this.tokenizer.getContextRanges("arabicWord") as ContextRange[];
  ranges.forEach((range) => {
    arabicRequiredLigatures.call(this, range);
  });
}

/** Tokenizes text and applies the Arabic forms and required ligatures. */
export class Bidi {
  baseDir: string;
  tokenizer: Tokenizer;
  /** Features by script, then by tag. */
  features: Record<string, Record<string, Feature>>;
  text?: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || "ltr";
    this.tokenizer = new Tokenizer();
    this.features = {};
  }

  /** The context checkers; shared, like the old prototype value. */
  declare contextChecks: typeof contextChecks;

  setText(text: string): void {
    this.text = text;
  }

  /**
   * Applies the Arabic forms whenever an arabicWord context ends. Like
   * opentype.js this calls the forms with the tokenizer as `this`, which
   * has no features.
   */
  subscribeArabicForms(feature: unknown): void {
    const tokenizer = this.tokenizer;
    tokenizer.events.contextEnd.subscribe(function (contextName: string, range: ContextRange) {
      if (contextName === "arabicWord") {
        return (
          arabicPresentationForms as (this: unknown, range: ContextRange, feature: unknown) => void
        ).call(tokenizer, range, feature);
      }
      return undefined;
    });
  }

  /** Registers features by their script and tag; holes are skipped. */
  applyFeatures(features: readonly FeatureInput[]): void {
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (feature) {
        // A FAIL object has no script or tag and lands under "undefined".
        const script = (feature as Feature).script;
        if (!this.features[script]) {
          this.features[script] = {};
        }
        (this.features[script] as Record<string, Feature>)[(feature as Feature).tag] =
          feature as Feature;
      }
    }
  }

  registerModifier(
    modifierId: string,
    condition: ((token: Token, contextParams: ContextParams<string>) => boolean) | null,
    modifier: (token: Token, contextParams: ContextParams<string>) => TokenValue,
  ): void {
    this.tokenizer.registerModifier(modifierId, condition, modifier);
  }

  /** Tokenizes and shapes the text unless it is the text processed last. */
  processText(text: string): void {
    if (!this.text || this.text !== text) {
      this.setText(text);
      tokenizeText.call(this);
      applyArabicPresentationForms.call(this);
      applyArabicRequireLigatures.call(this);
    }
  }

  getBidiText(text: string): string {
    this.processText(text);
    return this.tokenizer.getText();
  }

  /**
   * The glyph index of every token not deleted by a ligature. Gravit: chars,
   * when given, gets the characters of the same tokens.
   */
  getTextGlyphs(text: string, chars?: string[]): number[] {
    this.processText(text);
    const indexes: number[] = [];
    for (let i = 0; i < this.tokenizer.tokens.length; i++) {
      const token = this.tokenizer.tokens[i] as Token;
      if (token.state.deleted) continue;
      const index = (token.activeState as { value: TokenValue }).value;
      indexes.push((Array.isArray(index) ? index[0] : index) as number);
    }
    if (chars) {
      for (let i = 0; i < this.tokenizer.tokens.length; i++) {
        const token = this.tokenizer.tokens[i] as Token;
        if (!token.state.deleted) chars.push(token.char);
      }
    }
    return indexes;
  }
}

Bidi.prototype.contextChecks = contextChecks;
