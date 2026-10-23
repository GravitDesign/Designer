// Old: chunk.vendor.js module 334 (GSelectTool._AreaSelector).
/**
 * The marquee of the select tools: a rectangle from the press point to the
 * pointer, in view pixels. With Space held the whole rectangle moves
 * instead of growing (`moveToPoint`), and while the view auto-pans the
 * rectangle is shifted with it (`translate`); both keep a pending
 * translation that the next `expandToPoint` bakes into the start point.
 *
 * The lasso tool subclasses it and draws a free-hand outline instead.
 */
import type { Color } from "../../../engine/color/color.ts";
import type { VertexReader } from "../../../engine/geometry/vertex-source.ts";
import { VertexContainer } from "../../../engine/geometry/vertex-container.ts";
import { VertexInfo } from "../../../engine/geometry/vertex-info.ts";
import { VertexPixelAligner } from "../../../engine/geometry/vertex-pixel-aligner.ts";
import { VertexTransformer } from "../../../engine/geometry/vertex-transformer.ts";
import { Vertex } from "../../../engine/geometry/vertex.ts";
import { GMath } from "../../../engine/math/math.ts";
import type { Point } from "../../../engine/math/point.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { EditorOptions } from "../../editor-options.ts";
import { BaseEditor, type EditorPaintContext } from "../../element-editors/base-editor.ts";

const outlineWidth = (): number => EditorOptions.outlineWidth as number;

export class AreaSelector {
  _vertexContainer: VertexContainer;
  _pixelTransformer: VertexTransformer | null = null;
  _selectionColor: Color | null = null;
  _areaStartedPos: Point | null | undefined;
  _areaLastPos: Point | null | undefined;
  /** Pending translation (Space move or auto-pan) not yet baked into the start point. */
  _trf: Transform | null | undefined;

  constructor() {
    this._vertexContainer = new VertexContainer();
  }

  hasSelectArea(): boolean {
    return !!this._areaLastPos;
  }

  clearArea(): void {
    this._vertexContainer.clearVertices();
    this._pixelTransformer = null;
    this._areaStartedPos = null;
    this._areaLastPos = null;
    this._trf = null;
    this._selectionColor = null;
  }

  hasAreaStarted(): boolean {
    return !!this._areaStartedPos;
  }

  startArea(point: Point): void {
    this.clearArea();
    this._areaStartedPos = point;
    this._areaLastPos = point;
    this._vertexContainer.addVertex(Vertex.Command.Move, point.getX(), point.getY());
  }

  /** Shifts the area by `delta` (the auto-pan scroll). */
  translate(delta: Point): void {
    if (this._areaLastPos) {
      this._trf = new Transform().translated(delta.getX(), delta.getY());
      this._pixelTransformer = new VertexTransformer(this._vertexContainer, this._trf);
    }
  }

  /** Moves the whole area so its last corner is at `point` (Space held). */
  moveToPoint(point: Point): void {
    if (this._areaLastPos) {
      const delta = point.subtract(this._areaLastPos);
      this._trf = new Transform().translated(delta.getX(), delta.getY());
      this._pixelTransformer = new VertexTransformer(this._vertexContainer, this._trf);
    }
  }

  expandToPoint(point: Point): void {
    this._vertexContainer.clearVertices();
    if (!this._areaStartedPos) this._areaStartedPos = point;
    if (this._trf) {
      this._areaStartedPos = this._trf.mapPoint(this._areaStartedPos);
      this._trf = null;
      this._pixelTransformer = null;
    }
    this._areaLastPos = point;
    const x0 = this._areaStartedPos.getX();
    const y0 = this._areaStartedPos.getY();
    const x1 = this._areaLastPos.getX();
    const y1 = this._areaLastPos.getY();
    this._vertexContainer.addVertex(Vertex.Command.Move, x0, y0);
    if (!(GMath.isEqualEps(x0, x1) && GMath.isEqualEps(y0, y1))) {
      this._vertexContainer.addVertex(Vertex.Command.Line, x1, y0);
      this._vertexContainer.addVertex(Vertex.Command.Line, x1, y1);
      this._vertexContainer.addVertex(Vertex.Command.Line, x0, y1);
      this._vertexContainer.addVertex(Vertex.Command.Close, 0, 0);
    }
  }

  /** The area's pixel-aligned bounds; grown by the outline width unless `exact`. */
  getAreaPaintRect(exact?: boolean): Rect | null {
    let rect: Rect | null = null;
    if (this._pixelTransformer || this._areaLastPos) {
      const aligned = new VertexPixelAligner(this._currentSource());
      rect = VertexInfo.calculateBounds(aligned, false);
    }
    if (!exact) {
      rect = rect
        ? rect.expanded(outlineWidth(), outlineWidth(), outlineWidth(), outlineWidth())
        : null;
    }
    return rect;
  }

  /** The area mapped through `transform` (view to scene), for collision tests. */
  getCollisionArea(transform: Transform): VertexTransformer | null {
    let area: VertexTransformer | null = null;
    if (this._pixelTransformer || this._areaLastPos) {
      area = new VertexTransformer(this._currentSource(), transform);
    }
    return area;
  }

  paint(context: EditorPaintContext): void {
    let rect = this.getAreaPaintRect(true);
    if (rect && (rect.getWidth() || rect.getHeight())) {
      let height = rect.getHeight();
      height = height > 0 ? Math.ceil(height) - 1 : 0;
      let width = rect.getWidth();
      width = width > 0 ? Math.ceil(width) - 1 : 0;
      rect = new Rect(Math.floor(rect.getX()) + 0.5, Math.floor(rect.getY()) + 0.5, width, height);
      if (!this._selectionColor) {
        const start = this._areaStartedPos as Point;
        this._selectionColor = BaseEditor.getOutlineColor(
          context,
          start.getX(),
          start.getY(),
          context.selectionOutlineColor,
          null,
        );
      }
      const canvas = context.canvas as NonNullable<EditorPaintContext["canvas"]>;
      canvas.fillRect(
        rect.getX(),
        rect.getY(),
        rect.getWidth(),
        rect.getHeight(),
        this._selectionColor,
        0.1,
      );
      canvas.strokeRect(
        rect.getX(),
        rect.getY(),
        rect.getWidth(),
        rect.getHeight(),
        outlineWidth(),
        this._selectionColor,
      );
    }
  }

  _currentSource(): VertexReader {
    return this._pixelTransformer ? this._pixelTransformer : this._vertexContainer;
  }
}
