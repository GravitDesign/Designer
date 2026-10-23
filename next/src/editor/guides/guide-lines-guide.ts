// Old: chunk.vendor.js module 739 (GGuideLinesGuide).
import { registerClass } from "../../engine/core/object.ts";
import { Point } from "../../engine/math/point.ts";
import type { Transform } from "../../engine/math/transform.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { EditorOptions } from "../editor-options.ts";
import {
  Guide,
  GuideDetailMap,
  GuideMap,
  GuideVisual,
  guidePaintContext,
  type GuideMapResult,
} from "./guide.ts";

/**
 * Ruler guide lines (`guide.guide-lines`): the scene's `hgl` / `vgl`
 * arrays, drawn across the view and snapped to even while hidden.
 */
export class GuideLinesGuide extends GuideVisual(GuideMap(GuideDetailMap(Guide))) {
  static {
    registerClass(this, "GGuideLinesGuide");
  }

  static ID = "guide.guide-lines";
  static MIN_CELL_SPACE = 10;

  override getId(): string {
    return GuideLinesGuide.ID;
  }

  override paint(transform: Transform, paintContext: PaintContext): void {
    const context = guidePaintContext(paintContext);
    if (!context.configuration.guideLinesVisible) return;
    const horizontal = this._scene.getProperty("hgl") as number[] | null;
    if (horizontal && horizontal.length) {
      for (let i = 0; i < horizontal.length; ++i) {
        const y =
          Math.floor(transform.mapPoint(new Point(0, horizontal[i] as number)).getY()) + 0.5;
        context.canvas.strokeLine(
          0,
          y,
          context.canvas.getWidth(),
          y,
          1,
          EditorOptions.guideLineColor,
        );
      }
    }
    const vertical = this._scene.getProperty("vgl") as number[] | null;
    if (vertical && vertical.length) {
      for (let i = 0; i < vertical.length; ++i) {
        const x = Math.floor(transform.mapPoint(new Point(vertical[i] as number, 0)).getX()) + 0.5;
        context.canvas.strokeLine(
          x,
          0,
          x,
          context.canvas.getHeight(),
          1,
          EditorOptions.guideLineColor,
        );
      }
    }
  }

  /**
   * The first guide line within the snap distance on each axis, not the
   * closest (see "Guide lines snap to the first line in reach, not the
   * nearest" in QUESTIONS.md).
   */
  override map(
    x: number,
    y: number,
    useMargin?: boolean,
    distance?: number,
    zoom?: number | null,
  ): GuideMapResult | null {
    let snapX: number | null = null;
    let snapY: number | null = null;
    let deltaX: number | null = null;
    let deltaY: number | null = null;
    let result: GuideMapResult | null = null;
    const snapDistance = (zoom ? (distance as number) / zoom : distance) as number;
    const horizontal = this._scene.getProperty("hgl") as number[] | null;
    if (horizontal && horizontal.length) {
      for (let i = 0; i < horizontal.length; ++i) {
        const dist = Math.abs(y - (horizontal[i] as number));
        if (null === snapY && dist <= snapDistance) {
          snapY = horizontal[i] as number;
          deltaY = dist;
        }
      }
    }
    const vertical = this._scene.getProperty("vgl") as number[] | null;
    if (vertical && vertical.length) {
      for (let i = 0; i < vertical.length; ++i) {
        const dist = Math.abs(x - (vertical[i] as number));
        if (null === snapX && dist <= snapDistance) {
          snapX = vertical[i] as number;
          deltaX = dist;
        }
      }
    }
    if (null !== snapX || null !== snapY) {
      result = {
        x: null !== snapX ? { value: snapX, delta: deltaX } : null,
        y: null !== snapY ? { value: snapY, delta: deltaY } : null,
      };
    }
    return result;
  }

  override toString(): string {
    return "[Object GGuideLinesGuide]";
  }
}
