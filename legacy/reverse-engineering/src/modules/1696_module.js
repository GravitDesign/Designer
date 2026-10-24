/**
 * Webpack Module #1696
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(32), n(33);
    var o = n(1);
    var i = {
      init: function (e) {
        e = $.extend({}, e);
        const t = [
          {
            group: null,
            options: [
              {
                type: o.GPaintCanvas.BlendMode.Normal,
                name: o.GLocale.getValue("GPaintCanvas", "blend.normal"),
                isCompatible: !0,
              },
            ],
          },
          {
            group: o.GLocale.getValue(
              "GAppearanceProperties",
              "text.darken-image"
            ),
            options: [
              {
                type: o.GPaintCanvas.BlendMode.Darken,
                name: o.GLocale.getValue("GPaintCanvas", "blend.darken"),
                isCompatible: !0,
              },
              {
                type: o.GPaintCanvas.BlendMode.Multiply,
                name: o.GLocale.getValue("GPaintCanvas", "blend.multiply"),
                isCompatible: !0,
              },
              {
                type: o.GPaintCanvas.BlendMode.ColorBurn,
                name: o.GLocale.getValue("GPaintCanvas", "blend.colorburn"),
                isCompatible: !0,
              },
              {
                type: o.GPaintCanvas.BlendMode.Subtract,
                name: o.GLocale.getValue("GPaintCanvas", "blend.subtract"),
                isCompatible: !1,
              },
              {
                type: o.GPaintCanvas.BlendMode.LinearBurn,
                name: o.GLocale.getValue("GPaintCanvas", "blend.linearburn"),
                isCompatible: !1,
              },
            ],
          },
          {
            group: o.GLocale.getValue(
              "GAppearanceProperties",
              "text.lighten-image"
            ),
            options: [
              {
                type: o.GPaintCanvas.BlendMode.Lighten,
                name: o.GLocale.getValue("GPaintCanvas", "blend.lighten"),
                isCompatible: !0,
              },
              {
                type: o.GPaintCanvas.BlendMode.Screen,
                name: o.GLocale.getValue("GPaintCanvas", "blend.screen"),
                isCompatible: !0,
              },
              {
                type: o.GPaintCanvas.BlendMode.ColorDodge,
                name: o.GLocale.getValue("GPaintCanvas", "blend.colordodge"),
                isCompatible: !0,
              },
              {
                type: o.GPaintCanvas.BlendMode.LinearDodge,
                name: o.GLocale.getValue("GPaintCanvas", "blend.lineardodge"),
                isCompatible: !1,
              },
              {
                type: o.GPaintCanvas.BlendMode.Add,
                name: o.GLocale.getValue("GPaintCanvas", "blend.add"),
                isCompatible: !1,
              },
            ],
          },
          {
            group: o.GLocale.getValue(
              "GAppearanceProperties",
              "text.boost-contrast"
            ),
            options: [
              {
                type: o.GPaintCanvas.BlendMode.Overlay,
                name: o.GLocale.getValue("GPaintCanvas", "blend.overlay"),
                isCompatible: !0,
              },
              {
                type: o.GPaintCanvas.BlendMode.SoftLight,
                name: o.GLocale.getValue("GPaintCanvas", "blend.softlight"),
                isCompatible: !0,
              },
              {
                type: o.GPaintCanvas.BlendMode.HardLight,
                name: o.GLocale.getValue("GPaintCanvas", "blend.hardlight"),
                isCompatible: !0,
              },
              {
                type: o.GPaintCanvas.BlendMode.VividLight,
                name: o.GLocale.getValue("GPaintCanvas", "blend.vividlight"),
                isCompatible: !1,
              },
              {
                type: o.GPaintCanvas.BlendMode.LinearLight,
                name: o.GLocale.getValue("GPaintCanvas", "blend.linearlight"),
                isCompatible: !1,
              },
              {
                type: o.GPaintCanvas.BlendMode.PinLight,
                name: o.GLocale.getValue("GPaintCanvas", "blend.pinlight"),
                isCompatible: !1,
              },
              {
                type: o.GPaintCanvas.BlendMode.HardMix,
                name: o.GLocale.getValue("GPaintCanvas", "blend.hardmix"),
                isCompatible: !1,
              },
            ],
          },
          {
            group: o.GLocale.getValue(
              "GAppearanceProperties",
              "text.adjust-colors"
            ),
            options: [
              {
                type: o.GPaintCanvas.BlendMode.Hue,
                name: o.GLocale.getValue("GPaintCanvas", "blend.hue"),
                isCompatible: !0,
              },
              {
                type: o.GPaintCanvas.BlendMode.Saturation,
                name: o.GLocale.getValue("GPaintCanvas", "blend.saturation"),
                isCompatible: !0,
              },
              {
                type: o.GPaintCanvas.BlendMode.Color,
                name: o.GLocale.getValue("GPaintCanvas", "blend.color"),
                isCompatible: !0,
              },
              {
                type: o.GPaintCanvas.BlendMode.Luminosity,
                name: o.GLocale.getValue("GPaintCanvas", "blend.luminosity"),
                isCompatible: !0,
              },
            ],
          },
          {
            group: o.GLocale.getValue(
              "GAppearanceProperties",
              "text.invert-colors"
            ),
            options: [
              {
                type: o.GPaintCanvas.BlendMode.Difference,
                name: o.GLocale.getValue("GPaintCanvas", "blend.difference"),
                isCompatible: !0,
              },
              {
                type: o.GPaintCanvas.BlendMode.Exclusion,
                name: o.GLocale.getValue("GPaintCanvas", "blend.exclusion"),
                isCompatible: !0,
              },
              {
                type: o.GPaintCanvas.BlendMode.Divide,
                name: o.GLocale.getValue("GPaintCanvas", "blend.divide"),
                isCompatible: !1,
              },
              {
                type: o.GPaintCanvas.BlendMode.Power,
                name: o.GLocale.getValue("GPaintCanvas", "blend.power"),
                isCompatible: !1,
              },
              {
                type: o.GPaintCanvas.BlendMode.Harmonic,
                name: o.GLocale.getValue("GPaintCanvas", "blend.harmonic"),
                isCompatible: !1,
              },
              {
                type: o.GPaintCanvas.BlendMode.Sin,
                name: o.GLocale.getValue("GPaintCanvas", "blend.sin"),
                isCompatible: !1,
              },
            ],
          },
        ];
        return this.each(function () {
          const e = $(this);
          for (let n = 0; n < t.length; ++n) {
            let o = e;
            const { group: i, options: a } = t[n];
            i &&
              ((o = $('<optgroup label="' + i + '"></optgroup>')), e.append(o)),
              a.forEach((e) => {
                let { type: t, name: n, isCompatible: i } = e;
                o.append(
                  $("<option></option>")
                    .attr("value", t)
                    .text("".concat(n).concat(i ? "" : " *"))
                );
              });
          }
        });
      },
    };
    $.fn.gBlendMode = function (e) {
      return i[e]
        ? i[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error("Method " + e + " does not exist on jQuery.myPlugin")
        : i.init.apply(this, arguments);
    };
  }