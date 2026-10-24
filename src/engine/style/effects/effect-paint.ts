// Helpers the canvas effects share. Each one is a sequence the old effects
// repeated inline; the calls and their order are the old ones.
import { Rect } from "../../math/rect.ts";
import type { Transform } from "../../math/transform.ts";
import type { PaintCanvas } from "../../paint/paint-canvas.ts";
import { Node } from "../../scene/node.ts";
import type { Effect } from "../effect.ts";
import { Pattern } from "../pattern.ts";

/** `area` in canvas pixels (default: the whole canvas) in the canvas's user space. */
export function canvasUserRect(canvas: PaintCanvas, area?: Rect): Rect {
  return (canvas.getTransform(false).inverted() as Transform).mapRect(
    area || new Rect(0, 0, canvas.getWidth(), canvas.getHeight()),
  );
}

/**
 * Fills `rect` with `pattern`. A pattern with its own transform (a
 * gradient) is painted as the unit square under that transform.
 */
export function fillRectWithPattern(
  canvas: PaintCanvas,
  pattern: Pattern,
  rect: Rect,
  opacity: number,
  compositeOperator?: string,
): void {
  const patternPaint = canvas.createPatternPaint(pattern, rect);
  if (patternPaint) {
    if (patternPaint.transform) {
      const previous = canvas.setTransform(
        canvas.getTransform(true).preMultiplied(patternPaint.transform),
      );
      canvas.fillRect(0, 0, 1, 1, patternPaint.paint, opacity, compositeOperator);
      canvas.setTransform(previous);
    } else {
      canvas.fillRect(
        rect.getX(),
        rect.getY(),
        rect.getWidth(),
        rect.getHeight(),
        patternPaint.paint,
        opacity,
        compositeOperator,
      );
    }
  }
}

/** The store filter of the effects with a `pat`: the pattern goes into the blob serialized. */
export function storePattern(name: string, value: unknown): unknown {
  return value && "pat" === name ? Pattern.serialize(value as Pattern) : value;
}

/** The restore filter matching storePattern. */
export function restorePattern(name: string, value: unknown): unknown {
  return value && "pat" === name ? Pattern.deserialize(value as string) : value;
}

/** An effect class: what MultiEffect and the GL lookups construct. */
export type EffectClass<T extends Effect = Effect> = (new () => T) & {
  GeometryProperties?: Record<string, unknown>;
  VisualProperties?: Record<string, unknown>;
};

/**
 * A WebGL effect class (engine-effects-webgl) by its node name. The old
 * modules required them directly; here they are looked up once they are
 * registered, so the canvas effects don't import the WebGL cluster.
 */
export function glEffectClass<T extends Effect = Effect>(nodeName: string): EffectClass<T> {
  const cls = Node._nameToNodeClassMap.get(nodeName);
  if (!cls) throw new Error(nodeName + " is not registered (engine-effects-webgl defines it)");
  return cls as unknown as EffectClass<T>;
}
