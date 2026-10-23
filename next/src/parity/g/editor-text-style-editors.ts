import { AngularGradientEditor } from "../../editor/element-editors/angular-gradient-editor.ts";
import { GradientStyleEditor } from "../../editor/element-editors/gradient-style-editor.ts";
import { InlineTextEditor } from "../../editor/element-editors/inline-text-editor.ts";
import { LinearGradientEditor } from "../../editor/element-editors/linear-gradient-editor.ts";
import { RadialGradientEditor } from "../../editor/element-editors/radial-gradient-editor.ts";
import { StyleEditor } from "../../editor/element-editors/style-editor.ts";
import { TextEditor } from "../../editor/element-editors/text-editor.ts";

export const editorTextStyleEditors = {
  GTextEditor: TextEditor,
  GInlineTextEditor: InlineTextEditor,
  GStyleEditor: StyleEditor,
  GGradientStyleEditor: GradientStyleEditor,
  GLinearGradientEditor: LinearGradientEditor,
  GRadialGradientEditor: RadialGradientEditor,
  GAngularGradientEditor: AngularGradientEditor,
};
