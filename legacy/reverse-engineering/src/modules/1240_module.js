/**
 * Webpack Module #1240
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(30);
    const { FILE_FORMATS: o } = n(10);
    class i {
      constructor() {
        (this.onlyListFilesOwnedByUser = !1), (this.supportedFileFormats = o);
      }
      static from() {
        let e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
        return Object.assign(new i(), e);
      }
    }
    (i.prototype.onlyListFilesOwnedByUser = null),
      (i.prototype.supportedFileFormats = null),
      (i.prototype.supportedFileFilters = null),
      (e.exports = i);
  }