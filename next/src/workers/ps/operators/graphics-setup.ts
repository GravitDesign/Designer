// Old: public/pscore.js, systemdict newpath … initgraphics.
import type { PSCore } from "../core.ts";
import type { PSProcedure, PSValue } from "../objects.ts";
import { currentPath, type PathPoint } from "./graphics-support.ts";

export const setupOperators = {
  newpath(this: PSCore) {
    this.gstate.path = [];
    this.gstate.position = { x: null, y: null };
  },

  setbbox(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(4)) return;
    const llx = this.stack[this.stack.length - 4];
    const lly = this.stack[this.stack.length - 3];
    const urx = this.stack[this.stack.length - 2];
    const ury = this.stack[this.stack.length - 1];
    if (
      typeof llx != "number" ||
      typeof lly != "number" ||
      typeof urx != "number" ||
      typeof ury != "number" ||
      llx > urx ||
      lly > ury
    ) {
      this.initiateError("typecheck");
      return;
    }
    const lowerLeft = this.CTM.transform(llx, lly);
    const upperRight = this.CTM.transform(urx, ury);
    const lowerRight = this.CTM.transform(urx, lly);
    const upperLeft = this.CTM.transform(llx, ury);
    const path = currentPath(this);
    if (path.bbox) {
      path.bbox = {
        xMin: Math.min(path.bbox.xMin, lowerLeft.x, upperRight.x, lowerRight.x, upperLeft.x),
        xMax: Math.max(path.bbox.xMax, lowerLeft.x, upperRight.x, lowerRight.x, upperLeft.x),
        yMin: Math.min(path.bbox.yMin, lowerLeft.y, upperRight.y, lowerRight.y, upperLeft.y),
        yMax: Math.max(path.bbox.yMax, lowerLeft.y, upperRight.y, lowerRight.y, upperLeft.y),
      };
    } else {
      path.bbox = {
        xMin: Math.min(lowerLeft.x, upperRight.x, lowerRight.x, upperLeft.x),
        xMax: Math.max(lowerLeft.x, upperRight.x, lowerRight.x, upperLeft.x),
        yMin: Math.min(lowerLeft.y, upperRight.y, lowerRight.y, upperLeft.y),
        yMax: Math.max(lowerLeft.y, upperRight.y, lowerRight.y, upperLeft.y),
      };
    }
    this.stack.pop();
    this.stack.pop();
    this.stack.pop();
    this.stack.pop();
  },

  /**
   * Closes the last subpath back to its first point. Sic: a subpath that
   * starts with an arc has no `coord`, so "x y r a1 a2 arc closepath"
   * throws (the EPS then never finishes, see FMT-IMPORT-012).
   */
  closepath(this: PSCore) {
    this.fill$error();
    const gstate = this.gstate;
    if (gstate.path.length > 0) {
      const subpath = gstate.path[gstate.path.length - 1] as PSPathSegmentList;
      const last = subpath.length - 1;
      const first = subpath[0];
      if (subpath[last] !== undefined && subpath[last].type != "closepath") {
        const start = (first as Segment).coord as PathPoint;
        subpath[last + 1] = { type: "closepath", coord: { x: start.x, y: start.y } };
      }
      if (first) {
        const start = first.coord as PathPoint;
        gstate.position = { x: start.x, y: start.y };
      }
    }
  },

  grestoreall() {},

  initgraphics(this: PSCore) {
    (this.systemdict.initmatrix as PSProcedure).call(this);
    (this.systemdict.newpath as PSProcedure).call(this);
    (this.systemdict.initclip as PSProcedure).call(this);
    this.stack.push(0);
    (this.systemdict.setgray as PSProcedure).call(this);
    this.gstate.lineWidth = 1;
    this.gstate.lineCap = 0;
    this.gstate.lineJoin = 0;
    this.gstate.miterLimit = 10;
    this.gstate.dashPattern = { arr: [], param: 0 };
  },
} satisfies Record<string, PSValue>;

interface Segment {
  type: string;
  coord?: unknown;
  [key: string]: unknown;
}

type PSPathSegmentList = Segment[];
