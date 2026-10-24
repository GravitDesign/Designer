// Old: chunk.vendor.js module 740 (GGridGuide).
import { registerClass } from "../../engine/core/object.ts";
import { GMath } from "../../engine/math/math.ts";
import { Length } from "../../engine/math/length.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";
import type { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { EditorOptions } from "../editor-options.ts";
import {
  Guide,
  GuideDetailMap,
  GuideMap,
  GuideVisual,
  guidePaintContext,
  type GuideMapResult,
  type GuidesHost,
} from "./guide.ts";

/**
 * The document grid (`guide.grid`): painted when the scene has a grid
 * mode (`gm`) and the view shows the grid; snaps to grid points. Boxed
 * grids use `gx`/`gy`, axonometric ones `gaw`/`gah` and the angles
 * `ga1`/`ga2`.
 */
export class GridGuide extends GuideVisual(GuideMap(GuideDetailMap(Guide))) {
  static {
    registerClass(this, "GGridGuide");
  }

  static ID = "guide.grid";
  static MIN_CELL_SPACE = 10;

  constructor(guides: GuidesHost) {
    super(guides);
    this.disallowSnapZone(Rect.Side.CENTER);
  }

  override getId(): string {
    return GridGuide.ID;
  }

  /** A cell size in view pixels, multiplied up until it is at least MIN_CELL_SPACE. */
  _limitGridSize(size: number, scale: number): number {
    let pixels = size * scale;
    if (Math.round(pixels) < GridGuide.MIN_CELL_SPACE) {
      pixels *= 1 + Math.floor(GridGuide.MIN_CELL_SPACE / pixels);
    }
    return pixels;
  }

  override paint(transform: Transform, paintContext: PaintContext): void {
    const context = guidePaintContext(paintContext);
    const mode = this._scene.getProperty("gm");
    if (!(mode && context.configuration.gridVisible)) return;
    const canvas = context.canvas;
    const scale = transform.getScaleFactor();
    let cellX = this._scene.getProperty("gx") as number;
    let cellY = this._scene.getProperty("gy") as number;
    let axoWidth = this._scene.getProperty("gaw") as number;
    let axoHeight = this._scene.getProperty("gah") as number;
    const stepX = this._limitGridSize(cellX, scale);
    const stepY = this._limitGridSize(cellY, scale);
    const axoStepX = this._limitGridSize(axoWidth, scale);
    const axoStepY = this._limitGridSize(axoHeight, scale);
    cellX = stepX / scale;
    cellY = stepY / scale;
    axoWidth = axoStepX / scale;
    axoHeight = axoStepY / scale;
    let dirty = context.dirtyMatcher.getDirtyRectangles() as Rect[];
    if (mode === Scene.GridMode.Axonometric && dirty.length > 1) {
      let all = dirty[0] as Rect;
      for (let i = 1; i < dirty.length; ++i) all = all.united(dirty[i] as Rect);
      dirty = [all];
    }
    const saved: PaintCanvas[] = [];
    const axonometric = mode === Scene.GridMode.Axonometric;
    const originStepX = axonometric ? axoWidth : cellX;
    const originStepY = axonometric ? axoHeight : cellY;
    // Copies of what is painted in the dirty areas, put back before each
    // area's grid is drawn (all areas for axonometric grids, all but the
    // first for boxed ones).
    for (let i = axonometric ? 0 : 1; i < dirty.length; ++i) {
      const area = dirty[i] as Rect;
      const viewArea = transform.mapRect(area);
      let copyArea = viewArea;
      if (mode === Scene.GridMode.Boxed) {
        const origin = transform.mapPoint(
          new Point(
            Math.round(area.getX() / cellX) * cellX,
            Math.round(area.getY() / cellY) * cellY,
          ),
        );
        copyArea = new Rect(
          Math.round(origin.getX()),
          Math.round(origin.getY()),
          viewArea.getWidth() + viewArea.getX() - Math.round(origin.getX()),
          viewArea.getHeight() + viewArea.getY() - Math.round(origin.getY()),
        );
      } else if (mode === Scene.GridMode.Axonometric) {
        copyArea = new Rect(
          Math.round(viewArea.getX()),
          Math.round(viewArea.getY()),
          Math.round(viewArea.getWidth() + viewArea.getX() - Math.round(viewArea.getX())),
          Math.round(viewArea.getHeight() + viewArea.getY() - Math.round(viewArea.getY())),
        );
      }
      const copy = canvas.createCanvas(copyArea);
      copy.drawCanvas(canvas, 0, 0);
      saved.push(copy);
    }
    const color = EditorOptions.gridColor;
    const opacity = EditorOptions.gridOpacity;
    const stroke = (from: Point, to: Point): void => {
      canvas.putVertices([from, to], true);
      canvas.strokeVertices(color, 1, null, null, null, null, opacity);
    };
    for (let i = 0; i < dirty.length; ++i) {
      const area = dirty[i] as Rect;
      const viewArea = transform.mapRect(area);
      let origin = transform.mapPoint(
        new Point(
          Math.round(area.getX() / originStepX) * originStepX,
          Math.round(area.getY() / originStepY) * originStepY,
        ),
      );
      if (mode === Scene.GridMode.Boxed && i > 0) {
        canvas.clearRect(
          Math.round(origin.getX()),
          Math.round(origin.getY()),
          viewArea.getWidth() + viewArea.getX() - Math.round(origin.getX()),
          viewArea.getHeight() + viewArea.getY() - Math.round(origin.getY()),
        );
      } else if (mode === Scene.GridMode.Axonometric) {
        canvas.clearRect(
          Math.round(viewArea.getX()),
          Math.round(viewArea.getY()),
          Math.round(viewArea.getWidth() + viewArea.getX() - Math.round(viewArea.getX())),
          Math.round(viewArea.getHeight() + viewArea.getY() - Math.round(viewArea.getY())),
        );
      }
      if (i > 0 || mode === Scene.GridMode.Axonometric) {
        const index = mode === Scene.GridMode.Axonometric ? i : i - 1;
        canvas.drawCanvas(saved[index] as PaintCanvas, 0, 0);
      }
      if (mode === Scene.GridMode.Boxed) {
        for (let x = origin.getX(); x - viewArea.getX() < viewArea.getWidth(); x += stepX) {
          canvas.fillRect(Math.round(x), viewArea.getY(), 1, viewArea.getHeight(), color, opacity);
        }
        for (let y = origin.getY(); y - viewArea.getY() < viewArea.getHeight(); y += stepY) {
          canvas.fillRect(viewArea.getX(), Math.round(y), viewArea.getWidth(), 1, color, opacity);
        }
      } else if (mode === Scene.GridMode.Axonometric) {
        for (let x = origin.getX(); x - viewArea.getX() < viewArea.getWidth(); x += axoStepX) {
          canvas.fillRect(Math.round(x), viewArea.getY(), 1, viewArea.getHeight(), color, opacity);
        }
        const slope1 = Math.tan(-(this._scene.getProperty("ga1") as number));
        const slope2 = Math.tan(-(this._scene.getProperty("ga2") as number));
        if (GMath.isEqualEps(slope1, 0) || GMath.isEqualEps(slope2, 0)) {
          for (let y = origin.getY(); y - viewArea.getY() < viewArea.getHeight(); y += axoStepY) {
            canvas.fillRect(viewArea.getX(), Math.round(y), viewArea.getWidth(), 1, color, opacity);
          }
        }
        origin = transform.mapPoint(new Point(0, 0));
        if (!GMath.isEqualEps(slope1, 0)) {
          this._paintSlantedLines(viewArea, origin, slope1, axoStepY, true, stroke);
        }
        if (!GMath.isEqualEps(slope2, 0)) {
          this._paintSlantedLines(viewArea, origin, slope2, axoStepY, false, stroke);
        }
      }
    }
  }

  /**
   * The slanted lines of an axonometric grid through `viewArea`: lines
   * with `slope` through the grid origin, `step` apart vertically.
   * `downward` walks from the top (first angle), else from the bottom.
   */
  private _paintSlantedLines(
    viewArea: Rect,
    origin: Point,
    slope: number,
    step: number,
    downward: boolean,
    stroke: (from: Point, to: Point) => void,
  ): void {
    const first = GMath.getLinesIntersection(
      slope,
      -1,
      origin.getY() - slope * origin.getX(),
      1,
      0,
      -viewArea.getX(),
    );
    if (!first) return;
    let y = first.getY();
    if (downward) {
      if (y > viewArea.getY()) y -= step * Math.floor((y - viewArea.getY()) / step);
    } else if (y < viewArea.getY() + viewArea.getHeight()) {
      y += step * Math.floor((viewArea.getY() + viewArea.getHeight() - y) / step);
    }
    const start = new Point(first.getX(), y);
    const last = GMath.getLinesIntersection(
      slope,
      -1,
      downward
        ? viewArea.getY() + viewArea.getHeight() - slope * (viewArea.getX() + viewArea.getWidth())
        : viewArea.getY() - slope * (viewArea.getX() + viewArea.getWidth()),
      1,
      0,
      -viewArea.getX(),
    );
    if (!last) return;
    for (
      y = start.getY();
      downward ? y < last.getY() : y > last.getY();
      downward ? (y += step) : (y -= step)
    ) {
      let from: Point | null = new Point(viewArea.getX(), y);
      let to = GMath.getLinesIntersection(
        slope,
        -1,
        from.getY() - slope * from.getX(),
        0,
        1,
        downward ? -viewArea.getY() : -viewArea.getY() - viewArea.getHeight(),
      );
      if (to && to.getX() > viewArea.getX() + viewArea.getWidth()) {
        to = GMath.getLinesIntersection(
          slope,
          -1,
          from.getY() - slope * from.getX(),
          1,
          0,
          -viewArea.getX() - viewArea.getWidth(),
        );
      }
      if (
        downward
          ? from.getY() > viewArea.getY() + viewArea.getHeight()
          : from.getY() < viewArea.getY()
      ) {
        from = GMath.getLinesIntersection(
          slope,
          -1,
          from.getY() - slope * from.getX(),
          0,
          1,
          downward ? -viewArea.getY() - viewArea.getHeight() : -viewArea.getY(),
        );
      }
      if (from && to) stroke(from, to);
    }
  }

  override map(x: number, y: number): GuideMapResult | null {
    let result: GuideMapResult | null = null;
    const mode = this._scene.getProperty("gm");
    if (!mode) return result;
    const axonometric = mode === Scene.GridMode.Axonometric;
    const cellX = this._scene.getProperty(axonometric ? "gaw" : "gx") as number;
    const cellY = this._scene.getProperty(axonometric ? "gah" : "gy") as number;
    if (cellX >= 1 && cellY >= 1) {
      const snappedX = Math.round(x / cellX) * cellX;
      // Another mode leaves y undefined, so its delta is NaN.
      let snappedY = undefined as unknown as number;
      if (mode === Scene.GridMode.Boxed) snappedY = Math.round(y / cellY) * cellY;
      else if (mode === Scene.GridMode.Axonometric) {
        const angle = this._scene.getProperty("ga2") as number;
        let shift = snappedX * Math.tan(-angle);
        shift -= Math.round(shift / cellY) * cellY;
        snappedY = Math.round((y - shift) / cellY) * cellY + shift;
      }
      result = {
        x: { value: snappedX, guide: null, delta: Math.abs(x - snappedX) },
        y: { value: snappedY, guide: null, delta: Math.abs(y - snappedY) },
      };
    }
    return result;
  }

  /** Full pixels combine with the grid only for cells over 1 px (or any cell in other units). */
  override canMapWithFullPixelsGuide(): boolean {
    const axonometric = this._scene.getProperty("gm") === Scene.GridMode.Axonometric;
    const cellX = this._scene.getProperty(axonometric ? "gaw" : "gx") as number;
    const cellY = this._scene.getProperty(axonometric ? "gah" : "gy") as number;
    return (
      (cellX > 1 && cellY > 1) ||
      (this._scene.getProperty("ut") !== Length.Unit.PX && cellX >= 1 && cellY >= 1)
    );
  }

  override toString(): string {
    return "[Object GGridGuide]";
  }
}
