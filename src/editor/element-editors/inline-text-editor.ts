// Old: chunk.vendor.js module 752 (GInlineTextEditor).
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Key, type KeyValue } from "../../engine/core/key.ts";
import { KeyEvent } from "../../engine/core/key-event.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { GObject, registerClass } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { extend } from "../../engine/core/util.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Font } from "../../engine/text/fonts/font.ts";

import type { Selection } from "../../engine/text/gtl/document.ts";
import type { TLNode } from "../../engine/text/gtl/node.ts";
import type { TLBox } from "../../engine/text/gtl/tl-core.ts";
import type { TLCore } from "../../engine/text/gtl/tl-core.ts";
import type { TLRange } from "../../engine/text/gtl/range.ts";
import { RunDraw } from "../../engine/text/gtl/run-draw.ts";
import { TLDirectionTextTransformer } from "../../engine/text/tl-direction-text-transformer.ts";
import { TLPathTextTransformer } from "../../engine/text/tl-path-text-transformer.ts";
import { Cursor } from "../cursor.ts";
import { Editor } from "../editor.ts";
import { EditorOptions } from "../editor-options.ts";
import type { EditorWidget } from "../view/editor-widget.ts";
import type { TextEditor } from "./text-editor.ts";

/**
 * GFont.Weight has no Normal, so the old check against it compared with
 * undefined and never held; see "Bold toggle checks a weight that doesn't
 * exist" in QUESTIONS.md.
 */
const WEIGHT_NORMAL = (Font.Weight as Record<string, number | undefined>).Normal;

/**
 * What _canHandleInput returns: truthy when the key types a character. As
 * in the old code it is the character count (or an empty string, null or
 * false) rather than a boolean.
 */
type InputCheck = boolean | number | string | null | undefined;

/** The editor widget the inline editor works in. */
export type InlineEditView = EditorWidget;

/** A DOM `input` event of the view's input box. */
export interface InputBoxEvent {
  type: string;
  target: { value: string };
  preventDefault(): void;
  stopPropagation(): void;
}

/** The DOM key event handleDomKeyDown reads. */
export interface DomKeyEvent {
  type: string;
  timeStamp?: number;
  code?: string;
  which?: number;
  keyCode?: number;
  location?: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  keyIdentifier?: unknown;
  preventDefault(): void;
  stopPropagation(): void;
}

/** A view key event or an input box event, as _keyPress sees them. */
interface KeyPressSource {
  keyUTF?: string | null;
  target?: { value: string };
  preventDefault: (() => void) | null;
  stopPropagation: (() => void) | null;
}

/** The caret as a box in text space plus the path or direction mapping. */
export interface CaretBox {
  box: Rect;
  transform: Transform | null;
}

/** A word node found by ordinal, as TLCore.wordContainingOrdinal gives it. */
interface WordAtOrdinal {
  word: { isStartOfList(): boolean; length: number };
  ordinal: number;
  index: number;
}

/** A character node's parent, as selectWordAtPosition reads it. */
interface WordNode {
  ordinal: number;
  length: number;
  word?: { text: { length: number } };
}

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit,sed do eiusmod tempor incididunt ut labore et dolore magnaaliqua. Ut enim ad minim veniam, quis nostrud exercitationullamco laboris nisi ut aliquip ex ea commodo consequat.Duis aute irure dolor in reprehenderit in voluptate velitesse cillum dolore eu fugiat nulla pariatur. Excepteur sintoccaecat cupidatat non proident, sunt in culpa qui officiadeserunt mollit anim id est laborum.";

/** Key codes of the digit and punctuation keys _canHandleInput maps. */
const PUNCTUATION_KEY_CODES = [
  48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 186, 187, 188, 189, 190, 191, 192, 219, 220, 221, 222,
  224, 251, 252, 253, 254,
];

/**
 * Edits a text in place while the text editor is in inline edit mode:
 * listens to the view's mouse and key events, moves the caret and the
 * selection in the text's layout core and types into it.
 *
 * Ctrl/Cmd is the platform `metaKey` modifier on the view event path
 * (_keyDown) and `ctrlKey && !altKey` on the DOM path (handleDomKeyDown).
 */
export class InlineTextEditor extends GObject {
  static {
    registerClass(this, "GInlineTextEditor");
  }

  /** The internal rich clipboard for Ctrl+C/X/V; off, the app's clipboard is used. */
  static HANDLECOPYPASTE = false;
  // eslint-disable-next-line no-control-regex -- control characters are what it matches
  static IS_NON_PRINTABLE_REG = /^[\u0000-\u001f\u0080-\u009f\u2029]*$/;

  declare _editor: TextEditor;
  declare _view: InlineEditView | null;
  declare _textUnderMouse: boolean;
  declare _activated: boolean;
  /** 0, or -1 / 1 when Shift+keys extend the selection at its start / end. */
  declare _keyboardSelect: number;
  /** The x a vertical caret move keeps. */
  declare _keyboardX: number | null;
  declare _nextKeyboardX: number | null;
  declare _selectDragStart: number | null;
  declare _focusChar: number | null;
  declare _richClipboard: unknown;
  declare _plainClipboard: string | null;
  declare _toggles: Record<string, string>;
  declare _caretInterval: ReturnType<typeof setInterval> | 0;
  declare _lastSelect: Selection | undefined;
  declare _lastTimeStamp: number;
  declare _lastResult: boolean;
  declare _keyDownHandled: KeyValue | null | undefined;
  declare _compositionOn: boolean;
  declare _lastCompositedTextLength: number;
  declare _compositionSelectionDelta: number;
  /** Not on the old prototype: undefined until the first key. */
  declare _shiftKeyDown: boolean | undefined;

  constructor(editor: TextEditor) {
    super();
    this._toggles = {
      B: "fontWeight",
      I: "fontStyle",
      U: "underline",
      D: "strikeout",
    };
    this._editor = editor;
  }

  isActivated(): boolean {
    return this._activated;
  }

  activate(view: InlineEditView): void {
    const core = this._core();
    if (core) core.setInlineEdit(true);
    this._activated = true;
    this._view = view;
    this._textUnderMouse = true;
    this.showCaretAndSelection();
    this._view.setCursor(Cursor.Text);
    view.addEventListener(MouseEvent.Move, this._mouseMove, this);
    view.addEventListener(MouseEvent.Down, this._mouseDown, this);
    view.addEventListener(MouseEvent.Release, this._mouseRelease, this);
    view.addEventListener(MouseEvent.DblClick, this._mouseDblClick, this);
    view.addEventListener(KeyEvent.Down, this._keyDown, this);
    view.addEventListener(KeyEvent.Release, this._keyUp, this);
    this._view.startCaptureInput(
      this._boxInput.bind(this),
      this._compStart.bind(this),
      this._compEnd.bind(this),
    );
    if (!this._view.isCapturingInput()) view.addEventListener(KeyEvent.Press, this._keyPress, this);
  }

  deactivate(): void {
    const core = this._core();
    if (core) core.setInlineEdit(false);
    this.hideCaretAndSelection();
    const view = this._view as InlineEditView;
    view.setCursor(null);
    this._activated = false;
    if (view.isCapturingInput()) view.endCaptureInput();
    else view.removeEventListener(KeyEvent.Press, this._keyPress, this);
    view.removeEventListener(MouseEvent.Move, this._mouseMove, this);
    view.removeEventListener(MouseEvent.Down, this._mouseDown, this);
    view.removeEventListener(MouseEvent.Release, this._mouseRelease, this);
    view.removeEventListener(MouseEvent.DblClick, this._mouseDblClick, this);
    view.removeEventListener(KeyEvent.Down, this._keyDown, this);
    view.removeEventListener(KeyEvent.Release, this._keyUp, this);
    this._view = null;
    // A composition still open ends with the session: its compositionend
    // never arrives once the input box is released. The old code kept it
    // on, and the next session ignored the editing keys (BUG-056 After an
    // editing session ends mid-composition, editing keys do nothing).
    this._compositionOn = false;
    this._lastCompositedTextLength = 0;
    this._compositionSelectionDelta = 0;
  }

  /**
   * Restores the selection the last session ended with; the first session
   * selects the whole text. Starts the caret blink timer.
   */
  showCaretAndSelection(): void {
    if (0 === this._caretInterval) {
      const core = this._core();
      if (core) {
        if (void 0 === this._lastSelect) {
          const end = core.getLength() - 1;
          core.select(0, end);
          this._lastSelect = extend({}, core.getSelection()) as unknown as Selection;
        } else core.select(this._lastSelect.start, this._lastSelect.end);
      }
      // No delay: the editor's _caretUpdate checks the time itself.
      this._caretInterval = setInterval(this._editor._caretUpdate.bind(this._editor));
    }
  }

  hasFocus(): boolean | null {
    return this._view && this._view.hasFocus();
  }

  hideCaretAndSelection(): void {
    if (0 !== this._caretInterval) {
      const core = this._core();
      if (core) {
        this._lastSelect = extend({}, core.getSelection()) as unknown as Selection;
        core.select(0, 0);
      }
      clearInterval(this._caretInterval);
      this._caretInterval = 0;
    }
  }

  /** The caret box while the caret shows (collapsed selection, focus). */
  getCaretBox(): CaretBox | null {
    const core = this._core();
    if (!core) return null;
    if (0 === this._caretInterval) return null;
    const selection = core.getSelection() as Selection;
    if (
      selection.end === selection.start &&
      this.hasFocus() &&
      (core.isSelectionChanged() || core.isCaretVisible())
    ) {
      const coords = core.getCaretCoords(selection.start) as NonNullable<
        ReturnType<TLCore["getCaretCoords"]>
      >;
      let box: Rect;
      let transform: Transform | null = null;
      if (core.getTransformer()) {
        const pathShift = core.getTransformer(TLPathTextTransformer.TYPE) ? coords.h : 0;
        box = new Rect(coords.l, coords.t - core.getVShift() - pathShift, coords.w, coords.h);
        const bounds = core.getRenderBounds() as Rect;
        const unit = new Rect(0, 0, coords.w, coords.h);
        const matrix = (
          core.getTransformer() as { getMatrix(x: number, y: number, r: Rect): Transform | null }
        ).getMatrix(coords.l, coords.t, unit);
        if (!matrix) return null;
        const toBounds = new Transform(1, 0, 0, 1, -bounds.getX(), -bounds.getY());
        transform = matrix.multiplied(toBounds);
      } else box = new Rect(coords.l, coords.t - core.getVShift(), coords.w, coords.h);
      return { box, transform };
    }
    return null;
  }

  /** The selection's boxes without the inline nodes (list markers). */
  getSelectionBoxes(): TLBox[] | null {
    const core = this._core();
    return core
      ? core.getBoxes(core.selectedRange(), (node: TLNode) => !node || "inline" !== node.type)
      : null;
  }

  /** The caret can't go before a list marker at the very start. */
  _isSelectable(ordinal: number): boolean {
    if (0 === ordinal) {
      const core = this._core();
      if (core) {
        const found = core.wordContainingOrdinal(ordinal) as WordAtOrdinal | null | undefined;
        const word = found && found.word;
        if (word && word.isStartOfList()) return false;
      }
    }
    return true;
  }

  _exhausted(ordinal: number, step: number): boolean | undefined {
    const core = this._core();
    if (core) return step < 0 ? ordinal <= 0 : ordinal >= core.getLength() - 1;
    return undefined;
  }

  _differentLine(a: { t: number; b: number }, b: { t: number; b: number }): boolean {
    return a.b <= b.t || b.b <= a.t;
  }

  /** The ordinal on the next (`step` 1) or previous line nearest the kept x. */
  _changeLine(ordinal: number, step: number): number | undefined {
    const core = this._core();
    if (!core) return undefined;
    let coords: { l: number; t: number; b: number } | undefined;
    let start = core.getCaretCoords(ordinal) as { l: number; t: number; b: number };
    this._nextKeyboardX = null !== this._keyboardX ? this._keyboardX : start.l;
    while (!this._exhausted(ordinal, step)) {
      if (!this._isSelectable(ordinal + step)) return ordinal;
      ordinal += step;
      coords = core.getCaretCoords(ordinal) as { l: number; t: number; b: number };
      if (this._differentLine(coords, start)) break;
    }
    start = coords as { l: number; t: number; b: number };
    while (
      !this._exhausted(ordinal, step) &&
      !(
        (step > 0 && (coords as { l: number }).l >= (this._nextKeyboardX as number)) ||
        (step < 0 && (coords as { l: number }).l <= (this._nextKeyboardX as number))
      )
    ) {
      ordinal += step;
      coords = core.getCaretCoords(ordinal) as { l: number; t: number; b: number };
      if (this._differentLine(coords, start)) {
        ordinal -= step;
        break;
      }
    }
    return ordinal;
  }

  /** The first (`step` -1) or last ordinal of the caret's line. */
  _endOfline(ordinal: number, step: number): number | undefined {
    const core = this._core();
    if (!core) return undefined;
    const start = core.getCaretCoords(ordinal) as { t: number; b: number };
    while (!this._exhausted(ordinal, step)) {
      ordinal += step;
      const coords = core.getCaretCoords(ordinal) as { t: number; b: number };
      if (this._differentLine(coords, start)) {
        ordinal -= step;
        break;
      }
    }
    return ordinal;
  }

  /** Moves the hidden input box under the focus character (for the IME window). */
  _updateTextArea(): void {
    const view = this._view as InlineEditView;
    if (view.isCapturingInput()) {
      const core = this._core();
      if (core) {
        const node = core.byOrdinal(this._focusChar as number) as TLNode | undefined;
        if (node) {
          const box = this._editor.getElement().getGeometryBBox() as Rect;
          const bounds = node.bounds();
          view.updateInputBox(bounds.l + box.getX(), bounds.t + bounds.h + box.getY());
        }
      }
    }
  }

  /** Left and Right swap in right-to-left text. */
  _getTransformedKey(key: KeyValue, core: TLCore): KeyValue {
    const direction = core.getTransformer(TLDirectionTextTransformer.TYPE) as {
      getDirection(): number;
    } | null;
    if (direction && direction.getDirection() === TLDirectionTextTransformer.RTL) {
      switch (key) {
        case Key.Constant.LEFT:
          return Key.Constant.RIGHT;
        case Key.Constant.RIGHT:
          return Key.Constant.LEFT;
        default:
          return key;
      }
    }
    return key;
  }

  /**
   * Handles an editing key; true when it did something. `shift` and
   * `ctrl` are the modifiers (Ctrl/Cmd: see the class comment).
   */
  _handleKey(key: KeyValue | null | undefined, shift: boolean, ctrl: boolean): boolean | undefined {
    let compositionCaret = 0;
    if (shift && !this._compositionOn) this._shiftKeyDown = true;
    if (this._compositionOn) {
      shift = false;
      switch (key) {
        case Key.Constant.LEFT:
        case Key.Constant.HOME:
        case Key.Constant.RIGHT:
        case Key.Constant.END:
          ctrl = false;
          compositionCaret = this._lastCompositedTextLength - this._compositionSelectionDelta;
          break;
        default:
          if (ctrl && ("Z" === key || "Y" === key)) break;
          return undefined;
      }
    }
    const scene = this._editor.getElement().getScene();
    if (!scene) return undefined;
    const editor = Editor.getEditor(scene) as Editor;
    const core = this._core();
    if (!core) return undefined;
    key = this._getTransformedKey(key as KeyValue, core);
    let start = (core.getSelection() as Selection).start;
    let end = (core.getSelection() as Selection).end;
    const last = core.getLength() - 1;
    let handled: boolean = false;
    this._nextKeyboardX = null;
    if (shift) {
      if (!this._keyboardSelect) {
        switch (key) {
          case Key.Constant.LEFT:
          case Key.Constant.UP:
          case Key.Constant.HOME:
          case Key.Constant.PAGE_UP:
            this._keyboardSelect = -1;
            break;
          case Key.Constant.RIGHT:
          case Key.Constant.DOWN:
          case Key.Constant.END:
          case Key.Constant.PAGE_DOWN:
            this._keyboardSelect = 1;
        }
      }
    } else this._keyboardSelect = 0;
    let caret = 1 === this._keyboardSelect ? end : start;
    let moved = false;
    this._editor.contentSetEnabled(0);
    // _changeLine and _endOfline return undefined only without a core,
    // which was checked above.
    switch (key) {
      case Key.Constant.LEFT:
        if (this._compositionOn) {
          if (compositionCaret > 0) {
            caret--;
            this._compositionSelectionDelta++;
            if (
              this._lastCompositedTextLength > this._compositionSelectionDelta &&
              caret > 0 &&
              "'" === (core.getRange(caret - 1, caret) as TLRange).plainText()
            ) {
              caret--;
              this._compositionSelectionDelta++;
            }
            if (this._isSelectable(caret)) moved = true;
          }
        } else {
          if (shift || start == end) {
            if (caret > 0) {
              if (ctrl) {
                const found = core.wordContainingOrdinal(caret) as WordAtOrdinal;
                caret =
                  found.ordinal === caret
                    ? found.index > 0
                      ? (core.wordOrdinal(found.index - 1) as number)
                      : 0
                    : found.ordinal;
              } else caret--;
            }
          } else caret = start;
          if (this._isSelectable(caret)) moved = true;
        }
        break;
      case Key.Constant.RIGHT:
        if (this._compositionOn) {
          if (compositionCaret < this._lastCompositedTextLength) {
            if ("'" === (core.getRange(caret, caret + 1) as TLRange).plainText()) {
              caret++;
              this._compositionSelectionDelta--;
            }
            if (this._compositionSelectionDelta > 0) {
              caret++;
              this._compositionSelectionDelta--;
            }
            moved = true;
          }
        } else {
          if (shift || start == end) {
            if (caret < last) {
              if (ctrl) {
                const found = core.wordContainingOrdinal(caret) as WordAtOrdinal;
                caret = found.ordinal + found.word.length;
              } else caret++;
            }
          } else caret = end;
          moved = true;
        }
        break;
      case Key.Constant.DOWN:
        caret = this._changeLine(caret, 1) as number;
        moved = true;
        break;
      case Key.Constant.UP:
        caret = this._changeLine(caret, -1) as number;
        moved = true;
        break;
      case Key.Constant.HOME:
        if (this._compositionOn) {
          if (compositionCaret > 0) {
            caret -= compositionCaret;
            this._compositionSelectionDelta = this._lastCompositedTextLength;
            moved = true;
          }
        } else {
          caret = this._endOfline(caret, -1) as number;
          moved = true;
        }
        break;
      case Key.Constant.END:
        if (this._compositionOn) {
          if (compositionCaret < this._lastCompositedTextLength) {
            caret += this._lastCompositedTextLength - compositionCaret;
            this._compositionSelectionDelta = 0;
            moved = true;
          }
        } else {
          caret = this._endOfline(caret, 1) as number;
          moved = true;
        }
        break;
      case Key.Constant.PAGE_UP:
        caret = 0;
        moved = true;
        break;
      case Key.Constant.PAGE_DOWN:
        caret = last;
        moved = true;
        break;
      case Key.Constant.BACKSPACE:
        if (start > 0 && start === end) {
          (core.getRange(start - 1, start) as TLRange).clear();
          this._focusChar = start - 1;
          core.select(this._focusChar, this._focusChar);
        } else if (start !== end) {
          (core.getRange(start, end) as TLRange).clear();
          this._focusChar = start;
          core.select(this._focusChar, this._focusChar);
        }
        handled = true;
        break;
      case Key.Constant.DELETE:
        if (start < last) {
          if (start === end) {
            (core.getRange(start, start + 1) as TLRange).clear();
          } else {
            (core.getRange(start, end) as TLRange).clear();
            this._focusChar = start;
            core.select(this._focusChar, this._focusChar);
          }
        }
        handled = true;
        break;
      case Key.Constant.SPACE:
        // Typing a space after a text that is exactly "lorem" fills in
        // the placeholder text.
        if ("lorem" === core.getDocumentRange().plainText().toLowerCase()) {
          core.getDocumentRange().clear();
          core.select(0, 0);
          core.insert(LOREM.replace(/\t/g, " "));
          this._editor.invalidateTextWidth();
        } else core.insert(" ");
        handled = true;
        break;
      case Key.Constant.ENTER: {
        const range = core.selectedRange();
        if (range && range.isList() && !this._shiftKeyDown) {
          if (range.canInsertListItem()) {
            core.insert(range.createListItem());
            handled = true;
          } else handled = range.unlistify(true);
        }
        if (!handled) core.insert(this._shiftKeyDown ? RunDraw.LS : "\n");
        handled = true;
        break;
      }
      case Key.Constant.TAB: {
        const range = core.selectedRange();
        if (range && range.canChangeListDepth()) {
          handled = this._shiftKeyDown ? range.decreaseList() : range.increaseList();
        }
        if (!handled) {
          core.insert("   ");
          handled = true;
        }
        break;
      }
      case "Z":
        if (ctrl) {
          handled = true;
          if (!this._compositionOn && editor.hasUndoState()) {
            editor.undoState();
            this._lastCompositedTextLength = 0;
            if (this._view) this._view.resetInputBoxContent();
          }
        }
        break;
      case "Y":
        if (ctrl) {
          handled = true;
          if (!this._compositionOn && editor.hasRedoState()) editor.redoState();
        }
        break;
      case "A":
        if (ctrl) {
          handled = true;
          core.select(0, last);
        }
        break;
      case "C":
        if (InlineTextEditor.HANDLECOPYPASTE && ctrl) {
          const range = core.selectedRange() as TLRange;
          this._richClipboard = range.save();
          this._plainClipboard = range.plainText();
          handled = true;
        }
        break;
      case "X":
        if (InlineTextEditor.HANDLECOPYPASTE && ctrl) {
          const range = core.selectedRange() as TLRange;
          this._richClipboard = range.save();
          this._plainClipboard = range.plainText();
          (core.getRange(start, end) as TLRange).clear();
          this._focusChar = start;
          core.select(this._focusChar, this._focusChar);
          handled = true;
        }
        break;
      case "V":
        if (InlineTextEditor.HANDLECOPYPASTE && ctrl) {
          core.insert(this._richClipboard);
          this._editor.invalidateTextWidth();
          handled = true;
        }
    }
    this._editor.contentSetEnabled(1);
    const toggle = this._toggles[key as string];
    if (!this._shiftKeyDown && ctrl && toggle) {
      const range = core.selectedRange() as TLRange;
      const current = (range.getFormatting() as unknown as Record<string, unknown>)[toggle];
      const fontManager = this._editor.getElement()._fontManager();
      const family = this._editor.getProperty("_tff");
      const variants = fontManager.queryFontFamily(family as string) as
        { style: unknown; weight: unknown }[] | undefined;
      let style: unknown;
      let weight: unknown;
      if ("fontWeight" === toggle) {
        style = this._editor.getProperty("_tfs");
        const next = (weight =
          parseInt(current as string) == Font.Weight.Bold ? Font.Weight.Regular : Font.Weight.Bold);
        if (
          next === WEIGHT_NORMAL ||
          void 0 === variants ||
          variants.filter((v) => v.style === style && v.weight === weight).length > 0
        ) {
          editor.beginTransaction();
          this._editor.setProperties(["_tfw"], [next]);
          editor.commitTransaction(
            Locale.get(new LocaleKey("GInlineTextEditor", "action.modify-text-properties")),
          );
        }
      } else if ("fontStyle" === toggle) {
        weight = this._editor.getProperty("_tfw");
        const next = (style = "italic" == current ? Font.Style.Normal : Font.Style.Italic);
        if (
          next === Font.Style.Normal ||
          void 0 === variants ||
          variants.filter((v) => v.style === style && v.weight === weight).length > 0
        ) {
          editor.beginTransaction();
          this._editor.setProperties(["_tfs"], [next]);
          editor.commitTransaction(
            Locale.get(new LocaleKey("GInlineTextEditor", "action.modify-text-properties")),
          );
        }
      } else {
        this._editor.contentSetEnabled(0);
        range.setFormatting(toggle, true !== current);
        this._editor.contentSetEnabled(1);
      }
      handled = true;
      this._editor.triggerHotkeyEvent([Key.Constant.CONTROL, key]);
    }
    if (moved) {
      switch (this._keyboardSelect) {
        case 0:
          start = end = caret;
          break;
        case -1:
          start = caret;
          break;
        case 1:
          end = caret;
      }
      if (start === end) this._keyboardSelect = 0;
      else if (start > end) {
        this._keyboardSelect = -this._keyboardSelect;
        const swap = end;
        end = start;
        start = swap;
      }
      this._focusChar = caret;
      core.select(start, end);
      handled = true;
    }
    this._keyboardX = this._nextKeyboardX;
    return handled;
  }

  /** Deletes the selected text. */
  deleteSelected(): void {
    const core = this._core();
    if (core) {
      const start = (core.getSelection() as Selection).start;
      const end = (core.getSelection() as Selection).end;
      this._editor.requestInvalidation();
      this._editor.contentSetEnabled(0);
      (core.getRange(start, end) as TLRange).clear();
      this._editor.contentSetEnabled(1);
      this._focusChar = start;
      core.select(this._focusChar, this._focusChar);
      this._keyboardX = null;
    }
  }

  /**
   * Whether a key with no editing meaning still types a character (so
   * the key press or input event that follows is let through).
   */
  _canHandleInput(
    key: unknown,
    shift: boolean,
    ctrl: boolean,
    keyIdentifier?: string | null,
  ): InputCheck {
    if (this._editor.getElement().getTLCore()) {
      let character: string | null = null;
      let keyCode = 0;
      let index: number;
      let result: InputCheck = false;
      let identifier = keyIdentifier;
      // A "U+XXXX" key identifier names the character (old WebKit
      // events). No caller passes one any more.
      if (identifier) {
        const parts = identifier.split("+");
        if (parts && parts.length > 1)
          character = String.fromCharCode(parseInt(parts[1] as string, 16));
      }
      if (!character && ("string" == typeof key || key instanceof String) && 1 === key.length) {
        character = key as string;
        keyCode = (key as string).toLowerCase().charCodeAt(0);
        identifier = null;
      }
      if (identifier && character && character.length) result = true;
      else if (!ctrl && character) {
        if (shift) {
          if ((index = PUNCTUATION_KEY_CODES.indexOf(keyCode)) >= 0) {
            character = ')!@#$%^&*(:+<_>?~{|}"~{|}"'.charAt(index);
          }
          result = character && character.length;
        } else {
          result =
            (character =
              (index = PUNCTUATION_KEY_CODES.indexOf(keyCode)) >= 0
                ? "0123456789;=,-./`[\\]'`[\\]'".charAt(index)
                : character.toLowerCase()) && character.length;
        }
      }
      return result;
    }
    return undefined;
  }

  /** True for a key event that repeats the last one handled. */
  _checkTimeStamp(timestamp: number): boolean {
    return (
      (timestamp < 0 && Math.abs(this._lastTimeStamp - timestamp) < 10) ||
      timestamp === this._lastTimeStamp
    );
  }

  _compStart(): void {
    if (this._compositionOn && this._view) this._view.resetInputBoxContent();
    this._compositionOn = true;
    this._lastCompositedTextLength = 0;
    this._compositionSelectionDelta = 0;
  }

  _compEnd(): void {
    if (this._view) this._view.resetInputBoxContent();
    this._compositionOn = false;
  }

  _boxInput(event: globalThis.Event): void {
    if ("input" === event.type) this._keyPress(event as unknown as InputBoxEvent, true);
  }

  /**
   * Types the pressed character (a view key press), or the input box's
   * content (`fromInputBox`), replacing the composed text while an IME
   * composition runs.
   */
  _keyPress(event: KeyPressSource, fromInputBox?: boolean): boolean | undefined {
    const text = (
      fromInputBox ? (event.target as { value: string }).value : event.keyUTF
    ) as string;
    const core = this._core();
    if (core) {
      if (this.hasFocus()) {
        if (!InlineTextEditor.IS_NON_PRINTABLE_REG.test(text) && !this._keyDownHandled) {
          this._editor.requestInvalidation();
          this._editor.contentSetEnabled(0);
          if (fromInputBox && this._compositionOn) {
            let start = (core.getSelection() as Selection).start;
            let end = (core.getSelection() as Selection).end;
            if (start === end) {
              start += this._compositionSelectionDelta;
              end += this._compositionSelectionDelta;
            }
            if (start === end) {
              const composed = core.getRange(
                start - this._lastCompositedTextLength,
                start,
              ) as TLRange;
              if (composed.plainText() != text) composed.setText(text);
              this._focusChar =
                start -
                this._compositionSelectionDelta +
                text.length -
                this._lastCompositedTextLength;
              core.select(this._focusChar, null as unknown as number);
            } else if (start !== end) {
              (core.getRange(start, end) as TLRange).setText(text);
              this._focusChar = start + text.length;
              core.select(this._focusChar, this._focusChar);
            }
            this._lastCompositedTextLength = text.length;
          } else {
            core.insert(text);
            if (fromInputBox) (event.target as { value: string }).value = "";
          }
          this._updateTextArea();
          this._editor.contentSetEnabled(1);
          this._lastResult = true;
          (event.preventDefault as () => void)();
          (event.stopPropagation as () => void)();
          return false;
        }
      } else console.log("inlineTextEditor: didn't have focus");
    }
    return undefined;
  }

  _keyUp(): void {
    this._keyDownHandled = null;
    this._shiftKeyDown = false;
    this._updateTextArea();
  }

  /** A key down from the view (Ctrl/Cmd = the platform metaKey modifier). */
  _keyDown(event: KeyEvent): boolean | undefined {
    const key = event.key as KeyValue;
    const shift = Platform.modifiers.shiftKey;
    const ctrl = Platform.modifiers.metaKey;
    const timestamp = event.timestamp;
    if (this._checkTimeStamp(timestamp)) return !this._lastResult && void 0;
    this._lastTimeStamp = timestamp;
    this._lastResult = false;
    if (this.hasFocus()) {
      this._editor.requestInvalidation();
      if (this._handleKey(key, shift, ctrl)) {
        this._lastResult = true;
        this._keyDownHandled = key;
        (event.preventDefault as () => void)();
        (event.stopPropagation as () => void)();
        return false;
      }
      if (this._canHandleInput(key, shift, ctrl)) {
        this._lastResult = true;
        return false;
      }
      return undefined;
    }
    console.log("inlineTextEditor: didn't have focus");
    this._lastResult = false;
    return undefined;
  }

  /**
   * A DOM keydown (Ctrl/Cmd = ctrlKey without altKey); true when the
   * inline editor took it.
   */
  handleDomKeyDown(event: DomKeyEvent | null | undefined): boolean {
    if (!event) return false;
    if ("keydown" !== event.type) return false;
    const timestamp = event.timeStamp || -new Date().getTime();
    const key =
      Key.translateCode(event.code as string) ||
      Key.translateKey((event.which || event.keyCode) as number, event.location);
    if (this._checkTimeStamp(timestamp)) {
      if (this._keyDownHandled == key) {
        event.preventDefault();
        event.stopPropagation();
      }
      return this._lastResult;
    }
    this._lastTimeStamp = timestamp;
    this._lastResult = false;
    this._editor.requestInvalidation();
    const shift = event.shiftKey;
    const ctrl = event.ctrlKey && !event.altKey;
    if (this._handleKey(key, shift, ctrl)) {
      event.preventDefault();
      event.stopPropagation();
      this._lastResult = true;
      this._keyDownHandled = key;
      return true;
    }
    if (this._canHandleInput(key, shift, ctrl)) {
      this._lastResult = true;
      return true;
    }
    return false;
  }

  /** A view position mapped into the text's layout space. */
  _convertToObjectSpace(position: Point): Point {
    const elementTransform = this._editor.getElement().getTransform();
    const view = this._view as InlineEditView;
    let transform = view.getWorldTransform(view.getScene().getActivePage());
    if (elementTransform) transform = transform.preMultiplied(elementTransform);
    const core = this._core();
    if (core && core.getTransformer()) {
      let point =
        (transform.invertible() && (transform.inverted() as Transform).mapPoint(position)) ||
        new Point();
      const bounds = core.getRenderBounds() as Rect;
      point = point.translated(bounds.getX(), bounds.getY());
      return (core.getTransformer() as { inverseTransform(point: Point): Point }).inverseTransform(
        point,
      );
    }
    return transform.invertible()
      ? (transform.inverted() as Transform).mapPoint(position)
      : new Point();
  }

  selectWordAtPosition(position: Point): void {
    const core = this._core();
    if (core) {
      const point = this._convertToObjectSpace(position);
      let node = core.byCoordinate(
        point.getX(),
        point.getY() - this._editor._getVerticalOffset(),
      ) as TLNode;
      if ((node = node.parent() as TLNode)) {
        const word = node as unknown as WordNode;
        core.select(word.ordinal, word.ordinal + (word.word ? word.word.text.length : word.length));
      }
    }
  }

  _mouseDblClick(event: MouseEvent): void {
    if (this._textUnderMouse) this.selectWordAtPosition(event.client);
  }

  _mouseDown(event: MouseEvent & { clickCount?: number }): void {
    if (event.button === MouseEvent.BUTTON_LEFT && this._textUnderMouse) {
      let core: TLCore | null;
      if (this._shiftKeyDown) {
        core = this._core();
        (this._view as InlineEditView).setCursor(Cursor.Text);
        if (core) {
          const anchor = (core.selectedRange() as TLRange).start;
          const point = this._convertToObjectSpace(event.client);
          const node = core.byCoordinate(
            point.getX(),
            point.getY() - this._editor._getVerticalOffset(),
          );
          if (node) {
            this._focusChar = node.ordinal;
            if (anchor > node.ordinal) core.select(node.ordinal, anchor);
            else core.select(anchor, node.ordinal);
          }
          this._selectDragStart = anchor;
          return;
        }
      }
      if (3 === event.clickCount) {
        if (!(core = this._core())) return;
        let range = core.selectedRange() as TLRange;
        range = range.doc.paragraphRange(range.start, range.end);
        core.select(range.start, range.end);
        this._selectDragStart = range.start;
        return;
      }
      this._selectDragStart = this.setCursor(event.client) as number | null;
    }
  }

  /** Puts the caret at a view position; returns its ordinal. */
  setCursor(position: Point): number | null | undefined {
    if (this._activated) {
      const core = this._core();
      if (core) {
        const point = this._convertToObjectSpace(position);
        const node = core.byCoordinate(
          point.getX(),
          point.getY() - this._editor._getVerticalOffset(),
        ) as TLNode;
        core.select(node.ordinal, node.ordinal);
        this._keyboardX = null;
        return node.ordinal;
      }
      return null;
    }
    return undefined;
  }

  _mouseRelease(): void {
    this._updateTextArea();
    this._selectDragStart = null;
    this._keyboardX = null;
  }

  _mouseMove(event: MouseEvent): void {
    const view = this._view as InlineEditView;
    let box = this._editor.getElement().getPaintBBox();
    if (box && !box.isEmpty()) {
      box = view.getWorldTransform(view.getScene().getActivePage()).mapRect(box);
      const pick = EditorOptions.pickDistance;
      this._textUnderMouse = box.expanded(pick, pick, pick, pick).containsPoint(event.client);
    }
    if (this._textUnderMouse) view.setCursor(Cursor.Text);
    if (null !== this._selectDragStart) {
      const core = this._core();
      if (core) {
        const point = this._convertToObjectSpace(event.client);
        const node = core.byCoordinate(
          point.getX(),
          point.getY() - this._editor._getVerticalOffset(),
        );
        if (node) {
          this._focusChar = node.ordinal;
          if (this._selectDragStart > node.ordinal)
            core.select(node.ordinal, this._selectDragStart);
          else core.select(this._selectDragStart, node.ordinal);
        }
      }
    }
  }

  /** Whether a view position is on the selected text. */
  isSelectionHit(position: Point): boolean {
    const core = this._core();
    if (!core) return false;
    const selection = core.getSelection() as Selection;
    if (selection.start === selection.end) return false;
    const point = this._convertToObjectSpace(position);
    const node = core.byCoordinate(
      point.getX(),
      point.getY() - this._editor._getVerticalOffset(),
    ) as TLNode;
    return !!(selection && node.ordinal >= selection.start && node.ordinal <= selection.end);
  }

  _core(): TLCore | null {
    return this._editor.getElement().getTLCore();
  }

  override toString(): string {
    return "[Object GInlineTextEditor]";
  }
}

// Prototype defaults, as the old prototype had them.
Object.assign(InlineTextEditor.prototype, {
  _editor: null,
  _view: null,
  _textUnderMouse: false,
  _activated: false,
  _keyboardSelect: 0,
  _keyboardX: null,
  _nextKeyboardX: null,
  _selectDragStart: null,
  _focusChar: null,
  _richClipboard: null,
  _plainClipboard: null,
  _toggles: null,
  _caretInterval: 0,
  _lastSelect: void 0,
  _lastTimeStamp: -1,
  _lastResult: false,
  _keyDownHandled: null,
  _compositionOn: false,
  _lastCompositedTextLength: 0,
  _compositionSelectionDelta: 0,
});
