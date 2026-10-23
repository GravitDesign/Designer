// Old: chunk.vendor.js module 748 (GLassoTool).
/**
 * The lasso: the subselect tool with a free-hand selection area. The
 * outline follows the pointer; every 20 points (or 5+ points spanning
 * more than 400 px² of squared steps) the recent points are fitted with
 * cubics (GVertexFitter, error 7) and kept, so the outline stays smooth
 * and short. It is painted as a thin black line.
 */
import { registerClass } from "../../engine/core/object.ts";
import { VertexContainer } from "../../engine/geometry/vertex-container.ts";
import { VertexFitter } from "../../engine/geometry/vertex-fitter.ts";
import { VertexPixelAligner } from "../../engine/geometry/vertex-pixel-aligner.ts";
import { Vertex } from "../../engine/geometry/vertex.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import type { EditorPaintContext } from "../element-editors/base-editor.ts";
import { AreaSelector } from "./select/area-selector.ts";
import { SubSelectTool } from "./sub-select-tool.ts";

/** GLassoTool._AreaSelector. */
export class LassoAreaSelector extends AreaSelector {
  _current: Point | null = null;
  /** The points since the last fit. */
  _currentPoints: Point[] | null = null;
  _fitter: VertexFitter | null = null;
  _firstTangent: Point | null = null;
  _lastTangent: Point | null = null;
  /** Sum of the squared steps since the last fit. */
  _cdist = 0;
  /** The fitted part of the outline. */
  _processedVertices: VertexContainer | null = null;

  override clearArea(): void {
    super.clearArea();
    this._current = null;
    this._currentPoints = null;
    this._fitter = null;
    this._firstTangent = null;
    this._lastTangent = null;
    this._cdist = 0;
    this._processedVertices = null;
  }

  override startArea(point: Point): void {
    super.startArea(point);
    this._currentPoints = [point];
    this._current = point;
    this._processedVertices = new VertexContainer();
    this._fitter = new VertexFitter(7);
    this._firstTangent = null;
    this._lastTangent = null;
    this._cdist = 0;
  }

  override expandToPoint(point: Point): void {
    if (
      this._current &&
      GMath.isEqualEps(this._current.getX(), point.getX()) &&
      GMath.isEqualEps(this._current.getY(), point.getY())
    ) {
      return;
    }
    if (!this._areaStartedPos) this._areaStartedPos = point;
    if (this._trf) this._applyPendingTranslation(this._trf);
    this._areaLastPos = point;
    let step = 0;
    if (this._current) {
      const delta = this._current.subtract(point);
      step = delta.dot(delta);
      this._cdist += step;
    }
    if (!(null == this._current || step >= 1)) return;
    const points = this._currentPoints as Point[];
    if (20 === points.length || (points.length > 4 && this._cdist > 400))
      this._fitRecentPoints(point);
    this._vertexContainer.addVertex(
      0 == this._vertexContainer.getCount() ? Vertex.Command.Move : Vertex.Command.Line,
      point.getX(),
      point.getY(),
    );
    (this._currentPoints as Point[]).push(point);
    this._current = point;
  }

  /** Bakes the pending translation into the outline and the kept points. */
  _applyPendingTranslation(translation: NonNullable<AreaSelector["_trf"]>): void {
    this._areaStartedPos = translation.mapPoint(this._areaStartedPos as Point);
    this._currentPoints = (this._currentPoints as Point[]).map((p) => translation.mapPoint(p));
    const outline = VertexContainer.splitVertexSource(this._vertexContainer, translation);
    if (outline && outline.length) this._vertexContainer = outline[0] as VertexContainer;
    const processed = VertexContainer.splitVertexSource(
      this._processedVertices as VertexContainer,
      translation,
    );
    if (processed && processed.length) this._processedVertices = processed[0] as VertexContainer;
    if (this._current) this._current = translation.mapPoint(this._current);
    this._trf = null;
    this._pixelTransformer = null;
  }

  /** Replaces the recent points with fitted cubics. */
  _fitRecentPoints(point: Point): void {
    const processed = this._processedVertices as VertexContainer;
    let points = this._currentPoints as Point[];
    let first = false;
    const count = processed.getCount();
    if (count > 0) {
      processed.rewindVertices(count - 1);
      const last = new Vertex();
      processed.readVertex(last);
      const lastPoint = new Point(last.x, last.y);
      this._firstTangent = (points[0] as Point).subtract(lastPoint);
      this._lastTangent = (points[points.length - 1] as Point).subtract(point);
      this._lastTangent = this._lastTangent.scale(
        1 / Math.sqrt(this._lastTangent.dot(this._lastTangent)),
      );
    } else {
      first = true;
      const start = points.shift() as Point;
      this._firstTangent = (points[0] as Point).subtract(start);
    }
    this._firstTangent = this._firstTangent.scale(
      1 / Math.sqrt(this._firstTangent.dot(this._firstTangent)),
    );
    const curves = (this._fitter as VertexFitter).fitCurve(
      points,
      20,
      this._firstTangent,
      this._lastTangent,
    );
    if (first && curves) {
      const start = curves[0] as Point[];
      processed.addVertex(
        Vertex.Command.Move,
        (start[0] as Point).getX(),
        (start[0] as Point).getY(),
      );
    }
    if (curves) {
      for (let i = 0; i < curves.length; i++) {
        const curve = curves[i] as Point[];
        processed.addVertex(
          Vertex.Command.Curve2,
          (curve[3] as Point).getX(),
          (curve[3] as Point).getY(),
        );
        processed.addVertex(
          Vertex.Command.Curve2,
          (curve[1] as Point).getX(),
          (curve[1] as Point).getY(),
        );
        processed.addVertex(
          Vertex.Command.Curve2,
          (curve[2] as Point).getX(),
          (curve[2] as Point).getY(),
        );
      }
    }
    points = [];
    this._currentPoints = points;
    this._vertexContainer.clearVertices();
    this._vertexContainer.appendVertices(processed);
    this._cdist = 0;
  }

  override paint(context: EditorPaintContext): void {
    if (this._pixelTransformer || this._areaLastPos) {
      const aligned = new VertexPixelAligner(this._currentSource());
      const canvas = context.canvas as NonNullable<EditorPaintContext["canvas"]>;
      canvas.putVertices(aligned);
      canvas.strokeVertices(RGBColor.BLACK, EditorOptions.outlineWidth);
    }
  }
}

export class LassoTool extends SubSelectTool {
  static {
    registerClass(this, "GLassoTool");
  }

  static override _AreaSelector = LassoAreaSelector;

  constructor() {
    super(new LassoAreaSelector());
  }

  override getCursor(): string {
    const cursor = super.getCursor();
    return cursor === Cursor.SelectInverse ? Cursor.Lasso : cursor;
  }

  override toString(): string {
    return "[Object GLassoTool]";
  }
}
