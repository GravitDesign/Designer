// Old: chunk.vendor.js module 652 (the GTL document, carota's doc.js).
import { WordSplitter, type WordSpan } from "./characters.ts";
import { Formatting, type CodeObject, type Run, type RunText } from "./formatting.ts";
import { Frame } from "./frame.ts";
import type { CodeResolver, TextCode } from "./inline.ts";
import { Per } from "./list-util.ts";
import { TLNode } from "./node.ts";
import { TLRange } from "./range.ts";
import { TLRect } from "./rect.ts";
import { Characters, type Character } from "./runs.ts";
import { TLCode } from "./tl-code.ts";
import { TLCodes, type EditFilterTarget } from "./tl-codes.ts";
import { TLUtil, type TLEvent } from "./tl-util.ts";
import { Word, type WordRange } from "./word.ts";

/** An undoable edit: applies itself and logs its inverse. */
export type EditCommand = (log: (command: EditCommand) => void) => void;

/** The log a transaction collects its commands with. */
type CommandLog = ((command: EditCommand) => void) & { cmdLen?: number };

export interface Selection {
  start: number;
  end: number;
}

/** What drawSelection paints with. */
interface SelectionPainter {
  fillStyle: unknown;
  save(): void;
  restore(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
}

/** A block of the document as blocks() emits it: a paragraph or list range with neighbours. */
export type BlockRange = TLRange & { prev?: TLRange; next?: TLRange };

/** Line break words and block or eof codes end paragraphs. */
function endsParagraph(word: Word): boolean {
  if (word.isNewLine()) return true;
  const code = word.code();
  return !(!code || (!code.block && !code.eof));
}

function isSoftParagraphEnd(word: Word): boolean {
  return endsParagraph(word) && word.isSoftBreak();
}

/**
 * A rich text document: words made from runs, laid out into a frame.
 * It keeps the selection, the formatting for the next insert, edit
 * filters (the list repair filter) and an undo log of edit commands.
 */
export class TLDocument extends TLNode implements EditFilterTarget {
  _width = 0;
  _noWrap = false;
  _wordOrdinals: number[] | null = null;
  selection: Selection;
  caretVisible = true;
  customCodes: (obj: unknown, data?: unknown, codes?: CodeResolver) => TextCode | null | undefined;
  codes: CodeResolver;
  selectionChanged: TLEvent;
  contentChanged: TLEvent;
  editFilters: ((doc: TLDocument) => void)[];
  nextInsertFormatting: Run = {};
  emptyFormatting: Run | null = null;
  _nextSelection: Selection | null = null;
  words: Word[] = null as unknown as Word[];
  undo: EditCommand[] = null as unknown as EditCommand[];
  redo: EditCommand[] = null as unknown as EditCommand[];
  frame: Frame | null = null;
  selectionJustChanged = false;
  _currentTransaction: CommandLog | null = null;
  _lastSpacingPadding: number | null | undefined = null;
  /** Only present while splices run the edit filters (checked with `in`). */
  declare _filtersRunning?: number;

  constructor() {
    super();
    this._width = 0;
    this.selection = { start: 0, end: 0 };
    this.nextInsertFormatting = {};
    this.caretVisible = true;
    this._noWrap = false;
    this.customCodes = () => undefined;
    this.codes = ((obj: unknown, data?: unknown) =>
      TLCodes.codeFactory(obj as CodeObject, data, this.codes) ||
      this.customCodes(obj, data, this.codes)) as CodeResolver;
    this.selectionChanged = TLUtil.event();
    this.contentChanged = TLUtil.event();
    this.editFilters = [TLCodes.editFilter as (doc: TLDocument) => void];
    this.load([]);
  }

  /**
   * An edit command that splices words; it logs its inverse (the removed
   * words back in at the same place). The old code made the inverse with
   * the document as the first argument (carota's free-function signature),
   * so undoing spliced at 0; a failed layout rolls back through it
   * (BUGS-FIXED.md "BUG-025 Text core undo splices at the start and rolls
   * back in a cascade").
   */
  makeEditCommand(start: number, count: number, words: Word[]): EditCommand {
    const selectionStart = this.selection.start;
    const selectionEnd = this.selection.end;
    return (log) => {
      this._wordOrdinals = [];
      const removed = this.words.splice(start, count, ...words);
      log(this.makeEditCommand(start, words.length, removed));
      this._nextSelection = { start: selectionStart, end: selectionEnd };
    };
  }

  _makeTransaction(perform: (log: CommandLog) => void): EditCommand {
    const commands: EditCommand[] = [];
    const log: CommandLog = (command) => {
      commands.push(command);
      log.cmdLen = commands.length;
    };
    perform(log);
    return (outer) => {
      outer(
        this._makeTransaction((inner) => {
          while (commands.length) (commands.pop() as EditCommand)(inner);
        }),
      );
    };
  }

  /**
   * Replaces the content with runs and lays it out; false when the runs
   * can't be split or measured. Clears the undo log and selects 0.
   */
  load(runs: Run[], selectionParam?: unknown, contentParam?: unknown): boolean {
    this.undo = [];
    this.redo = [];
    this._wordOrdinals = [];
    const characters = new Characters(runs);
    const splitter = new WordSplitter(this.codes);
    try {
      this.words = Per.create<Character>(characters.emit, characters)
        .per<WordSpan | null>(splitter.split, splitter)
        .map((span) => new Word(span, this.codes))
        .all();
    } catch {
      return false;
    }
    this.layout();
    this.contentChanged.fire(contentParam);
    this.select(0, 0, selectionParam);
    return true;
  }

  /**
   * Lays the words out into a new frame. The letter spacing at the end of
   * the widest line of this layout is the spacing padding of the next one.
   * When layout fails the last edit is undone.
   */
  layout(): void {
    this.frame = null;
    try {
      const frame = new Frame(
        0,
        0,
        this._width,
        0,
        this,
        void 0,
        void 0,
        void 0,
        this._noWrap,
        this._lastSpacingPadding,
      );
      // first() gives undefined when no frame came out; the old code stored that as is.
      this.frame = Per.create<Word>(this.words).per<Frame>(frame.frame, frame).first() as Frame;
      this._lastSpacingPadding = this.frame && this.frame.getBBoxSpacing();
    } catch (e) {
      console.error(e);
    }
    if (this.frame) {
      if (this._nextSelection) {
        const selection = this._nextSelection;
        this._nextSelection = null;
        this.select(selection.start, selection.end);
      }
    } else {
      console.error("A bug somewhere has produced an invalid state - rolling back");
      this.performUndo();
    }
  }

  range(start: number, end: number): TLRange {
    return new TLRange(this, start, end);
  }

  documentRange(): TLRange {
    return this.range(0, this.frame ? this.frame.length - 1 : 0);
  }

  selectedRange(): TLRange {
    return this.range(this.selection.start, this.selection.end);
  }

  save(): Run[] {
    return this.documentRange().save();
  }

  /** The range of whole lines from the line of `start` to the line of `end`. */
  lineRange(start: number, end?: number): TLRange {
    if (!this.frame) return this.range(0, 0);
    const lines = this.frame.children();
    end = end || start;
    let from = 0;
    let to = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] as TLNode;
      const last = line.last() as TLNode & { word?: Word };
      const lineStart = line.ordinal;
      const lastStart = last.ordinal;
      if (lineStart <= start && start <= lastStart) from = lineStart;
      if (lineStart <= end && end <= lastStart) {
        to = lastStart + (last.word ? last.word.text.length : last.length);
      }
    }
    return this.range(from, to);
  }

  /**
   * Emits the paragraph and list ranges that overlap `range` (widened to
   * whole blocks), each with `prev` set to the block before it. `next` was
   * meant to be the block after it but reads a missing index of the range
   * and is undefined (QUESTIONS: "GTL blocks never have a next block").
   */
  blocks(emit: (block: BlockRange) => unknown, range: { start: number; end: number }): void {
    const open: { start: number; code?: boolean }[] = [];
    const blocks: TLRange[] = [];
    let start = range.start;
    let end = range.end;
    let ordinal = 0;
    this.words.forEach((word) => {
      let current: { start: number; code?: boolean } | undefined;
      const code = word.code();
      if (code && 0 === (code.$ as string).indexOf("List")) {
        if ((current = open.pop())) {
          const blockEnd = code.$ === TLCode.List.Close ? ordinal + word.length : ordinal;
          blocks.push(this.range(current.start, blockEnd));
        }
        if (code.$ !== TLCode.List.Close) open.push({ start: ordinal, code: true });
      } else {
        if (!(current = open[open.length - 1])) open.push({ start: ordinal });
        if (!(current && current.code) && endsParagraph(word) && !isSoftParagraphEnd(word)) {
          current = open.pop() as { start: number };
          blocks.push(this.range(current.start, ordinal + word.length));
        }
      }
      ordinal += word.length;
    });
    const blockAt = (position: number): TLRange | undefined => {
      let found: TLRange | undefined;
      blocks.some((block) => {
        if (position >= block.start && position < block.end) {
          found = block;
          return true;
        }
        return undefined;
      });
      return found;
    };
    let node: TLNode | null = this.byOrdinal(start);
    if (node && node.block && start > 0) start--;
    if ((node = this.byOrdinal(end)) && node.block && end > 0) end--;
    const first = blockAt(start);
    const last = blockAt(end);
    start = first ? first.start : 0;
    end = last ? last.end : this.frame ? this.frame.length : 0;
    blocks.forEach((block, index) => {
      if (block.start >= start && block.end <= end) {
        emit(
          Object.create(block, {
            prev: { value: blocks[index - 1] },
            next: { value: (block as unknown as Record<number, unknown>)[index + 1] },
          }) as BlockRange,
        );
      }
    });
  }

  /** The range from the start of the paragraph at `start` to the end of the one at `end`. */
  paragraphRange(start: number, end: number): TLRange {
    let i: number;
    const startWord = this.wordContainingOrdinal(start);
    start = 0;
    if (startWord) {
      for (i = startWord.index; i > 0; i--) {
        const previous = this.words[i - 1] as Word;
        if (endsParagraph(previous) && !isSoftParagraphEnd(previous)) {
          start = this.wordOrdinal(i) as number;
          break;
        }
      }
    }
    const endWord = this.wordContainingOrdinal(end);
    end = this.frame ? this.frame.length - 1 : 0;
    if (endWord) {
      if (endsParagraph(endWord.word) && !isSoftParagraphEnd(endWord.word)) {
        end = this.wordOrdinal(endWord.index) as number;
      } else {
        for (i = endWord.index; i < this.words.length; i++) {
          const word = this.words[i] as Word;
          if (endsParagraph(word) && !isSoftParagraphEnd(word)) {
            end = this.wordOrdinal(i) as number;
            break;
          }
        }
      }
    }
    return this.range(start, end);
  }

  /** Replaces the selection with text (line breaks normalized) or runs and moves the caret after it. */
  insert(text: unknown, selectionParam?: unknown): void {
    if ("string" == typeof text || text instanceof String) text = TLUtil.deCRLFify(text as string);
    this.select(this.selection.end + this.selectedRange().setText(text), null, selectionParam);
  }

  modifyInsertFormatting(key: string, value: unknown): void {
    this.nextInsertFormatting[key] = value;
    this.notifySelectionChanged();
  }

  /**
   * Applies the formatting for the next insert to new runs. In an empty
   * document the formatting it had before it was emptied is the base (and
   * takes the next-insert values in).
   */
  applyInsertFormatting(runs: Run[]): void {
    let formatting: Run;
    if (this.frame && this.frame.length <= 1 && this.emptyFormatting) {
      formatting = this.emptyFormatting;
      if (this.nextInsertFormatting) {
        for (const key in this.nextInsertFormatting)
          formatting[key] = this.nextInsertFormatting[key];
      }
    } else {
      formatting = this.nextInsertFormatting;
    }
    const keys = Object.keys(formatting);
    if (keys.length) {
      runs.forEach((run) => {
        keys.forEach((key) => {
          Reflect.set(run, key, formatting[key]);
        });
      });
    }
  }

  /** The ordinal of word `index` (cached as far as asked). */
  wordOrdinal(index: number): number | undefined {
    if (index < this.words.length) {
      const ordinals = this._wordOrdinals as number[];
      const known = ordinals.length;
      if (known < index + 1) {
        let ordinal =
          known > 0 ? (ordinals[known - 1] as number) + (this.words[known - 1] as Word).length : 0;
        for (let i = known; i <= index; i++) {
          ordinals[i] = ordinal;
          ordinal += (this.words[i] as Word).length;
        }
      }
      return ordinals[index];
    }
    return undefined;
  }

  wordContainingOrdinal(
    ordinal: number,
  ): { word: Word; ordinal: number; index: number; offset: number } | undefined {
    let found: { word: Word; ordinal: number; index: number; offset: number } | undefined;
    let position = 0;
    if (!this.words) {
      console.log("SOMETHING WRONG!");
      // The old code returned an empty object here, not a match.
      return {} as never;
    }
    this.words.some((word, index) => {
      if (ordinal >= position && ordinal < position + word.length) {
        found = { word, ordinal: position, index, offset: ordinal - position };
        return true;
      }
      position += word.length;
      return undefined;
    });
    return found;
  }

  /** Emits the runs between range.start and range.end (clamped to the text). */
  runs(emit: (run: Run) => void, range: { start: number; end: number }): void {
    const first = this.wordContainingOrdinal(Math.max(0, range.start)) as NonNullable<
      ReturnType<TLDocument["wordContainingOrdinal"]>
    >;
    const last = this.wordContainingOrdinal(
      Math.min(range.end, this.frame ? this.frame.length - 1 : 0),
    ) as NonNullable<ReturnType<TLDocument["wordContainingOrdinal"]>>;
    if (first.index === last.index) {
      first.word.runs(emit, { start: first.offset, end: last.offset });
    } else {
      first.word.runs(emit, { start: first.offset });
      for (let i = first.index + 1; i < last.index; i++) (this.words[i] as Word).runs(emit);
      last.word.runs(emit, { end: last.offset });
    }
  }

  /**
   * Replaces `count` words at `index` with the words of runs, as one
   * undoable command. When codes are involved the edit filters run until
   * none of them splices again.
   */
  spliceWordsWithRuns(index: number, count: number, runs: Run[]): void {
    let words: Word[];
    const characters = new Characters(runs);
    const splitter = new WordSplitter(this.codes);
    try {
      words = Per.create<Character>(characters.emit, characters)
        .per<WordSpan | null>(splitter.split, splitter)
        .truthy()
        .map((span) => new Word(span, this.codes))
        .all();
    } catch {
      return;
    }
    let hasCodes = false;
    if ("_filtersRunning" in this) {
      (this._filtersRunning as number)++;
    } else {
      for (let i = 0; i < count; i++) if ((this.words[index + i] as Word).code()) hasCodes = true;
      if (!hasCodes) hasCodes = words.some((word) => !!word.code());
    }
    this.transaction((log) => {
      this.makeEditCommand(index, count, words)(log);
      if (hasCodes) {
        this._filtersRunning = 0;
        try {
          for (;;) {
            const before = this._filtersRunning;
            if (
              !this.editFilters.some((filter) => {
                filter(this);
                return before !== this._filtersRunning;
              })
            ) {
              break;
            }
          }
        } finally {
          delete this._filtersRunning;
        }
      }
    });
  }

  /** Whether the splice would lay out, tried on a copy. */
  checkSanity(start: number, end: number, text: unknown): boolean {
    try {
      const copy = new TLDocument();
      copy.load(this.documentRange().save());
      copy.splice(start, end, text);
      return !!copy.frame;
    } catch (e) {
      console.warn("Document sanity - A bug somewhere would produce an invalid state", e);
    }
    return false;
  }

  clone(): TLDocument {
    const copy = new TLDocument();
    copy._width = this._width;
    copy.load(this.documentRange().save());
    return copy;
  }

  realBounds(): TLRect | null {
    return this.frame && this.frame.bounds();
  }

  /**
   * Replaces the text from `start` to `end` with a string (in the
   * formatting of the character before), a run array or a single text.
   * Words around the edit are re-split with it. Emptying the whole
   * document remembers its formatting for the next insert. Returns the
   * change in length.
   */
  splice(start: number, end: number, text: unknown): number {
    let runs: Run[];
    if ("string" == typeof text) {
      const before = Math.max(0, start - 1);
      const formatting = Per.create<{ start: number; end: number }>({
        start: before,
        end: before + 1,
      })
        .per<Run>(this.runs, this)
        .first();
      runs = [
        formatting
          ? (Object.create(formatting, { text: { value: text } }) as Run)
          : { text: text as RunText },
      ];
    } else {
      runs = Array.isArray(text) ? (text as Run[]) : [{ text: text as RunText }];
    }
    this.applyInsertFormatting(runs);
    let before: Run[];
    let after: Run[];
    const startWord = this.wordContainingOrdinal(start);
    const endWord = this.wordContainingOrdinal(end);
    if (!startWord || !endWord) return 0;
    if (start === startWord.ordinal) {
      if (startWord.index > 0 && !endsParagraph(this.words[startWord.index - 1] as Word)) {
        startWord.index--;
        const word = this.words[startWord.index] as Word;
        before = Per.create<WordRange>({}).per<Run>(word.runs, word).all();
      } else {
        before = [];
      }
    } else {
      before = Per.create<WordRange>({ end: startWord.offset })
        .per<Run>(startWord.word.runs, startWord.word)
        .all();
    }
    if (end === endWord.ordinal) {
      if (end === (this.frame ? this.frame.length - 1 : 0) || endsParagraph(endWord.word)) {
        after = [];
        endWord.index--;
      } else {
        after = Per.create<WordRange>({}).per<Run>(endWord.word.runs, endWord.word).all();
      }
    } else {
      after = Per.create<WordRange>({ start: endWord.offset })
        .per<Run>(endWord.word.runs, endWord.word)
        .all();
    }
    const lengthBefore = this.frame ? this.frame.length : 0;
    const merged = Per.create<Run>(before)
      .concat(runs)
      .concat(after)
      .per<Run>(Formatting.consolidate())
      .all();
    const frame = this.frame as Frame;
    if (0 === start && end >= frame.length - 1 && frame.length > 1 && 0 === merged.length) {
      if (end === frame.length) end--;
      const formatting = this.range(0, end).getFormatting();
      this.emptyFormatting = null;
      for (const key in formatting) {
        if ("text" !== key) {
          if (!this.emptyFormatting) this.emptyFormatting = {};
          this.emptyFormatting[key] = formatting[key];
        }
      }
    }
    this.spliceWordsWithRuns(startWord.index, endWord.index - startWord.index + 1, merged);
    return this.frame ? this.frame.length - lengthBefore : 0;
  }

  registerEditFilter(filter: (doc: TLDocument) => void): void {
    this.editFilters.push(filter);
  }

  wrap(wrap: boolean): void {
    this._noWrap = !wrap;
    this.layout();
  }

  /** The layout width; setting a different one lays out again. */
  width(): number;
  width(width: number): void;
  width(...args: [number?]): number | void {
    if (0 === args.length) return this._width;
    const width = args[0] as number;
    if (width !== this._width) {
      this._width = width;
      this.layout();
    }
  }

  override children(): TLNode[] {
    return this.frame ? [this.frame] : [];
  }

  /** Blinks the caret of an empty selection; returns whether it changed. */
  toggleCaret(): boolean {
    const visible = this.caretVisible;
    if (this.selection.start === this.selection.end) {
      if (this.selectionJustChanged) this.selectionJustChanged = false;
      else this.caretVisible = !this.caretVisible;
    }
    return this.caretVisible !== visible;
  }

  /** The caret rectangle before the character at `ordinal`. */
  getCaretCoords(ordinal: number): TLRect | undefined {
    let caret: TLRect;
    const node = this.byOrdinal(ordinal);
    if (!node) return undefined;
    const previous = this.byOrdinal(ordinal - 1);
    if (node.block && ordinal > 0) {
      if (previous.newLine) {
        const previousBounds = previous.bounds();
        const lineBounds = ((previous.parent() as TLNode).parent() as TLNode).bounds();
        caret = new TLRect(lineBounds.l, lineBounds.b, 1, previousBounds.h);
      } else {
        caret = previous.bounds();
        caret = new TLRect(caret.r, caret.t, 1, caret.h);
      }
    } else {
      caret = node.bounds();
      let left = caret.l;
      let top = caret.t;
      let height: number | undefined = caret.h;
      if (node.newLine && previous.newLine) {
        const align = this.nextInsertFormatting.align || this.selectedRange().getFormatting().align;
        if ("center" === align) left = (this.frame as Frame).bounds().center().x;
        else if ("right" === align) left = (this.frame as Frame).bounds().r;
      }
      if (previous.endOfList && ordinal === (this.frame as Frame).length - 1) {
        caret = previous.bounds();
        top = caret.t + caret.h;
        height = caret.h;
      } else if ("document" === previous.type && node.block && 0 === ordinal) {
        caret = node.bounds();
        top = caret.t - caret.h;
        left = 0;
        height = caret.h;
      } else if (node.endOfList && 1 === node.length && "inline" === previous.type) {
        height = (previous as unknown as { h?: number }).h;
      }
      if (height) {
        caret = new TLRect(left, top, 1, height);
      } else {
        const previousBounds = this.byOrdinal(ordinal - 1).bounds();
        caret = previousBounds.h
          ? new TLRect(left, caret.t, 1, previousBounds.h)
          : new TLRect(left, caret.t, caret.w, 1);
      }
    }
    return caret;
  }

  /** The character node at a point, moved so that the caret's line contains `y`. */
  override byCoordinate(x: number, y: number): TLNode | null {
    if (!this.frame) return null;
    if (x < 0) x = 0;
    let ordinal = (this.frame.byCoordinate(x, y) as TLNode).ordinal;
    let caret = this.getCaretCoords(ordinal) as TLRect;
    while (caret.b <= y && ordinal < this.frame.length - 1) {
      ordinal++;
      caret = this.getCaretCoords(ordinal) as TLRect;
    }
    while (caret.t >= y && ordinal > 0) {
      ordinal--;
      caret = this.getCaretCoords(ordinal) as TLRect;
    }
    return this.byOrdinal(ordinal);
  }

  /** Paints the caret (when focused and visible) or the selection boxes. */
  drawSelection(context: SelectionPainter, focused?: boolean): void {
    if (this.selection.end === this.selection.start) {
      if (focused && (this.selectionJustChanged || this.caretVisible)) {
        const caret = this.getCaretCoords(this.selection.start);
        if (caret) {
          context.save();
          context.fillStyle = "black";
          caret.fill(context);
          context.restore();
        }
      }
    } else {
      context.save();
      context.fillStyle = focused ? "rgba(0, 100, 200, 0.3)" : "rgba(160, 160, 160, 0.3)";
      this.selectedRange().parts((part) => {
        part.bounds(false, true).fill(context);
      });
      context.restore();
    }
  }

  /** Fires selectionChanged with a lazy getter of the selection's formatting. */
  notifySelectionChanged(param?: unknown): void {
    let formatting: Run | null = null;
    this.selectionChanged.fire(() => {
      if (!formatting) formatting = this.selectedRange().getFormatting();
      return formatting;
    }, param);
  }

  select(start: number, end?: number | null, param?: unknown): void {
    if (!this.frame) return;
    this.selection.start = Math.max(0, start);
    this.selection.end = Math.min(
      "number" == typeof end ? end : this.selection.start,
      this.frame.length - 1,
    );
    this.selectionJustChanged = true;
    this.caretVisible = true;
    this.nextInsertFormatting = {};
    this.notifySelectionChanged(param);
  }

  performUndo(redo?: boolean): void {
    const from = redo ? this.redo : this.undo;
    const to = redo ? this.undo : this.redo;
    const command = from.pop();
    if (command) {
      command((inverse) => {
        to.push(inverse);
      });
      this.layout();
      this.contentChanged.fire();
    }
  }

  canUndo(redo?: boolean): boolean {
    return redo ? !!this.redo.length : !!this.undo.length;
  }

  /**
   * Runs `perform` with the command log of the current transaction, or of
   * a new one (kept in the undo log, which holds at most 51 entries) that
   * lays out and fires contentChanged when commands were logged.
   */
  transaction(perform: (log: CommandLog) => void): void {
    if (this._currentTransaction) {
      perform(this._currentTransaction);
    } else {
      while (this.undo.length > 50) this.undo.shift();
      this.redo.length = 0;
      let changed = false;
      this.undo.push(
        this._makeTransaction((log) => {
          this._currentTransaction = log;
          try {
            perform(log);
          } finally {
            changed = (log.cmdLen as number) > 0;
            this._currentTransaction = null;
          }
        }),
      );
      if (changed) {
        this.layout();
        this.contentChanged.fire();
      }
    }
  }
}

TLDocument.prototype.type = "document";
