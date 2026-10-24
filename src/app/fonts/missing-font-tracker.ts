// Old: designer.browser.dev.js module 1470 (missing font tracker).
/**
 * Collects the families the font manager couldn't resolve while it runs,
 * for the missing-fonts dialog after a document opened.
 */
import { FontsProviderManager, MissingFontEvent } from "./font-manager.ts";

export class MissingFontTracker {
  private _missingFonts: string[] = [];

  start(): void {
    FontsProviderManager.getInstance().addEventListener(
      MissingFontEvent,
      this._missingFontEvent,
      this,
    );
  }

  stop(): void {
    FontsProviderManager.getInstance().removeEventListener(
      MissingFontEvent,
      this._missingFontEvent,
      this,
    );
  }

  /** Every missing family once, in the order they went missing. */
  getMissingFonts(): string[] {
    return [...new Set(this._missingFonts)];
  }

  private _missingFontEvent(event: MissingFontEvent): void {
    this._missingFonts.push(event.evt.family);
  }
}
