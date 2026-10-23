// Old: chunk.vendor.js module 530 (GSimpleShape).
/**
 * A ready shape, node "Ready Shape": a shape from the shape catalogue
 * whose vertices a ParameterizedVertexProcessor computes from the
 * positions of its annotations (the handles the ready-shape tool drags).
 * The vertices are turned into paths, filled even-odd.
 *
 * Saved as `ssn` (the shape name, also its toString), `icn` (icon),
 * `pvp` (the serialized processor) and `apv` (the annotation positions
 * as a flat JSON list).
 */
import { VertexInfo } from "../geometry/vertex-info.ts";
import type { VertexContainer } from "../geometry/vertex-container.ts";
import { PathUtil } from "../geometry/path-util.ts";
import type { Vertex } from "../geometry/vertex.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { ElementChange } from "./element-change.ts";
import { NodeChange } from "./node-change.ts";
import type { PropertiesChangeArgs } from "./node-properties.ts";
import { registerNodeClass } from "./node.ts";
import { ParameterizedVertexProcessor } from "./parameterized-vertex-processor.ts";
import type { Path } from "./path.ts";
import { Shape } from "./shape.ts";

const GeometryProperties = {};
const VisualProperties = {};

/** Called per annotation with its position and index; returning true stops. */
export type AnnotationVisitor = (position: Point | null, index: number) => unknown;

export class SimpleShape extends Shape {
  static {
    registerNodeClass(this, "Ready Shape", "GSimpleShape");
  }

  static override GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static override VisualProperties: Readonly<Record<string, unknown>> = VisualProperties;

  declare _parameterizedVertexProcessor: ParameterizedVertexProcessor | null;
  declare _annotationsParamVals: Point[] | null;
  declare _sShapeName: string | null;
  declare _icon: string | null;
  declare _paths: Path[] | null;
  declare _currentPath: Path | null;
  declare _currentPathIdx: number | null;
  declare _srcBBox: Rect | null;

  /**
   * A ready shape from `processor` with the annotations at `positions`,
   * scaled to `width` x `height` when both are given. Without a
   * processor (restoring from a file) the old constructor did nothing at
   * all, not even the base constructors: the node starts without any own
   * fields and gets them from the file. That state is kept by removing
   * what the base constructors set.
   */
  constructor(
    processor?: ParameterizedVertexProcessor | null,
    positions?: readonly Point[] | null,
    width?: number,
    height?: number,
    name?: string | null,
    icon?: string | null,
  ) {
    super();
    if (!processor) {
      for (const key of Object.keys(this)) Reflect.deleteProperty(this, key);
      return;
    }
    this._parameterizedVertexProcessor = processor;
    this._annotationsParamVals = null;
    if (positions) {
      this._annotationsParamVals = [];
      for (let i = 0; i < positions.length; ++i) {
        const position = positions[i] as Point;
        this._annotationsParamVals.push(new Point(position.getX(), position.getY()));
      }
    }
    this._sShapeName = name as string | null;
    this._icon = icon || null;
    this._paintSharp = true;
    const vertices = this._parameterizedVertexProcessor.getVertices(this._annotationsParamVals);
    if (vertices && vertices.getCount()) {
      this._paths = PathUtil.createPathFromVertexSource(vertices, true) as Path[];
      const box = VertexInfo.calculateBounds(vertices, true);
      if (box && !box.isEmpty()) this._srcBBox = box;
      if (box && !box.isEmpty() && width && height) {
        const fromBox = Transform.getNativeRectTransformation(box);
        const target = new Rect(0, 0, width, height);
        const toTarget = Transform.getNativeRectTransformation(target);
        this.setProperty("trf", (fromBox.inverted() as Transform).multiplied(toTarget));
      }
    }
  }

  /** Moves annotation `index` to `location` (scene coordinates) and recomputes the shape. */
  setAnnotationMouseLocation(index: number, location: Point): void {
    if (
      this._annotationsParamVals &&
      this._annotationsParamVals.length &&
      index < this._annotationsParamVals.length
    ) {
      this._notifyChange(ElementChange.PrepareGeometryUpdate);
      const local =
        this.$trf && this.$trf.invertible()
          ? (this.$trf.inverted() as Transform).mapPoint(location)
          : location;
      this._annotationsParamVals[index] = local;
      this._invalidateVertices();
      this._notifyChange(ElementChange.FinishGeometryUpdate);
    }
  }

  getAnnotationsCount(): number {
    return this._annotationsParamVals ? this._annotationsParamVals.length : 0;
  }

  /** Where annotation `index` is drawn, mapped by `trf`, or null. */
  getAnnotationPosition(index: number): Point | null {
    let position: Point | null = null;
    if (
      this._annotationsParamVals &&
      this._annotationsParamVals.length &&
      index < this._annotationsParamVals.length
    ) {
      const value = this._annotationsParamVals[index] as Point;
      position = (
        this._parameterizedVertexProcessor as ParameterizedVertexProcessor
      ).getAnnotationPosition(index, value);
      // A null position throws here when there is a transform, as before.
      position = this.$trf ? this.$trf.mapPoint(position as Point) : position;
    }
    return position;
  }

  /** Calls `visitor` with each annotation position (mapped by `trf` when `transformed`). */
  iterateAnnotations(visitor: AnnotationVisitor, transformed?: boolean): void {
    if (this._annotationsParamVals && this._annotationsParamVals.length) {
      const transform = transformed ? this.$trf : null;
      for (let i = 0; i < this._annotationsParamVals.length; ++i) {
        let position = (
          this._parameterizedVertexProcessor as ParameterizedVertexProcessor
        ).getAnnotationPosition(i, this._annotationsParamVals[i] as Point);
        if (transform) position = transform.mapPoint(position as Point);
        if (true === visitor(position, i)) break;
      }
    }
  }

  override rewindVertices(index?: number): boolean {
    this._currentPathIdx = this._paths && this._paths.length ? 0 : null;
    if (0 === index && 0 === this._currentPathIdx) {
      const paths = this._paths as Path[];
      this._currentPath = paths[0] as Path;
      for (let i = 0; i < paths.length; ++i) (paths[i] as Path).rewindVertices(0);
      return true;
    }
    return false;
  }

  override readVertex(vertex: Vertex): boolean {
    if (null !== this._currentPathIdx) {
      const paths = this._paths as Path[];
      if ((this._currentPath as Path).readVertex(vertex)) return true;
      if (this._currentPathIdx + 1 < paths.length) {
        ++this._currentPathIdx;
        this._currentPath = paths[this._currentPathIdx] as Path;
        return this._currentPath.readVertex(vertex);
      }
    }
    return false;
  }

  override hasVertexForRead(): boolean {
    if (this._currentPath) {
      if (this._currentPath.hasVertexForRead()) return true;
      const paths = this._paths as Path[];
      if ((this._currentPathIdx as number) + 1 < paths.length) {
        return (paths[(this._currentPathIdx as number) + 1] as Path).hasVertexForRead();
      }
    }
    return false;
  }

  getIcon(): string | null {
    return this._icon;
  }

  override _isEvenOddFill(): boolean {
    return true;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (
      change === NodeChange.AfterPropertiesChange &&
      (args as PropertiesChangeArgs).properties.indexOf("trf") >= 0
    ) {
      this._setTransform(this.getProperty("trf") as Transform | null);
    } else if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      blob["ssn"] = this._sShapeName;
      if (this._icon) blob["icn"] = this._icon;
      blob["pvp"] = ParameterizedVertexProcessor.serialize(
        this._parameterizedVertexProcessor as ParameterizedVertexProcessor,
      );
      // A ready shape without handles has no list and stores an empty one.
      // The old store threw here, so such a shape could not be saved
      // (BUG-005). The old restore reads "[]" back as an empty list.
      const values: number[] = [];
      const positions = this._annotationsParamVals ?? [];
      for (let i = 0; i < positions.length; ++i) {
        values.push((positions[i] as Point).getX(), (positions[i] as Point).getY());
      }
      blob["apv"] = JSON.stringify(values, null, null as unknown as undefined);
    }
    super._handleChange(change, args);
    if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this._sShapeName = blob["ssn"] as string | null;
      this._parameterizedVertexProcessor = ParameterizedVertexProcessor.deserialize(blob["pvp"]);
      if (blob["apv"]) {
        this._annotationsParamVals = [];
        const values = JSON.parse(blob["apv"] as string) as number[];
        for (let i = 0; i + 1 < values.length; i += 2) {
          this._annotationsParamVals.push(new Point(values[i] as number, values[i + 1] as number));
        }
      }
      if (blob["icn"]) this._icon = blob["icn"] as string;
      this._invalidateVertices();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override _calculateSourceBBox(includeInvisible?: unknown): Rect | null {
    return this._srcBBox;
  }

  /** Recomputes the paths and the source box from the processor. */
  _invalidateVertices(): void {
    this._paths = null;
    this._srcBBox = null;
    if (this._parameterizedVertexProcessor) {
      const vertices: VertexContainer | null = this._parameterizedVertexProcessor.getVertices(
        this._annotationsParamVals,
      );
      if (vertices && vertices.getCount()) {
        this._srcBBox = VertexInfo.calculateBounds(vertices, true);
        this._paths = PathUtil.createPathFromVertexSource(vertices, true) as Path[];
        this._setTransform(this.getProperty("trf") as Transform | null);
      }
    }
  }

  /** Gives every path the shape's transform. */
  _setTransform(transform: Transform | null): void {
    if (this._paths && this._paths.length) {
      for (let i = 0; i < this._paths.length; ++i) (this._paths[i] as Path).setTransform(transform);
    }
  }

  override toString(): string {
    return this._sShapeName as string;
  }
}

const simpleShapePrototype = SimpleShape.prototype;
simpleShapePrototype._parameterizedVertexProcessor = null;
simpleShapePrototype._annotationsParamVals = null;
simpleShapePrototype._sShapeName = null;
simpleShapePrototype._paths = null;
simpleShapePrototype._currentPath = null;
simpleShapePrototype._currentPathIdx = null;
simpleShapePrototype._srcBBox = null;
