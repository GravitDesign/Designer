// Old: chunk.vendor.js module 179 (GPathUtil).
/**
 * Turning vertex sources into editable paths, and making paths
 * clockwise.
 */
import { NodeChange } from "../scene/node-change.ts";
import type { Node } from "../scene/node.ts";
import { CompoundPath } from "../scene/compound-path.ts";
import { AnchorPoint, PathBase, type AnchorPoints } from "../scene/path-base.ts";
import { Path } from "../scene/path.ts";
import { VertexContainer } from "./vertex-container.ts";
import { VertexSourceMixin, type VertexReader } from "./vertex-source.ts";
import { Vertex } from "./vertex.ts";

const CHILD_CHANGES = [
  NodeChange.BeforeChildRemove,
  NodeChange.AfterChildRemove,
  NodeChange.BeforeChildInsert,
  NodeChange.AfterChildInsert,
];

/** Silences a node while it is built (no structure or property events, no child changes). */
function block(node: Node): void {
  node._beginBlockCompositeEvents(true, true);
  node._beginBlockChanges(CHILD_CHANGES);
}

function unblock(node: Node): void {
  node._endBlockCompositeEvents(true, true);
  node._endBlockChanges(CHILD_CHANGES);
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the old GPathUtil was a non-instantiable class of statics
export class PathUtil {
  constructor() {
    throw new Error("This class cannot be instantiated");
  }

  /**
   * Makes a path (or each path of a compound path) clockwise in place,
   * or returns a clockwise copy of another vertex source. Throws for
   * objects without hasMixin, as the old code did.
   */
  static makeClockWise(source: Node | VertexReader): Node | VertexReader | null {
    let result: Node | VertexReader | null = null;
    if (source instanceof PathBase) {
      if (!source.isClockWise()) source.reverseOrder();
      result = source;
    } else if (source instanceof CompoundPath) {
      for (let path = source.getPaths().getFirstChild(); path;) {
        PathUtil.makeClockWise(path);
        path = path.getNext() as Path | null;
      }
      result = source;
    } else if ((source as Node).hasMixin(VertexSourceMixin)) {
      result = VertexContainer.makeClockWise(source as VertexReader);
    }
    return result;
  }

  /**
   * One path per sub-path of `source` (closed ones closed; ends that meet
   * merged, unless `keepOpenEnds`), as a list with `asList`, else the
   * single path, a compound path of them, or null. `silent` builds them
   * without events. A sub-path of one point is dropped; a source that
   * doesn't start with a move gives no paths.
   */
  static createPathFromVertexSource(
    source: VertexReader,
    asList?: boolean,
    silent?: boolean,
    keepOpenEnds?: boolean,
  ): Path | CompoundPath | Path[] | null {
    const vertex = new Vertex();
    const paths: Path[] = [];
    let path: Path | null = null;
    let points: AnchorPoints | null = null;
    let point: AnchorPoint | null = null;
    let done = false;
    const C = Vertex.Command;
    const startPath = () => {
      if (path && points && points.getFirstChild() != points.getLastChild()) {
        path.correctClosedAttribute();
        paths.push(path);
        if (silent) {
          unblock(path);
          unblock(points);
        }
      }
      points = (path = new Path()).getAnchorPoints();
      if (silent) {
        block(path);
        block(points);
      }
      (point = new AnchorPoint()).$x = vertex.x;
      point.$y = vertex.y;
      points.appendChild(point);
    };
    for (
      source.rewindVertices(0),
        source.readVertex(vertex),
        vertex.command === C.Move ? startPath() : (done = true);
      !done && source.readVertex(vertex);
    ) {
      const currentPath = path as unknown as Path;
      const currentPoints = points as unknown as AnchorPoints;
      switch (vertex.command) {
        case C.Line:
          (point = new AnchorPoint()).$x = vertex.x;
          point.$y = vertex.y;
          currentPoints.appendChild(point);
          break;
        case C.Curve: {
          point = new AnchorPoint();
          const control = new Vertex();
          if (source.readVertex(control)) {
            point.$x = vertex.x;
            point.$y = vertex.y;
            point.$hlx = control.x;
            point.$hly = control.y;
            currentPoints.appendChild(point);
          } else {
            point.$x = vertex.x;
            point.$y = vertex.y;
            currentPoints.appendChild(point);
            done = true;
            currentPath.setProperty("closed", true);
          }
          break;
        }
        case C.Curve2: {
          const control = new Vertex();
          if (source.readVertex(control)) {
            if (point) {
              point.$hrx = control.x;
              point.$hry = control.y;
            }
            if (source.readVertex(control)) {
              (point = new AnchorPoint()).$x = vertex.x;
              point.$y = vertex.y;
              point.$hlx = control.x;
              point.$hly = control.y;
              currentPoints.appendChild(point);
            } else {
              (point = new AnchorPoint()).$x = vertex.x;
              point.$y = vertex.y;
              currentPoints.appendChild(point);
              done = true;
              currentPath.setProperty("closed", true);
            }
          } else {
            (point = new AnchorPoint()).$x = vertex.x;
            point.$y = vertex.y;
            currentPoints.appendChild(point);
            done = true;
            currentPath.setProperty("closed", true);
          }
          break;
        }
        case C.Move:
          startPath();
          break;
        case C.Close:
          currentPath.setProperty("closed", true);
      }
    }
    const lastPath = path as Path | null;
    const lastPoints = points as AnchorPoints | null;
    if (lastPath && lastPoints && lastPoints.getFirstChild() != lastPoints.getLastChild()) {
      if (!keepOpenEnds) lastPath.correctClosedAttribute();
      paths.push(lastPath);
    }
    if (silent) {
      paths.forEach((built) => {
        unblock(built);
        unblock(built.getAnchorPoints());
      });
    }
    if (asList) return paths;
    if (1 === paths.length) return paths[0] as Path;
    if (paths.length > 1) {
      const compound = new CompoundPath();
      for (let i = 0; i < paths.length; ++i) compound.getPaths().appendChild(paths[i] as Path);
      return compound;
    }
    return null;
  }
}
