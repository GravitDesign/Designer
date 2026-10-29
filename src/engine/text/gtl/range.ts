// Old: chunk.vendor.js module 916 (a text range, carota's range.js with Gravit's list editing).
import type { BlockRange, TLDocument } from "./document.ts";
import { Formatting, type CodeObject, type Run } from "./formatting.ts";
import { Per } from "./list-util.ts";
import type { TLNode } from "./node.ts";
import { TLCode } from "./tl-code.ts";

/** The `$` of a run's code text, if it has one. */
function codeName(run: Run | null | undefined): string | undefined {
  return (run && run.text && (run.text as CodeObject).$) as string | undefined;
}

const concatAll = (all: Run[], runs: Run[]): Run[] => all.concat(runs);

/**
 * A copy of a run or formatting the document keeps: the same keys in the
 * same order (a plain loop; spreading objects this wide is much slower).
 */
function copyRun(run: Run): Run {
  const copy: Run = {};
  for (const key in run) copy[key] = run[key];
  return copy;
}

/**
 * A range of the document from `start` to `end` (swapped when given the
 * other way round): its runs, plain text and formatting, and the list
 * editing the text inspector offers.
 */
export class TLRange {
  /** Keeps runs that aren't list codes. */
  static unlistifyFilter(run: Run): boolean {
    const name = codeName(run);
    return !name || -1 === name.indexOf("List");
  }

  doc: TLDocument;
  start: number;
  end: number;

  constructor(doc: TLDocument, start: number, end: number) {
    this.doc = doc;
    this.start = start;
    this.end = end;
    if (start > end) {
      this.start = end;
      this.end = start;
    }
  }

  /**
   * Turns the blocks of the range back into paragraphs: list codes become
   * line breaks (or stay, with `keepCodes`, and at the document's start
   * and end), and a list before the range is closed. Returns whether the
   * change was applied (it is tried on a copy first).
   */
  unlistify(keepCodes?: boolean): boolean {
    const doc = this.doc;
    let start = this.start;
    let end = this.end;
    let prefix: Run[] | null = null;
    let runs = Per.create<BlockRange>(this.blocks, this)
      .map((block) => {
        if (block.isEOF()) return [];
        start = Math.min(start, block.start);
        end = Math.min(
          Math.max(end, block.end),
          (doc.frame as NonNullable<TLDocument["frame"]>).length - 1,
        );
        const previous = block.prev;
        let closesPrevious = false;
        if (null == prefix) {
          if (previous && previous.isList()) {
            prefix = Formatting.format(
              [{ text: { $: TLCode.List.Close } }],
              block.getFormatting(),
              true,
            ) as Run[];
            closesPrevious = true;
          } else {
            prefix = [];
          }
        }
        return Per.create<Run>(block.runs, block)
          .map((run, index) =>
            keepCodes ||
            "object" != typeof run.text ||
            0 !== (run.text as CodeObject).$.indexOf("List") ||
            (0 === index && closesPrevious) ||
            ((run.text as CodeObject).$ === TLCode.List.Open && 0 === start) ||
            ((run.text as CodeObject).$ === TLCode.List.Close &&
              end === (doc.frame as NonNullable<TLDocument["frame"]>).length - 1)
              ? run
              : (Object.create(run, { text: { value: "\n" } }) as Run),
          )
          .filter(TLRange.unlistifyFilter)
          .per<Run>(Formatting.consolidate())
          .all();
      })
      .all()
      .reduce(concatAll, [])
      .map((run) => Object.create(run, { listMarker: { value: void 0 } }) as Run);
    if (prefix) runs = (prefix as Run[]).concat(runs);
    const sane = this.doc.checkSanity(start, end, runs);
    if (sane) this.doc.range(start, end).setText(runs);
    return sane;
  }

  /**
   * Turns the blocks of the range into list items with `marker` (and the
   * list depth of an existing list code), joining a list right before the
   * range; with `clear` the item texts are emptied. Returns whether the
   * change was applied (it is tried on a copy first).
   */
  listify(marker: unknown, clear?: boolean): boolean {
    let start = this.start;
    let end = this.end;
    const doc = this.doc;
    let prefix: Run[] | null = null;
    let suffix: Run[] | null = null;
    let runs = Per.create<BlockRange>(this.blocks, this)
      .map((block) => {
        if (block.isEOF()) return [];
        const frameLength = (doc.frame as NonNullable<TLDocument["frame"]>).length;
        start = Math.min(start, block.start);
        end = Math.min(Math.max(end, block.end), frameLength - 1);
        const previous = block.prev;
        const next = block.next;
        if (null == prefix) {
          if (previous && previous.isList() && !block.isList()) {
            start = Math.min(start, previous.start);
            end = Math.max(end, previous.end);
            prefix = Per.create<Run>(previous.runs, previous)
              .filter((run: Run) => {
                const name = codeName(run);
                return !name || -1 === name.indexOf(TLCode.List.Close);
              })
              .per<Run>(Formatting.consolidate())
              .all();
          } else if (((prefix = []), previous)) {
            const saved = previous.save();
            const last = saved[saved.length - 1];
            if (last && "string" == typeof last.text && "\n" === last.text.slice(-1)) {
              start = Math.min(start, previous.start);
              end = Math.max(end, previous.end);
              saved[saved.length - 1] = Object.create(last, {
                text: { value: last.text.substr(0, last.text.length - 1) },
              }) as Run;
              prefix = saved;
            }
          }
        }
        // `next` is always undefined, so a ListEnd is always appended; joining
        // a following list is left to the edit filter (QUESTIONS: "GTL blocks never
        // have a next block").
        suffix =
          next && next.isList()
            ? []
            : (Formatting.format(
                [{ text: { $: TLCode.List.Close }, listMarker: marker as string }],
                (next || block).getFormatting(),
                true,
              ) as Run[]);
        let items = Per.create<Run>(block.runs, block)
          .filter(TLRange.unlistifyFilter)
          .per<Run>(Formatting.consolidate())
          .all()
          .map((run) => {
            if ("string" == typeof run.text) {
              if (clear) return Object.create(run, { text: { value: "" } }) as Run;
              if (-1 !== run.text.indexOf("\n")) {
                return Object.create(run, { text: { value: run.text.replace(/\n/g, "") } }) as Run;
              }
            }
            return run;
          });
        const formatting = block.getFormatting();
        if (isNaN(Number(formatting.listMarker))) {
          let depth = 0;
          block.save().some((run) => {
            const name = codeName(run);
            if (name && 0 === name.indexOf("List")) {
              if (!isNaN(run.listDepth as number)) depth = run.listDepth as number;
              return true;
            }
            return undefined;
          });
          items = items.map((run) => Object.create(run, { listDepth: { value: depth } }) as Run);
          Reflect.set(formatting, "listDepth", depth);
          // A block of one run gives the run the document holds.
          doc.clearRangeCache();
        }
        items.unshift(
          Formatting.format({ text: { $: TLCode.List.Item } }, formatting, true) as Run,
        );
        return items;
      })
      .all()
      .reduce(concatAll, [])
      .map((run) => Object.create(run, { listMarker: { value: marker } }) as Run);
    let applied = false;
    if (runs.length) {
      if (prefix) runs = (prefix as Run[]).concat(runs);
      if (suffix) runs = runs.concat(suffix);
      applied = this.doc.checkSanity(start, end, runs);
      if (applied) this.doc.range(start, end).setText(runs);
    }
    return applied;
  }

  /** Calls `fn` with the largest nodes that lie inside the range. */
  parts(fn: (node: TLNode) => void, nodes?: TLNode[]): void {
    nodes = nodes || this.doc.children();
    nodes.some((node) => {
      if (node.ordinal + node.length <= this.start) return false;
      if (node.ordinal >= this.end) return true;
      if (node.ordinal >= this.start && node.ordinal + node.length <= this.end) fn(node);
      else this.parts(fn, node.children());
      return undefined;
    });
  }

  clear(): number {
    return this.setText([]);
  }

  /** Replaces the range's text; returns the change in length. */
  setText(text: unknown): number {
    return this.doc.splice(this.start, this.end, text);
  }

  runs(emit: (run: Run) => void): void {
    this.doc.runs(emit, this);
  }

  blocks(emit: (block: BlockRange) => unknown): void {
    this.doc.blocks(emit, this);
  }

  plainText(): string {
    return Per.create<Run>(this.runs, this).map(Formatting.getPlainText).all().join("");
  }

  /**
   * The runs of the range, joined where the formatting is the same. They
   * are fresh plain objects the caller may change: the document keeps the
   * runs of a range until its next change and hands out copies.
   */
  save(): Run[] {
    const key = this.start + "," + this.end;
    let saved = this.doc._savedRanges.get(key);
    if (!saved) {
      saved = Per.create<Run>(this.runs, this).per<Run>(Formatting.consolidate()).all();
      this.doc._savedRanges.set(key, saved);
    }
    return saved.map(copyRun);
  }

  /** Whether every word the range starts in is the eof word. */
  isEOF(): boolean {
    let eof = false;
    for (let ordinal = this.start; ordinal < this.end; ordinal++) {
      const found = this.doc.wordContainingOrdinal(ordinal);
      const word = found && found.word;
      if (word) {
        if (!word.eof) {
          eof = false;
          break;
        }
        eof = true;
      }
    }
    return eof;
  }

  /**
   * The formatting the runs share (multipleValues where they differ). An
   * empty range is first widened to the character before it (and changed
   * in place). Falls back to the formatting of the emptied document, then
   * to the defaults.
   *
   * One run is returned as the document holds it, so writing into it
   * changes the text (the old code did that too; such writers call
   * clearRangeCache). A merge of several runs is a fresh object; the
   * document keeps it until its next change and hands out copies.
   */
  getFormatting(): Run {
    if (this.start === this.end) {
      let position = this.start;
      if (position > 0) position--;
      this.start = position;
      this.end = position + 1;
    }
    const key = this.start + "," + this.end;
    const known = this.doc._rangeFormatting.get(key);
    if (known) return copyRun(known);
    let count = 0;
    let merged = undefined as Run | undefined;
    this.runs((run) => {
      merged = 0 === count++ ? run : Formatting.merge(merged as Run, run);
    });
    if (count > 1) {
      this.doc._rangeFormatting.set(key, merged as Run);
      return copyRun(merged as Run);
    }
    return merged || this.doc.emptyFormatting || Formatting.clone(Formatting.defaultFormatting);
  }

  isList(): boolean {
    return Per.create<BlockRange>(this.blocks, this).some((block) =>
      Per.create<Run>(block.runs, block).some((run) => {
        const name = codeName(run);
        return name && -1 !== name.indexOf("List");
      }),
    );
  }

  /** A list item code run with the formatting (and the list's depth and marker) of the first block. */
  createListItem(): Run[] {
    const block: TLRange = Per.create<BlockRange>(this.blocks, this).first() || this;
    const formatting = block.getFormatting();
    if (isNaN(formatting.listDepth as number) || "string" != typeof formatting.listMarker) {
      block.save().some((run) => {
        const name = codeName(run);
        if (name && 0 === name.indexOf("List")) {
          if (isNaN(formatting.listDepth as number) && !isNaN(run.listDepth as number)) {
            Reflect.set(formatting, "listDepth", run.listDepth);
          }
          if ("string" != typeof formatting.listMarker) {
            Reflect.set(formatting, "listMarker", run.listMarker);
          }
          return true;
        }
        return undefined;
      });
      // A block of one run gives the run the document holds.
      this.doc.clearRangeCache();
    }
    return Formatting.format([{ text: { $: TLCode.List.Item } }], formatting, true) as Run[];
  }

  /**
   * Whether Enter should add a list item: inside a list, unless the caret
   * is in an empty last item.
   */
  canInsertListItem(): boolean {
    if (this.isList()) {
      const blocks = Per.create<BlockRange>(this.blocks, this).all();
      if (blocks.length > 1) return true;
      if (this.start === this.end) {
        const block = blocks.shift() as BlockRange;
        if (block.end === (this.doc.frame as NonNullable<TLDocument["frame"]>).length - 1) {
          if (
            !Per.create<Run>(block.runs, block)
              .filter(TLRange.unlistifyFilter)
              .map(Formatting.getPlainText)
              .all()
              .join("") &&
            block
              .save()
              .some(
                (run) =>
                  "object" == typeof run.text && (run.text as CodeObject).$ === TLCode.List.Close,
              )
          ) {
            return false;
          }
        }
        return true;
      }
    }
    return false;
  }

  /** Whether Tab should change the list depth: inside a list, with the caret at an item's start. */
  canChangeListDepth(): boolean {
    if (this.isList()) {
      const blocks = Per.create<BlockRange>(this.blocks, this).all();
      if (blocks.length > 1) return true;
      if (this.start === this.end) {
        const block = blocks.shift();
        if (block && block.start + 1 === this.start) return true;
      }
    }
    return false;
  }

  /** Moves the list blocks of the range by `delta` levels (0 to 10). */
  _changeListDepth(delta: number): boolean {
    let changed = false;
    this.doc.transaction(() => {
      Per.create<BlockRange>(this.blocks, this)
        .all()
        .forEach((block) => {
          if (block.isList()) {
            let depth = (block.getFormatting().listDepth as number) || 0;
            if (isNaN(depth)) {
              const found = this.doc.wordContainingOrdinal(block.start);
              if (found) depth = found.word.listDepth();
            }
            if (!isNaN(depth)) {
              const newDepth = Math.min(10, Math.max(0, depth + delta));
              if (depth !== newDepth) block.setFormatting("listDepth", newDepth);
            }
            changed = true;
          }
        });
    });
    return changed;
  }

  increaseList(): boolean {
    return this._changeListDepth(1);
  }

  decreaseList(): boolean {
    return this._changeListDepth(-1);
  }

  toggleList(marker?: unknown): boolean {
    return marker ? this.listify(marker) : this.unlistify();
  }

  _setSingleFormatting(key: string, value: unknown): void {
    if (this.start === this.end) {
      this.doc.modifyInsertFormatting(key, value);
    } else {
      const runs = this.save();
      const formatting: Run = {};
      formatting[key] = value;
      Formatting.format(runs, formatting);
      this.setText(runs);
    }
  }

  /**
   * Sets formatting values. Paragraph values (align, spacing, indent,
   * list marker) go to the whole paragraphs; an empty range changes the
   * formatting of the next insert.
   */
  setFormatting(keys: string | string[], values: unknown): void {
    let runs: Run[] | undefined;
    let formatting: Run | undefined;
    if (!(keys instanceof Array)) {
      keys = [keys];
      values = [values];
    }
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i] as string;
      const value = (values as unknown[])[i];
      if (
        "align" === key ||
        "lineSpacing" === key ||
        "paragraphSpacing" === key ||
        "paragraphIndent" === key ||
        "listMarker" === key
      ) {
        this.doc.paragraphRange(this.start, this.end)._setSingleFormatting(key, value);
      } else if (this.start === this.end) {
        this.doc.modifyInsertFormatting(key, value);
      } else {
        if (!runs) {
          runs = this.save();
          formatting = {};
        }
        (formatting as Run)[key] = value;
      }
    }
    if (runs) {
      Formatting.format(runs, formatting as Run);
      this.setText(runs);
    }
  }
}
