// Old: chunk.vendor.js module 50 (GPattern).
import { hasMixin } from "../core/object.ts";

/** A pattern class that the registry can create from its id. */
export type PatternClass = new () => Pattern;

/** The chessboard behind transparent previews, built on first use. */
let chessboardBackground: string | undefined;

/**
 * Base of everything that can fill or stroke: colors, gradients, textures,
 * noise and the background pattern. Every concrete class registers a
 * one-letter id ("C" RGB, "Y" CMYK, "L" linear gradient, ...); a pattern is
 * saved as "<id>#<payload>".
 *
 * The old GPattern was a plain function, not a GObject subclass: it has no
 * type id of its own and borrowed GObject's hasMixin.
 */
export class Pattern {
  static MIME_TYPE = "application/gravit+pattern";

  /** Pattern id → class, in registration order. */
  static _idClassMap: Record<string, PatternClass> = {};

  /**
   * Registers a pattern class under its id. The old code did this together
   * with the inheritance (`GPattern.inherit("C", GRGBColor, GColor)`);
   * classes call it from their static block.
   */
  static register(id: string, cls: PatternClass): void {
    Pattern._idClassMap[id] = cls;
  }

  /** The pattern as a CSS background over a chessboard, or just the chessboard. */
  static asCSSBackground(
    pattern?: Pattern | null,
    opacity?: unknown,
    arg1?: unknown,
    arg2?: unknown,
  ): string {
    if (!chessboardBackground) {
      chessboardBackground =
        'url("data:image/svg+xml;base64,' +
        btoa(
          '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="white"/><rect width="4" height="4" fill="#CDCDCD"/><rect x="4" y="4" width="4" height="4" fill="#CDCDCD"/></svg>',
        ) +
        '")';
    }
    const resolvedOpacity = typeof opacity === "number" ? opacity : 1;
    let result = chessboardBackground;
    if (pattern) result = pattern.asCSSBackground(resolvedOpacity, arg1, arg2) + "," + result;
    return result;
  }

  /** "<id>#<payload>", or null for no pattern. */
  static serialize(pattern: Pattern | null | undefined, options?: unknown): string | null {
    if (pattern) {
      for (const id in Pattern._idClassMap) {
        if (pattern.constructor === Pattern._idClassMap[id]) {
          return id + "#" + pattern.serialize(options);
        }
      }
      throw new Error("Unregistered Pattern Class.");
    }
    return null;
  }

  static deserialize(blob: string | null | undefined): Pattern | null {
    if (blob) {
      const separator = blob.indexOf("#");
      if (separator > 0) {
        const id = blob.substr(0, separator);
        if (id && id.length > 0) {
          const cls = Pattern._idClassMap[id];
          if (!cls) throw new Error("Unregistered Pattern Class.");
          const pattern = new cls();
          pattern.deserialize(blob.substr(separator + 1));
          return pattern;
        }
      }
    }
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses take the opacity and options
  asCSSBackground(opacity?: number, arg1?: unknown, arg2?: unknown): string {
    throw new Error("Not Supported");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses take serialize options
  serialize(options?: unknown): string {
    return "";
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses read the payload
  deserialize(blob: string): void {}

  /** [r, g, b, a] for previews, or null. */
  getAverageColor(): number[] | null {
    return null;
  }

  isWebGL(): boolean {
    return false;
  }

  clone(): Pattern {
    throw new Error("Not Supported");
  }

  hasMixin(mixin: unknown): boolean {
    return hasMixin(this, mixin);
  }
}
