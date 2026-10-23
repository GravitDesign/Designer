// Old: chunk.vendor.js module 1236 (SVG masks and clip paths of the exporter).
import { uuid } from "../../../engine/core/util.ts";
import { SVG_NAMESPACE, SvgElement, type SvgDocument, type SvgNode } from "./svg-dom.ts";
import type { SvgRenderContext } from "./svg-images.ts";
import { SvgUtil } from "./svg-util.ts";

/** What the mask helpers read while unfolding a nested canvas (see SvgExport.processPath). */
export interface MaskState {
  isMask: boolean;
  isInverse?: boolean;
  maskTarget: SvgElement | null;
}

/** Calls `fn` for each entry of a live child list, its length read once (jQuery.each). */
function eachChild(list: SvgNode[], fn: (child: SvgElement) => void): void {
  const length = list.length;
  for (let i = 0; i < length; i++) fn(list[i] as SvgElement);
}

export const SvgMasks = {
  /**
   * Moves `shape` into a new mask in front of `target` and masks `target`
   * with it. `inverse` masks out the shape (white everywhere, the shape
   * black); `dropTransform` removes the shape's transform.
   */
  createMask(
    context: SvgRenderContext,
    shape: SvgElement,
    target: SvgElement,
    inverse?: boolean,
    dropTransform?: boolean,
  ): void {
    const id = "_mask_" + uuid();
    const mask = context.createSvgElement("mask");
    mask.setAttribute("id", id);
    mask.appendChild(shape);
    (target.parentNode as SvgElement).insertBefore(mask, target);
    target.setAttribute("mask", SvgUtil.createIdUrl(id));
    if (inverse) {
      shape.setAttribute("fill", "black");
      shape.setAttribute("stroke", "none");
      let x: string;
      let y: string;
      let width: string;
      let height: string;
      const background = context.createSvgElement("rect");
      if (context.globalOffset.x || context.globalOffset.y) {
        x = -context.globalOffset.x + "";
        y = -context.globalOffset.y + "";
        width = "100%";
        height = "100%";
      } else {
        x = "-200%";
        y = "-200%";
        width = "400%";
        height = "400%";
      }
      background.setAttribute("x", x);
      background.setAttribute("y", y);
      background.setAttribute("width", width);
      background.setAttribute("height", height);
      background.setAttribute("style", "fill:white;");
      mask.insertBefore(background, shape);
      mask.setAttribute("x", "-200%");
      mask.setAttribute("y", "-200%");
      mask.setAttribute("width", "400%");
      mask.setAttribute("height", "400%");
    } else {
      shape.setAttribute("fill", "white");
      shape.setAttribute("stroke", "none");
    }
    if (dropTransform) shape.removeAttribute("transform");
  },

  /**
   * Turns `group` into the mask of its former siblings: every other child
   * of the parent gets the mask, the group moves into it. A
   * destination-out mask starts with a white rect and inverts the paths.
   */
  createMaskDefinition(
    document: SvgDocument,
    operation: string,
    group: SvgElement,
    state: MaskState,
  ): void {
    const id = "_mask_" + uuid();
    const mask = document.createElementNS(SVG_NAMESPACE, "mask");
    mask.setAttribute("id", id);
    const parent = group.parentNode as SvgElement;
    parent.removeChild(group);
    eachChild(parent.childNodes, (child) => {
      child.setAttribute("mask", "url(#" + id + ")");
    });
    parent.appendChild(mask);
    mask.appendChild(group);
    state.isMask = true;
    if ("destination-out" === operation) {
      state.isInverse = true;
      const rect = document.createElementNS(SVG_NAMESPACE, "rect");
      rect.setAttribute("x", "0");
      rect.setAttribute("y", "0");
      rect.setAttribute("width", "100%");
      rect.setAttribute("height", "100%");
      rect.setAttribute("style", "fill:white;");
      mask.insertBefore(rect, group);
    } else state.isInverse = false;
  },

  filterElementsUsedForMasking(element: SvgElement): SvgElement[] {
    return SvgUtil.filterClipPathElements(element);
  },

  /**
   * A `<clipPath>` made of the shapes and texts of a deep copy of `shape`
   * (masks dropped). The copy's styles get white fills (and white or black
   * strokes), which only matters for a copy that is itself one of the
   * shapes.
   */
  createMaskDefinitionFromShape(
    document: SvgDocument,
    shape: SvgElement,
    whiteStroke: boolean,
  ): SvgElement {
    const id = "_clipPath_" + uuid();
    const clipPath = document.createElementNS(SVG_NAMESPACE, "clipPath");
    clipPath.setAttribute("id", id);
    const copy = shape.cloneNode(true);
    SvgUtil.removeDefs(copy);
    const shapes = SvgMasks.filterElementsUsedForMasking(copy);
    for (const element of shapes) clipPath.appendChild(element);
    if (whiteStroke) SvgUtil.replaceFillAndStroke(copy, "white", "white");
    else SvgUtil.replaceFillAndStroke(copy, "white", "black");
    return clipPath;
  },

  /** Masks `group` with white copies of its paths (a path with children, e.g. a compound path). */
  createClipPath(_element: unknown, group: SvgElement): void {
    const document = group.ownerDocument as SvgDocument;
    const id = "_mask_" + uuid();
    const mask = document.createElementNS(SVG_NAMESPACE, "mask");
    mask.setAttribute("id", id);
    eachChild(group.childNodes, (child) => {
      if (child instanceof SvgElement && "path" === child.tagName) {
        const copy = child.cloneNode(true);
        let style = copy.getAttribute("style");
        if (style) {
          style = style.replace(/fill:[^;]+/, "fill:white");
          style = style.replace(/stroke:[^;]+/, "stroke:white");
          copy.setAttribute("style", style);
        }
        mask.appendChild(copy);
      }
    });
    (group.parentNode as SvgElement).insertBefore(mask, group);
    group.setAttribute("mask", "url(#" + id + ")");
  },
};
