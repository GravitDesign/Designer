// Old: chunk.vendor.js module 927 (the word splitter, carota's split.js with Gravit's line breaking rules).
import type { CodeResolver, TextCode } from "./inline.ts";
import { RunDraw } from "./run-draw.ts";
import type { Character } from "./runs.ts";

/** A word as the splitter emits it: text from `text` to `spaces`, trailing spaces up to `end`. */
export interface WordSpan {
  text: Character;
  spaces: Character;
  end: Character;
}

/** Characters a line may break after (closing punctuation, CJK small kana, ...). */
const BREAK_AFTER =
  ' \t})]?|&,;¢°′″‰℃、。｡､￠，．：；？！％・･ゝゞヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々〻ｧｨｩｪｫｬｭｮｯｰ’”〉》」』】〕）］｝｣!%.:·"†‡›∶〃〆〗〞﹚﹜＂〙〟｠»‐゠–〜‼⁇⁈⁉〈《「『＇～— •︰︱︲︳﹐﹑﹒﹓﹔﹕﹖﹘︶︸︺︼︾﹀﹂﹗｜';

/** Characters a line may break before (opening punctuation, currency signs, ...). */
const BREAK_BEFORE =
  '([{‘“〈《「『【〔（［｛｢£¥＄￡￥+＋$"々〇〉》」｠￦ #〘〖〝｟«$"々〇〉》」｠￦ #〘〖〝｟«—…‥〳〴〵‵︴﹙﹛︵︷︹︻︽︿﹁﹃﹏·．';

/** CJK ideographs, kana and Hangul: a line can break between any two of them. */
function isCJK(char: string): boolean {
  const code = char.codePointAt(0) as number;
  if (
    (code >= 19968 && code <= 40959) ||
    (code >= 13312 && code <= 19855) ||
    (code >= 12352 && code <= 12543)
  ) {
    return true;
  }
  if (
    (code >= 11904 && code <= 12245) ||
    (code >= 12688 && code <= 12703) ||
    (code >= 13312 && code <= 19903)
  ) {
    return true;
  }
  if (
    (code >= 44032 && code <= 55215) ||
    (code >= 4352 && code <= 4607) ||
    (code >= 12592 && code <= 12687) ||
    (code >= 43360 && code <= 43391) ||
    (code >= 55216 && code <= 55295)
  ) {
    return true;
  }
  return false;
}

/**
 * Splits the character stream into words. A word ends before a line
 * break, after its trailing spaces when the next character starts a new
 * word, before a break-before character, after a break-after character,
 * between CJK characters, and around block or eof codes. Feed it with
 * split(emit, char) per character; it emits WordSpans and finally null.
 */
export class WordSplitter {
  _codes: CodeResolver;
  _start: Character | null = null;
  _trailingSpaces: Character | null = null;
  _canBreakAfter = false;
  _canBreakBefore = false;
  _lastBreakBefore = false;
  _lastBreakAfter = false;
  _newLine = true;

  constructor(codes: CodeResolver) {
    this._codes = codes;
  }

  split(emit: (word: WordSpan | null) => unknown, char: Character): false | undefined {
    let isBreak: boolean | undefined;
    if (null === char.char) {
      isBreak = true;
    } else {
      if (this._newLine) {
        isBreak = true;
        this._newLine = false;
      }
      if ("string" == typeof char.char) {
        if (" " === char.char) {
          if (!this._trailingSpaces) this._trailingSpaces = char;
        } else if ("\n" === char.char || char.char === RunDraw.LS) {
          isBreak = true;
          this._newLine = true;
        } else if (BREAK_AFTER.indexOf(char.char) >= 0) {
          this._canBreakAfter = true;
        } else if (BREAK_BEFORE.indexOf(char.char) >= 0) {
          isBreak = true;
          this._canBreakBefore = true;
        } else if (!isCJK(char.char)) {
          if (this._trailingSpaces || this._canBreakAfter) isBreak = true;
        } else if (this._trailingSpaces || this._canBreakAfter) {
          isBreak = true;
        } else if (this._lastBreakBefore) {
          this._lastBreakBefore = false;
        } else {
          isBreak = true;
        }
      } else {
        const code = this._codes(char.char) as TextCode;
        if (code.block || code.eof) {
          isBreak = true;
          this._newLine = true;
        }
      }
    }
    if (isBreak) {
      if (this._start && !this._start.equals(char)) {
        if (
          false ===
          emit({
            text: this._start,
            spaces: this._trailingSpaces || char,
            end: char,
          })
        ) {
          return false;
        }
        this._lastBreakBefore = this._canBreakBefore;
        this._trailingSpaces = null;
        this._canBreakAfter = false;
        this._canBreakBefore = false;
      }
      if (null === char.char) emit(null);
      this._start = char;
    }
    return undefined;
  }
}
