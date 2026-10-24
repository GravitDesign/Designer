import { AnnotationEditor } from "../../editor/annotations/annotation-editor.ts";
import { AnnotationTool } from "../../editor/annotations/annotation-tool.ts";
import { ArrowAnnotationEditor } from "../../editor/annotations/arrow-annotation-editor.ts";
import { ArrowAnnotationTool } from "../../editor/annotations/arrow-annotation-tool.ts";
import { CommentAnnotationEditor } from "../../editor/annotations/comment-annotation-editor.ts";
import { CommentAnnotationTool } from "../../editor/annotations/comment-annotation-tool.ts";
import { EllipseAnnotationEditor } from "../../editor/annotations/ellipse-annotation-editor.ts";
import { EllipseAnnotationTool } from "../../editor/annotations/ellipse-annotation-tool.ts";
import { HighlighterAnnotationEditor } from "../../editor/annotations/highlighter-annotation-editor.ts";
import { HighlighterAnnotationTool } from "../../editor/annotations/highlighter-annotation-tool.ts";
import { PencilAnnotationEditor } from "../../editor/annotations/pencil-annotation-editor.ts";
import { PencilAnnotationTool } from "../../editor/annotations/pencil-annotation-tool.ts";
import { RectangleAnnotationEditor } from "../../editor/annotations/rectangle-annotation-editor.ts";
import { RectangleAnnotationTool } from "../../editor/annotations/rectangle-annotation-tool.ts";
import { TextAnnotationEditor } from "../../editor/annotations/text-annotation-editor.ts";
import { TextAnnotationTool } from "../../editor/annotations/text-annotation-tool.ts";
import { PathsGraphEditor } from "../../editor/paths-graph/paths-graph-editor.ts";
import { PathsGraphTool } from "../../editor/paths-graph/paths-graph-tool.ts";

export const editorPathsGraphAnnotations = {
  GPathsGraphEditor: PathsGraphEditor,
  GPathsGraphTool: PathsGraphTool,
  GAnnotationEditor: AnnotationEditor,
  GAnnotationTool: AnnotationTool,
  GEllipseAnnotationEditor: EllipseAnnotationEditor,
  GEllipseAnnotationTool: EllipseAnnotationTool,
  GRectangleAnnotationEditor: RectangleAnnotationEditor,
  GRectangleAnnotationTool: RectangleAnnotationTool,
  GArrowAnnotationEditor: ArrowAnnotationEditor,
  GArrowAnnotationTool: ArrowAnnotationTool,
  GCommentAnnotationEditor: CommentAnnotationEditor,
  GCommentAnnotationTool: CommentAnnotationTool,
  GPencilAnnotationEditor: PencilAnnotationEditor,
  GPencilAnnotationTool: PencilAnnotationTool,
  GHighlighterAnnotationEditor: HighlighterAnnotationEditor,
  GHighlighterAnnotationTool: HighlighterAnnotationTool,
  GTextAnnotationEditor: TextAnnotationEditor,
  GTextAnnotationTool: TextAnnotationTool,
};
