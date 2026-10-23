// Old: chunk.vendor.js module 534 (GImageGrid).
/**
 * The image grid, node "imagegrid": a shape made of rows of cells, each
 * cell [width, height] in grid units, separated by the margin `mg`.
 * `im` holds an image per cell (by cell index) and `off` their offsets;
 * the images live in an "imagegrid.images" container so they are part of
 * the scene, and every vertex preparation fits each image to its cell.
 * `trf` maps the grid's bounding box (including margins) to the unit
 * square.
 */
import { extend } from "../core/util.ts";
import { Vertex } from "../geometry/vertex.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { VertexTransformer } from "../geometry/vertex-transformer.ts";
import { GMath } from "../math/math.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import type { PaintContext } from "../paint/paint-context.ts";
import type { ShapePaintContext } from "./shape.ts";
import { ElementChange } from "./element-change.ts";
import type { Image } from "./image.ts";
import { NodeChange } from "./node-change.ts";
import { Container } from "./node-container.ts";
import { Multireference } from "./node-identity.ts";
import type { PropertiesChangeArgs } from "./node-properties.ts";
import { Node, registerNodeClass, type NodeWorkspace } from "./node.ts";
import { SceneNode, SceneNodeChange, type SceneHooks } from "./scene-node.ts";
import { Shape } from "./shape.ts";

/** Rows of cells, each [width, height]. */
export type ImageGridLayout = [number, number][][];

const GeometryProperties = {
  grid: null,
};

const VisualProperties = {
  im: null,
  mg: 0.1,
  off: null,
};

/** The layout a grid made with a constructor argument starts with. */
const DEFAULT_GRID: ImageGridLayout = [
  [
    [0.2, 0.2],
    [0.4, 0.2],
    [0.2, 0.2],
  ],
  [
    [0.3, 0.3],
    [0.3, 0.3],
    [0.4, 0.3],
  ],
  [
    [0.4, 0.5],
    [0.2, 0.5],
    [0.4, 0.5],
  ],
];

/** Visits a cell at x, y of width, height with its index; false stops. */
type CellVisitor = (x: number, y: number, width: number, height: number, index: number) => unknown;

/**
 * The container of a grid's images (node "imagegrid.images"). It is not
 * removable and only goes into a grid; changes to it update the grid's
 * geometry.
 */
export class ImageGridImages extends Multireference(Container(Node)) {
  static {
    registerNodeClass(this, "imagegrid.images", "GImageGrid.Images");
  }

  override validateInsertion(parent: Node): boolean {
    return parent instanceof ImageGrid;
  }

  override validateRemoval(): boolean {
    return false;
  }

  /** The images as serialized strings. */
  serialize(): (string | null)[] {
    const result: (string | null)[] = [];
    for (let child = this.getFirstChild(); null !== child; child = child.getNext()) {
      result.push(Node.serialize(child));
    }
    return result;
  }

  deserialize(blobs: string[]): void {
    for (let i = 0; i < blobs.length; ++i) {
      const node = Node.deserialize(blobs[i] as string) as Node;
      this.appendChild(node);
    }
  }

  override _handleChange(change: number, args?: unknown): void {
    const grid = this._parent as unknown as ImageGrid | null;
    if (grid) {
      switch (change) {
        case NodeChange.BeforeChildRemove:
        case NodeChange.BeforeChildInsert:
          grid._notifyChange(ElementChange.PrepareGeometryUpdate);
          break;
        case NodeChange.AfterChildRemove:
        case NodeChange.AfterChildInsert:
          grid.rewindVertices();
          grid._notifyChange(ElementChange.FinishGeometryUpdate);
          break;
        case ElementChange.ChildGeometryUpdate:
          grid._notifyChange(ElementChange.PrepareGeometryUpdate);
          grid.rewindVertices();
          grid._notifyChange(ElementChange.FinishGeometryUpdate);
      }
    }
    super._handleChange(change, args);
  }

  // The old class borrowed GElement's versions, which are GSceneNode's:
  // the workspace and scene of the nearest scene node above reach the images.
  override _attachToParent(parent: Node): void {
    (SceneNode.prototype._attachToParent as (this: Node, parent: Node) => void).call(this, parent);
  }

  override _detachFromParent(parent: Node): void {
    (SceneNode.prototype._detachFromParent as (this: Node, parent: Node) => void).call(
      this,
      parent,
    );
  }

  _setScene(scene: SceneHooks | null): void {
    this.acceptChildren((child) => {
      if (child instanceof SceneNode) child._setScene(scene);
    });
  }

  override toString(): string {
    return "[Object GImageGrid.Images]";
  }
}

export class ImageGrid extends Shape {
  static {
    registerNodeClass(this, "imagegrid", "GImageGrid");
  }

  static override GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static override VisualProperties: Readonly<Record<string, unknown>> = VisualProperties;
  static Images = ImageGridImages;

  declare $grid: ImageGridLayout | null | undefined;
  declare $im: (Image | null | undefined)[] | null;
  declare $mg: number;
  declare $off: number[][] | null;

  declare _images: ImageGridImages | null;
  /** The grid's size in grid units, margins included. */
  declare _gridMeasure: Point | null;
  declare _vertexSource: VertexTransformer | null;

  /**
   * With an argument the grid starts with the 3 x 3 default layout;
   * without, `grid` has no default at all (only the visual defaults are set).
   */
  constructor(withDefaultGrid?: unknown) {
    super();
    let defaults: Record<string, unknown> = VisualProperties;
    if (withDefaultGrid) {
      defaults = extend({ grid: DEFAULT_GRID }, VisualProperties) as Record<string, unknown>;
    }
    this._images = new ImageGridImages();
    this._images._setParent(this);
    this._setDefaultProperties(defaults);
  }

  /**
   * The cell outlines, mapped to the unit square by `trf`; fits every
   * image to its cell on the way (an image's `itrf` covers the cell
   * keeping its aspect ratio, its `trf` stretches its frame to the cell).
   */
  _prepareVertices(): VertexTransformer | null {
    const outline = new VertexContainer();
    const images = this.$im || [];
    const offsets = this.$off || [];
    if (!this.$grid) return null;
    this._gridMeasure = this._iterateGrid((x, y, width, height) => {
      outline.addVertex(Vertex.Command.Move, x, y);
      outline.addVertex(Vertex.Command.Line, x + width, y);
      outline.addVertex(Vertex.Command.Line, x + width, y + height);
      outline.addVertex(Vertex.Command.Line, x, y + height);
      // The old call left x and y undefined.
      outline.addVertex(
        Vertex.Command.Close,
        undefined as unknown as number,
        undefined as unknown as number,
      );
    }) as Point;
    const gridWidth = this._gridMeasure.getX();
    const gridHeight = this._gridMeasure.getY();
    // Width and height are swapped here, as in the old code.
    const toUnit = new Transform(1 / gridHeight, 0, 0, 1 / gridWidth, 0, 0);
    const own = this.$trf || new Transform();
    const toWorld = own.preMultiplied(toUnit);
    const container = this._images as ImageGridImages;
    container._beginBlockChanges([ElementChange.ChildGeometryUpdate]);
    this._iterateGrid((x, y, width, height, index) => {
      if (!(images.length > index && images[index])) return false;
      const image = images[index] as Image;
      image.setProperty("dblMode", false);
      const source = image.getSourceBBox();
      if (source && !source.isEmpty()) {
        let offsetX: number;
        let offsetY: number;
        if (offsets.length > 2 * index) {
          offsetX = offsets[2 * index] as unknown as number;
          offsetY = offsets[2 * index + 1] as unknown as number;
        } else {
          offsetX = 0;
          offsetY = 0;
        }
        const sourceRatio = source.getWidth() / source.getHeight();
        const cellRatio = width / height;
        const scaleX = width / source.getWidth();
        const scaleY = height / source.getHeight();
        const scale = sourceRatio >= cellRatio ? scaleY : scaleX;
        const imageTransform = new Transform(scale, 0, 0, scale, x + offsetX, y + offsetY);
        const frameTransform = new Transform(scaleX, 0, 0, scaleY, x, y);
        image.setProperty("itrf", imageTransform.multiplied(toWorld));
        image.setProperty("trf", frameTransform.multiplied(toWorld));
      }
      return undefined;
    });
    container._endBlockChanges([ElementChange.ChildGeometryUpdate]);
    return new VertexTransformer(outline, toWorld);
  }

  override rewindVertices(): boolean {
    if (!this._vertexSource) this._vertexSource = this._prepareVertices();
    return !!this._vertexSource && (this._vertexSource.rewindVertices(0), true);
  }

  override readVertex(vertex: Vertex): boolean {
    return (this._vertexSource as VertexTransformer).readVertex(vertex);
  }

  override hasVertexForRead(): boolean {
    return (this._vertexSource as VertexTransformer).hasVertexForRead();
  }

  /** Maps world coordinates to grid units. */
  getWorldToBoxTransform(): Transform | null {
    const own = this.$trf || new Transform();
    if (!own.invertible()) return null;
    const inverse = own.inverted() as Transform;
    const grid = this.$grid;
    if (!grid) return null;
    if (!grid.length || !grid[0] || !grid[0].length) return null;
    const measure = this._gridMeasure as Point;
    const scale = new Transform(measure.getX(), 0, 0, measure.getY(), 0, 0);
    return inverse.multiplied(scale);
  }

  /**
   * Calls `visit` per cell, row by row, with the margin around every
   * cell; returns the grid's size (0, 0 when empty).
   */
  _iterateGrid(visit: CellVisitor): Point | undefined {
    const grid = this.$grid;
    if (!grid) return undefined;
    const margin = this.$mg;
    let right = -1;
    let y = margin;
    let index = 0;
    for (let row = 0; row < grid.length; row++) {
      const cells = grid[row] as [number, number][];
      let x = margin;
      let rowHeight = 0;
      for (let column = 0; column < cells.length; column++) {
        const width = (cells[column] as [number, number])[0];
        const height = (cells[column] as [number, number])[1];
        rowHeight = Math.max(height, rowHeight);
        if (false === visit(x, y, width, height, index)) return undefined;
        x += width + margin;
        index++;
      }
      right = Math.max(right, x);
      y += rowHeight + margin;
    }
    return right > 0 && y > 0 ? new Point(right, y) : new Point(0, 0);
  }

  /**
   * Puts `image` into the cell whose center is nearest to the center of
   * `area` (world coordinates). The offset saved is the x distance, for
   * both coordinates (kept).
   */
  addImage(image: Image, area: Rect): void {
    if (!this.$grid) return;
    const toBox = this.getWorldToBoxTransform();
    if (!toBox) return;
    area = toBox.mapRect(area);
    const center = area.getSide(Rect.Side.CENTER);
    const centerX = center.getX();
    const centerY = center.getY();
    let best = Number.MAX_VALUE;
    let bestIndex = -1;
    let offset = 0;
    this._iterateGrid((x, y, width, height, index) => {
      const cellX = x + width / 2;
      const cellY = y + height / 2;
      const distance = GMath.ptSqrDist(cellX, cellY, centerX, centerY);
      if (distance < best) {
        best = distance;
        bestIndex = index;
        offset = centerX - cellX;
      }
    });
    if (bestIndex < 0) return;
    const images = (this.$im || []).slice();
    const offsets = (this.$off || []).slice();
    images[bestIndex] = image;
    offsets[bestIndex] = [offset, offset];
    this.setProperties(["im", "off"], [images, offsets]);
  }

  /** The images instead of fills. */
  override _paintFill(context: ShapePaintContext): void {
    const images = this.$im;
    if (images) {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        if (image) image.paint(context as unknown as PaintContext);
      }
    }
  }

  override _paintChildren(): void {}

  override _invalidateGeometryForChildUpdate(): void {
    this._vertexSource = null;
    this._geometryBBox = null;
    this._preTransformRect = null;
    this._paintBBox = null;
    this._childrenPaintBBox = null;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (!change) return;
    const images = this._images as ImageGridImages;
    if (change == NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      this.storeProperties(blob, GeometryProperties);
      this.storeProperties(blob, VisualProperties, (name, value) =>
        "im" === name && value ? (value as Node[]).map((image) => Node.serialize(image)) : value,
      );
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, GeometryProperties);
      this.restoreProperties(blob, VisualProperties, (name, value) =>
        "im" === name && value
          ? (value as string[]).map((image) => Node.deserialize(image))
          : value,
      );
    } else if (change == ElementChange.FinishGeometryUpdate) {
      this._vertexSource = null;
    } else if (change === NodeChange.ParentAttached || change === NodeChange.ParentDetach) {
      if (this.$im) {
        images._detachFromParent(this);
        if (change === NodeChange.ParentAttached) images._attachToParent(this);
      }
    } else if (change === NodeChange.WorkspaceAttached || change === NodeChange.WorkspaceDetach) {
      if (this._images) {
        const workspace: NodeWorkspace | null =
          change === NodeChange.WorkspaceDetach ? null : this._workspace;
        images._setWorkspace(workspace);
        for (let child = images.getFirstChild(); null != child; child = child.getNext()) {
          child._setWorkspace(workspace);
        }
      }
    } else if (
      change === SceneNodeChange.SceneAttached ||
      change === SceneNodeChange.SceneDetached
    ) {
      if (this._images) {
        const scene = change === SceneNodeChange.SceneDetached ? null : this._scene;
        images._setScene(scene);
        for (let child = images.getFirstChild(); null != child; child = child.getNext()) {
          (child as SceneNode)._setScene(scene);
        }
      }
    } else if (
      change === NodeChange.AfterPropertiesChange &&
      (args as PropertiesChangeArgs).properties.indexOf("im") >= 0
    ) {
      // Keeps the container's children the images of `im`.
      const list = this.$im as (Image | null | undefined)[];
      const blocked = [
        NodeChange.BeforeChildRemove,
        NodeChange.AfterChildRemove,
        NodeChange.BeforeChildInsert,
        NodeChange.AfterChildInsert,
      ];
      try {
        images._beginBlockChanges(blocked);
        for (let i = 0; i < list.length; i++) {
          const image = list[i];
          if (image) {
            let child = images.getFirstChild();
            while (null != child && image !== child) child = child.getNext();
            if (null === child) images.appendChild(image);
          }
        }
        for (let child = images.getFirstChild(); null != child; child = child.getNext()) {
          if (list.indexOf(child as Image) < 0) images.removeChild(child);
        }
      } finally {
        images._endBlockChanges(blocked);
      }
    }
    super._handleChange(change, args);
  }

  override getSubnodeIds(ids: Record<string, Node>): void {
    super.getSubnodeIds(ids);
    if (this._images) {
      if (ids[this._images.getMultireferenceId()]) this._images.resetMultireference();
      ids[this._images.getMultireferenceId()] = this._images;
      this._images.getSubnodeIds(ids);
    }
  }

  override toString(): string {
    return "[GImageGrid]";
  }
}

const imageGridPrototype = ImageGrid.prototype;
imageGridPrototype._images = null;
imageGridPrototype._gridMeasure = null;
imageGridPrototype._vertexSource = null;
