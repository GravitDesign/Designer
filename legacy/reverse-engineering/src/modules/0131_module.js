/**
 * Webpack Module #131
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(622),
      i = n(35),
      a = n(116),
      r = n(43)("toStringTag"),
      s = Object,
      l =
        "Arguments" ===
        a(
          (function () {
            return arguments;
          })()
        );
    e.exports = o
      ? a
      : function (e) {
          var t, n, o;
          return void 0 === e
            ? "Undefined"
            : null === e
            ? "Null"
            : "string" ==
              typeof (n = (function (e, t) {
                try {
                  return e[t];
                } catch (e) {}
              })((t = s(e)), r))
            ? n
            : l
            ? a(t)
            : "Object" === (o = a(t)) && i(t.callee)
            ? "Arguments"
            : o;
        };
  }