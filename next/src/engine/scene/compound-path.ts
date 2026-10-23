// Old: chunk.vendor.js module 113 (GCompoundPath, GCompoundPath.Paths).
/**
 * Several paths painted as one shape (even-odd by default), node
 * "compoundpath". The sub-paths live in their own container
 * (`getPaths()`, node "compoundpath.paths"), saved as `paths`: a list of
 * serialized path strings. The container keeps quadtrees over the
 * sub-paths, so hit tests and collisions only look at the paths nearby.
 */
import type { AnyConstructor } from "../core/object.ts";
import { Locale } from "../core/locale/locale.ts";
import { QuadTree } from "../geometry/quadtree.ts";
import type { VertexReader } from "../geometry/vertex-source.ts";
import { VertexPixelAligner } from "../geometry/vertex-pixel-aligner.ts";
import { VertexInfo } from "../geometry/vertex-info.ts";
import { VertexTransformer } from "../geometry/vertex-transformer.ts";
import type { Vertex } from "../geometry/vertex.ts";
import type { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import type { Transform } from "../math/transform.ts";
import type { HitResult } from "../geometry/hit-result.ts";
import type { PaintCanvas } from "../paint/paint-canvas.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { Accelerated, type AcceleratedApi } from "./element-accelerated.ts";
import { CollisionFlag, ElementChange } from "./element-change.ts";
import { Element, type CollisionCollector } from "./element.ts";
import { Item } from "./item.ts";
import { NodeChange } from "./node-change.ts";
import { Container, type ContainerApi, type ContainerNode } from "./node-container.ts";
import { Multireference, type MultireferenceApi } from "./node-identity.ts";
import type { PropertiesChangeArgs } from "./node-properties.ts";
import { Node, registerNodeClass } from "./node.ts";
import { AnchorPoint, isConnectorAnchor, type PathSceneHooks } from "./path-base.ts";
import type { Path } from "./path.ts";
import type { ReferenceEvent } from "./reference-event.ts";
import { SceneNode, SceneNodeChange, type SceneHooks } from "./scene-node.ts";
import { Shape, type ShapeCollisionInfo } from "./shape.ts";

const VisualProperties = {
  evenodd: true,
};

const GeometryProperties = {};

const MetaProperties = {
  csc: true,
};

/** A connector whose anchors stick to paths. */
interface Connector extends Node {
  relayout(): void;
  attachPath(anchor: AnchorPoint, path: Node | null): void;
}

function connectorOf(anchor: AnchorPoint): Connector {
  return anchor.getPath() as unknown as Connector;
}

type PathsBaseInstance = Node & ContainerApi & MultireferenceApi & AcceleratedApi;

// GElement.Accelerated on a plain node: the mixin only needs the
// container methods and the children's boxes, so the old code mixed it
// into this GNode. Its factory is typed for elements, hence the casts.
const PathsBase = Accelerated(
  Multireference(Container(Node)) as unknown as AnyConstructor<Element>,
) as unknown as AnyConstructor<PathsBaseInstance>;

/**
 * GCompoundPath.Paths, node "compoundpath.paths": the sub-paths. Only a
 * compound path can hold it and it can't be removed. Changes of the
 * sub-paths become geometry updates of the compound path.
 */
export class Paths extends PathsBase {
  static {
    registerNodeClass(this, "compoundpath.paths", "GCompoundPath.Paths");
  }

  /** The compound path these paths belong to. */
  get _compound(): CompoundPath | null {
    return this._parent as unknown as CompoundPath | null;
  }

  override getFirstChild(): Path | null {
    return super.getFirstChild() as Path | null;
  }

  override validateInsertion(parent: ContainerNode, reference?: Node | null): boolean {
    void reference;
    return parent instanceof CompoundPath;
  }

  override validateRemoval(): boolean {
    return false;
  }

  serialize(): unknown[] {
    const data: unknown[] = this._multiReferenceId ? ["&", this._multiReferenceId] : [];
    for (let path = this.getFirstChild(); null !== path; path = path.getNext() as Path | null) {
      data.push(Node.serialize(path));
    }
    return data;
  }

  /** Appends the serialized paths (a leading multi-reference id is skipped, not restored). */
  deserialize(data: readonly unknown[]): void {
    let index: number;
    for (index = "&" === data[0] ? 2 : 0; index < data.length;) {
      const path = Node.deserialize(data[index++] as string);
      if (path) this.appendChild(path as Node);
      else console.warn("Cannot deserialize path");
    }
  }

  override _handleChange(change: number, args?: unknown): void {
    const compound = this._compound;
    if (compound) {
      switch (change) {
        case NodeChange.BeforeChildRemove:
        case NodeChange.BeforeChildInsert:
          compound._notifyChange(ElementChange.PrepareGeometryUpdate);
          break;
        case NodeChange.AfterChildRemove:
        case NodeChange.AfterChildInsert:
          compound.rewindVertices(0);
          compound._notifyChange(ElementChange.FinishGeometryUpdate);
          if (change == NodeChange.AfterChildInsert) (args as Node).setFlag(compound._flags);
          break;
        case ElementChange.ChildGeometryUpdate:
          compound._notifyChange(ElementChange.PrepareGeometryUpdate);
          compound.rewindVertices(0);
          compound._notifyChange(ElementChange.FinishGeometryUpdate);
      }
      this._handleChildrenStructureChange(change, args);
    }
    super._handleChange(change, args);
  }

  // GElement's (that is, GSceneNode's) attach and detach: the sub-paths
  // get the workspace and the scene of the compound path.
  override _attachToParent(parent: Node): void {
    SceneNode.prototype._attachToParent.call(this, parent);
  }

  override _detachFromParent(parent: Node): void {
    SceneNode.prototype._detachFromParent.call(this, parent);
  }

  _setScene(scene: SceneHooks | null): void {
    this.acceptChildren((child) => {
      if (child instanceof Element) child._setScene(scene);
      return undefined;
    });
  }

  override toString(): string {
    return "[Object GCompoundPath.Paths]";
  }
}

export class CompoundPath extends Shape {
  static {
    registerNodeClass(this, "compoundpath", "GCompoundPath");
  }

  static override VisualProperties: Readonly<Record<string, unknown>> = VisualProperties;
  static override GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static override MetaProperties: Readonly<Record<string, unknown>> = MetaProperties;
  static Paths = Paths;

  /** Whether `path` is a sub-path of a compound path. */
  static isOwnedPath(path: Node): boolean | null {
    const parent = path.getParent();
    return parent && parent instanceof Paths;
  }

  declare $evenodd: boolean;
  declare $csc: boolean;
  declare _referencedNodes: Node[] | null;
  declare _delayedRefresh: boolean;
  declare _paths: Paths;
  /** The sub-path being read. */
  declare _currentPath: Path | null;

  constructor() {
    super();
    this._setDefaultProperties(VisualProperties, MetaProperties);
    this._paths = new Paths();
    this._paths._setParent(this as unknown as ContainerNode);
    this._paintSharp = true;
  }

  get _pathScene(): PathSceneHooks {
    return this._scene as PathSceneHooks;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GCompoundPath", "name", this.getNodeName()) as string;
  }

  /** Rewinds every sub-path and starts with the first; false without paths. */
  override rewindVertices(index?: number): boolean {
    if (((this._currentPath = this._paths.getFirstChild()), 0 === index && this._currentPath)) {
      for (
        let path: Path | null = this._currentPath;
        null != path;
        path = path.getNext() as Path | null
      ) {
        path.rewindVertices(0);
      }
      return true;
    }
    return false;
  }

  /** Reads on into the next sub-path (null, not false, after the last one, as before). */
  override readVertex(vertex: Vertex): boolean {
    return (
      !!this._currentPath &&
      (!!this._currentPath.readVertex(vertex) ||
        (((this._currentPath = this._currentPath.getNext() as Path | null) &&
          this._currentPath.readVertex(vertex)) as boolean))
    );
  }

  override hasVertexForRead(): boolean {
    if (this._currentPath) {
      if (this._currentPath.hasVertexForRead()) return true;
      const next = this._currentPath.getNext() as Path | null;
      if (next && next.hasVertexForRead()) return true;
    }
    return false;
  }

  getPaths(): Paths {
    return this._paths;
  }

  override getSubnodeIds(ids: Record<string, Node>): void {
    super.getSubnodeIds(ids);
    if (this._paths) {
      if (ids[this._paths.getMultireferenceId()]) this._paths.resetMultireference();
      ids[this._paths.getMultireferenceId()] = this._paths;
      this._paths.getSubnodeIds(ids);
    }
  }

  /** The sub-paths whose paint box is near the point. */
  override _getVertexHitCandidates(
    location: Point,
    transform: Transform | null | undefined,
    tolerance: number,
  ): VertexReader[] {
    const point = transform ? (transform.inverted() as Transform).mapPoint(location) : location;
    const area = new Rect(
      point.getX() - tolerance / 2,
      point.getY() - tolerance / 2,
      tolerance,
      tolerance,
    );
    return (this._paths.retrieveChildrenInPaintBBox(area, QuadTree.RETRIEVE_MODE_INTERSECT) ||
      []) as unknown as VertexReader[];
  }

  /** Inside one sub-path (non-zero), or an odd number of them (even-odd). */
  override _hitInside(
    point: Point,
    transform: Transform | null | undefined,
    result: HitResult,
    candidates?: VertexReader[] | null,
  ): boolean {
    const list = candidates as VertexReader[];
    let count = 0;
    for (let i = 0; i < list.length; i++) {
      const source = transform
        ? new VertexTransformer(list[i] as VertexReader, transform)
        : (list[i] as VertexReader);
      if (VertexInfo.hitTest(point.getX(), point.getY(), source, 0, true, result)) {
        if (!result.outline) {
          if (!this.getProperty("evenodd")) return true;
          ++count;
        }
        result.x = null;
        result.y = null;
        result.slope = null;
        result.outline = null;
        result.segment = null;
      }
    }
    return !!(count > 0 && 1 & count) && ((result.outline = false), true);
  }

  _doPixelAlignment(canvas: PaintCanvas, source: VertexReader): VertexReader {
    const alignment = this._getAlignTransformation(canvas);
    source = new VertexTransformer(source, alignment);
    return new VertexPixelAligner(source, canvas.getTransform());
  }

  /** Attaches or detaches a connector anchor that the scene linked to this path. */
  override _referenceEvent(event: ReferenceEvent): void {
    if (event.target !== this) return;
    const linked = event.linked;
    if (isConnectorAnchor(event.reference)) {
      connectorOf(event.reference).attachPath(event.reference, linked ? this : null);
      super._referenceEvent(event);
    }
  }

  override _handleReferencesOnSceneAttach(): void {
    super._handleReferencesOnSceneAttach(this._referencedNodes);
    this._referencedNodes = null;
  }

  override _handleVisualChangeForProperties(
    change: number,
    args: unknown,
    properties: Readonly<Record<string, unknown>>,
  ): boolean {
    if (
      change == NodeChange.AfterPropertiesChange &&
      (args as PropertiesChangeArgs).properties.indexOf("evenodd") >= 0
    ) {
      this._collidesWithChildrenSeparate = undefined;
      this._collidesWithChildren = undefined;
    }
    return super._handleVisualChangeForProperties(change, args, properties);
  }

  override _handleChange(change: number, args?: unknown): void {
    this._handleVisualChangeForProperties(change, args, VisualProperties);
    if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      this.storeProperties(blob, VisualProperties);
      this.storeProperties(blob, MetaProperties);
      blob["paths"] = this._paths.serialize();
      if (this._scene) {
        const anchors: unknown[] = [];
        this._pathScene.visitReferences(this, (reference) => {
          if (isConnectorAnchor(reference)) anchors.push(reference.serialize());
        });
        blob["refanchors"] = anchors;
      }
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, MetaProperties);
      this.restoreProperties(blob, VisualProperties);
      if (Object.prototype.hasOwnProperty.call(blob, "paths")) {
        this._paths.deserialize(blob["paths"] as unknown[]);
      }
      this._referencedNodes = [];
      if (Object.prototype.hasOwnProperty.call(blob, "refanchors")) {
        (blob["refanchors"] as unknown[][]).forEach((data) => {
          const anchor = new AnchorPoint();
          anchor.deserialize(data);
          (this._referencedNodes as Node[]).push(anchor);
        });
      }
    } else if (change === NodeChange.ParentAttached || change === NodeChange.ParentDetach) {
      if (this._paths) {
        this._paths._detachFromParent(this);
        if (change === NodeChange.ParentAttached) this._paths._attachToParent(this);
        else if (this._scene) {
          // Connectors attached to a removed compound path go with it.
          this._pathScene.visitReferences(this, (reference) => {
            if (isConnectorAnchor(reference)) {
              const connector = reference.getPath();
              if (connector && connector.getParent()) {
                (connector.getParent() as ContainerNode).removeChild(connector);
              }
            }
          });
        }
      }
    } else if (change === NodeChange.WorkspaceAttached || change === NodeChange.WorkspaceDetach) {
      if (this._paths) {
        this._paths._setWorkspace(change === NodeChange.WorkspaceDetach ? null : this._workspace);
        for (
          let path = this._paths.getFirstChild();
          null != path;
          path = path.getNext() as Path | null
        ) {
          path._setWorkspace(change === NodeChange.WorkspaceDetach ? null : this._workspace);
        }
      }
    } else if (
      change === SceneNodeChange.SceneAttached ||
      change === SceneNodeChange.SceneDetached
    ) {
      if (this._paths) {
        this._paths._setScene(change === SceneNodeChange.SceneDetached ? null : this._scene);
        for (
          let path = this._paths.getFirstChild();
          null != path;
          path = path.getNext() as Path | null
        ) {
          path._setScene(change === SceneNodeChange.SceneDetached ? null : this._scene);
        }
      }
    } else if (change === NodeChange.AfterPropertiesChange) {
      const changed = args as PropertiesChangeArgs;
      if (changed.properties.indexOf("refs") >= 0) {
        if (!this._scene) this._delayedRefresh = true;
      } else if (changed.properties.indexOf("csc") >= 0 && this._paths) {
        for (
          let path = this._paths.getFirstChild();
          null != path;
          path = path.getNext() as Path | null
        ) {
          const changes = [NodeChange.BeforePropertiesChange, NodeChange.AfterPropertiesChange];
          path._beginBlockChanges(changes);
          path.setProperty(
            "csc",
            this.getProperty("csc"),
            changed.custom,
            changed.forceEvent,
            changed.temporary,
          );
          path._endBlockChanges(changes);
        }
      }
    }
    super._handleChange(change, args);
    if (!(
      change !== ElementChange.FinishGeometryUpdate ||
      (this.isRecordedTransaction() && !this.isRestoring())
    )) {
      if (this._scene) {
        this._pathScene.visitReferences(this, (reference) => {
          if (isConnectorAnchor(reference)) connectorOf(reference).relayout();
        });
      } else this._delayedRefresh = true;
    }
    if (change === SceneNodeChange.SceneAttached && this._delayedRefresh) {
      this._pathScene.visitReferences(this, (reference) => {
        if (isConnectorAnchor(reference)) connectorOf(reference).relayout();
      });
      this._delayedRefresh = false;
    }
    if (change == NodeChange.AfterFlagChange && (args as { set: boolean }).set) {
      const flagChange = args as { flag: number; set: boolean };
      this._currentPath = this._paths.getFirstChild();
      for (let path = this._currentPath; null != path; path = path.getNext() as Path | null) {
        path.setFlag(flagChange.flag);
      }
    } else if (change == NodeChange.BeforeFlagChange && !(args as { set: boolean }).set) {
      const flagChange = args as { flag: number; set: boolean };
      this._currentPath = this._paths.getFirstChild();
      for (let path = this._currentPath; null != path; path = path.getNext() as Path | null) {
        path.removeFlag(flagChange.flag);
      }
    }
  }

  /** The compound path's own children changes go to the sub-path quadtrees. */
  override _handleChildrenStructureChange(change: number, args: unknown): void {
    this._paths._handleChildrenStructureChange(change, args);
  }

  /** Sets `trf` here and on every sub-path. */
  override setTransform(transform: Transform | null): void {
    this.setProperty("trf", transform);
    for (
      let path = this._paths.getFirstChild();
      null != path;
      path = path.getNext() as Path | null
    ) {
      path.setTransform(transform);
    }
  }

  override assignFrom(other: Node): void {
    if (other instanceof CompoundPath) this.transferProperties(other, [VisualProperties]);
    super.assignFrom(other);
  }

  /** Transforms the compound path and every sub-path (in one update). */
  override transform(
    transform: Transform,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void {
    this.beginUpdate();
    try {
      super.transform(transform, force, exceptions);
      if (transform && !transform.isIdentity()) {
        for (
          let path = this._paths.getFirstChild();
          null != path;
          path = path.getNext() as Path | null
        ) {
          path.transform(transform);
        }
      }
      if (this._scene) {
        this._pathScene.visitReferences(this, (reference) => {
          if (isConnectorAnchor(reference)) connectorOf(reference).relayout();
        });
      }
    } finally {
      this.endUpdate();
    }
  }

  /**
   * Partial collisions by the sub-paths near the area (GShape's test when
   * both the details and full containment are asked for).
   */
  override _checkPartialCollision(
    bounds: Rect,
    box: Rect,
    area: VertexReader,
    inclusive: boolean,
    flags: number,
    collect: CollisionCollector,
  ): void {
    const withInfo = flags & CollisionFlag.CollisionInfo;
    const fully = flags & CollisionFlag.FullyContained;
    if (withInfo && fully) {
      return super._checkPartialCollision(bounds, box, area, inclusive, flags, collect);
    }
    if (!bounds.intersectsRect(box, inclusive)) return;
    const byPaint = 0 != (flags & CollisionFlag.PaintBBox);
    const mode = fully ? QuadTree.RETRIEVE_MODE_FULLYCONTAINED : QuadTree.RETRIEVE_MODE_INTERSECT;
    const candidates = (byPaint
      ? this._paths.retrieveChildrenInPaintBBox(bounds, mode)
      : this._paths.retrieveChildrenInGeometryBBox(bounds, mode)) as unknown as Path[] | null;
    if (!candidates) return;
    let count = 0;
    if (withInfo) {
      // Nothing is reported with the details alone (old behaviour).
    } else if (this._isEvenOddFill()) {
      const infos: ShapeCollisionInfo[] = [];
      let intersects = false;
      for (let i = 0; i < candidates.length && !intersects; i++) {
        const candidate = candidates[i] as Path;
        const candidateBox = (
          byPaint ? candidate.getPaintBBox() : candidate.getGeometryBBox()
        ) as Rect;
        candidate._checkPartialCollision(
          bounds,
          candidateBox,
          area,
          inclusive,
          flags | CollisionFlag.CollisionInfo,
          (found) => {
            const info = found as unknown as ShapeCollisionInfo;
            infos.push(info);
            intersects = intersects || info.intersects;
          },
        );
      }
      if (intersects) {
        collect(this);
        return;
      }
      for (let i = 0; i < infos.length; i++) {
        if (!(infos[i] as ShapeCollisionInfo).containsArea) {
          collect(this);
          return;
        }
      }
    } else {
      for (let i = 0; i < candidates.length && !count; i++) {
        const candidate = candidates[i] as Path;
        const candidateBox = (
          byPaint ? candidate.getPaintBBox() : candidate.getGeometryBBox()
        ) as Rect;
        candidate._checkPartialCollision(bounds, candidateBox, area, inclusive, flags, () => {
          count += 1;
        });
      }
      if (count) collect(this);
    }
  }

  /** The sub-paths' pivots (only those near `area`, when given). */
  override findPivots(details?: unknown, area?: unknown): unknown[] | null {
    void details;
    if (area) {
      const near = this._paths.retrieveChildrenInGeometryBBox(
        area as Rect,
        QuadTree.RETRIEVE_MODE_INTERSECT,
      );
      return near && near.length
        ? near.reduce<unknown[]>(
            (pivots, path) => pivots.concat(path.findPivots(false, area) || []),
            (near[0] as Element).findPivots(false, area) || [],
          )
        : null;
    }
    let pivots: unknown[] | null = null;
    for (
      let path = this._paths.getFirstChild();
      null != path;
      path = path.getNext() as Path | null
    ) {
      const own = path.findPivots(false, area);
      if (own) pivots = pivots ? pivots.concat(own) : own;
    }
    return pivots;
  }

  /** A copy of the sub-paths container. */
  cloneSubPaths(): Paths {
    const data = this._paths.serialize();
    const copy = new Paths();
    copy.deserialize(data);
    return copy;
  }

  /** The geometry box center (GItem's, not GShape's). */
  override getCenter(transformed?: unknown): Point | null {
    return Item.prototype.getCenter.call(this, transformed);
  }

  /** The union of the sub-paths' boxes that are not empty in both directions. */
  override _calculateGeometryBBox(includeInvisible?: unknown): Rect | null {
    let bbox: Rect | null = null;
    for (
      let path = this._paths.getFirstChild();
      null != path;
      path = path.getNext() as Path | null
    ) {
      const box = path.getGeometryBBox(includeInvisible);
      if (box && (box.getWidth() > 0 || box.getHeight() > 0)) bbox = bbox ? bbox.united(box) : box;
    }
    return bbox || null;
  }

  override _updateQTree(): void {
    this._paths._updateQTree();
  }

  override _isEvenOddFill(): boolean {
    return !!this.$evenodd;
  }

  override _beginBlockEvents(eventClasses: readonly unknown[]): void {
    super._beginBlockEvents(eventClasses);
    for (
      let path = this._paths.getFirstChild();
      null != path;
      path = path.getNext() as Path | null
    ) {
      path._beginBlockEvents(eventClasses);
    }
  }

  override _endBlockEvents(eventClasses: readonly unknown[]): void {
    super._endBlockEvents(eventClasses);
    for (
      let path = this._paths.getFirstChild();
      null != path;
      path = path.getNext() as Path | null
    ) {
      path._endBlockEvents(eventClasses);
    }
  }

  override toString(): string {
    return "[GCompoundPath]";
  }
}

const compoundPathPrototype = CompoundPath.prototype;
compoundPathPrototype._referencedNodes = null;
compoundPathPrototype._delayedRefresh = false;
compoundPathPrototype._paths = null as unknown as Paths;
compoundPathPrototype._currentPath = null;
