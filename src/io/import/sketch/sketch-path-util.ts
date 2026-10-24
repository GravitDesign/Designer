// Old: chunk.vendor.js module 1134 (model/sketchpathutil).
import { GMath } from "../../../engine/math/math.ts";
import { Point } from "../../../engine/math/point.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import type { Transform } from "../../../engine/math/transform.ts";
import { CompoundPath } from "../../../engine/scene/compound-path.ts";
import { NodeChange } from "../../../engine/scene/node-change.ts";
import { Path } from "../../../engine/scene/path.ts";
import { PathBase } from "../../../engine/scene/path-base.ts";
import { sceneNode, type SceneNodeLike } from "./scene-node.ts";
import { SketchCurvePoint } from "./sketch-curve-point.ts";
import type { SketchPathData } from "./sketch-data.ts";

/** Sketch's curveMode values (1-based, in this key order). */
const CurveMode = {
  Straight: 1,
  Mirror: 2,
  Symmetric: 3,
  Asymmetric: 4,
};

const CHILD_CHANGES = [
  NodeChange.BeforeChildRemove,
  NodeChange.AfterChildRemove,
  NodeChange.BeforeChildInsert,
  NodeChange.AfterChildInsert,
];

function blockEvents(node: SceneNodeLike): void {
  node._beginBlockCompositeEvents(true, true);
  node._beginBlockChanges(CHILD_CHANGES);
}

function releaseEvents(node: SceneNodeLike): void {
  node._endBlockCompositeEvents(true, true);
  node._endBlockChanges(CHILD_CHANGES);
}

export const SketchPathUtil = {
  /**
   * A path from Sketch points (0..1 of the frame, mapped by `transform`).
   * Straight points are rounded corners with the point's radius, or the
   * shape's fixed radius, capped at half the frame's shorter side. Returns
   * null for an empty or one-point path.
   */
  generatePath(
    pathData: SketchPathData,
    transform: Transform | null | undefined,
    closed: unknown,
    frame: Rect,
    fixedRadius: number | undefined,
  ): SceneNodeLike | null {
    let path: SceneNodeLike | undefined;
    let anchors: SceneNodeLike | undefined;
    let anchor: SceneNodeLike | undefined;
    const paths: SceneNodeLike[] = [];
    pathData.points.forEach((pointData) => {
      const point = new SketchCurvePoint(pointData);
      point.transform(transform);
      switch (point.curveMode) {
        case CurveMode.Straight:
          if (!path) {
            path = sceneNode(new Path());
            anchors = path.getAnchorPoints();
            path.setSketchPath(true);
            // Only a path that starts with a straight point is blocked here;
            // all are released below (QUESTIONS.md "Sketch path event
            // blocks are unbalanced").
            blockEvents(path);
            blockEvents(anchors);
          }
          anchor = sceneNode(new PathBase.AnchorPoint());
          anchor.setProperties(
            ["x", "y", "tp"],
            [point.point.getX(), point.point.getY(), PathBase.CornerType.Rounded],
          );
          (anchors as SceneNodeLike).appendChild(anchor);
          break;
        case CurveMode.Symmetric:
        case CurveMode.Asymmetric:
        case CurveMode.Mirror: {
          if (!path) {
            path = sceneNode(new Path());
            anchors = path.getAnchorPoints();
            path.setSketchPath(true);
          }
          const name = Object.keys(CurveMode)[(point.curveMode as number) - 1];
          const type = PathBase.AnchorPoint.Type[name as keyof typeof PathBase.AnchorPoint.Type];
          anchor = sceneNode(new PathBase.AnchorPoint());
          anchor.setProperties(
            ["tp", "x", "y", "hlx", "hly", "hrx", "hry", "cl", "cr"],
            [
              type,
              point.point.getX(),
              point.point.getY(),
              point.curveTo.getX(),
              point.curveTo.getY(),
              point.curveFrom.getX(),
              point.curveFrom.getY(),
              0,
              0,
            ],
          );
          (anchors as SceneNodeLike).appendChild(anchor);
          break;
        }
        default:
          console.warn("Unsupported curve mode: " + point.curveMode);
      }
      // cornerRadius is always an own property (see SketchCurvePoint), so a
      // point without one gets `undefined || fixedRadius`. After an
      // unsupported point this rounds the previous anchor.
      if (
        0 != point.cornerRadius ||
        (!Object.prototype.hasOwnProperty.call(point, "cornerRadius") &&
          fixedRadius &&
          point.curveMode === CurveMode.Straight)
      ) {
        let radius = point.cornerRadius || fixedRadius;
        const limit = SketchPathUtil.getPointsMinDistance(frame) / 2;
        if (limit < (radius as number)) radius = limit;
        (anchor as SceneNodeLike).setProperties(["cl", "cr"], [radius, radius]);
      }
    });
    if (path && closed) path.setProperty("closed", true);
    if (path && anchors && anchors.getFirstChild() != anchors.getLastChild()) {
      path.correctClosedAttribute();
      paths.push(path);
    }
    paths.forEach((p) => {
      releaseEvents(p);
      releaseEvents(p.getAnchorPoints());
    });
    if (1 === paths.length) return paths[0] as SceneNodeLike;
    if (paths.length > 1) {
      const compound = sceneNode(new CompoundPath());
      for (let i = 0; i < paths.length; ++i)
        compound.getPaths().appendChild(paths[i] as SceneNodeLike);
      return compound;
    }
    return null;
  },

  /** The shorter of the frame's width and height (as point distances). */
  getPointsMinDistance(frame: Rect): number {
    const origin = new Point(frame.getX(), frame.getY());
    const right = new Point(frame.getX() + frame.getWidth(), frame.getY());
    const bottom = new Point(frame.getX(), frame.getY() + frame.getHeight());
    return Math.min(
      GMath.ptDist(origin.getX(), origin.getY(), right.getX(), right.getY()),
      GMath.ptDist(origin.getX(), origin.getY(), bottom.getX(), bottom.getY()),
    );
  },
};
