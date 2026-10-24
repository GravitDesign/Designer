// Old: chunk.vendor.js module 155 (GPathBaseEditor).
/**
 * The editor of anchor point based shapes (paths, rectangles, ellipses,
 * polygons). Point edits preview on a plain GPathBase copy of the anchor
 * points (getPathBasePreview); a box transform previews on the element
 * preview and takes the styled corners along.
 */
import { registerClass } from "../../engine/core/object.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { NodeChange, NodeFlag } from "../../engine/scene/node-change.ts";
import type { Node } from "../../engine/scene/node.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import { BaseEditor, type EditorPaintContext } from "./base-editor.ts";
import type { EdTransformOptions } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { ShapeEditor, type EditedShape } from "./shape-editor.ts";

/** A path base as its editor drives it. */
export type EditedPathBase = EditedShape & PathBase;

const ExtendingMode = {
  Off: null,
  Beginning: 1,
  End: 2,
} as const;

export class PathBaseEditor<E extends EditedPathBase = EditedPathBase> extends ShapeEditor<E> {
  static {
    registerClass(this, "GPathBaseEditor");
    ElementEditor.exports(this, PathBase);
  }

  static ExtendingMode = ExtendingMode;

  /** Whether the catch handle shows (see GItemEditor). */
  declare _catchHandle: boolean;

  constructor(element: E) {
    super(element);
    // The old constructor set it before GShapeEditor's ran.
    this._catchHandle = true;
  }

  /** A box transform also transforms the styled corners of the preview. */
  override transformBox(transform: Transform, options?: EdTransformOptions | null): void {
    super.transformBox(transform, options);
    if (transform && !transform.isIdentity()) {
      const source = this._element.getSourceBBox();
      if (source && !source.isEmpty()) {
        const preview = this.getPaintElement();
        this._element.transformStyledCorners(preview, transform);
      }
    }
  }

  /** Previews `transform` on the element preview (with the styled corners) instead of `_transform`. */
  override edTransform(
    transform: Transform,
    partId?: unknown,
    partData?: unknown,
    options?: unknown,
  ): void {
    if (!this._elementPreview) this.createElementPreview();
    if (this.hasFlag(BaseEditor.Flag.Outline)) this.requestInvalidation();
    else this.setOutlineTmpFlag();
    if (options) this._storedMoveData = (options as EdTransformOptions).storedMoveData;
    const own = this._element.getProperty("trf") as Transform | null;
    const combined = own ? own.multiplied(transform) : transform;
    const preview = this._elementPreview as E;
    preview.setTransform(combined);
    this._element.transferStyledCorners(preview);
    this._element.transformStyledCorners(preview, transform);
    this._setTransform(null);
    this.requestInvalidation();
  }

  /** With a preview the outline follows it, painted with the untransformed `baseTransform`. */
  override _paintOutline(
    transform: Transform,
    context: EditorPaintContext,
    noVertices: unknown,
    color: Parameters<ShapeEditor["_paintOutline"]>[3],
    baseTransform?: Transform | null,
  ): void {
    if (!noVertices && this._elementPreview && baseTransform) {
      super._paintOutline(baseTransform, context, noVertices, color);
    } else super._paintOutline(transform, context, noVertices, color);
  }

  /**
   * The point edit preview: a GPathBase with copies of the anchor points
   * (geometry and Selected flag), made on first use.
   */
  getPathBasePreview(): PathBase {
    if (!this._elementPreview) {
      const points = this._element.getAnchorPoints();
      this._setElementPreview(new PathBase() as unknown as E);
      const previewPoints = (this._elementPreview as unknown as PathBase).getAnchorPoints();
      previewPoints._beginBlockChanges([NodeChange.BeforeChildInsert, NodeChange.AfterChildInsert]);
      for (
        let point = points.getFirstChild() as AnchorPoint | null;
        null != point;
        point = point.getNext() as AnchorPoint | null
      ) {
        const copy = new AnchorPoint();
        copy.transferProperties(point, [AnchorPoint.GeometryProperties]);
        if (point.hasFlag(NodeFlag.Selected)) copy.setFlag(NodeFlag.Selected);
        previewPoints.appendChild(copy);
      }
      previewPoints._endBlockChanges([NodeChange.BeforeChildInsert, NodeChange.AfterChildInsert]);
    }
    return this._elementPreview as unknown as PathBase;
  }

  releasePathBasePreview(): void {
    this._setElementPreview(null);
  }

  /** The preview's copy of anchor point `point` of the element, or null. */
  getPointPreview(point: Node): AnchorPoint | null {
    if (point.getParent() == this._element.getAnchorPoints()) {
      this.requestInvalidation();
      const index = (
        point.getParent() as Node & { getIndexOfChild(child: Node): number }
      ).getIndexOfChild(point);
      return this.getPathBasePreview()
        .getAnchorPoints()
        .getChildByIndex(index) as AnchorPoint | null;
    }
    return null;
  }

  override _catchHandleAllowed(): boolean {
    return this._catchHandle;
  }

  setCatchHandle(allowed: unknown): void {
    this._catchHandle = !!allowed;
  }

  override toString(): string {
    return "[Object GPathBaseEditor]";
  }
}

PathBaseEditor.prototype._catchHandle = true;
