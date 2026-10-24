/**
 * Webpack Module #1299
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16),
      i = n(1),
      a = n(15),
      r = o(n(813));
    function s() {}
    i.GObject.inherit(s, r.default),
      (s.ID = "".concat(r.default.ID, ".safari")),
      (s.prototype.getId = function () {
        return s.ID;
      }),
      (s.prototype.getShortcut = function () {
        return [a.GKey.Constant.META, a.GKey.Constant.ALT_LEFT, "O"];
      }),
      (s.prototype.isAvailable = function () {
        return (
          a.GPlatform.webBrowser === a.GPlatform.constructor.WebBrowser.Safari
        );
      }),
      (e.exports = s);
  }