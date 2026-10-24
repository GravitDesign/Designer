/**
 * Webpack Module #1704
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1),
      i = {
        value: function (e) {
          const t = $(this);
          return arguments.length > 0
            ? (t.prop("checked", !!e), this)
            : i.isChecked.call(this);
        },
        unmount() {
          const e = $(this);
          return e.removeClass("g-checkbox-slider"), e;
        },
        isChecked: function () {
          return $(this).is(":checked");
        },
        init: function (e) {
          return (
            this.each(function () {
              const t = $(this);
              e = o.GUtil.extend({ onChange: function () {} }, e);
              const n = i.isChecked.call(this);
              t.addClass("g-checkbox-slider")
                .prop("type", "checkbox")
                .prop("checked", n)
                .toggleClass("checked", n)
                .on("change", function (t) {
                  const n = i.isChecked.call(this);
                  $(this).toggleClass("checked", n), e.onChange(n);
                });
            }),
            this
          );
        },
      };
    $.fn.gCheckboxSlider = function (e) {
      return i[e]
        ? i[e].apply(this, Array.prototype.slice.call(arguments, 1))
        : "object" != typeof e && e
        ? void $.error(
            "Method " + e + " does not exist on jQuery.gCheckboxSlider"
          )
        : i.init.apply(this, arguments);
    };
  }