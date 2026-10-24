/**
 * Webpack Module #1737
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = {
      init: function (e) {
        return this.each(function () {
          $(this).on("scroll", function () {
            if (gDesigner.isTouchEnabled()) {
              var t = $(this)[0].scrollTop,
                n =
                  "light" == gDesigner.getSetting("theme")
                    ? "DFDFDF"
                    : "2E2E2E";
              (t = t > 20 ? 20 : t),
                $(e).css({
                  "box-shadow": "0 ".concat(t, "px 20px -5px #").concat(n),
                });
            }
          });
        });
      },
    };
    $.fn.gToolbarShadow = function (e) {
      return o[e]
        ? o[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
        : o.init.apply(this, arguments);
    };
  }