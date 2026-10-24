import { CompoundPathEditor } from "../../editor/element-editors/compound-path-editor.ts";
import { PathBaseEditor } from "../../editor/element-editors/path-base-editor.ts";
import { PathEditor } from "../../editor/element-editors/path-editor.ts";
// The connector editor has no G name in the old app; importing it registers
// it for GConnector.
import "../../editor/element-editors/connector-editor.ts";

export const editorPathEditors = {
  GPathBaseEditor: PathBaseEditor,
  GPathEditor: PathEditor,
  GCompoundPathEditor: CompoundPathEditor,
};
