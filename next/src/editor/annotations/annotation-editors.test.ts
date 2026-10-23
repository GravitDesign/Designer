import { afterEach, describe, expect, it, vi } from "vitest";
import { GDate } from "../../engine/core/date.ts";
import { hasMixin } from "../../engine/core/object.ts";
import { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { ArrowAnnotation } from "../../engine/scene/annotations/arrow-annotation.ts";
import { CommentAnnotation } from "../../engine/scene/annotations/comment-annotation.ts";
import { EllipseAnnotation } from "../../engine/scene/annotations/ellipse-annotation.ts";
import { HighlighterAnnotation } from "../../engine/scene/annotations/highlighter-annotation.ts";
import { PencilAnnotation } from "../../engine/scene/annotations/pencil-annotation.ts";
import { RectangleAnnotation } from "../../engine/scene/annotations/rectangle-annotation.ts";
import { TextAnnotation } from "../../engine/scene/annotations/text-annotation.ts";
import { Vertex } from "../../engine/geometry/vertex.ts";
import type { VertexReader } from "../../engine/geometry/vertex-source.ts";
import { Block } from "../../engine/scene/block.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { BaseEditor } from "../element-editors/base-editor.ts";
import { BoxEditor } from "../element-editors/box-editor.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { EllipseEditor } from "../element-editors/ellipse-editor.ts";
import { PathEditor } from "../element-editors/path-editor.ts";
import { BBoxGuide } from "../guides/bbox-guide.ts";
import { AnnotationEditor } from "./annotation-editor.ts";
import { ArrowAnnotationEditor } from "./arrow-annotation-editor.ts";
import { CommentAnnotationEditor } from "./comment-annotation-editor.ts";
import { EllipseAnnotationEditor } from "./ellipse-annotation-editor.ts";
import { HighlighterAnnotationEditor } from "./highlighter-annotation-editor.ts";
import { PencilAnnotationEditor } from "./pencil-annotation-editor.ts";
import { RectangleAnnotationEditor } from "./rectangle-annotation-editor.ts";
import { TextAnnotationEditor } from "./text-annotation-editor.ts";
import oldPaint from "./comment-annotation-paint.fixture.json";

type AnyEditor = ElementEditor & {
  _uid: unknown;
  _annotationSetup(name?: unknown, location?: unknown, type?: unknown): void;
  _showEditor(context?: unknown): boolean;
  _showAnnotations(): boolean;
  _getGuideExclusions(): unknown;
};

/** A scene whose editor host records transactions; annotations go into the page's list. */
function setup() {
  const scene = new Scene(new Workspace());
  const host = {
    commits: [] as unknown[][],
    begins: 0,
    requestInvalidation: () => undefined,
    beginTransaction: () => host.begins++,
    commitTransaction: (...args: unknown[]) => host.commits.push(args),
  };
  (scene as unknown as { __graphic_editor__: unknown }).__graphic_editor__ = host;
  const list = (scene.getActivePage() as Page).getAnnotations() as unknown as Node & {
    appendChild(child: Node): void;
  };
  return { scene, host, list };
}

const ANNOTATIONS: [new () => Node, new (element: never, uid?: unknown) => ElementEditor][] = [
  [EllipseAnnotation, EllipseAnnotationEditor],
  [RectangleAnnotation, RectangleAnnotationEditor],
  [ArrowAnnotation, ArrowAnnotationEditor],
  [CommentAnnotation, CommentAnnotationEditor],
  [PencilAnnotation, PencilAnnotationEditor],
  [HighlighterAnnotation, HighlighterAnnotationEditor],
  [TextAnnotation, TextAnnotationEditor],
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("annotation editors", () => {
  it("each edits its annotation class and shares the annotation editor members", () => {
    for (const [AnnotationClass, EditorClass] of ANNOTATIONS) {
      const editor = ElementEditor.createEditor(new AnnotationClass(), "u1") as AnyEditor;
      expect(editor).toBeInstanceOf(EditorClass);
      expect(hasMixin(editor, AnnotationEditor)).toBe(true);
      expect(editor._uid).toBe("u1");
      expect(editor.canHandleDblClick()).toBe(true);
      expect(editor.handleDblClick(null)).toBe(true);
      expect(editor._getGuideExclusions()).toEqual([BBoxGuide]);
      expect(String(editor)).toBe("[Object G" + EditorClass.name + "]");
    }
  });

  it("stamps a placed annotation with author, time and the next sequence number", () => {
    const { list } = setup();
    const older = new RectangleAnnotation();
    older.setProperty("seq", 3);
    list.appendChild(older);
    const annotation = new EllipseAnnotation();
    list.appendChild(annotation);
    vi.spyOn(GDate, "now").mockReturnValue(1234);
    const editor = new EllipseAnnotationEditor(annotation as never, "author-uid");
    editor.initialSetup();
    expect(annotation.getProperties(["name", "uid", "time", "seq", "loc", "typ", "rmd"])).toEqual([
      "Anonymous",
      "author-uid",
      1234,
      4,
      null,
      0,
      false,
    ]);
    // An explicit author, location and type win. The annotation counts
    // among its own siblings, so its sequence number goes up again.
    (editor as unknown as AnyEditor)._annotationSetup("Ann", "loc1", 2);
    expect(annotation.getProperties(["name", "seq", "loc", "typ"])).toEqual(["Ann", 5, "loc1", 2]);
  });

  it("refuses to set up an annotation outside a container", () => {
    const editor = new RectangleAnnotationEditor(new RectangleAnnotation() as never) as unknown;
    expect(() => (editor as AnyEditor)._annotationSetup()).toThrow(
      "Annotation setup without valid annotation",
    );
  });

  it("blocks removal with the NoDelete program lock", () => {
    const annotation = new ArrowAnnotation();
    const editor = new ArrowAnnotationEditor(annotation as never);
    expect(editor.isRemovalBlocked()).toBeFalsy();
    annotation.setProperty("plkt", (Block.ProgramLck as Record<string, number>).NoDelete);
    expect(editor.isRemovalBlocked()).toBe(true);
  });

  it("drops the rotation handles of ellipse and rectangle annotations only", () => {
    const rotation = BoxEditor.Flag.RotateCorners | BoxEditor.Flag.RotateHandle;
    const ellipse = new EllipseAnnotationEditor(new EllipseAnnotation() as never);
    const rectangle = new RectangleAnnotationEditor(new RectangleAnnotation() as never);
    const arrow = new ArrowAnnotationEditor(new ArrowAnnotation() as never);
    expect(new EllipseEditor(new EllipseAnnotation() as never)._flags & rotation).toBe(rotation);
    expect(ellipse._flags & rotation).toBe(0);
    expect(rectangle._flags & rotation).toBe(0);
    expect(arrow._flags & rotation).toBe(rotation);
  });

  it("hides the editor while the scene hides annotations", () => {
    const annotation = new RectangleAnnotation();
    const editor = new RectangleAnnotationEditor(annotation as never) as unknown as AnyEditor;
    editor.setFlag(BoxEditor.Flag.Selected);
    const shown = { configuration: { isElementAnnotationsVisible: () => true } };
    const hidden = { configuration: { isElementAnnotationsVisible: () => false } };
    expect(editor._showEditor(shown)).toBe(true);
    expect(editor._showEditor(hidden)).toBe(false);
    expect(editor._showEditor()).toBe(true);
  });

  it("shows no point handles on pencil, highlighter and comment annotations", () => {
    expect(
      (
        new PencilAnnotationEditor(new PencilAnnotation() as never) as unknown as AnyEditor
      )._showAnnotations(),
    ).toBe(false);
    expect(
      (
        new HighlighterAnnotationEditor(
          new HighlighterAnnotation() as never,
        ) as unknown as AnyEditor
      )._showAnnotations(),
    ).toBe(false);
    expect(
      (
        new CommentAnnotationEditor(new CommentAnnotation() as never) as unknown as AnyEditor
      )._showAnnotations(),
    ).toBe(false);
  });

  it("marks annotations removed in one named transaction", () => {
    const { scene, host, list } = setup();
    void scene;
    const first = new RectangleAnnotation();
    const second = new EllipseAnnotation();
    list.appendChild(first);
    list.appendChild(second);
    first.setFlag(NodeFlag.Selected);
    AnnotationEditor.removeAnnotations([first, second], list, "Delete", undefined, false);
    expect(first.getProperties(["rmd", "vis"])).toEqual([true, false]);
    expect(second.getProperties(["rmd", "vis"])).toEqual([true, false]);
    expect(first.hasFlag(NodeFlag.Selected)).toBe(false);
    expect(first.getParent()).toBe(list);
    expect(host.begins).toBe(1);
    expect(host.commits).toEqual([
      ["Delete", { nodes: [first, second], parent: list, type: "remove-synchronized-annotations" }],
    ]);
    // With `remove` they leave the list; without a transaction nothing is committed.
    AnnotationEditor.removeAnnotations([second], list, "Delete", false, true);
    expect(second.getParent()).toBeNull();
    expect(host.commits).toHaveLength(1);
  });
});

describe("GCommentAnnotationEditor", () => {
  it("always moves as with Shift held", () => {
    const editor = new CommentAnnotationEditor(new CommentAnnotation() as never);
    const base = vi.spyOn(PathEditor.prototype, "movePart").mockReturnValue(null);
    const at = new Point(1, 2);
    editor.movePart("id", null, at, new Transform(), null, false, false);
    expect(base).toHaveBeenCalledWith("id", null, at, expect.any(Transform), null, true, false);
  });

  it("has the bubble icon's box at half scale", () => {
    const comment = new CommentAnnotation();
    comment.setProperty("trf", new Transform(1, 0, 0, 1, 100, 200));
    const editor = new CommentAnnotationEditor(comment as never);
    const box = editor.getCustomBBox(new Transform(), false) as Rect;
    // Icon bounds 0..32 grown by 1, halved, then moved to (100, 200).
    expect([box.getX(), box.getY(), box.getWidth(), box.getHeight()]).toEqual([
      99.5, 199.5, 17, 17,
    ]);
  });
});

describe("GCommentAnnotationEditor painting", () => {
  /**
   * Paints the bubble of a comment at (100, 200) through a view transform
   * of scale 2 and offset (10, 20) into a recording canvas. The expected
   * calls were recorded in the old app (comment-annotation-paint.fixture.json).
   */
  function paint(options: {
    highlight?: boolean;
    hidden?: boolean;
    noVertices?: boolean;
    color?: string;
  }): unknown[][] {
    const { list } = setup();
    const comment = new CommentAnnotation();
    comment.setProperty("trf", new Transform(1, 0, 0, 1, 100, 200));
    list.appendChild(comment);
    const editor = ElementEditor.createEditor(comment) as CommentAnnotationEditor;
    if (options.highlight) editor.setFlag(BaseEditor.Flag.Highlighted);
    if (options.hidden) comment.setFlag(ElementFlag.Hidden);
    const calls: unknown[][] = [];
    const read = (source: VertexReader): number[][] => {
      const vertex = new Vertex();
      const out: number[][] = [];
      const round = (value: number) => Math.round(value * 1e6) / 1e6;
      if (source.rewindVertices(0))
        while (source.readVertex(vertex))
          out.push([vertex.command, round(vertex.x), round(vertex.y)]);
      return out;
    };
    const canvas = {
      putVertices: (source: VertexReader, align: unknown) =>
        calls.push(["putVertices", align, read(source)]),
      fillVertices: (...args: unknown[]) => calls.push(["fillVertices", ...args]),
    };
    const context = { canvas, highlightOutlineColor: "HL", selectionOutlineColor: "SEL" };
    editor._paintOutline(
      new Transform(2, 0, 0, 2, 10, 20),
      context as never,
      options.noVertices,
      (options.color ?? null) as never,
    );
    return calls;
  }

  /**
   * The old code passed 0 as the composite operator and the port passes
   * null; the paint canvas treats both as the default (SourceOver).
   */
  const expected = (calls: unknown[][]): unknown[][] =>
    calls.map((call) =>
      call[0] === "fillVertices" ? call.map((arg, i) => (i === 3 && arg === 0 ? null : arg)) : call,
    );

  it("fills the white inside, then the rim in the selection colour", () => {
    expect(paint({})).toEqual(expected(oldPaint.plain));
  });

  it("uses the highlight colour on a highlighted editor and a given colour first", () => {
    expect(paint({ highlight: true })).toEqual(expected(oldPaint.highlighted));
    expect(paint({ highlight: true, color: "C" })).toEqual(expected(oldPaint.color));
  });

  it("paints nothing with noVertices or for a hidden comment", () => {
    expect(oldPaint.noVertices).toEqual([]);
    expect(oldPaint.hidden).toEqual([]);
    expect(paint({ noVertices: true })).toEqual([]);
    expect(paint({ hidden: true })).toEqual([]);
  });
});
