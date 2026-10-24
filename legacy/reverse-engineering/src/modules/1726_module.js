/**
 * Webpack Module #1726
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1),
      i = {
        init: function (e) {
          var t = [
            {
              unit: o.GLength.Unit.PX,
              name: o.GLocale.get(new o.GLocaleKey("GLength", "unit.px")),
              short: o.GLocale.get(
                new o.GLocaleKey("GLength", "unit.px.short"),
                void 0,
                o.GLocaleLanguage.English
              ),
            },
            {
              unit: o.GLength.Unit.MM,
              name: o.GLocale.get(new o.GLocaleKey("GLength", "unit.mm")),
              short: o.GLocale.get(
                new o.GLocaleKey("GLength", "unit.mm.short"),
                void 0,
                o.GLocaleLanguage.English
              ),
            },
            {
              unit: o.GLength.Unit.CM,
              name: o.GLocale.get(new o.GLocaleKey("GLength", "unit.cm")),
              short: o.GLocale.get(
                new o.GLocaleKey("GLength", "unit.cm.short"),
                void 0,
                o.GLocaleLanguage.English
              ),
            },
            {
              unit: o.GLength.Unit.IN,
              name: o.GLocale.get(new o.GLocaleKey("GLength", "unit.in")),
              short: o.GLocale.get(
                new o.GLocaleKey("GLength", "unit.in.short"),
                void 0,
                o.GLocaleLanguage.English
              ),
            },
            {
              unit: o.GLength.Unit.PC,
              name: o.GLocale.get(new o.GLocaleKey("GLength", "unit.pc")),
              short: o.GLocale.get(
                new o.GLocaleKey("GLength", "unit.pc.short"),
                void 0,
                o.GLocaleLanguage.English
              ),
            },
            {
              unit: o.GLength.Unit.PT,
              name: o.GLocale.get(new o.GLocaleKey("GLength", "unit.pt")),
              short: o.GLocale.get(
                new o.GLocaleKey("GLength", "unit.pt.short"),
                void 0,
                o.GLocaleLanguage.English
              ),
            },
          ];
          return (
            (e = $.extend({ short: !1 }, e)),
            this.each(function () {
              var n = $(this);
              if (n.is("select"))
                for (var o = 0; o < t.length; ++o)
                  n.append(
                    $("<option></option>")
                      .attr("value", t[o].unit)
                      .text(e.short ? t[o].short : t[o].name)
                  );
            })
          );
        },
      };
    $.fn.gUnit = function (e) {
      return i[e]
        ? i[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
        : i.init.apply(this, arguments);
    };
  }