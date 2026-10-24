/**
 * Webpack Module #1714
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4),
      n(41),
      n(13),
      (function (e) {
        (e.event.special.input = {
          setup: function (t, n) {
            var o,
              i = this,
              a = i.value,
              r = document.createElement(this.tagName),
              s =
                "oninput" in r ||
                (function (e) {
                  if (
                    (e.setAttribute("oninput", "return"),
                    "function" == typeof e.oninput)
                  )
                    return !0;
                  try {
                    document.createEvent("KeyboardEvent");
                    var t = !1,
                      n = function (e) {
                        (t = !0), e.preventDefault(), e.stopPropagation();
                      };
                    return (
                      document.body.appendChild(e),
                      e.addEventListener("input", n, !1),
                      e.removeEventListener("input", n, !1),
                      document.body.removeChild(e),
                      t
                    );
                  } catch (e) {}
                })(r),
              l = "inputEventNS" + ~~(1e7 * Math.random()),
              c = ["focus", "blur", "paste", "cut", "keydown", "drop", ""].join(
                "." + l + " "
              );
            function d() {
              var t = e(i);
              i.value == a ||
                t.data("triggering.inputEvent") ||
                ((a = i.value),
                t.data("triggering.inputEvent", !0).trigger("input"),
                window.setTimeout(function () {
                  t.data("triggering.inputEvent", !1);
                }, 0));
            }
            if (s) return !1;
            e(this)
              .find("input, textarea")
              .andSelf()
              .filter("input, textarea")
              .bind(c, function (e) {
                "focus" == e.type
                  ? (d(), clearInterval(o), (o = window.setInterval(d, 250)))
                  : "blur" == e.type
                  ? window.clearInterval(o)
                  : window.setTimeout(d, 0);
              }),
              e(this).data("inputEventHandlerNS", l);
          },
          teardown: function () {
            var t = e(this);
            t.find("input, textarea").unbind(t.data("inputEventHandlerNS")),
              t.data("inputEventHandlerNS", "");
          },
        }),
          (e.fn.input = function (e) {
            return e ? this.bind("input", e) : this.trigger("input");
          });
      })(jQuery);
  }