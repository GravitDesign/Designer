/**
 * Webpack Module #1715
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(57),
      n(20),
      n(3),
      n(34),
      (function (e) {
        jQuery.fn.extend({
          elastic: function () {
            var t = [
              "paddingTop",
              "paddingRight",
              "paddingBottom",
              "paddingLeft",
              "fontSize",
              "lineHeight",
              "fontFamily",
              "width",
              "fontWeight",
              "border-top-width",
              "border-right-width",
              "border-bottom-width",
              "border-left-width",
              "borderTopStyle",
              "borderTopColor",
              "borderRightStyle",
              "borderRightColor",
              "borderBottomStyle",
              "borderBottomColor",
              "borderLeftStyle",
              "borderLeftColor",
            ];
            return this.each(function () {
              if ("textarea" !== this.type) return !1;
              var n = jQuery(this),
                o = jQuery("<div />").css({
                  position: "absolute",
                  display: "none",
                  "word-wrap": "break-word",
                  "white-space": "pre-wrap",
                }),
                i =
                  parseInt(n.css("line-height"), 10) ||
                  parseInt(n.css("font-size"), "10"),
                a = parseInt(n.css("height"), 10) || 3 * i,
                r = parseInt(n.css("max-height"), 10) || Number.MAX_VALUE;
              r < 0 && (r = Number.MAX_VALUE), o.appendTo(n.parent());
              for (var s = t.length; s--; )
                o.css(t[s].toString(), n.css(t[s].toString()));
              function l() {
                var e = Math.floor(parseInt(n.width(), 10));
                o.width() !== e && (o.css({ width: e + "px" }), d(!0));
              }
              function c(e, t) {
                var o = Math.floor(parseInt(e, 10));
                n.height() !== o && n.css({ height: o + "px", overflow: t });
              }
              function d(e) {
                var t = n
                    .val()
                    .replace(/&/g, "&amp;")
                    .replace(/ {2}/g, "&nbsp;")
                    .replace(/<|>/g, "&gt;")
                    .replace(/\n/g, "<br />"),
                  s = o.html().replace(/<br>/gi, "<br />");
                if (
                  (e || t + "&nbsp;" !== s) &&
                  (o.html(t + "&nbsp;"),
                  Math.abs(o.height() + i - n.height()) > 3)
                ) {
                  var l = o.height() + i;
                  l >= r ? c(r, "auto") : c(l <= a ? a : l, "hidden");
                }
              }
              n.css({ overflow: "hidden" }),
                n.bind("keyup change cut paste", function () {
                  d();
                }),
                e(window).bind("resize", l),
                n.bind("resize", l),
                n.bind("update", d),
                n.bind("blur", function () {
                  o.height() < r &&
                    (o.height() > a ? n.height(o.height()) : n.height(a));
                }),
                n.bind("input paste", function (e) {
                  setTimeout(d, 250);
                }),
                d();
            });
          },
        });
      })(jQuery);
  }