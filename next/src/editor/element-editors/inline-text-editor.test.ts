import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Key } from "../../engine/core/key.ts";
import { KeyEvent } from "../../engine/core/key-event.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Point } from "../../engine/math/point.ts";
import { installFakeCanvas } from "../../engine/paint/testing/fake-canvas.ts";
import type { TLCore } from "../../engine/text/gtl/tl-core.ts";
import { RunDraw } from "../../engine/text/gtl/run-draw.ts";
import { Cursor } from "../cursor.ts";
import type { InlineTextEditor } from "./inline-text-editor.ts";
import { type DomKeyEvent } from "./inline-text-editor.ts";
import { FakeView, textSetup, type TextSetup } from "./text-editor.testing.ts";
import recorded from "./inline-text-editor.fixture.json";
import fixed from "./inline-text-editor.fixed.json";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());
const open: InlineTextEditor[] = [];
afterEach(() => {
  Platform.modifiers.shiftKey = false;
  Platform.modifiers.metaKey = false;
  // Stops the caret timers.
  for (const inline of open.splice(0)) if (inline.isActivated()) inline.deactivate();
});

interface InlineSetup extends TextSetup {
  inline: InlineTextEditor;
  view: FakeView;
  core: TLCore;
}

let stamp = 1000;

/** A text in inline edit mode. */
function inlineSetup(content: string, variants?: { style: string; weight: number }[]): InlineSetup {
  const setup = textSetup(content, variants);
  const view = new FakeView(setup.scene);
  setup.editor.beginInlineEdit(view.asWidget());
  const inline = setup.editor._inlineEditor as InlineTextEditor;
  open.push(inline);
  return { ...setup, inline, view, core: setup.text.getTLCore() as TLCore };
}

/** A view key down with a fresh timestamp. */
function keyDown(inline: InlineTextEditor, key: unknown, timestamp = ++stamp): unknown {
  const event = new KeyEvent.Down();
  event.key = key as string;
  event.timestamp = timestamp;
  event.preventDefault = () => {};
  event.stopPropagation = () => {};
  const result = inline._keyDown(event);
  inline._keyUp();
  return result;
}

function type(inline: InlineTextEditor, text: string): void {
  for (const ch of text) {
    inline._keyPress({ keyUTF: ch, preventDefault: () => {}, stopPropagation: () => {} });
  }
}

const selection = (core: TLCore) => {
  const s = core.getSelection() as { start: number; end: number };
  return [s.start, s.end];
};

describe("GInlineTextEditor", () => {
  it("selects the whole text on the first activation and shows the text cursor", () => {
    const { inline, core, view } = inlineSetup("Hello world");
    expect(inline.isActivated()).toBe(true);
    expect(selection(core)).toEqual([0, 11]);
    expect(view.cursor).toBe(Cursor.Text);
    expect(core.isInlineEdit()).toBe(true);
    // Mouse and key listeners on the view, key press too without an input box.
    const types = view.listeners.map(([t]) => t);
    expect(types).toEqual([
      MouseEvent.Move,
      MouseEvent.Down,
      MouseEvent.Release,
      MouseEvent.DblClick,
      KeyEvent.Down,
      KeyEvent.Release,
      KeyEvent.Press,
    ]);
    inline.deactivate();
    expect(view.listeners).toEqual([]);
    expect(view.cursor).toBe(null);
    expect(core.isInlineEdit()).toBe(false);
  });

  it("types over the selection and writes the content back", () => {
    const { inline, text } = inlineSetup("Hello world");
    type(inline, "New");
    expect(text.getPlainText()).toBe("New");
    expect(JSON.parse(text.getProperty("content") as string)[0].text).toBe("New");
  });

  it("moves the caret by character, word, line end and document end", () => {
    const { inline, core } = inlineSetup("First line here\nSecond paragraph text");
    keyDown(inline, Key.Constant.LEFT);
    expect(selection(core)).toEqual([0, 0]);
    keyDown(inline, Key.Constant.RIGHT);
    keyDown(inline, Key.Constant.RIGHT);
    expect(selection(core)).toEqual([2, 2]);
    Platform.modifiers.metaKey = true;
    keyDown(inline, Key.Constant.RIGHT);
    expect(selection(core)).toEqual([6, 6]);
    keyDown(inline, Key.Constant.LEFT);
    expect(selection(core)).toEqual([0, 0]);
    Platform.modifiers.metaKey = false;
    keyDown(inline, Key.Constant.END);
    expect(selection(core)).toEqual([15, 15]);
    keyDown(inline, Key.Constant.HOME);
    expect(selection(core)).toEqual([0, 0]);
    keyDown(inline, Key.Constant.DOWN);
    expect(selection(core)[0]).toBeGreaterThan(15);
    keyDown(inline, Key.Constant.UP);
    expect(selection(core)).toEqual([0, 0]);
    keyDown(inline, Key.Constant.PAGE_DOWN);
    expect(selection(core)).toEqual([core.getLength() - 1, core.getLength() - 1]);
    keyDown(inline, Key.Constant.PAGE_UP);
    expect(selection(core)).toEqual([0, 0]);
  });

  it("extends the selection with Shift from the side it started on", () => {
    const { inline, core } = inlineSetup("First line here");
    keyDown(inline, Key.Constant.HOME);
    Platform.modifiers.shiftKey = true;
    keyDown(inline, Key.Constant.RIGHT);
    keyDown(inline, Key.Constant.RIGHT);
    expect(selection(core)).toEqual([0, 2]);
    keyDown(inline, Key.Constant.END);
    expect(selection(core)).toEqual([0, 15]);
    keyDown(inline, Key.Constant.LEFT);
    expect(selection(core)).toEqual([0, 14]);
    // Left past the anchor flips the moving side.
    Platform.modifiers.shiftKey = false;
    keyDown(inline, Key.Constant.RIGHT);
    expect(selection(core)).toEqual([14, 14]);
  });

  it("swaps the moving side when a Shift move jumps past the anchor", () => {
    // Recorded from the old app: [2, 3], then [0, 2], then [1, 2].
    const { inline, core } = inlineSetup("First line here");
    keyDown(inline, Key.Constant.HOME);
    keyDown(inline, Key.Constant.RIGHT);
    keyDown(inline, Key.Constant.RIGHT);
    Platform.modifiers.shiftKey = true;
    keyDown(inline, Key.Constant.RIGHT);
    expect(selection(core)).toEqual([2, 3]);
    Platform.modifiers.metaKey = true;
    keyDown(inline, Key.Constant.LEFT);
    Platform.modifiers.metaKey = false;
    expect(selection(core)).toEqual([0, 2]);
    keyDown(inline, Key.Constant.RIGHT);
    expect(selection(core)).toEqual([1, 2]);
  });

  it("deletes with Backspace and Delete", () => {
    const { inline, text } = inlineSetup("Hello world");
    keyDown(inline, Key.Constant.END);
    keyDown(inline, Key.Constant.BACKSPACE);
    keyDown(inline, Key.Constant.BACKSPACE);
    keyDown(inline, Key.Constant.HOME);
    keyDown(inline, Key.Constant.DELETE);
    expect(text.getPlainText()).toBe("ello wor");
  });

  it("fills in the lorem ipsum text on Space after 'lorem'", () => {
    const { inline, text } = inlineSetup("Hello world");
    type(inline, "lorem");
    keyDown(inline, Key.Constant.SPACE);
    expect((text.getPlainText() as string).startsWith("Lorem ipsum dolor sit amet")).toBe(true);
    const other = inlineSetup("Hello world");
    keyDown(other.inline, Key.Constant.END);
    type(other.inline, " lorem");
    keyDown(other.inline, Key.Constant.SPACE);
    expect(other.text.getPlainText()).toBe("Hello world lorem ");
  });

  it("inserts a newline, a line separator with Shift and three spaces for Tab", () => {
    const { inline, text } = inlineSetup("Hi");
    keyDown(inline, Key.Constant.END);
    keyDown(inline, Key.Constant.ENTER);
    type(inline, "a");
    // _shiftKeyDown is set by a key down with Shift and cleared on key up.
    Platform.modifiers.shiftKey = true;
    const event = new KeyEvent.Down();
    event.key = Key.Constant.ENTER;
    event.timestamp = ++stamp;
    event.preventDefault = () => {};
    event.stopPropagation = () => {};
    inline._keyDown(event);
    inline._keyUp();
    Platform.modifiers.shiftKey = false;
    keyDown(inline, Key.Constant.TAB);
    expect(text.getPlainText()).toBe("Hi\na" + RunDraw.LS + "   ");
  });

  it("selects all with Ctrl+A on the view path (metaKey) and the DOM path (ctrlKey)", () => {
    const { inline, core } = inlineSetup("Hello world");
    keyDown(inline, Key.Constant.END);
    Platform.modifiers.metaKey = true;
    keyDown(inline, "A");
    expect(selection(core)).toEqual([0, 11]);
    Platform.modifiers.metaKey = false;
    keyDown(inline, Key.Constant.END);
    const dom = (ctrlKey: boolean, altKey: boolean): DomKeyEvent => ({
      type: "keydown",
      timeStamp: ++stamp,
      code: "KeyA",
      keyCode: 65,
      shiftKey: false,
      ctrlKey,
      altKey,
      preventDefault: () => {},
      stopPropagation: () => {},
    });
    // Ctrl+Alt is AltGr, not Ctrl.
    inline.handleDomKeyDown(dom(true, true));
    expect(selection(core)).toEqual([11, 11]);
    expect(inline.handleDomKeyDown(dom(true, false))).toBe(true);
    expect(selection(core)).toEqual([0, 11]);
  });

  it("ignores a key event with the same timestamp as the last one", () => {
    const { inline, core } = inlineSetup("Hello world");
    keyDown(inline, Key.Constant.HOME, 5);
    keyDown(inline, Key.Constant.RIGHT, 6);
    keyDown(inline, Key.Constant.RIGHT, 6);
    expect(selection(core)).toEqual([1, 1]);
  });

  it("undoes and redoes through the editor with Ctrl+Z / Ctrl+Y", () => {
    const { inline, host } = inlineSetup("Hello");
    host.undo = true;
    host.redo = true;
    Platform.modifiers.metaKey = true;
    keyDown(inline, "Z");
    keyDown(inline, "Y");
    expect(host.calls.filter((c) => c[0] === "undo" || c[0] === "redo")).toEqual([
      ["undo"],
      ["redo"],
    ]);
  });

  it("swaps Left and Right in right-to-left text", () => {
    const { inline, core, text } = inlineSetup("abc");
    text.setProperty("dir", 1);
    keyDown(inline, Key.Constant.HOME);
    const at = selection(core)[0] as number;
    keyDown(inline, Key.Constant.LEFT);
    expect(selection(core)[0]).toBe(at + 1);
  });

  it("toggles underline on the selection with Ctrl+U", () => {
    const { inline, core } = inlineSetup("Hello");
    Platform.modifiers.metaKey = true;
    keyDown(inline, "U");
    expect((core.getDocumentRange().getFormatting() as { underline?: unknown }).underline).toBe(
      true,
    );
    keyDown(inline, "U");
    expect((core.getDocumentRange().getFormatting() as { underline?: unknown }).underline).toBe(
      false,
    );
  });

  it("lets printable keys through to the key press, mapping punctuation with Shift", () => {
    const { inline } = inlineSetup("Hello");
    expect(inline._canHandleInput("a", false, false)).toBe(1);
    expect(inline._canHandleInput("1", true, false)).toBe(1);
    expect(inline._canHandleInput("a", false, true)).toBe(false);
    expect(inline._canHandleInput(Key.Constant.LEFT, false, false)).toBe(false);
  });

  it("restores the last selection on the next activation", () => {
    const { inline, core, view } = inlineSetup("Hello world");
    keyDown(inline, Key.Constant.HOME);
    keyDown(inline, Key.Constant.RIGHT);
    inline.deactivate();
    expect(selection(core)).toEqual([0, 0]);
    inline.activate(view.asWidget());
    expect(selection(core)).toEqual([1, 1]);
  });

  describe("replays key sequences recorded from the old app", () => {
    type Op = (string | number | boolean)[];
    interface Step {
      op: Op;
      [field: string]: unknown;
    }
    const pressEvent = () => ({ preventDefault: () => {}, stopPropagation: () => {} });
    const keyOf = (name: string): unknown =>
      (Key.Constant as Record<string, unknown>)[name] ?? name;

    /** Runs one recorded op; the same switch as the recording script. */
    function run(setup: InlineSetup, op: Op): unknown {
      const { inline, core, editor, view } = setup;
      const [name, a, b, c] = op;
      switch (name) {
        case "select":
          return core.select(a as number, b as number);
        case "compStart":
          return inline._compStart();
        case "compEnd":
          return inline._compEnd();
        case "input":
          return inline._keyPress({ ...pressEvent(), target: { value: a as string } }, true);
        case "press":
          return inline._keyPress({ ...pressEvent(), keyUTF: a as string });
        case "key":
          return inline._handleKey(keyOf(a as string) as never, !!b, !!c);
        case "list":
          return (
            core.getRange(a as number, b as number) as NonNullable<ReturnType<TLCore["getRange"]>>
          ).toggleList(c as string);
        case "hit":
          return inline.isSelectionHit(new Point(a as number, b as number));
        case "deactivate":
          return inline.deactivate();
        case "activate":
          return editor.beginInlineEdit(view.asWidget());
      }
      throw new Error(`unknown op ${String(name)}`);
    }

    /** The fields the recording took after each op. */
    function state(setup: InlineSetup, expected: Step): Record<string, unknown> {
      const { inline, core, editor, host } = setup;
      const s = core.getSelection() as { start: number; end: number };
      const plain = core.getDocumentRange().plainText();
      const out: Record<string, unknown> = {
        ...("plainUnits" in expected
          ? { plainUnits: Array.from({ length: plain.length }, (_, i) => plain.charCodeAt(i)) }
          : { plain }),
        sel: [s.start, s.end],
        focus: inline._focusChar,
        delta: inline._compositionSelectionDelta,
        last: inline._lastCompositedTextLength,
        comp: inline._compositionOn,
        tx: host.calls
          .splice(0)
          .filter((call) => call[0] === "begin" || call[0] === "commit")
          .map((call) => (call[0] === "commit" ? ["commit", String(call[1])] : ["begin"])),
      };
      if ("runs" in expected) {
        out.runs = (
          core.getRichContent() as unknown as {
            text: unknown;
            listMarker: unknown;
            listDepth: unknown;
          }[]
        ).map((run) => [run.text, run.listMarker, run.listDepth]);
      }
      if ("tfs" in expected) {
        out.tfs = editor.getProperty("_tfs");
        out.tfw = editor.getProperty("_tfw");
      }
      return out;
    }

    for (const recordedCase of recorded.cases as {
      name: string;
      content: string;
      variants?: { style: string; weight: number }[];
      steps: Step[];
    }[]) {
      // A recorded case whose old behaviour is a fixed bug is compared with
      // the steps in inline-text-editor.fixed.json instead.
      const fixedCase = (fixed.cases as { name: string; bug: string; steps: Step[] }[]).find(
        (c) => c.name === recordedCase.name,
      );
      const title = fixedCase ? `${fixedCase.bug}: ${recordedCase.name}` : recordedCase.name;
      it(title, () => {
        const setup = inlineSetup(recordedCase.content, recordedCase.variants);
        setup.host.calls.splice(0);
        for (const step of fixedCase ? fixedCase.steps : recordedCase.steps) {
          const result = run(setup, step.op);
          const { op, result: expectedResult, ...expected } = step;
          expect({
            op,
            result: result === undefined ? "<undefined>" : result,
            ...state(setup, step),
          }).toEqual({
            op,
            result: expectedResult,
            ...expected,
          });
        }
      });
    }
  });
});
