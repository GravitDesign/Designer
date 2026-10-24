// Old: chunk.vendor.js module 552 (GEllipseEditor).
/**
 * The editor of an ellipse. In detail mode the start and end of the arc
 * (`sa`, `ea`) get handles; dragging a selected one turns the selected
 * angles by the angle the pointer moved around the centre.
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { registerClass } from "../../engine/core/object.ts";
import { uuid } from "../../engine/core/util.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { PathBase } from "../../engine/scene/path-base.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { BaseEditor, PartInfo, type EditorPaintContext } from "./base-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { PathBaseEditor, type EditedPathBase } from "./path-base-editor.ts";
import { ShapeEditor } from "./shape-editor.ts";

/** An ellipse as its editor drives it. */
export type EditedEllipse = EditedPathBase & Ellipse;

/** One arc end: its part id and position in scene coordinates. */
export interface ArcEnd {
  id: string;
  position: Point;
}

export class EllipseEditor<E extends EditedEllipse = EditedEllipse> extends PathBaseEditor<E> {
  static {
    registerClass(this, "GEllipseEditor");
    ElementEditor.exports(this, Ellipse);
  }

  static START_ANGLE_PART_ID = uuid();
  static END_ANGLE_PART_ID = uuid();

  override getBBoxMargin(): number {
    const margin = super.getBBoxMargin();
    return this._showSegmentDetails()
      ? Math.max(
          EditorAnnotation.getAnnotationPaintMargin(EditorOptions.annotationHandles.ellipse.size),
          margin,
        )
      : margin;
  }

  /**
   * Adds the centre cross area in detail mode. The box is in scene
   * coordinates, not mapped to the view, and ends at the centre instead of
   * surrounding it (see "Ellipse editor adds the centre cross box
   * unmapped" in QUESTIONS.md).
   */
  override getCustomBBox(transform: Transform | null, includeTransform?: unknown): Rect | null {
    let box = super.getCustomBBox(transform, includeTransform);
    if (
      this.hasFlag(BaseEditor.Flag.Selected) &&
      this.hasFlag(BaseEditor.Flag.Detail) &&
      EditorOptions.centerCrossSize > 0
    ) {
      const center = this.getPaintElement().getCenter(true);
      if (center) {
        const size = 2 * EditorOptions.centerCrossSize;
        const cross = new Rect(
          center.getX() - size - 1,
          center.getY() - size - 1,
          size + 1,
          size + 1,
        );
        if (cross) box = box ? box.united(cross) : cross;
      }
    }
    return box;
  }

  override createElementPreview(): void {
    if (!this._elementPreview) {
      this._setElementPreview(new Ellipse() as unknown as E);
      (this._elementPreview as unknown as E).transferProperties(this._element, [
        Shape.GeometryProperties,
        Ellipse.GeometryProperties,
        PathBase.MetaProperties,
      ]);
    }
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
    if (
      partId === EllipseEditor.START_ANGLE_PART_ID ||
      partId === EllipseEditor.END_ANGLE_PART_ID
    ) {
      const scenePoint = viewToWorld.mapPoint(position);
      this.createElementPreview();
      const own = this._element.getTransform();
      const local = own ? (own.inverted() as Transform).mapPoint(scenePoint) : scenePoint;
      const angle = Math.atan2(local.getY(), local.getX());
      const start = this._element.getProperty("sa") as number;
      const end = this._element.getProperty("ea") as number;
      const delta = partId == EllipseEditor.START_ANGLE_PART_ID ? angle - start : angle - end;
      // Throws without a part selection, as in the old code.
      const selection = this._partSelection as unknown[];
      const startSelected = selection.indexOf(EllipseEditor.START_ANGLE_PART_ID) >= 0;
      const endSelected = selection.indexOf(EllipseEditor.END_ANGLE_PART_ID) >= 0;
      if (startSelected || endSelected) {
        (this._elementPreview as unknown as E).setProperties(
          ["sa", "ea"],
          [
            startSelected ? GMath.normalizeAngleRadians(start + delta) : start,
            endSelected ? GMath.normalizeAngleRadians(end + delta) : end,
          ],
        );
        this.requestInvalidation();
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
    if (
      partId === EllipseEditor.START_ANGLE_PART_ID ||
      partId === EllipseEditor.END_ANGLE_PART_ID
    ) {
      const values = (this._elementPreview as unknown as E).getProperties(["sa", "ea"]);
      this.resetPartMove(partId, partData);
      this._element.setProperties(["sa", "ea"], values);
    }
    super._applyPartMove(partId, partData, option, extra);
  }

  override canApplyTransform(): unknown {
    return (
      (this._elementPreview && (this._elementPreview.getTransform() as Transform).invertible()) ||
      super.canApplyTransform()
    );
  }

  /**
   * Sets butt caps on the new ellipse's borders after the style is copied.
   * The old rule, case by case:
   * - no source: butt caps;
   * - an ellipse source: the caps stay as they are;
   * - another source without paint layers: butt caps;
   * - another source with paint layers: butt caps only when one of its
   *   layers is a border.
   */
  override initialSetup(source?: unknown): void {
    super.initialSetup(source);
    let butt = false;
    const stylable = source as { getPaintLayers(): PaintLayers | null } | null | undefined;
    if (!stylable) butt = true;
    else if (!(stylable instanceof Ellipse)) {
      const layers = stylable.getPaintLayers();
      if (!layers) butt = true;
      else {
        for (let layer = layers.getFirstChild(); null !== layer && !butt; layer = layer.getNext()) {
          if (layer instanceof BorderPaintLayer) butt = true;
        }
      }
    }
    if (butt && this.getElement().getPaintLayers()) {
      for (
        let layer = this.getElement().getPaintLayers().getFirstChild();
        null !== layer;
        layer = layer.getNext()
      ) {
        if (layer instanceof BorderPaintLayer) layer.setProperty("_blc", PaintCanvas.LineCap.Butt);
      }
    }
  }

  override _hasCenterCross(): boolean {
    return true;
  }

  override _postPaint(transform: Transform, context: EditorPaintContext): void {
    super._postPaint(transform, context);
    if (this._showSegmentDetails()) {
      this._iterateArcEnds(true, (end) => {
        const selected = !!this._partSelection && this._partSelection.indexOf(end.id) >= 0;
        const options = EditorOptions.annotationHandles
          .ellipse as typeof EditorOptions.annotationHandles.ellipse & {
          outlineWidth?: number;
          shadowColor?: string;
          outsideStroke?: unknown;
        };
        const type =
          end.id == EllipseEditor.START_ANGLE_PART_ID ? options.startType : options.endType;
        EditorAnnotation.paintAnnotation(
          context,
          transform,
          end.position,
          type,
          selected,
          options.size,
          RGBColor.WHITE,
          context.annotationColor,
          options.outlineWidth,
          options.shadowColor,
          options.outsideStroke,
        );
        return false;
      });
    }
  }

  override _getPartInfoAt(
    location: Point,
    transform: Transform,
    tolerance: number,
    extra?: unknown,
  ): PartInfo | null {
    if (this._showSegmentDetails()) {
      let hit: PartInfo | null = null;
      this._iterateArcEnds(false, (end) => {
        const pick = EditorOptions.annotPickDistance;
        return (
          !!EditorAnnotation.getAnnotationBBox(
            transform,
            end.position,
            EditorOptions.annotationHandles.ellipse.size,
            false,
          )
            .expanded(pick, pick, pick, pick)
            .containsPoint(location) && ((hit = new PartInfo(this, end.id, null, true, true)), true)
        );
      });
      if (hit) return hit;
    }
    // Skips GPathBaseEditor and goes to GShapeEditor (the same chain).
    return ShapeEditor.prototype._getPartInfoAt.call(this, location, transform, tolerance, extra);
  }

  _showSegmentDetails(): boolean {
    return this._showAnnotations() && this.hasFlag(BaseEditor.Flag.Detail) && !this._elementPreview;
  }

  /**
   * Calls `visitor` with the start, then the end of the arc, of the preview
   * (`usePaintElement`) or the element, until it returns true.
   */
  _iterateArcEnds(usePaintElement: boolean, visitor: (end: ArcEnd) => unknown): void {
    const element = usePaintElement ? this.getPaintElement() : this._element;
    let own = element.getTransform();
    const start = element.getProperty("sa") as number;
    const end = element.getProperty("ea") as number;
    own = own || new Transform(1, 0, 0, 1, 0, 0);
    const ends: ArcEnd[] = [
      {
        id: EllipseEditor.START_ANGLE_PART_ID,
        position: own.mapPoint(new Point(Math.cos(start), Math.sin(start))),
      },
      {
        id: EllipseEditor.END_ANGLE_PART_ID,
        position: own.mapPoint(new Point(Math.cos(end), Math.sin(end))),
      },
    ];
    for (let i = 0; i < ends.length && true !== visitor(ends[i] as ArcEnd); ++i);
  }

  override toString(): string {
    return "[Object GEllipseEditor]";
  }
}
