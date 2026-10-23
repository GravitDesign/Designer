// Old: chunk.vendor.js module 600 (pattern/sketchpattern).
import type { SceneNodeLike } from "./scene-node.ts";
import type { SketchFile } from "./sketch-file.ts";
import { SketchParser } from "./sketch-parser.ts";

/**
 * A paint (colour, gradient, image, noise) that parses itself on
 * construction and sets itself as a paint layer's pattern. Subclasses keep
 * their state in `declare`d fields with prototype defaults: parse() runs
 * inside this constructor, before field initializers would.
 */
export class SketchPattern<D = unknown> extends SketchParser<D> {
  constructor(data: D, file?: SketchFile) {
    super(data, file);
    this.parse();
  }

  override parse(): void {}

  applyTo(layer: SceneNodeLike): void {
    void layer;
    throw new Error("Not Implemented");
  }
}
