/**
 * Webpack Module #1263
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1);
    function i() {}
    (i.DefaultStops = {
      Hue: function (e) {
        return o.GColor.hsvToRGB([e, 1, 1]);
      },
      Saturation: function (e) {
        return function (t) {
          return o.GColor.hsvToRGB([e, t / 100, 1]);
        };
      },
      Luminosity: function (e) {
        return o.GColor.hsvToRGB([0, 0, e / 100]);
      },
    }),
      (e.exports = i);
    var a = {
      init: function (e) {
        return (
          (e = $.extend({ min: 0, max: 360, stops: i.DefaultStops.Hue }, e)),
          this.each(function () {
            for (
              var t = "",
                n = 0,
                i = Math.abs(e.min) + Math.abs(e.max),
                a = e.min;
              a <= e.max;
              a += 20
            ) {
              var r = e.stops.call(null, n);
              (n += 20),
                t && (t += ","),
                (t += o.GColor.rgbToHtmlHex(r) + " " + (n / i) * 100 + "%");
            }
            (e.background = "linear-gradient(90deg," + t + ")"),
              $(this).gInputSlider(e);
          })
        );
      },
      value: function (e) {
        return $(this).gInputSlider("value", e);
      },
      minValue: function () {
        return $(this).gInputSlider("minValue");
      },
      maxValue: function () {
        return $(this).gInputSlider("maxValue");
      },
    };
    $.fn.gColorSlider = function (e) {
      return a[e]
        ? a[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
        : a.init.apply(this, arguments);
    };
  }