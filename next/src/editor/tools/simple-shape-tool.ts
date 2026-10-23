// Old: chunk.vendor.js module 762 (GSimpleShapeTool).
/**
 * Draws a ready shape (GSimpleShape) from the shape library. The app
 * gives the tool the shape's definition (init) and its icon (activateTool
 * passes it to setIcon) before it is used. A drag maps the shape's source
 * box onto the drag area; a click places it at its natural size with its
 * top-left corner at the click.
 */
import { registerClass } from "../../engine/core/object.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import {
  ParameterizedVertexProcessor,
  type AnnotationDefinition,
  type ParameterDefinition,
} from "../../engine/scene/parameterized-vertex-processor.ts";
import { SimpleShape } from "../../engine/scene/simple-shape.ts";
import { ShapeTool, type DrawnShape } from "./shape-tool.ts";

/** A ready shape's definition, as the shape library holds it. */
export interface SimpleShapeDefinition {
  name: string | null;
  width?: number;
  height?: number;
  annotations?: {
    name?: unknown;
    annotList?: (AnnotationDefinition & { x0: number; y0: number })[] | null;
  } | null;
  parameters?: readonly ParameterDefinition[] | null;
  vertices?: readonly unknown[] | null;
}

export class SimpleShapeTool extends ShapeTool {
  static {
    registerClass(this, "GSimpleShapeTool");
  }

  _sShapeName: string | null = null;
  _sShapeInitWidth: number | null | undefined = null;
  _sShapeInitHeight: number | null | undefined = null;
  _annotationsParamInitVals: Point[] | null = null;
  _parameterizedVertexProcessor: ParameterizedVertexProcessor | null = null;
  _icon: string | null = null;

  /** Takes the shape the tool draws from now on. */
  init(definition: SimpleShapeDefinition): void {
    this._sShapeName = definition.name;
    this._sShapeInitWidth = definition.width;
    this._sShapeInitHeight = definition.height;
    this._annotationsParamInitVals = null;
    const annotations = definition.annotations;
    if (annotations && annotations.annotList && annotations.annotList.length) {
      const list = annotations.annotList;
      for (let i = 0; i < list.length; ++i) {
        const annotation = list[i] as { x0: number; y0: number };
        if (this._annotationsParamInitVals)
          this._annotationsParamInitVals.push(new Point(annotation.x0, annotation.y0));
        else this._annotationsParamInitVals = [new Point(annotation.x0, annotation.y0)];
      }
    }
    this._parameterizedVertexProcessor = new ParameterizedVertexProcessor(
      annotations ? annotations.name : null,
      annotations ? annotations.annotList : null,
      definition.parameters,
      definition.vertices,
    );
  }

  setIcon(icon: string | null): void {
    this._icon = icon;
  }

  getIcon(): string | null {
    return this._icon ? this._icon : null;
  }

  /** A click: the shape at its natural size, its top-left corner at `point`. */
  override _createShapeManually(point: Point): void {
    if (this._parameterizedVertexProcessor) {
      const shape = this._newShape();
      let corner = (shape.getSourceBBox() as Rect).getSide(Rect.Side.TOP_LEFT);
      const transform = shape.getProperty("trf") as Transform | null;
      if (transform) corner = transform.mapPoint(corner);
      const move = new Transform(
        1,
        0,
        0,
        1,
        point.getX() - corner.getX(),
        point.getY() - corner.getY(),
      );
      shape.setProperty("trf", transform ? transform.multiplied(move) : move);
      this._insertShape(shape);
    }
  }

  override _createShape(): DrawnShape | null {
    let shape: SimpleShape | null = null;
    if (this._parameterizedVertexProcessor) shape = this._newShape();
    return shape;
  }

  _newShape(): SimpleShape {
    return new SimpleShape(
      this._parameterizedVertexProcessor,
      this._annotationsParamInitVals,
      this._sShapeInitWidth as number,
      this._sShapeInitHeight as number,
      this._sShapeName,
      this._icon,
    );
  }

  /** Maps the shape's source box onto the drag area. */
  override _updateShape(shape: DrawnShape, area: Rect | null, line: Point[] | null): boolean {
    void line;
    if (area) {
      const source = (shape as SimpleShape).getSourceBBox();
      if (source && !source.isEmpty()) {
        const fromSource = Transform.getNativeRectTransformation(source);
        const toArea = Transform.getNativeRectTransformation(area);
        shape.setProperty("trf", (fromSource.inverted() as Transform).multiplied(toArea));
        return true;
      }
    }
    return false;
  }

  override toString(): string {
    return "[Object GSimpleShapeTool]";
  }
}
