// Old: chunk.vendor.js module 926 (the character cursor over runs, carota's characters.js).
import { Formatting, type Run, type TextPiece } from "./formatting.ts";

function checkSameRuns(a: Character, b: Character): void {
  if (a._runs !== b._runs) throw new Error("Characters for different documents");
}

/** The first character of the first run from `index` on that has text, or the end. */
function firstNonEmpty(runs: Run[], index: number): Character {
  for (; index < runs.length; index++) {
    if (0 != Formatting.getTextLength((runs[index] as Run).text)) {
      return new Character(runs, index, 0);
    }
  }
  return new Character(runs, runs.length, 0);
}

/** A position in a run array: run index and offset in its text. `char` is null at the end. */
export class Character {
  _runs: Run[];
  _run: number;
  _offset: number;
  char: TextPiece | null | undefined;

  constructor(runs: Run[], run: number, offset: number) {
    this._runs = runs;
    this._run = run;
    this._offset = offset;
    this.char =
      run >= runs.length
        ? null
        : (runs[run] as Run).text
          ? Formatting.getTextChar((runs[run] as Run).text, offset)
          : null;
  }

  equals(other: Character): boolean {
    checkSameRuns(this, other);
    return this._run === other._run && this._offset === other._offset;
  }

  /**
   * A source that emits the runs between this character and `end`, each
   * cut to its part of the text (a run derived from the original). The
   * text is set the sloppy-mode way: when the original run has a
   * read-only text, the derived run keeps the original text.
   */
  cut(end: Character): (emit: (run: Run) => void) => void {
    checkSameRuns(this, end);
    return (emit) => {
      for (let index = this._run; index <= end._run; index++) {
        const run = this._runs[index];
        if (run) {
          const from = index === this._run ? this._offset : 0;
          const to = index === end._run ? end._offset : Formatting.getTextLength(run.text);
          if (from < to) {
            Formatting.getSubText(
              (piece) => {
                const part = Object.create(run) as Run;
                Reflect.set(part, "text", piece);
                emit(part);
              },
              run.text,
              from,
              to - from,
            );
          }
        }
      }
    };
  }
}

/** Emits every character of a run array, then the end position (char null). */
export class Characters {
  static Character = Character;

  _runArray: Run[];

  constructor(runs: Run[]) {
    this._runArray = runs;
  }

  /** Stops when emit returns truthy. */
  emit(emit: (char: Character) => unknown): void {
    for (let char = firstNonEmpty(this._runArray, 0); !emit(char) && null !== char.char;) {
      char =
        char._offset + 1 < Formatting.getTextLength((this._runArray[char._run] as Run).text)
          ? new Character(this._runArray, char._run, char._offset + 1)
          : firstNonEmpty(this._runArray, char._run + 1);
    }
  }
}
