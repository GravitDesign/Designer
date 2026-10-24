/**
 * Webpack Module #1689
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    function o(e, t) {
      let n,
        o,
        i = this;
      return function () {
        return (
          (o = Array.prototype.slice.call(arguments, 0)),
          (n = clearTimeout(n, o)),
          (n = setTimeout(function () {
            e.apply(i, o), (n = 0);
          }, t)),
          this
        );
      };
    }
    ($.expr[":"].editable = function (e) {
      const t = $(e);
      if ("true" === t.attr("contenteditable") || e.isContentEditable)
        return !0;
      if (t.is("input")) {
        const e = t.attr("type");
        return (
          !e ||
          "" === e ||
          "text" === e ||
          "password" === e ||
          "email" === e ||
          "number" === e ||
          "month" === e ||
          "search" === e ||
          "tel" === e ||
          "week" === e ||
          "url" === e ||
          "time" === e ||
          "datetime" === e ||
          "datetime-local" === e ||
          "date" === e
        );
      }
      return !!t.is("textArea");
    }),
      ($.expr[":"].textSelectable = function (e) {
        return "text" === $(e).css("user-select");
      }),
      $.extend($.fn, {
        debounce: function (e, t, n) {
          return this.bind(e, o.apply(this, [t, n])), this;
        },
      });
  }