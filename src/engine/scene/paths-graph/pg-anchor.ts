// Old: chunk.vendor.js module 657 (GPGAnchor, not in the G barrel).
/**
 * A vertex of the paths graph: a point with the edges that start (out)
 * and end (in) there, kept sorted by the angle at which each edge leaves
 * the point. Saved as `props: [uid, x, y]`. Moving the anchor moves the
 * matching end point of every edge.
 *
 * Painting draws the joins between edges that share a style: the short
 * pieces of two neighbouring edges near the anchor are stroked as one
 * path, so the line join applies there.
 */
import { RGBColor } from "../../color/rgb-color.ts";
import { getOwnTypeId, markMixins, registerClass } from "../../core/object.ts";
import { Uid } from "../../core/uid.ts";
import { GMath } from "../../math/math.ts";
import { Point } from "../../math/point.ts";
import type { Transform } from "../../math/transform.ts";
import { Canvas2DPaintCanvas } from "../../paint/paint-canvas.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import type { StylePaintContext } from "../../style/element-stylable.ts";
import { Anchor } from "../anchor.ts";
import { NodeChange } from "../node-change.ts";
import type { ContainerNode } from "../node-container.ts";
import { Multireference } from "../node-identity.ts";
import { Properties, type PropertiesChangeArgs } from "../node-properties.ts";
import { Store } from "../node-store.ts";
import { MapContainer, Node, registerNodeClass } from "../node.ts";
import { AnchorPoint } from "../path-base.ts";
import type { SceneHooks } from "../scene-node.ts";
import type { GraphAnchor } from "./graph.ts";
import type { PGEdge } from "./pg-edge.ts";

// GAnchor was a plain class mixed into GPGAnchor; the old mixing gave it a
// type id on first use. anchor.ts doesn't register it, so this does.
if (null === getOwnTypeId(Anchor)) registerClass(Anchor, "GAnchor");

const GeometryProperties = {
  uid: null,
  x: 0,
  y: 0,
};

const EdgeType = {
  Out: 1,
  In: 2,
} as const;

/** The anchor's edges. */
export type AnchorEdge = PGEdge;

/** An edge at the anchor with the angle it leaves at; `idx` is its index in the in or out list. */
export class OrderedEdge {
  declare type: number | null;
  declare idx: number | null;
  declare _angle: number | null;

  constructor(edge: AnchorEdge, type: number, idx: number) {
    this.type = type;
    this.idx = idx;
    this._angle = type === EdgeType.Out ? edge.getStartAngle() : edge.getEndAngle();
  }

  getAngle(): number {
    return this._angle as number;
  }
}

OrderedEdge.prototype.type = null;
OrderedEdge.prototype.idx = null;
OrderedEdge.prototype._angle = null;

/** The next edge around the anchor, as the facet walk needs it. */
export interface NextOrderedEdge {
  edge: AnchorEdge | undefined;
  type: number | null;
  insidePt: Point | null;
}

export class PGAnchor extends Multireference(Properties(Store(Node))) implements GraphAnchor {
  static {
    registerNodeClass(this, "GPGAnchor", "GPGAnchor");
    markMixins(this, [Anchor]);
  }

  static GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static EdgeType = EdgeType;
  static OrderedEdge = OrderedEdge;

  declare $uid: Uid;
  declare $x: number;
  declare $y: number;

  // From GAnchor.
  declare _uid: Uid | null;
  declare _outEdges: AnchorEdge[];
  declare _inEdges: AnchorEdge[];
  declare _data: unknown;
  declare _orderedEdges: OrderedEdge[] | null;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
    this.$uid = new Uid();
    this._outEdges = [];
    this._inEdges = [];
  }

  override validateInsertion(parent: ContainerNode): boolean {
    return (
      parent instanceof MapContainer &&
      (!parent.getParent() || "Paths Graph" === Node.getName(parent.getParent()))
    );
  }

  getId(): Uid {
    return this.$uid;
  }

  getPoint(): Point {
    return new Point(this.$x, this.$y);
  }

  // GAnchor's accessors.
  getOutEdges(): AnchorEdge[] {
    return this._outEdges;
  }

  getInEdges(): AnchorEdge[] {
    return this._inEdges;
  }

  getData(): unknown {
    return this._data;
  }

  // GAnchor's empty ones this class doesn't replace.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old empty signature
  addEdge(edge: unknown): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old empty signature
  setOutEdges(edges: unknown): void {}

  addOutEdge(edge: AnchorEdge): void {
    this._outEdges.push(edge);
    this._insertOrdered(new OrderedEdge(edge, EdgeType.Out, this._outEdges.length - 1));
  }

  addInEdge(edge: AnchorEdge): void {
    this._inEdges.push(edge);
    this._insertOrdered(new OrderedEdge(edge, EdgeType.In, this._inEdges.length - 1));
  }

  setData(data: unknown): void {
    this._data = data;
  }

  /** Removes the first out edge, or else the first in edge, with the edge's id. */
  removeEdge(edge: AnchorEdge): void {
    let found = false;
    for (let i = 0; i < this._outEdges.length && !found; ++i) {
      if ((this._outEdges[i] as AnchorEdge).getId().isEqual(edge.getId())) {
        this._outEdges.splice(i, 1);
        found = true;
      }
    }
    for (let i = 0; i < this._inEdges.length && !found; ++i) {
      if ((this._inEdges[i] as AnchorEdge).getId().isEqual(edge.getId())) {
        this._inEdges.splice(i, 1);
        found = true;
      }
    }
    this.orderEdges();
  }

  removeOutEdge(edge: AnchorEdge): void {
    let found = false;
    for (let i = 0; i < this._outEdges.length && !found; ++i) {
      if ((this._outEdges[i] as AnchorEdge).getId().isEqual(edge.getId())) {
        this._outEdges.splice(i, 1);
        this.orderEdges();
        found = true;
      }
    }
  }

  removeInEdge(edge: AnchorEdge): void {
    let found = false;
    for (let i = 0; i < this._inEdges.length && !found; ++i) {
      if ((this._inEdges[i] as AnchorEdge).getId().isEqual(edge.getId())) {
        this._inEdges.splice(i, 1);
        this.orderEdges();
        found = true;
      }
    }
  }

  /** Rebuilds the angle order from the out and in lists. */
  orderEdges(): void {
    this._orderedEdges = null;
    for (let i = 0; i < this._outEdges.length; ++i) {
      this._insertOrdered(new OrderedEdge(this._outEdges[i] as AnchorEdge, EdgeType.Out, i));
    }
    for (let i = 0; i < this._inEdges.length; ++i) {
      this._insertOrdered(new OrderedEdge(this._inEdges[i] as AnchorEdge, EdgeType.In, i));
    }
  }

  /**
   * The edge after `edge` (of `type`) in angle order, wrapping around.
   * With `withInsidePoint`, also a point 0.001 away from the anchor
   * halfway between the two edges' angles (on the far side when the
   * anchor has one edge). Null when `edge` isn't found.
   */
  getNextEdgeOrdered(
    edge: AnchorEdge,
    type: number,
    withInsidePoint: boolean,
  ): NextOrderedEdge | null {
    let angle: number | undefined;
    let nextAngle: number | undefined;
    let middle: number;
    let dx: number | undefined;
    let dy: number | undefined;
    const ordered = this._orderedEdges;
    if (ordered) {
      if (ordered.length > 1) {
        for (let i = 0; i < ordered.length; ++i) {
          const current = ordered[i] as OrderedEdge;
          if (current.type == type) {
            if (
              (type == EdgeType.Out ? this._outEdges : this._inEdges)[current.idx as number] == edge
            ) {
              const next = (i + 1 < ordered.length ? ordered[i + 1] : ordered[0]) as OrderedEdge;
              const list = next.type == EdgeType.Out ? this._outEdges : this._inEdges;
              if (withInsidePoint) {
                angle = current.getAngle();
                nextAngle = next.getAngle();
                if (angle > nextAngle) nextAngle += GMath.PI2;
                middle = angle + (nextAngle - angle) / 2;
                dx = 0.001 * Math.cos(middle);
                dy = 0.001 * Math.sin(middle);
              }
              return {
                edge: list[next.idx as number],
                type: next.type,
                insidePt:
                  withInsidePoint && angle != nextAngle
                    ? new Point(this.$x + (dx as number), this.$y - (dy as number))
                    : null,
              };
            }
          }
        }
      } else if (ordered.length) {
        const current = ordered[0] as OrderedEdge;
        if (current.type == type) {
          if (
            (type == EdgeType.Out ? this._outEdges : this._inEdges)[current.idx as number] == edge
          ) {
            if (withInsidePoint) {
              middle = current.getAngle() + Math.PI;
              dx = 0.001 * Math.cos(middle);
              dy = 0.001 * Math.sin(middle);
            }
            return {
              edge,
              type,
              insidePt: withInsidePoint
                ? new Point(this.$x + (dx as number), this.$y - (dy as number))
                : null,
            };
          }
        }
      }
    }
    return null;
  }

  /** [uid, x, y] */
  serialize(): unknown[] {
    const data: unknown[] = [];
    data.push(this.$uid.toString());
    data.push(this.$x);
    data.push(this.$y);
    return data;
  }

  deserialize(data: readonly unknown[]): void {
    if (data.length > 0 && "string" == typeof data[0]) this.$uid = new Uid(data[0]);
    if (data.length >= 3) {
      this.$x = data[1] as number;
      this.$y = data[2] as number;
    }
  }

  /**
   * Strokes the join between neighbouring edges that are painted with the
   * same border: `styleEdge` picks edges with their own style (cSt) like
   * it, none picks the edges that use the graph's style. With two such
   * edges, or where the turn between two is more than half a circle, the
   * last 1% of one and the first 1% of the other are stroked as one path.
   * Only the first such join is drawn.
   */
  _paintBorder(
    context: StylePaintContext,
    transform: Transform | null,
    scene: SceneHooks | null,
    stroke: boolean,
    styleEdge?: AnchorEdge | null,
  ): void {
    const ordered = this._orderedEdges;
    if (!(ordered && ordered.length && 1 != ordered.length)) return;
    const matches = (edge: AnchorEdge): boolean =>
      !!(
        (styleEdge && edge.getProperty("cSt", false, null, true) && edge.hasSameStyle(styleEdge)) ||
        (!styleEdge && !edge.getProperty("cSt", false, null, true) && edge.hasStyleBorder())
      );
    const edgeOf = (entry: OrderedEdge): AnchorEdge =>
      (entry.type == EdgeType.Out
        ? this._outEdges[entry.idx as number]
        : this._inEdges[entry.idx as number]) as AnchorEdge;
    let count = 0;
    for (let i = 0; i < ordered.length; ++i) {
      if (matches(edgeOf(ordered[i] as OrderedEdge))) ++count;
    }
    if (count < 2) return;
    let index = ordered.length - 1;
    let previous = ordered[index] as OrderedEdge;
    let previousEdge = edgeOf(previous);
    let previousIndex = index;
    if (!matches(previousEdge)) {
      for (index = 0; index < ordered.length - 1 && !matches(previousEdge); ++index) {
        previous = ordered[index] as OrderedEdge;
        previousEdge = edgeOf(previous);
        previousIndex = index;
      }
    }
    if (!matches(previousEdge)) return;
    for (
      let i = previousIndex == ordered.length - 1 ? 0 : previousIndex + 1;
      i < ordered.length;
      ++i
    ) {
      const current = ordered[i] as OrderedEdge;
      const currentEdge = edgeOf(current);
      if (matches(currentEdge)) {
        const from = previous.getAngle();
        let to = current.getAngle();
        if (from > to) to += GMath.PI2;
        if (to - from > Math.PI || 2 == count) {
          const join =
            previous.type == EdgeType.Out
              ? previousEdge.getFirstSegment(true, 0.01)
              : previousEdge.getLastSegment(null, 0.01);
          const start = (
            current.type == EdgeType.Out
              ? currentEdge.getFirstSegment(null, 0.01)
              : currentEdge.getLastSegment(true, 0.01)
          )
            .getAnchorPoints()
            .getFirstChild() as AnchorPoint;
          (join.getAnchorPoints().getLastChild() as AnchorPoint).setProperties(
            ["hrx", "hry"],
            [start.getProperty("hrx"), start.getProperty("hry")],
          );
          for (
            let point = start.getNext() as AnchorPoint | null;
            null != point;
            point = point.getNext() as AnchorPoint | null
          ) {
            const copy = new AnchorPoint();
            copy.deserialize(point.serialize());
            join.getAnchorPoints().appendChild(copy);
          }
          if (
            (previousEdge.getProperty("_bw") as number) > (currentEdge.getProperty("_bw") as number)
          ) {
            join.assignStyleFrom(currentEdge as never);
          } else join.assignStyleFrom(previousEdge as never);
          if (transform) join.setProperty("trf", transform);
          join._scene = scene;
          if (stroke && void 0 !== context.canvas.putVertices(join)) {
            context.canvas.strokeVertices(
              RGBColor.BLACK,
              join.getProperty("_bw") as number,
              join.getProperty("_bds") as number[] | null,
              Canvas2DPaintCanvas.LineCap.Butt,
              join.getProperty("_blj") as string,
              join.getProperty("_bml") as number,
              1,
            );
          }
          break;
        }
        previous = current;
        previousEdge = currentEdge;
      }
    }
  }

  /** Saves `props`; a moved anchor moves the ends of its edges along. */
  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      (args as StoreChangeArgs).blob["props"] = this.serialize();
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      if (Object.prototype.hasOwnProperty.call(blob, "props")) {
        this.deserialize(blob["props"] as unknown[]);
      }
    } else if (change == NodeChange.AfterPropertiesChange) {
      const changed = args as PropertiesChangeArgs;
      const xIndex = changed.properties.indexOf("x");
      const yIndex = changed.properties.indexOf("y");
      if (xIndex >= 0 || yIndex >= 0) {
        for (let i = 0; i < this._inEdges.length; ++i) {
          (
            (this._inEdges[i] as AnchorEdge)
              .getPathBase()
              .getAnchorPoints()
              .getLastChild() as AnchorPoint
          ).setProperties(["x", "y"], [this.$x, this.$y]);
        }
        for (let i = 0; i < this._outEdges.length; ++i) {
          (
            (this._outEdges[i] as AnchorEdge)
              .getPathBase()
              .getAnchorPoints()
              .getFirstChild() as AnchorPoint
          ).setProperties(["x", "y"], [this.$x, this.$y]);
        }
      }
    }
    Node.prototype._handleChange.call(this, change, args);
  }

  /**
   * Inserts by angle: the new edge goes before the first one with an
   * equal or larger angle, the rest shift back by one.
   */
  _insertOrdered(entry: OrderedEdge): void {
    if (this._orderedEdges) {
      let carried: OrderedEdge | null = null;
      for (let i = 0; i < this._orderedEdges.length; ++i) {
        const current = this._orderedEdges[i] as OrderedEdge;
        if (!carried && current.getAngle() >= entry.getAngle()) {
          carried = current;
          this._orderedEdges[i] = entry;
        } else if (carried) {
          this._orderedEdges[i] = carried;
          carried = current;
        }
      }
      this._orderedEdges.push(carried || entry);
    } else this._orderedEdges = [entry];
  }

  override toString(): string {
    return "[Object GPGAnchor]";
  }
}

const proto = PGAnchor.prototype;
proto._uid = null;
proto._data = null;
proto._orderedEdges = null;
