// Old: chunk.vendor.js module 45 (GPathBase, GPathBase.AnchorPoint, GPathBase.AnchorPoints).
/**
 * A shape made of anchor points: the base of GPath and of the paths
 * graph's lines. The anchor points live in their own container
 * (`getAnchorPoints()`), which is not a child of the path; the path turns
 * them into vertices on demand (corners with shoulders, auto handles,
 * smooth and mirrored handles).
 *
 * Texts set on the path and connector anchors attached to it are found
 * through the scene's references; they are saved with the path as
 * `reftxt` (serialized texts) and `refanchors` (serialized anchor points)
 * and follow the path when it changes.
 */
import { EventTargetMixin } from "../core/event-target.ts";
import { registerClass } from "../core/object.ts";
import { containsObjectKey, packPoint, unpackPoint } from "../core/util.ts";
import { HitResult } from "../geometry/hit-result.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { VertexInfo } from "../geometry/vertex-info.ts";
import { Vertex } from "../geometry/vertex.ts";
import { GMath } from "../math/math.ts";
import { Point } from "../math/point.ts";
import type { Rect } from "../math/rect.ts";
import type { Transform, TransformDecomposition } from "../math/transform.ts";
import { ElementData } from "../paint/element-data.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { ElementChange } from "./element-change.ts";
import { Element, GeometryChangeEvent } from "./element.ts";
import { NodeChange } from "./node-change.ts";
import { Container, type ContainerNode } from "./node-container.ts";
import { Identity, Multireference, Reference } from "./node-identity.ts";
import { Properties, type PropertiesChangeArgs } from "./node-properties.ts";
import { Store } from "./node-store.ts";
import { Node, registerNodeClass } from "./node.ts";
import type { ReferenceEvent } from "./reference-event.ts";
import { SceneNodeChange, type SceneHooks, type SceneTransformSettings } from "./scene-node.ts";
import { Shape } from "./shape.ts";

/** Corner styles of anchor points (and of rectangle and polygon corners). */
const CornerType = {
  Rounded: "R",
  InverseRounded: "U",
  Bevel: "B",
  Inset: "I",
  Fancy: "F",
} as const;

/** The smooth point types; any other `tp` is a corner type. */
const AnchorPointType = {
  Asymmetric: "TA",
  Symmetric: "TS",
  Mirror: "TM",
  Connector: "TC",
} as const;

const AnchorPointGeometryProperties = {
  tp: CornerType.Rounded,
  x: 0,
  y: 0,
  hlx: null,
  hly: null,
  hrx: null,
  hry: null,
  ah: false,
  cu: true,
  cl: 0,
  cr: 0,
};

/** Bezier circle approximation and the length of auto handles (share of the segment). */
const BEST_CIRCLE_COEFF = 0.55191502;
const HANDLE_COEFF = 0.39026286;
const DEFAULT_EPS = 1e-9;

/** Marks a sketch path in the serialized anchor point list. */
const SKETCH_PATH_MARK = 3735932941;

const GeometryProperties = {};

const MetaProperties = {
  csc: true,
};

const VisualProperties = {
  evenodd: false,
};

const Type = AnchorPointType;

/** A corner type (not one of the smooth types). */
function isCorner(type: string): boolean {
  return (
    type != Type.Asymmetric &&
    type != Type.Connector &&
    type != Type.Symmetric &&
    type != Type.Mirror
  );
}

/** A text that runs along a path (engine-text-node). */
interface PathText extends Node {
  transform(transform: Transform, force?: boolean): void;
  attachPath(path: PathBase | null): void;
  getReferenceId(): string;
}

/** A connector (engine-annotations or connector cluster) whose anchors stick to paths. */
interface Connector extends Node {
  relayout(): void;
  attachPath(anchor: AnchorPoint, path: Node | null): void;
}

/** What paths need from the scene beyond SceneHooks. */
export interface PathSceneHooks extends SceneHooks {
  /** Calls `visitor` for every node that references `node`. */
  visitReferences(node: Node, visitor: (reference: Node) => void): void;
  getTransformSettings(): (SceneTransformSettings & { scaleCorners?: unknown }) | null;
}

function isText(node: Node | null): node is PathText {
  return "text" === Node.getName(node);
}

/** A connector anchor attached to a path. */
export function isConnectorAnchor(node: unknown): node is AnchorPoint {
  return node instanceof AnchorPoint && "connector" === Node.getName(node.getPath());
}

function connectorOf(anchor: AnchorPoint): Connector {
  return anchor.getPath() as unknown as Connector;
}

const AnchorPointBase = Store(
  Identity(EventTargetMixin(Reference(Multireference(Properties(Node))))),
);

/**
 * GPathBase.AnchorPoint, node "anchorPoint". Saved compactly (see
 * serialize): the corner type when not "R", `true` for auto handles,
 * the position packed as two float32, the ids, then `h`/`H` with the
 * left/right handle and `C` with the corner radii.
 */
export class AnchorPoint extends AnchorPointBase {
  static {
    registerNodeClass(this, "anchorPoint", "GPathBase.AnchorPoint");
  }

  static Type = AnchorPointType;
  static GeometryProperties: Readonly<Record<string, unknown>> = AnchorPointGeometryProperties;
  static BEST_CIRCLE_COEFF = BEST_CIRCLE_COEFF;
  static HANDLE_COEFF = HANDLE_COEFF;
  /** Unused static of the old code (the instances use their own flag). */
  static _invalidating = false;

  declare $tp: string;
  declare $x: number;
  declare $y: number;
  declare $hlx: number | null;
  declare $hly: number | null;
  declare $hrx: number | null;
  declare $hry: number | null;
  declare $ah: boolean;
  declare $cu: boolean;
  declare $cl: number;
  declare $cr: number;
  /** For smooth points: the right handle leads (the left one follows it). */
  declare _leadHr: boolean;
  /** Set while the handles are recalculated; undefined until the first time. */
  declare _invalidating: boolean | undefined;

  constructor() {
    super();
    this.$tp = "R";
    this.$x = 0;
    this.$y = 0;
    this.$hlx = null;
    this.$hly = null;
    this.$hrx = null;
    this.$hry = null;
    this.$ah = false;
    this.$cu = true;
    this.$cl = 0;
    this.$cr = 0;
  }

  /** The anchor points container this point is in. */
  get _points(): AnchorPoints | null {
    return this._parent as unknown as AnchorPoints | null;
  }

  override validateInsertion(parent: ContainerNode, reference?: Node | null): boolean {
    void reference;
    return parent instanceof AnchorPoints;
  }

  /** A copy through the compact form. */
  override clone(): this {
    const data = this.serialize();
    const copy = new AnchorPoint();
    copy.deserialize(data);
    return copy as this;
  }

  serialize(): unknown[] {
    const data: unknown[] = [];
    if (null !== this.$tp && this.$tp !== AnchorPointGeometryProperties.tp) data.push(this.$tp);
    if (this.$ah && this.$ah !== AnchorPointGeometryProperties.ah) data.push(this.$ah);
    data.push(packPoint(this.$x, this.$y));
    if (this._multiReferenceId) {
      data.push("&");
      data.push(this._multiReferenceId);
    }
    if (this._referenceId) {
      data.push("#");
      data.push(this._referenceId);
    }
    if (!this.$ah) {
      if (!(null === this.$hlx && null === this.$hly)) {
        data.push("h");
        data.push(packPoint(this.$hlx as number, this.$hly as number));
      }
      if (!(null === this.$hrx && null === this.$hry)) {
        data.push("H");
        data.push(packPoint(this.$hrx as number, this.$hry as number));
      }
    }
    if (
      (null !== this.$cl && !GMath.isEqualEps(this.$cl, AnchorPointGeometryProperties.cl)) ||
      (null !== this.$cr && !GMath.isEqualEps(this.$cr, AnchorPointGeometryProperties.cr))
    ) {
      data.push("C");
      data.push(packPoint(this.$cl, this.$cr));
    }
    return data;
  }

  /** Reads the compact form, and the older unpacked one with plain numbers. */
  deserialize(data: readonly unknown[]): void {
    let index = 0;
    let packed = false;
    const first = data[0];
    if (data.length > 0 && "string" == typeof first && (1 === first.length || 2 === first.length)) {
      this.$tp = first;
      index++;
    }
    if (data.length > index && "boolean" == typeof data[index]) {
      this.$ah = data[index] as boolean;
      index++;
    }
    if (index < data.length && "string" == typeof data[index]) {
      const point = unpackPoint(data[index] as string);
      this.$x = point[0] as number;
      this.$y = point[1] as number;
      packed = true;
      index++;
    } else if (index + 1 < data.length) {
      this.$x = data[index] as number;
      this.$y = data[index + 1] as number;
      index += 2;
    }
    if (index < data.length && "&" === data[index]) {
      this._multiReferenceId = data[index + 1] as string;
      index += 2;
    }
    if (index < data.length && "#" === data[index]) {
      this._referenceId = data[index + 1] as string;
      index += 2;
    }
    if (packed) {
      for (; index + 1 < data.length;) {
        if ("h" === data[index]) {
          const point = unpackPoint(data[index + 1] as string);
          this.$hlx = point[0] as number;
          this.$hly = point[1] as number;
        } else if ("H" === data[index]) {
          const point = unpackPoint(data[index + 1] as string);
          this.$hrx = point[0] as number;
          this.$hry = point[1] as number;
        } else if ("C" === data[index]) {
          const point = unpackPoint(data[index + 1] as string);
          this.$cl = point[0] as number;
          this.$cr = point[1] as number;
        }
        index += 2;
      }
    } else {
      for (; index + 2 < data.length;) {
        if ("h" === data[index]) {
          this.$hlx = data[index + 1] as number;
          this.$hly = data[index + 2] as number;
        } else if ("H" === data[index]) {
          this.$hrx = data[index + 1] as number;
          this.$hry = data[index + 2] as number;
        } else if ("C" === data[index]) {
          this.$cl = data[index + 1] as number;
          this.$cr = data[index + 2] as number;
        }
        index += 3;
      }
    }
  }

  /** A detached copy with the position and handles mapped by `transform`. */
  _getTransformedCopy(transform: Transform): AnchorPoint {
    const copy = new AnchorPoint();
    const left =
      null !== this.$hlx ? transform.mapPoint(new Point(this.$hlx, this.$hly as number)) : null;
    const right =
      null !== this.$hrx ? transform.mapPoint(new Point(this.$hrx, this.$hry as number)) : null;
    const position = transform.mapPoint(new Point(this.$x, this.$y));
    copy.$x = position.getX();
    copy.$y = position.getY();
    copy.$hlx = left ? left.getX() : null;
    copy.$hly = left ? left.getY() : null;
    copy.$hrx = right ? right.getX() : null;
    copy.$hry = right ? right.getY() : null;
    copy.$cl = this.$cl;
    copy.$cr = this.$cr;
    copy.$ah = this.$ah;
    copy.$tp = this.$tp;
    return copy;
  }

  /** Where the rounded corner starts on the incoming segment (both radii set, unless `single`). */
  getLeftShoulderPoint(single?: boolean): Point | null {
    if (this.getPath() && this.$cl && (single || this.$cr)) {
      const points = this._points as AnchorPoints;
      const previous = points.getPreviousPoint(this) as AnchorPoint;
      return points._getLeftShoulderPoint(this, previous);
    }
    return null;
  }

  getLeftShoulderPointTransformed(transform: Transform, single?: boolean): Point | null {
    let shoulder: Point | null = null;
    if (this.getPath() && this.$cl && (single || this.$cr)) {
      const points = this._points as AnchorPoints;
      const previous = points.getPreviousPoint(this) as AnchorPoint;
      const self = this._getTransformedCopy(transform);
      const other = previous._getTransformedCopy(transform);
      shoulder = points._getLeftShoulderPoint(self, other);
    }
    return shoulder;
  }

  /** Where the rounded corner ends on the outgoing segment. */
  getRightShoulderPoint(single?: boolean): Point | null {
    if (this.getPath() && this.$cr && (single || this.$cl)) {
      const points = this._points as AnchorPoints;
      const next = points.getNextPoint(this) as AnchorPoint;
      return points._getRightShoulderPoint(this, next);
    }
    return null;
  }

  getRightShoulderPointTransformed(transform: Transform, single?: boolean): Point | null {
    let shoulder: Point | null = null;
    if (this.getPath() && this.$cr && (single || this.$cl)) {
      const points = this._points as AnchorPoints;
      const next = points.getNextPoint(this) as AnchorPoint;
      const self = this._getTransformedCopy(transform);
      const other = next._getTransformedCopy(transform);
      shoulder = points._getRightShoulderPoint(self, other);
    }
    return shoulder;
  }

  /** The farthest a left shoulder can go (the handle, or the segment share). */
  getLeftShoulderLimitPoint(transform?: Transform | null, wholeSegment?: boolean): Point | null {
    let limit: Point | null = null;
    if (this.getPath()) {
      const points = this._points as AnchorPoints;
      let previous = points.getPreviousPoint(this);
      if (previous) {
        const self = transform ? this._getTransformedCopy(transform) : this;
        if (transform) previous = previous._getTransformedCopy(transform);
        limit = points._getLeftShoulderPoint(self, previous, true, wholeSegment);
      }
    }
    return limit;
  }

  getRightShoulderLimitPoint(transform?: Transform | null, wholeSegment?: boolean): Point | null {
    let limit: Point | null = null;
    if (this.getPath()) {
      const points = this._points as AnchorPoints;
      let next = points.getNextPoint(this);
      if (next) {
        const self = transform ? this._getTransformedCopy(transform) : this;
        if (transform) next = next._getTransformedCopy(transform);
        limit = points._getRightShoulderPoint(self, next, true, wholeSegment);
      }
    }
    return limit;
  }

  /** Swaps left and right (for reversing a path). */
  flip(): void {
    this.setProperties(
      ["hlx", "hly", "hrx", "hry", "cl", "cr"],
      [this.$hrx, this.$hry, this.$hlx, this.$hly, this.$cr, this.$cl],
    );
  }

  /**
   * Saves and restores the compact form (`stream`). Before a geometry
   * change: uniform corners (`cu`) keep both radii equal and invalid
   * coordinates become 0 (position) or null (handles). After it: smooth
   * points and the neighbours that depend on this point are recalculated
   * and the path is told about the new geometry.
   */
  override _handleChange(change: number, args?: unknown): void {
    const path = this.getPath();
    if (change == NodeChange.Store) {
      (args as StoreChangeArgs).blob["stream"] = this.serialize();
    } else if (change == NodeChange.Restore) {
      this.deserialize((args as RestoreChangeArgs).blob["stream"] as unknown[]);
    } else if (
      (change == NodeChange.BeforePropertiesChange || change == NodeChange.AfterPropertiesChange) &&
      containsObjectKey((args as PropertiesChangeArgs).properties, AnchorPointGeometryProperties)
    ) {
      const changed = args as PropertiesChangeArgs;
      if (change === NodeChange.BeforePropertiesChange) {
        const uniformIndex = changed.properties.indexOf("cu");
        if (uniformIndex >= 0 ? changed.values[uniformIndex] : this.$cu) {
          const leftIndex = changed.properties.indexOf("cl");
          const rightIndex = changed.properties.indexOf("cr");
          if (leftIndex >= 0) {
            const radius = changed.values[leftIndex];
            if (this.$cr != radius) {
              if (rightIndex >= 0) changed.values[rightIndex] = radius;
              else {
                changed.properties.push("cr");
                changed.values.push(radius);
              }
            }
          } else if (rightIndex >= 0) {
            const radius = changed.values[rightIndex];
            if (this.$cl != radius) {
              changed.properties.push("cl");
              changed.values.push(radius);
            }
          }
        }
        const coordinates = ["x", "y", "hlx", "hly", "hrx", "hry"];
        for (let i = 0; i < coordinates.length; ++i) {
          const index = changed.properties.indexOf(coordinates[i] as string);
          if (index >= 0) {
            const value = changed.values[index] as number | null | undefined;
            if (!(
              value != 1 / 0 &&
              value != -1 / 0 &&
              (null != value || (0 != i && 1 != i)) &&
              null != value &&
              value == value
            )) {
              changed.values[index] = 0 == i || 1 == i ? 0 : null;
            }
          }
        }
        if (path) path._notifyChange(ElementChange.PrepareGeometryUpdate);
      } else if (change === NodeChange.AfterPropertiesChange) {
        const plain = this._isNotSmoothWithHandles();
        if (!plain) {
          this._leadHr = !!(
            ((changed.properties.indexOf("hrx") >= 0 || changed.properties.indexOf("hry") >= 0) &&
              changed.properties.indexOf("hlx") < 0 &&
              changed.properties.indexOf("hly") < 0) ||
            (changed.properties.indexOf("tp") >= 0 &&
              changed.properties.indexOf("hlx") < 0 &&
              changed.properties.indexOf("hly") < 0 &&
              null != this.$hrx)
          );
        }
        const recorded = !path || (path instanceof Element && path.isRecordedTransaction());
        if (!(recorded && (path || plain))) this._invalidateCalculations();
        if (path) {
          const points = this._points;
          if (points && (!(path instanceof Element) || !path.isRecordedTransaction())) {
            if (changed.properties.indexOf("x") >= 0 || changed.properties.indexOf("y") >= 0) {
              points._invalidateLeft(points.getPreviousPoint(this));
              points._invalidateRight(points.getNextPoint(this));
            } else if (changed.properties.indexOf("tp") >= 0) {
              const previous = points.getPreviousPoint(this);
              if (previous && (previous.$ah || previous.$tp == Type.Connector)) {
                previous._invalidateCalculations();
              }
              const next = points.getNextPoint(this);
              if (next && (next.$ah || next.$tp == Type.Connector)) next._invalidateCalculations();
            }
          }
          path._verticesDirty = true;
          path._resetFxCacheAndState();
          path._notifyChange(ElementChange.FinishGeometryUpdate);
        }
      }
    }
    super._handleChange(change, args);
  }

  /** Not a symmetric point with both handles, nor a mirrored point with one. */
  _isNotSmoothWithHandles(): boolean {
    return (
      (this.$tp != Type.Symmetric || this.$ah || null == this.$hlx || null == this.$hrx) &&
      (this.$tp != Type.Mirror || this.$ah || (null == this.$hlx && null == this.$hrx))
    );
  }

  /** The path whose anchor points container holds this point. */
  getPath(): PathBase | null {
    return this._parent ? (this._parent._parent as unknown as PathBase | null) : null;
  }

  /** Recalculates the handles for the point's type (connector, smooth, mirror, auto). */
  _invalidateCalculations(): void {
    if (this._invalidating) return;
    this._invalidating = true;
    const points = this._points;
    if (points && this.$tp == Type.Connector) this._calculateConnectorPoint();
    else if (this.$tp != Type.Symmetric || this.$ah) {
      if (this.$tp != Type.Mirror || this.$ah) {
        if (points && this.$ah) this._calculateAutoHandles();
      } else this._calculateMirrorPoint();
    } else this._calculateSmoothPoint();
    this._invalidating = false;
  }

  /**
   * Connector points keep their handles on the line through the
   * neighbours: auto handles from the neighbour distances, else the
   * existing handle lengths.
   */
  _calculateConnectorPoint(): void {
    const points = this._points;
    if (!points) return;
    let length: number;
    let x: number;
    let y: number;
    const previous = points.getPreviousPoint(this);
    const next = points.getNextPoint(this);
    let previousDistance = 0;
    let nextDistance = 0;
    if (next) nextDistance = Math.sqrt(GMath.ptSqrDist(this.$x, this.$y, next.$x, next.$y));
    if (previous) {
      previousDistance = Math.sqrt(GMath.ptSqrDist(this.$x, this.$y, previous.$x, previous.$y));
    }
    if (this.$ah) {
      if (
        !next ||
        !previous ||
        (next.$tp != Type.Symmetric && next.$tp != Type.Mirror) ||
        GMath.isEqualEps(nextDistance, 0) ||
        GMath.isEqualEps(previousDistance, 0)
      ) {
        this.setProperties(["hrx", "hry"], [null, null]);
      } else {
        length = nextDistance * HANDLE_COEFF;
        x = this.$x + ((this.$x - previous.$x) / previousDistance) * length;
        y = this.$y + ((this.$y - previous.$y) / previousDistance) * length;
        if (!(
          GMath.isEqualEps(this.$hrx as number, x, DEFAULT_EPS) &&
          GMath.isEqualEps(this.$hry as number, y, DEFAULT_EPS)
        )) {
          this.setProperties(["hrx", "hry"], [x, y]);
        }
      }
      if (
        !previous ||
        !next ||
        (previous.$tp != Type.Symmetric && previous.$tp != Type.Mirror) ||
        GMath.isEqualEps(nextDistance, 0) ||
        GMath.isEqualEps(previousDistance, 0)
      ) {
        this.setProperties(["hlx", "hly"], [null, null]);
      } else {
        length = previousDistance * HANDLE_COEFF;
        x = this.$x + ((this.$x - next.$x) / nextDistance) * length;
        y = this.$y + ((this.$y - next.$y) / nextDistance) * length;
        if (!(
          GMath.isEqualEps(this.$hlx as number, x, DEFAULT_EPS) &&
          GMath.isEqualEps(this.$hly as number, y, DEFAULT_EPS)
        )) {
          this.setProperties(["hlx", "hly"], [x, y]);
        }
      }
    } else {
      if (null != this.$hlx && next && !GMath.isEqualEps(nextDistance, 0)) {
        length = Math.sqrt(GMath.ptSqrDist(this.$x, this.$y, this.$hlx, this.$hly as number));
        x = this.$x + ((this.$x - next.$x) / nextDistance) * length;
        y = this.$y + ((this.$y - next.$y) / nextDistance) * length;
        if (!(
          GMath.isEqualEps(this.$hlx, x, DEFAULT_EPS) &&
          GMath.isEqualEps(this.$hly as number, y, DEFAULT_EPS)
        )) {
          this.setProperties(["hlx", "hly"], [x, y]);
        }
      }
      if (null != this.$hrx && previous && !GMath.isEqualEps(previousDistance, 0)) {
        length = Math.sqrt(GMath.ptSqrDist(this.$x, this.$y, this.$hrx, this.$hry as number));
        x = this.$x + ((this.$x - previous.$x) / previousDistance) * length;
        y = this.$y + ((this.$y - previous.$y) / previousDistance) * length;
        if (!(
          GMath.isEqualEps(this.$hrx, x, DEFAULT_EPS) &&
          GMath.isEqualEps(this.$hry as number, y, DEFAULT_EPS)
        )) {
          this.setProperties(["hrx", "hry"], [x, y]);
        }
      }
    }
  }

  /** Symmetric points: the following handle keeps its length and turns opposite the leading one. */
  _calculateSmoothPoint(): void {
    let followLength: number;
    let leadLength: number;
    let x: number;
    let y: number;
    if (null == this.$hlx || null == this.$hrx) return;
    if (this._leadHr) {
      leadLength = Math.sqrt(GMath.ptSqrDist(this.$x, this.$y, this.$hrx, this.$hry as number));
      if (!GMath.isEqualEps(leadLength, 0, DEFAULT_EPS)) {
        followLength = Math.sqrt(GMath.ptSqrDist(this.$x, this.$y, this.$hlx, this.$hly as number));
        x = this.$x + ((this.$x - this.$hrx) / leadLength) * followLength;
        y = this.$y + ((this.$y - (this.$hry as number)) / leadLength) * followLength;
        if (!(
          GMath.isEqualEps(this.$hlx, x, DEFAULT_EPS) &&
          GMath.isEqualEps(this.$hly as number, y, DEFAULT_EPS)
        )) {
          this.setProperties(["hlx", "hly"], [x, y]);
        }
      }
    } else {
      leadLength = Math.sqrt(GMath.ptSqrDist(this.$x, this.$y, this.$hlx, this.$hly as number));
      if (!GMath.isEqualEps(leadLength, 0, DEFAULT_EPS)) {
        followLength = Math.sqrt(GMath.ptSqrDist(this.$x, this.$y, this.$hrx, this.$hry as number));
        x = this.$x + ((this.$x - this.$hlx) / leadLength) * followLength;
        y = this.$y + ((this.$y - (this.$hly as number)) / leadLength) * followLength;
        if (!(
          GMath.isEqualEps(this.$hrx, x, DEFAULT_EPS) &&
          GMath.isEqualEps(this.$hry as number, y, DEFAULT_EPS)
        )) {
          this.setProperties(["hrx", "hry"], [x, y]);
        }
      }
    }
  }

  /** Mirrored points: the following handle mirrors the leading one. */
  _calculateMirrorPoint(): void {
    if (this._leadHr && null != this.$hrx) {
      const x = this.$x + (this.$x - this.$hrx);
      const y = this.$y + (this.$y - (this.$hry as number));
      if (!(
        GMath.isEqualEps(this.$hlx as number, x, DEFAULT_EPS) &&
        GMath.isEqualEps(this.$hly as number, y, DEFAULT_EPS)
      )) {
        this.setProperties(["hlx", "hly"], [x, y]);
      }
    } else if (!this._leadHr && null != this.$hlx) {
      const x = this.$x + (this.$x - this.$hlx);
      const y = this.$y + (this.$y - (this.$hly as number));
      if (!(
        GMath.isEqualEps(this.$hrx as number, x, DEFAULT_EPS) &&
        GMath.isEqualEps(this.$hry as number, y, DEFAULT_EPS)
      )) {
        this.setProperties(["hrx", "hry"], [x, y]);
      }
    }
  }

  /**
   * Auto handles: smooth points get handles tangent to the circle through
   * the neighbours (sized by the arc), other points handles towards the
   * smooth neighbours only.
   */
  _calculateAutoHandles(): void {
    const points = this._points;
    if (!points) return;
    let radius: number;
    let handle: number;
    let center: Point | null;
    let dx: number;
    let dy: number;
    let midX: number;
    let midY: number;
    const previous = points.getPreviousPoint(this);
    const next = points.getNextPoint(this);
    const coeff = HANDLE_COEFF;
    let hlx: number | null = null;
    let hly: number | null = null;
    let hrx: number | null = null;
    let hry: number | null = null;
    let centerDistance: number;
    let chord: number;
    let arc: number;
    if (this.$tp == Type.Symmetric || this.$tp == Type.Mirror) {
      if (!next && !previous) return;
      if (
        (next && !previous) ||
        (next && this.$x == (previous as AnchorPoint).$x && this.$y == (previous as AnchorPoint).$y)
      ) {
        hrx = this.$x + (next.$x - this.$x) * coeff;
        hry = this.$y + (next.$y - this.$y) * coeff;
        hlx = this.$x + this.$x - hrx;
        hly = this.$y + this.$y - hry;
      } else if (
        (previous && !next) ||
        (previous && this.$x == (next as AnchorPoint).$x && this.$y == (next as AnchorPoint).$y)
      ) {
        hlx = this.$x + (previous.$x - this.$x) * coeff;
        hly = this.$y + (previous.$y - this.$y) * coeff;
        hrx = this.$x + this.$x - hlx;
        hry = this.$y + this.$y - hly;
      } else if (previous && next) {
        if (
          null ==
          (center = GMath.getCircumcircleCenter(
            previous.$x,
            previous.$y,
            this.$x,
            this.$y,
            next.$x,
            next.$y,
          ))
        ) {
          dx = (this.$y - previous.$y) * coeff;
          dy = (previous.$x - this.$x) * coeff;
          hlx = this.$x - dx;
          hly = this.$y - dy;
          hrx = this.$x + dx;
          hry = this.$y + dy;
        } else {
          radius = Math.sqrt(GMath.ptSqrDist(this.$x, this.$y, center.getX(), center.getY()));
          dx = (this.$y - center.getY()) / radius;
          dy = (center.getX() - this.$x) / radius;
          midX = (previous.$x + next.$x) / 2;
          midY = (previous.$y + next.$y) / 2;
          if (
            GMath.segmentSide(this.$x, this.$y, midX, midY, previous.$x, previous.$y) !=
            GMath.segmentSide(this.$x, this.$y, midX, midY, this.$x - dx, this.$y - dy)
          ) {
            dx = -dx;
            dy = -dy;
          }
          centerDistance = GMath.ptDist(this.$x, this.$y, center.getX(), center.getY());
          chord = GMath.ptDist(this.$x, this.$y, previous.$x, previous.$y) / centerDistance;
          arc = 2 * Math.asin(chord / 2);
          handle =
            (((Math.sqrt(GMath.ptSqrDist(this.$x, this.$y, previous.$x, previous.$y)) / chord) *
              arc) /
              GMath.PIHALF) *
            BEST_CIRCLE_COEFF;
          hlx = this.$x - dx * handle;
          hly = this.$y - dy * handle;
          chord = GMath.ptDist(this.$x, this.$y, next.$x, next.$y) / centerDistance;
          arc = 2 * Math.asin(chord / 2);
          handle =
            (((Math.sqrt(GMath.ptSqrDist(this.$x, this.$y, next.$x, next.$y)) / chord) * arc) /
              GMath.PIHALF) *
            BEST_CIRCLE_COEFF;
          hrx = this.$x + dx * handle;
          hry = this.$y + dy * handle;
        }
      }
      if (!(
        GMath.isEqualEps(this.$hlx as number, hlx as number, DEFAULT_EPS) &&
        GMath.isEqualEps(this.$hly as number, hly as number, DEFAULT_EPS) &&
        GMath.isEqualEps(this.$hrx as number, hrx as number, DEFAULT_EPS) &&
        GMath.isEqualEps(this.$hry as number, hry as number, DEFAULT_EPS)
      )) {
        this.setProperties(["hlx", "hly", "hrx", "hry"], [hlx, hly, hrx, hry]);
      }
    } else {
      if (previous && (previous.$x != this.$x || previous.$y != this.$y)) {
        if (previous.$tp == Type.Symmetric || previous.$tp == Type.Mirror) {
          const beyond = points.getPreviousPoint(previous);
          if (!beyond || (previous.$x == beyond.$x && previous.$y == beyond.$y)) {
            hlx = this.$x + (previous.$x - this.$x) * coeff;
            hly = this.$y + (previous.$y - this.$y) * coeff;
          } else if (
            null ==
            (center = GMath.getCircumcircleCenter(
              this.$x,
              this.$y,
              previous.$x,
              previous.$y,
              beyond.$x,
              beyond.$y,
            ))
          ) {
            dx = (this.$y - previous.$y) * coeff;
            dy = (previous.$x - this.$x) * coeff;
            hlx = this.$x - dx;
            hly = this.$y - dy;
          } else {
            radius = Math.sqrt(GMath.ptSqrDist(this.$x, this.$y, center.getX(), center.getY()));
            dx = (this.$y - center.getY()) / radius;
            dy = (center.getX() - this.$x) / radius;
            midX = (previous.$x + beyond.$x) / 2;
            midY = (previous.$y + beyond.$y) / 2;
            if (
              GMath.segmentSide(this.$x, this.$y, midX, midY, previous.$x, previous.$y) !=
              GMath.segmentSide(this.$x, this.$y, midX, midY, this.$x - dx, this.$y - dy)
            ) {
              dx = -dx;
              dy = -dy;
            }
            centerDistance = GMath.ptDist(this.$x, this.$y, center.getX(), center.getY());
            chord = GMath.ptDist(this.$x, this.$y, previous.$x, previous.$y) / centerDistance;
            arc = 2 * Math.asin(chord / 2);
            handle =
              (((Math.sqrt(GMath.ptSqrDist(this.$x, this.$y, previous.$x, previous.$y)) / chord) *
                arc) /
                GMath.PIHALF) *
              BEST_CIRCLE_COEFF;
            hlx = this.$x - dx * handle;
            hly = this.$y - dy * handle;
          }
          if (!(
            GMath.isEqualEps(this.$hlx as number, hlx as number, DEFAULT_EPS) &&
            GMath.isEqualEps(this.$hly as number, hly as number, DEFAULT_EPS)
          )) {
            this.setProperties(["hlx", "hly"], [hlx, hly]);
          }
        } else this.setProperties(["hlx", "hly"], [null, null]);
      }
      if (next && (next.$x != this.$x || next.$y != this.$y)) {
        if (next.$tp == Type.Symmetric || next.$tp == Type.Mirror) {
          const beyond = points.getNextPoint(next);
          if (!beyond || (next.$x == beyond.$x && next.$y == beyond.$y)) {
            hrx = this.$x + (next.$x - this.$x) * coeff;
            hry = this.$y + (next.$y - this.$y) * coeff;
          } else if (
            null ==
            (center = GMath.getCircumcircleCenter(
              this.$x,
              this.$y,
              next.$x,
              next.$y,
              beyond.$x,
              beyond.$y,
            ))
          ) {
            dx = (this.$y - next.$y) * coeff;
            dy = (next.$x - this.$x) * coeff;
            hrx = this.$x - dx;
            hry = this.$y - dy;
          } else {
            radius = Math.sqrt(GMath.ptSqrDist(this.$x, this.$y, center.getX(), center.getY()));
            dx = (this.$y - center.getY()) / radius;
            dy = (center.getX() - this.$x) / radius;
            midX = (next.$x + beyond.$x) / 2;
            midY = (next.$y + beyond.$y) / 2;
            if (
              GMath.segmentSide(this.$x, this.$y, midX, midY, next.$x, next.$y) !=
              GMath.segmentSide(this.$x, this.$y, midX, midY, this.$x + dx, this.$y + dy)
            ) {
              dx = -dx;
              dy = -dy;
            }
            centerDistance = GMath.ptDist(this.$x, this.$y, center.getX(), center.getY());
            chord = GMath.ptDist(this.$x, this.$y, next.$x, next.$y) / centerDistance;
            arc = 2 * Math.asin(chord / 2);
            handle =
              (((Math.sqrt(GMath.ptSqrDist(this.$x, this.$y, next.$x, next.$y)) / chord) * arc) /
                GMath.PIHALF) *
              BEST_CIRCLE_COEFF;
            hrx = this.$x + dx * handle;
            hry = this.$y + dy * handle;
          }
          if (!(
            GMath.isEqualEps(this.$hrx as number, hrx as number, DEFAULT_EPS) &&
            GMath.isEqualEps(this.$hry as number, hry as number, DEFAULT_EPS)
          )) {
            this.setProperties(["hrx", "hry"], [hrx, hry]);
          }
        } else this.setProperties(["hrx", "hry"], [null, null]);
      }
    }
  }

  override toString(): string {
    return "[Object GPathBase.AnchorPoint]";
  }
}

AnchorPoint.prototype._leadHr = false;

/**
 * GPathBase.AnchorPoints: the anchor points of one path. Not a child of
 * the path (the path is only its parent); it can't be removed. It
 * generates the path's vertices and keeps dependent handles up to date
 * when points come and go.
 */
export class AnchorPoints extends Multireference(Container(Node)) {
  static {
    registerClass(this, "GPathBase.AnchorPoints");
  }

  declare _dirtyPrev: AnchorPoint | null;
  declare _dirtyNext: AnchorPoint | null;
  /** Sketch paths extend shoulders beyond the segment ends. */
  declare _sketchPath: boolean;

  /** The path these points belong to. */
  get _path(): PathBase | null {
    return this._parent as unknown as PathBase | null;
  }

  override getFirstChild(): AnchorPoint | null {
    return super.getFirstChild() as AnchorPoint | null;
  }

  override getLastChild(): AnchorPoint | null {
    return super.getLastChild() as AnchorPoint | null;
  }

  override validateInsertion(parent: ContainerNode, reference?: Node | null): boolean {
    void reference;
    return parent instanceof PathBase;
  }

  override validateRemoval(): boolean {
    return false;
  }

  /** The serialized points (mapped by `transform` unless it is the identity). */
  serialize(transform?: Transform | null): unknown[] {
    const mapping = transform && !transform.isIdentity() ? transform : null;
    const data: unknown[] = this._multiReferenceId ? ["&", this._multiReferenceId] : [];
    if (this._sketchPath) data.push(SKETCH_PATH_MARK);
    if (mapping) {
      for (
        let point = this.getFirstChild();
        null !== point;
        point = point.getNext() as AnchorPoint | null
      ) {
        data.push(point._getTransformedCopy(mapping).serialize());
      }
    } else {
      for (
        let point = this.getFirstChild();
        null !== point;
        point = point.getNext() as AnchorPoint | null
      ) {
        data.push(point.serialize());
      }
    }
    return data;
  }

  /** Appends the serialized points (inside an update of the path, without events). */
  deserialize(data: readonly unknown[]): void {
    let index: number;
    if ("&" === data[0]) {
      index = 2;
      this._multiReferenceId = data[1] as string;
    } else index = 0;
    if (SKETCH_PATH_MARK === data[index]) {
      this._sketchPath = true;
      index++;
    }
    const parent = this.getParent();
    if (parent) {
      parent.beginUpdate();
      this._beginBlockCompositeEvents(true, true, true);
    }
    for (; index < data.length;) {
      const point = new AnchorPoint();
      point.deserialize(data[index++] as unknown[]);
      this.appendChild(point);
    }
    if (this.getParent()) {
      this._endBlockCompositeEvents(true, true, true);
      (this.getParent() as ContainerNode).endUpdate();
    }
  }

  clone(): AnchorPoints {
    const copy = new AnchorPoints();
    copy.deserialize(this.serialize());
    return copy;
  }

  /** The point before `point` changed: recalculate it (and its neighbour, if smooth). */
  _invalidateLeft(point: AnchorPoint | null | undefined): void {
    if (!point) return;
    if (point.$ah || point.$tp == Type.Connector) point._invalidateCalculations();
    if (point.$tp == Type.Symmetric || point.$tp == Type.Mirror) {
      const previous = this.getPreviousPoint(point);
      if (previous && previous.$ah) previous._invalidateCalculations();
    }
  }

  _invalidateRight(point: AnchorPoint | null | undefined): void {
    if (!point) return;
    if (point.$ah || point.$tp == Type.Connector) point._invalidateCalculations();
    if (point.$tp == Type.Symmetric || point.$tp == Type.Mirror) {
      const next = this.getNextPoint(point);
      if (next && next.$ah) next._invalidateCalculations();
    }
  }

  /**
   * Writes the vertices into `target`, mapped by `transform`; with
   * `styled`, corner points with radii get their shoulders and corner
   * shapes.
   */
  _generateVertices(
    target: VertexContainer,
    transform: Transform | null | undefined,
    styled: boolean,
  ): void {
    let point = this.getFirstChild();
    if (!point) return;
    let x: number;
    let y: number;
    let current: AnchorPoint | undefined;
    const path = this._path;
    if (styled && isCorner(point.$tp) && path && path.$closed && point != this.getLastChild()) {
      const start = this._getPathStartPt(transform);
      x = start.getX();
      y = start.getY();
    } else {
      x = (current = transform ? point._getTransformedCopy(transform) : point).$x;
      y = current.$y;
    }
    target.addVertex(Vertex.Command.Move, x, y);
    if (point == this.getLastChild()) return;
    let previousCopy: AnchorPoint | undefined;
    let nextCopy: AnchorPoint;
    let previous = point;
    const second = (point = point.getNext() as AnchorPoint);
    let started = false;
    let next = this.getNextPoint(point);
    if (transform) {
      current = point._getTransformedCopy(transform);
      previousCopy = previous._getTransformedCopy(transform);
    }
    for (; next && (point != second || !started);) {
      started = true;
      if (transform) {
        nextCopy = next._getTransformedCopy(transform);
        this._addMiddleVertices(
          target,
          current as AnchorPoint,
          previousCopy as AnchorPoint,
          nextCopy,
          styled,
        );
        previousCopy = current;
        current = nextCopy;
      } else this._addMiddleVertices(target, point, previous, next, styled);
      previous = point;
      point = next;
      next = this.getNextPoint(next);
    }
    if (next) target.addVertex(Vertex.Command.Close, 0, 0);
    else this._addPathEndVertices(target, transform);
  }

  /** Where a closed path starts: at the right shoulder of a rounded first corner. */
  _getPathStartPt(transform: Transform | null | undefined): Point {
    let first = this.getFirstChild() as AnchorPoint;
    let previous = this.getPreviousPoint(first);
    let next = this.getNextPoint(first);
    if (transform) {
      first = first._getTransformedCopy(transform);
      next = (next as AnchorPoint)._getTransformedCopy(transform);
      previous = (previous as AnchorPoint)._getTransformedCopy(transform);
    }
    return first.$cl &&
      first.$cr &&
      isCorner(first.$tp) &&
      previous &&
      (previous.$tp != Type.Connector || previous.$x != first.$x || previous.$y != first.$y)
      ? (this._getRightShoulderPoint(first, next as AnchorPoint) as Point)
      : new Point(first.$x, first.$y);
  }

  /**
   * The point `ownRadius` along the segment to (x2, y2), shrunk in
   * proportion when both corner radii together don't fit; null without
   * radii.
   */
  _getShoulderPoint(
    x1: number,
    y1: number,
    ownRadius: number | null | undefined,
    x2: number,
    y2: number,
    otherRadius: number | null | undefined,
  ): Point | null {
    let length: number;
    let own: number;
    const distance = GMath.ptDist(x1, y1, x2, y2);
    const total =
      (own = null == ownRadius || ownRadius <= 0 ? 0 : ownRadius) +
      (null == otherRadius || otherRadius <= 0 ? 0 : otherRadius);
    return total <= 0
      ? null
      : ((length = distance >= total ? own : (distance * own) / total),
        GMath.getPointAtLength(x1, y1, x2, y2, length, this._sketchPath));
  }

  /**
   * The right shoulder of corner `point` towards `next`: along the handle
   * when there is one. `limit` asks for the farthest possible shoulder
   * (the handle end, or the segment share; all of it with `wholeSegment`).
   */
  _getRightShoulderPoint(
    point: AnchorPoint,
    next: AnchorPoint,
    limit?: boolean,
    wholeSegment?: boolean,
  ): Point | null {
    let shoulder: Point | null;
    let handleX: number | null = null;
    let handleY: number | null = null;
    if (null != point.$hrx) {
      handleX = point.$hrx;
      handleY = point.$hry;
    } else if (null != next.$hlx) {
      handleX = next.$hlx;
      handleY = next.$hly;
    }
    if (null != handleX) {
      shoulder = limit
        ? new Point(handleX, handleY as number)
        : GMath.getPointAtLength(
            point.$x,
            point.$y,
            handleX,
            handleY as number,
            point.$cr,
            this._sketchPath,
          );
    } else if (limit) {
      // (The old code first set the next point here; it was overwritten.)
      const distance = GMath.ptDist(point.$x, point.$y, next.$x, next.$y);
      shoulder = this._getShoulderPoint(
        point.$x,
        point.$y,
        distance,
        next.$x,
        next.$y,
        wholeSegment ? distance : next.$cl,
      );
    } else {
      shoulder = this._getShoulderPoint(point.$x, point.$y, point.$cr, next.$x, next.$y, next.$cl);
    }
    return shoulder;
  }

  _getLeftShoulderPoint(
    point: AnchorPoint,
    previous: AnchorPoint,
    limit?: boolean,
    wholeSegment?: boolean,
  ): Point | null {
    let shoulder: Point | null;
    let handleX: number | null = null;
    let handleY: number | null = null;
    if (null != point.$hlx) {
      handleX = point.$hlx;
      handleY = point.$hly;
    } else if (null != previous.$hrx) {
      handleX = previous.$hrx;
      handleY = previous.$hry;
    }
    if (null != handleX) {
      shoulder = limit
        ? new Point(handleX, handleY as number)
        : GMath.getPointAtLength(
            point.$x,
            point.$y,
            handleX,
            handleY as number,
            point.$cl,
            this._sketchPath,
          );
    } else if (limit) {
      const distance = GMath.ptDist(point.$x, point.$y, previous.$x, previous.$y);
      shoulder = this._getShoulderPoint(
        point.$x,
        point.$y,
        distance,
        previous.$x,
        previous.$y,
        wholeSegment ? distance : previous.$cr,
      );
    } else {
      shoulder = this._getShoulderPoint(
        point.$x,
        point.$y,
        point.$cl,
        previous.$x,
        previous.$y,
        previous.$cr,
      );
    }
    return shoulder;
  }

  /** The segment from `previous` to `point`, and the corner at `point` when styled. */
  _addMiddleVertices(
    target: VertexContainer,
    point: AnchorPoint,
    previous: AnchorPoint,
    next: AnchorPoint,
    styled: boolean,
  ): void {
    let leftShoulder: Point;
    let rightShoulder: Point;
    let control2X: number | null = null;
    let control2Y: number | null = null;
    let controlX: number | null = null;
    let controlY: number | null = null;
    const C = Vertex.Command;
    if (
      null != point.$hlx &&
      null != point.$hly &&
      null != previous.$hrx &&
      null != previous.$hry
    ) {
      controlX = previous.$hrx;
      controlY = previous.$hry;
      control2X = point.$hlx;
      control2Y = point.$hly;
    } else if (null != point.$hlx && null != point.$hly) {
      controlX = point.$hlx;
      controlY = point.$hly;
    } else if (null != previous.$hrx && null != previous.$hry) {
      controlX = previous.$hrx;
      controlY = previous.$hry;
    }
    if (styled && isCorner(point.$tp) && point.$cl && point.$cr) {
      if (null == controlX) {
        leftShoulder = this._getShoulderPoint(
          point.$x,
          point.$y,
          point.$cl,
          previous.$x,
          previous.$y,
          previous.$cr,
        ) as Point;
        target.addVertex(C.Line, leftShoulder.getX(), leftShoulder.getY());
      } else if (null == control2X) {
        leftShoulder = GMath.getPointAtLength(
          point.$x,
          point.$y,
          controlX,
          controlY as number,
          point.$cl,
          this._sketchPath,
        );
        target.addVertex(C.Curve, leftShoulder.getX(), leftShoulder.getY());
        target.addVertex(C.Curve, controlX, controlY as number);
      } else {
        leftShoulder = GMath.getPointAtLength(
          point.$x,
          point.$y,
          control2X,
          control2Y as number,
          point.$cl,
          this._sketchPath,
        );
        target.addVertex(C.Curve2, leftShoulder.getX(), leftShoulder.getY());
        target.addVertex(C.Curve2, controlX, controlY as number);
        target.addVertex(C.Curve2, control2X, control2Y as number);
      }
      rightShoulder = this._getRightShoulderPoint(point, next) as Point;
      this._addCornerToVertices(
        target,
        leftShoulder.getX(),
        leftShoulder.getY(),
        rightShoulder.getX(),
        rightShoulder.getY(),
        point.$x,
        point.$y,
        point.$tp,
      );
    } else if (null == controlX) target.addVertex(C.Line, point.$x, point.$y);
    else if (null == control2X) {
      target.addVertex(C.Curve, point.$x, point.$y);
      target.addVertex(C.Curve, controlX, controlY as number);
    } else {
      target.addVertex(C.Curve2, point.$x, point.$y);
      target.addVertex(C.Curve2, controlX, controlY as number);
      target.addVertex(C.Curve2, control2X, control2Y as number);
    }
  }

  /**
   * The corner from the left shoulder (lx, ly) to the right shoulder
   * (rx, ry) around the corner point (cx, cy), in the corner style.
   */
  _addCornerToVertices(
    target: VertexContainer,
    lx: number,
    ly: number,
    rx: number,
    ry: number,
    cx: number,
    cy: number,
    type: string,
  ): void {
    const C = Vertex.Command;
    let x: number;
    let y: number;
    let rightStepX: number;
    let rightStepY: number;
    let leftStepX: number;
    let leftStepY: number;
    if (lx != rx || ly != ry) {
      if ((lx == cx && ly == cy) || (rx == cx && ry == cy)) target.addVertex(C.Line, rx, ry);
      else if (type == CornerType.Rounded || type == CornerType.InverseRounded) {
        if ((lx == rx && lx == cx) || (ly == ry && ly == cy)) {
          target.addVertex(C.Curve, rx, ry);
          target.addVertex(C.Curve, cx, cy);
        } else {
          let tipX: number;
          let tipY: number;
          if (type == CornerType.Rounded) {
            tipX = cx;
            tipY = cy;
          } else {
            tipX = lx + rx - cx;
            tipY = ly + ry - cy;
          }
          target.addVertex(C.Curve2, rx, ry);
          target.addVertex(
            C.Curve2,
            lx + (tipX - lx) * BEST_CIRCLE_COEFF,
            ly + (tipY - ly) * BEST_CIRCLE_COEFF,
          );
          target.addVertex(
            C.Curve2,
            rx + (tipX - rx) * BEST_CIRCLE_COEFF,
            ry + (tipY - ry) * BEST_CIRCLE_COEFF,
          );
        }
      } else if (type == CornerType.Fancy) {
        leftStepX = (cx - lx) / 3;
        leftStepY = (cy - ly) / 3;
        x = lx + 2 * (rightStepX = (rx - cx) / 3);
        y = ly + 2 * (rightStepY = (ry - cy) / 3);
        target.addVertex(C.Line, x, y);
        x += 2 * leftStepX;
        y += 2 * leftStepY;
        target.addVertex(C.Line, x, y);
        x -= rightStepX;
        y -= rightStepY;
        target.addVertex(C.Line, x, y);
        x -= leftStepX;
        y -= leftStepY;
        target.addVertex(C.Line, x, y);
        x += 2 * rightStepX;
        y += 2 * rightStepY;
        target.addVertex(C.Line, x, y);
        x += 2 * leftStepX;
        y += 2 * leftStepY;
        target.addVertex(C.Line, x, y);
      } else if (type == CornerType.Bevel) target.addVertex(C.Line, rx, ry);
      else if (type == CornerType.Inset) {
        const insetX = lx + rx - cx;
        const insetY = ly + ry - cy;
        target.addVertex(C.Line, insetX, insetY);
        target.addVertex(C.Line, rx, ry);
      } else {
        target.addVertex(C.Line, cx, cy);
        target.addVertex(C.Line, rx, ry);
      }
    } else if (!(cx == lx && cy == ly)) {
      target.addVertex(C.Line, cx, cy);
      target.addVertex(C.Line, rx, ry);
    }
  }

  /** The last segment of an open path. */
  _addPathEndVertices(target: VertexContainer, transform: Transform | null | undefined): void {
    const C = Vertex.Command;
    let last = this.getLastChild() as AnchorPoint;
    let previous = last.getPrevious() as AnchorPoint;
    if (transform) {
      last = last._getTransformedCopy(transform);
      previous = previous._getTransformedCopy(transform);
    }
    if (null != last.$hlx && null != last.$hly && null != previous.$hrx && null != previous.$hry) {
      target.addVertex(C.Curve2, last.$x, last.$y);
      target.addVertex(C.Curve2, previous.$hrx, previous.$hry);
      target.addVertex(C.Curve2, last.$hlx, last.$hly);
    } else if (
      (null != last.$hlx && null != last.$hly) ||
      (null != previous.$hrx && null != previous.$hry)
    ) {
      let controlX: number;
      let controlY: number;
      if (null != last.$hlx && null != last.$hly) {
        controlX = last.$hlx;
        controlY = last.$hly;
      } else {
        controlX = previous.$hrx as number;
        controlY = previous.$hry as number;
      }
      target.addVertex(C.Curve, last.$x, last.$y);
      target.addVertex(C.Curve, controlX, controlY);
    } else target.addVertex(C.Line, last.$x, last.$y);
  }

  /**
   * Inserted connector points get handles towards neighbours with handles,
   * and the neighbours of inserted and removed points are recalculated;
   * all of it inside an update of the path.
   */
  override _handleChange(change: number, args?: unknown): void {
    const path = this._path;
    if (path) {
      const point = args as AnchorPoint;
      if (change == NodeChange.BeforeChildInsert) {
        if (this.getParent()) (this.getParent() as ContainerNode).beginUpdate();
      } else if (change == NodeChange.AfterChildInsert) {
        let x: number;
        let y: number;
        const previous = this.getPreviousPoint(point);
        if (previous && null != previous.$hrx && point.$tp == Type.Connector) {
          x = point.$x + (previous.$x - point.$x) * HANDLE_COEFF;
          y = point.$y + (previous.$y - point.$y) * HANDLE_COEFF;
          if (!(
            GMath.isEqualEps(point.$x - x, 0, DEFAULT_EPS) &&
            GMath.isEqualEps(point.$y - y, 0, DEFAULT_EPS)
          )) {
            point.setProperties(["hlx", "hly"], [x, y]);
          }
        }
        const next = this.getNextPoint(point);
        if (next && null != next.$hlx && point.$tp == Type.Connector) {
          x = point.$x + (next.$x - point.$x) * HANDLE_COEFF;
          y = point.$y + (next.$y - point.$y) * HANDLE_COEFF;
          if (!(
            GMath.isEqualEps(point.$x - x, 0, DEFAULT_EPS) &&
            GMath.isEqualEps(point.$y - y, 0, DEFAULT_EPS)
          )) {
            point.setProperties(["hrx", "hry"], [x, y]);
          }
        }
        if (point.$ah || point.$tp == Type.Connector) point._invalidateCalculations();
        this._invalidateLeft(previous);
        this._invalidateRight(next);
        if (this.getParent()) (this.getParent() as ContainerNode).endUpdate();
      } else if (change == NodeChange.BeforeChildRemove) {
        if (this.getParent()) (this.getParent() as ContainerNode).beginUpdate();
        this._dirtyPrev = this.getPreviousPoint(point);
        this._dirtyNext = this.getNextPoint(point);
      } else if (change == NodeChange.AfterChildRemove) {
        if (this._dirtyPrev) this._invalidateLeft(this._dirtyPrev);
        if (this._dirtyNext) this._invalidateRight(this._dirtyNext);
        if (this.getParent()) (this.getParent() as ContainerNode).endUpdate();
      }
    }
    if (path && (change == NodeChange.AfterChildInsert || change == NodeChange.AfterChildRemove)) {
      path._notifyChange(ElementChange.PrepareGeometryUpdate);
      path._verticesDirty = true;
      path._notifyChange(ElementChange.FinishGeometryUpdate);
    }
    super._handleChange(change, args);
  }

  /** The next point; after the last one the first, when the path is closed. */
  getNextPoint(point: AnchorPoint | null | undefined): AnchorPoint | null {
    let next = point ? (point.getNext() as AnchorPoint | null) : null;
    if (!next && this._path && this._path.$closed && point == this.getLastChild()) {
      next = this.getFirstChild();
    }
    return next;
  }

  /** The previous point; before the first one the last, when the path is closed. */
  getPreviousPoint(point: AnchorPoint | null | undefined): AnchorPoint | null {
    let previous = point ? (point.getPrevious() as AnchorPoint | null) : null;
    if (!previous && this._path && this._path.$closed && point == this.getFirstChild()) {
      previous = this.getLastChild();
    }
    return previous;
  }

  /** The last point whose handles depend on `point` (the next one, or the one after a smooth next). */
  getLastRelatedPoint(point: AnchorPoint): AnchorPoint {
    let related = point;
    const next = this.getNextPoint(point);
    if (next && ((related = next), next.$tp == Type.Symmetric || next.$tp == Type.Mirror)) {
      const beyond = this.getNextPoint(next);
      if (beyond && beyond.$ah && beyond != point) related = beyond;
    }
    return related;
  }

  getFirstRelatedPoint(point: AnchorPoint): AnchorPoint {
    let related = point;
    const previous = this.getPreviousPoint(point);
    if (
      previous &&
      ((related = previous), previous.$tp == Type.Symmetric || previous.$tp == Type.Mirror)
    ) {
      const beyond = this.getPreviousPoint(previous);
      if (beyond && beyond.$ah && beyond != point) related = beyond;
    }
    return related;
  }

  override toString(): string {
    return "[Object GPathBase.AnchorPoints]";
  }
}

const anchorPointsPrototype = AnchorPoints.prototype;
anchorPointsPrototype._dirtyPrev = null;
anchorPointsPrototype._dirtyNext = null;
anchorPointsPrototype._sketchPath = false;

/** A snap point with its anchor type (findPivots with details). */
export interface PathPivot {
  point: Point;
  ptType: string;
  autoH: boolean;
}

export class PathBase extends Shape {
  static {
    registerClass(this, "GPathBase");
  }

  static defaultEps = DEFAULT_EPS;
  static override GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static override MetaProperties: Readonly<Record<string, unknown>> = MetaProperties;
  static CornerType = CornerType;
  static override VisualProperties: Readonly<Record<string, unknown>> = VisualProperties;
  static AnchorPoint = AnchorPoint;
  static AnchorPoints = AnchorPoints;

  static isCornerType(type: unknown): boolean {
    for (const key in CornerType) {
      if (CornerType[key as keyof typeof CornerType] === type) return true;
    }
    return false;
  }

  declare $evenodd: boolean;
  declare $csc: boolean;
  /** GPath's `closed` (a bare path base reads undefined). */
  declare $closed: boolean;
  declare _vertices: VertexContainer;
  declare _verticesDirty: boolean;
  declare _anchorPoints: AnchorPoints | null;
  /**
   * The points are still to be built from properties a restore is setting
   * (a Rectangle or Ellipse that `_restore` made, until its Restore
   * change). The subclasses that set it build them in getAnchorPoints.
   */
  declare _pathPending: boolean;
  /** Texts and connector anchors restored with the path, linked once it is in a scene. */
  declare _referencedNodes: Node[] | null;
  declare _delayedRefresh: boolean;
  /** Set while transform() moves the texts on the path itself. */
  declare _textsTransformed: boolean | undefined;

  constructor(evenOdd?: boolean, anchorPoints?: AnchorPoints | null) {
    super();
    this._setDefaultProperties(VisualProperties, MetaProperties);
    if (evenOdd) this.$evenodd = evenOdd;
    this.setAnchorPoints(anchorPoints || new AnchorPoints());
    this._vertices = new VertexContainer();
    this._verticesDirty = true;
  }

  /** The scene with the reference lookups paths use. */
  get _pathScene(): PathSceneHooks {
    return this._scene as PathSceneHooks;
  }

  /**
   * Scales the corner radii (when allowed), moves the texts on the path
   * along when the children are transformed too, and relayouts the
   * connectors attached to it.
   */
  override transform(
    transform: Transform,
    force?: boolean | null,
    exceptions?: readonly Node[] | false | null,
  ): void {
    this.transformStyledCorners(this, transform);
    if (this._scene && force) this._textsTransformed = true;
    super.transform(transform, force, exceptions);
    if (this._scene) {
      if (force) {
        this._pathScene.visitReferences(this, (reference) => {
          if (isText(reference)) {
            reference.transform(transform, true);
            reference.attachPath(this);
          }
        });
      }
      this._pathScene.visitReferences(this, (reference) => {
        if (isConnectorAnchor(reference)) connectorOf(reference).relayout();
      });
    }
    this._textsTransformed = false;
  }

  setSketchPath(sketch: boolean): void {
    (this._anchorPoints as AnchorPoints)._sketchPath = sketch;
  }

  /** Where items go, and into a paths graph edge. */
  override validateInsertion(parent: ContainerNode, reference?: Node | null): boolean {
    return super.validateInsertion(parent, reference) || "GPGEdge" === Node.getName(parent);
  }

  override assignFrom(other: Node): void {
    if (other instanceof PathBase) this.transferProperties(other, [MetaProperties]);
    super.assignFrom(other);
  }

  /** Regenerates the vertices (styled, mapped by `trf`) when the anchor points changed. */
  override rewindVertices(index?: number): boolean {
    if (this._verticesDirty || null == this._vertices || 0 == this._vertices.getCount()) {
      // The points first: building pending ones fills the vertices already.
      const points = this.getAnchorPoints();
      this._vertices.clearVertices();
      points._generateVertices(this._vertices, this.$trf, true);
      this._verticesDirty = false;
    }
    return this._vertices.rewindVertices(index as number);
  }

  override readVertex(vertex: Vertex): boolean {
    return this._vertices.readVertex(vertex);
  }

  override hasVertexForRead(): boolean {
    return this._vertices.hasVertexForRead();
  }

  /** The corner points (not the smooth ones), mapped by `trf`. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override findPivots(details?: unknown, area?: unknown): unknown[] | null {
    let pivots: Point[] | null = null;
    const trf = this.$trf;
    for (
      let point = this.getAnchorPoints().getFirstChild();
      point;
      point = point.getNext() as AnchorPoint | null
    ) {
      const type = point.getProperty("tp");
      if (type != Type.Symmetric && type != Type.Mirror) {
        let position = new Point(
          point.getProperty("x") as number,
          point.getProperty("y") as number,
        );
        position = trf ? trf.mapPoint(position) : position;
        if (pivots) pivots.push(position);
        else pivots = [position];
      }
    }
    return pivots;
  }

  override getSubnodeIds(ids: Record<string, Node>): void {
    super.getSubnodeIds(ids);
    if (this._anchorPoints) {
      // Through getAnchorPoints, so pending points are built first.
      const points = this.getAnchorPoints();
      if (ids[points.getMultireferenceId()]) points.resetMultireference();
      ids[points.getMultireferenceId()] = points;
      points.getSubnodeIds(ids);
    }
  }

  cloneAnchorPoints(): AnchorPoints {
    return this.getAnchorPoints().clone();
  }

  override _isEvenOddFill(): boolean {
    return !!this.$evenodd;
  }

  /** The bounds of the unstyled, untransformed vertices. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override _calculateSourceBBox(includeInvisible?: unknown): Rect | null {
    const vertices = new VertexContainer();
    this.getAnchorPoints()._generateVertices(vertices, null, false);
    return VertexInfo.calculateBounds(vertices, true);
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
      if (this._scene) {
        const texts: Node[] = [];
        this._pathScene.visitReferences(this, (reference) => {
          if (isText(reference)) texts.push(reference);
        });
        blob["reftxt"] = Node.serialize(texts);
        const anchors: unknown[] = [];
        this._pathScene.visitReferences(this, (reference) => {
          if (isConnectorAnchor(reference)) anchors.push(reference.serialize());
        });
        blob["refanchors"] = anchors;
      }
      this.storeProperties(blob, VisualProperties);
      this.storeProperties(blob, MetaProperties);
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, MetaProperties);
      this.restoreProperties(blob, VisualProperties);
      this._referencedNodes = [];
      if (Object.prototype.hasOwnProperty.call(blob, "reftxt")) {
        const texts = Node.deserialize(blob["reftxt"] as string | null);
        if (texts) this._referencedNodes = texts as Node[];
      }
      if (Object.prototype.hasOwnProperty.call(blob, "refanchors")) {
        (blob["refanchors"] as unknown[][]).forEach((data) => {
          const anchor = new AnchorPoint();
          anchor.deserialize(data);
          (this._referencedNodes as Node[]).push(anchor);
        });
      }
    } else if (change === NodeChange.AfterPropertiesChange) {
      const properties = (args as PropertiesChangeArgs).properties;
      if (properties.indexOf("closed") >= 0) {
        const points = this.getAnchorPoints();
        if (points) {
          points._invalidateRight(points.getFirstChild());
          points._invalidateLeft(points.getLastChild());
        }
        this._verticesDirty = true;
      } else if (properties.indexOf("trf") >= 0) this._verticesDirty = true;
      else if (properties.indexOf("refs") >= 0) {
        if (!this._scene) this._delayedRefresh = true;
      }
    } else if (change === NodeChange.ParentAttached || change === NodeChange.ParentDetach) {
      if (this._anchorPoints) {
        this._anchorPoints._detachFromParent(this);
        if (change === NodeChange.ParentAttached) this._anchorPoints._attachToParent(this);
      }
    } else if (change === NodeChange.WorkspaceAttached || change === NodeChange.WorkspaceDetach) {
      if (this._anchorPoints) {
        this._anchorPoints.accept((node) => {
          node._setWorkspace(change === NodeChange.WorkspaceDetach ? null : this._workspace);
        });
      }
    }
    super._handleChange(change, args);
    if (
      change !== ElementChange.FinishGeometryUpdate ||
      (this.isRecordedTransaction() && !this.isRestoring())
    ) {
      if (change == SceneNodeChange.SceneAttached && this._delayedRefresh) {
        this._pathScene.visitReferences(this, (reference) => {
          if (isText(reference) && reference) reference.attachPath(this);
        });
        this._pathScene.visitReferences(this, (reference) => {
          if (isConnectorAnchor(reference)) connectorOf(reference).relayout();
        });
        this._delayedRefresh = false;
      }
    } else if (this._scene) {
      if (!this._textsTransformed) {
        this._pathScene.visitReferences(this, (reference) => {
          if (isText(reference)) reference.attachPath(this);
        });
      }
      this._pathScene.visitReferences(this, (reference) => {
        if (isConnectorAnchor(reference)) connectorOf(reference).relayout();
      });
    } else this._delayedRefresh = true;
  }

  /** Links the restored texts and connector anchors instead of `refs`. */
  override _handleReferencesOnSceneAttach(): void {
    super._handleReferencesOnSceneAttach(this._referencedNodes);
    this._referencedNodes = null;
  }

  /** Whether `text` was restored as a text on this path. */
  hasReferencedText(text: PathText): boolean {
    if (this._referencedNodes && this._referencedNodes.length) {
      const id = text.getReferenceId();
      return this._referencedNodes.some((node) => isText(node) && node.getReferenceId() === id);
    }
    return false;
  }

  /** Attaches or detaches a text or a connector anchor that the scene linked to this path. */
  override _referenceEvent(event: ReferenceEvent): void {
    if (event.target !== this) return;
    const linked = event.linked;
    const reference = event.reference;
    if (isText(reference)) {
      if (linked) reference.attachPath(this);
      else reference.attachPath(null);
    } else {
      if (!isConnectorAnchor(reference)) return;
      if (linked) connectorOf(reference).attachPath(reference, this);
      else {
        const connector = reference.getPath();
        if (connector) (connector.getParent() as ContainerNode).removeChild(connector);
      }
    }
    super._referenceEvent(event);
  }

  getAnchorPoints(): AnchorPoints {
    return this._anchorPoints as AnchorPoints;
  }

  setAnchorPoints(anchorPoints: AnchorPoints): void {
    if (this._anchorPoints) this._anchorPoints._detachFromParent(this);
    // The given points take the place of the ones still to be built.
    if (this._pathPending) this._pathPending = false;
    this._anchorPoints = anchorPoints;
    this._anchorPoints._setParent(this as unknown as ContainerNode);
  }

  /**
   * The segment under `location` (in view coordinates, `transform` maps
   * the path there): a hit on the unstyled outline (or inside, for closed
   * paths with `inside`), snapped to the segment middle when that is
   * within the tolerance.
   */
  pathHitTest(
    location: Point,
    transform?: Transform | null,
    inside?: boolean,
    tolerance?: number,
  ): ElementData<PathBase, HitResult> | null {
    tolerance = tolerance || 0;
    let point = location;
    let scale = 1;
    let inverse: Transform;
    if (transform && transform.invertible()) {
      point = (inverse = transform.inverted() as Transform).mapPoint(location);
      scale *= inverse.getScaleFactor();
    }
    let trf: Transform | null = null;
    if (this.$trf && this.$trf.invertible()) {
      trf = this.$trf;
      // Hidden while the vertices are made, so they come out untransformed.
      this.$trf = null;
      point = (inverse = trf.inverted() as Transform).mapPoint(point);
      scale *= inverse.getScaleFactor();
    }
    const vertices = new VertexContainer();
    this.getAnchorPoints()._generateVertices(vertices, this.$trf, false);
    const result = new HitResult();
    let hit: ElementData<PathBase, HitResult> | null = null;
    const reach = scale * tolerance * 2;
    if (
      VertexInfo.hitTest(
        point.getX(),
        point.getY(),
        vertices,
        reach,
        !!this.$closed && inside,
        result,
      ) &&
      ((hit = new ElementData(this as PathBase, result)),
      result.outline && 0 != result.slope && 1 != result.slope)
    ) {
      const middle = VertexInfo.getSegmentPoint(vertices, result.segment as number, 0.5);
      if (middle) {
        if (2 * GMath.ptDist(point.getX(), point.getY(), middle.getX(), middle.getY()) <= reach) {
          result.slope = 0.5;
          result.x = middle.getX();
          result.y = middle.getY();
        }
      }
    }
    if (trf) this.$trf = trf;
    return hit;
  }

  /**
   * Whether the outline runs clockwise: the sum of the turn angles over
   * the anchor and handle points (mapped by `trf`) is not positive.
   */
  override isClockWise(): boolean {
    let trf = this.getProperty("trf") as Transform | null;
    trf = trf && !trf.isIdentity() ? trf : null;
    let first: Point | null;
    let second: Point | null = null;
    let third: Point | null = null;
    let total = 0;
    const points = this.getAnchorPoints();
    let anchor = points.getFirstChild() as AnchorPoint;
    let mapped = trf ? anchor._getTransformedCopy(trf) : anchor;
    let current: Point | null = new Point(
      mapped.getProperty("x") as number,
      mapped.getProperty("y") as number,
    );
    // Which point of the anchor `current` is: "a" anchor, "l" left handle, "r" right handle.
    let part: string | null = "a";
    let wrapped = false;
    let done = false;
    const nextPoint = (): Point | null => {
      if (done) {
        current = null;
        part = null;
        return null;
      }
      if ("l" == part) {
        current = new Point(mapped.getProperty("x") as number, mapped.getProperty("y") as number);
        part = "a";
        return current;
      }
      if ("a" == part && (points.getLastChild() != anchor || this.getProperty("closed"))) {
        const hrx = mapped.getProperty("hrx");
        const hry = mapped.getProperty("hry");
        if (null !== hrx && null !== hry) {
          current = new Point(hrx as number, hry as number);
          part = "r";
          if (wrapped) done = true;
          return current;
        }
      }
      anchor = anchor.getNext() as AnchorPoint;
      if (wrapped) done = true;
      if (!anchor) {
        wrapped = true;
        anchor = points.getFirstChild() as AnchorPoint;
      }
      const hlx = (mapped = trf ? anchor._getTransformedCopy(trf) : anchor).getProperty("hlx");
      const hly = mapped.getProperty("hly");
      return null !== hlx && null !== hly
        ? ((current = new Point(hlx as number, hly as number)), (part = "l"), current)
        : ((current = new Point(
            mapped.getProperty("x") as number,
            mapped.getProperty("y") as number,
          )),
          (part = "a"),
          current);
    };
    for (; current;) {
      if (second) {
        first = second;
        second = third;
        third = current;
      } else {
        first = current;
        second = current = nextPoint();
        third = current = nextPoint();
      }
      if (first && second && third) {
        total += GMath.getTurnAngle(first, second, second, third);
        current = nextPoint();
      }
    }
    return total <= 0;
  }

  /** Reverses the point order (and flips each point's handles and radii). */
  reverseOrder(): void {
    let point: AnchorPoint;
    this.beginUpdate();
    const points = this.getAnchorPoints();
    const first = points.getFirstChild() as AnchorPoint;
    for (
      point = points.getLastChild() as AnchorPoint;
      point !== first;
      point = points.getLastChild() as AnchorPoint
    ) {
      point.flip();
      points.removeChild(point);
      points.insertChild(point, first);
    }
    first.flip();
    this.endUpdate();
  }

  /** Scales the corner radii of `target` by `transform`, when the scene or `csc` allow it. */
  transformStyledCorners(target: PathBase, transform: Transform): void {
    const settings = this._scene ? this._pathScene.getTransformSettings() : null;
    if (!(
      !((settings && null != settings.scaleCorners) || this.getProperty("csc")) ||
      (settings && 0 == (settings.scaleCorners as number))
    )) {
      this._transformStyledCorners(target, transform);
    }
  }

  /**
   * Sets the radii of `target`'s points to this path's radii times the
   * square root of the transform's area scale (the last point last, after
   * the events are released).
   */
  _transformStyledCorners(target: PathBase, transform: Transform): void {
    let scaleLeft = 1;
    let scaleRight = 1;
    const scale = (transform.decomposed() as TransformDecomposition).scale.getMatrix();
    // Both branches are the same in the old code.
    if (this.getProperty("cu")) {
      const area = Math.abs((scale[0] as number) * (scale[3] as number));
      if (!GMath.isEqualEps(area, 1)) scaleLeft = scaleRight = Math.sqrt(area);
    } else {
      const area = Math.abs((scale[0] as number) * (scale[3] as number));
      if (!GMath.isEqualEps(area, 1)) scaleLeft = scaleRight = Math.sqrt(area);
    }
    if (GMath.isEqualEps(scaleLeft, 1) || GMath.isEqualEps(scaleRight, 1)) return;
    const source = this.getAnchorPoints();
    const targetPoints = target.getAnchorPoints();
    target._beginBlockEvents([GeometryChangeEvent]);
    targetPoints._beginBlockCompositeEvents(false, true, false);
    let point = targetPoints.getFirstChild();
    let original = source.getFirstChild();
    for (
      ;
      point && original && point.getNext() && original.getNext();
      point = point.getNext() as AnchorPoint | null,
        original = original.getNext() as AnchorPoint | null
    ) {
      point.setProperties(
        ["cl", "cr"],
        [
          (original.getProperty("cl") as number) * scaleLeft,
          (original.getProperty("cr") as number) * scaleRight,
        ],
      );
    }
    target._endBlockEvents([GeometryChangeEvent]);
    targetPoints._endBlockCompositeEvents(false, true, false);
    if (point && original) {
      point.setProperties(
        ["cl", "cr"],
        [
          (original.getProperty("cl") as number) * scaleLeft,
          (original.getProperty("cr") as number) * scaleRight,
        ],
      );
    }
  }

  /** Copies the corner radii to `target`'s points (without change events). */
  transferStyledCorners(target: PathBase): void {
    const source = this.getAnchorPoints();
    for (
      let point = target.getAnchorPoints().getFirstChild(), original = source.getFirstChild();
      point && original;
      point = point.getNext() as AnchorPoint | null,
        original = original.getNext() as AnchorPoint | null
    ) {
      point.$cl = original.$cl;
      point.$cr = original.$cr;
    }
  }

  override toString(): string {
    return "[GPathBase]";
  }
}

const pathBasePrototype = PathBase.prototype;
pathBasePrototype._vertices = null as unknown as VertexContainer;
pathBasePrototype._verticesDirty = false;
pathBasePrototype._anchorPoints = null;
pathBasePrototype._pathPending = false;
pathBasePrototype._referencedNodes = null;
pathBasePrototype._delayedRefresh = false;
