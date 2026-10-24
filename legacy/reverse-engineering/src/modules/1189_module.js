/**
 * Webpack Module #1189
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(97);
    e.exports = class {
      constructor() {
        this._swiping = !1;
      }
      update(e) {
        this._touches = e.touches ? Array.from(e.touches) : [];
      }
      setSwiping(e) {
        this._swiping = e;
      }
      isSwiping() {
        return this._swiping;
      }
      hasActiveIdentifier(e) {
        return (
          !!this._touches &&
          this._touches.some((t) => t.identifier === e.identifier)
        );
      }
      hasActiveIdentifiers() {
        return !!this._touches && this._touches.length > 0;
      }
    };
  }