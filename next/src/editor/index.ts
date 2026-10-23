// Old: chunk.vendor.js module 53 (the editor barrel), as far as loading goes.
/**
 * Loads the editor with every element editor. Each element editor
 * registers itself for the element class it edits (ElementEditor.exports),
 * and GEditor finds a node's editor through that registry when the node
 * is selected; the old bundle loaded them all with the editor barrel.
 *
 * GEditor itself can't import them: several element editors import
 * editor.ts, some extend each other (GConnectorEditor extends
 * GPathEditor) and the scene and selection position editors read Editor
 * when their module loads, so importing them from editor.ts makes the
 * load order depend on which module is imported first. Importing
 * editor.ts first and the element editors after it, here, always works.
 * The app (and the parity document host) imports this module.
 */
import "./editor.ts";
import "./element-editors/compound-path-editor.ts";
import "./element-editors/compound-shape-editor.ts";
import "./element-editors/connector-editor.ts";
import "./element-editors/ellipse-editor.ts";
import "./element-editors/group-editor.ts";
import "./element-editors/image-editor.ts";
import "./element-editors/image-grid-editor.ts";
import "./element-editors/layer-editor.ts";
import "./element-editors/page-editor.ts";
import "./element-editors/path-base-editor.ts";
import "./element-editors/path-editor.ts";
import "./element-editors/polygon-editor.ts";
import "./element-editors/rectangle-editor.ts";
import "./element-editors/scene-editor.ts";
import "./element-editors/selection-position-editor.ts";
import "./element-editors/simple-shape-editor.ts";
import "./element-editors/slice-editor.ts";
import "./element-editors/symbol-editor.ts";
import "./element-editors/text-editor.ts";
export { Editor } from "./editor.ts";
