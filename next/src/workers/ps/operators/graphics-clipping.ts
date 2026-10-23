// Old: public/pscore.js, systemdict makepattern … pathbbox.
import type { PSCore } from "../core.ts";
import { Access, type GraphicsState, type PSClipPath, type PSValue } from "../objects.ts";
import { currentPath, type PathBBox, type PathPoint } from "./graphics-support.ts";

/** The fields of a path segment pathbbox reads. */
interface BBoxSegment {
  type: string;
  coord: PathPoint;
  coord1: PathPoint;
  coord2: PathPoint;
  coord3: PathPoint;
  center: PathPoint;
  radius: PathPoint;
  bbox?: PathBBox;
}

export const clippingOperators = {
  makepattern(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "makepattern")) return;
    const matrix = this.stack[this.stack.length - 1];
    const pattern = this.stack[this.stack.length - 2];
    if (this.classes.isPSObject(matrix, "array") && this.classes.isPSObject(pattern, "dict")) {
      pattern.value.gstate = this.classes.newObject("graphicsState", this.gstate);
      const patternState = pattern.value.gstate as GraphicsState;
      patternState.CTM = this.CTM.multiply(matrix.value as number[], patternState.CTM);
      patternState.path = [];
      pattern.access = Access.ReadOnly;
      pattern.global = false;
      // Sic: only the matrix is popped; the pattern dict stays on the stack.
      this.stack.pop();
    } else this.initiateError("typecheck", "makepattern");
  },

  setpattern(this: PSCore) {
    if (this.stackunderflowCheck(1)) return;
    this.gstate.colorSpace = [this.classes.newObject("name", "Pattern")];
    this.gstate.color = this.stack[this.stack.length - 1];
    this.stack.pop();
  },

  initclip(this: PSCore) {
    this.gstate.clippingPath = [];
  },

  clippath(this: PSCore) {
    this.gstate.clippingPath = [this.pathCopy(this.gstate.path)];
    (this.gstate.clippingPath[0] as PSClipPath).clipPathId = this.clipPathId;
    this.clipPathId++;
  },

  clip(this: PSCore) {
    const clip: PSClipPath = this.pathCopy(this.gstate.path);
    clip.clipPathId = this.clipPathId;
    this.clipPathId++;
    this.gstate.clippingPath.push(clip);
  },

  /** Sic: the same as clip; the even-odd rule is not recorded. */
  eoclip(this: PSCore) {
    const clip: PSClipPath = this.pathCopy(this.gstate.path);
    clip.clipPathId = this.clipPathId;
    this.clipPathId++;
    this.gstate.clippingPath.push(clip);
  },

  /** Sic: pushes a PS array object, which cliprestore then makes the clipping path. */
  clipsave(this: PSCore) {
    this.gstate.clippingPathStack.push(
      this.classes.newObject(
        "array",
        this.gstate.clippingPath as unknown as PSValue[],
      ) as unknown as PSClipPath[],
    );
  },

  cliprestore(this: PSCore) {
    const saved = this.gstate.clippingPathStack;
    if (saved.length > 0) {
      this.gstate.clippingPath = saved[saved.length - 1] as PSClipPath[];
      saved.pop();
    } else if (this.gstack.length > 0) {
      const outer = this.gstack[this.gstack.length - 1] as GraphicsState;
      if (outer.clippingPath.length > 0)
        this.gstate.clippingPath = this.classes.newObject(
          "array",
          outer.clippingPath as unknown as PSValue[],
        ) as unknown as PSClipPath[];
    }
  },

  pathbbox(this: PSCore) {
    this.fill$error();
    const path = currentPath(this);
    const ctm = this.gstate.CTM;
    let xMin: number | null = null;
    let xMax: number | null = null;
    let yMin: number | null = null;
    let yMax: number | null = null;
    if (path.bbox) {
      const box = path.bbox;
      xMin = box.xMin;
      xMax = box.xMax;
      yMin = box.yMin;
      yMax = box.yMax;
    } else {
      const include = (x: number, y: number) => {
        if (xMin == null || xMin > x) xMin = x;
        if (xMax == null || xMax < x) xMax = x;
        if (yMin == null || yMin > y) yMin = y;
        if (yMax == null || yMax < y) yMax = y;
      };
      for (let i = 0; i < path.length; ++i) {
        const subpath = path[i] as unknown as BBoxSegment[];
        for (let n = 0; n < subpath.length; ++n) {
          const segment = subpath[n] as BBoxSegment;
          if (segment.type == "curveto") {
            include(segment.coord3.x, segment.coord3.y);
            include(segment.coord1.x, segment.coord1.y);
            include(segment.coord2.x, segment.coord2.y);
          } else if (segment.type == "lineto") {
            include(segment.coord.x, segment.coord.y);
          } else if (segment.type == "moveto") {
            // A trailing moveto doesn't count.
            if (!(i == path.length - 1 && n == subpath.length - 1))
              include(segment.coord.x, segment.coord.y);
          } else if (segment.type == "arc" || segment.type == "arcn") {
            if (segment.bbox) {
              include(segment.bbox.xMin, segment.bbox.yMin);
              include(segment.bbox.xMax, segment.bbox.yMax);
            } else {
              include(segment.center.x - segment.radius.x, segment.center.y - segment.radius.y);
              include(segment.center.x + segment.radius.x, segment.center.y + segment.radius.y);
            }
          }
        }
      }
    }
    const left: number = xMin == null ? 0 : xMin;
    const right: number = xMax == null ? 1 : xMax;
    const bottom: number = yMin == null ? 0 : yMin;
    const top: number = yMax == null ? 1 : yMax;
    const a = this.CTM.inverseTransform(left, bottom, ctm);
    const b = this.CTM.inverseTransform(left, top, ctm);
    const c = this.CTM.inverseTransform(right, bottom, ctm);
    const d = this.CTM.inverseTransform(right, top, ctm);
    this.stack.push(Math.min(a.x, b.x, c.x, d.x));
    this.stack.push(Math.min(a.y, b.y, c.y, d.y));
    this.stack.push(Math.max(a.x, b.x, c.x, d.x));
    this.stack.push(Math.max(a.y, b.y, c.y, d.y));
  },
} satisfies Record<string, PSValue>;
