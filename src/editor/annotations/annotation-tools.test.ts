import { afterEach, describe, expect, it, vi } from "vitest";
import { hasMixin } from "../../engine/core/object.ts";
import { Point } from "../../engine/math/point.ts";
import { ArrowAnnotation } from "../../engine/scene/annotations/arrow-annotation.ts";
import { CommentAnnotation } from "../../engine/scene/annotations/comment-annotation.ts";
import { EllipseAnnotation } from "../../engine/scene/annotations/ellipse-annotation.ts";
import { HighlighterAnnotation } from "../../engine/scene/annotations/highlighter-annotation.ts";
import { PencilAnnotation } from "../../engine/scene/annotations/pencil-annotation.ts";
import { RectangleAnnotation } from "../../engine/scene/annotations/rectangle-annotation.ts";
import { TextAnnotation } from "../../engine/scene/annotations/text-annotation.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Cursor } from "../cursor.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { FreehandTool } from "../tools/freehand-tool.ts";
import type { ShapeTool } from "../tools/shape-tool.ts";
import type { ToolManager } from "../tools/tool-manager.ts";
import { AnnotationTool } from "./annotation-tool.ts";
import { ArrowAnnotationTool } from "./arrow-annotation-tool.ts";
import { CommentAnnotationTool } from "./comment-annotation-tool.ts";
import { EllipseAnnotationTool } from "./ellipse-annotation-tool.ts";
import { HighlighterAnnotationTool } from "./highlighter-annotation-tool.ts";
import { PencilAnnotationTool } from "./pencil-annotation-tool.ts";
import { RectangleAnnotationTool } from "./rectangle-annotation-tool.ts";
import { TextAnnotationTool } from "./text-annotation-tool.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("annotation tools", () => {
  it("create their annotation class and show their cursor", () => {
    const cases: [{ _getRelatedItemClass(): unknown; getCursor(): unknown }, unknown, string][] = [
      [new EllipseAnnotationTool(), EllipseAnnotation, Cursor.CrossEllipse],
      [new RectangleAnnotationTool(), RectangleAnnotation, Cursor.CrossRectangle],
      [new ArrowAnnotationTool(), ArrowAnnotation, Cursor.CrossArrow],
      [new CommentAnnotationTool(), CommentAnnotation, Cursor.Comment],
      [new PencilAnnotationTool(), PencilAnnotation, Cursor.CrossFreehand],
      [new HighlighterAnnotationTool(), HighlighterAnnotation, Cursor.CrossHighlight],
    ];
    for (const [tool, itemClass, cursor] of cases) {
      expect(tool._getRelatedItemClass()).toBe(itemClass);
      expect(tool.getCursor()).toBe(cursor);
      expect(hasMixin(tool, AnnotationTool)).toBe(true);
    }
    expect(new TextAnnotationTool()._getRelatedItemClass()).toBe(TextAnnotation);
    expect(String(new HighlighterAnnotationTool())).toBe("[Object GHighlighterAnnotationTool]");
  });

  it("tag their insert transaction as an added annotation, except the text tool", () => {
    const tool = new RectangleAnnotationTool();
    const shape = new RectangleAnnotation();
    const parent = { id: "list" } as unknown as Node;
    expect(tool.getAdditionalTransactionData(shape, parent)).toEqual({
      nodes: [shape],
      parent: parent,
      type: "add-synchronized-annotations",
    });
    const text = new TextAnnotationTool();
    expect(hasMixin(text, AnnotationTool)).toBe(false);
    expect(text.getAdditionalTransactionData(new TextAnnotation(), parent)).toBeNull();
  });

  it("hide the position hint of the shape tools", () => {
    expect(new EllipseAnnotationTool()._showMousePositionInlineHint()).toBe(false);
    expect(new RectangleAnnotationTool()._showMousePositionInlineHint()).toBe(false);
    expect(new ArrowAnnotationTool()._showMousePositionInlineHint()).toBe(false);
    expect(new CommentAnnotationTool()._showAreaInlineHint()).toBe(true);
  });
});

describe("GCommentAnnotationTool", () => {
  it("places the bubble at a click and ignores drags", () => {
    const tool = new CommentAnnotationTool();
    const insert = vi.spyOn(tool as unknown as ShapeTool, "_insertShape").mockReturnValue(true);
    expect(tool._createShape()).toBeNull();
    tool._mouseDragStart(null as never);
    expect(insert).not.toHaveBeenCalled();
    tool._createShapeManually(new Point(40, 50));
    const comment = insert.mock.calls[0]?.[0] as unknown as CommentAnnotation;
    expect(comment).toBeInstanceOf(CommentAnnotation);
    // The icon's own placement, then moved by the click point.
    const icon = new CommentAnnotation();
    icon.initDefaultForLimitedRestore();
    icon.initSizeAndPosition();
    const at = (c: CommentAnnotation): Point =>
      (c.getProperty("trf") as { getTranslation(): Point }).getTranslation();
    expect(at(comment).getX() - at(icon).getX()).toBeCloseTo(40, 10);
    expect(at(comment).getY() - at(icon).getY()).toBeCloseTo(50, 10);
    // The bubble icon's anchor points.
    expect(comment.getAnchorPoints().getChildren().length).toBeGreaterThan(0);
  });
});

describe("pencil and highlighter annotation tools", () => {
  it("open the editor of an inserted annotation, or give null when it wasn't inserted", () => {
    const tool = new PencilAnnotationTool();
    let inserted: Node | null = null;
    const page = { scene: { id: "scene" } };
    (tool as unknown as { _editor: unknown })._editor = {
      insertElements: (nodes: Node[]) => {
        inserted = nodes[0] as Node;
      },
    };
    expect(tool._createAndAppendPath()).toBeNull();
    expect(inserted).toBeInstanceOf(PencilAnnotation);
    vi.spyOn(PencilAnnotation.prototype, "getScene").mockReturnValue(page.scene as never);
    const editor = { id: "editor" };
    const open = vi.spyOn(ElementEditor, "openEditor").mockReturnValue(editor as never);
    const created = tool._createAndAppendPath();
    expect(created).toBeInstanceOf(PencilAnnotation);
    expect(open).toHaveBeenCalledWith(created);
    expect(tool._pathEditor).toBe(editor);
  });

  it("end the job after one stroke and ignore Esc and Enter", () => {
    const tool = new HighlighterAnnotationTool();
    const calls: string[] = [];
    tool._manager = {
      notifyJobDone: () => calls.push("done"),
      activateSubSelect: () => calls.push("subselect"),
    } as unknown as ToolManager;
    const release = vi.spyOn(FreehandTool.prototype, "_mouseRelease").mockImplementation(() => {
      calls.push("release");
    });
    tool._mouseRelease(null as never);
    expect(release).toHaveBeenCalled();
    expect(calls).toEqual(["release", "done"]);
    tool._escAction();
    tool._enterAction();
    expect(calls).toEqual(["release", "done"]);
  });
});
