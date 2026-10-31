import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Key } from "../../engine/core/key.ts";
import { KeyEvent } from "../../engine/core/key-event.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { installFakeCanvas } from "../../engine/paint/testing/fake-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { Element } from "../../engine/scene/element.ts";
import { Path } from "../../engine/scene/path.ts";
import { PathBase } from "../../engine/scene/path-base.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { RenderFlags } from "../../engine/text/gtl/render-flags.ts";
import type { TLCore, TLRenderStyle } from "../../engine/text/gtl/tl-core.ts";
import { Text } from "../../engine/text/text.ts";
import { Editor } from "../editor.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { BaseEditor } from "./base-editor.ts";
import { BoxEditor } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import type { InlineTextEditor } from "./inline-text-editor.ts";
import { TextEditor } from "./text-editor.ts";
import recorded from "./text-editor.fixture.json";
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

  it("resizes a text box through its source box only, leaving trf alone", () => {
    // The old code ran GElement.Transform's preTransform, which only
    // reaches children, after transformSourceBBox; Shape.preTransform
    // would scale `trf` by the same resize again.
    for (const scaleContents of [false, true]) {
      const { editor, text } = textSetup("Hello world");
      if (scaleContents) text.setProperties(["sc", "_tfi"], [true, 20]);
      editor.setFlag(BaseEditor.Flag.Selected);
      const before = text.getSourceBBox() as Rect;
      editor.resize(Rect.Side.BOTTOM_RIGHT, new Point(50, 30));
      editor.applyPartMove(BoxEditor.RESIZE_HANDLE_PART_ID, { side: Rect.Side.BOTTOM_RIGHT });
      const trf = text.getProperty("trf") as Transform;
      expect([scaleContents, trf.getMatrix()]).toEqual([scaleContents, [1, 0, 0, 1, 100, 100]]);
      const after = text.getSourceBBox() as Rect;
      expect([after.getX(), after.getY()]).toEqual([before.getX(), before.getY()]);
      expect(after.getWidth()).toBeCloseTo(before.getWidth() + 50, 6);
      expect(after.getHeight()).toBeCloseTo(before.getHeight() + 30, 6);
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

  // The text repaints only the rows of its fill bitmap that an inline edit
  // changes (Text._editChange); the caret is the editor's to repaint.
  describe("repaints after inline edits", () => {
    const FILL_RENDER =
      RenderFlags.RENDERFLAG_FILL |
      RenderFlags.RENDERFLAG_VERTEX |
      RenderFlags.RENDERFLAG_SCALEBITMAP;
    const LINES =
      "The first line is the longest one.\nSecond line.\nThird line here.\nFourth.\nLast";

    /** A text being edited inline, as a paint of its fill on screen leaves it. */
    function editing() {
      const setup = textSetup(LINES);
      const { text, editor, scene } = setup;
      editor.beginInlineEdit(new FakeView(scene).asWidget());
      inlineOpen.push(editor._inlineEditor as InlineTextEditor);
      const core = text.getTLCore() as TLCore;
      // What Text._paintTextFill does for the screen while editing.
      const style: TLRenderStyle = { shapePaint: null, valign: text.$va };
      core.render(true, 1, style, FILL_RENDER, true);
      text._lastFill = { scale: 1, style, aligned: true };
      text._runsDirty = false;
      const areas: (Rect | null)[] = [];
      scene.addEventListener(
        Scene.InvalidationRequestEvent,
        (event: InstanceType<typeof Scene.InvalidationRequestEvent>) => {
          areas.push(event.area);
        },
      );
      // The text's own events, which the editors repaint the caret from.
      const changes: (number | null)[] = [];
      scene.addEventListener(
        Element.GeometryChangeEvent,
        (event: InstanceType<typeof Element.GeometryChangeEvent>) => {
          if (event.element === text) changes.push(event.type);
        },
      );
      return { ...setup, core, areas, changes, style };
    }

    /**
     * Types as a key press in the view does. The inline editor writes the
     * content back without loading it into the core again (contentSetEnabled),
     * which would turn the runs' "transparent" color into a color object.
     */
    function type(editor: TextEditor, keys: string): void {
      (editor._inlineEditor as InlineTextEditor)._keyPress({
        keyUTF: keys,
        preventDefault: () => {},
        stopPropagation: () => {},
      });
    }

    // The text sits right on the page, which repaints the whole box of a
    // child whose box changed: the second geometry update of an edit
    // (Text._handleChange) must not count as such a change.
    it("repaints only the rows of the lines an edit changed", () => {
      const { text, editor, core, areas, style } = editing();
      const box = text.getPaintBBox() as Rect;
      const at = LINES.indexOf("Second");
      core.select(at, at);
      type(editor, "x");
      // The core can still tell which rows the next render draws.
      expect(core.changedRows(1, style, FILL_RENDER)).not.toBeNull();
      expect(areas.length).toBeGreaterThan(0);
      for (const area of areas) {
        expect(area).not.toBeNull();
        expect((area as Rect).getHeight()).toBeLessThan(box.getHeight() / 2);
      }
      // The middle of the edited line (the text sits at 100, 100).
      const caret = core.getCaretCoords(at) as NonNullable<ReturnType<TLCore["getCaretCoords"]>>;
      const middle = 100 + caret.t + caret.h / 2;
      expect(
        areas.some((area) => {
          const y = (area as Rect).getY();
          return y <= middle && middle <= y + (area as Rect).getHeight();
        }),
      ).toBe(true);
    });

    it("repaints the whole text when the edit changes its box", () => {
      const { text, editor, core, areas } = editing();
      core.select(core.getLength() - 1);
      type(editor, "\nmore");
      const box = text.getPaintBBox() as Rect;
      expect(areas.some((area) => Rect.equals(area, box))).toBe(true);
    });

    it("repaints nothing for a caret move, and tells the editors", () => {
      const { text, areas, changes } = editing();
      text.repaintEdited();
      expect(areas).toEqual([]);
      expect(changes).toEqual([
        Element.GeometryChangeEvent.Type.Before,
        Element.GeometryChangeEvent.Type.After,
      ]);
    });

    it("repaints the whole text when its bitmap isn't drawn pixel for pixel", () => {
      const { text, editor, core, areas } = editing();
      (text._lastFill as NonNullable<Text["_lastFill"]>).aligned = false;
      core.select(LINES.indexOf("Second"));
      type(editor, "x");
      expect(areas.some((area) => Rect.equals(area, text.getPaintBBox()))).toBe(true);
    });

    it("repaints the whole text when a border paints past the fill", () => {
      const { text, editor, core, areas } = editing();
      vi.spyOn(text, "hasStyleBorder").mockReturnValue(true);
      core.select(LINES.indexOf("Second"));
      type(editor, "x");
      expect(areas.some((area) => Rect.equals(area, text.getPaintBBox()))).toBe(true);
    });
  });

  describe("matches values recorded from the old app", () => {
    const rect = (r: Rect | null | undefined) =>
      r ? [r.getX(), r.getY(), r.getWidth(), r.getHeight()] : r;
    const matrix = (t: Transform | null | undefined) => (t ? t.getMatrix() : t);
    const guides = { mapPoint: (point: Point) => point };
    const view = new Transform(1, 0, 0, 1, 5, 7);
    const c = Math.cos(Math.PI / 6);
    const s = Math.sin(Math.PI / 6);
    const transforms: Record<string, Transform> = {
      scale: new Transform(2, 0, 0, 1.5, -100, -50),
      mirror: new Transform(-1, 0, 0, 1, 400, 0),
      rotate: new Transform(1, 0, 0, 1, -150, -113)
        .multiplied(new Transform(c, s, -s, c, 0, 0))
        .multiplied(new Transform(1, 0, 0, 1, 150, 113)),
      tiny: new Transform(0.001, 0, 0, 0.001, 0, 0),
    };

    /** The _paintTransformedQuadrilateral calls of one _paintResizeBoxOutline. */
    function outlineCalls(editor: TextEditor, withStyle: boolean): unknown[] {
      const calls: unknown[] = [];
      vi.spyOn(editor, "_paintTransformedQuadrilateral").mockImplementation(((
        trf: Transform,
        bbox: Rect,
        _context: unknown,
        color: unknown,
        width: unknown,
      ) => {
        calls.push(
          withStyle
            ? { trf: matrix(trf), bbox: rect(bbox), color, width }
            : { trf: matrix(trf), bbox: rect(bbox) },
        );
      }) as never);
      editor._paintResizeBoxOutline(view, {} as never, false, null, 2);
      return calls;
    }

    for (const [name, transform] of Object.entries(transforms)) {
      it(`previews a non-scaling ${name} as the box the text reflows into`, () => {
        const { editor } = textSetup("Hello world");
        editor.edTransform(transform);
        const own = editor._getBoxParams(new Transform());
        const moved = editor._getBoxParams((editor._transform as Transform).multiplied(view));
        expect({
          full: editor._fullContentsTransform,
          tr: matrix(editor._transform),
          bbox: rect(own.bbox),
          trf: matrix(own.trf),
          ptBox: rect(moved.bbox),
          ptTrf: matrix(moved.trf),
          bbIncl: rect(editor._getBBox(view, true)),
          bbExcl: rect(editor._getBBox(view, false)),
          calls: outlineCalls(editor, true),
        }).toEqual(recorded.preview[name as keyof typeof recorded.preview]);
      });
    }

    it("paints the plain resize box outline while a transform scales the contents", () => {
      const { editor, text } = textSetup("Hello world");
      text.setProperty("sc", true);
      editor.edTransform(transforms.scale as Transform);
      expect({
        full: editor._fullContentsTransform,
        bb: rect(editor._getBBox(new Transform(), true)),
        calls: outlineCalls(editor, false),
      }).toEqual(recorded.preview.scFull);
    });

    for (const [name, scaleContents] of [
      ["plain", false],
      ["scaleContents", true],
    ] as const) {
      it(`rotates a text by its rotation handle into trf (${name})`, () => {
        const { editor, text, host } = textSetup("Hello world");
        if (scaleContents) text.setProperty("sc", true);
        const data = { point: new Point(209, 113) };
        const result = editor.movePart(
          BoxEditor.ROTATION_HANDLE_PART_ID,
          data,
          new Point(160, 200),
          new Transform(),
          guides,
          false,
          false,
        ) as Transform;
        const mid = {
          full: editor._fullContentsTransform,
          tr: matrix(editor._transform),
          res: matrix(result),
          bb: rect(editor._getBBox(new Transform(), true)),
        };
        editor.applyPartMove(BoxEditor.ROTATION_HANDLE_PART_ID, data);
        expect({
          mid,
          trf: matrix(text.getProperty("trf") as Transform),
          src: rect(text.getSourceBBox()),
          aw: text.getProperty("aw"),
          ah: text.getProperty("ah"),
          w: text.getProperty("w"),
          h: text.getProperty("h"),
          tr: matrix(editor._transform),
          log: host.calls.filter((call) => call[0] === "begin" || call[0] === "commit"),
        }).toEqual(recorded.rotation[name]);
      });
    }

    it("moves the start of a text on a path with the distance handle", () => {
      const { editor, text, scene } = textSetup("On a path");
      text.setProperty("trf", new Transform());
      const path = new Path(false);
      const points = path.getAnchorPoints();
      for (const values of [
        [100, 250, 100, 250, 150, 100],
        [400, 250, 350, 100, 400, 250],
      ]) {
        const point = new PathBase.AnchorPoint();
        point.setProperties(["x", "y", "hlx", "hly", "hrx", "hry"], values);
        points.appendChild(point);
      }
      const page = scene.getActivePage() as NonNullable<ReturnType<typeof scene.getActivePage>>;
      page.insertChild(path, text);
      scene.link(text, path);
      text.setProperties(["tpthl"], [40]);
      const id = TextEditor.DISTANCE_HANDLER_ID;
      const handle = editor._getDistHandlePosition(new Transform());
      const out: Record<string, unknown> = {
        attached: text.hasPathAttached(),
        tpthl0: text.getProperty("tpthl"),
        d0: text.$tpthl,
        handle: handle && [handle.getX(), handle.getY()],
      };
      out.res = editor.movePart(
        id,
        null,
        new Point(250, 140),
        new Transform(),
        guides,
        false,
        false,
      );
      out.tpthl1 = text.getProperty("tpthl");
      out.d1 = text.$tpthl;
      out.res2 = editor.movePart(id, null, new Point(320, 160), new Transform(), guides);
      out.tpthl2 = text.getProperty("tpthl");
      out.d2 = text.$tpthl;
      editor.applyPartMove(id, null);
      out.tpthl3 = text.getProperty("tpthl");
      out.d3 = text.$tpthl;
      out.log = [];
      expect(out).toEqual(recorded.distance);
    });

    for (const name of ["plain", "noTransaction", "afs"] as const) {
      it(`writes an edit back to content (${name})`, () => {
        const { editor, text, host } = textSetup("Hello world");
        const core = text.getTLCore() as NonNullable<ReturnType<Text["getTLCore"]>>;
        const adapted: string[] = [];
        const adapt = text.adaptFontSizeToFitBBox.bind(text);
        vi.spyOn(text, "adaptFontSizeToFitBBox").mockImplementation(() => {
          adapted.push(text.getProperty("content") as string);
          adapt();
        });
        if (name === "noTransaction") {
          // The handler gets the change parameter set when it was added.
          core.paramChangeEvent(true);
          editor._attach();
        }
        if (name === "afs") {
          text.setProperties(["aw", "ah"], [false, false]);
          text.setProperty("afs", true);
        }
        host.calls.splice(0);
        core.select(0, 5);
        core.insert("Howdy");
        expect({
          content: (
            JSON.parse(text.getProperty("content") as string) as {
              text: string;
              fontSize: number;
            }[]
          ).map((run) => [run.text, run.fontSize]),
          log: host.calls
            .filter((call) => call[0] === "begin" || call[0] === "commit")
            .map((call) => (call[0] === "commit" ? ["commit", String(call[1])] : ["begin"])),
          afs: adapted.map((content) => (JSON.parse(content) as { text: string }[])[0]?.text),
          tfi: text.getProperty("_tfi"),
          src: rect(text.getSourceBBox()),
        }).toEqual(recorded.contentChanged[name]);
      });
    }
  });
});
