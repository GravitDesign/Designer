// Old: chunk.vendor.js module 214 (GEllipse).
/**
 * The ellipse, node "ellipse": the unit circle mapped by `trf`, cut from
 * start angle `sa` to end angle `ea` as a pie (closed through the
 * center), a chord (closed directly) or an open arc (`etp`). Equal angles
 * give the full circle. The anchor points are generated from the angles
 * (one per quarter, with the partial quarters cut out of the quarter
 * bezier) and not saved.
 */
import { Locale } from "../core/locale/locale.ts";
import { GMath } from "../math/math.ts";
import { Rect } from "../math/rect.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { NodeChange } from "./node-change.ts";
import { registerNodeClass, type Node } from "./node.ts";
import { AnchorPoint, PathBase, type AnchorPoints } from "./path-base.ts";

const Type = {
  Pie: 0,
  Chord: 1,
  Arc: 2,
} as const;

const GeometryProperties = {
  sa: Math.PI,
  ea: Math.PI,
  etp: Type.Pie,
};

const VisualProperties = {};

const Symmetric = AnchorPoint.Type.Symmetric;
const Asymmetric = AnchorPoint.Type.Asymmetric;

/**
 * A closed three-point path with auto handles at the angles `start`,
 * `start` + PI/2 and `start` + PI on the unit circle: its first segment
 * is the quarter bezier the partial quarters are cut from.
 */
function quarterPath(start: number, end: number): AnchorPoints {
  const path = new PathBase();
  const points = path.getAnchorPoints();
  let point = new AnchorPoint();
  point.setProperties(["x", "y", "tp", "ah"], [Math.cos(start), Math.sin(start), Symmetric, true]);
  points.appendChild(point);
  point = new AnchorPoint();
  point.setProperties(["x", "y", "tp", "ah"], [Math.cos(end), Math.sin(end), Symmetric, true]);
  points.appendChild(point);
  point = new AnchorPoint();
  point.setProperties(
    ["x", "y", "tp", "ah"],
    [Math.cos(end + GMath.PIHALF), Math.sin(end + GMath.PIHALF), Symmetric, true],
  );
  points.appendChild(point);
  path.setProperty("closed", true);
  return points;
}

function prop(point: AnchorPoint | null, name: string): number {
  return (point as AnchorPoint).getProperty(name) as number;
}

export class Ellipse extends PathBase {
  static {
    registerNodeClass(this, "ellipse", "GEllipse");
  }

  static Type = Type;
  static override GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static override VisualProperties: Readonly<Record<string, unknown>> = VisualProperties;

  declare $sa: number;
  declare $ea: number;
  declare $etp: number;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
    this._invalidatePath();
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      this.storeProperties((args as StoreChangeArgs).blob, GeometryProperties);
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, GeometryProperties);
      this._invalidatePath();
    }
    if (
      this._canHandleGeometryChangeForProperties(change, args, GeometryProperties) &&
      change == NodeChange.AfterPropertiesChange &&
      !this.isRecordedTransaction()
    ) {
      this._invalidatePath();
    }
    this._handleGeometryChangeForProperties(change, args, GeometryProperties);
    super._handleChange(change, args);
  }

  override assignFrom(other: Node): void {
    if (other instanceof Ellipse) this.transferProperties(other, [GeometryProperties]);
    super.assignFrom(other);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GEllipse", "name", this.getNodeName()) as string;
  }

  /** The full unit square for equal angles, else the box of the anchor points. */
  override _calculateSourceBBox(includeInvisible?: unknown): Rect | null {
    return GMath.isEqualEps(this.$sa, this.$ea)
      ? new Rect(-1, -1, 2, 2)
      : super._calculateSourceBBox(includeInvisible);
  }

  /** Rebuilds the anchor points from the angles and the type. */
  _invalidatePath(): void {
    const points = this.getAnchorPoints();
    this.beginUpdate();
    points._beginBlockCompositeEvents(true, true, true);
    try {
      points.clearChildren();
      // The first quarter angle after the start.
      let angle: number;
      for (
        angle = Math.PI / 2;
        angle <= this.$sa || GMath.isEqualEps(angle, this.$sa);
        angle += Math.PI / 2
      );
      let end = GMath.isEqualEps(this.$sa, this.$ea) ? this.$sa + GMath.PI2 : this.$ea;
      if (end < this.$sa) end += GMath.PI2;
      const full = GMath.isEqualEps(this.$sa + GMath.PI2, end);
      let point = new AnchorPoint();
      let startCut = false;
      let endCut = false;
      let closedInQuarter = false;
      let quarterStart = Math.floor(this.$sa / GMath.PIHALF) * GMath.PIHALF;
      let quarterEnd = (Math.floor(this.$sa / GMath.PIHALF) + 1) * GMath.PIHALF;
      // Set when the start is cut out of a quarter.
      let startX: Float64Array | null = null;
      let startY: Float64Array | null = null;
      // Set when the end is cut out of a quarter.
      let endX: Float64Array | null = null;
      let endY: Float64Array | null = null;
      if (
        (GMath.isEqualEps(quarterStart, this.$sa) && end > quarterEnd) ||
        (GMath.isEqualEps(quarterEnd, this.$sa) && end > quarterEnd + GMath.PIHALF)
      ) {
        point.setProperties(
          ["x", "y", "tp", "ah"],
          [Math.cos(this.$sa), Math.sin(this.$sa), Symmetric, true],
        );
        points.appendChild(point);
      } else {
        const quarter = quarterPath(quarterStart, quarterEnd);
        const t0 = (this.$sa - quarterStart) / GMath.PIHALF;
        let t1 = 1;
        startX = new Float64Array(4);
        startY = new Float64Array(4);
        if (end <= quarterEnd) t1 = (end - quarterStart) / GMath.PIHALF;
        const first = quarter.getFirstChild();
        const second = (first as AnchorPoint).getNext() as AnchorPoint;
        GMath.getCtrlPts(
          prop(first, "x"),
          prop(second, "x"),
          prop(first, "hrx"),
          prop(second, "hlx"),
          t0,
          t1,
          startX,
        );
        GMath.getCtrlPts(
          prop(first, "y"),
          prop(second, "y"),
          prop(first, "hry"),
          prop(second, "hly"),
          t0,
          t1,
          startY,
        );
        point.setProperties(
          ["x", "y", "hrx", "hry", "tp", "ah"],
          [startX[0], startY[0], startX[1], startY[1], Asymmetric, false],
        );
        startCut = true;
        points.appendChild(point);
        if (end <= quarterEnd) {
          point = new AnchorPoint();
          point.setProperties(
            ["hlx", "hly", "x", "y", "tp", "ah"],
            [startX[2], startY[2], startX[3], startY[3], Asymmetric, false],
          );
          points.appendChild(point);
          closedInQuarter = true;
        }
      }
      if (closedInQuarter) this.setProperty("closed", true);
      else {
        for (; angle < end && !GMath.isEqualEps(angle, end); angle += Math.PI / 2) {
          point = new AnchorPoint();
          point.setProperties(
            ["x", "y", "tp", "ah"],
            [Math.cos(angle), Math.sin(angle), Symmetric, true],
          );
          points.appendChild(point);
        }
        if (!full && GMath.isEqualEps(angle, end)) {
          point = new AnchorPoint();
          point.setProperties(
            ["x", "y", "tp", "ah"],
            [Math.cos(end), Math.sin(end), Symmetric, true],
          );
          points.appendChild(point);
        } else {
          quarterStart = Math.floor(end / GMath.PIHALF) * GMath.PIHALF;
          quarterEnd = (Math.floor(end / GMath.PIHALF) + 1) * GMath.PIHALF;
          const quarter = quarterPath(quarterStart, quarterEnd);
          const t = (end - quarterStart) / GMath.PIHALF;
          endX = new Float64Array(4);
          endY = new Float64Array(4);
          const first = quarter.getFirstChild();
          const second = (first as AnchorPoint).getNext() as AnchorPoint;
          GMath.getCtrlPtsCasteljau(
            prop(first, "x"),
            prop(first, "hrx"),
            prop(second, "hlx"),
            prop(second, "x"),
            t,
            1,
            endX,
          );
          GMath.getCtrlPtsCasteljau(
            prop(first, "y"),
            prop(first, "hry"),
            prop(second, "hly"),
            prop(second, "y"),
            t,
            1,
            endY,
          );
          if (!full) {
            point = new AnchorPoint();
            point.setProperties(
              ["hlx", "hly", "x", "y", "tp", "ah"],
              [endX[2], endY[2], endX[3], endY[3], Asymmetric, false],
            );
            endCut = true;
            points.appendChild(point);
          }
        }
        // With only two points, a third one gives the auto handles a
        // shape; it is removed again once they are fixed.
        let helper: AnchorPoint | null = null;
        if ((points.getFirstChild() as AnchorPoint).getNext() == points.getLastChild()) {
          point = new AnchorPoint();
          if (GMath.isEqualEps(angle, end)) angle += Math.PI / 2;
          point.setProperties(
            ["x", "y", "tp", "ah"],
            [Math.cos(angle), Math.sin(angle), Symmetric, true],
          );
          points.appendChild(point);
          helper = point;
        }
        this.setProperty("closed", true);
        for (
          let each = points.getFirstChild();
          null != each;
          each = each.getNext() as AnchorPoint | null
        ) {
          each.setProperty("ah", false);
        }
        if (helper) points.removeChild(helper);
        if (startCut) {
          ((points.getFirstChild() as AnchorPoint).getNext() as AnchorPoint).setProperties(
            ["hlx", "hly"],
            [(startX as Float64Array)[2], (startY as Float64Array)[2]],
          );
          if (full) {
            (points.getFirstChild() as AnchorPoint).setProperties(
              ["hlx", "hly", "tp"],
              [(endX as Float64Array)[2], (endY as Float64Array)[2], Symmetric],
            );
            (points.getLastChild() as AnchorPoint).setProperties(
              ["hrx", "hry"],
              [(endX as Float64Array)[1], (endY as Float64Array)[1]],
            );
          }
        }
        if (endCut) {
          ((points.getLastChild() as AnchorPoint).getPrevious() as AnchorPoint).setProperties(
            ["hrx", "hry"],
            [(endX as Float64Array)[1], (endY as Float64Array)[1]],
          );
        }
      }
      if (!full) {
        (points.getFirstChild() as AnchorPoint).setProperties(
          ["tp", "hlx", "hly"],
          [Asymmetric, null, null],
        );
        (points.getLastChild() as AnchorPoint).setProperties(
          ["tp", "hrx", "hry"],
          [Asymmetric, null, null],
        );
        if (this.$etp == Type.Pie) {
          point = new AnchorPoint();
          points.appendChild(point);
        } else if (this.$etp == Type.Arc) this.setProperty("closed", false);
      }
    } finally {
      this.endUpdate();
      points._endBlockCompositeEvents(true, true, true);
    }
  }

  override toString(): string {
    return "[GEllipse]";
  }
}
