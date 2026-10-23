// Old: chunk.vendor.js module 920 (GTLCodes: inline nodes, list codes and the list edit filter).
import type { Rect } from "../../math/rect.ts";
import { CodeNode } from "./code-node.ts";
import type { CodeObject, Run } from "./formatting.ts";
import { Frame } from "./frame.ts";
import type { CodeMeasurement, CodeResolver, TextCode } from "./inline.ts";
import type { BlockConsumer } from "./line-buffer.ts";
import { Line } from "./line.ts";
import {
  BulletCode,
  CheckCode,
  NumberCode,
  RomanBracketCode,
  RomanDotCode,
  SquareCode,
} from "./list-markers.ts";
import { TLNode } from "./node.ts";
import { PathNumberCode, type MarkerData } from "./path-number.ts";
import { TLRect } from "./rect.ts";
import type { RunDrawContext } from "./run-draw.ts";
import { StringCode } from "./string-part.ts";
import { TLCode } from "./tl-code.ts";
import { TLUtil } from "./tl-util.ts";
import { VertexSourceCode } from "./vertex-source-part.ts";
import type { Word } from "./word.ts";

/** An inline thing a node draws: a list marker code. */
interface Inline {
  measure?(formatting: Run): CodeMeasurement | null;
  draw?(
    context: RunDrawContext,
    x: number,
    y: number,
    width: number,
    ascent: number,
    descent: number,
    run: Run,
  ): void;
  _bbox?: Rect | null;
  obj?: unknown;
}

/** What the list edit filter needs from the document. */
export interface EditFilterTarget {
  words: Word[];
  spliceWordsWithRuns(index: number, count: number, runs: Run[]): void;
}

/** A placed inline: the list marker of an item. */
export class InlineNode extends TLNode {
  inline: Inline | null = null;
  _parent: TLNode | null = null;
  _spacing = 0;
  formatting: Run | null = null;
  measured: CodeMeasurement | null = null;
  declare left: number;
  declare baseline: number;
  declare _bounds?: TLRect;

  constructor(
    inline: Inline | null,
    parent: TLNode,
    ordinal: number,
    length: number,
    formatting: Run,
    spacing?: number,
  ) {
    super();
    // The old prototype had null for both; they stay null when there's no inline.
    this.ordinal = null as unknown as number;
    this.length = null as unknown as number;
    if (inline && inline.draw && inline.measure) {
      this.inline = inline;
      this._parent = parent;
      this.ordinal = ordinal;
      this.length = length;
      this.formatting = formatting;
      this.measured = inline.measure(formatting);
      this._spacing = spacing || 0;
    } else {
      console.warn("There is a bug somewhere, inline should not be null");
    }
  }

  override parent(): TLNode | null {
    return this._parent;
  }

  override draw(context: unknown): void {
    const measured = this.measured as CodeMeasurement;
    (this.inline as Required<Pick<Inline, "draw">>).draw(
      context as RunDrawContext,
      this.left,
      this.baseline,
      measured.width,
      measured.ascent,
      measured.descent,
      this.formatting as Run,
    );
  }

  position(left: number, baseline: number, bounds?: TLRect): void {
    this.left = left;
    this.baseline = baseline;
    if (bounds) this._bounds = bounds;
  }

  /**
   * With `actual`, the shape's box or the measured ink extents (which can
   * be NaN for codes that don't report them: only real NaN values fall
   * through); else the given bounds or the marker box plus the spacing.
   */
  override bounds(actual?: boolean): TLRect {
    const measured = this.measured as CodeMeasurement;
    if (actual && this.inline) {
      if (this.inline._bbox) {
        return new TLRect(
          this.left,
          this.baseline + this.inline._bbox.getY(),
          measured.width,
          this.inline._bbox.getHeight(),
        );
      }
      if (!(
        Number.isNaN(measured.minX) ||
        Number.isNaN(measured.maxX) ||
        Number.isNaN(measured.minY) ||
        Number.isNaN(measured.maxY)
      )) {
        return new TLRect(
          this.left + (measured.minX as number),
          this.baseline + (measured.minY as number),
          (measured.maxX as number) - (measured.minX as number),
          (measured.maxY as number) - (measured.minY as number),
        );
      }
    }
    return (
      this._bounds ||
      new TLRect(
        this.left,
        this.baseline - measured.ascent,
        measured.width + this._spacing,
        measured.ascent + measured.descent,
      )
    );
  }

  override byCoordinate(x: number): TLNode | null {
    return x <= this.bounds().center().x ? this : this.next();
  }
}

InlineNode.prototype.type = "inline";

const EMPTY_MEASURE = (): CodeMeasurement & { maxY: number; maxX: number; height: number } => ({
  width: 0,
  ascent: 0,
  descent: 0,
  maxY: 0,
  maxX: 0,
  height: 0,
});

/** The code that ends a list. It takes over the code object's keys. */
export class ListEndCode implements TextCode {
  declare $: string;
  declare eof: boolean;

  constructor(obj: CodeObject) {
    Object.keys(obj).forEach((key) => {
      (this as unknown as Record<string, unknown>)[key] = obj[key];
    });
  }

  measure(): CodeMeasurement {
    return EMPTY_MEASURE();
  }

  draw(): void {}
}

ListEndCode.prototype.eof = true;

/** The code between two list items. */
export class ListNextCode extends ListEndCode {}

/**
 * The code that starts a list. Its block lays out the following words as
 * list items until the ListEnd word: each item is a frame indented by
 * 25/20 of the font size per depth level, preceded by its marker and a
 * gap of 10/20 of the font size.
 */
export class ListStartCode implements TextCode {
  declare $: string;
  obj: CodeObject | null = null;
  data: unknown = null;
  allCodes: CodeResolver | null = null;

  constructor(obj: CodeObject, data: unknown, allCodes: CodeResolver) {
    this.obj = obj;
    this.data = data;
    this.allCodes = allCodes;
    Object.keys(obj).forEach((key) => {
      (this as unknown as Record<string, unknown>)[key] = obj[key];
    });
  }

  block(
    left: number,
    top: number,
    width: number,
    ordinal: number,
    parent: TLNode,
    formatting: Run,
    noWrap: boolean | undefined,
  ): BlockConsumer {
    let item: CodeNode;
    let frame: Frame | null;
    let marker: InlineNode | null;
    /** The marker object of the first item; items without a marker of their own use it. */
    let firstMarker: unknown;
    /** The uuids of the items that the current depth levels hang off. */
    const parents: string[] = [];
    /** The item tree: uuid → children uuids and parent uuid. */
    const tree: Record<string, { uuid: string; parent?: string; children: string[] }> = {};
    const list = new CodeNode("list", parent, left, top);
    let indent = 0;
    let gap = 10;
    let depth = isNaN(formatting.listDepth as number) ? 0 : (formatting.listDepth as number);

    const startItem = (itemFormatting: Run) => {
      const fontSize =
        "number" != typeof itemFormatting.fontSize || isNaN(itemFormatting.fontSize)
          ? 20
          : itemFormatting.fontSize;
      indent = ((25 * fontSize) / 20) * (depth + 1);
      gap = (10 * fontSize) / 20;
      item = new CodeNode("item", list, void 0, void 0, depth);
      const parentId = parents[parents.length - 1] || list.uuid;
      let entry: (typeof tree)[string] | undefined = tree[parentId] || {
        children: [],
        uuid: parentId,
      };
      entry.children.push(item.uuid);
      tree[parentId] = entry;
      tree[item.uuid] = { uuid: item.uuid, parent: parentId, children: [] };
      const path: number[] = [];
      for (let child = tree[item.uuid] as (typeof tree)[string]; entry;) {
        path.unshift(entry.children.indexOf(child.uuid));
        child = entry;
        entry = tree[entry.parent || ""];
      }
      const allCodes = this.allCodes as CodeResolver;
      const data: MarkerData = { node: item, pathNumber: path };
      const code = (allCodes(
        (itemFormatting.listMarker ? { $: itemFormatting.listMarker } : null) ||
          firstMarker || { $: "Number" },
        data,
      ) || allCodes({ $: "Number" }, { node: item, pathNumber: path })) as unknown as Inline;
      if (!firstMarker) firstMarker = code.obj;
      marker = new InlineNode(code, item, ordinal, 1, itemFormatting, gap);
      marker.block = true;
      frame = new Frame(
        left + indent + gap + (marker.measured as CodeMeasurement).width,
        top,
        width,
        ordinal + 1,
        item,
        (terminator) => terminator.$ === TLCode.List.Close,
        (marker.measured as CodeMeasurement).ascent,
        void 0,
        noWrap,
      );
    };

    startItem(formatting);
    return (word: Word) => {
      if (frame) {
        frame.frame((done) => {
          ordinal = done.ordinal + done.length;
          const current = marker as InlineNode;
          const measured = current.measured as CodeMeasurement;
          const bounds = done.bounds();
          const firstLine = done.first();
          const hasLines = firstLine && bounds && !bounds.isEmpty();
          let markerLeft: number;
          let baseline = top + measured.ascent;
          let height = measured.ascent + measured.descent;
          if (hasLines) {
            baseline = (firstLine as unknown as { baseline?: number }).baseline || 0;
            height = Math.max(done.height as number, height);
            markerLeft = (firstLine as TLNode).bounds(false, true).l;
          } else {
            // An empty item: measure a line with just this word, as wide as the text column.
            // The line gets noWrap as its wrapping flag, as before.
            const lineLeft = left + indent + gap + measured.width;
            const lineBounds = new Line(
              null,
              lineLeft,
              width,
              baseline,
              measured.ascent,
              measured.descent,
              [word],
              ordinal,
              noWrap,
            ).bounds(false, true);
            const lineSpacing = word.lineSpacing();
            height =
              "number" == typeof lineSpacing ? lineBounds.h * lineSpacing : parseFloat(lineSpacing);
            markerLeft = lineBounds.l;
          }
          const paragraphSpacing = word.paragraphSpacing();
          top +=
            "number" == typeof paragraphSpacing
              ? height * paragraphSpacing
              : Math.max(parseFloat(paragraphSpacing), 0);
          const markerX = markerLeft - gap - measured.width;
          current.position(markerX, baseline);
          top += height;
          item.children().push(current);
          if (hasLines) item.children().push(done);
          item.finalize(null, null, indent + gap + measured.width);
          list.children().push(item);
          frame = marker = null;
        }, word);
      } else {
        ordinal++;
      }
      if (!frame) {
        const code = word.code();
        if (code) {
          if (code.$ == TLCode.List.Close) {
            list.finalize();
            return list;
          }
          if (code.$ == TLCode.List.Item) {
            const previousDepth = depth;
            if (previousDepth != (depth = word.listDepth())) {
              if (depth > previousDepth) parents.push(item.uuid);
              else for (; parents.length > depth;) parents.pop();
            }
            startItem(word.codeFormatting() as Run);
          }
        }
      }
      return undefined;
    };
  }

  measure(): CodeMeasurement {
    return EMPTY_MEASURE();
  }
}

/**
 * Repairs list codes after an edit: a list item outside a list becomes a
 * list start, a list end outside a list is removed, and open lists are
 * closed at the end (before the eof word).
 */
function editFilter(doc: EditFilterTarget): void {
  let open = 0;
  const openFormatting: (Run | false)[] = [];
  if (
    !doc.words.some((word, index) => {
      const code = word.code();
      if (code) {
        switch (code.$) {
          case TLCode.List.Open:
            open++;
            openFormatting.push(word.codeFormatting());
            break;
          case TLCode.List.Item:
            if (0 === open) {
              doc.spliceWordsWithRuns(index, 1, [
                TLUtil.derive(word.codeFormatting() as Run, { text: { $: TLCode.List.Open } }),
              ]);
              return true;
            }
            break;
          case TLCode.List.Close:
            if (0 === open) doc.spliceWordsWithRuns(index, 1, []);
            openFormatting.pop();
            open--;
        }
      }
      return undefined;
    }) &&
    open > 0
  ) {
    const closing: Run[] = [];
    while (open > 0) {
      open--;
      closing.push(TLUtil.derive(openFormatting.shift() || {}, { text: { $: TLCode.List.Close } }));
    }
    doc.spliceWordsWithRuns(doc.words.length - 1, 0, closing);
  }
}

/**
 * Stands in for the old GTLCodes namespace, which was a function: names
 * that weren't codes could still be found on it (its own `name`, `length`
 * and `prototype`) or on Function.prototype and Object.prototype.
 */
function OldCodesNamespace(): void {}

/**
 * What the old lookup `GTLCodes[name]` found for a name that isn't a code,
 * and what `new` on it did. Every truthy value threw: plain methods and
 * other values aren't constructors (TypeError), and `new Function(...)`
 * with the code object as a parameter name is a SyntaxError. `caller` and
 * `arguments` read as null on the old (sloppy) function. Only a malformed
 * file has such a code name (QUESTIONS: "GTL code names found on the old
 * GTLCodes function").
 */
function failForFunctionProperty(name: string): void {
  if ("caller" === name || "arguments" === name) return;
  if (!(OldCodesNamespace as unknown as Record<string, unknown>)[name]) return;
  if ("constructor" === name) throw new SyntaxError("Unexpected identifier 'Object'");
  throw new TypeError(name + " is not a constructor");
}

/**
 * Makes the code instance for a code object by its `$` name, or null.
 * The names are the keys of TLCodes, as the old code looked them up on
 * its namespace.
 */
function codeFactory(obj: CodeObject, data: unknown, allCodes: CodeResolver): TextCode | null {
  const name = (obj as { $?: unknown }).$ as string;
  if (!Object.prototype.hasOwnProperty.call(TLCodes, name)) {
    failForFunctionProperty(name);
    return null;
  }
  const cls = (TLCodes as unknown as Record<string, unknown>)[name];
  return cls
    ? (Reflect.construct(cls as new (...args: unknown[]) => TextCode, [
        obj,
        data,
        allCodes,
      ]) as TextCode)
    : null;
}

/** The GTL codes under their old names (GTLCodes.ListStart, GTLCodes.Bullet, ...). */
export const TLCodes = {
  codeFactory,
  InlineNode,
  ListEnd: ListEndCode,
  ListNext: ListNextCode,
  ListStart: ListStartCode,
  editFilter,
  String: StringCode,
  PathNumber: PathNumberCode,
  VertexSource: VertexSourceCode,
  Bullet: BulletCode,
  Check: CheckCode,
  Square: SquareCode,
  Number: NumberCode,
  RomanDot: RomanDotCode,
  RomanBracket: RomanBracketCode,
};
