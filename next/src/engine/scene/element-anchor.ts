// Old: chunk.vendor.js module 910 (GElement.Anchor).
/**
 * Constraints: an element inside a Layout container keeps its distance to
 * the container's edges when the container is resized. Per axis, the
 * anchor type (`hacr`, `vacr`) is Start, Middle, End or Stretch, and when
 * it is set the element records:
 *
 * - `habox`/`vabox`: the container box, `hsbox`/`vsbox`: its own box,
 *   both in the container's unrotated frame;
 * - `hatrf`/`vatrf`: the container's transforms since then, `hstrf`/
 *   `vstrf`: its own (the rotation into the frame, then its moves);
 * - `hdl`/`hdr`/`vdt`/`vdb`: the distances to the edges, `hcf`/`vcf` the
 *   relative position of its center (Middle).
 *
 * `relayoutAnchored` maps the recorded boxes with the transforms, measures
 * the current distances along the container's (possibly rotated and
 * flipped) edges and moves or stretches the element back to the recorded
 * ones.
 */
import { defineMixin, type AnyConstructor } from "../core/object.ts";
import { GMath } from "../math/math.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform as Matrix } from "../math/transform.ts";
import { ElementChange, isElement } from "./element-change.ts";
import { Layout } from "./element-layout.ts";
import { MINIMAL_DIMENTION, type TransformApi } from "./element-transform.ts";
import type { Element } from "./element.ts";
import { NodeChange } from "./node-change.ts";
import type { PropertiesChangeArgs, PropertiesNode, PropertyFilter } from "./node-properties.ts";
import type { StoreChangeArgs, RestoreChangeArgs } from "../serialize/blob.ts";

const ANCHOR_EPS = 1e-9;

const AnchorType = {
  Start: 1,
  Middle: 2,
  End: 3,
  Stretch: 4,
} as const;

/** The constraint properties; all default to null, so only set ones are saved. */
const AnchorMetaProperties = {
  hacr: null,
  habox: null,
  hsbox: null,
  hatrf: null,
  hstrf: null,
  hdl: null,
  hdr: null,
  hcf: null,
  vacr: null,
  vabox: null,
  vsbox: null,
  vatrf: null,
  vstrf: null,
  vdt: null,
  vdb: null,
  vcf: null,
};

const ALL_ANCHOR_PROPERTIES = Object.keys(AnchorMetaProperties);

/** Transforms are saved as arrays and boxes as [x, y, w, h]. */
const storeFilter: PropertyFilter = (name, value) =>
  ("hatrf" !== name && "hstrf" !== name && "vatrf" !== name && "vstrf" !== name) || !value
    ? ("habox" !== name && "hsbox" !== name && "vabox" !== name && "vsbox" !== name) || !value
      ? value
      : Rect.serialize(value as Rect)
    : Matrix.serialize(value as Matrix);

const restoreFilter: PropertyFilter = (name, value) =>
  ("hatrf" !== name && "hstrf" !== name && "vatrf" !== name && "vstrf" !== name) || !value
    ? ("habox" !== name && "hsbox" !== name && "vabox" !== name && "vsbox" !== name) || !value
      ? value
      : Rect.deserialize(value as never)
    : Matrix.deserialize(value as never);

export interface AnchorApi {
  /** Set by subclasses to keep hstrf/vstrf while a parent moves the element. */
  _noAnchoringPropsUpdate: boolean;
  oldHacr: unknown;
  oldVacr: unknown;
  /** Called by the classes that mix in Anchor from their _handleChange (GItem). */
  _handleAnchorChange(change: number, args: unknown): void;
  _setInitialAnchorProps(horizontal: boolean, vertical: boolean): void;
  resetAnchorProperties(): void;
  /** Moves the element back to its constraints after the container moved by `transform`. */
  relayoutAnchored(transform: Matrix): void;
  _getLeftDist(container: Rect, own: Rect): number;
  _getRightDist(container: Rect, own: Rect): number;
  _getMiddleHCoefficient(container: Rect, own: Rect): number;
  _getTopDist(container: Rect, own: Rect): number;
  _getBottomDist(container: Rect, own: Rect): number;
  _getMiddleVCoefficient(container: Rect, own: Rect): number;
}

type AnchorHost = Element & PropertiesNode & TransformApi & AnchorApi;

/**
 * The container edge an anchor measures against, as four corners: the
 * edge runs from `start` to `end`, `next` is the corner after `end` and
 * `opposite` the one after `start`. Which corners they are depends on how
 * the container is flipped.
 */
interface Edge {
  start: Point;
  end: Point;
  next: Point;
}

function pickEdge(base: Point[], flipped: Point[], useFlipped: boolean, swap: boolean): Edge {
  const corners = useFlipped ? flipped : base;
  let start = corners[0] as Point;
  let end = corners[1] as Point;
  let next = corners[2] as Point;
  const opposite = corners[3] as Point;
  if (swap) {
    const first = start;
    start = end;
    end = first;
    next = opposite;
  }
  return { start, end, next };
}

/**
 * The translation that brings the element's edge (from `ownStart` to
 * `ownEnd`, with `ownThird` the corner after `ownEnd`) back to `distance`
 * from the container edge. `sign` is -1 for the horizontal anchors (the
 * old code negated the side there); `forward` is true for left and top,
 * where the translation runs from `end` towards `next`.
 */
function anchorShift(
  edge: Edge,
  ownStart: Point,
  ownEnd: Point,
  ownThird: Point,
  distance: number,
  sign: -1 | 1,
  sideFlipped: boolean,
  forward: boolean,
): Point {
  let dx = 0;
  let dy = 0;
  const x1 = edge.start.getX();
  const y1 = edge.start.getY();
  const x2 = edge.end.getX();
  const y2 = edge.end.getY();
  const x3 = edge.next.getX();
  const y3 = edge.next.getY();
  const ux = ownStart.getX();
  const uy = ownStart.getY();
  const vx = ownEnd.getX();
  const vy = ownEnd.getY();
  let current = GMath.pointToLineDist(x1, y1, x2, y2, ux, uy);
  current =
    sign < 0
      ? -GMath.segmentSide(x1, y1, x2, y2, ux, uy) * current
      : GMath.segmentSide(x1, y1, x2, y2, ux, uy) * current;
  if (sideFlipped) current = -current;
  if (null != current && !GMath.isEqualEps(current, distance, ANCHOR_EPS)) {
    const delta = distance - current;
    const wx = ownThird.getX();
    const wy = ownThird.getY();
    let sin = GMath.getSin(ux, uy, vx, vy, wx, wy);
    let length = GMath.ptDist(vx, vy, wx, wy);
    let factor = sin * length;
    if (
      GMath.isEqualEps(factor, 0, ANCHOR_EPS) ||
      (GMath.isEqualEps(ux, vx) && GMath.isEqualEps(uy, vy))
    ) {
      // The element is flat along this edge: move along the container.
      sin = GMath.getSin(x1, y1, x2, y2, x3, y3);
      length = GMath.ptDist(x2, y2, x3, y3);
      factor = sin * length;
      if (GMath.isEqualEps(factor, 0, ANCHOR_EPS)) {
        // So is the container: move along the edge's normal.
        if (!GMath.isEqualEps(x1, x2) || !GMath.isEqualEps(y1, y2)) {
          let normal = new Point(y1 - y2, x2 - x1);
          const normalLength = Math.sqrt(
            GMath.vDotProduct(normal.getX(), normal.getY(), normal.getX(), normal.getY()),
          );
          normal = new Point(normal.getX() / normalLength, normal.getY() / normalLength);
          dx = delta * normal.getX();
          dy = delta * normal.getY();
        }
      } else {
        factor = delta / factor;
        dx = (forward ? x3 - x2 : x2 - x3) * factor;
        dy = (forward ? y3 - y2 : y2 - y3) * factor;
      }
    } else {
      factor = delta / factor;
      dx = (forward ? wx - vx : vx - wx) * factor;
      dy = (forward ? wy - vy : vy - wy) * factor;
    }
  }
  return new Point(dx, dy);
}

const anchorBody = <TBase extends AnyConstructor<Element>>(Base: TBase) => {
  abstract class AnchorMixin extends Base implements AnchorApi {
    declare _noAnchoringPropsUpdate: boolean;
    declare oldHacr: unknown;
    declare oldVacr: unknown;

    private get _host(): AnchorHost {
      return this as unknown as AnchorHost;
    }

    _handleAnchorChange(change: number, args: unknown): void {
      const self = this._host;
      const properties =
        change === NodeChange.AfterPropertiesChange ? (args as PropertiesChangeArgs) : null;
      if (
        properties &&
        (properties.properties.indexOf("hacr") >= 0 || properties.properties.indexOf("vacr") >= 0)
      ) {
        const hIndex = properties.properties.indexOf("hacr");
        if (hIndex >= 0) this.oldHacr = properties.values[hIndex];
        const vIndex = properties.properties.indexOf("vacr");
        if (vIndex >= 0) this.oldVacr = properties.values[vIndex];
        const parent = this.getParent();
        if (parent && parent.hasMixin(Layout) && !this.isRecordedTransaction()) {
          this._setInitialAnchorProps(
            properties.properties.indexOf("hacr") >= 0,
            properties.properties.indexOf("vacr") >= 0,
          );
        }
      } else if (
        properties &&
        !this.isRecordedTransaction() &&
        properties.properties.indexOf("trf") >= 0 &&
        (self.getProperty("hacr") || self.getProperty("vacr")) &&
        !this.isRestoring()
      ) {
        if (this.dependentUpdate) {
          // Moved by the container: fold the move into hstrf/vstrf.
          if (!this._noAnchoringPropsUpdate) {
            const index = properties.properties.indexOf("trf");
            if (self.getProperty("hacr")) {
              let own = self.getProperty("hstrf") as Matrix | null;
              const current = self.getProperty("trf") as Matrix | null;
              let delta: Matrix | null = null;
              const old = properties.values[index] as Matrix | null;
              if (old) delta = old.inverted();
              if (current) delta = delta ? delta.multiplied(current) : current;
              own = own ? own.multiplied(delta as Matrix) : delta;
              self.setProperty("hstrf", own);
            }
            if (self.getProperty("vacr")) {
              let own = self.getProperty("vstrf") as Matrix | null;
              const current = self.getProperty("trf") as Matrix | null;
              let delta: Matrix | null = null;
              const old = properties.values[index] as Matrix | null;
              if (old) delta = old.inverted();
              if (current) delta = delta ? delta.multiplied(current) : current;
              own = own ? own.multiplied(delta as Matrix) : delta;
              self.setProperty("vstrf", own);
            }
          }
        } else {
          // Moved by the user: measure the constraints again.
          const horizontal = self.getProperty("hacr");
          const vertical = self.getProperty("vacr");
          this.resetAnchorProperties();
          self.setProperties(["hacr", "vacr"], [horizontal, vertical]);
        }
      } else if (
        (change !== ElementChange.GeometrySizeChanged && change !== NodeChange.ParentAttached) ||
        this.isRecordedTransaction() ||
        this.isRestoring() ||
        this.dependentUpdate ||
        (!self.getProperty("hacr") && !self.getProperty("vacr"))
      ) {
        if (change === NodeChange.Store) {
          self.storeProperties((args as StoreChangeArgs).blob, AnchorMetaProperties, storeFilter);
        } else if (change === NodeChange.Restore) {
          self.restoreProperties(
            (args as RestoreChangeArgs).blob,
            AnchorMetaProperties,
            restoreFilter,
          );
        }
      } else if (change == NodeChange.ParentAttached) this.resetAnchorProperties();
      else {
        const horizontal = self.getProperty("hacr");
        const vertical = self.getProperty("vacr");
        this.resetAnchorProperties();
        self.setProperties(["hacr", "vacr"], [horizontal, vertical]);
      }
    }

    _setInitialAnchorProps(horizontal: boolean, vertical: boolean): void {
      const self = this._host;
      const parent = this.getParent();
      let container = parent ? (parent as unknown as Element).getGeometryBBox() : null;
      let own = this.getGeometryBBox();
      if (!(
        container &&
        (container.getWidth() || container.getHeight()) &&
        own &&
        (own.getWidth() || own.getHeight())
      )) {
        this.resetAnchorProperties();
        return;
      }
      const owner = parent as unknown as Element;
      let frame: Matrix | null = null;
      if (isElement(parent)) {
        // A rotated container: measure in its unrotated frame.
        const angle = parent.getAngle();
        if (!(null === angle || GMath.isEqualEps(angle, 0, 1e-4))) {
          frame = new Matrix().rotated(-angle);
          container = parent.getPreTransformRect(frame);
          own = this.getPreTransformRect(frame);
        }
      }
      if (horizontal) {
        const type = self.getProperty("hacr");
        if (type) {
          owner._notifyChange(ElementChange.PrepareChildAnchoring);
          self.setProperties(["habox", "hsbox", "hatrf", "hstrf"], [container, own, frame, frame]);
          const box = container as Rect;
          const mine = own as Rect;
          switch (type) {
            case AnchorType.Start:
              self.setProperties(["hdl", "hdr", "hcf"], [this._getLeftDist(box, mine), null, null]);
              break;
            case AnchorType.Middle:
              self.setProperties(
                ["hdr", "hdl", "hcf"],
                [null, null, this._getMiddleHCoefficient(box, mine)],
              );
              break;
            case AnchorType.End:
              self.setProperties(
                ["hdr", "hdl", "hcf"],
                [this._getRightDist(box, mine), null, null],
              );
              break;
            case AnchorType.Stretch: {
              const left = this._getLeftDist(box, mine);
              const right = this._getRightDist(box, mine);
              self.setProperties(["hdr", "hdl", "hcf"], [right, left, null]);
            }
          }
        } else {
          self.setProperties(
            ["habox", "hsbox", "hatrf", "hstrf", "hdl", "hdr", "hcf"],
            [null, null, null, null, null, null, null],
          );
        }
      }
      if (vertical) {
        const type = self.getProperty("vacr");
        if (type) {
          owner._notifyChange(ElementChange.PrepareChildAnchoring);
          self.setProperties(["vabox", "vsbox", "vatrf", "vstrf"], [container, own, frame, frame]);
          const box = container as Rect;
          const mine = own as Rect;
          switch (type) {
            case AnchorType.Start:
              self.setProperties(["vdt", "vdb", "vcf"], [this._getTopDist(box, mine), null, null]);
              break;
            case AnchorType.Middle:
              self.setProperties(
                ["vdt", "vdb", "vcf"],
                [null, null, this._getMiddleVCoefficient(box, mine)],
              );
              break;
            case AnchorType.End:
              self.setProperties(
                ["vdb", "vdt", "vcf"],
                [this._getBottomDist(box, mine), null, null],
              );
              break;
            case AnchorType.Stretch: {
              const top = this._getTopDist(box, mine);
              const bottom = this._getBottomDist(box, mine);
              self.setProperties(["vdb", "vdt", "vcf"], [bottom, top, null]);
            }
          }
        } else {
          self.setProperties(
            ["vabox", "vsbox", "vatrf", "vstrf", "vdt", "vdb", "vcf"],
            [null, null, null, null, null, null, null],
          );
        }
      }
    }

    resetAnchorProperties(): void {
      this._host.setProperties(
        ALL_ANCHOR_PROPERTIES,
        ALL_ANCHOR_PROPERTIES.map(() => null),
      );
    }

    relayoutAnchored(transform: Matrix): void {
      const self = this._host;
      const hType = self.getProperty("hacr");
      const vType = self.getProperty("vacr");
      let hShift: Matrix | null = null;
      let vShift: Matrix | null = null;
      let hContainerTrf = self.getProperty("hatrf") as Matrix | null;
      let vContainerTrf = self.getProperty("vatrf") as Matrix | null;
      const hContainerBox = self.getProperty("habox") as Rect | null;
      const hOwnBox = self.getProperty("hsbox") as Rect | null;
      if (hType && hContainerBox && hOwnBox) {
        const ownTrf = self.getProperty("hstrf") as Matrix | null;
        let sideFlipped = false;
        let flipX = false;
        let flipY = false;
        // A flat element: compare directions with the recorded container instead.
        const flat =
          GMath.isEqualEps(hOwnBox.getHeight(), 0) || GMath.isEqualEps(hOwnBox.getWidth(), 0);
        let recorded: Point[] | undefined;
        if (flat) {
          recorded = ownTrf
            ? ownTrf.mapQuadrilateral(hContainerBox)
            : new Matrix().mapQuadrilateral(hContainerBox);
        }
        hContainerTrf = hContainerTrf ? hContainerTrf.multiplied(transform) : transform;
        const box = hContainerTrf.mapQuadrilateral(hContainerBox);
        const mine = ownTrf
          ? ownTrf.mapQuadrilateral(hOwnBox)
          : new Matrix().mapQuadrilateral(hOwnBox);
        const [topLeft, topRight, bottomRight, bottomLeft] = box as [Point, Point, Point, Point];
        const [ownTopLeft, ownTopRight, ownBottomRight, ownBottomLeft] = mine as [
          Point,
          Point,
          Point,
          Point,
        ];
        if (flat) {
          const [rTopLeft, rTopRight, , rBottomLeft] = recorded as [Point, Point, Point, Point];
          flipX = !coDirected(topLeft, topRight, rTopLeft, rTopRight);
          flipY = !coDirected(topLeft, bottomLeft, rTopLeft, rBottomLeft);
        } else {
          sideFlipped =
            GMath.segmentSide(
              ownTopLeft.getX(),
              ownTopLeft.getY(),
              ownBottomLeft.getX(),
              ownBottomLeft.getY(),
              ownTopRight.getX(),
              ownTopRight.getY(),
            ) !=
            GMath.segmentSide(
              hOwnBox.getX(),
              hOwnBox.getY(),
              hOwnBox.getX(),
              hOwnBox.getY() + hOwnBox.getHeight(),
              hOwnBox.getX() + hOwnBox.getWidth(),
              hOwnBox.getY() + hOwnBox.getHeight(),
            );
          flipX = !coDirected(topLeft, topRight, ownTopLeft, ownTopRight);
          flipY = !coDirected(topLeft, bottomLeft, ownTopLeft, ownBottomLeft);
        }
        const leftShift = () =>
          anchorShift(
            pickEdge(
              [topLeft, bottomLeft, bottomRight, topRight],
              [topRight, bottomRight, bottomLeft, topLeft],
              flipX,
              flipY,
            ),
            ownTopLeft,
            ownBottomLeft,
            ownBottomRight,
            self.getProperty("hdl") as number,
            -1,
            sideFlipped,
            true,
          );
        const rightShift = () =>
          anchorShift(
            pickEdge(
              [topRight, bottomRight, bottomLeft, topLeft],
              [topLeft, bottomLeft, bottomRight, topRight],
              flipX,
              flipY,
            ),
            ownTopRight,
            ownBottomRight,
            ownBottomLeft,
            self.getProperty("hdr") as number,
            -1,
            sideFlipped,
            false,
          );
        switch (hType) {
          case 1: {
            const shift = leftShift();
            hShift = new Matrix().translated(shift.getX(), shift.getY());
            break;
          }
          case 2: {
            let top = ownTopLeft.add(ownTopRight);
            top = new Point(top.getX() / 2, top.getY() / 2);
            let bottom = ownBottomRight.add(ownBottomLeft);
            bottom = new Point(bottom.getX() / 2, bottom.getY() / 2);
            const center = GMath.getLinesFromPointsIntersection(
              topLeft.getX(),
              topLeft.getY(),
              topRight.getX(),
              topRight.getY(),
              top.getX(),
              top.getY(),
              bottom.getX(),
              bottom.getY(),
            );
            if (null != center) {
              const coefficient = self.getProperty("hcf") as number;
              let x: number;
              let y: number;
              if (flipX) {
                x = coefficient * (topLeft.getX() - topRight.getX()) + topRight.getX();
                y = coefficient * (topLeft.getY() - topRight.getY()) + topRight.getY();
              } else {
                x = coefficient * (topRight.getX() - topLeft.getX()) + topLeft.getX();
                y = coefficient * (topRight.getY() - topLeft.getY()) + topLeft.getY();
              }
              hShift = new Matrix().translated(x - center.getX(), y - center.getY());
            }
            break;
          }
          case 3: {
            const shift = rightShift();
            hShift = new Matrix().translated(shift.getX(), shift.getY());
            break;
          }
          case 4: {
            const origin = mine[0] as Point;
            const end = mine[1] as Point;
            const left = leftShift();
            const right = rightShift();
            const leftX = left.getX();
            const leftY = left.getY();
            const growX = right.getX() - leftX;
            const growY = right.getY() - leftY;
            const edgeX = end.getX() - origin.getX();
            const edgeY = end.getY() - origin.getY();
            const newX = growX + edgeX;
            const newY = growY + edgeY;
            const newLength = stretchedLength(edgeX, edgeY, newX, newY);
            let oldLength = GMath.ptDist(origin.getX(), origin.getY(), end.getX(), end.getY());
            oldLength = oldLength > MINIMAL_DIMENTION ? oldLength : MINIMAL_DIMENTION;
            const scale = newLength / oldLength;
            const angle = Math.atan2(edgeY, edgeX);
            hShift = new Matrix()
              .translated(-origin.getX(), -origin.getY())
              .rotated(-angle)
              .scaled(scale, 1)
              .rotated(angle)
              .translated(origin.getX(), origin.getY())
              .translated(leftX, leftY);
          }
        }
      }
      const vContainerBox = self.getProperty("vabox") as Rect | null;
      const vOwnBox = self.getProperty("vsbox") as Rect | null;
      if (vType && vContainerBox && vOwnBox) {
        let ownTrf = self.getProperty("vstrf") as Matrix | null;
        ownTrf = ownTrf || new Matrix();
        if (hShift) ownTrf = ownTrf.multiplied(hShift);
        let sideFlipped = false;
        let flipX = false;
        let flipY = false;
        const flat =
          GMath.isEqualEps(vOwnBox.getHeight(), 0) || GMath.isEqualEps(vOwnBox.getWidth(), 0);
        let recorded: Point[] | undefined;
        if (flat) recorded = ownTrf.mapQuadrilateral(vContainerBox);
        vContainerTrf = vContainerTrf ? vContainerTrf.multiplied(transform) : transform;
        const box = vContainerTrf.mapQuadrilateral(vContainerBox);
        const mine = ownTrf.mapQuadrilateral(vOwnBox);
        const [topLeft, topRight, bottomRight, bottomLeft] = box as [Point, Point, Point, Point];
        const [ownTopLeft, ownTopRight, ownBottomRight, ownBottomLeft] = mine as [
          Point,
          Point,
          Point,
          Point,
        ];
        if (flat) {
          const [rTopLeft, rTopRight, , rBottomLeft] = recorded as [Point, Point, Point, Point];
          flipX = !coDirected(topLeft, topRight, rTopLeft, rTopRight);
          flipY = !coDirected(topLeft, bottomLeft, rTopLeft, rBottomLeft);
        } else {
          sideFlipped =
            GMath.segmentSide(
              ownTopLeft.getX(),
              ownTopLeft.getY(),
              ownBottomLeft.getX(),
              ownBottomLeft.getY(),
              ownTopRight.getX(),
              ownTopRight.getY(),
            ) !=
            GMath.segmentSide(
              vOwnBox.getX(),
              vOwnBox.getY(),
              vOwnBox.getX(),
              vOwnBox.getY() + vOwnBox.getHeight(),
              vOwnBox.getX() + vOwnBox.getWidth(),
              vOwnBox.getY() + vOwnBox.getHeight(),
            );
          flipX = !coDirected(topLeft, topRight, ownTopLeft, ownTopRight);
          flipY = !coDirected(topLeft, bottomLeft, ownTopLeft, ownBottomLeft);
        }
        // Vertically the roles of the two flips swap.
        const topShift = () =>
          anchorShift(
            pickEdge(
              [topLeft, topRight, bottomRight, bottomLeft],
              [bottomLeft, bottomRight, topRight, topLeft],
              flipY,
              flipX,
            ),
            ownTopLeft,
            ownTopRight,
            ownBottomRight,
            self.getProperty("vdt") as number,
            1,
            sideFlipped,
            true,
          );
        const bottomShift = () =>
          anchorShift(
            pickEdge(
              [bottomLeft, bottomRight, topRight, topLeft],
              [topLeft, topRight, bottomRight, bottomLeft],
              flipY,
              flipX,
            ),
            ownBottomLeft,
            ownBottomRight,
            ownTopRight,
            self.getProperty("vdb") as number,
            1,
            sideFlipped,
            false,
          );
        switch (vType) {
          case 1: {
            const shift = topShift();
            vShift = new Matrix().translated(shift.getX(), shift.getY());
            break;
          }
          case 2: {
            let left = ownTopLeft.add(ownBottomLeft);
            left = new Point(left.getX() / 2, left.getY() / 2);
            let right = ownTopRight.add(ownBottomRight);
            right = new Point(right.getX() / 2, right.getY() / 2);
            const center = GMath.getLinesFromPointsIntersection(
              topLeft.getX(),
              topLeft.getY(),
              bottomLeft.getX(),
              bottomLeft.getY(),
              left.getX(),
              left.getY(),
              right.getX(),
              right.getY(),
            );
            if (null != center) {
              const coefficient = self.getProperty("vcf") as number;
              let x: number;
              let y: number;
              if (flipY) {
                x = coefficient * (topLeft.getX() - bottomLeft.getX()) + bottomLeft.getX();
                y = coefficient * (topLeft.getY() - bottomLeft.getY()) + bottomLeft.getY();
              } else {
                x = coefficient * (bottomLeft.getX() - topLeft.getX()) + topLeft.getX();
                y = coefficient * (bottomLeft.getY() - topLeft.getY()) + topLeft.getY();
              }
              vShift = new Matrix().translated(x - center.getX(), y - center.getY());
            }
            break;
          }
          case 3: {
            const shift = bottomShift();
            vShift = new Matrix().translated(shift.getX(), shift.getY());
            break;
          }
          case 4: {
            const origin = mine[0] as Point;
            const end = mine[3] as Point;
            const top = topShift();
            const bottom = bottomShift();
            const topX = top.getX();
            const topY = top.getY();
            const growX = bottom.getX() - topX;
            const growY = bottom.getY() - topY;
            const edgeX = end.getX() - origin.getX();
            const edgeY = end.getY() - origin.getY();
            const newX = growX + edgeX;
            const newY = growY + edgeY;
            const newLength = stretchedLength(edgeX, edgeY, newX, newY);
            let oldLength = GMath.ptDist(origin.getX(), origin.getY(), end.getX(), end.getY());
            oldLength = oldLength > MINIMAL_DIMENTION ? oldLength : MINIMAL_DIMENTION;
            const scale = newLength / oldLength;
            // atan2(x, y), unlike the horizontal case; kept.
            const angle = Math.atan2(edgeX, edgeY);
            vShift = new Matrix()
              .translated(-origin.getX(), -origin.getY())
              .rotated(angle)
              .scaled(1, scale)
              .rotated(-angle)
              .translated(origin.getX(), origin.getY())
              .translated(topX, topY);
          }
        }
      }
      if (hType || vType) {
        self.setProperties(["hatrf", "vatrf"], [hContainerTrf, vContainerTrf]);
        if (hShift || vShift) {
          let shift = hShift || new Matrix();
          if (vShift) shift = shift.multiplied(vShift);
          const matrix = transform.getMatrix();
          const force =
            (4 != hType && 4 != vType) ||
            (GMath.isEqualEps(matrix[0] as number, 1) &&
              GMath.isEqualEps(matrix[1] as number, 0) &&
              GMath.isEqualEps(matrix[2] as number, 0) &&
              GMath.isEqualEps(matrix[3] as number, 1));
          self.transform(shift, force, false);
        }
      }
    }

    _getLeftDist(container: Rect, own: Rect): number {
      return own.getX() - container.getX();
    }

    _getRightDist(container: Rect, own: Rect): number {
      return own.getX() + own.getWidth() - container.getX() - container.getWidth();
    }

    _getMiddleHCoefficient(container: Rect, own: Rect): number {
      const center = (own.getX() + own.getX() + own.getWidth()) / 2;
      return container.getWidth() > 0
        ? (center - container.getX()) / container.getWidth()
        : MINIMAL_DIMENTION;
    }

    _getTopDist(container: Rect, own: Rect): number {
      return own.getY() - container.getY();
    }

    _getBottomDist(container: Rect, own: Rect): number {
      return own.getY() + own.getHeight() - container.getY() - container.getHeight();
    }

    _getMiddleVCoefficient(container: Rect, own: Rect): number {
      const center = (own.getY() + own.getY() + own.getHeight()) / 2;
      return container.getHeight()
        ? (center - container.getY()) / container.getHeight()
        : MINIMAL_DIMENTION;
    }
  }
  AnchorMixin.prototype._noAnchoringPropsUpdate = false;
  AnchorMixin.prototype.oldHacr = null;
  AnchorMixin.prototype.oldVacr = null;
  return AnchorMixin;
};

function coDirected(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  return GMath.isCoDirected(
    a1.getX(),
    a1.getY(),
    a2.getX(),
    a2.getY(),
    b1.getX(),
    b1.getY(),
    b2.getX(),
    b2.getY(),
  );
}

/** The stretched edge length; the minimal dimension when it flipped over or vanished. */
function stretchedLength(edgeX: number, edgeY: number, newX: number, newY: number): number {
  if (!GMath.isCoDirected(0, 0, edgeX, edgeY, 0, 0, newX, newY)) return MINIMAL_DIMENTION;
  const length = Math.sqrt(newX * newX + newY * newY);
  return length > MINIMAL_DIMENTION ? length : MINIMAL_DIMENTION;
}

const AnchorMixin = defineMixin("GElement.Anchor", anchorBody);

export const Anchor = Object.assign(AnchorMixin, {
  Eps: ANCHOR_EPS,
  AnchorType,
  MetaProperties: AnchorMetaProperties,
});
