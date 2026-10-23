// Old: designer.browser.dev.js module 1471 (font availability tracker).
/**
 * Waits until a font manager has no pending fonts: checked now and after
 * every font that resolved or failed.
 */
import {
  FontAvailableEvent,
  FontUnavailableEvent,
  type FontManager,
} from "../../engine/text/fonts/font-manager.ts";

export class FontAvailabilityTracker {
  private readonly _promise: Promise<void>;
  private _resolver!: () => void;

  constructor(private readonly _fontManager: FontManager) {
    this._fontManager.addEventListener(FontAvailableEvent, this._fontEvent, this);
    this._fontManager.addEventListener(FontUnavailableEvent, this._fontEvent, this);
    this._promise = new Promise((resolve) => {
      this._resolver = resolve;
    });
  }

  private _fontEvent(): void {
    this._checkPendingFonts();
  }

  private _checkPendingFonts(): void {
    if (this._fontManager.hasPendingFonts()) return;
    this._fontManager.removeEventListener(FontAvailableEvent, this._fontEvent, this);
    this._fontManager.removeEventListener(FontUnavailableEvent, this._fontEvent, this);
    this._resolver();
  }

  waitForAllPendingFonts(): Promise<void> {
    this._checkPendingFonts();
    return this._promise;
  }
}
