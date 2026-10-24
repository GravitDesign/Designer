import { ActionItem } from "../../engine/scene/annotations/action-item.ts";
import { Actionable } from "../../engine/scene/annotations/actionable.ts";
import { Annotable } from "../../engine/scene/annotations/annotable.ts";
import { Annotation } from "../../engine/scene/annotations/annotation.ts";
import { AnnotationsList } from "../../engine/scene/annotations/annotations-list.ts";
import { ArrowAnnotation } from "../../engine/scene/annotations/arrow-annotation.ts";
import { CollabText } from "../../engine/scene/annotations/collab-text.ts";
import { CollaborativeTextAnnotation } from "../../engine/scene/annotations/collaborative-text-annotation.ts";
import { Comment } from "../../engine/scene/annotations/comment.ts";
import { CommentAnnotation } from "../../engine/scene/annotations/comment-annotation.ts";
import { EllipseAnnotation } from "../../engine/scene/annotations/ellipse-annotation.ts";
import { EmptyAnnotation } from "../../engine/scene/annotations/empty-annotation.ts";
import { HighlighterAnnotation } from "../../engine/scene/annotations/highlighter-annotation.ts";
import { PencilAnnotation } from "../../engine/scene/annotations/pencil-annotation.ts";
import { RectangleAnnotation } from "../../engine/scene/annotations/rectangle-annotation.ts";
import { TextAnnotation } from "../../engine/scene/annotations/text-annotation.ts";

export const engineAnnotationsModel = {
  GCollabText: CollabText,
  GCollaborativeTextAnnotation: CollaborativeTextAnnotation,
  GActionable: Actionable,
  GAnnotable: Annotable,
  GActionItem: ActionItem,
  GComment: Comment,
  GAnnotation: Annotation,
  GAnnotationsList: AnnotationsList,
  GEmptyAnnotation: EmptyAnnotation,
  GTextAnnotation: TextAnnotation,
  GHighlighterAnnotation: HighlighterAnnotation,
  GPencilAnnotation: PencilAnnotation,
  GCommentAnnotation: CommentAnnotation,
  GArrowAnnotation: ArrowAnnotation,
  GRectangleAnnotation: RectangleAnnotation,
  GEllipseAnnotation: EllipseAnnotation,
};
