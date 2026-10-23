// Old: designer.browser.dev.js module 868 (unnamed; the share event).
import { Event } from "../../../engine/core/event.ts";

/**
 * The event the old app triggered when the sharing of a cloud file
 * changed (GShareManager, GFileReviewManager and GDesigner listened for
 * it). The cloud is dropped, so nothing triggers it any more; the class
 * stays at its port-map file (arrange-type.ts, named by an earlier guess)
 * so the old module has a home.
 */
export class ShareEvent extends Event {
  static Type = { Updated: 0 } as const;

  type: number | null;

  constructor(type: number) {
    super();
    this.type = type;
  }
}
