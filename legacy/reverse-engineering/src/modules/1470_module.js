/**
 * Webpack Module #1470
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19), n(26);
    const o = n(255);
    e.exports = class {
      constructor() {
        this._missingFonts = [];
      }
      start() {
        o.getInstance().addEventListener(
          o.MissingFontEvent,
          this._missingFontEvent,
          this
        );
      }
      stop() {
        o.getInstance().removeEventListener(
          o.MissingFontEvent,
          this._missingFontEvent,
          this
        );
      }
      getMissingFonts() {
        return [...new Set(this._missingFonts)];
      }
      _missingFontEvent(e) {
        var t = e.evt;
        this._missingFonts.push(t.family);
      }
    };
  }