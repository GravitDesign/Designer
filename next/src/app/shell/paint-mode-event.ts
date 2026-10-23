// Old: designer.browser.dev.js module 1328 (unnamed; GDesigner's paint mode event).
/**
 * Triggered on the designer once setPaintMode has repainted the active
 * view with the new mode (the next frame). The page properties panel
 * follows it to update its clip button.
 */
import { Event } from "../../engine/core/event.ts";

export class PaintModeEvent extends Event {
  constructor(public paintMode: string | null = null) {
    super();
  }
}
