/**
 * Webpack Module #1101
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    function o(e, t) {
      null != e
        ? o.Type.hasOwnProperty(e)
          ? (this.errCode = o.Type[e])
          : (this.errCode = o.Type.UnknownError)
        : null != t && t > 0 && t <= o.Type.UnknownError && (this.errCode = t);
    }
    (o.Type = {
      MaxBitmapDim: 1,
      FacingPages: 2,
      OddEvenLayers: 3,
      OtherClientErr: 4,
      TooBigFileSize: 5,
      NoImages: 6,
      UnknownError: 7,
    }),
      (o.MaxFileSize = 471859200),
      (o.prototype.errCode = null),
      (e.exports = o);
  }