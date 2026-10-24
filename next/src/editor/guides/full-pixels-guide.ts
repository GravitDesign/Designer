// Old: chunk.vendor.js module 544 (GFullPixelsGuide).
import { registerClass } from "../../engine/core/object.ts";
import { GMath } from "../../engine/math/math.ts";
import { Length } from "../../engine/math/length.ts";
import { Rect } from "../../engine/math/rect.ts";
import {
  DetailMapMode,
  Guide,
  GuideDetailMap,
  GuideMap,
  type GuideMapResult,
  type GuidesHost,
} from "./guide.ts";
import { Guides } from "./guides.ts";

/**
 * Snaps to whole pixels (`guide.full-pixels`) when the document unit is
 * px; only the top-left zone. Cmd/Ctrl doesn't invert it.
 */
export class FullPixelsGuide extends GuideMap(GuideDetailMap(Guide)) {
  static {
    registerClass(this, "GFullPixelsGuide");
  }

  static ID = "guide.full-pixels";

  constructor(guides: GuidesHost) {
    super(guides);
    // Over a copy: the old code spliced the list it iterated and kept
    // bottom-right (BUG-048 Full pixels guide also rounds the bottom-right
    // corner).
    this.getAllowedSnapZones()
      .slice()
      .forEach((zone) => {
        if (zone !== Rect.Side.TOP_LEFT) this.disallowSnapZone(zone);
      });
  }

  override getId(): string {
    return FullPixelsGuide.ID;
  }

  override map(x: number, y: number): GuideMapResult | null {
    if (this._scene.getProperty("ut") === Length.Unit.PX) {
      const snappedX = GMath.round(x, true);
      const snappedY = GMath.round(y, true);
      return {
        x: { value: snappedX, guide: null, delta: Math.abs(x - snappedX) },
        y: { value: snappedY, guide: null, delta: Math.abs(y - snappedY) },
      };
    }
    return null;
  }

  override isMappingAllowed(mode?: number | null): boolean {
    return !Guides.options.disabled && mode !== DetailMapMode.DetailOffFilterOn;
  }

  override isFullPixelsGuide(): boolean {
    return true;
  }

  override toString(): string {
    return "[Object GFullPixelsGuide]";
  }
}
