/**
 * The touch half of GDesigner now lives in the app: the touch targets,
 * the touch host, the long press and the touch handle look are set up by
 * src/app/shell/designer.ts (constructor, init, _windowEvent,
 * _updateEditorOptions). The touch scenarios need no hooks of their own;
 * the handle look is re-exported for code that applied it directly.
 */
export { applyTouchEditorOptions } from "../../app/shell/handle-options.ts";
