/**
 * Webpack Module #857
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(193), n(3), n(4), n(13);
    var o = n(1);
    function i() {}
    i.prototype.OPACITY_DEFAULT = {
      min: 0,
      max: 100,
      custom: !0,
      cssClass: "opacity",
    };
    var a = function (e, t) {
        var n = $(e).data("options").min;
        return ((t - n) / ($(e).data("options").max - n)) * 100;
      },
      r = function (e, t) {
        $(e).trigger(t);
      },
      s = function (e, t, n) {
        var o = (function (e, t, n) {
          var o = $(e).data("options").min,
            i = $(e).data("options").max,
            a = $(e).find(".g-input-slider-track"),
            r = $(e).find(".g-input-slider-thumb"),
            s = a.width();
          t || (t = r.offset().left - a.offset().left);
          var l = (100 * t) / s;
          l < 0 ? (l = 0) : l > 100 && (l = 100), n && r.css("left", l + "%");
          var c = (l * (i - o)) / 100 + o;
          return c > i ? (c = i) : c < o && (c = o), c;
        })(e, t, n);
        $(e).attr("value", o), l(e, a(e, o)), r(e, "input");
      },
      l = function (e, t) {
        $(e).data("options").generic &&
          ($(e)
            .find(".g-input-slider-track .g-input-slider-background")
            .remove(),
          $(e)
            .find(".g-input-slider-track")
            .append(
              $("<div/>")
                .addClass("g-input-slider-background")
                .css({ width: t + "%" })
            ));
      };
    var c = {
      init: function (e, t) {
        return this.each(function () {
          t || (t = this);
          var n,
            o = e.min,
            i = e.max;
          (e.generic = !e.background && !e.custom),
            !e.maxDecimal &&
              e.step &&
              (e.maxDecimal =
                ((n = e.step),
                Math.floor(n) === n
                  ? 0
                  : n.toString().split(".")[1].length || 0));
          var l = 50;
          l < o ? (l = o) : l > i && (l = i);
          var c = e.generic ? 10 : 8;
          $(t)
            .addClass("g-input-slider")
            .addClass(e.generic ? "generic" : "custom")
            .addClass(e.cssClass ? e.cssClass : "")
            .attr("value", l)
            .attr("min", o)
            .attr("max", i)
            .data("options", e),
            e.generic || $(t).css("background", e.background);
          var d = $("<div></div>")
              .addClass("g-input-slider-track")
              .addClass(e.generic ? "generic" : "custom"),
            u = $("<div></div>")
              .addClass("g-input-slider-thumb")
              .addClass(e.generic ? "generic" : "custom");
          e.richTooltipConfig && u.gRichTooltip(e.richTooltipConfig),
            d.append(u);
          var p = !1,
            g = function (e) {
              if ("disabled" !== $(t).attr("disabled")) {
                var n = e.clientX,
                  o = $(t).offset().left;
                s(t, (n = n - o - c / 2), !0);
              }
            };
          $(d).on("mousedown", function (e) {
            1 == e.which &&
              ((p = !0), $(u).addClass("active"), e.isTrusted && g(e));
          }),
            $(t).on("mousedown", function (e) {
              1 == e.which &&
                ((p = !0), $(u).addClass("active"), e.isTrusted && g(e));
            });
          let h = !1;
          $(u).on("mousedown", () => {
            h = !0;
          });
          let f = !1;
          $(t).on("touchstart", () => {
            f = !1;
          }),
            $(t).on("touchmove", () => {
              f = !0;
            }),
            $(window)
              .on("mousemove", function (e) {
                p && (e.isTrusted || h) && (g(e), e.preventDefault());
              })
              .mouseup(function (e) {
                (h = !1),
                  p &&
                    (f || ((e) => !e.originalEvent.cancelable)(e) || g(e),
                    (p = !1),
                    "disabled" !== $(t).attr("disabled") &&
                      (function (e) {
                        $(e)
                          .find(".g-input-slider-thumb")
                          .css("left", a(e, $(e).attr("value")) + "%"),
                          r(e, "change");
                      })(t),
                    $(u).removeClass("active"));
              }),
            $(t).append(d);
        });
      },
      value: function (e) {
        var t = $(this);
        if (t.data("options")) {
          var n = t.data("options").min,
            i = t.data("options").max,
            r = t.data("options").maxDecimal ? t.data("options").maxDecimal : 0;
          if (void 0 === e)
            return isNaN(t.attr("value"))
              ? parseFloat(t.attr("value"))
              : o.GUtil.formatNumber(t.attr("value"), r);
          isNaN(e) || (e = o.GUtil.formatNumber(e, r)),
            e > i ? (e = i) : e < n && (e = n);
          var s = a(this, e);
          t.find(".g-input-slider-thumb").css("left", s + "%"),
            l(this, s),
            t.attr("value", e);
        }
        return this;
      },
      minValue: function () {
        return $(this).data("options").min;
      },
      maxValue: function () {
        return $(this).data("options").max;
      },
      disabled: function () {
        return arguments.length
          ? $(this).attr("disabled", arguments[0])
          : $(this).attr("disabled");
      },
    };
    (e.exports = i),
      ($.fn.gInputSlider = function (e) {
        return c[e]
          ? c[e].apply(this, Array.prototype.slice.call(arguments, 1))
          : "object" != typeof e && e
          ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
          : c.init.apply(this, arguments);
      });
  }