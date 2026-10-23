// Old: chunk.vendor.js module 148 (the GTL run formatting helpers, carota's runs.js).
//
// A run is a piece of text with its formatting: `{text: "Hello",
// fontSize: 12, ...}`. The text is a string, a code object (`{$:
// "ListStart"}`, an inline marker) or an array of pieces. Runs are plain
// objects that the layout derives from each other with Object.create, so
// formatting often sits on the prototype chain; the helpers here read it
// through the chain (`in`, property reads) and Object.keys only where the
// old code did.
import { equals } from "../../core/util.ts";
import { Pattern } from "../../style/pattern.ts";

/** A code object in a run's text: list codes, list markers, custom inlines. */
export interface CodeObject {
  $: string;
  [key: string]: unknown;
}

/** One piece of an array text: characters or a code object. */
export type TextPiece = string | CodeObject;

/** What a run's text can be. */
export type RunText = string | CodeObject | TextPiece[];

/** The formatting properties of a run. Values come from saved files, so they are loose. */
export interface RunFormatting {
  fontWeight?: number | string | null;
  fontStyle?: string | null;
  underline?: boolean;
  strikeout?: boolean;
  fontColor?: string | Pattern | null;
  fontFamily?: string | null;
  fontSize?: number;
  align?: string;
  script?: string;
  transformation?: string | null;
  charSpacing?: number;
  wordSpacing?: number;
  lineSpacing?: number | string;
  paragraphSpacing?: number | string | null;
  paragraphIndent?: number | string;
  ligatures?: boolean;
  langScript?: string;
  variant?: string | null;
  fractions?: boolean;
  listDepth?: number;
  listMarker?: string | null;
  stylisticSet?: string | null;
  localizedForm?: string | null;
  [key: string]: unknown;
}

/** A run: text plus formatting. */
export interface Run extends RunFormatting {
  text?: RunText;
}

/** The marker merge puts where runs disagree. */
export type MultipleValues = Record<string, never>;

const multipleValues: MultipleValues = {};

/** The keys that make up a run's formatting ("transformation" is listed twice). */
const formattingKeys = [
  "fontWeight",
  "fontStyle",
  "underline",
  "strikeout",
  "fontColor",
  "fontFamily",
  "fontSize",
  "align",
  "script",
  "transformation",
  "charSpacing",
  "wordSpacing",
  "lineSpacing",
  "transformation",
  "paragraphSpacing",
  "paragraphIndent",
  "ligatures",
  "langScript",
  "variant",
  "fractions",
  "listDepth",
  "listMarker",
  "stylisticSet",
  "localizedForm",
];

/**
 * The formatting a run has when it doesn't say. TLCore.initialize fills
 * the font and paragraph values from the text style defaults once.
 */
const defaultFormatting: Required<
  Pick<
    RunFormatting,
    | "fontSize"
    | "fontFamily"
    | "fontWeight"
    | "fontStyle"
    | "fontColor"
    | "underline"
    | "strikeout"
    | "ligatures"
    | "fractions"
    | "align"
    | "script"
    | "langScript"
    | "variant"
    | "transformation"
    | "charSpacing"
    | "lineSpacing"
    | "paragraphSpacing"
    | "paragraphIndent"
    | "wordSpacing"
    | "listDepth"
    | "listMarker"
    | "stylisticSet"
    | "localizedForm"
  >
> = {
  fontSize: 10,
  fontFamily: null,
  fontWeight: null,
  fontStyle: null,
  fontColor: "transparent",
  underline: false,
  strikeout: false,
  ligatures: false,
  fractions: false,
  align: "left",
  script: "normal",
  langScript: "auto",
  variant: null,
  transformation: null,
  charSpacing: 0,
  lineSpacing: 1,
  paragraphSpacing: "0",
  paragraphIndent: 0,
  wordSpacing: 0,
  listDepth: 0,
  listMarker: null,
  stylisticSet: null,
  localizedForm: null,
};

function sameFormatting(a: Run, b: Run): boolean {
  return formattingKeys.every((key) => equals(a[key], b[key], true));
}

/** A fresh plain run with the text and every formatting value (also inherited ones) except NaN. */
function clone(run: Run): Run {
  const result: Run = { text: run.text };
  formattingKeys.forEach((key) => {
    const value = run[key];
    if (!(!value && Number.isNaN(value))) result[key] = value;
  });
  return result;
}

/**
 * The formatting two runs share; keys where they differ get
 * multipleValues. With one array argument it folds the array (through
 * Array.prototype.reduce, which passes four arguments, as the old code
 * did); with more than two arguments it folds them. An array of two or
 * more runs therefore recurses until the stack overflows (QUESTIONS.md
 * "GTL Formatting.merge recurses forever on an array of runs").
 */
function merge(...args: unknown[]): Run {
  if (1 === args.length) {
    const only = args[0];
    return Array.isArray(only) ? (only as Run[]).reduce(merge as never) : (only as Run);
  }
  if (args.length > 2) return merge(args);
  const a = args[0] as Run;
  const b = args[1] as Run;
  const result: Run = {};
  for (let i = formattingKeys.length - 1; i >= 0; i--) {
    const key = formattingKeys[i] as string;
    if (key in a || key in b) {
      const valueA = a[key];
      const valueB = b[key];
      if (valueA instanceof Pattern && valueB instanceof Pattern && equals(valueA, valueB, true)) {
        result[key] = valueA;
      } else {
        result[key] = valueA === valueB ? valueA : multipleValues;
      }
    }
  }
  return result;
}

/**
 * Applies formatting to runs. Without `create` it writes the values into
 * the runs (skipping multipleValues). With `create` it returns new runs:
 * each one inherits the formatting plus the run's prototype values, and
 * has the run's own values as read-only, non-enumerable own properties
 * (Object.create with value descriptors), which Object.keys doesn't list.
 */
function format(runs: Run | Run[], formatting: Run, create?: boolean): Run | Run[] | undefined {
  let result: Run | Run[] | undefined;
  if (Array.isArray(runs)) {
    if (create) {
      const list: Run[] = [];
      runs.forEach((run) => {
        list.push(format(run, formatting, create) as Run);
      });
      result = list;
    } else {
      runs.forEach((run) => {
        format(run, formatting, create);
      });
    }
  } else if (create) {
    const base: Run = {};
    const own: PropertyDescriptorMap = {};
    Object.keys(formatting)
      .concat(Object.keys(Object.getPrototypeOf(formatting) as object))
      .forEach((key) => {
        if (formatting[key] !== multipleValues) base[key] = formatting[key];
      });
    Object.keys(Object.getPrototypeOf(runs) as object).forEach((key) => {
      base[key] = runs[key];
    });
    Object.keys(runs).forEach((key) => {
      own[key] = { value: runs[key] };
    });
    result = Object.create(base, own) as Run;
  } else {
    Object.keys(formatting).forEach((key) => {
      if (formatting[key] !== multipleValues) Reflect.set(runs, key, formatting[key]);
    });
  }
  return result;
}

/**
 * A consumer that joins runs with the same formatting and string texts.
 * Call it with the downstream emit and each run; it emits clones.
 */
function consolidate(): (emit: (run: Run) => unknown, run: Run) => void {
  let current: Run | undefined;
  return (emit, run) => {
    if (
      current &&
      sameFormatting(current, run) &&
      "string" == typeof current.text &&
      "string" == typeof run.text
    ) {
      current.text += run.text;
    } else {
      emit((current = clone(run)));
    }
  };
}

function getPlainText(run: Run): string {
  if ("string" == typeof run.text) return run.text;
  if (Array.isArray(run.text)) {
    const parts: string[] = [];
    run.text.forEach((piece) => {
      parts.push(getPiecePlainText(piece));
    });
    return parts.join("");
  }
  return "_";
}

/** A string piece counts its characters, a code object one. */
function getPieceLength(piece: unknown): number {
  return (piece as { length?: number }).length || 1;
}

function getPiecePlainText(piece: unknown): string {
  return (piece as { length?: number }).length ? (piece as string) : "_";
}

function getTextLength(text: unknown): number {
  if ("string" == typeof text) return text.length;
  if (Array.isArray(text)) {
    let length = 0;
    text.forEach((piece) => {
      length += getPieceLength(piece);
    });
    return length;
  }
  return 1;
}

/** Emits the pieces of `text` from `start` on, `count` characters long. */
function getSubText(
  emit: (piece: TextPiece) => void,
  text: unknown,
  start: number,
  count: number,
): void {
  if (0 === count) return;
  if ("string" == typeof text) {
    emit(text.substr(start, count));
  } else if (Array.isArray(text)) {
    let position = 0;
    text.some((piece: TextPiece) => {
      if (count <= 0) return true;
      const length = getPieceLength(piece);
      if (position + length > start) {
        if (1 === length) {
          emit(piece);
          count -= 1;
        } else {
          const sub = (piece as string).substr(Math.max(0, start - position), count);
          emit(sub);
          count -= sub.length;
        }
      }
      position += length;
      return undefined;
    });
  } else {
    emit(text as TextPiece);
  }
}

function getTextChar(text: unknown, offset: number): TextPiece | undefined {
  let result: TextPiece | undefined;
  getSubText(
    (piece) => {
      result = piece;
    },
    text,
    offset,
    1,
  );
  return result;
}

/** Calls `emit` per character of a string text, or once with a code object. */
function pieceCharacters(emit: (char: TextPiece, index?: number) => void, text: unknown): void {
  if ("string" == typeof text) {
    for (let i = 0; i < text.length; i++) emit(text[i] as string, i);
  } else {
    emit(text as TextPiece);
  }
}

/** The run helpers under the names the old module exported. */
export const Formatting = {
  formattingKeys,
  defaultFormatting,
  multipleValues,
  sameFormatting,
  clone,
  merge,
  format,
  consolidate,
  getPlainText,
  getPieceLength,
  getPiecePlainText,
  getTextLength,
  getSubText,
  getTextChar,
  pieceCharacters,
};
