/**
 * Webpack Module #1688
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(20), n(151);
    var o = n(1);
    (o.GUtil.image2Canvas = function (e, t) {
      if ("string" == typeof e) {
        var n = new Image();
        return (
          e && e.match(/^(http|https|\/\/)/)
            ? (n.crossOrigin = "Anonymous")
            : (n.crossOrigin = null),
          (n.src = e),
          (n.onload = function () {
            this.image2Canvas(n, t);
          }.bind(this)),
          null
        );
      }
      var o = document.createElement("canvas");
      return (
        (o.width = e.naturalWidth),
        (o.height = e.naturalHeight),
        o.getContext("2d").drawImage(e, 0, 0),
        t && t(o),
        o
      );
    }),
      (o.GUtil.image2Base64 = function (e, t) {
        var n = this.image2Canvas(e, function (e) {
          t && t(e.toDataURL("image/png"));
        });
        return n ? n.toDataURL("image/png") : null;
      });
  }