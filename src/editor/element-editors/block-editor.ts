// Old: chunk.vendor.js module 154 (GBlockEditor).
/**
 * The editor of a block (layers, pages, groups, shapes): the box is the
 * element's source box with its transform. A resize previews through the
 * element preview's pre-transform, so the box editor's handles follow the
 * preview. The program lock (`plkt`) takes away the resize handles
 * (NoSizeChanges) or the rotation handle and corners (NoMove) when the
 * editor is created.
 */
import type { Color } from "../../engine/color/color.ts";
import { registerClass } from "../../engine/core/object.ts";
import { uuid } from "../../engine/core/util.ts";
import { VertexPixelAligner } from "../../engine/geometry/vertex-pixel-aligner.ts";
import { VertexSource, type VertexReader } from "../../engine/geometry/vertex-source.ts";
import { VertexTransformer } from "../../engine/geometry/vertex-transformer.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Block } from "../../engine/scene/block.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { Element } from "../../engine/scene/element.ts";
import { EditorOptions } from "../editor-options.ts";
import { BaseEditor, type EditorPaintContext } from "./base-editor.ts";
import { BoxEditor, type EdTransformOptions } from "./box-editor.ts";
import { ElementEditor, type EditedElement } from "./element-editor.ts";

/** What the block editor asks of a label holder element (GBlock.LabelHolder). */
interface LabelElement {
  _getLabelGeometryBBox(): Rect | null;
  getScene(): unknown;
  isScaleLabel(): boolean;
  getScaleLabelFactor(): number;
}

/**
 * GBlockEditor.LabelHolder: the label box over a page or symbol, for the
 * editors of label holders (page and symbol editors mix it in).
 */
export const LabelHolder = {
  LABEL_PART_ID: uuid(),

  /** The label box in view coordinates (with `transform`) or scene coordinates. */
  _getLabelBBox(this: ElementEditor, transform: Transform | null): Rect | null {
    const element = this.getElement() as unknown as LabelElement;
    const box = element._getLabelGeometryBBox();
    let label: Rect | null = null;
    if (box) {
      const scene = element.getScene() as { getLabelBBox(scale: number): Rect };
      const scale = element.isScaleLabel()
        ? (transform as Transform).getScaleFactor()
        : element.getScaleLabelFactor();
      const height = scene.getLabelBBox(scale).getHeight();
      label = new Rect(box.getX(), box.getY() - height - 1, box.getWidth(), height + 1);
      if (transform) return transform.mapRect(label);
    }
    return label;
  },
};

/** The scene's element editor, as the block editor asks it (GSceneEditor). */
interface TransformBoxOwner {
  isTransformBoxActive(): boolean;
}

export class BlockEditor<E extends EditedElement = EditedElement> extends ElementEditor<E> {
  static {
    registerClass(this, "GBlockEditor");
  }

  static LabelHolder = LabelHolder;

  /** Set while painting: the box follows the preview instead of the element. */
  declare _usePaintElement: boolean;

  constructor(element: E) {
    super(element);
    if ((element.getProperty("plkt") as number) & Block.ProgramLck.NoSizeChanges) {
      this._flags = this._flags & ~BoxEditor.Flag.ResizeAll;
    }
    if ((element.getProperty("plkt") as number) & Block.ProgramLck.NoMove) {
      this._flags = this._flags & ~(BoxEditor.Flag.RotateCorners | BoxEditor.Flag.RotateHandle);
    }
  }

  /** Builds `_elementPreview` for a box transform; blocks without a preview do nothing. */
  createElementPreview(): void {}

  override getBox(): Rect | null {
    const element = this._usePaintElement ? this.getPaintElement() : this._element;
    let box = element.getSourceBBox();
    if (!box || box.isEmpty()) box = element.getGeometryBBox();
    return box;
  }

  override getBoxTransform(): Transform | null {
    const element = this._usePaintElement ? this.getPaintElement() : this._element;
    const source = element.getSourceBBox();
    return element.hasMixin(Element.Transform) && source && !source.isEmpty()
      ? element.getTransform()
      : null;
  }

  override transformBox(transform: Transform, options?: EdTransformOptions | null): void {
    const source = this._element.getSourceBBox();
    if (source && !source.isEmpty()) {
      this.createElementPreview();
      if (options) this._storedMoveData = options.storedMoveData;
      const preview = this.getPaintElement();
      this._setPreTransform(transform);
      preview.assignPreTransformFrom(transform, this._element);
      this.requestInvalidation();
    } else this.edTransform(transform, null, null, options);
  }

  override paint(transform: Transform, context: EditorPaintContext): void {
    const previous = this._usePaintElement;
    this._usePaintElement = true;
    BoxEditor.prototype.paint.call(this, transform, context);
    this._usePaintElement = previous;
  }

  _setPreTransform(transform: Transform | null): void {
    if (!Transform.equals(this._preTransform, transform)) {
      if (this.hasFlag(BaseEditor.Flag.Outline)) this.requestInvalidation();
      else this.setOutlineTmpFlag();
      this._preTransform = transform;
      this.requestInvalidation();
    }
  }

  override resetTransform(): void {
    this._preTransform = null;
    super.resetTransform();
  }

  /** A resize or rotation by the box handles is applied as a transform. */
  override _applyPartMove(
    partId: unknown,
    partData: unknown,
    option?: unknown,
    extra?: unknown,
  ): void {
    if (
      partId === BoxEditor.RESIZE_HANDLE_PART_ID ||
      partId === BoxEditor.ROTATION_HANDLE_PART_ID
    ) {
      if (this.canApplyTransform()) {
        this._prepareApplyTransform(this._element);
        this._applyTransform(
          this._element,
          partId === BoxEditor.ROTATION_HANDLE_PART_ID,
          extra,
          option,
        );
      } else this.resetTransform();
    }
    super._applyPartMove(partId, partData, option, extra);
  }

  override _showEditor(context?: EditorPaintContext): boolean {
    return super._showEditor(context) || this.hasFlag(BaseEditor.Flag.Highlighted);
  }

  override _showOutline(): boolean {
    return true;
  }

  /**
   * Outlines the element's own vertices (pixel aligned); elements without
   * vertices, a forced box outline (`noVertices`) and hidden elements
   * outside the transform box get the box outline.
   */
  override _paintOutline(
    transform: Transform,
    context: EditorPaintContext,
    noVertices: unknown,
    color: Color | null,
    baseTransform?: Transform | null,
  ): void {
    const element = this.getPaintElement();
    const sceneEditor = ElementEditor.getEditor(
      this._element.getScene(),
    ) as unknown as TransformBoxOwner | null;
    const transformBoxActive = !!sceneEditor && sceneEditor.isTransformBoxActive();
    if (
      !element.hasMixin(VertexSource) ||
      noVertices ||
      (!transformBoxActive && this._element.hasFlag(ElementFlag.Hidden))
    ) {
      BoxEditor.prototype._paintOutline.call(this, transform, context, true, color, baseTransform);
    } else {
      const transformed = new VertexTransformer(element as unknown as VertexReader, transform);
      const aligned = new VertexPixelAligner(transformed);
      if (aligned) {
        const canvas = context.canvas as NonNullable<EditorPaintContext["canvas"]>;
        canvas.putVertices(aligned, false);
        canvas.strokeVertices(
          color ||
            (this.hasFlag(BaseEditor.Flag.Highlighted)
              ? context.highlightOutlineColor
              : context.selectionOutlineColor),
          EditorOptions.outlineWidth,
        );
      }
    }
  }

  override toString(): string {
    return "[Object GBlockEditor]";
  }
}

BlockEditor.prototype._usePaintElement = false;
