// Old: chunk.vendor.js module 268 (GConnector).
/**
 * The connector, node "connector": a path whose first and last anchor
 * points are linked to a source and a destination element. relayout()
 * puts the ends on the facing edge centers of the two boxes (the
 * destination end 5 units off its edge) and spreads connectors between
 * the same two elements 20 units apart. It has no fill.
 */
import { Locale } from "../core/locale/locale.ts";
import { GMath } from "../math/math.ts";
import type { Point } from "../math/point.ts";
import { Rect, type RectSide } from "../math/rect.ts";
import type { Transform } from "../math/transform.ts";
import { PropertySet } from "../style/stylable-sets.ts";
import { GeometryChangeEvent, type Element } from "./element.ts";
import { Node, registerNodeClass } from "./node.ts";
import { AnchorPoint, type AnchorPoints, type PathSceneHooks } from "./path-base.ts";
import { Path } from "./path.ts";
import { SceneNodeChange, type SceneNode } from "./scene-node.ts";

interface EdgeCenter {
  side: RectSide;
  pt: Point;
}

/** The centers of the four edges of `box`: left, right, top, bottom. */
function edgeCenters(box: Rect): EdgeCenter[] {
  return [
    Rect.Side.LEFT_CENTER,
    Rect.Side.RIGHT_CENTER,
    Rect.Side.TOP_CENTER,
    Rect.Side.BOTTOM_CENTER,
  ].map((side) => ({ side, pt: box.getSide(side) }));
}

/** `point` moved along the edge `side` by `offset`. */
function alongEdge(point: Point, side: RectSide, offset: number): Point | undefined {
  switch (side) {
    case Rect.Side.RIGHT_CENTER:
    case Rect.Side.LEFT_CENTER:
      return point.translated(0, offset);
    case Rect.Side.BOTTOM_CENTER:
    case Rect.Side.TOP_CENTER:
      return point.translated(offset, 0);
  }
  return undefined;
}

export class Connector extends Path {
  static {
    registerNodeClass(this, "connector", "GConnector");
  }

  declare _srcPath: Element | null;
  declare _dstPath: Element | null;

  /** Links the ends to `source` and `destination` and relayouts all connectors between them. */
  connect(source: Element, destination: Element): void {
    this._srcPath = source;
    this._dstPath = destination;
    const scene = this._scene as PathSceneHooks;
    const points = this._anchorPoints as AnchorPoints;
    scene.link(points.getFirstChild() as AnchorPoint, this._srcPath as unknown as SceneNode);
    scene.link(points.getLastChild() as AnchorPoint, this._dstPath as unknown as SceneNode);
    this._relayoutConnectors();
  }

  _relayoutConnectors(): void {
    const connectors = this._getSiblingConnectors();
    if (connectors) {
      connectors.forEach((connector) => {
        connector.relayout();
      });
    }
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GConnector", "name", this.getNodeName()) as string;
  }

  /** Moves the ends to the closest pair of edge centers of the two elements. */
  relayout(): null | undefined {
    const points = this._anchorPoints;
    if (points && points.getFirstChild() && points.getLastChild()) {
      if (!this._srcPath || !this._dstPath) return null;
      const sourceBox = this._srcPath.getGeometryBBox();
      const destinationBox = this._dstPath.getGeometryBBox();
      if (!sourceBox || !destinationBox) return null;
      let best: number | undefined;
      let from: EdgeCenter | undefined;
      let to: EdgeCenter | undefined;
      const sourceCenters = edgeCenters(sourceBox);
      const destinationCenters = edgeCenters(destinationBox);
      sourceCenters.forEach((source) => {
        destinationCenters.forEach((destination) => {
          const a = source.pt;
          const b = destination.pt;
          const distance = GMath.ptDist(a.getX(), a.getY(), b.getX(), b.getY());
          if (!best || distance < best) {
            best = distance;
            from = source;
            to = destination;
          }
        });
      });
      let start: Point | undefined = (from as EdgeCenter).pt;
      let end: Point | undefined = (to as EdgeCenter).pt;
      switch ((to as EdgeCenter).side) {
        case Rect.Side.RIGHT_CENTER:
          end = end.translated(5, 0);
          break;
        case Rect.Side.LEFT_CENTER:
          end = end.translated(-5, 0);
          break;
        case Rect.Side.BOTTOM_CENTER:
          end = end.translated(0, 5);
          break;
        case Rect.Side.TOP_CENTER:
          end = end.translated(0, -5);
      }
      const siblings = this._getSiblingConnectors();
      if (siblings && siblings.length > 1) {
        const index = siblings.indexOf(this);
        if (-1 !== index) {
          const offset = -(20 * siblings.length) / 2 + 20 * index + 10;
          start = alongEdge(start, (from as EdgeCenter).side, offset);
          end = alongEdge(end, (to as EdgeCenter).side, offset);
        }
      }
      (points.getFirstChild() as AnchorPoint).setProperties(
        ["x", "y"],
        [(start as Point).getX(), (start as Point).getY()],
      );
      (points.getLastChild() as AnchorPoint).setProperties(
        ["x", "y"],
        [(end as Point).getX(), (end as Point).getY()],
      );
    }
    return undefined;
  }

  /** The connectors between the same two elements (either direction), in tree order. */
  _getSiblingConnectors(): Connector[] | null {
    const scene = this._scene as PathSceneHooks;
    const connectorsBetween = (
      source: Element | null,
      destination: Element | null,
    ): Connector[] => {
      const found: Connector[] = [];
      scene.visitReferences(source as Node, (reference) => {
        if (
          reference instanceof AnchorPoint &&
          "connector" === Node.getName(reference.getPath()) &&
          destination === (reference.getPath() as unknown as Connector).getDstPath()
        ) {
          found.push(reference.getPath() as unknown as Connector);
        }
      });
      return found;
    };
    const connectors = connectorsBetween(this._srcPath, this._dstPath)
      .concat(connectorsBetween(this._dstPath, this._srcPath))
      .filter((connector, index, all) => all.indexOf(connector) === index);
    return Node.order(connectors);
  }

  /** Remembers `path` as the source (first anchor) or the destination. */
  attachPath(anchor: AnchorPoint, path: Node | null): void {
    if (anchor === (this._anchorPoints as AnchorPoints).getFirstChild()) {
      this._srcPath = path as Element | null;
    } else this._dstPath = path as Element | null;
  }

  getSrcPath(): Element | null {
    return this._srcPath;
  }

  getDstPath(): Element | null {
    return this._dstPath;
  }

  /** Maps the anchor points by `transform`, with one geometry change. */
  transformAnchors(transform: Transform): void {
    this._beginBlockEvents([GeometryChangeEvent]);
    this.beginUpdate();
    this.getAnchorPoints()._beginBlockCompositeEvents(false, true, false);
    for (
      let point = this.getAnchorPoints().getFirstChild();
      null != point;
      point = point.getNext() as AnchorPoint | null
    ) {
      point.transferProperties(point._getTransformedCopy(transform), [
        AnchorPoint.GeometryProperties,
      ]);
    }
    this._endBlockEvents([GeometryChangeEvent]);
    this.getAnchorPoints()._endBlockCompositeEvents(false, true, false);
    this.endUpdate();
  }

  override _handleChange(change: number, args?: unknown): void {
    super._handleChange(change, args);
    if (change === SceneNodeChange.SceneDetached || change === SceneNodeChange.SceneAttached) {
      this._relayoutConnectors();
    }
  }

  override getStylePropertySets(): string[] {
    return [PropertySet.Style, PropertySet.BorderPaintLayers, PropertySet.Effects];
  }
}

const connectorPrototype = Connector.prototype;
connectorPrototype._srcPath = null;
connectorPrototype._dstPath = null;
