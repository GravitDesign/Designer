// Old: designer.browser.dev.js module 1330 (unnamed; the fullscreen event).
/** Triggered on the designer when the app enters or leaves fullscreen. */
import { Event } from "../../engine/core/event.ts";

export class FullscreenEvent extends Event {
  constructor(public fullscreen = false) {
    super();
  }
}
