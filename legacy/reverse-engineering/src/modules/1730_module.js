/**
 * Webpack Module #1730
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(13);
    var o = {
      init: function (e) {
        return this.each(function () {
          var t = $(this),
            n = e.autoPadding,
            o = $("<span/>").addClass("g-input-label");
          e.label ? o.html(e.label) : e.class && o.addClass(e.class),
            t.find("input").css("padding-left", "20px").css("width", "100%"),
            n &&
              t
                .find("input")
                .css("padding-left", "".concat(21 + e.label.length, "px")),
            t.prepend(o);
        });
      },
    };
    $.fn.gInputLabel = function (e) {
      return o[e]
        ? o[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
        : o.init.apply(this, arguments);
    };
  }