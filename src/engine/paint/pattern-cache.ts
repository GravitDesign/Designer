// Not in the old app. A canvas pattern holds a snapshot of its source, and
// making one of a canvas copies (and first finishes painting) that canvas.
// Some canvases are painted once and never drawn into again, such as the
// angular gradient canvases (AngularGradient.getGradient), which are handed
// out again while the gradient doesn't change. Their owners mark them here
// (freezePatternSource), and the patterns made of them are kept per canvas
// and repetition: a pattern of the same pixels paints the same, and its
// transform is not part of it (painting sets the canvas transform instead).
//
// Any other canvas can be drawn into at any time, and a kept pattern would
// keep showing its old pixels, so those get a new pattern every time.

/** What the cache needs from the context that makes the pattern. */
export interface PatternContext {
  createPattern(image: CanvasImageSource, repetition: string | null): CanvasPattern | null;
}

let frozen = new WeakSet<object>();
let frozenPatterns = new WeakMap<object, Map<string, CanvasPattern>>();

/**
 * Marks a canvas whose pixels never change again, so patterns of it can be
 * kept. Its owner must not draw into it afterwards.
 */
export function freezePatternSource(source: object): void {
  frozen.add(source);
}

export function isFrozenPatternSource(source: unknown): boolean {
  return !!source && "object" == typeof source && frozen.has(source);
}

/**
 * `context.createPattern(source, repetition)` for a frozen canvas, or the
 * pattern made of it with the same repetition before.
 */
export function frozenSourcePattern(
  context: PatternContext,
  source: CanvasImageSource,
  repetition: string,
): CanvasPattern | null {
  let byRepetition = frozenPatterns.get(source);
  const cached = byRepetition && byRepetition.get(repetition);
  if (cached) return cached;
  const pattern = context.createPattern(source, repetition);
  if (pattern) {
    if (!byRepetition) {
      byRepetition = new Map();
      frozenPatterns.set(source, byRepetition);
    }
    byRepetition.set(repetition, pattern);
  }
  return pattern;
}

/** Forgets every kept pattern and frozen canvas (for tests). */
export function clearPatternCache(): void {
  frozen = new WeakSet();
  frozenPatterns = new WeakMap();
}
