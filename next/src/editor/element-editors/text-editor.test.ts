import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Key } from "../../engine/core/key.ts";
import { KeyEvent } from "../../engine/core/key-event.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { installFakeCanvas } from "../../engine/paint/testing/fake-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { Text } from "../../engine/text/text.ts";
import { Editor } from "../editor.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { BaseEditor } from "./base-editor.ts";
import { BoxEditor } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import type { InlineTextEditor } from "./inline-text-editor.ts";
import { TextEditor } from "./text-editor.ts";
import { FakeView, textSetup } from "./text-editor.testing.ts";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());

const inlineOpen: InlineTextEditor[] = [];
afterEach(() => {
  Platform.modifiers.metaKey = false;
  Platform.modifiers.shiftKey = false;
  for (const inline of inlineOpen.splice(0)) if (inline.isActivated()) inline.deactivate();
  vi.restoreAllMocks();
});

function ctrlKey(key: string): KeyEvent {
  const event = new KeyEvent.Down();
  event.key = key;
  return event;
}

describe("GTextEditor", () => {
  it("is the editor of texts", () => {
    const editor = ElementEditor.createEditor(new Text());
    expect(editor).toBeInstanceOf(TextEditor);
    expect(String(editor)).toBe("[Object GTextEditor]");
  });

  it("toggles auto width and auto height by double-clicking the center handles", () => {
    const { editor, text } = textSetup("Hello");
    const part = BoxEditor.RESIZE_HANDLE_PART_ID;
    expect(text.getProperty("aw")).toBe(true);
    expect(editor.handleDblClick(part, { side: Rect.Side.RIGHT_CENTER })).toBe(true);
    expect(text.getProperty("aw")).toBe(false);
    expect(editor.handleDblClick(part, { side: Rect.Side.BOTTOM_CENTER })).toBe(true);
    expect(text.getProperty("ah")).toBe(false);
    expect(editor.handleDblClick(part, { side: Rect.Side.TOP_LEFT })).toBe(true);
    expect(editor.handleDblClick("other", { side: Rect.Side.RIGHT_CENTER })).toBe(false);
    expect(text.getProperty("aw")).toBe(false);
  });

  it("turns auto height off for a corner resize and keeps it for a side one", () => {
    for (const [side, aw, ah] of [
      [Rect.Side.BOTTOM_RIGHT, false, false],
      [Rect.Side.RIGHT_CENTER, false, true],
      [Rect.Side.BOTTOM_CENTER, true, false],
    ] as const) {
      const { editor, text } = textSetup("Hello world");
      const before = text.getSourceBBox() as Rect;
      editor.setFlag(BaseEditor.Flag.Selected);
      editor.createElementPreview();
      const preview = editor.getPaintElement();
      expect(preview).not.toBe(text);
      // The preview doubled in width around the text's left edge.
      const own = text.getProperty("trf") as Transform;
      const doubled = new Transform(1, 0, 0, 1, -before.getX(), 0)
        .scaled(2, 1)
        .translated(before.getX(), 0)
        .multiplied(own);
      preview.setProperty("trf", doubled);
      editor.applyPartMove(BoxEditor.RESIZE_HANDLE_PART_ID, { side });
      expect([side, text.getProperty("aw"), text.getProperty("ah")]).toEqual([side, aw, ah]);
      expect(editor.getPaintElement()).toBe(text);
    }
  });

  it("scales the font size with the bottom-right handle when it scales contents", () => {
    const { editor, text } = textSetup("Hello");
    text.setProperties(["sc", "_tfi"], [true, 20]);
    editor.createElementPreview();
    const own = text.getProperty("trf") as Transform;
    editor
      .getPaintElement()
      .setProperty("trf", new Transform(1.5, 0, 0, 1.5, 0, 0).multiplied(own));
    editor.applyPartMove(BoxEditor.RESIZE_HANDLE_PART_ID, { side: Rect.Side.BOTTOM_RIGHT });
    expect(text.getProperty("_tfi")).toBe(30);
  });

  it("toggles bold with Ctrl+B only when the family has the weight", () => {
    const bold = textSetup("Hello", [
      { style: "N", weight: 400 },
      { style: "N", weight: 700 },
    ]);
    Platform.modifiers.metaKey = true;
    bold.host.listeners.add(Editor.HotkeyEvent);
    bold.editor.handleKeyEvent(ctrlKey("B"));
    expect(bold.text.getProperty("_tfw")).toBe(700);
    expect(bold.host.calls.map((c) => c[0])).toEqual(["begin", "commit"]);
    expect(bold.host.events.length).toBe(1);
    bold.editor.handleKeyEvent(ctrlKey("B"));
    expect(bold.text.getProperty("_tfw")).toBe(400);

    // Without a Regular variant, un-bolding does nothing (see "Bold toggle
    // checks a weight that doesn't exist" in QUESTIONS.md).
    const noRegular = textSetup("Hello", [{ style: "N", weight: 700 }]);
    noRegular.text.setProperty("_tfw", 700);
    noRegular.editor.handleKeyEvent(ctrlKey("B"));
    expect(noRegular.text.getProperty("_tfw")).toBe(700);
    expect(noRegular.host.calls).toEqual([]);
  });

  it("toggles italic with Ctrl+I and ignores Ctrl+Shift+I", () => {
    const { editor, text } = textSetup("Hello", [
      { style: "N", weight: 400 },
      { style: "I", weight: 400 },
    ]);
    Platform.modifiers.metaKey = true;
    Platform.modifiers.shiftKey = true;
    editor.handleKeyEvent(ctrlKey("I"));
    expect(text.getProperty("_tfs")).toBe("N");
    Platform.modifiers.shiftKey = false;
    editor.handleKeyEvent(ctrlKey("I"));
    expect(text.getProperty("_tfs")).toBe("I");
  });

  it("sets the dropped font family in one transaction", () => {
    const { editor, text, host } = textSetup("Hello");
    expect(editor.acceptDrop(null, ElementEditor.DropType.FontFamily, "Open Sans", null)).toBe(
      true,
    );
    expect(text.getProperty("_tff")).toBe("Open Sans");
    expect(host.calls).toEqual([["begin"], ["commit", "Drop Font"]]);
    expect(editor.acceptDrop(null, ElementEditor.DropType.Text, "x", null)).toBe(false);
  });

  it("inverts the auto-size handles and paints the scale-contents corner orange", () => {
    const { editor, text } = textSetup("Hello");
    text.setProperties(["aw", "ah", "sc"], [true, false, true]);
    editor.setFlag(BaseEditor.Flag.Selected);
    const spy = vi.spyOn(EditorAnnotation, "paintAnnotation").mockImplementation(() => undefined);
    const context = { selectionOutlineColor: "blue" } as unknown as PaintContext;
    editor._paintResizeHandles(new Transform(), context);
    const style = EditorOptions.annotationHandles.resize as { inverted: boolean };
    const byPoint: unknown[][] = (spy.mock.calls as unknown[][]).map((c) => [c[4], c[6]]);
    expect(byPoint.length).toBe(8);
    // inverted flag per handle: only the right center one flips (aw).
    expect(byPoint.filter((c) => c[0] === !style.inverted).length).toBe(1);
    expect(
      byPoint.filter((c) => c[1] === EditorOptions.annotationHandles.text.blResizeColor).length,
    ).toBe(1);
  });

  it("can inline edit an editable text with a font and no fake text", () => {
    const { editor, text } = textSetup("Hello");
    expect(editor.canInlineEdit()).toBe(true);
    editor.setInlineEditEnabled(false);
    expect(editor.canInlineEdit()).toBe(false);
    editor.setInlineEditEnabled(true);
    text.setProperty("_ed", false);
    expect(editor.canInlineEdit()).toBe(false);
  });

  it("hides the resize handles while inline editing and records the edit when done", () => {
    const { editor, text, scene } = textSetup("Hello");
    const view = new FakeView(scene);
    editor.beginInlineEdit(view.asWidget());
    inlineOpen.push(editor._inlineEditor as InlineTextEditor);
    expect(editor.isInlineEdit()).toBe(true);
    expect(editor.hasFlag(BoxEditor.Flag.ResizeAll)).toBe(false);
    (editor._inlineEditor as InlineTextEditor)._keyPress({
      keyUTF: "X",
      preventDefault: () => {},
      stopPropagation: () => {},
    });
    expect(editor.finishInlineEdit()).toBe("Modify Text Content");
    expect(editor.isInlineEdit()).toBe(false);
    expect(editor.hasFlag(BoxEditor.Flag.ResizeAll)).toBe(true);
    expect(text.getProperty("_we")).toBe(true);
  });

  it("deletes the text when inline editing leaves it empty", () => {
    const { editor, host, scene } = textSetup("Hello");
    editor.beginInlineEdit(new FakeView(scene).asWidget());
    const inline = editor._inlineEditor as InlineTextEditor;
    inlineOpen.push(inline);
    inline.deleteSelected();
    editor.finishInlineEdit();
    expect(host.calls.at(-1)).toEqual(["deleteSelection", true]);
  });

  it("keeps resize handles off after inline editing under a no-size-change lock", () => {
    const { editor, text, scene } = textSetup("Hello");
    text.setProperty("plkt", 2);
    editor.beginInlineEdit(new FakeView(scene).asWidget());
    inlineOpen.push(editor._inlineEditor as InlineTextEditor);
    editor.finishInlineEdit();
    expect(editor.hasFlag(BoxEditor.Flag.ResizeAll)).toBe(false);
  });

  it("reads and writes the selection's formatting while inline editing", () => {
    const { editor, text, scene } = textSetup("Hello");
    editor.beginInlineEdit(new FakeView(scene).asWidget());
    inlineOpen.push(editor._inlineEditor as InlineTextEditor);
    const core = text.getTLCore() as NonNullable<ReturnType<Text["getTLCore"]>>;
    core.select(0, 2);
    editor.setProperty("_tfi", 30);
    // Recorded from the old app.
    const runs = text.getContent() as { text: string; fontSize?: number }[];
    expect(runs.map((r) => [r.text, r.fontSize])).toEqual([
      ["He", 30],
      ["llo", 20],
    ]);
    expect(editor.getProperty("_tfi")).toBe(30);
    expect(text.getProperty("_tfi")).toBe(null);
  });

  it("pastes plain text with Windows line feeds turned into newlines", () => {
    const { editor, text, scene } = textSetup("Hello");
    expect(editor.processPaste("x")).toBe(false);
    editor.beginInlineEdit(new FakeView(scene).asWidget());
    inlineOpen.push(editor._inlineEditor as InlineTextEditor);
    const core = text.getTLCore() as NonNullable<ReturnType<Text["getTLCore"]>>;
    core.select(5, 5);
    expect(editor.processPaste("a\r\nb")).toBe(true);
    expect(text.getPlainText()).toBe("Helloa\nb");
  });

  it("gives an auto-width text that runs off the page a fixed width", () => {
    const { editor, text, scene } = textSetup("Hello");
    const page = scene.getActivePage() as NonNullable<ReturnType<typeof scene.getActivePage>>;
    page.setProperties(["w", "h"], [300, 300]);
    text.setProperty("trf", new Transform(1, 0, 0, 1, 250, 100));
    const box = text.getGeometryBBox() as Rect;
    // Narrow text: less than 50 px would stay, so nothing changes.
    editor.invalidateTextWidth();
    expect(text.getProperty("aw")).toBe(true);
    text.setText("Hello world, this is a much longer line of text");
    text.setProperty("trf", new Transform(1, 0, 0, 1, 200, 100));
    const wide = text.getGeometryBBox() as Rect;
    expect(wide.getX() + wide.getWidth()).toBeGreaterThan(300);
    editor.invalidateTextWidth();
    expect(text.getProperty("aw")).toBe(false);
    const after = text.getGeometryBBox() as Rect;
    expect(after.getX() + after.getWidth()).toBeCloseTo(300, 6);
    expect(box.getWidth()).toBeGreaterThan(0);
  });

  it("blinks the caret every 500 ms while the view has focus", () => {
    // Only Date is faked; the editor's timer would call _caretUpdate the
    // same way.
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const { editor, text, scene } = textSetup("Hello");
      const view = new FakeView(scene);
      editor.beginInlineEdit(view.asWidget());
      inlineOpen.push(editor._inlineEditor as InlineTextEditor);
      const core = text.getTLCore() as NonNullable<ReturnType<Text["getTLCore"]>>;
      const toggles = vi.spyOn(core, "toggleCaret");
      const tick = (ms: number) => {
        vi.setSystemTime(Date.now() + ms);
        editor._caretUpdate();
      };
      tick(0);
      expect(toggles).toHaveBeenCalledTimes(0);
      tick(1);
      expect(toggles).toHaveBeenCalledTimes(1);
      tick(500);
      expect(toggles).toHaveBeenCalledTimes(1);
      tick(1);
      expect(toggles).toHaveBeenCalledTimes(2);
      // Without focus a visible caret is hidden.
      view.focused = false;
      const visible = core.isCaretVisible();
      tick(1);
      expect(toggles).toHaveBeenCalledTimes(visible ? 3 : 2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fires a hotkey event on Ctrl+B", () => {
    const { editor, host } = textSetup("Hello", [{ style: "N", weight: 700 }]);
    host.listeners.add(Editor.HotkeyEvent);
    Platform.modifiers.metaKey = true;
    editor.handleKeyEvent(ctrlKey("B"));
    const event = host.events[0] as InstanceType<typeof Editor.HotkeyEvent>;
    expect(event).toBeInstanceOf(Editor.HotkeyEvent);
    expect(event.keys).toEqual([Key.Constant.CONTROL, "B"]);
  });
});
