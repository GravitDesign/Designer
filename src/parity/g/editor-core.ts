import { ActionManager } from "../../editor/action-manager.ts";
import { Editor } from "../../editor/editor.ts";
import { EditorOptions } from "../../editor/editor-options.ts";
import { EditorPaintConfiguration } from "../../editor/editor-paint-configuration.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { EditorAnnotation } from "../../editor/handles/editor-annotation.ts";
import { PreserveAspectRatioAnnotation } from "../../editor/handles/preserve-aspect-ratio-annotation.ts";
import { RotateAnnotation } from "../../editor/handles/rotate-annotation.ts";
import { SkewHorizontalAnnotation } from "../../editor/handles/skew-horizontal-annotation.ts";
import { SkewVerticalAnnotation } from "../../editor/handles/skew-vertical-annotation.ts";
import { StyleEdManager } from "../../editor/style-ed-manager.ts";

// The names of the old editor barrel (chunk.vendor.js module 53). The
// harness's G is the engine barrel (module 1), which has none of them,
// so scenarios reach the editor through app hooks.
export const editorCore = {
  GEditor: Editor,
  GEditorOptions: EditorOptions,
  GEditorAnnotation: EditorAnnotation,
  GRotateAnnotation: RotateAnnotation,
  GPreserveAspectRatioAnnotation: PreserveAspectRatioAnnotation,
  GSkewHorizontalAnnotation: SkewHorizontalAnnotation,
  GSkewVerticalAnnotation: SkewVerticalAnnotation,
  GEditorPaintConfiguration: EditorPaintConfiguration,
  GEditorWorkspace: EditorWorkspace,
  GStyleEdManager: StyleEdManager,
  GActionManager: ActionManager,
};
