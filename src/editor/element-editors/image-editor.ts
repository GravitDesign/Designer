// Old: chunk.vendor.js module 329 (GImageEditor).
/**
 * The editor of an image. Besides the rectangle editor's handles it has an
 * edit (crop) mode: the element's box becomes the crop frame with angle
 * and bar shaped crop handles, and an inner box editor (ImageBoxEditor,
 * slice green, behind the frame) moves and resizes the bitmap through the
 * image transform (`itrf`). Dragging inside the frame or the bitmap moves
 * the bitmap (IMAGEINTERNAL_PART_ID); dragging the frame outline moves the
 * frame (CROPFRAME_PART_ID).
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { registerClass } from "../../engine/core/object.ts";
import { uuid } from "../../engine/core/util.ts";
import { HitResult } from "../../engine/geometry/hit-result.ts";
import { VertexContainer } from "../../engine/geometry/vertex-container.ts";
import { VertexInfo } from "../../engine/geometry/vertex-info.ts";
import type { VertexReader } from "../../engine/geometry/vertex-source.ts";
import { VertexTransformer } from "../../engine/geometry/vertex-transformer.ts";
import { Vertex } from "../../engine/geometry/vertex.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect, type RectSide } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { Image } from "../../engine/scene/image.ts";
import type { Node } from "../../engine/scene/node.ts";
import { PathBase } from "../../engine/scene/path-base.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { BaseEditor, PartInfo, type EditorPaintContext, type EditorHost } from "./base-editor.ts";
import { BoxEditor, type EdTransformOptions } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { RectangleEditor, type EditedRectangle } from "./rectangle-editor.ts";

/** An image as its editor drives it. */
export type EditedImage = EditedRectangle & Image;

/** Guides as the crop drag snaps through them (GGuides). */
interface CropGuides {
  useExclusions(exclusions: unknown): void;
  beginMap(scopes: unknown): void;
  mapRect(rect: Rect): Rect;
  finishMap(): void;
}

/** A parent editor that knows the GEditor (the scene editor). */
interface GraphicEditorOwner {
  _getGraphicEditor(): { getMappingScopes(): unknown };
}

/** PartInfo data of the crop frame and bitmap drags. */
export interface CropPartData {
  point: Point;
  origTrf?: Transform | null;
}

type CropHandleVisitor = (
  vertices: VertexReader,
  point: Point,
  side: RectSide,
  segment: number | null,
) => unknown;

interface CropHandle {
  vertices: VertexReader;
  point: Point;
  side: RectSide;
}

const DPI = PaintCanvas.getScreenDPI();

/** The old code added Close vertices without coordinates. */
const NO_COORDINATE = undefined as unknown as number;

/**
 * GImageEditor.ImageBoxEditor: the box of the bitmap inside the crop frame
 * (image size with the image transform). A resize previews in
 * `_preTransform` and is applied to the image transform.
 */
export class ImageBoxEditor extends BoxEditor {
  static {
    registerClass(this, "GImageEditor.ImageBoxEditor");
  }

  declare _image: EditedImage;
  declare _preTransform: Transform | null;

  constructor(image: EditedImage) {
    super();
    this._image = image;
    this._flags |= BaseEditor.Flag.BackEditor;
    this._alignment = BoxEditor.OutlineAlignment.Outside;
    this.removeFlag(
      BoxEditor.Flag.ResizeAll | BoxEditor.Flag.RotateCorners | BoxEditor.Flag.RotateHandle,
    );
  }

  override getBox(): Rect | null {
    return new Rect(0, 0, this._image.getWidth(), this._image.getHeight());
  }

  override getBoxTransform(): Transform | null {
    return this._image.getImageTransform();
  }

  override getObjectNameModified(): string | null {
    return "Image";
  }

  override requestInvalidation(args?: unknown): void {
    if (this._image.getScene()) {
      (BaseEditor.getEditor(this._image.getScene()) as EditorHost).requestInvalidation(this, args);
    }
  }

  override _showOutline(): boolean {
    return true;
  }

  override transformBox(transform: Transform, options?: EdTransformOptions | null): void {
    const box = this.getBox();
    if (box && !box.isEmpty()) {
      this.requestInvalidation();
      if (options) this._storedMoveData = options.storedMoveData;
      this._preTransform = transform;
      this.requestInvalidation();
    } else this.edTransform(transform, null, null, options);
  }

  override _paintOutline(
    transform: Transform,
    context: EditorPaintContext,
    noVertices: unknown,
    color: Parameters<BoxEditor["_paintOutline"]>[3],
  ): void {
    const box = this.getBox();
    if (box) {
      let matrix = transform;
      const own = this.getBoxTransform();
      matrix = own ? own.multiplied(matrix) : matrix;
      matrix = this._preTransform ? this._preTransform.multiplied(matrix) : matrix;
      this._paintTransformedQuadrilateral(matrix, box, context, color);
    }
  }

  override _showRotationHandle(): boolean {
    return (
      this._showAnnotations() &&
      !!EditorOptions.resizeHandles &&
      this.hasFlag(BoxEditor.Flag.RotateHandle) &&
      !!EditorOptions.rotateHandle
    );
  }

  override getBBox(transform: Transform): Rect | null {
    if (this.hasFlag(BaseEditor.Flag.Selected)) {
      let matrix = transform;
      if (this._transform) matrix = this._transform.multiplied(transform);
      let box = this.getBox();
      if (box && !box.isEmpty()) {
        const own = this.getBoxTransform();
        if (own) matrix = own.multiplied(matrix);
        if (this._preTransform) matrix = this._preTransform.multiplied(matrix);
        box = matrix.mapRect(box);
        const custom = this.getCustomBBox(transform, false);
        if (custom) box = box.united(custom);
        const margin = this.getBBoxMargin();
        box = box.expanded(margin, margin, margin, margin);
      }
      return box;
    }
    return null;
  }

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
      if (this._preTransform && !this._preTransform.isIdentity()) {
        this._image.preTransformImage(this._preTransform);
        this._preTransform = null;
      } else if (this._transform && !this._transform.isIdentity()) {
        this._image.transformImage(this._transform);
      }
      this.resetTransform();
    }
    super._applyPartMove(partId, partData, option, extra);
  }
}
Object.assign(ImageBoxEditor.prototype, { _image: null, _preTransform: null });

export class ImageEditor<E extends EditedImage = EditedImage> extends RectangleEditor<E> {
  static {
    registerClass(this, "GImageEditor");
    ElementEditor.exports(this, Image);
  }

  /** Crop handle sizes in screen px (times the DPI at load). */
  static Annots = {
    Width: 5 * DPI,
    MiddleLength: 30 * DPI,
    AngleLength: 20 * DPI,
  };

  static IMAGEINTERNAL_PART_ID = uuid();
  static CROPFRAME_PART_ID = uuid();
  static ImageBoxEditor = ImageBoxEditor;

  declare _editMode: boolean;
  declare _imgBoxEditor: ImageBoxEditor | null | undefined;

  /** Images keep their own style. */
  override initialSetup(): void {}

  /** The crop frame preview: a rectangle of the source box. */
  override createElementPreview(): void {
    if (!this._elementPreview) {
      const box = this._element.getSourceBBox() as Rect;
      this._setElementPreview(
        new Rectangle(box.getX(), box.getY(), box.getWidth(), box.getHeight()) as unknown as E,
      );
      const preview = this._elementPreview as unknown as E;
      preview.transferProperties(this._element, [
        Shape.GeometryProperties,
        Rectangle.GeometryProperties,
        PathBase.MetaProperties,
      ]);
      preview.setProperty("csc", !this._editMode);
    }
  }

  override canApplyTransform(): unknown {
    return (
      (this._preTransform && this._preTransform.invertible()) ||
      (this._elementPreview && (this._elementPreview.getTransform() as Transform).invertible()) ||
      super.canApplyTransform()
    );
  }

  /** A box resize (pre-transform) goes through GImage.preTransform. */
  override _applyTransform(target: unknown, ...rest: unknown[]): void {
    if (this._preTransform && !this._preTransform.isIdentity()) {
      (target as E).preTransform(
        this._preTransform,
        rest[0] as boolean | null | undefined,
        rest[1] as readonly Node[] | false | null | undefined,
      );
      BoxEditor.prototype._applyTransform.call(this, undefined);
    } else ElementEditor.prototype._applyTransform.call(this, target, ...rest);
  }

  override hasSelectionEditing(): boolean {
    return true;
  }

  /**
   * Turns the crop mode on or off (`force` even when it already is). On
   * entering it with `applyCropDistance` and the option
   * imageCropDistance set, an uncropped image shrinks its frame by that
   * many view px (`zoom` converts) on each side, as one transaction.
   */
  setEditMode(
    editMode: boolean,
    force?: unknown,
    applyCropDistance?: unknown,
    zoom?: number,
  ): void {
    if (this._editMode === editMode && !force) return;
    this._editMode = editMode;
    this._element.setProperties(["dblMode", "csc"], [editMode, !editMode]);
    if (this._elementPreview) this._elementPreview.setProperty("csc", !this._editMode);
    if (this._editMode && !this._imgBoxEditor) {
      const own = this._element.getTransform();
      const imageTransform = this._element.getImageTransform();
      if (
        applyCropDistance &&
        EditorOptions.imageCropDistance &&
        ((!own && !imageTransform) || Transform.equals(own, imageTransform, 1e-11))
      ) {
        const box = this._element.getSourceBBox() as Rect;
        const frame = own;
        const scale = zoom || 1;
        const distance = EditorOptions.imageCropDistance / scale;
        let topLeft = box.getSide(Rect.Side.TOP_LEFT);
        let bottomLeft = box.getSide(Rect.Side.BOTTOM_LEFT);
        let bottomRight = box.getSide(Rect.Side.BOTTOM_RIGHT);
        if (frame) {
          topLeft = frame.mapPoint(topLeft);
          bottomLeft = frame.mapPoint(bottomLeft);
          bottomRight = frame.mapPoint(bottomRight);
        }
        const height = GMath.pointToLineDist(
          bottomLeft.getX(),
          bottomLeft.getY(),
          bottomRight.getX(),
          bottomRight.getY(),
          topLeft.getX(),
          topLeft.getY(),
        );
        const width = GMath.pointToLineDist(
          bottomLeft.getX(),
          bottomLeft.getY(),
          topLeft.getX(),
          topLeft.getY(),
          bottomRight.getX(),
          bottomRight.getY(),
        );
        if (height >= 3 * distance && width >= 3 * distance) {
          const scaleY = (height - 2 * distance) / height;
          const scaleX = (width - 2 * distance) / width;
          const center = box.getSide(Rect.Side.CENTER);
          const shrink = new Transform(1, 0, 0, 1, -center.getX(), -center.getY())
            .scaled(scaleX, scaleY)
            .translated(center.getX(), center.getY());
          const scene = this._element.getScene();
          const editor = scene ? BaseEditor.getEditor(scene) : null;
          if (editor) editor.beginTransaction();
          try {
            this._element.setProperty("trf", frame ? shrink.multiplied(frame) : shrink);
          } finally {
            if (editor) {
              editor.commitTransaction(
                Locale.get(new LocaleKey("GImageEditor", "action.crop-image")),
              );
            }
          }
        }
      }
      this._imgBoxEditor = new ImageBoxEditor(this._element);
      this.insertEditor(
        this._imgBoxEditor,
        this._editors && this._editors.length ? (this._editors[0] as BaseEditor) : null,
      );
      this._imgBoxEditor.setFlag(BaseEditor.Flag.Selected);
      this._imgBoxEditor.setColor(new RGBColor([0, 255, 168]));
      this._imgBoxEditor._rotCornerDist *= 2;
    } else if (!this._editMode && this._imgBoxEditor) {
      this._imgBoxEditor.requestInvalidation();
      const boxEditor = this._imgBoxEditor;
      this._imgBoxEditor = null;
      this.removeEditor(boxEditor, true);
    }
  }

  /**
   * Deselecting leaves the crop mode. Only the flag is passed on, so the
   * repaint requests always happen.
   */
  override removeFlag(flag: number): void {
    if (0 != (this._flags & flag) && 0 != (flag & BaseEditor.Flag.Selected))
      this.setEditMode(false);
    super.removeFlag(flag);
  }

  override getBBox(transform: Transform): Rect | null {
    let box = super.getBBox(transform);
    if (this._imgBoxEditor) {
      const inner = this._imgBoxEditor.getBBox(transform);
      if (inner) box = box ? box.united(inner) : inner;
    }
    return box;
  }

  override movePart(
    partId: unknown,
    partData: unknown,
    position: Point,
    viewToWorld: Transform,
    guides: unknown,
    shift?: unknown,
    option?: unknown,
  ): unknown {
    const result = super.movePart(partId, partData, position, viewToWorld, guides, shift, option);
    if (partId === ImageEditor.CROPFRAME_PART_ID || partId === ImageEditor.IMAGEINTERNAL_PART_ID) {
      const data = partData as CropPartData;
      const current = viewToWorld.mapPoint(position);
      const start = viewToWorld.mapPoint(data.point);
      let delta = current.subtract(start);
      const editor: BoxEditor =
        partId === ImageEditor.IMAGEINTERNAL_PART_ID
          ? (this._imgBoxEditor as ImageBoxEditor)
          : this;
      let box = editor.getBox();
      if (box && !box.isEmpty()) {
        if (guides) {
          const snap = guides as CropGuides;
          let graphicEditor: { getMappingScopes(): unknown } | undefined;
          for (let parent = this.getParentEditor(); parent; parent = parent.getParentEditor()) {
            if (
              "function" ==
              typeof (parent as unknown as Partial<GraphicEditorOwner>)._getGraphicEditor
            ) {
              graphicEditor = (parent as unknown as GraphicEditorOwner)._getGraphicEditor();
              break;
            }
          }
          if (graphicEditor) {
            const from = data.origTrf ? data.origTrf : editor.getBoxTransform();
            box = from ? from.mapRect(box) : box;
            const moved = box.translated(delta.getX(), delta.getY());
            snap.useExclusions(this._element);
            snap.beginMap(graphicEditor.getMappingScopes());
            const snapped = snap.mapRect(moved);
            snap.finishMap();
            const corner = moved.getSide(Rect.Side.TOP_LEFT);
            const correction = snapped.getSide(Rect.Side.TOP_LEFT).subtract(corner);
            delta = delta.add(correction);
          }
        }
        const translation = new Transform(1, 0, 0, 1, delta.getX(), delta.getY());
        if (partId === ImageEditor.CROPFRAME_PART_ID) this.edTransform(translation);
        else if (partId === ImageEditor.IMAGEINTERNAL_PART_ID) {
          if (this._imgBoxEditor) {
            BaseEditor.prototype.movePart.call(
              this._imgBoxEditor,
              partId,
              partData,
              position,
              viewToWorld,
              guides,
              shift,
              option,
            );
          }
          const imageTransform = data.origTrf ? data.origTrf.multiplied(translation) : translation;
          this._element.setImageTransform(imageTransform, false, true);
        }
      }
    }
    return result;
  }

  override _applyPartMove(
    partId: unknown,
    partData: unknown,
    option?: unknown,
    extra?: unknown,
  ): void {
    if (partId === ImageEditor.CROPFRAME_PART_ID) {
      if (this.canApplyTransform()) {
        this._prepareApplyTransform(this._element);
        this._applyTransform(this._element);
      } else this.resetTransform();
    } else if (partId === ImageEditor.IMAGEINTERNAL_PART_ID) {
      // Writes the temporary image transform again, this time recorded.
      this._element.setImageTransform(this._element.getImageTransform(), true);
      if (this._imgBoxEditor) BaseEditor.prototype.resetTransform.call(this._imgBoxEditor);
    }
    super._applyPartMove(partId, partData, option, extra);
  }

  override _paintResizeHandles(transform: Transform, context: EditorPaintContext): void {
    if (this._editMode) {
      this._iterateCropHandles(transform, function (vertices) {
        const canvas = context.canvas as NonNullable<EditorPaintContext["canvas"]>;
        canvas.putVertices(vertices as unknown as Parameters<typeof canvas.putVertices>[0]);
        canvas.fillVertices(context.selectionOutlineColor);
      });
    } else super._paintResizeHandles(transform, context);
  }

  /** The old code called GRectangleEditor's getCursor on the prototype (it doesn't use `this`). */
  override getCursor(partId: unknown, partData?: unknown): unknown {
    return partId === ImageEditor.IMAGEINTERNAL_PART_ID
      ? Cursor.SelectCross
      : partId === BoxEditor.ROTATION_HANDLE_PART_ID && this._editMode
        ? Cursor.SelectSmallRotateRound
        : RectangleEditor.prototype.getCursor.call(RectangleEditor.prototype, partId, partData);
  }

  /** In crop mode a hit inside the frame or the bitmap drags the bitmap. */
  override getPartInfoAt(
    location: Point,
    transform: Transform,
    filter?: ((editor: BaseEditor) => unknown) | null,
    tolerance?: number | null,
  ): PartInfo | null {
    const hit = super.getPartInfoAt(location, transform, filter, tolerance);
    return (
      hit ||
      (this._editMode && this.hasFlag(BaseEditor.Flag.Selected)
        ? this._getInternalPartInfoAt(location, transform, tolerance)
        : null)
    );
  }

  _getInternalPartInfoAt(
    location: Point,
    transform: Transform,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
    tolerance?: number | null,
  ): PartInfo | null {
    const quads: Point[][] = [];
    let quad = this.getBoxQuadrilateral(transform);
    if (quad) quads.push(quad);
    if (this._imgBoxEditor && (quad = this._imgBoxEditor.getBoxQuadrilateral(transform))) {
      quads.push(quad);
    }
    for (let i = 0; i < quads.length; ++i) {
      quad = quads[i] as Point[];
      const outline = quadrilateralVertices(quad);
      const result = new HitResult();
      if (VertexInfo.hitTest(location.getX(), location.getY(), outline, 0, true, result)) {
        const data: CropPartData = { point: location, origTrf: this._element.getImageTransform() };
        return new PartInfo(this, ImageEditor.IMAGEINTERNAL_PART_ID, data, true, false);
      }
    }
    return null;
  }

  override _getPartInfoAt(
    location: Point,
    transform: Transform,
    tolerance: number,
    extra?: unknown,
  ): PartInfo | null {
    let hit = super._getPartInfoAt(location, transform, tolerance, extra);
    if (!hit && this._editMode && this.hasFlag(BaseEditor.Flag.Selected)) {
      hit = this._getOutlinePartInfoAt(location, transform, tolerance);
    }
    return hit;
  }

  _getOutlinePartInfoAt(location: Point, transform: Transform, tolerance: number): PartInfo | null {
    const quad = this.getBoxQuadrilateral(transform) as Point[];
    const outline = quadrilateralVertices(quad);
    const result = new HitResult();
    return VertexInfo.hitTest(
      location.getX(),
      location.getY(),
      outline,
      2 * tolerance,
      false,
      result,
    )
      ? new PartInfo(this, ImageEditor.CROPFRAME_PART_ID, { point: location }, true, false)
      : null;
  }

  /** In crop mode the crop handles are hit tested by their shapes. */
  override _getResizePartInfoAt(
    location: Point,
    transform: Transform,
    tolerance?: number,
  ): PartInfo | null {
    if (!this._editMode) return super._getResizePartInfoAt(location, transform, tolerance);
    let hit: PartInfo | null = null;
    this._iterateCropHandles(transform, (vertices, point, side, segment) => {
      const result = new HitResult();
      if (
        VertexInfo.hitTest(
          location.getX(),
          location.getY(),
          vertices,
          2 * EditorOptions.annotPickDistance,
          true,
          result,
        )
      ) {
        hit = new PartInfo(
          this,
          BoxEditor.RESIZE_HANDLE_PART_ID,
          { side: side, point: point, resizeSegment: segment },
          true,
          false,
        );
        return true;
      }
      return undefined;
    });
    // The old code returned undefined instead of null for no hit.
    return hit || (undefined as unknown as null);
  }

  /**
   * Calls `visitor` with each crop handle shape (view coordinates), its
   * point, side and cursor segment, until it returns true. Corners are
   * angles, edge centres bars; the opposite handle is the first one
   * rotated by 180 degrees. Handles only show when the frame is big
   * enough for them.
   */
  _iterateCropHandles(transform: Transform | null, visitor: CropHandleVisitor): void {
    const box = this.getBox();
    if (box && !box.isEmpty()) {
      let matrix = this.getBoxTransform() || new Transform();
      matrix = transform ? matrix.multiplied(transform) : matrix;
      const p = {
        tl: matrix.mapPoint(box.getSide(Rect.Side.TOP_LEFT)),
        tc: matrix.mapPoint(box.getSide(Rect.Side.TOP_CENTER)),
        tr: matrix.mapPoint(box.getSide(Rect.Side.TOP_RIGHT)),
        rc: matrix.mapPoint(box.getSide(Rect.Side.RIGHT_CENTER)),
        br: matrix.mapPoint(box.getSide(Rect.Side.BOTTOM_RIGHT)),
        bc: matrix.mapPoint(box.getSide(Rect.Side.BOTTOM_CENTER)),
        bl: matrix.mapPoint(box.getSide(Rect.Side.BOTTOM_LEFT)),
        lc: matrix.mapPoint(box.getSide(Rect.Side.LEFT_CENTER)),
        c: matrix.mapPoint(box.getSide(Rect.Side.CENTER)),
      };
      let projection = GMath.getVectorProjection(
        p.bl.getX(),
        p.bl.getY(),
        p.br.getX(),
        p.br.getY(),
        p.tl.getX(),
        p.tl.getY(),
      );
      const height = GMath.ptDist(p.tl.getX(), p.tl.getY(), projection.getX(), projection.getY());
      projection = GMath.getVectorProjection(
        p.tr.getX(),
        p.tr.getY(),
        p.br.getX(),
        p.br.getY(),
        p.tl.getX(),
        p.tl.getY(),
      );
      const width = GMath.ptDist(p.tl.getX(), p.tl.getY(), projection.getX(), projection.getY());
      const leftLength = GMath.ptDist(p.tl.getX(), p.tl.getY(), p.bl.getX(), p.bl.getY());
      const topLength = GMath.ptDist(p.tl.getX(), p.tl.getY(), p.tr.getX(), p.tr.getY());
      const Annots = ImageEditor.Annots;
      const minimumCrossing = Annots.AngleLength + Annots.Width / 1.5 + Annots.Width;
      const minimumLength = 2 * Annots.AngleLength + 2;
      if (
        height >= minimumCrossing &&
        width >= minimumCrossing &&
        leftLength >= minimumLength &&
        topLength >= minimumLength
      ) {
        let vertices: VertexContainer;
        let opposite: Transform;
        const handles: CropHandle[] = [];
        if (this.hasFlag(BoxEditor.Flag.ResizeEdges)) {
          vertices = new VertexContainer();
          if (this._constructAngleAnnot(p.bl, p.tl, p.tr, leftLength, topLength, vertices)) {
            handles.push({ vertices: vertices, point: p.tl, side: Rect.Side.TOP_LEFT });
            opposite = new Transform()
              .translated(-p.tl.getX(), -p.tl.getY())
              .rotated(Math.PI)
              .translated(p.br.getX(), p.br.getY());
            handles.push({
              vertices: new VertexTransformer(vertices, opposite),
              point: p.br,
              side: Rect.Side.BOTTOM_RIGHT,
            });
          }
          vertices = new VertexContainer();
          if (this._constructAngleAnnot(p.tl, p.tr, p.br, topLength, leftLength, vertices)) {
            handles.push({ vertices: vertices, point: p.tr, side: Rect.Side.TOP_RIGHT });
            opposite = new Transform()
              .translated(-p.tr.getX(), -p.tr.getY())
              .rotated(Math.PI)
              .translated(p.bl.getX(), p.bl.getY());
            handles.push({
              vertices: new VertexTransformer(vertices, opposite),
              point: p.bl,
              side: Rect.Side.BOTTOM_LEFT,
            });
          }
        }
        if (this.hasFlag(BoxEditor.Flag.ResizeCenters)) {
          if (
            topLength > minimumLength + Annots.MiddleLength + 2 &&
            height / 2 > 2 * Annots.Width + 2 &&
            width / 2 > Annots.MiddleLength / 2 + Annots.Width + 2
          ) {
            vertices = new VertexContainer();
            if (this._constructMiddleAnnot(p.tl, p.tc, p.tr, topLength, vertices)) {
              handles.push({ vertices: vertices, point: p.tc, side: Rect.Side.TOP_CENTER });
              opposite = new Transform()
                .translated(-p.tc.getX(), -p.tc.getY())
                .rotated(Math.PI)
                .translated(p.bc.getX(), p.bc.getY());
              handles.push({
                vertices: new VertexTransformer(vertices, opposite),
                point: p.bc,
                side: Rect.Side.BOTTOM_CENTER,
              });
            }
          }
          if (
            leftLength > minimumLength + Annots.MiddleLength + 2 &&
            width / 2 > 2 * Annots.Width + 2 &&
            height / 2 > Annots.MiddleLength / 2 + Annots.Width + 2
          ) {
            vertices = new VertexContainer();
            if (this._constructMiddleAnnot(p.tr, p.rc, p.br, leftLength, vertices)) {
              handles.push({ vertices: vertices, point: p.rc, side: Rect.Side.RIGHT_CENTER });
              opposite = new Transform()
                .translated(-p.rc.getX(), -p.rc.getY())
                .rotated(Math.PI)
                .translated(p.lc.getX(), p.lc.getY());
              handles.push({
                vertices: new VertexTransformer(vertices, opposite),
                point: p.lc,
                side: Rect.Side.LEFT_CENTER,
              });
            }
          }
        }
        const topSegment = GMath.getRotationSegment(p.c, p.tc);
        const rightSegment = GMath.getRotationSegment(p.c, p.rc);
        const mirrored =
          (rightSegment >= 3
            ? rightSegment
            : topSegment - rightSegment >= 4
              ? rightSegment + 8
              : rightSegment) >
          (topSegment >= 3
            ? topSegment
            : rightSegment - topSegment >= 4
              ? topSegment + 8
              : topSegment);
        for (let i = 0; i < handles.length; ++i) {
          const handle = handles[i] as CropHandle;
          const segment = this._getResizeSegment(handle.side, topSegment, rightSegment, mirrored);
          if (true === visitor(handle.vertices, handle.point, handle.side, segment)) break;
        }
      }
    }
  }

  /**
   * Builds the angle shaped handle at `corner` (between the edges to
   * `previous` and `next`, of lengths `previousLength` and `nextLength`)
   * into `out`. Always true when both lengths are positive.
   */
  _constructAngleAnnot(
    previous: Point,
    corner: Point,
    next: Point,
    previousLength: number,
    nextLength: number,
    out: VertexContainer,
  ): boolean {
    let built = false;
    if (previousLength > 0 && nextLength > 0) {
      const Annots = ImageEditor.Annots;
      const alongPrevious = GMath.getPointAtLength(
        corner.getX(),
        corner.getY(),
        previous.getX(),
        previous.getY(),
        Annots.AngleLength,
      );
      const alongNext = GMath.getPointAtLength(
        corner.getX(),
        corner.getY(),
        next.getX(),
        next.getY(),
        Annots.AngleLength,
      );
      const px = corner.getX() - previous.getX();
      const py = corner.getY() - previous.getY();
      const previousNormal = new Point(
        (-py / previousLength) * Annots.Width,
        (px / previousLength) * Annots.Width,
      );
      const previousOuter = alongPrevious.add(previousNormal);
      const cornerOnPrevious = corner.add(previousNormal);
      const nx = corner.getX() - next.getX();
      const ny = corner.getY() - next.getY();
      const nextNormal = new Point(
        (ny / nextLength) * Annots.Width,
        (-nx / nextLength) * Annots.Width,
      );
      const nextOuter = alongNext.add(nextNormal);
      const cornerOnNext = corner.add(nextNormal);
      let inner = GMath.getIntersectionPoint(
        previousOuter.getX(),
        previousOuter.getY(),
        cornerOnPrevious.getX(),
        cornerOnPrevious.getY(),
        nextOuter.getX(),
        nextOuter.getY(),
        cornerOnNext.getX(),
        cornerOnNext.getY(),
      );
      const Command = Vertex.Command;
      if (inner) {
        out.addVertex(Command.Move, alongPrevious.getX(), alongPrevious.getY());
        out.addVertex(Command.Line, corner.getX(), corner.getY());
        out.addVertex(Command.Line, alongNext.getX(), alongNext.getY());
        out.addVertex(Command.Line, nextOuter.getX(), nextOuter.getY());
        out.addVertex(Command.Line, inner.getX(), inner.getY());
        out.addVertex(Command.Line, previousOuter.getX(), previousOuter.getY());
        out.addVertex(Command.Close, NO_COORDINATE, NO_COORDINATE);
        built = true;
      } else if (
        (inner = GMath.getIntersectionPoint(
          alongPrevious.getX(),
          alongPrevious.getY(),
          previousOuter.getX(),
          previousOuter.getY(),
          alongNext.getX(),
          alongNext.getY(),
          nextOuter.getX(),
          nextOuter.getY(),
        ))
      ) {
        out.addVertex(Command.Move, alongPrevious.getX(), alongPrevious.getY());
        out.addVertex(Command.Line, corner.getX(), corner.getY());
        out.addVertex(Command.Line, alongNext.getX(), alongNext.getY());
        out.addVertex(Command.Line, inner.getX(), inner.getY());
        out.addVertex(Command.Close, NO_COORDINATE, NO_COORDINATE);
        built = true;
      } else {
        out.addVertex(Command.Move, alongPrevious.getX(), alongPrevious.getY());
        out.addVertex(Command.Line, corner.getX(), corner.getY());
        out.addVertex(Command.Line, alongNext.getX(), alongNext.getY());
        out.addVertex(Command.Close, NO_COORDINATE, NO_COORDINATE);
        built = true;
      }
    }
    return built;
  }

  /** Builds the bar shaped handle at `middle` of the edge `start`-`end` (of `length`) into `out`. */
  _constructMiddleAnnot(
    start: Point,
    middle: Point,
    end: Point,
    length: number,
    out: VertexContainer,
  ): boolean {
    let built = false;
    if (length > 0) {
      const Annots = ImageEditor.Annots;
      const dx = end.getX() - start.getX();
      const dy = end.getY() - start.getY();
      const normal = new Point((-dy / length) * Annots.Width, (dx / length) * Annots.Width);
      const first = GMath.getPointAtLength(
        middle.getX(),
        middle.getY(),
        start.getX(),
        start.getY(),
        Annots.MiddleLength / 2,
      );
      const firstOuter = first.add(normal);
      const second = GMath.getPointAtLength(
        middle.getX(),
        middle.getY(),
        end.getX(),
        end.getY(),
        Annots.MiddleLength / 2,
      );
      const secondOuter = second.add(normal);
      const Command = Vertex.Command;
      out.addVertex(Command.Move, first.getX(), first.getY());
      out.addVertex(Command.Line, second.getX(), second.getY());
      out.addVertex(Command.Line, secondOuter.getX(), secondOuter.getY());
      out.addVertex(Command.Line, firstOuter.getX(), firstOuter.getY());
      out.addVertex(Command.Close, NO_COORDINATE, NO_COORDINATE);
      built = true;
    }
    return built;
  }

  override _showResizeHandlesInDetailMode(): boolean {
    return true;
  }

  override toString(): string {
    return "[Object GImageEditor]";
  }
}

ImageEditor.prototype._editMode = false;

/** A closed outline of four points. */
function quadrilateralVertices(quad: Point[]): VertexContainer {
  const outline = new VertexContainer();
  const first = quad[0] as Point;
  outline.addVertex(Vertex.Command.Move, first.getX(), first.getY());
  for (let i = 1; i < 4; ++i) {
    const point = quad[i] as Point;
    outline.addVertex(Vertex.Command.Line, point.getX(), point.getY());
  }
  outline.addVertex(Vertex.Command.Close, NO_COORDINATE, NO_COORDINATE);
  return outline;
}
