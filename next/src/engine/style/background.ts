// Old: chunk.vendor.js module 265 (GBackground).
import { registerClass } from "../core/object.ts";
import { Pattern } from "./pattern.ts";

/** The striped preview, built on first use. */
let stripesBackground: string | undefined;

/**
 * The "background" pattern ("B#"): a layer that shows what is behind the
 * element (the noise pattern's rectangle uses it). It has no payload.
 */
export class Background extends Pattern {
  static {
    registerClass(this, "GBackground");
    Pattern.register("B", this);
  }

  /** Two backgrounds are always equal; null equals only null. */
  static equals(a: unknown, b: unknown): boolean {
    return (!a && a === b) || !(!a || !b);
  }

  override getAverageColor(): number[] {
    return [0, 0, 0, 0];
  }

  override asCSSBackground(): string {
    if (!stripesBackground) {
      stripesBackground =
        'url("data:image/svg+xml;base64,' +
        btoa(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="20" viewBox="0 0 5 10"><rect width="110%" x="-5%" y="-5%" height="110%" fill="#545454"/><line x1="-2" y1="1" x2="7" y2="10" stroke="#6e6e6e" stroke-width="2"/><line x1="-2" y1="6" x2="7" y2="15" stroke="#6e6e6e" stroke-width="2"/><line x1="-2" y1="-4" x2="7" y2="5" stroke="#6e6e6e" stroke-width="2"/></svg>',
        ) +
        '")';
    }
    return stripesBackground;
  }

  override toString(): string {
    return "[Object GBackground]";
  }
}
