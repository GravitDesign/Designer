// Old: designer.browser.dev.js module 1491 (GDesigner._applyTouchEditorOptions and
// _applyDefaultEditorOptions).
/**
 * The handle look of the touch and the desktop layout: handle sizes scaled
 * by the screen DPI, pick distances, the transform box and the handle
 * icons, in the old order of assignments.
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Rect } from "../../engine/math/rect.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { PaintContext } from "../../engine/paint/paint-context.ts";
import { EditorOptions } from "../../editor/editor-options.ts";
import { TransformBox } from "../../editor/element-editors/transform-box.ts";
import { PreserveAspectRatioAnnotation } from "../../editor/handles/preserve-aspect-ratio-annotation.ts";
import { RotateAnnotation } from "../../editor/handles/rotate-annotation.ts";
import { SkewHorizontalAnnotation } from "../../editor/handles/skew-horizontal-annotation.ts";
import { SkewVerticalAnnotation } from "../../editor/handles/skew-vertical-annotation.ts";
import { SelectTool } from "../../editor/tools/select-tool.ts";

/** The handle look of the touch layout. */
export function applyTouchEditorOptions(): void {
  const dpi = PaintCanvas.getScreenDPI();
  const options = EditorOptions as unknown as Record<string, unknown>;
  const handles = EditorOptions.annotationHandles as unknown as Record<
    string,
    Record<string, unknown>
  >;
  const h = (name: string): Record<string, unknown> => handles[name] as Record<string, unknown>;
  options.distanceHelperBehaviour = SelectTool._DistanceHelperBehaviour.Click;
  options.resizeHandlesInDetailMode = false;
  options.rotateHandleInDetailMode = false;
  (handles as unknown as Record<string, unknown>).suppressRedundantCorners = true;
  h("gradient").size = 16 * dpi;
  h("gradient").sizeBig = 20 * dpi;
  h("preserveAspectRatio").side = Rect.Side.BOTTOM_RIGHT;
  (h("tranformBox").skew as Record<string, unknown>).enabled = true;
  (h("tranformBox").rotate as Record<string, unknown>).enabled = true;
  h("preserveAspectRatio").enabled = true;
  PaintContext.prototype.transformBoxOutlineColor = PaintContext.prototype.selectionOutlineColor;
  TransformBox.OUTSIDE_TOLERANCE = 0;
  options.annotPickDistance = 4;
  options.pickDistance = 20;
  Object.assign(h("tranformBox"), {
    size: 23 * dpi,
    outlineWidth: 3 * dpi,
    pivotSize: 23 * dpi,
    pivotOutlineWidth: 3 * dpi,
    outsideStroke: true,
    shadowColor: "transparent",
  });
  options.rotateHandle = "bottom";
  Object.assign(h("rotate"), {
    size: 23 * dpi,
    iconSize: 23 * dpi,
    outlineWidth: dpi,
    shadowColor: "transparent",
    distance: 46 * dpi,
  });
  Object.assign(h("resize"), {
    size: 23 * dpi,
    outlineWidth: 3 * dpi,
    outsideStroke: true,
    shadowColor: "transparent",
  });
  Object.assign(h("rectangle"), {
    size: 22 * dpi,
    outlineWidth: 4 * dpi,
    outsideStroke: true,
    shadowColor: "transparent",
    maxNumberOfDetailedSegments: 1,
  });
  Object.assign(h("polygon"), {
    size: 22 * dpi,
    outlineWidth: 4 * dpi,
    outsideStroke: true,
    shadowColor: "transparent",
    maxNumberOfDetailedSegments: 2,
  });
  Object.assign(h("ellipse"), {
    size: 22 * dpi,
    outlineWidth: 4 * dpi,
    outsideStroke: true,
    shadowColor: "transparent",
    maxNumberOfDetailedSegments: 2,
  });
  const path = h("path") as Record<string, Record<string, unknown>>;
  Object.assign(path.node as object, { size: 20 * dpi, outlineWidth: 2 * dpi });
  Object.assign(path.control as object, { size: 10 * dpi });
  SkewHorizontalAnnotation.setIconVisible(true);
  SkewVerticalAnnotation.setIconVisible(true);
  PreserveAspectRatioAnnotation.setIconVisible(true);
  RotateAnnotation.setIconVisible(true);
}

/** The handle look of the desktop layout. */
export function applyDefaultEditorOptions(): void {
  const dpi = PaintCanvas.getScreenDPI();
  const options = EditorOptions as unknown as Record<string, unknown>;
  const handles = EditorOptions.annotationHandles as unknown as Record<
    string,
    Record<string, unknown>
  >;
  const h = (name: string): Record<string, unknown> => handles[name] as Record<string, unknown>;
  options.distanceHelperBehaviour = SelectTool._DistanceHelperBehaviour.Default;
  options.resizeHandlesInDetailMode = true;
  options.rotateHandleInDetailMode = true;
  (handles as unknown as Record<string, unknown>).suppressRedundantCorners = false;
  h("gradient").size = 9 * dpi;
  h("gradient").sizeBig = 12 * dpi;
  SkewHorizontalAnnotation.setIconVisible(false);
  SkewVerticalAnnotation.setIconVisible(false);
  PreserveAspectRatioAnnotation.setIconVisible(false);
  RotateAnnotation.setIconVisible(false);
  PaintContext.prototype.transformBoxOutlineColor = new RGBColor([23, 104, 196]);
  TransformBox.OUTSIDE_TOLERANCE = 100;
  options.annotPickDistance = 0;
  options.pickDistance = 4;
  Object.assign(h("tranformBox"), {
    size: 10 * dpi,
    outlineWidth: null,
    pivotSize: null,
    pivotOutlineWidth: null,
    outsideStroke: false,
    shadowColor: null,
  });
  (h("tranformBox").skew as Record<string, unknown>).enabled = false;
  (h("tranformBox").rotate as Record<string, unknown>).enabled = false;
  h("preserveAspectRatio").enabled = false;
  options.rotateHandle = "top";
  Object.assign(h("rotate"), {
    size: 10 * dpi,
    outlineWidth: null,
    shadowColor: null,
    distance: 16 * dpi,
  });
  Object.assign(h("resize"), {
    size: 10 * dpi,
    outlineWidth: null,
    outsideStroke: false,
    shadowColor: null,
  });
  for (const shape of ["rectangle", "polygon", "ellipse"])
    Object.assign(h(shape), {
      size: 8 * dpi,
      outlineWidth: null,
      outsideStroke: false,
      shadowColor: null,
    });
  const path = h("path") as Record<string, Record<string, unknown>>;
  Object.assign(path.node as object, { size: 10 * dpi, outlineWidth: null });
  Object.assign(path.control as object, { size: 6 * dpi });
}
